/**
 * Unified expense reimbursement claim.
 *
 * Shared columns: amount, currency, expense month (stored as expenseDate),
 * description (notes), proof.
 * Medical claims store `{ subCategory }` in `details`; other categories use `{}`.
 */
import { z } from 'zod';
import {
  EXPENSE_CLAIM_CATEGORIES,
  EXPENSE_CLAIM_MAX_PKR,
  EXPENSE_CLAIM_MIN_PKR,
  EXPENSE_CURRENCIES,
  EXPENSE_FINANCE_REASON_CODES,
  GYM_CLAIM_MAX_PKR,
  LEGACY_MEDICAL_SUBCATEGORY_IDS,
  MEDICAL_SUBCATEGORIES,
} from './expense-claim-meta';

export {
  EXPENSE_CLAIM_MAX_DOCUMENTS,
  EXPENSE_CLAIM_MAX_PKR,
  EXPENSE_CLAIM_MIN_PKR,
  EXPENSE_CURRENCIES,
  EXPENSE_CLAIM_CATEGORIES,
  EXPENSE_FINANCE_REASON_CODES,
  GYM_CLAIM_MAX_PKR,
  MEDICAL_SUBCATEGORIES,
  expenseCategoryLabel,
  medicalSubcategoryLabel,
  expenseFinanceReasonLabel,
  formatExpenseFinanceFeedback,
} from './expense-claim-meta';

const categoryIds = EXPENSE_CLAIM_CATEGORIES.map((c) => c.id) as [string, ...string[]];
export const expenseClaimCategorySchema = z.enum(categoryIds);
export type ExpenseClaimCategory = z.infer<typeof expenseClaimCategorySchema>;

const medicalSubIds = MEDICAL_SUBCATEGORIES.map((c) => c.id) as [string, ...string[]];
export const medicalSubcategorySchema = z.enum(medicalSubIds);
export type MedicalSubcategory = z.infer<typeof medicalSubcategorySchema>;

const currencyIds = EXPENSE_CURRENCIES.map((c) => c.id) as [string, ...string[]];
export const expenseCurrencySchema = z.enum(currencyIds);
export type ExpenseCurrencyCode = z.infer<typeof expenseCurrencySchema>;

const financeReasonIds = EXPENSE_FINANCE_REASON_CODES.map((r) => r.id) as [string, ...string[]];
export const expenseFinanceReasonCodeSchema = z.enum(financeReasonIds);
export type ExpenseFinanceReasonCode = z.infer<typeof expenseFinanceReasonCodeSchema>;

export const expenseClaimStatusSchema = z.enum([
  'draft',
  'pending_approval',
  'returned',
  'approved',
  'rejected',
]);
export type ExpenseClaimStatus = z.infer<typeof expenseClaimStatusSchema>;

export const claimListBucketSchema = z.enum(['active', 'resolved']);
export type ClaimListBucket = z.infer<typeof claimListBucketSchema>;

export const CLAIM_LIST_BUCKET_STATUSES = {
  active: ['pending_approval', 'returned'],
  resolved: ['approved', 'rejected'],
} as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

const optionalDate = z
  .string()
  .trim()
  .nullish()
  .transform((v) => v || null);

/** Accepts `YYYY-MM` (month picker) or a full ISO date; stored as first of month when month-only. */
export const expenseMonthSchema = z
  .string()
  .trim()
  .min(1, 'Add the expense month.')
  .transform((v) => (/^\d{4}-\d{2}$/.test(v) ? `${v}-01` : v));

const requiredDescription = z.string().trim().min(1, 'Add a description.').max(2000);

const amountPkr = z.coerce
  .number()
  .min(EXPENSE_CLAIM_MIN_PKR, 'Enter a valid amount.')
  .max(EXPENSE_CLAIM_MAX_PKR);

const gymAmountPkr = z.coerce
  .number()
  .min(EXPENSE_CLAIM_MIN_PKR, 'Enter a valid reimbursement amount.')
  .max(
    GYM_CLAIM_MAX_PKR,
    `Reimbursement cannot exceed ₨${GYM_CLAIM_MAX_PKR.toLocaleString('en-PK')} per claim.`,
  );

export const medicalDetailsSchema = z.object({
  subCategory: z
    .string()
    .transform((v) => LEGACY_MEDICAL_SUBCATEGORY_IDS[v] ?? v)
    .pipe(medicalSubcategorySchema),
});
export type MedicalDetails = z.infer<typeof medicalDetailsSchema>;

export const emptyExpenseDetailsSchema = z.object({}).strict();
export type EmptyExpenseDetails = z.infer<typeof emptyExpenseDetailsSchema>;

export type ExpenseClaimDetails = MedicalDetails | EmptyExpenseDetails;

const sharedCreate = {
  currency: expenseCurrencySchema.default('PKR'),
  expenseDate: expenseMonthSchema,
  notes: requiredDescription,
};

