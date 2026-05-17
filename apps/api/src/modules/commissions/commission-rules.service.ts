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
  CommissionRuleListQuery,
  CommissionRuleListResponse,
  CommissionRulePublic,
  CommissionRulePublishInput,
  CommissionRuleUpdateInput,
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

  private validateRolePercentages(rolePercentages: RolePercentages, status: string): void {
    if (status === 'pending') return; // pending rows are explicitly TBD
    const sum = Object.values(rolePercentages).reduce((a, b) => a + b, 0);
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
    const where: Prisma.CommissionRuleWhereInput = {};
    if (query.department) where.department = query.department;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.status) where.status = query.status;
    if (query.activeOnly) {
      const now = new Date();
      where.status = 'active';
      where.effectiveFrom = { lte: now };
      where.OR = [{ effectiveTo: null }, { effectiveTo: { gt: now } }];
    }

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

    this.validateRolePercentages(input.rolePercentages, input.status);

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
    if (input.rolePercentages !== undefined) {
      this.validateRolePercentages(input.rolePercentages, input.status ?? existing.status);
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

    this.validateRolePercentages(draft.rolePercentages as RolePercentages, 'active');

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
