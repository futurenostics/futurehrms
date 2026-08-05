/**
 * CommissionRun + CommissionLineItem → public shape mappers.
 */
import { Prisma } from '@prisma/client';
import type {
  CommissionLineItemPublic,
  CommissionRunDetail,
  CommissionRunStatus,
  CommissionRunSummary,
} from '@futurenostics/types';
import { monthLabel } from './commission-calc';

export const COMMISSION_RUN_INCLUDE = {
  lineItems: {
    include: {
      project: { include: { category: true } },
      employee: { include: { department: true, designation: true } },
    },
    orderBy: [{ employeeId: 'asc' as const }, { projectId: 'asc' as const }],
  },
} satisfies Prisma.CommissionRunInclude;

export type CommissionRunRowForMapping = Prisma.CommissionRunGetPayload<{
  include: typeof COMMISSION_RUN_INCLUDE;
}>;

export type CommissionLineItemRowForMapping = CommissionRunRowForMapping['lineItems'][number];

export function toCommissionLineItemPublic(
  row: CommissionLineItemRowForMapping,
): CommissionLineItemPublic {
  return {
    id: row.id,
    runId: row.runId,
    projectId: row.projectId,
    project: {
      id: row.project.id,
      name: row.project.name,
      clientName: row.project.clientName,
      category: {
        id: row.project.category.id,
        slug: row.project.category.slug,
        name: row.project.category.name,
        color: row.project.category.color,
      },
    },
    employeeId: row.employeeId,
    employee: {
      id: row.employee.id,
      fullName: row.employee.fullName,
      eid: row.employee.eid,
      departmentName: row.employee.department?.name ?? null,
      designationName: row.employee.designation?.name ?? null,
    },
    roleName: row.roleName,
    snapshotPercentage: Number(row.snapshotPercentage),
    baseRevenueUsd: Number(row.baseRevenueUsd),
    monthFractionDisplay: `${row.monthFractionNumerator}/${row.monthFractionDenominator}`,
    monthFractionNumerator: row.monthFractionNumerator,
    monthFractionDenominator: row.monthFractionDenominator,
    calculatedAmountUsd: Number(row.calculatedAmountUsd),
    leaveAdjustmentUsd: Number(row.leaveAdjustmentUsd),
    workingDaysInMonth: row.workingDaysInMonth ?? null,
    leaveDays: row.leaveDays ?? null,
    manualAdjustmentUsd: Number(row.manualAdjustmentUsd),
    manualAdjustmentNote: row.manualAdjustmentNote,
    isHeld: row.isHeld,
    holdReason: row.holdReason ?? null,
    carryForwardToRunId: row.carryForwardToRunId,
    carryForwardFromRunId: row.carryForwardFromRunId,
    finalAmountUsd: Number(row.finalAmountUsd),
    isClawback: row.isClawback,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toCommissionRunSummary(row: CommissionRunRowForMapping): CommissionRunSummary {
  const totalDisbursementUsd = row.lineItems.reduce(
    (sum, li) => sum + Number(li.finalAmountUsd),
    0,
  );
  const projectIds = new Set(row.lineItems.map((li) => li.projectId));
  const recipientIds = new Set(row.lineItems.map((li) => li.employeeId));
  const leaveProratedCount = row.lineItems.filter(
    (li) => Number(li.leaveAdjustmentUsd) !== 0,
  ).length;
  const carryForwardCount = row.lineItems.filter((li) => li.carryForwardFromRunId !== null).length;

  return {
    id: row.id,
    monthKey: row.monthKey,
    monthLabel: monthLabel(row.monthKey),
    periodStart: row.periodStart?.toISOString() ?? null,
    periodEnd: row.periodEnd?.toISOString() ?? null,
    status: row.status as CommissionRunStatus,
    fxRateUsdToPkr: Number(row.fxRateUsdToPkr),
    totalDisbursementUsd: Math.round(totalDisbursementUsd * 100) / 100,
    projectCount: projectIds.size,
    recipientCount: recipientIds.size,
    leaveProratedCount,
    carryForwardCount,
    createdAt: row.createdAt.toISOString(),
    createdById: row.createdById,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    submittedById: row.submittedById,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    approvedById: row.approvedById,
    approverIsSubmitter: row.approverIsSubmitter,
    rejectedAt: row.rejectedAt?.toISOString() ?? null,
    rejectedById: row.rejectedById,
    rejectReason: row.rejectReason,
    lockedAt: row.lockedAt?.toISOString() ?? null,
    lockedById: row.lockedById,
    notes: row.notes,
  };
}

export function toCommissionRunDetail(row: CommissionRunRowForMapping): CommissionRunDetail {
  return {
    ...toCommissionRunSummary(row),
    lineItems: row.lineItems.map(toCommissionLineItemPublic),
  };
}
