/**
 * CommissionRun + CommissionLineItem schemas.
 *
 * Run lifecycle: draft → pending_approval → approved → locked. A
 * rejection sends the run back to draft (with the rejectReason
 * preserved). `locked` is the Phase-7 terminal state once payout
 * files are generated.
 *
 * Each line item carries a snapshot of the inputs that drove its
 * amount, plus three adjustment columns (leave, manual, carry-
 * forward) so the audit trail and the CSV export are uniform.
 */
import { z } from 'zod';

/* ---------- Enums ---------- */

/** Upwork payout source — Profile balance vs the linked Mastercard. */
export const commissionPaymentSourceSchema = z.enum(['profile', 'mastercard']);
export type CommissionPaymentSource = z.infer<typeof commissionPaymentSourceSchema>;

export const commissionRunStatusSchema = z.enum([
  'draft',
  'pending_approval',
  'approved',
  'locked',
  'rejected',
]);
export type CommissionRunStatus = z.infer<typeof commissionRunStatusSchema>;

/**
 * Allowed transitions. `rejected` is an intermediate state that
 * collapses back to draft on the next edit.
 */
export const COMMISSION_RUN_TRANSITIONS: Record<CommissionRunStatus, CommissionRunStatus[]> = {
  draft: ['pending_approval'],
  pending_approval: ['approved', 'rejected'],
  rejected: ['draft', 'pending_approval'],
  approved: ['locked'],
  locked: [],
};

/* ---------- Run create / list / public ---------- */

export const commissionRunCreateSchema = z
  .object({
    /** 'YYYY-MM'. The month the run is FOR. */
    monthKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'monthKey must be YYYY-MM'),
    /** USD → PKR rate pinned for the run. Display only in Phase 2. */
    fxRateUsdToPkr: z.coerce.number().min(0.000001).max(10_000),
    /**
     * Optional custom processing window (Upwork custom date-range). Both
     * must be set together; when present the calc uses them as the
     * payout window instead of the calendar month. ISO date strings.
     */
    periodStart: z.string().min(1).nullable().optional(),
    periodEnd: z.string().min(1).nullable().optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .superRefine((v, ctx) => {
    const hasStart = !!v.periodStart;
    const hasEnd = !!v.periodEnd;
    if (hasStart !== hasEnd) {
      ctx.addIssue({
        code: 'custom',
        message: 'Set both a period start and end, or neither.',
        path: [hasStart ? 'periodEnd' : 'periodStart'],
      });
    }
    if (hasStart && hasEnd && Date.parse(v.periodEnd!) < Date.parse(v.periodStart!)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Period end must be on or after the start.',
        path: ['periodEnd'],
      });
    }
  });
export type CommissionRunCreateInput = z.infer<typeof commissionRunCreateSchema>;

export const commissionRunListQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(1_000).default(50),
  status: commissionRunStatusSchema.optional(),
  /** Filter by year-only ('2026') or month ('2026-05'). */
  monthPrefix: z
    .string()
    .regex(/^\d{4}(-\d{2})?$/)
    .optional(),
});
export type CommissionRunListQuery = z.infer<typeof commissionRunListQuerySchema>;

export const commissionRunSummarySchema = z.object({
  id: z.string(),
  monthKey: z.string(),
  monthLabel: z.string(), // 'May 2026'
  /** Custom processing window (ISO), when the run pins one; else null. */
  periodStart: z.string().nullable(),
  periodEnd: z.string().nullable(),
  status: commissionRunStatusSchema,
  fxRateUsdToPkr: z.number(),
  /** Totals derived from line items. */
  totalDisbursementUsd: z.number(),
  projectCount: z.number().int().nonnegative(),
  recipientCount: z.number().int().nonnegative(),
  leaveProratedCount: z.number().int().nonnegative(),
  carryForwardCount: z.number().int().nonnegative(),
  /** Lifecycle actors + timestamps. */
  createdAt: z.string(),
  createdById: z.string(),
  submittedAt: z.string().nullable(),
  submittedById: z.string().nullable(),
  approvedAt: z.string().nullable(),
  approvedById: z.string().nullable(),
  approverIsSubmitter: z.boolean(),
  rejectedAt: z.string().nullable(),
  rejectedById: z.string().nullable(),
  rejectReason: z.string().nullable(),
  lockedAt: z.string().nullable(),
  lockedById: z.string().nullable(),
  /** Post-lock disbursement to payout portals (Module 4). */
  disbursedAt: z.string().nullable(),
  disbursedById: z.string().nullable(),
  notes: z.string().nullable(),
});
export type CommissionRunSummary = z.infer<typeof commissionRunSummarySchema>;

