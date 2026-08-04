/**
 * Commission rules — list, create (draft), publish (supersede the
 * active rule for the same dept × category).
 *
 * Versioning policy: every rule row is immutable once published. Edits
 * happen by creating a new draft → publishing → which archives the
 * previous active row by stamping `effectiveTo = now`. New row gets
 * `effectiveFrom = now` (or a future date passed by the caller),
 * `status = 'active'`, and a bumped version number (semver minor).
 *
 * `'*'` is accepted as the `department` value to mean "org-wide
 * fallback" — see docs/DECISIONS.md § Phase 2 — Business rules.
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
import type {
  CommissionRuleAffectedProjects,
  CommissionRuleCreateInput,
  CommissionRuleFilterCountsQuery,
  CommissionRuleFilterCountsResponse,
  CommissionRuleListQuery,
  CommissionRuleListResponse,
  CommissionRulePublic,
  CommissionRulePublishInput,
  CommissionRuleStatus,
  CommissionRuleUpdateInput,
  PoolMode,
  RolePercentages,
} from '@futurenostics/types';
import type { AuthenticatedUser } from '../../core/auth/types';
import { EventBusService } from '../../core/events/event-bus.service';
import { COMMISSION_RULE_INCLUDE, toCommissionRulePublic } from './commission-rules.mapper';

const PERCENTAGE_TOLERANCE = 0.01;

@Injectable()
export class CommissionRulesService {
  private readonly logger = new Logger(CommissionRulesService.name);

  constructor(private readonly events: EventBusService) {}

  /* ---------- Validation ---------- */

  private validateRolePercentages(
    rolePercentages: RolePercentages,
    status: string,
    poolMode?: string,
  ): void {
    if (status === 'pending') return; // pending rows are explicitly TBD
    const sum = Object.values(rolePercentages).reduce((a, b) => a + b, 0);
    // Upwork net-share pays only the assigned winner's %; the remainder
    // is the company's and isn't paid out, so splits need only NOT
    // exceed 100 (a positive winner share).
    if (poolMode === 'net_revenue_share') {
      if (sum <= 0 || sum - 100 > PERCENTAGE_TOLERANCE) {
        throw new BadRequestException(
          `Role percentages must be > 0 and ≤ 100 for net-share rules — got ${sum.toFixed(2)}`,
        );
      }
      return;
    }
    if (Math.abs(sum - 100) > PERCENTAGE_TOLERANCE) {
      throw new BadRequestException(`Role percentages must sum to 100 — got ${sum.toFixed(2)}`);
    }
  }

  private requireManage(viewer: AuthenticatedUser): void {
    if (!viewer.permissions.includes('commissions:manage_rules')) {
      throw new ForbiddenException('commissions:manage_rules required');
    }
  }

  /**
   * Bump a semver-ish version: '3.2' → '3.3'. If no previous version,
   * start at '1.0'. Major is bumped manually by the user via the input.
   */
  private bumpVersion(previous?: string | null): string {
    if (!previous) return '1.0';
    const parts = previous.split('.').map((p) => Number.parseInt(p, 10));
    if (parts.length !== 2 || parts.some(Number.isNaN)) return '1.0';
    return `${parts[0]}.${parts[1] + 1}`;
  }

  /* ---------- Reads ---------- */

  async list(query: CommissionRuleListQuery): Promise<CommissionRuleListResponse> {
    const where = buildCommissionRuleFilterWhere(query);

    const [rows, total] = await Promise.all([
      prisma.commissionRule.findMany({
        where,
        orderBy: [{ department: 'asc' }, { categoryId: 'asc' }, { effectiveFrom: 'desc' }],
        skip: query.offset,
        take: query.limit,
        include: COMMISSION_RULE_INCLUDE,
      }),
      prisma.commissionRule.count({ where }),
    ]);

    return {
      items: rows.map(toCommissionRulePublic),
      total,
      hasMore: query.offset + rows.length < total,
    };
  }

  /**
   * Powers the Advanced Filters drawer (`GET /commission-rules/filter-counts`).
   *
   * Mirrors employees + projects: returns matched total + per-option
   * counts under the current filter state, plus a pool-value histogram
   * and effective-from month buckets so the drawer's range/date
   * sections can render their backdrops without a second round-trip.
   */
  async getFilterCounts(
    query: CommissionRuleFilterCountsQuery,
  ): Promise<CommissionRuleFilterCountsResponse> {
    const where = buildCommissionRuleFilterWhere(query);

    const [
      total,
      byDepartmentRows,
      byCategoryRows,
      byStatusRows,
      byPoolModeRows,
      poolAgg,
      poolRows,
      effFromAgg,
      effFromRows,
    ] = await Promise.all([
      prisma.commissionRule.count({ where }),
      prisma.commissionRule.groupBy({ by: ['department'], where, _count: { _all: true } }),
      prisma.commissionRule.groupBy({ by: ['categoryId'], where, _count: { _all: true } }),
      prisma.commissionRule.groupBy({ by: ['status'], where, _count: { _all: true } }),
      prisma.commissionRule.groupBy({ by: ['poolMode'], where, _count: { _all: true } }),
      prisma.commissionRule.aggregate({
        where,
        _min: { poolValue: true },
        _max: { poolValue: true },
      }),
      prisma.commissionRule.findMany({ where, select: { poolValue: true }, take: 10_000 }),
      prisma.commissionRule.aggregate({
        where,
        _min: { effectiveFrom: true },
        _max: { effectiveFrom: true },
      }),
      prisma.commissionRule.findMany({ where, select: { effectiveFrom: true }, take: 10_000 }),
    ]);

    const byDepartment = aggToCountRecord(byDepartmentRows, 'department');
    const byCategory = aggToCountRecord(byCategoryRows, 'categoryId');
    const byStatus = aggToCountRecord(byStatusRows, 'status');
    const byPoolMode = aggToCountRecord(byPoolModeRows, 'poolMode');

    /* Pool-value histogram — 20 buckets. */
    let poolValue: CommissionRuleFilterCountsResponse['poolValue'];
    if (poolRows.length > 0) {
      const min = poolAgg._min.poolValue ? Number(poolAgg._min.poolValue.toString()) : 0;
      const max = poolAgg._max.poolValue ? Number(poolAgg._max.poolValue.toString()) : 0;
      poolValue = {
        min,
        max,
        buckets: bucketizeNumbers(
          poolRows.map((r) => Number(r.poolValue.toString())),
          min,
          max,
          20,
        ),
      };
    } else {
      poolValue = { min: 0, max: 0, buckets: [] };
    }

    /* Effective-from histogram — month buckets. */
    const earliest = effFromAgg._min.effectiveFrom ?? null;
    const latest = effFromAgg._max.effectiveFrom ?? null;
    const effectiveFrom = {
      earliest: earliest ? earliest.toISOString() : null,
      latest: latest ? latest.toISOString() : null,
      buckets:
        earliest && latest
          ? monthBucketsForDates(
              effFromRows.map((r) => r.effectiveFrom),
              earliest,
              latest,
            )
          : [],
    };

    return {
      total,
      byDepartment,
      byCategory,
      byStatus,
      byPoolMode,
      poolValue,
      effectiveFrom,
    };
  }

  async findOne(id: string): Promise<CommissionRulePublic> {
    const row = await prisma.commissionRule.findUnique({
      where: { id },
      include: COMMISSION_RULE_INCLUDE,
    });
    if (!row) throw new NotFoundException('Rule not found');
    return toCommissionRulePublic(row);
  }

  /* ---------- Writes ---------- */

  async create(
    viewer: AuthenticatedUser,
    input: CommissionRuleCreateInput,
  ): Promise<CommissionRulePublic> {
    this.requireManage(viewer);

    const category = await prisma.projectCategory.findUnique({
      where: { id: input.categoryId },
    });
    if (!category) throw new BadRequestException('Unknown category');

    this.validateRolePercentages(input.rolePercentages, input.status, input.poolMode);

    if (input.status === 'pending' && !input.pendingReason) {
      throw new BadRequestException('pendingReason is required for pending rules');
    }

    // Determine the next version for this (dept, category) slot.
    const previous = await prisma.commissionRule.findFirst({
      where: { department: input.department, categoryId: input.categoryId },
      orderBy: { effectiveFrom: 'desc' },
    });
    const version = this.bumpVersion(previous?.version);

    const created = await prisma.commissionRule.create({
      data: {
        department: input.department,
        categoryId: input.categoryId,
        version,
        poolMode: input.poolMode,
        poolValue: new Prisma.Decimal(input.poolValue),
        minProjectRevenueUsd: new Prisma.Decimal(input.minProjectRevenueUsd ?? 0),
        perPersonFloorUsd:
          input.perPersonFloorUsd != null ? new Prisma.Decimal(input.perPersonFloorUsd) : null,
        perPersonCapUsd:
          input.perPersonCapUsd != null ? new Prisma.Decimal(input.perPersonCapUsd) : null,
        revenueBrackets:
          input.poolMode === 'tiered' && input.revenueBrackets
            ? (input.revenueBrackets as unknown as Prisma.InputJsonValue)
            : Prisma.DbNull,
        designationAmounts:
          input.poolMode === 'designation_fixed' && input.designationAmounts
            ? (input.designationAmounts as unknown as Prisma.InputJsonValue)
            : Prisma.DbNull,
        roleAmounts:
          input.poolMode === 'role_fixed' && input.roleAmounts
            ? (input.roleAmounts as unknown as Prisma.InputJsonValue)
            : Prisma.DbNull,
        rolePercentages: input.rolePercentages as unknown as Prisma.InputJsonValue,
        disbursementSchedule:
          (input.disbursementSchedule as Prisma.InputJsonValue | undefined) ?? Prisma.DbNull,
        effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : new Date(),
        status: input.status,
        pendingReason: input.pendingReason ?? null,
        createdById: viewer.id,
      },
      include: COMMISSION_RULE_INCLUDE,
    });

    return toCommissionRulePublic(created);
  }

  /**
   * Update fields on a *draft* rule. Once published, rules are
   * immutable — to change a published rule, draft a new version and
   * publish that.
   */
  async update(
    viewer: AuthenticatedUser,
    id: string,
    input: CommissionRuleUpdateInput,
  ): Promise<CommissionRulePublic> {
    this.requireManage(viewer);
    const existing = await prisma.commissionRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Rule not found');
    if (existing.status !== 'draft') {
      throw new BadRequestException(
        'Only draft rules can be edited. Draft a new version to change a published rule.',
      );
    }

    const data: Prisma.CommissionRuleUpdateInput = {};
    if (input.poolMode !== undefined) data.poolMode = input.poolMode;
    if (input.poolValue !== undefined) data.poolValue = new Prisma.Decimal(input.poolValue);
    if (input.minProjectRevenueUsd !== undefined) {
      data.minProjectRevenueUsd = new Prisma.Decimal(input.minProjectRevenueUsd);
    }
    if (input.perPersonFloorUsd !== undefined) {
      data.perPersonFloorUsd =
        input.perPersonFloorUsd != null ? new Prisma.Decimal(input.perPersonFloorUsd) : null;
    }
    if (input.perPersonCapUsd !== undefined) {
      data.perPersonCapUsd =
        input.perPersonCapUsd != null ? new Prisma.Decimal(input.perPersonCapUsd) : null;
    }
    if (input.revenueBrackets !== undefined) {
      data.revenueBrackets = input.revenueBrackets
        ? (input.revenueBrackets as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull;
    } else if (input.poolMode !== undefined && input.poolMode !== 'tiered') {
      // Switching away from tiered clears any stale bracket ladder.
      data.revenueBrackets = Prisma.DbNull;
    }
    if (input.designationAmounts !== undefined) {
      data.designationAmounts = input.designationAmounts
        ? (input.designationAmounts as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull;
    } else if (input.poolMode !== undefined && input.poolMode !== 'designation_fixed') {
      // Switching away from designation_fixed clears any stale ladder.
      data.designationAmounts = Prisma.DbNull;
    }
    if (input.roleAmounts !== undefined) {
      data.roleAmounts = input.roleAmounts
        ? (input.roleAmounts as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull;
    } else if (input.poolMode !== undefined && input.poolMode !== 'role_fixed') {
      // Switching away from role_fixed clears any stale ladder.
      data.roleAmounts = Prisma.DbNull;
    }
    if (input.rolePercentages !== undefined) {
      this.validateRolePercentages(
        input.rolePercentages,
        input.status ?? existing.status,
        input.poolMode ?? existing.poolMode,
      );
      data.rolePercentages = input.rolePercentages as unknown as Prisma.InputJsonValue;
    }
    if (input.disbursementSchedule !== undefined) {
      data.disbursementSchedule =
        (input.disbursementSchedule as Prisma.InputJsonValue | null) ?? Prisma.DbNull;
    }
    if (input.effectiveFrom !== undefined) data.effectiveFrom = new Date(input.effectiveFrom);
    if (input.status !== undefined) data.status = input.status;
    if (input.pendingReason !== undefined) data.pendingReason = input.pendingReason;

    const updated = await prisma.commissionRule.update({
      where: { id },
      data,
      include: COMMISSION_RULE_INCLUDE,
    });
    return toCommissionRulePublic(updated);
  }

  /**
   * Publish a draft rule. Archives any currently-active rule for the
   * same (department, categoryId) slot by stamping its `effectiveTo`,
   * then flips the draft to `status='active'` with the given (or now)
   * effectiveFrom.
   */
  async publish(
    viewer: AuthenticatedUser,
    id: string,
    input: CommissionRulePublishInput,
  ): Promise<CommissionRulePublic> {
    this.requireManage(viewer);
    const draft = await prisma.commissionRule.findUnique({
      where: { id },
      include: COMMISSION_RULE_INCLUDE,
    });
    if (!draft) throw new NotFoundException('Rule not found');
    if (draft.status === 'active') {
      throw new BadRequestException('Rule is already active');
    }
    if (draft.status === 'archived') {
      throw new BadRequestException('Archived rules cannot be published');
    }

    this.validateRolePercentages(
      draft.rolePercentages as RolePercentages,
      'active',
      draft.poolMode,
    );

    const effectiveFrom = input.effectiveFrom ? new Date(input.effectiveFrom) : new Date();

    const published = await prisma.$transaction(async (tx) => {
      // Archive the currently-active rule for this slot (if any).
      const currentActive = await tx.commissionRule.findFirst({
        where: {
          department: draft.department,
          categoryId: draft.categoryId,
          status: 'active',
        },
      });
      if (currentActive && currentActive.id !== draft.id) {
        await tx.commissionRule.update({
          where: { id: currentActive.id },
          data: { status: 'archived', effectiveTo: effectiveFrom },
        });
      }

      // Flip the draft to active.
      return tx.commissionRule.update({
        where: { id },
        data: {
          status: 'active',
          effectiveFrom,
          publishedAt: new Date(),
          publishedById: viewer.id,
        },
        include: COMMISSION_RULE_INCLUDE,
      });
    });

    this.events.emit(
      'commission.rule.published',
      {
        ruleId: published.id,
        department: published.department,
        categoryId: published.categoryId,
        version: published.version,
        effectiveFrom: published.effectiveFrom.toISOString(),
      },
      { actorId: viewer.id },
    );

    return toCommissionRulePublic(published);
  }

  /**
   * Informational preview: how many existing projects would have used
   * this rule version if it had been the active one at their creation
   * time? Doesn't change anything — purely "what if".
   */
  async affectedProjects(id: string): Promise<CommissionRuleAffectedProjects> {
    const rule = await prisma.commissionRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Rule not found');

    const matchWhere: Prisma.ProjectWhereInput = {
      deletedAt: null,
      categoryId: rule.categoryId,
    };
    // Only count projects in the same dept (or every dept if rule is '*')
    if (rule.department !== '*') {
      const dept = await prisma.department.findFirst({ where: { slug: rule.department } });
      if (dept) matchWhere.departmentId = dept.id;
    }

    const projects = await prisma.project.findMany({
      where: matchWhere,
      select: { id: true, revenueUsd: true },
    });

    return {
      ruleId: rule.id,
      affectedProjectCount: projects.length,
      totalRevenueUsd: projects.reduce((sum, p) => sum + Number(p.revenueUsd), 0),
    };
  }
}

/* ---------- Filter-counts helpers (shared with service.list) ---------- */

/**
 * Builds the canonical `Prisma.CommissionRuleWhereInput` for the list
 * + filter-counts endpoints. Both query shapes carry the same filter
 * fields; the list query just adds offset/limit. Mirrors
 * `buildEmployeeFilterWhere` / `buildProjectFilterWhere`.
 */
type CommissionRuleFilterableQuery = Pick<
  CommissionRuleFilterCountsQuery,
  | 'departments'
  | 'categoryIds'
  | 'statuses'
  | 'poolModes'
  | 'poolValueMin'
  | 'poolValueMax'
  | 'effectiveFromStart'
  | 'effectiveFromEnd'
  | 'search'
  | 'activeOnly'
>;

function buildCommissionRuleFilterWhere(
  query: CommissionRuleFilterableQuery,
): Prisma.CommissionRuleWhereInput {
  const filters: Prisma.CommissionRuleWhereInput[] = [];
  if (query.departments.length > 0) filters.push({ department: { in: query.departments } });
  if (query.categoryIds.length > 0) filters.push({ categoryId: { in: query.categoryIds } });
  if (query.statuses.length > 0) {
    filters.push({ status: { in: query.statuses as CommissionRuleStatus[] } });
  }
  if (query.poolModes.length > 0) {
    filters.push({ poolMode: { in: query.poolModes as PoolMode[] } });
  }
  if (query.poolValueMin !== undefined) filters.push({ poolValue: { gte: query.poolValueMin } });
  if (query.poolValueMax !== undefined) filters.push({ poolValue: { lte: query.poolValueMax } });
  if (query.effectiveFromStart) {
    filters.push({ effectiveFrom: { gte: new Date(query.effectiveFromStart) } });
  }
  if (query.effectiveFromEnd) {
    filters.push({ effectiveFrom: { lte: new Date(query.effectiveFromEnd) } });
  }
  if (query.activeOnly) {
    const now = new Date();
    filters.push({ status: 'active' });
    filters.push({ effectiveFrom: { lte: now } });
    filters.push({ OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] });
  }
  if (query.search) {
    filters.push({
      OR: [
        { department: { contains: query.search, mode: 'insensitive' } },
        { pendingReason: { contains: query.search, mode: 'insensitive' } },
        { category: { name: { contains: query.search, mode: 'insensitive' } } },
      ],
    });
  }

  return filters.length > 0 ? { AND: filters } : {};
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