export const expenseClaimCreateSchema = z.discriminatedUnion('category', [
  z.object({
    category: z.literal('medical'),
    amountPkr,
    ...sharedCreate,
    details: medicalDetailsSchema,
  }),
  z.object({
    category: z.literal('gym'),
    amountPkr: gymAmountPkr,
    ...sharedCreate,
    details: emptyExpenseDetailsSchema.default({}),
  }),
  z.object({
    category: z.literal('travel'),
    amountPkr,
    ...sharedCreate,
    details: emptyExpenseDetailsSchema.default({}),
  }),
  z.object({
    category: z.literal('business_development'),
    amountPkr,
    ...sharedCreate,
    details: emptyExpenseDetailsSchema.default({}),
  }),
]);
export type ExpenseClaimCreateInput = z.infer<typeof expenseClaimCreateSchema>;

export const expenseClaimUpdateSchema = z
  .object({
    category: expenseClaimCategorySchema.optional(),
    amountPkr: amountPkr.optional(),
    currency: expenseCurrencySchema.optional(),
    expenseDate: optionalDate,
    notes: optionalText(2000),
    details: z.unknown().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.category == null && data.details === undefined) return;
    if (data.category === 'gym' && data.amountPkr != null && data.amountPkr > GYM_CLAIM_MAX_PKR) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Reimbursement cannot exceed ₨${GYM_CLAIM_MAX_PKR.toLocaleString('en-PK')} per claim.`,
        path: ['amountPkr'],
      });
    }
  });
export type ExpenseClaimUpdateInput = z.infer<typeof expenseClaimUpdateSchema>;

export function parseExpenseDetails(
  category: ExpenseClaimCategory,
  raw: unknown,
): ExpenseClaimDetails {
  if (category === 'medical') {
    return medicalDetailsSchema.parse(raw ?? {});
  }
  return emptyExpenseDetailsSchema.parse(raw ?? {});
}

export const expenseClaimReturnSchema = z.object({
  reasonCode: expenseFinanceReasonCodeSchema,
  comment: z.string().trim().max(2000).optional(),
});
export type ExpenseClaimReturnInput = z.infer<typeof expenseClaimReturnSchema>;

export const expenseClaimRejectPayloadSchema = z.object({
  reasonCode: expenseFinanceReasonCodeSchema,
  comment: z.string().trim().max(2000).optional(),
});
export type ExpenseClaimRejectPayload = z.infer<typeof expenseClaimRejectPayloadSchema>;

export const expenseClaimSortDirSchema = z.enum(['asc', 'desc']);
export type ExpenseClaimSortDir = z.infer<typeof expenseClaimSortDirSchema>;

export const expenseClaimSortBySchema = z.enum(['createdAt', 'amount']);
export type ExpenseClaimSortBy = z.infer<typeof expenseClaimSortBySchema>;

export const expenseClaimListQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  status: expenseClaimStatusSchema.optional(),
  category: expenseClaimCategorySchema.optional(),
  employeeId: z.string().optional(),
  /** `mine` = caller’s claims (Expenses). `org` = all employees (Approvals history). */
  scope: z.enum(['mine', 'org']).optional(),
  /** `active` = pending + returned. `resolved` = approved + rejected. */
  bucket: claimListBucketSchema.optional(),
  sortBy: expenseClaimSortBySchema.default('createdAt'),
  sortDir: expenseClaimSortDirSchema.default('desc'),
});
export type ExpenseClaimListQuery = z.infer<typeof expenseClaimListQuerySchema>;

export const expenseClaimDocumentPublicSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  url: z.string().nullable(),
});
export type ExpenseClaimDocumentPublic = z.infer<typeof expenseClaimDocumentPublicSchema>;

export const expenseClaimHistoryEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  occurredAt: z.string(),
  eventType: z.string(),
});
export type ExpenseClaimHistoryEntry = z.infer<typeof expenseClaimHistoryEntrySchema>;

const actorPublicSchema = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .nullable();

export const expenseClaimPublicSchema = z.object({
  id: z.string(),
  claimNumber: z.string(),
  employeeId: z.string(),
  employee: z.object({
    id: z.string(),
    fullName: z.string(),
    eid: z.string(),
    departmentName: z.string().nullable(),
  }),
  status: expenseClaimStatusSchema,
  category: expenseClaimCategorySchema,
  amountPkr: z.number(),
  currency: expenseCurrencySchema,
  expenseDate: z.string().nullable(),
  notes: z.string().nullable(),
  details: z.unknown(),
  documentCount: z.number().int().nonnegative(),
  documents: z.array(expenseClaimDocumentPublicSchema),
  submittedAt: z.string().nullable(),
  submittedBy: actorPublicSchema,
  approvedAt: z.string().nullable(),
  approvedBy: actorPublicSchema,
  approvalNote: z.string().nullable(),
  rejectedAt: z.string().nullable(),
  rejectedBy: actorPublicSchema,
  rejectionReasonCode: z.string().nullable(),
  rejectionComment: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  returnedAt: z.string().nullable(),
  returnedBy: actorPublicSchema,
  returnReasonCode: z.string().nullable(),
  returnComment: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ExpenseClaimPublic = z.infer<typeof expenseClaimPublicSchema>;

export const expenseClaimDetailSchema = expenseClaimPublicSchema.extend({
  history: z.array(expenseClaimHistoryEntrySchema),
});
export type ExpenseClaimDetail = z.infer<typeof expenseClaimDetailSchema>;

export const expenseClaimListResponseSchema = z.object({
  items: z.array(expenseClaimPublicSchema),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});
export type ExpenseClaimListResponse = z.infer<typeof expenseClaimListResponseSchema>;