export const commissionRunListResponseSchema = z.object({
  items: z.array(commissionRunSummarySchema),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});
export type CommissionRunListResponse = z.infer<typeof commissionRunListResponseSchema>;

/* ---------- Line item ---------- */

export const commissionLineItemPublicSchema = z.object({
  id: z.string(),
  runId: z.string(),
  projectId: z.string(),
  project: z.object({
    id: z.string(),
    name: z.string(),
    clientName: z.string(),
    category: z.object({
      id: z.string(),
      slug: z.string(),
      name: z.string(),
      color: z.string(),
    }),
  }),
  employeeId: z.string(),
  employee: z.object({
    id: z.string(),
    fullName: z.string(),
    eid: z.string(),
    departmentName: z.string().nullable(),
    designationName: z.string().nullable(),
  }),
  roleName: z.string(),
  snapshotPercentage: z.number(),
  baseRevenueUsd: z.number(),
  /** Display: e.g. "28/28" */
  monthFractionDisplay: z.string(),
  monthFractionNumerator: z.number().int().nonnegative(),
  monthFractionDenominator: z.number().int().nonnegative(),
  calculatedAmountUsd: z.number(),
  leaveAdjustmentUsd: z.number(),
  /** Leave-days inputs (External): working days in month + approved leaves. */
  workingDaysInMonth: z.number().int().nullable(),
  leaveDays: z.number().int().nullable(),
  manualAdjustmentUsd: z.number(),
  manualAdjustmentNote: z.string().nullable(),
  isHeld: z.boolean(),
  /** Mandatory reason when the line is held. */
  holdReason: z.string().nullable(),
  /** Upwork processing: manually entered period revenue + payout source. */
  periodRevenueUsd: z.number().nullable(),
  paymentSource: commissionPaymentSourceSchema.nullable(),
  carryForwardToRunId: z.string().nullable(),
  carryForwardFromRunId: z.string().nullable(),
  finalAmountUsd: z.number(),
  /** System-generated reversal line for a refunded project's commission. */
  isClawback: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CommissionLineItemPublic = z.infer<typeof commissionLineItemPublicSchema>;

export const commissionRunDetailSchema = commissionRunSummarySchema.extend({
  lineItems: z.array(commissionLineItemPublicSchema),
});
export type CommissionRunDetail = z.infer<typeof commissionRunDetailSchema>;

/* ---------- Line item adjustment ---------- */

export const commissionLineItemAdjustSchema = z.object({
  leaveAdjustmentUsd: z.coerce.number().optional(),
  /**
   * Leave-days deduction inputs (External). When both are provided the
   * server computes the leave adjustment as
   *   −calculated × leaveDays / workingDays
   * (pro-rated working-day model) and ignores any leaveAdjustmentUsd.
   */
  workingDaysInMonth: z.coerce.number().int().min(1).max(31).nullable().optional(),
  leaveDays: z.coerce.number().int().min(0).max(31).nullable().optional(),
  manualAdjustmentUsd: z.coerce.number().optional(),
  manualAdjustmentNote: z.string().trim().max(500).nullable().optional(),
  isHeld: z.boolean().optional(),
  /** Required (non-empty) when isHeld is set true. */
  holdReason: z.string().trim().max(500).nullable().optional(),
  /**
   * Upwork processing (draft only). When `periodRevenueUsd` is provided
   * it overrides the line's snapshot base revenue and the calculated
   * amount is re-derived linearly (preserving the month-fraction and
   * rule percentage the line already carries). `paymentSource` records
   * the payout channel.
   */
  periodRevenueUsd: z.coerce.number().min(0).nullable().optional(),
  paymentSource: commissionPaymentSourceSchema.nullable().optional(),
});
export type CommissionLineItemAdjustInput = z.infer<typeof commissionLineItemAdjustSchema>;

/**
 * Manually add a recipient the calc engine didn't generate (draft
 * runs only). The whole amount lands in `manualAdjustmentUsd` with a
 * required note; the calculated portion is 0. A reason is mandatory
 * because a manual line has no rule/project math backing it.
 */
export const commissionLineItemManualCreateSchema = z.object({
  projectId: z.string().min(1),
  employeeId: z.string().min(1),
  roleName: z.string().trim().min(1).max(40),
  amountUsd: z.coerce.number().refine((n) => n !== 0, 'Amount must be non-zero'),
  note: z.string().trim().min(1).max(500),
});
export type CommissionLineItemManualCreateInput = z.infer<
  typeof commissionLineItemManualCreateSchema
>;

/* ---------- Lifecycle inputs ---------- */

export const commissionRunSubmitSchema = z.object({
  notes: z.string().trim().max(2000).optional(),
});
export type CommissionRunSubmitInput = z.infer<typeof commissionRunSubmitSchema>;

export const commissionRunApproveSchema = z.object({
  /** Typed phrase from PNG 10. Must equal `APPROVE <MONTH YEAR>` of the run's month (case-sensitive). */
  confirmationPhrase: z.string().trim().min(1),
  notes: z.string().trim().max(2000).optional(),
});
export type CommissionRunApproveInput = z.infer<typeof commissionRunApproveSchema>;

export const commissionRunRejectSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});
export type CommissionRunRejectInput = z.infer<typeof commissionRunRejectSchema>;

