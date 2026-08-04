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
  EmployeeFilterCountsQuery,
  EmployeeFilterCountsResponse,
  EmployeeListQuery,
  EmployeeListResponse,
  EmployeePublic,
  EmployeeUpdateInput,
  MoveToNoticeInput,
  OrgChartNode,
  ReferencesResponse,
  SalaryHistoryEntry,
  TerminateEmployeeInput,
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
      return { items: [], total: 0, hasMore: false };
    }

    const where = buildEmployeeFilterWhere(viewer, query);

    const orderBy: Prisma.EmployeeOrderByWithRelationInput = {
      [query.sortBy]: query.sortDir,
    };

    const [total, rows] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        include: EMPLOYEE_PUBLIC_INCLUDE,
        orderBy,
        skip: query.offset,
        take: query.limit,
      }),
    ]);

    const photoUrls = await this.resolvePhotoUrls(rows);

    const items = rows.map((row) =>
      toEmployeePublic(
        row as unknown as EmployeeRowForMapping,
        viewer,
        photoUrls.get(row.id) ?? null,
      ),
    );

    return {
      items,
      total,
      hasMore: query.offset + items.length < total,
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

  /**
   * Active project engagements for an employee — the "active projects"
   * strip on their (read-only) self-service portal view. Returns only
   * live projects (active / in-billing / on-hold) the employee is
   * currently assigned to, with their role and share.
   */
  async assignedProjects(
    viewer: AuthenticatedUser,
    id: string,
  ): Promise<
    Array<{
      projectId: string;
      name: string;
      clientName: string;
      status: string;
      roleName: string;
      percentage: number;
      revenueUsd: number;
    }>
  > {
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, departmentId: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    assertEmployeeReadable(viewer, { id: employee.id, departmentId: employee.departmentId });

    const rows = await prisma.projectAssignment.findMany({
      where: {
        employeeId: id,
        removedAt: null,
        project: { deletedAt: null, status: { in: ['active', 'in_billing', 'on_hold'] } },
      },
      select: {
        roleName: true,
        percentage: true,
        project: {
          select: { id: true, name: true, clientName: true, status: true, revenueUsd: true },
        },
      },
      orderBy: { project: { name: 'asc' } },
    });

    return rows.map((r) => ({
      projectId: r.project.id,
      name: r.project.name,
      clientName: r.project.clientName,
      status: r.project.status,
      roleName: r.roleName,
      percentage: Number(r.percentage),
      revenueUsd: Number(r.project.revenueUsd),
    }));
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

  /* ---------- Filter counts ---------- */

  /**
   * Powers the Advanced Filters drawer (`GET /employees/filter-counts`).
   *
   * Returns the **total** matching the current filter state plus
   * per-option counts for every group the drawer surfaces. The
   * per-option counts are computed under the *current* filter state
   * (Amazon-style facet refinement — "if you keep these filters, this
   * is what each option still resolves to"). The frontend uses them to
   * surface zero-result options and to populate the salary histogram +
   * date-range bars.
   *
   * Each group runs as a parallel `groupBy` / aggregate to keep total
   * wall time roughly equal to a single count query.
   */
  async getFilterCounts(
    viewer: AuthenticatedUser,
    query: EmployeeFilterCountsQuery,
  ): Promise<EmployeeFilterCountsResponse> {
    const scope = computeEmployeeReadScope(viewer);
    if (!scope.canRead) {
      return emptyFilterCountsResponse();
    }

    const where = buildEmployeeFilterWhere(viewer, query);
    const seeSalary = canViewSalary(viewer);

    const [
      total,
      byDepartmentRows,
      byDesignationRows,
      byStatusRows,
      byContractRows,
      byManagerRows,
      byEmploymentRecordRows,
      salaryAgg,
      salaryRows,
      joinAgg,
      joinRows,
      tenureRows,
      payoneerCount,
      pkrOnlyCount,
      processedExternallyCount,
      eligibleCommissionsCount,
      missingEmergencyCount,
      missingProbationCount,
      missingPhotoCount,
    ] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.groupBy({
        by: ['departmentId'],
        where,
        _count: { _all: true },
      }),
      prisma.employee.groupBy({
        by: ['designationId'],
        where,
        _count: { _all: true },
      }),
      prisma.employee.groupBy({ by: ['statusId'], where, _count: { _all: true } }),
      prisma.employee.groupBy({
        by: ['contractType'],
        where,
        _count: { _all: true },
      }),
      prisma.employee.groupBy({ by: ['managerId'], where, _count: { _all: true } }),
      prisma.employee.groupBy({
        by: ['employmentRecord'],
        where,
        _count: { _all: true },
      }),
      seeSalary
        ? prisma.employee.aggregate({
            where: { ...where, salaryPkr: { not: null } },
            _min: { salaryPkr: true },
            _max: { salaryPkr: true },
          })
        : Promise.resolve(null as null),
      seeSalary
        ? prisma.employee.findMany({
            where: { ...where, salaryPkr: { not: null } },
            select: { salaryPkr: true },
            take: 10_000,
          })
        : Promise.resolve([] as Array<{ salaryPkr: unknown }>),
      prisma.employee.aggregate({
        where,
        _min: { joinDate: true },
        _max: { joinDate: true },
      }),
      prisma.employee.findMany({
        where,
        select: { joinDate: true },
        take: 10_000,
      }),
      prisma.employee.findMany({
        where,
        select: { joinDate: true },
        take: 10_000,
      }),
      prisma.employee.count({ where: { ...where, hasPayoneer: true } }),
      prisma.employee.count({ where: { ...where, hasPayoneer: false } }),
      prisma.employee.count({ where: { ...where, salaryProcessedExternally: true } }),
      prisma.employee.count({ where: { ...where, eligibleForCommissions: true } }),
      prisma.employee.count({
        where: { ...where, OR: [{ emergencyContact: { equals: Prisma.JsonNull } }] },
      }),
      prisma.employee.count({ where: { ...where, probationEndDate: null } }),
      prisma.employee.count({
        where: { ...where, documents: { none: { kind: 'photo' } } },
      }),
    ]);

    const byDepartment = aggToRecord(byDepartmentRows, 'departmentId');
    const byDesignation = aggToRecord(byDesignationRows, 'designationId');
    const byStatus = aggToRecord(byStatusRows, 'statusId');
    const byContract = aggToRecord(byContractRows, 'contractType');
    const byManager = aggToRecord(byManagerRows, 'managerId');
    const byEmploymentRecord = aggToRecord(byEmploymentRecordRows, 'employmentRecord');

    /* Salary histogram — 20 buckets across the full range. */
    let salary: EmployeeFilterCountsResponse['salary'];
    if (seeSalary && salaryAgg && salaryRows.length > 0) {
      const min = salaryAgg._min.salaryPkr ? Number(salaryAgg._min.salaryPkr.toString()) : 0;
      const max = salaryAgg._max.salaryPkr ? Number(salaryAgg._max.salaryPkr.toString()) : 0;
      salary = {
        min,
        max,
        buckets: bucketize(
          salaryRows.map((r) => Number((r.salaryPkr as { toString(): string }).toString())),
          min,
          max,
          20,
        ),
      };
    } else {
      salary = { min: 0, max: 0, buckets: [] };
    }

    /* Join-date histogram — month buckets between earliest and latest. */
    const earliest = joinAgg._min.joinDate ?? null;
    const latest = joinAgg._max.joinDate ?? null;
    const joinDate = {
      earliest: earliest ? earliest.toISOString() : null,
      latest: latest ? latest.toISOString() : null,
      buckets:
        earliest && latest
          ? monthBuckets(
              joinRows.map((r) => r.joinDate),
              earliest,
              latest,
            )
          : [],
    };

    /* Tenure buckets. */
    const now = Date.now();
    const yearMs = 365.25 * 24 * 60 * 60 * 1000;
    const tenure = { lt1: 0, oneToThree: 0, threeToFive: 0, fiveToTen: 0, tenPlus: 0 };
    for (const r of tenureRows) {
      const yrs = (now - r.joinDate.getTime()) / yearMs;
      if (yrs < 1) tenure.lt1++;
      else if (yrs < 3) tenure.oneToThree++;
      else if (yrs < 5) tenure.threeToFive++;
      else if (yrs < 10) tenure.fiveToTen++;
      else tenure.tenPlus++;
    }

    return {
      total,
      byDepartment,
      byDesignation,
      byStatus,
      byContract,
      byManager,
      byEmploymentRecord,
      salary,
      joinDate,
      tenure,
      compensation: {
        payoneer: payoneerCount,
        pkrOnly: pkrOnlyCount,
        processedExternally: processedExternallyCount,
        eligibleCommissions: eligibleCommissionsCount,
      },
      documents: {
        missingEmergencyContact: missingEmergencyCount,
        missingProbationEndDate: missingProbationCount,
        missingPhoto: missingPhotoCount,
      },
    };
  }

  /* ---------- Writes ---------- */

  async create(actor: AuthenticatedUser, input: EmployeeCreateInput): Promise<EmployeePublic> {
    await this.validateReferences(input);
    await this.assertEmailUnique(input.email, null);

    // The sheet UI surfaces First + Last; the legacy fullName field is
    // joined from them when present, otherwise the explicit fullName
    // input is used as-is. Either path produces a non-empty fullName.
    const firstName = input.firstName?.trim() || null;
    const lastName = input.lastName?.trim() || null;
    const joined = [firstName, lastName].filter(Boolean).join(' ');
    const fullName = joined || input.fullName;

    const eid = await nextEid();
    const created = await prisma.employee.create({
      data: {
        eid,
        fullName,
        firstName,
        lastName,
        pronouns: input.pronouns ?? null,
        email: input.email.toLowerCase(),
        personalEmail: input.personalEmail ?? null,
        phone: input.phone ?? null,
        personalPhone: input.personalPhone ?? null,
        address: input.address ?? null,
        dateOfBirth: input.dateOfBirth ?? null,
        gender: input.gender ?? null,
        cnic: input.cnic ?? null,
        joinDate: input.joinDate,
        departmentId: input.departmentId,
        designationId: input.designationId,
        statusId: input.statusId,
        contractType: input.contractType,
        employmentRecord: input.employmentRecord ?? null,
        managerId: input.managerId ?? null,
        systemRoleSlug: input.systemRole ?? 'employee',
        salaryPkr: input.salaryPkr ?? null,
        salaryEffectiveDate: input.salaryEffectiveDate ?? null,
        salaryProcessedExternally: input.salaryProcessedExternally ?? false,
        hasPayoneer: input.hasPayoneer ?? false,
        payoneerAccountId: input.payoneerAccountId ?? null,
        payoneerEmail: input.payoneerEmail ?? null,
        eligibleForCommissions: input.eligibleForCommissions ?? false,
        commissionRate: input.commissionRate ?? null,
        bankName: input.bankName ?? null,
        bankBranch: input.bankBranch ?? null,
        iban: input.iban ?? null,
        internshipEndDate: input.internshipEndDate ?? null,
        probationEndDate: input.probationEndDate ?? null,
        biannualReviewEnabled: input.biannualReviewEnabled ?? false,
        annualReviewEnabled: input.annualReviewEnabled ?? true,
        timezone: input.timezone ?? null,
        quietHoursStart: input.quietHoursStart ?? null,
        quietHoursEnd: input.quietHoursEnd ?? null,
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

    // Map Zod input keys → Prisma column names. `systemRole` is the
    // public field; it lives as `systemRoleSlug` on the row.
    const COLUMN_MAP: Record<string, string> = { systemRole: 'systemRoleSlug' };
    // `fullName` is derived from firstName + lastName when either of
    // them changes — don't allow the client to write it directly.
    const DERIVED_KEYS = new Set(['fullName']);

    const fields = Object.keys(input) as Array<keyof EmployeeUpdateInput>;
    for (const key of fields) {
      if (DERIVED_KEYS.has(key)) continue;
      const value = input[key];
      if (value === undefined) continue;
      const column = COLUMN_MAP[key] ?? key;
      const existingValue = (existing as Record<string, unknown>)[column];
      if (JSON.stringify(existingValue) === JSON.stringify(value)) continue;
      changed.push(key);
      before[key] = existingValue;
      after[key] = value;
      (data as Record<string, unknown>)[column] =
        key === 'email' && typeof value === 'string' ? value.toLowerCase() : value;
    }

    // If first/last name changed, recompute fullName so the
    // canonical column stays consistent with what the sheet shows.
    if (changed.includes('firstName') || changed.includes('lastName')) {
      const nextFirst = (input.firstName ?? existing.firstName ?? '').trim();
      const nextLast = (input.lastName ?? existing.lastName ?? '').trim();
      const nextFullName = [nextFirst, nextLast].filter(Boolean).join(' ') || existing.fullName;
      if (nextFullName !== existing.fullName) {
        data.fullName = nextFullName;
        changed.push('fullName');
        before.fullName = existing.fullName;
        after.fullName = nextFullName;
      }
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

    // The sheet redesign edits salary / status / manager inline along
    // with the rest of the fields, so the legacy "use POST /change-*"
    // guards are gone. Audit-grade history is still captured:
    //   • salaryPkr change → a SalaryHistory row inside the same tx
    //     with the optional input.salaryEffectiveDate (defaults to
    //     today) and a default 'Updated via employee form' remark
    //   • statusId / managerId change → captured via the
    //     `employee.updated` event below (changedFields + before/after)
    // The dedicated POST /change-salary, /change-status, and
    // /change-manager endpoints stay for workflows that need a
    // mandatory reason / effective date / typed remarks.

    const oldSalary = existing.salaryPkr ? Number(existing.salaryPkr.toString()) : null;
    const newSalary = changed.includes('salaryPkr') ? (input.salaryPkr ?? null) : oldSalary;
    const salaryDidChange =
      changed.includes('salaryPkr') &&
      (oldSalary === null ||
        newSalary === null ||
        Math.abs((newSalary ?? 0) - (oldSalary ?? 0)) >= 0.01);

    const updated = await prisma.$transaction(async (tx) => {
      if (salaryDidChange) {
        await tx.salaryHistory.create({
          data: {
            employeeId: id,
            oldSalaryPkr: existing.salaryPkr,
            newSalaryPkr: newSalary as number,
            effectiveDate: input.salaryEffectiveDate ?? new Date(),
            remarks: 'Updated via employee form',
            changedBy: actor.id,
          },
        });
        if (oldSalary !== null && (newSalary ?? 0) > oldSalary) {
          (data as Record<string, unknown>).lastIncrementDate =
            input.salaryEffectiveDate ?? new Date();
        }
      }
      return tx.employee.update({
        where: { id },
        data,
        include: EMPLOYEE_PUBLIC_INCLUDE,
      });
    });

    this.events.emit(
      'employee.updated',
      { employeeId: id, changedFields: changed, before, after },
      { actorId: actor.id },
    );
    if (salaryDidChange) {
      this.events.emit(
        'employee.salary.updated',
        {
          employeeId: id,
          oldSalaryPkr: oldSalary,
          newSalaryPkr: newSalary,
          effectiveDate: (input.salaryEffectiveDate ?? new Date()).toISOString(),
          remarks: 'Updated via employee form',
        },
        { actorId: actor.id },
      );
    }

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

  /**
   * 'Move to Notice' (Danger Zone — left button). Marks the start of
   * the notice period but does not freeze payroll or revoke login;
   * those happen on terminate. noticePeriodStart defaults to today.
   */
  async moveToNotice(
    actor: AuthenticatedUser,
    id: string,
    input: MoveToNoticeInput,
  ): Promise<EmployeePublic> {
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Employee not found');
    assertEmployeeReadable(actor, { id: existing.id, departmentId: existing.departmentId });
    if (existing.terminatedAt) {
      throw new BadRequestException('Employee is already terminated');
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: { noticePeriodStart: input.noticePeriodStart ?? new Date() },
      include: EMPLOYEE_PUBLIC_INCLUDE,
    });

    this.events.emit(
      'employee.notice.started',
      {
        employeeId: id,
        noticePeriodStart: updated.noticePeriodStart?.toISOString(),
        remarks: input.remarks,
      },
      { actorId: actor.id },
    );

    const photoUrl = await this.resolveOnePhotoUrl(updated);
    return toEmployeePublic(updated as unknown as EmployeeRowForMapping, actor, photoUrl);
  }

  /**
   * Terminate employment (Danger Zone — right button). Sets
   * terminatedAt + lastWorkingDay + reason + notes. The 'Only a
   * Super Admin can reverse this' guard from the design lives in
   * RBAC at the route layer — this method is reachable today only by
   * users with `employees:terminate`; restoring termination is not
   * exposed.
   */
  async terminate(
    actor: AuthenticatedUser,
    id: string,
    input: TerminateEmployeeInput,
  ): Promise<EmployeePublic> {
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Employee not found');
    assertEmployeeReadable(actor, { id: existing.id, departmentId: existing.departmentId });
    if (existing.terminatedAt) {
      throw new BadRequestException('Employee is already terminated');
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        terminatedAt: new Date(),
        lastWorkingDay: input.lastWorkingDay,
        terminationReason: input.reason,
        terminationNotes: input.notes ?? null,
      },
      include: EMPLOYEE_PUBLIC_INCLUDE,
    });

    this.events.emit(
      'employee.terminated',
      {
        employeeId: id,
        terminatedAt: updated.terminatedAt?.toISOString(),
        lastWorkingDay: updated.lastWorkingDay?.toISOString(),
        reason: input.reason,
      },
      { actorId: actor.id },
    );

    const photoUrl = await this.resolveOnePhotoUrl(updated);
    return toEmployeePublic(updated as unknown as EmployeeRowForMapping, actor, photoUrl);
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
    const where = buildEmployeeFilterWhere(viewer, query);

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

/* ---------- Filter-counts helpers ---------- */

function emptyFilterCountsResponse(): EmployeeFilterCountsResponse {
  return {
    total: 0,
    byDepartment: {},
    byDesignation: {},
    byStatus: {},
    byContract: {},
    byManager: {},
    byEmploymentRecord: {},
    salary: { min: 0, max: 0, buckets: [] },
    joinDate: { earliest: null, latest: null, buckets: [] },
    tenure: { lt1: 0, oneToThree: 0, threeToFive: 0, fiveToTen: 0, tenPlus: 0 },
    compensation: { payoneer: 0, pkrOnly: 0, processedExternally: 0, eligibleCommissions: 0 },
    documents: { missingEmergencyContact: 0, missingProbationEndDate: 0, missingPhoto: 0 },
  };
}

/**
 * Builds the canonical `Prisma.EmployeeWhereInput` for the employees
 * list + filter-counts endpoints. Both query shapes carry the same
 * filter fields (array of ids, ranges, flags); the list query just
 * adds offset/limit/sortBy on top, which aren't conditions.
 *
 * Single source of truth for "what filters mean" so the count footer,
 * the per-option counts, and the list table always agree.
 */
type EmployeeFilterableQuery = Pick<
  EmployeeFilterCountsQuery,
  | 'departmentIds'
  | 'designationIds'
  | 'statusIds'
  | 'contractTypes'
  | 'managerIds'
  | 'employmentRecords'
  | 'tenureBuckets'
  | 'compensationFlags'
  | 'documentFlags'
  | 'salaryMin'
  | 'salaryMax'
  | 'joinDateFrom'
  | 'joinDateTo'
  | 'search'
  | 'includeArchived'
>;

function buildEmployeeFilterWhere(
  viewer: AuthenticatedUser,
  query: EmployeeFilterableQuery,
): Prisma.EmployeeWhereInput {
  const filters: Prisma.EmployeeWhereInput[] = [];
  if (!query.includeArchived) filters.push({ deletedAt: null });
  if (query.departmentIds.length > 0) filters.push({ departmentId: { in: query.departmentIds } });
  if (query.designationIds.length > 0)
    filters.push({ designationId: { in: query.designationIds } });
  if (query.statusIds.length > 0) filters.push({ statusId: { in: query.statusIds } });
  if (query.contractTypes.length > 0) filters.push({ contractType: { in: query.contractTypes } });
  if (query.managerIds.length > 0) filters.push({ managerId: { in: query.managerIds } });
  if (query.employmentRecords.length > 0)
    filters.push({ employmentRecord: { in: query.employmentRecords } });
  if (query.salaryMin !== undefined) filters.push({ salaryPkr: { gte: query.salaryMin } });
  if (query.salaryMax !== undefined) filters.push({ salaryPkr: { lte: query.salaryMax } });
  if (query.joinDateFrom) filters.push({ joinDate: { gte: new Date(query.joinDateFrom) } });
  if (query.joinDateTo) filters.push({ joinDate: { lte: new Date(query.joinDateTo) } });

  if (query.compensationFlags.length > 0) {
    for (const flag of query.compensationFlags) {
      switch (flag) {
        case 'payoneer':
          filters.push({ hasPayoneer: true });
          break;
        case 'pkrOnly':
          filters.push({ hasPayoneer: false });
          break;
        case 'processedExternally':
          filters.push({ salaryProcessedExternally: true });
          break;
        case 'eligibleCommissions':
          filters.push({ eligibleForCommissions: true });
          break;
      }
    }
  }

  if (query.documentFlags.length > 0) {
    for (const flag of query.documentFlags) {
      switch (flag) {
        case 'missingEmergencyContact':
          filters.push({ emergencyContact: { equals: Prisma.JsonNull } });
          break;
        case 'missingProbationEndDate':
          filters.push({ probationEndDate: null });
          break;
        case 'missingPhoto':
          filters.push({ documents: { none: { kind: 'photo' } } });
          break;
      }
    }
  }

  if (query.tenureBuckets.length > 0) {
    const now = new Date();
    const tenureOrs: Prisma.EmployeeWhereInput[] = [];
    for (const slug of query.tenureBuckets) {
      const range = tenureSlugToRange(slug, now);
      if (range) tenureOrs.push({ joinDate: range });
    }
    if (tenureOrs.length > 0) filters.push({ OR: tenureOrs });
  }

  if (query.search) {
    // Search hits both the obvious identity fields (name, email,
    // EID) and contact fields users actually have at hand — phone +
    // personal phone + personal email. Numbers with dashes/spaces
    // still match because postgres ILIKE on a contains substring is
    // forgiving as long as the typed fragment appears unbroken.
    filters.push({
      OR: [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { eid: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { personalPhone: { contains: query.search, mode: 'insensitive' } },
        { personalEmail: { contains: query.search, mode: 'insensitive' } },
      ],
    });
  }

  return buildEmployeeScopeWhere(
    viewer,
    filters.length === 0 ? {} : filters.length === 1 ? filters[0]! : { AND: filters },
  );
}

function tenureSlugToRange(
  slug: string,
  now: Date,
): { gt?: Date; gte?: Date; lt?: Date; lte?: Date } | null {
  const yrs = (n: number) => {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - n);
    return d;
  };
  switch (slug) {
    case 'lt1':
      return { gte: yrs(1) };
    case '1to3':
      return { lt: yrs(1), gte: yrs(3) };
    case '3to5':
      return { lt: yrs(3), gte: yrs(5) };
    case '5to10':
      return { lt: yrs(5), gte: yrs(10) };
    case '10plus':
      return { lt: yrs(10) };
    default:
      return null;
  }
}

function aggToRecord<K extends string>(
  rows: Array<Record<K, string | null> & { _count: { _all: number } }>,
  key: K,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const id = r[key];
    if (!id) continue;
    out[id] = r._count._all;
  }
  return out;
}

function bucketize(
  values: number[],
  min: number,
  max: number,
  bucketCount: number,
): Array<{ from: number; to: number; count: number }> {
  if (values.length === 0 || max <= min) return [];
  const width = (max - min) / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, i) => ({
    from: min + i * width,
    to: min + (i + 1) * width,
    count: 0,
  }));
  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx >= bucketCount) idx = bucketCount - 1;
    if (idx < 0) idx = 0;
    buckets[idx]!.count++;
  }
  return buckets;
}

function monthBuckets(
  dates: Date[],
  earliest: Date,
  latest: Date,
): Array<{ from: string; to: string; count: number }> {
  if (dates.length === 0) return [];
  const start = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
  const end = new Date(latest.getFullYear(), latest.getMonth() + 1, 1);
  const buckets: Array<{ from: string; to: string; count: number; fromDate: Date; toDate: Date }> =
    [];
  for (let d = new Date(start); d < end; d.setMonth(d.getMonth() + 1)) {
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    buckets.push({
      from: d.toISOString(),
      to: next.toISOString(),
      count: 0,
      fromDate: new Date(d),
      toDate: next,
    });
  }
  for (const dt of dates) {
    const t = dt.getTime();
    const idx = buckets.findIndex((b) => t >= b.fromDate.getTime() && t < b.toDate.getTime());
    if (idx >= 0) buckets[idx]!.count++;
  }
  return buckets.map(({ from, to, count }) => ({ from, to, count }));
}
