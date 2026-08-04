/**
 * Projects service — CRUD + role assignments + status transitions +
 * live commission preview.
 *
 * Conventions:
 *   - Every read goes through buildProjectScopeWhere() or
 *     assertProjectReadable() so list and single-record paths share
 *     the same gate.
 *   - Every write that touches commission contracts (create, override,
 *     assign-role, change-status, soft-delete) emits a domain event
 *     so subscribers can land timeline rows / dashboard invalidations.
 *   - Rule resolution at create time tries (project.department,
 *     categoryId) first, then ('*', categoryId). 404 with a helpful
 *     message if neither has a published rule.
 */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { Prisma } from '@prisma/client';
import {
  PROJECT_STATUS_TRANSITIONS,
  type ProjectAssignmentInput,
  type ProjectCategoryCreateInput,
  type ProjectCategoryPublic,
  type ProjectCategoryTreeNode,
  type ProjectCategoryUpdateInput,
  type ProjectChangeStatusInput,
  type ProjectCommissionPreview,
  type ProjectCreateInput,
  type ProjectFilterCountsQuery,
  type ProjectFilterCountsResponse,
  type ProjectListQuery,
  type ProjectListResponse,
  type ProjectPublic,
  type ProjectStatus,
  type ProjectUpdateInput,
  type RolePercentages,
} from '@futurenostics/types';
import type { AuthenticatedUser } from '../../core/auth/types';
import { EventBusService } from '../../core/events/event-bus.service';
import {
  coerceRevenueBrackets,
  computeTotalPool,
  resolveTieredPoolPct,
} from '../commissions/commission-calc';
import {
  assertProjectReadable,
  buildProjectScopeWhere,
  computeProjectReadScope,
} from './projects.scope';
import {
  PROJECT_CATEGORY_INCLUDE,
  PROJECT_PUBLIC_INCLUDE,
  toCategoryTree,
  toProjectCategoryPublic,
  toProjectPublic,
} from './projects.mapper';

