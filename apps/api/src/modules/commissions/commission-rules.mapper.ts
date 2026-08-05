/**
 * CommissionRule → CommissionRulePublic mapper.
 */
import { Prisma } from '@prisma/client';
import type {
  CommissionRulePublic,
  CommissionRuleStatus,
  DesignationAmounts,
  DurationMatrix,
  PoolMode,
  RevenueBrackets,
  RoleAmounts,
  RolePercentages,
} from '@futurenostics/types';

export const COMMISSION_RULE_INCLUDE = {
  category: true,
  _count: { select: { projects: { where: { deletedAt: null } } } },
} satisfies Prisma.CommissionRuleInclude;

export type CommissionRuleRowForMapping = Prisma.CommissionRuleGetPayload<{
  include: typeof COMMISSION_RULE_INCLUDE;
}>;

export function toCommissionRulePublic(row: CommissionRuleRowForMapping): CommissionRulePublic {
  const now = new Date();
  const isCurrentlyActive =
    row.status === 'active' &&
    row.effectiveFrom <= now &&
    (row.effectiveTo === null || row.effectiveTo > now);

  return {
    id: row.id,
    department: row.department,
    category: {
      id: row.category.id,
      slug: row.category.slug,
      name: row.category.name,
      color: row.category.color,
    },
    version: row.version,
    poolMode: row.poolMode as PoolMode,
    poolValue: Number(row.poolValue),
    minProjectRevenueUsd: Number(row.minProjectRevenueUsd),
    perPersonFloorUsd: row.perPersonFloorUsd != null ? Number(row.perPersonFloorUsd) : null,
    perPersonCapUsd: row.perPersonCapUsd != null ? Number(row.perPersonCapUsd) : null,
    revenueBrackets: (row.revenueBrackets as RevenueBrackets | null) ?? null,
    designationAmounts: (row.designationAmounts as DesignationAmounts | null) ?? null,
    roleAmounts: (row.roleAmounts as RoleAmounts | null) ?? null,
    durationMatrix: (row.durationMatrix as DurationMatrix | null) ?? null,
    rolePercentages: row.rolePercentages as RolePercentages,
    disbursementSchedule: (row.disbursementSchedule as Record<string, unknown> | null) ?? null,
    effectiveFrom: row.effectiveFrom.toISOString(),
    effectiveTo: row.effectiveTo?.toISOString() ?? null,
    status: row.status as CommissionRuleStatus,
    pendingReason: row.pendingReason,
    isCurrentlyActive,
    projectCount: row._count.projects,
    createdAt: row.createdAt.toISOString(),
    createdById: row.createdById,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    publishedById: row.publishedById,
  };
}
