/**
 * OPD (outpatient) medical reimbursement claim.
 */
import { z } from 'zod';
import { OPD_CLAIM_CATEGORIES, OPD_FINANCE_REASON_CODES } from './opd-claim-meta';

export const OPD_CLAIM_MAX_DOCUMENTS = 3;
export const OPD_CLAIM_MIN_BILL_PKR = 1000;

const categoryIds = OPD_CLAIM_CATEGORIES.map((c) => c.id) as [string, ...string[]];
export const opdClaimCategorySchema = z.enum(categoryIds);
export type OpdClaimCategory = z.infer<typeof opdClaimCategorySchema>;

const financeReasonIds = OPD_FINANCE_REASON_CODES.map((r) => r.id) as [string, ...string[]];
export const opdFinanceReasonCodeSchema = z.enum(financeReasonIds);
export type OpdFinanceReasonCode = z.infer<typeof opdFinanceReasonCodeSchema>;

export const opdClaimStatusSchema = z.enum([
  'draft',
  'pending_approval',
  'returned',
  'approved',
  'rejected',
  'cancelled',
]);
export type OpdClaimStatus = z.infer<typeof opdClaimStatusSchema>;

const moneyPkr = z.coerce
  .number()
  .min(
    OPD_CLAIM_MIN_BILL_PKR,
    `Bill amount must be at least ₨${OPD_CLAIM_MIN_BILL_PKR.toLocaleString('en-PK')}.`,
  )
  .max(10_000_000);

const optionalDate = z
  .string()
  .trim()
  .nullish()
  .transform((v) => v || null);

const amountsRefine = {
  check: (data: { medicineCostPkr: number; claimedAmountPkr: number }) =>
    data.claimedAmountPkr <= data.medicineCostPkr,
  message: 'The amount cannot be more than the bill total.',
};

export const opdClaimCreateSchema = z
  .object({
    category: opdClaimCategorySchema.default('doctor_consultation'),
    medicineCostPkr: moneyPkr,
    claimedAmountPkr: moneyPkr.optional(),
    visitDate: optionalDate,
    notes: z
      .string()
      .trim()
      .max(2000)
      .nullish()
      .transform((v) => v || null),
  })
  .transform((data) => ({
    ...data,
    claimedAmountPkr: data.claimedAmountPkr ?? data.medicineCostPkr,
  }))
  .refine(amountsRefine.check, { message: amountsRefine.message, path: ['claimedAmountPkr'] });
export type OpdClaimCreateInput = z.infer<typeof opdClaimCreateSchema>;

export const opdClaimUpdateSchema = z
  .object({
    category: opdClaimCategorySchema.optional(),
    medicineCostPkr: moneyPkr.optional(),
    claimedAmountPkr: moneyPkr.optional(),
    visitDate: optionalDate,
    notes: z
      .string()
      .trim()
      .max(2000)
      .nullish()
      .transform((v) => v || null),
  })
  .refine(
    (data) => {
      if (data.medicineCostPkr == null || data.claimedAmountPkr == null) return true;
      return data.claimedAmountPkr <= data.medicineCostPkr;
    },
    { message: amountsRefine.message, path: ['claimedAmountPkr'] },
  );
export type OpdClaimUpdateInput = z.infer<typeof opdClaimUpdateSchema>;

export const opdClaimReturnSchema = z.object({
  reasonCode: opdFinanceReasonCodeSchema,
  comment: z.string().trim().max(2000).optional(),
});
export type OpdClaimReturnInput = z.infer<typeof opdClaimReturnSchema>;

export const opdClaimRejectPayloadSchema = z.object({
  reasonCode: opdFinanceReasonCodeSchema,
  comment: z.string().trim().max(2000).optional(),
});
export type OpdClaimRejectPayload = z.infer<typeof opdClaimRejectPayloadSchema>;

export const opdClaimSortDirSchema = z.enum(['asc', 'desc']);
export type OpdClaimSortDir = z.infer<typeof opdClaimSortDirSchema>;

export const opdClaimSortBySchema = z.enum(['createdAt', 'billAmount']);
export type OpdClaimSortBy = z.infer<typeof opdClaimSortBySchema>;

export const opdClaimListQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  status: opdClaimStatusSchema.optional(),
  employeeId: z.string().optional(),
  sortBy: opdClaimSortBySchema.default('createdAt'),
  sortDir: opdClaimSortDirSchema.default('desc'),
});
export type OpdClaimListQuery = z.infer<typeof opdClaimListQuerySchema>;

export const opdClaimDocumentPublicSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  url: z.string().nullable(),
});
export type OpdClaimDocumentPublic = z.infer<typeof opdClaimDocumentPublicSchema>;

export const opdClaimHistoryEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  occurredAt: z.string(),
  eventType: z.string(),
});
export type OpdClaimHistoryEntry = z.infer<typeof opdClaimHistoryEntrySchema>;

export const opdClaimPublicSchema = z.object({
  id: z.string(),
  claimNumber: z.string(),
  employeeId: z.string(),
  employee: z.object({
    id: z.string(),
    fullName: z.string(),
    eid: z.string(),
    departmentName: z.string().nullable(),
  }),
  status: opdClaimStatusSchema,
  category: opdClaimCategorySchema,
  medicineCostPkr: z.number(),
  claimedAmountPkr: z.number(),
  visitDate: z.string().nullable(),
  notes: z.string().nullable(),
  documentCount: z.number().int().nonnegative(),
  documents: z.array(opdClaimDocumentPublicSchema),
  submittedAt: z.string().nullable(),
  approvedAt: z.string().nullable(),
  approvalNote: z.string().nullable(),
  rejectedAt: z.string().nullable(),
  rejectionReasonCode: z.string().nullable(),
  rejectionComment: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  returnedAt: z.string().nullable(),
  returnReasonCode: z.string().nullable(),
  returnComment: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type OpdClaimPublic = z.infer<typeof opdClaimPublicSchema>;

export const opdClaimDetailSchema = opdClaimPublicSchema.extend({
  history: z.array(opdClaimHistoryEntrySchema),
});
export type OpdClaimDetail = z.infer<typeof opdClaimDetailSchema>;

export const opdClaimListResponseSchema = z.object({
  items: z.array(opdClaimPublicSchema),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});
export type OpdClaimListResponse = z.infer<typeof opdClaimListResponseSchema>;