/* ---------- Per-employee breakdown ---------- */

export const employeeCommissionBreakdownSchema = z.object({
  employeeId: z.string(),
  monthKey: z.string(),
  monthLabel: z.string(),
  totalUsd: z.number(),
  lineItems: z.array(commissionLineItemPublicSchema),
  /** Source run — `null` when the month has no run yet. */
  runId: z.string().nullable(),
  runStatus: commissionRunStatusSchema.nullable(),
});
export type EmployeeCommissionBreakdown = z.infer<typeof employeeCommissionBreakdownSchema>;

export const employeeCommissionTrendPointSchema = z.object({
  monthKey: z.string(),
  monthLabel: z.string(),
  totalUsd: z.number(),
});
export type EmployeeCommissionTrendPoint = z.infer<typeof employeeCommissionTrendPointSchema>;

export const employeeCommissionTrendSchema = z.object({
  employeeId: z.string(),
  points: z.array(employeeCommissionTrendPointSchema),
});
export type EmployeeCommissionTrend = z.infer<typeof employeeCommissionTrendSchema>;

/* ---------- Run analytics (rollups + leaderboard) ---------- */

export const commissionRunAnalyticsQuerySchema = z.object({
  /** How many rows to return in the top-earners leaderboard. */
  topN: z.coerce.number().int().min(1).max(100).default(10),
});
export type CommissionRunAnalyticsQuery = z.infer<typeof commissionRunAnalyticsQuerySchema>;

export const commissionLeaderboardRowSchema = z.object({
  employeeId: z.string(),
  fullName: z.string(),
  eid: z.string(),
  departmentName: z.string().nullable(),
  totalUsd: z.number(),
  /** Fraction (0–1) of the run's total this person accounts for. */
  shareOfRun: z.number(),
});
export type CommissionLeaderboardRow = z.infer<typeof commissionLeaderboardRowSchema>;

export const commissionRollupRowSchema = z.object({
  key: z.string(),
  label: z.string(),
  /** Optional swatch (category color); null for dept/role rows. */
  color: z.string().nullable(),
  totalUsd: z.number(),
  recipientCount: z.number().int().nonnegative(),
});
export type CommissionRollupRow = z.infer<typeof commissionRollupRowSchema>;

export const commissionRunAnalyticsSchema = z.object({
  runId: z.string(),
  monthKey: z.string(),
  monthLabel: z.string(),
  status: commissionRunStatusSchema,
  totalUsd: z.number(),
  recipientCount: z.number().int().nonnegative(),
  projectCount: z.number().int().nonnegative(),
  topEarners: z.array(commissionLeaderboardRowSchema),
  byDepartment: z.array(commissionRollupRowSchema),
  byCategory: z.array(commissionRollupRowSchema),
  byRole: z.array(commissionRollupRowSchema),
});
export type CommissionRunAnalytics = z.infer<typeof commissionRunAnalyticsSchema>;

/* ---------- Cross-run trend (period-over-period) ---------- */

export const commissionRunsTrendQuerySchema = z.object({
  monthsBack: z.coerce.number().int().min(1).max(36).default(12),
});
export type CommissionRunsTrendQuery = z.infer<typeof commissionRunsTrendQuerySchema>;

export const commissionRunsTrendPointSchema = z.object({
  monthKey: z.string(),
  monthLabel: z.string(),
  /** null when no run exists for that month. */
  status: commissionRunStatusSchema.nullable(),
  totalUsd: z.number(),
  recipientCount: z.number().int().nonnegative(),
});
export type CommissionRunsTrendPoint = z.infer<typeof commissionRunsTrendPointSchema>;

export const commissionRunsTrendSchema = z.object({
  points: z.array(commissionRunsTrendPointSchema),
});
export type CommissionRunsTrend = z.infer<typeof commissionRunsTrendSchema>;
