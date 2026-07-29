/**
 * CommissionDispute schemas — the employee "this looks wrong" flow.
 *
 * An employee flags a specific commission line item; HR resolves it
 * with a status + note (no dollar change — that's a separate draft
 * line-item adjustment). Lifecycle: open → resolved | rejected.
 */
import { z } from 'zod';

export const commissionDisputeStatusSchema = z.enum(['open', 'resolved', 'rejected']);
export type CommissionDisputeStatus = z.infer<typeof commissionDisputeStatusSchema>;

/** Employee raises a dispute against one of their line items. */
export const commissionDisputeCreateSchema = z.object({
  lineItemId: z.string().min(1),
  reason: z.string().trim().min(1).max(1000),
});
export type CommissionDisputeCreateInput = z.infer<typeof commissionDisputeCreateSchema>;

/** HR closes a dispute — resolved or rejected, with an optional note. */
export const commissionDisputeResolveSchema = z.object({
  status: z.enum(['resolved', 'rejected']),
  resolutionNote: z.string().trim().max(1000).optional(),
});
export type CommissionDisputeResolveInput = z.infer<typeof commissionDisputeResolveSchema>;

export const commissionDisputeListQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  status: commissionDisputeStatusSchema.optional(),
  /** Restrict to a single run's disputes (HR run-detail panel). */
  runId: z.string().optional(),
  /** true = only the caller's own disputes (employee view). */
  mine: z.coerce.boolean().default(false),
});
export type CommissionDisputeListQuery = z.infer<typeof commissionDisputeListQuerySchema>;

export const commissionDisputePublicSchema = z.object({
  id: z.string(),
  lineItemId: z.string().nullable(),
  runId: z.string(),
  employeeId: z.string(),
  employee: z.object({ id: z.string(), fullName: z.string(), eid: z.string() }).nullable(),
  projectId: z.string().nullable(),
  projectName: z.string().nullable(),
  roleName: z.string().nullable(),
  disputedAmountUsd: z.number().nullable(),
  raisedById: z.string(),
  reason: z.string(),
  status: commissionDisputeStatusSchema,
  resolutionNote: z.string().nullable(),
  resolvedById: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CommissionDisputePublic = z.infer<typeof commissionDisputePublicSchema>;

export const commissionDisputeListResponseSchema = z.object({
  items: z.array(commissionDisputePublicSchema),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
  /** Count of still-open disputes in the current filter — badge source. */
  openCount: z.number().int().nonnegative(),
});
export type CommissionDisputeListResponse = z.infer<typeof commissionDisputeListResponseSchema>;
