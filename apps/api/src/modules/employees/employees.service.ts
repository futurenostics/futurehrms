import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { Prisma } from '@prisma/client';
import type {
  ChangeManagerInput,
  ChangeSalaryInput,
  ChangeStatusInput,
  EmployeeCreateInput,
  EmployeeListQuery,
  EmployeeListResponse,
  EmployeePublic,
  EmployeeUpdateInput,
  OrgChartNode,
  ReferencesResponse,
  SalaryHistoryEntry,
  TimelineEntryPublic,
} from '@futurenostics/types';
import type { AuthenticatedUser } from '../../core/auth/types';
import {
  assertEmployeeReadable,
  buildEmployeeScopeWhere,
  canViewSalary,
  computeEmployeeReadScope,
} from '../../core/rbac/scope';
import { EventBusService } from '../../core/events/event-bus.service';
import { StorageService } from '../../core/storage/storage.service';
import {
  EMPLOYEE_PUBLIC_INCLUDE,
  extractPhotoStorageKey,
  toEmployeePublic,
  type EmployeeRowForMapping,
} from './employees.mapper';
import { nextEid } from './employees.eid';

const PHOTO_SIGNED_URL_TTL = 15 * 60; // 15 minutes — matches access-token lifetime.

/**
 * Valid status transition map. Keys are the FROM slug, values are
 * the allowed TO slugs. Terminated is terminal — no transitions out.
 */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  intern: ['probation', 'contractor', 'terminated'],
  probation: ['permanent', 'contractor', 'terminated', 'on-leave'],
  permanent: ['on-leave', 'terminated'],
  contractor: ['permanent', 'terminated'],
  'on-leave': ['permanent', 'terminated'],
  terminated: [],
};

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly events: EventBusService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Mint short-lived signed download URLs for every employee photo in
   * a result page. Computed in one parallel batch so list views don't
   * pay an N×network-round-trip cost — `getSignedDownloadUrl` is HMAC
   * local but still async on the SDK API.
   */
  private async resolvePhotoUrls(
    rows: Array<{ id: string; documents: Array<{ kind: string; fileUrl: string }> }>,
  ): Promise<Map<string, string | null>> {
    const out = new Map<string, string | null>();
    await Promise.all(
      rows.map(async (row) => {
        const key = extractPhotoStorageKey(row.documents);
        if (!key) {
          out.set(row.id, null);
          return;
        }
        try {
          const url = await this.storage.getSignedDownloadUrl({
            bucket: 'documents',
            key,
            expiresInSeconds: PHOTO_SIGNED_URL_TTL,
          });
          out.set(row.id, url);
        } catch (err) {
          this.logger.warn(`Failed to sign photo URL for ${row.id}: ${(err as Error).message}`);
          out.set(row.id, null);
        }
      }),
    );
    return out;
  }

  private async resolveOnePhotoUrl(row: {
    id: string;
    documents: Array<{ kind: string; fileUrl: string }>;
  }): Promise<string | null> {
    const map = await this.resolvePhotoUrls([row]);
    return map.get(row.id) ?? null;
  }

  /* ---------- Reads ---------- */

  async list(viewer: AuthenticatedUser, query: EmployeeListQuery): Promise<EmployeeListResponse> {
    const scope = computeEmployeeReadScope(viewer);
    if (!scope.canRead) {
      return {
        data: [],
        meta: { page: query.page, pageSize: query.pageSize, total: 0, totalPages: 0 },
      };
    }

    const filters: Prisma.EmployeeWhereInput[] = [];
    if (!query.includeArchived) filters.push({ deletedAt: null });
    if (query.departmentId) filters.push({ departmentId: query.departmentId });
    if (query.statusId) filters.push({ statusId: query.statusId });
    if (query.managerId) filters.push({ managerId: query.managerId });
    if (query.contractType) filters.push({ contractType: query.contractType });
    if (query.search) {
      const search = query.search.trim();
      filters.push({
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { eid: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const where = buildEmployeeScopeWhere(
      viewer,
      filters.length === 0 ? {} : filters.length === 1 ? filters[0]! : { AND: filters },
    );

    const skip = (query.page - 1) * query.pageSize;
    const orderBy: Prisma.EmployeeOrderByWithRelationInput = {
      [query.sortBy]: query.sortDir,
    };

    const [total, rows] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        include: EMPLOYEE_PUBLIC_INCLUDE,
        orderBy,
        skip,
        take: query.pageSize,
      }),
    ]);

    const photoUrls = await this.resolvePhotoUrls(rows);

    return {
      data: rows.map((row) =>
        toEmployeePublic(
          row as unknown as EmployeeRowForMapping,
          viewer,
          photoUrls.get(row.id) ?? null,
        ),
      ),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async findOne(viewer: AuthenticatedUser, id: string): Promise<EmployeePublic> {
    const row = await prisma.employee.findUnique({
      where: { id },
      include: EMPLOYEE_PUBLIC_INCLUDE,
    });
    if (!row) throw new NotFoundException('Employee not found');
    assertEmployeeReadable(viewer, { id: row.id, departmentId: row.departmentId });
    const photoUrl = await this.resolveOnePhotoUrl(row);
    return toEmployeePublic(row as unknown as EmployeeRowForMapping, viewer, photoUrl);
  }

  async totalActiveCount(viewer: AuthenticatedUser): Promise<{
    total: number;
    byStatus: Array<{ slug: string; name: string; count: number }>;
  }> {
    const scope = computeEmployeeReadScope(viewer);
    if (!scope.canRead) return { total: 0, byStatus: [] };

    const baseWhere = buildEmployeeScopeWhere(viewer, {
      deletedAt: null,
      status: { slug: { not: 'terminated' } },
    });

    const [total, statusRows] = await Promise.all([
      prisma.employee.count({ where: baseWhere }),
      prisma.employee.groupBy({
        by: ['statusId'],
        where: baseWhere,
        _count: { _all: true },
      }),
    ]);

    const statuses = await prisma.employeeStatus.findMany({
      where: { id: { in: statusRows.map((r) => r.statusId) } },
    });
    const byId = new Map(statuses.map((s) => [s.id, s]));
    const byStatus = statusRows
      .map((r) => {
        const s = byId.get(r.statusId);
        return s ? { slug: s.slug, name: s.name, count: r._count._all } : null;
      })
      .filter((x): x is { slug: string; name: string; count: number } => x !== null);

    return { total, byStatus };
  }

  /**
   * KPI tile inputs for the employees list page header. All four cards
   * come from one round-trip — frontend renders skeletons until the
   * single query resolves rather than juggle four separate states.
   *
   * Every count is scoped via buildEmployeeScopeWhere so a department
   * manager sees stats for their team only, not the whole org.
   */
  async stats(viewer: AuthenticatedUser): Promise<{
    totalHeadcount: number;
    totalDeltaPct: number | null;
    newThisMonth: number;
    newThisMonthDeltaPct: number | null;
    onProbation: number;
    onProbationClosingThisWeek: number;
    avgTenureYears: number;
    tenureOver3yPercent: number;
    distinctDepartments: number;
  }> {
    const scope = computeEmployeeReadScope(viewer);
    if (!scope.canRead) {
      return {
        totalHeadcount: 0,
        totalDeltaPct: null,
        newThisMonth: 0,
        newThisMonthDeltaPct: null,
        onProbation: 0,
        onProbationClosingThisWeek: 0,
        avgTenureYears: 0,
        tenureOver3yPercent: 0,
        distinctDepartments: 0,
      };
    }

    const activeWhere = buildEmployeeScopeWhere(viewer, {
      deletedAt: null,
      status: { slug: { not: 'terminated' } },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const sevenDaysOut = new Date(now);
    sevenDaysOut.setDate(now.getDate() + 7);

    const newThisMonthWhere = buildEmployeeScopeWhere(viewer, {
      deletedAt: null,
      joinDate: { gte: startOfMonth, lte: now },
    });
    const newLastMonthWhere = buildEmployeeScopeWhere(viewer, {
      deletedAt: null,
      joinDate: { gte: startOfLastMonth, lt: startOfMonth },
    });
    const headcountLastMonthWhere = buildEmployeeScopeWhere(viewer, {
      deletedAt: null,
      status: { slug: { not: 'terminated' } },
      joinDate: { lt: startOfMonth },
    });
    const headcountBeforeLastWhere = buildEmployeeScopeWhere(viewer, {
      deletedAt: null,
      status: { slug: { not: 'terminated' } },
      joinDate: { lt: startOfLastMonth },
    });

    const probationWhere = buildEmployeeScopeWhere(viewer, {
      deletedAt: null,
      status: { slug: 'probation' },
    });
    const probationClosingWhere = buildEmployeeScopeWhere(viewer, {
      deletedAt: null,
      status: { slug: 'probation' },
      probationEndDate: { gte: now, lte: sevenDaysOut },
    });

    const [
      totalHeadcount,
      headcountLastMonth,
      headcountBeforeLast,
      newThisMonth,
      newLastMonth,
      onProbation,
      onProbationClosingThisWeek,
      tenureRows,
      deptGroups,
    ] = await Promise.all([
      prisma.employee.count({ where: activeWhere }),
      prisma.employee.count({ where: headcountLastMonthWhere }),
      prisma.employee.count({ where: headcountBeforeLastWhere }),
      prisma.employee.count({ where: newThisMonthWhere }),
      prisma.employee.count({ where: newLastMonthWhere }),
      prisma.employee.count({ where: probationWhere }),
      prisma.employee.count({ where: probationClosingWhere }),
      prisma.employee.findMany({
        where: activeWhere,
        select: { joinDate: true },
      }),
      prisma.employee.groupBy({
        by: ['departmentId'],
        where: activeWhere,
        _count: { _all: true },
      }),
    ]);

    const totalDeltaPct = pctChange(
      headcountBeforeLast,
      // Approximate "last month's headcount" with rows joined before this
      // month started — soft-deleted/terminated rows joined later don't
      // skew it. Same logic for the start-of-last-month baseline below.
      headcountLastMonth,
    );
    const newThisMonthDeltaPct = pctChange(newLastMonth, newThisMonth);

    const dayMs = 24 * 60 * 60 * 1000;
    const yearMs = 365.25 * dayMs;
    let avgTenureYears = 0;
    let tenureOver3yPercent = 0;
    if (tenureRows.length > 0) {
      const tenures = tenureRows.map((r) => (now.getTime() - r.joinDate.getTime()) / yearMs);
      const sum = tenures.reduce((acc, t) => acc + t, 0);
      avgTenureYears = sum / tenures.length;
      const over3 = tenures.filter((t) => t > 3).length;
      tenureOver3yPercent = (over3 / tenures.length) * 100;
    }

    return {
      totalHeadcount,
      totalDeltaPct,
      newThisMonth,
      newThisMonthDeltaPct,
      onProbation,
      onProbationClosingThisWeek,
      avgTenureYears: Math.round(avgTenureYears * 10) / 10,
      tenureOver3yPercent: Math.round(tenureOver3yPercent),
      distinctDepartments: deptGroups.length,
    };
  }

  /* ---------- Writes ---------- */

  async create(actor: AuthenticatedUser, input: EmployeeCreateInput): Promise<EmployeePublic> {
    await this.validateReferences(input);
    await this.assertEmailUnique(input.email, null);

    const eid = await nextEid();
    const created = await prisma.employee.create({
      data: {
        eid,
        fullName: input.fullName,
        email: input.email.toLowerCase(),
        phone: input.phone ?? null,
        dateOfBirth: input.dateOfBirth ?? null,
        gender: input.gender ?? null,
        cnic: input.cnic ?? null,
        joinDate: input.joinDate,
        departmentId: input.departmentId,
        designationId: input.designationId,
        statusId: input.statusId,
        contractType: input.contractType,
        managerId: input.managerId ?? null,
        salaryPkr: input.salaryPkr ?? null,
        salaryProcessedExternally: input.salaryProcessedExternally ?? false,
        hasPayoneer: input.hasPayoneer ?? false,
        payoneerAccountId: input.payoneerAccountId ?? null,
        internshipEndDate: input.internshipEndDate ?? null,
        probationEndDate: input.probationEndDate ?? null,
        biannualReviewEnabled: input.biannualReviewEnabled ?? false,
        annualReviewEnabled: input.annualReviewEnabled ?? true,
        emergencyContact: input.emergencyContact ?? Prisma.JsonNull,
      },
      include: EMPLOYEE_PUBLIC_INCLUDE,
    });

    this.events.emit(
      'employee.created',
      {
        employeeId: created.id,
        eid: created.eid,
        fullName: created.fullName,
        departmentId: created.departmentId,
        designationId: created.designationId,
        statusId: created.statusId,
        joinDate: created.joinDate.toISOString(),
      },
      { actorId: actor.id },
    );

    const photoUrl = await this.resolveOnePhotoUrl(created);
    return toEmployeePublic(created as unknown as EmployeeRowForMapping, actor, photoUrl);
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    input: EmployeeUpdateInput,
  ): Promise<EmployeePublic> {
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Employee not found');
    assertEmployeeReadable(actor, { id: existing.id, departmentId: existing.departmentId });

    if (input.email && input.email !== existing.email) {
      await this.assertEmailUnique(input.email, id);
    }
    if (
      input.departmentId ||
      input.designationId ||
      input.statusId ||
      input.managerId !== undefined
    ) {
      await this.validateReferences({
        ...input,
        departmentId: input.departmentId ?? existing.departmentId,
        designationId: input.designationId ?? existing.designationId,
        statusId: input.statusId ?? existing.statusId,
      } as EmployeeCreateInput);
    }
    if (input.managerId && input.managerId === id) {
      throw new BadRequestException('Employee cannot be their own manager');
    }

    const data: Prisma.EmployeeUpdateInput = {};
    const changed: string[] = [];
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};

    const fields = Object.keys(input) as Array<keyof EmployeeUpdateInput>;
    for (const key of fields) {
      const value = input[key];
      if (value === undefined) continue;
      const existingValue = (existing as Record<string, unknown>)[key];
      // Cheap deep-equal via JSON; precise enough for our scalar+Date+Json fields.
      if (JSON.stringify(existingValue) === JSON.stringify(value)) continue;
      changed.push(key);
      before[key] = existingValue;
      after[key] = value;
      (data as Record<string, unknown>)[key] =
        key === 'email' && typeof value === 'string' ? value.toLowerCase() : value;
    }

    if (changed.length === 0) {
      // No-op update — still return the current view.
      const fresh = await prisma.employee.findUnique({
        where: { id },
        include: EMPLOYEE_PUBLIC_INCLUDE,
      });
      const photoUrl = await this.resolveOnePhotoUrl(fresh!);
      return toEmployeePublic(fresh as unknown as EmployeeRowForMapping, actor, photoUrl);
    }

    // Salary changes go through changeSalary so SalaryHistory is captured.
    if (changed.includes('salaryPkr')) {
      throw new BadRequestException(
        'Use POST /employees/:id/change-salary to record a salary change',
      );
    }
    if (changed.includes('statusId')) {
      throw new BadRequestException(
        'Use POST /employees/:id/change-status to record a status change',
      );
    }
    if (changed.includes('managerId')) {
      throw new BadRequestException(
        'Use POST /employees/:id/change-manager to record a manager change',
      );
    }

    const updated = await prisma.employee.update({
      where: { id },
      data,
      include: EMPLOYEE_PUBLIC_INCLUDE,
    });

    this.events.emit(
      'employee.updated',
      { employeeId: id, changedFields: changed, before, after },
      { actorId: actor.id },
    );

    const photoUrl = await this.resolveOnePhotoUrl(updated);
    return toEmployeePublic(updated as unknown as EmployeeRowForMapping, actor, photoUrl);
  }

  async softDelete(actor: AuthenticatedUser, id: string): Promise<void> {
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Employee not found');
    if (existing.deletedAt) return;
    assertEmployeeReadable(actor, { id: existing.id, departmentId: existing.departmentId });

    await prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.events.emit('employee.deleted', { employeeId: id }, { actorId: actor.id });
  }

  async changeStatus(
    actor: AuthenticatedUser,
    id: string,
    input: ChangeStatusInput,
  ): Promise<EmployeePublic> {
    const existing = await prisma.employee.findUnique({
      where: { id },
      include: { status: true },
    });
    if (!existing) throw new NotFoundException('Employee not found');
    assertEmployeeReadable(actor, { id: existing.id, departmentId: existing.departmentId });

    if (existing.statusId === input.statusId) {
      throw new BadRequestException('Employee already in that status');
    }

    const target = await prisma.employeeStatus.findUnique({ where: { id: input.statusId } });
    if (!target) throw new BadRequestException('Unknown target status');

    const allowed = STATUS_TRANSITIONS[existing.status.slug] ?? [];
    if (!allowed.includes(target.slug)) {
      throw new BadRequestException(
        `Cannot transition from ${existing.status.slug} to ${target.slug}`,
      );
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: { statusId: input.statusId },
      include: EMPLOYEE_PUBLIC_INCLUDE,
    });

    const fromStatusId = existing.statusId;
    const toStatusId = updated.statusId;
    const effectiveDate = input.effectiveDate ?? new Date();

    this.events.emit(
      'employee.updated',
      {
        employeeId: id,
        changedFields: ['statusId'],
        before: { statusId: fromStatusId },
        after: { statusId: toStatusId },
      },
      { actorId: actor.id },
    );
    this.events.emit(
      'employee.status.changed',
      {
        employeeId: id,
        fromStatusId,
        toStatusId,
        fromStatusName: existing.status.name,
        toStatusName: target.name,
        effectiveDate: effectiveDate.toISOString(),
        remarks: input.remarks ?? null,
      },
      { actorId: actor.id },
    );

    const photoUrl = await this.resolveOnePhotoUrl(updated);
    return toEmployeePublic(updated as unknown as EmployeeRowForMapping, actor, photoUrl);
  }

  async changeManager(
    actor: AuthenticatedUser,
    id: string,
    input: ChangeManagerInput,
  ): Promise<EmployeePublic> {
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Employee not found');
    assertEmployeeReadable(actor, { id: existing.id, departmentId: existing.departmentId });

    if (input.managerId === id) {
      throw new BadRequestException('Employee cannot be their own manager');
    }
    if (existing.managerId === input.managerId) {
      throw new BadRequestException('Employee already has that manager');
    }
    if (input.managerId) {
      const newManager = await prisma.employee.findUnique({ where: { id: input.managerId } });
      if (!newManager || newManager.deletedAt) {
        throw new BadRequestException('New manager not found');
      }
    }

    const oldManagerId = existing.managerId;
    const updated = await prisma.employee.update({
      where: { id },
      data: { managerId: input.managerId ?? null },
      include: EMPLOYEE_PUBLIC_INCLUDE,
    });

    this.events.emit(
      'employee.updated',
      {
        employeeId: id,
        changedFields: ['managerId'],
        before: { managerId: oldManagerId },
        after: { managerId: input.managerId ?? null },
      },
      { actorId: actor.id },
    );
    this.events.emit(
      'employee.manager.changed',
      {
        employeeId: id,
        oldManagerId,
        newManagerId: input.managerId ?? null,
        remarks: input.remarks ?? null,
      },
      { actorId: actor.id },
    );

    const photoUrl = await this.resolveOnePhotoUrl(updated);
    return toEmployeePublic(updated as unknown as EmployeeRowForMapping, actor, photoUrl);
  }

  async changeSalary(
    actor: AuthenticatedUser,
    id: string,
    input: ChangeSalaryInput,
  ): Promise<EmployeePublic> {
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Employee not found');
    assertEmployeeReadable(actor, { id: existing.id, departmentId: existing.departmentId });

    const oldSalary = existing.salaryPkr ? Number(existing.salaryPkr.toString()) : null;
    if (oldSalary !== null && Math.abs(oldSalary - input.newSalaryPkr) < 0.01) {
      throw new BadRequestException('New salary equals current salary');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const history = await tx.salaryHistory.create({
        data: {
          employeeId: id,
          oldSalaryPkr: existing.salaryPkr,
          newSalaryPkr: input.newSalaryPkr,
          effectiveDate: input.effectiveDate,
          remarks: input.remarks ?? null,
          changedBy: actor.id,
        },
      });

      const next = await tx.employee.update({
        where: { id },
        data: {
          salaryPkr: input.newSalaryPkr,
          lastIncrementDate:
            oldSalary !== null && input.newSalaryPkr > oldSalary
              ? input.effectiveDate
              : existing.lastIncrementDate,
        },
        include: EMPLOYEE_PUBLIC_INCLUDE,
      });

      return { next, historyId: history.id };
    });

    this.events.emit(
      'employee.updated',
      {
        employeeId: id,
        changedFields: ['salaryPkr'],
        before: { salaryPkr: oldSalary },
        after: { salaryPkr: input.newSalaryPkr },
      },
      { actorId: actor.id },
    );
    this.events.emit(
      'employee.salary.updated',
      {
        employeeId: id,
        oldSalaryPkr: oldSalary,
        newSalaryPkr: input.newSalaryPkr,
        effectiveDate: input.effectiveDate.toISOString(),
        remarks: input.remarks ?? null,
        historyId: updated.historyId,
      },
      { actorId: actor.id },
    );

    const photoUrl = await this.resolveOnePhotoUrl(updated.next);
    return toEmployeePublic(updated.next as unknown as EmployeeRowForMapping, actor, photoUrl);
  }

  /* ---------- Salary history ---------- */

  async listSalaryHistory(
    viewer: AuthenticatedUser,
    employeeId: string,
  ): Promise<SalaryHistoryEntry[]> {
    if (!canViewSalary(viewer)) {
      throw new ForbiddenException('You do not have permission to view salary data');
    }
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');
    assertEmployeeReadable(viewer, { id: employee.id, departmentId: employee.departmentId });

    const rows = await prisma.salaryHistory.findMany({
      where: { employeeId },
      orderBy: { effectiveDate: 'desc' },
    });

    const userIds = [...new Set(rows.map((r) => r.changedBy).filter(Boolean))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      include: { employee: { select: { fullName: true } } },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return rows.map((r) => {
      const user = userMap.get(r.changedBy);
      return {
        id: r.id,
        employeeId: r.employeeId,
        oldSalaryPkr: r.oldSalaryPkr ? Number(r.oldSalaryPkr.toString()) : null,
        newSalaryPkr: Number(r.newSalaryPkr.toString()),
        effectiveDate: r.effectiveDate.toISOString(),
        remarks: r.remarks,
        changedBy: r.changedBy,
        changedByName: user?.employee?.fullName ?? user?.email ?? null,
        createdAt: r.createdAt.toISOString(),
      };
    });
  }

  /* ---------- Timeline ---------- */

  async listTimeline(
    viewer: AuthenticatedUser,
    employeeId: string,
  ): Promise<TimelineEntryPublic[]> {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');
    assertEmployeeReadable(viewer, { id: employee.id, departmentId: employee.departmentId });

    const rows = await prisma.timelineEntry.findMany({
      where: { employeeId },
      orderBy: { occurredAt: 'desc' },
      take: 500,
    });

    const showSalary = canViewSalary(viewer);
    return rows.map((r) => {
      const details = r.details as Record<string, unknown> | null;
      let publicDetails = details;
      let title = r.title;
      if (!showSalary && r.eventType === 'employee.salary.updated') {
        publicDetails = details ? { hidden: true } : null;
        title = 'Salary updated';
      }
      return {
        id: r.id,
        employeeId: r.employeeId,
        eventType: r.eventType,
        module: r.module,
        title,
        details: publicDetails,
        occurredAt: r.occurredAt.toISOString(),
        createdById: r.createdById,
        createdAt: r.createdAt.toISOString(),
      };
    });
  }

  /* ---------- Org chart ---------- */

  async orgChart(viewer: AuthenticatedUser): Promise<OrgChartNode[]> {
    const where = buildEmployeeScopeWhere(viewer, { deletedAt: null });
    const rows = await prisma.employee.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        eid: true,
        managerId: true,
        designation: { select: { name: true } },
        department: { select: { name: true } },
        documents: {
          where: { kind: 'photo' },
          orderBy: { uploadedAt: 'desc' },
          take: 1,
          select: { fileUrl: true },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const nodeById = new Map<string, OrgChartNode>(
      rows.map((r) => [
        r.id,
        {
          id: r.id,
          fullName: r.fullName,
          eid: r.eid,
          designation: r.designation.name,
          department: r.department.name,
          photoUrl: r.documents[0]?.fileUrl ?? null,
          reports: [],
        },
      ]),
    );

    const roots: OrgChartNode[] = [];
    for (const r of rows) {
      const node = nodeById.get(r.id)!;
      if (r.managerId && nodeById.has(r.managerId)) {
        nodeById.get(r.managerId)!.reports.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  /* ---------- Photo ---------- */

  /**
   * Records a freshly uploaded photo as a Document row. The actual MinIO
   * upload happens in the controller (where the multer-buffered file
   * is available); this method handles the metadata + event side. The
   * mapper will surface the latest 'photo' document on subsequent reads.
   */
  async recordPhotoUpload(
    actor: AuthenticatedUser,
    employeeId: string,
    input: { storageKey: string },
  ): Promise<{ documentId: string; photoUrl: string | null }> {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');
    assertEmployeeReadable(actor, { id: employee.id, departmentId: employee.departmentId });

    const doc = await prisma.employeeDocument.create({
      data: {
        employeeId,
        kind: 'photo',
        fileUrl: input.storageKey,
      },
    });

    this.events.emit(
      'employee.document.uploaded',
      { employeeId, documentId: doc.id, kind: 'photo' },
      { actorId: actor.id },
    );

    const fresh = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        documents: { where: { kind: 'photo' }, orderBy: { uploadedAt: 'desc' }, take: 1 },
      },
    });
    const photoUrl = fresh ? await this.resolveOnePhotoUrl(fresh) : null;
    return { documentId: doc.id, photoUrl };
  }

  /* ---------- CSV export ---------- */

  async exportRowsForCsv(
    viewer: AuthenticatedUser,
    query: EmployeeListQuery,
  ): Promise<
    Array<{
      eid: string;
      fullName: string;
      email: string;
      phone: string | null;
      department: string;
      designation: string;
      status: string;
      contractType: string;
      joinDate: Date;
      manager: string | null;
      salaryPkr: number | null;
    }>
  > {
    const filters: Prisma.EmployeeWhereInput[] = [];
    if (!query.includeArchived) filters.push({ deletedAt: null });
    if (query.departmentId) filters.push({ departmentId: query.departmentId });
    if (query.statusId) filters.push({ statusId: query.statusId });
    if (query.managerId) filters.push({ managerId: query.managerId });
    const where = buildEmployeeScopeWhere(
      viewer,
      filters.length === 0 ? {} : filters.length === 1 ? filters[0]! : { AND: filters },
    );

    const rows = await prisma.employee.findMany({
      where,
      include: {
        department: { select: { name: true } },
        designation: { select: { name: true } },
        status: { select: { name: true } },
        manager: { select: { fullName: true } },
      },
      orderBy: { fullName: 'asc' },
      take: 10_000,
    });

    return rows.map((r) => ({
      eid: r.eid,
      fullName: r.fullName,
      email: r.email,
      phone: r.phone,
      department: r.department.name,
      designation: r.designation.name,
      status: r.status.name,
      contractType: r.contractType,
      joinDate: r.joinDate,
      manager: r.manager?.fullName ?? null,
      salaryPkr: r.salaryPkr ? Number(r.salaryPkr.toString()) : null,
    }));
  }

  /* ---------- Reference lookups ---------- */

  async references(): Promise<ReferencesResponse> {
    const [departments, designations, statuses] = await Promise.all([
      prisma.department.findMany({
        where: { isActive: true, deletedAt: null },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, slug: true },
      }),
      prisma.designation.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, departmentId: true },
      }),
      prisma.employeeStatus.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, slug: true },
      }),
    ]);
    return { departments, designations, statuses };
  }

  /* ---------- Internals ---------- */

  private async validateReferences(
    input: Pick<EmployeeCreateInput, 'departmentId' | 'designationId' | 'statusId' | 'managerId'>,
  ): Promise<void> {
    const [dept, design, status] = await Promise.all([
      prisma.department.findUnique({ where: { id: input.departmentId } }),
      prisma.designation.findUnique({ where: { id: input.designationId } }),
      prisma.employeeStatus.findUnique({ where: { id: input.statusId } }),
    ]);
    if (!dept) throw new BadRequestException('Unknown department');
    if (!design) throw new BadRequestException('Unknown designation');
    if (design.departmentId !== input.departmentId) {
      throw new BadRequestException('Designation does not belong to the selected department');
    }
    if (!status) throw new BadRequestException('Unknown status');
    if (input.managerId) {
      const mgr = await prisma.employee.findUnique({ where: { id: input.managerId } });
      if (!mgr || mgr.deletedAt) throw new BadRequestException('Unknown manager');
    }
  }

  /* ---------- Internals (continued) ---------- */
  private async assertEmailUnique(email: string, excludeId: string | null): Promise<void> {
    const existing = await prisma.employee.findUnique({ where: { email: email.toLowerCase() } });
    if (existing && existing.id !== excludeId) {
      throw new BadRequestException('Email is already in use');
    }
  }
}

/** Percentage change from `prev` to `next` — null when prev is 0 (avoid /0). */
function pctChange(prev: number, next: number): number | null {
  if (prev <= 0) return next > 0 ? null : 0;
  return Math.round(((next - prev) / prev) * 1000) / 10;
}