const PERCENTAGE_TOLERANCE = 0.01;

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(private readonly events: EventBusService) {}

  /* ---------- Rule resolution ---------- */

  /**
   * Resolve the active CommissionRule for a (department, categoryId)
   * pair. Tries the exact match first, then falls back to the org-wide
   * '*' department. Returns the rule row or throws BadRequest if none.
   */
  private async resolveActiveRule(
    departmentSlug: string,
    categoryId: string,
  ): Promise<{
    id: string;
    department: string;
    categoryId: string;
    version: string;
    poolMode: string;
    poolValue: Prisma.Decimal;
    rolePercentages: Prisma.JsonValue;
    disbursementSchedule: Prisma.JsonValue | null;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    status: string;
    pendingReason: string | null;
    createdAt: Date;
    createdById: string;
    publishedAt: Date | null;
    publishedById: string | null;
  }> {
    const now = new Date();
    const baseWhere: Prisma.CommissionRuleWhereInput = {
      status: 'active',
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
    };

    // Try (dept, category)
    let rule = await prisma.commissionRule.findFirst({
      where: { ...baseWhere, department: departmentSlug, categoryId },
      orderBy: { effectiveFrom: 'desc' },
    });

    // Fall back to ('*', category)
    if (!rule) {
      rule = await prisma.commissionRule.findFirst({
        where: { ...baseWhere, department: '*', categoryId },
        orderBy: { effectiveFrom: 'desc' },
      });
    }

    if (!rule) {
      throw new BadRequestException(
        `No active commission rule for department='${departmentSlug}' and category='${categoryId}'. ` +
          `Publish a rule (for this department or the org-wide '*' fallback) before creating projects in this category.`,
      );
    }
    return rule;
  }

  /* ---------- Assignment validation ---------- */

  /**
   * Validate role-percentage assignments against the rule's role set.
   * Caller must provide the rule's `rolePercentages` so we can compare.
   */
  private validateAssignments(
    assignments: ProjectAssignmentInput[],
    rolePercentages: RolePercentages,
    hasOverride: boolean,
  ): void {
    if (assignments.length === 0) {
      throw new BadRequestException('At least one role assignment is required');
    }

    // Every roleName must exist in the rule's role map.
    const ruleRoles = new Set(Object.keys(rolePercentages));
    for (const a of assignments) {
      if (!ruleRoles.has(a.roleName)) {
        throw new BadRequestException(
          `Role '${a.roleName}' is not defined in the rule. Known roles: ${[...ruleRoles].join(', ')}`,
        );
      }
    }

    // Percentages sum to 100 with a small floating tolerance.
    const sum = assignments.reduce((acc, a) => acc + a.percentage, 0);
    if (Math.abs(sum - 100) > PERCENTAGE_TOLERANCE) {
      throw new BadRequestException(
        `Assignment percentages must sum to 100 — got ${sum.toFixed(2)}`,
      );
    }

    // If !hasOverride, the per-role totals must match the rule defaults.
    // For Eligible team where multiple employees share one role pool,
    // we sum the assignment rows by roleName.
    if (!hasOverride) {
      const byRole = new Map<string, number>();
      for (const a of assignments) {
        byRole.set(a.roleName, (byRole.get(a.roleName) ?? 0) + a.percentage);
      }
      for (const [role, ruleShare] of Object.entries(rolePercentages)) {
        const provided = byRole.get(role) ?? 0;
        if (Math.abs(provided - ruleShare) > PERCENTAGE_TOLERANCE) {
          throw new BadRequestException(
            `Role '${role}' share is ${provided}% but the rule says ${ruleShare}%. ` +
              `Set hasOverride=true with an overrideReason to diverge from rule defaults.`,
          );
        }
      }
    }
  }

  /* ---------- Reads ---------- */

  async list(viewer: AuthenticatedUser, query: ProjectListQuery): Promise<ProjectListResponse> {
    const scope = computeProjectReadScope(viewer);
    if (!scope.canRead) {
      return { items: [], total: 0, hasMore: false };
    }

    const where = buildProjectFilterWhere(viewer, query);
    const orderBy: Prisma.ProjectOrderByWithRelationInput = {
      [query.sortBy]: query.sortDir,
    };

    const [rows, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy,
        skip: query.offset,
        take: query.limit,
        include: PROJECT_PUBLIC_INCLUDE,
      }),
      prisma.project.count({ where }),
    ]);

    return {
      items: rows.map(toProjectPublic),
      total,
      hasMore: query.offset + rows.length < total,
    };
  }

  /**
   * Powers the Advanced Filters drawer (`GET /projects/filter-counts`).
   *
   * Returns the matched total under the current filter state plus
   * per-option counts for each filter group, a revenue histogram, and
   * start-date month buckets. Mirrors the Employees endpoint so the
   * AdvancedFilters primitive can drive both surfaces with the same
   * `onCountsRequest` shape.
   */
  async getFilterCounts(
    viewer: AuthenticatedUser,
    query: ProjectFilterCountsQuery,
  ): Promise<ProjectFilterCountsResponse> {
    const scope = computeProjectReadScope(viewer);
    if (!scope.canRead) {
      return emptyProjectFilterCountsResponse();
    }

    const where = buildProjectFilterWhere(viewer, query);

    const [
      total,
      byCategoryRows,
      byDepartmentRows,
      byStatusRows,
      revenueAgg,
      revenueRows,
      startAgg,
      startRows,
      hasOverrideCount,
      lockedCount,
      hasNotesCount,
    ] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.groupBy({ by: ['categoryId'], where, _count: { _all: true } }),
      prisma.project.groupBy({ by: ['departmentId'], where, _count: { _all: true } }),
      prisma.project.groupBy({ by: ['status'], where, _count: { _all: true } }),
      prisma.project.aggregate({
        where,
        _min: { revenueUsd: true },
        _max: { revenueUsd: true },
      }),
      prisma.project.findMany({ where, select: { revenueUsd: true }, take: 10_000 }),
      prisma.project.aggregate({
        where,
        _min: { startDate: true },
        _max: { startDate: true },
      }),
      prisma.project.findMany({ where, select: { startDate: true }, take: 10_000 }),
      prisma.project.count({ where: { ...where, hasOverride: true } }),
      prisma.project.count({
        where: { ...where, status: { in: ['cancelled', 'refunded'] } },
      }),
      prisma.project.count({ where: { ...where, NOT: { notes: null } } }),
    ]);

    const byCategory = aggToCountRecord(byCategoryRows, 'categoryId');
    const byDepartment = aggToCountRecord(byDepartmentRows, 'departmentId');
    const byStatus = aggToCountRecord(byStatusRows, 'status');

    /* Revenue histogram — 20 buckets across the visible range. */
    let revenue: ProjectFilterCountsResponse['revenue'];
    if (revenueRows.length > 0) {
      const min = revenueAgg._min.revenueUsd ? Number(revenueAgg._min.revenueUsd.toString()) : 0;
      const max = revenueAgg._max.revenueUsd ? Number(revenueAgg._max.revenueUsd.toString()) : 0;
      revenue = {
        min,
        max,
        buckets: bucketizeNumbers(
          revenueRows.map((r) => Number(r.revenueUsd.toString())),
          min,
          max,
          20,
        ),
      };
    } else {
      revenue = { min: 0, max: 0, buckets: [] };
    }

    /* Start-date histogram — one bucket per month. */
    const earliest = startAgg._min.startDate ?? null;
    const latest = startAgg._max.startDate ?? null;
    const startDate = {
      earliest: earliest ? earliest.toISOString() : null,
      latest: latest ? latest.toISOString() : null,
      buckets:
        earliest && latest
          ? monthBucketsForDates(
              startRows.map((r) => r.startDate),
              earliest,
              latest,
            )
          : [],
    };

    return {
      total,
      byCategory,
      byDepartment,
      byStatus,
      revenue,
      startDate,
      flags: {
        hasOverride: hasOverrideCount,
        lockedFromCommissions: lockedCount,
        hasNotes: hasNotesCount,
      },
    };
  }

  async findOne(viewer: AuthenticatedUser, id: string): Promise<ProjectPublic> {
    const project = await prisma.project.findUnique({
      where: { id },
      include: PROJECT_PUBLIC_INCLUDE,
    });
    if (!project || project.deletedAt) {
      throw new NotFoundException('Project not found');
    }
    assertProjectReadable(viewer, project);
    return toProjectPublic(project);
  }

  /* ---------- Writes ---------- */

  async create(viewer: AuthenticatedUser, input: ProjectCreateInput): Promise<ProjectPublic> {
    if (input.hasOverride && !input.overrideReason) {
      throw new BadRequestException('overrideReason is required when hasOverride=true');
    }

    // Look up the department (need its slug for rule resolution) and category.
    const [department, category] = await Promise.all([
      prisma.department.findUnique({ where: { id: input.departmentId } }),
      prisma.projectCategory.findUnique({ where: { id: input.categoryId } }),
    ]);
    if (!department) throw new BadRequestException('Unknown department');
    if (!category) throw new BadRequestException('Unknown category');
    if (category.archived) {
      throw new BadRequestException('Cannot create projects in an archived category');
    }

    const rule = await this.resolveActiveRule(department.slug, category.id);
    const rolePercentages = rule.rolePercentages as RolePercentages;
    this.validateAssignments(input.assignments, rolePercentages, input.hasOverride);

    // Look up every employee in one shot so we can fail fast on bad ids.
    const employeeIds = input.assignments.map((a) => a.employeeId);
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds }, deletedAt: null },
      select: { id: true },
    });
    if (employees.length !== new Set(employeeIds).size) {
      throw new BadRequestException('One or more assigned employees does not exist');
    }

    const created = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: input.name,
          clientName: input.clientName,
          categoryId: input.categoryId,
          departmentId: input.departmentId,
          commissionRuleId: rule.id,
          hasOverride: input.hasOverride,
          overrideReason: input.overrideReason ?? null,
          revenueUsd: new Prisma.Decimal(input.revenueUsd),
          developerSalaryPkr:
            input.developerSalaryPkr != null ? new Prisma.Decimal(input.developerSalaryPkr) : null,
          status: input.status,
          startDate: new Date(input.startDate),
          expectedCompletionDate: input.expectedCompletionDate
            ? new Date(input.expectedCompletionDate)
            : null,
          notes: input.notes ?? null,
          createdById: viewer.id,
        },
      });

      for (const a of input.assignments) {
        await tx.projectAssignment.create({
          data: {
            projectId: project.id,
            employeeId: a.employeeId,
            roleName: a.roleName,
            percentage: new Prisma.Decimal(a.percentage),
            assignedById: viewer.id,
          },
        });
      }
      return project.id;
    });

    const fresh = await prisma.project.findUniqueOrThrow({
      where: { id: created },
      include: PROJECT_PUBLIC_INCLUDE,
    });

    this.events.emit(
      'project.created',
      {
        projectId: fresh.id,
        name: fresh.name,
        categoryId: fresh.categoryId,
        departmentId: fresh.departmentId,
        commissionRuleId: fresh.commissionRuleId,
        ruleVersion: fresh.commissionRule.version,
        hasOverride: fresh.hasOverride,
        revenueUsd: Number(fresh.revenueUsd),
        status: fresh.status,
        assignments: fresh.assignments.map((a) => ({
          employeeId: a.employeeId,
          roleName: a.roleName,
          percentage: Number(a.percentage),
        })),
      },
      { actorId: viewer.id },
    );

    return toProjectPublic(fresh);
  }

  async update(
    viewer: AuthenticatedUser,
    id: string,
    input: ProjectUpdateInput,
  ): Promise<ProjectPublic> {
    const existing = await prisma.project.findUnique({
      where: { id },
      include: PROJECT_PUBLIC_INCLUDE,
    });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Project not found');
    }
    assertProjectReadable(viewer, existing);

    if (existing.status === 'cancelled' || existing.status === 'refunded') {
      throw new BadRequestException('Cannot edit a cancelled or refunded project');
    }

    // `status` is changed via /change-status, not /update — silently
    // drop it here so a frontend bug can't bypass transition validation.
    const { status: _ignoredStatus, ...rest } = input;
    void _ignoredStatus;

    // Disallow changing categoryId or departmentId via update — those
    // would invalidate the commissionRuleId snapshot. To re-categorize,
    // archive this project and create a new one.
    if (rest.categoryId && rest.categoryId !== existing.categoryId) {
      throw new BadRequestException(
        'Cannot change a project’s category — archive and re-create instead',
      );
    }
    if (rest.departmentId && rest.departmentId !== existing.departmentId) {
      throw new BadRequestException(
        'Cannot change a project’s department — archive and re-create instead',
      );
    }

    const data: Prisma.ProjectUpdateInput = {};
    if (rest.name !== undefined) data.name = rest.name;
    if (rest.clientName !== undefined) data.clientName = rest.clientName;
    if (rest.revenueUsd !== undefined) data.revenueUsd = new Prisma.Decimal(rest.revenueUsd);
    if (rest.developerSalaryPkr !== undefined) {
      data.developerSalaryPkr =
        rest.developerSalaryPkr != null ? new Prisma.Decimal(rest.developerSalaryPkr) : null;
    }
    if (rest.startDate !== undefined) data.startDate = new Date(rest.startDate);
    if (rest.expectedCompletionDate !== undefined) {
      data.expectedCompletionDate = rest.expectedCompletionDate
        ? new Date(rest.expectedCompletionDate)
        : null;
    }
    if (rest.notes !== undefined) data.notes = rest.notes;

    const changedFields = Object.keys(data);
    if (changedFields.length === 0) return toProjectPublic(existing);

    await prisma.project.update({ where: { id }, data });
    const fresh = await prisma.project.findUniqueOrThrow({
      where: { id },
      include: PROJECT_PUBLIC_INCLUDE,
    });

    this.events.emit('project.updated', { projectId: id, changedFields }, { actorId: viewer.id });

    return toProjectPublic(fresh);
  }

  async softDelete(viewer: AuthenticatedUser, id: string): Promise<void> {
    const existing = await prisma.project.findUnique({
      where: { id },
      include: PROJECT_PUBLIC_INCLUDE,
    });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Project not found');
    }
    assertProjectReadable(viewer, existing);

    await prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
    this.events.emit('project.deleted', { projectId: id }, { actorId: viewer.id });
  }

  async changeStatus(
    viewer: AuthenticatedUser,
    id: string,
    input: ProjectChangeStatusInput,
  ): Promise<ProjectPublic> {
    const existing = await prisma.project.findUnique({
      where: { id },
      include: PROJECT_PUBLIC_INCLUDE,
    });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Project not found');
    }
    assertProjectReadable(viewer, existing);

    const allowed = PROJECT_STATUS_TRANSITIONS[existing.status as ProjectStatus] ?? [];
    if (!allowed.includes(input.toStatus)) {
      throw new BadRequestException(
        `Cannot transition project from '${existing.status}' to '${input.toStatus}'. ` +
          `Allowed: ${allowed.join(', ') || '<terminal>'}`,
      );
    }

    await prisma.project.update({ where: { id }, data: { status: input.toStatus } });
    const fresh = await prisma.project.findUniqueOrThrow({
      where: { id },
      include: PROJECT_PUBLIC_INCLUDE,
    });

    this.events.emit(
      'project.status.changed',
      {
        projectId: id,
        fromStatus: existing.status,
        toStatus: input.toStatus,
        reason: input.reason ?? null,
      },
      { actorId: viewer.id },
    );

    return toProjectPublic(fresh);
  }

  /* ---------- Role assignments ---------- */

  async assignRole(
    viewer: AuthenticatedUser,
    projectId: string,
    input: ProjectAssignmentInput,
  ): Promise<ProjectPublic> {
    const existing = await prisma.project.findUnique({
      where: { id: projectId },
      include: PROJECT_PUBLIC_INCLUDE,
    });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Project not found');
    }
    assertProjectReadable(viewer, existing);
    if (existing.status === 'cancelled' || existing.status === 'refunded') {
      throw new BadRequestException('Cannot change assignments on a cancelled or refunded project');
    }

    const rule = existing.commissionRule;
    const rolePercentages = rule.rolePercentages as RolePercentages;
    if (!Object.keys(rolePercentages).includes(input.roleName)) {
      throw new BadRequestException(
        `Role '${input.roleName}' is not defined in the project’s commission rule`,
      );
    }

    await prisma.projectAssignment.upsert({
      where: {
        projectId_employeeId_roleName: {
          projectId,
          employeeId: input.employeeId,
          roleName: input.roleName,
        },
      },
      create: {
        projectId,
        employeeId: input.employeeId,
        roleName: input.roleName,
        percentage: new Prisma.Decimal(input.percentage),
        assignedById: viewer.id,
      },
      update: {
        percentage: new Prisma.Decimal(input.percentage),
        removedAt: null,
        removedById: null,
        assignedById: viewer.id,
        assignedAt: new Date(),
      },
    });

    this.events.emit(
      'project.role.assigned',
      {
        projectId,
        employeeId: input.employeeId,
        roleName: input.roleName,
        percentage: input.percentage,
      },
      { actorId: viewer.id },
    );

    const fresh = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      include: PROJECT_PUBLIC_INCLUDE,
    });
    return toProjectPublic(fresh);
  }

  async removeAssignment(
    viewer: AuthenticatedUser,
    projectId: string,
    assignmentId: string,
  ): Promise<void> {
    const existing = await prisma.project.findUnique({
      where: { id: projectId },
      include: PROJECT_PUBLIC_INCLUDE,
    });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Project not found');
    }
    assertProjectReadable(viewer, existing);

    const assignment = await prisma.projectAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.projectId !== projectId) {
      throw new NotFoundException('Assignment not found on this project');
    }
    if (assignment.removedAt) {
      // Idempotent — already removed.
      return;
    }

    await prisma.projectAssignment.update({
      where: { id: assignmentId },
      data: { removedAt: new Date(), removedById: viewer.id },
    });

    this.events.emit(
      'project.role.removed',
      {
        projectId,
        employeeId: assignment.employeeId,
        roleName: assignment.roleName,
      },
      { actorId: viewer.id },
    );
  }

  /* ---------- Commission preview ---------- */

  async commissionPreview(
    viewer: AuthenticatedUser,
    projectId: string,
  ): Promise<ProjectCommissionPreview> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        ...PROJECT_PUBLIC_INCLUDE,
        commissionRule: true,
      },
    });
    if (!project || project.deletedAt) throw new NotFoundException('Project not found');
    assertProjectReadable(viewer, project);

    const rule = project.commissionRule;
    const revenue = Number(project.revenueUsd);
    const poolMode = rule.poolMode as 'percentage' | 'fixed' | 'tiered';
    const poolValue = Number(rule.poolValue);
    const brackets = coerceRevenueBrackets(rule.revenueBrackets);
    const commissionPoolUsd = computeTotalPool(
      { poolMode, poolValue, minProjectRevenueUsd: 0, revenueBrackets: brackets },
      revenue,
    );
    let poolValueDisplay: string;
    if (poolMode === 'percentage') {
      poolValueDisplay = `${poolValue}%`;
    } else if (poolMode === 'tiered') {
      const pct = resolveTieredPoolPct(brackets, revenue);
      poolValueDisplay = pct === null ? 'Tiered (no bracket)' : `${pct}% (tier)`;
    } else {
      poolValueDisplay = `$${poolValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    }

    const splits = project.assignments
      .filter((a) => a.removedAt === null)
      .map((a) => {
        const pct = Number(a.percentage);
        return {
          employeeId: a.employeeId,
          employeeName: a.employee.fullName,
          roleName: a.roleName,
          percentage: pct,
          shareUsd: (commissionPoolUsd * pct) / 100,
        };
      });

    const sumPct = splits.reduce((acc, s) => acc + s.percentage, 0);
    return {
      commissionPoolUsd,
      poolMode,
      poolValueDisplay,
      ruleVersion: rule.version,
      ruleStatus: rule.status,
      splits,
      splitsSumToHundred: Math.abs(sumPct - 100) <= PERCENTAGE_TOLERANCE,
    };
  }

  /* ---------- Categories ---------- */

  async listCategories(): Promise<ProjectCategoryPublic[]> {
    const rows = await prisma.projectCategory.findMany({
      where: { deletedAt: null },
      orderBy: [{ archived: 'asc' }, { name: 'asc' }],
      include: PROJECT_CATEGORY_INCLUDE,
    });
    return rows.map(toProjectCategoryPublic);
  }

  async categoryTree(): Promise<ProjectCategoryTreeNode[]> {
    const rows = await prisma.projectCategory.findMany({
      where: { deletedAt: null },
      orderBy: [{ archived: 'asc' }, { name: 'asc' }],
      include: PROJECT_CATEGORY_INCLUDE,
    });
    return toCategoryTree(rows);
  }

  async createCategory(
    viewer: AuthenticatedUser,
    input: ProjectCategoryCreateInput,
  ): Promise<ProjectCategoryPublic> {
    if (!viewer.permissions.includes('projects:manage_categories')) {
      throw new ForbiddenException('projects:manage_categories required');
    }

    const created = await prisma.projectCategory.create({
      data: {
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        color: input.color,
        parentId: input.parentId ?? null,
        defaultRuleId: input.defaultRuleId ?? null,
      },
      include: PROJECT_CATEGORY_INCLUDE,
    });
    return toProjectCategoryPublic(created);
  }

  async updateCategory(
    viewer: AuthenticatedUser,
    id: string,
    input: ProjectCategoryUpdateInput,
  ): Promise<ProjectCategoryPublic> {
    if (!viewer.permissions.includes('projects:manage_categories')) {
      throw new ForbiddenException('projects:manage_categories required');
    }
    const existing = await prisma.projectCategory.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Category not found');

    const data: Prisma.ProjectCategoryUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.slug !== undefined) data.slug = input.slug;
    if (input.description !== undefined) data.description = input.description;
    if (input.color !== undefined) data.color = input.color;
    if (input.archived !== undefined) data.archived = input.archived;
    if (input.parentId !== undefined) {
      data.parent = input.parentId ? { connect: { id: input.parentId } } : { disconnect: true };
    }
    if (input.defaultRuleId !== undefined) {
      data.defaultRule = input.defaultRuleId
        ? { connect: { id: input.defaultRuleId } }
        : { disconnect: true };
    }

    const updated = await prisma.projectCategory.update({
      where: { id },
      data,
      include: PROJECT_CATEGORY_INCLUDE,
    });
    return toProjectCategoryPublic(updated);
  }
}

/* ---------- Filter-counts helpers (shared with service.list) ---------- */

/**
 * Builds the canonical `Prisma.ProjectWhereInput` for the projects
 * list + filter-counts endpoints. Both query shapes share the same
 * filter fields; the list query just adds offset/limit/sortBy.
 *
 * Single source of truth for "what filters mean" so the count footer,
 * the per-option counts, and the list table always agree.
 */
type ProjectFilterableQuery = Pick<
  ProjectFilterCountsQuery,
  | 'categoryIds'
  | 'departmentIds'
  | 'statuses'
  | 'assignedEmployeeIds'
  | 'projectFlags'
  | 'revenueMin'
  | 'revenueMax'
  | 'startDateFrom'
  | 'startDateTo'
  | 'search'
  | 'includeArchived'
>;

function buildProjectFilterWhere(
  viewer: AuthenticatedUser,
  query: ProjectFilterableQuery,
): Prisma.ProjectWhereInput {
  const filters: Prisma.ProjectWhereInput[] = [];
  if (!query.includeArchived) filters.push({ deletedAt: null });
  if (query.categoryIds.length > 0) filters.push({ categoryId: { in: query.categoryIds } });
  if (query.departmentIds.length > 0) filters.push({ departmentId: { in: query.departmentIds } });
  if (query.statuses.length > 0) {
    filters.push({ status: { in: query.statuses as ProjectStatus[] } });
  }
  if (query.assignedEmployeeIds.length > 0) {
    filters.push({
      assignments: {
        some: { employeeId: { in: query.assignedEmployeeIds }, removedAt: null },
      },
    });
  }
  if (query.revenueMin !== undefined) filters.push({ revenueUsd: { gte: query.revenueMin } });
  if (query.revenueMax !== undefined) filters.push({ revenueUsd: { lte: query.revenueMax } });
  if (query.startDateFrom) {
    filters.push({ startDate: { gte: new Date(query.startDateFrom) } });
  }
  if (query.startDateTo) {
    filters.push({ startDate: { lte: new Date(query.startDateTo) } });
  }

  if (query.projectFlags.length > 0) {
    for (const flag of query.projectFlags) {
      switch (flag) {
        case 'hasOverride':
          filters.push({ hasOverride: true });
          break;
        case 'lockedFromCommissions':
          filters.push({ status: { in: ['cancelled', 'refunded'] } });
          break;
        case 'hasNotes':
          filters.push({ NOT: { notes: null } });
          break;
      }
    }
  }

  if (query.search) {
    filters.push({
      OR: [
        { name: { contains: query.search, mode: 'insensitive' } },
        { clientName: { contains: query.search, mode: 'insensitive' } },
      ],
    });
  }

  const baseWhere = filters.length > 0 ? { AND: filters } : {};
  return buildProjectScopeWhere(viewer, baseWhere);
}

function emptyProjectFilterCountsResponse(): ProjectFilterCountsResponse {
  return {
    total: 0,
    byCategory: {},
    byDepartment: {},
    byStatus: {},
    revenue: { min: 0, max: 0, buckets: [] },
    startDate: { earliest: null, latest: null, buckets: [] },
    flags: { hasOverride: 0, lockedFromCommissions: 0, hasNotes: 0 },
  };
}

function aggToCountRecord<K extends string>(
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

function bucketizeNumbers(
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

function monthBucketsForDates(
  dates: Date[],
  earliest: Date,
  latest: Date,
): Array<{ from: string; to: string; count: number }> {
  if (dates.length === 0) return [];
  const start = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
  const end = new Date(latest.getFullYear(), latest.getMonth() + 1, 1);
  const buckets: Array<{ from: string; to: string; count: number; fromMs: number; toMs: number }> =
    [];
  for (let d = new Date(start); d < end; d.setMonth(d.getMonth() + 1)) {
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    buckets.push({
      from: d.toISOString(),
      to: next.toISOString(),
      count: 0,
      fromMs: d.getTime(),
      toMs: next.getTime(),
    });
  }
  for (const dt of dates) {
    const t = dt.getTime();
    const idx = buckets.findIndex((b) => t >= b.fromMs && t < b.toMs);
    if (idx >= 0) buckets[idx]!.count++;
  }
  return buckets.map(({ from, to, count }) => ({ from, to, count }));
}
