/**
 * CommissionRule schemas — versioned per (department, categoryId).
 *
 * `department` may be the literal string '*' meaning "org-wide
 * fallback when no dept-specific rule exists". Role names inside
 * `rolePercentages` are free-form strings; the design convention is
 * Winner / Communicator / Eligible team but the schema doesn't pin
 * those down so new categories can introduce new roles without a
 * migration.
 *
 * Locked decisions: docs/DECISIONS.md § "Phase 2 — Business rules".
 */
import { z } from 'zod';

export const poolModeSchema = z.enum(['percentage', 'fixed']);
export type PoolMode = z.infer<typeof poolModeSchema>;

export const commissionRuleStatusSchema = z.enum([
  /** Saved but not yet published. Not eligible to back new projects. */
  'draft',
  /** Currently in force (effectiveFrom <= now <= effectiveTo). */
  'active',
  /** PNG 11 "Awaiting decision" — slot exists, numbers not settled. */
  'pending',
  /** Superseded by a newer version. Read-only. */
  'archived',
]);
export type CommissionRuleStatus = z.infer<typeof commissionRuleStatusSchema>;

/**
 * Role percentages — a JSON map of role-name → percentage. The keys
 * are arbitrary strings (the design's "winner", "communicator",
 * "eligible_team" plus any others); values must sum to 100 in any
 * non-pending rule.
 */
export const rolePercentagesSchema = z
  .record(z.string().min(1).max(40), z.number().min(0).max(100))
  .refine((obj) => Object.keys(obj).length >= 1, 'At least one role required');
export type RolePercentages = z.infer<typeof rolePercentagesSchema>;

/* ---------- Create + Update ---------- */

export const commissionRuleCreateSchema = z.object({
  department: z.string().min(1).max(60),
  categoryId: z.string().min(1),
  poolMode: poolModeSchema,
  poolValue: z.coerce.number().min(0).max(99_999_999.99),
  rolePercentages: rolePercentagesSchema,
  disbursementSchedule: z.record(z.string(), z.unknown()).nullable().optional(), // shape finalised Session 2
  effectiveFrom: z.string().min(1).optional(),
  status: commissionRuleStatusSchema.default('draft'),
  pendingReason: z.string().trim().max(500).optional(),
});
export type CommissionRuleCreateInput = z.infer<typeof commissionRuleCreateSchema>;

/** Update a draft rule. Cannot edit a published rule — publish a new version instead. */
export const commissionRuleUpdateSchema = commissionRuleCreateSchema.partial();
export type CommissionRuleUpdateInput = z.infer<typeof commissionRuleUpdateSchema>;

export const commissionRulePublishSchema = z.object({
  effectiveFrom: z.string().min(1).optional(),
});
export type CommissionRulePublishInput = z.infer<typeof commissionRulePublishSchema>;

/* ---------- Public response shape ---------- */

export const commissionRulePublicSchema = z.object({
  id: z.string(),
  department: z.string(),
  category: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    color: z.string(),
  }),
  version: z.string(),
  poolMode: poolModeSchema,
  poolValue: z.number(),
  rolePercentages: rolePercentagesSchema,
  disbursementSchedule: z.record(z.string(), z.unknown()).nullable(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  status: commissionRuleStatusSchema,
  pendingReason: z.string().nullable(),
  isCurrentlyActive: z.boolean(),
  /** Number of Projects currently using this rule version. */
  projectCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  createdById: z.string(),
  publishedAt: z.string().nullable(),
  publishedById: z.string().nullable(),
});
export type CommissionRulePublic = z.infer<typeof commissionRulePublicSchema>;

export const commissionRuleListQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(10_000).default(200),
  /** Filter by department slug or '*'. */
  department: z.string().optional(),
  categoryId: z.string().optional(),
  status: commissionRuleStatusSchema.optional(),
  /** When true, only currently-active (effectiveFrom <= now < effectiveTo) rows. */
  activeOnly: z.coerce.boolean().default(false),
});
export type CommissionRuleListQuery = z.infer<typeof commissionRuleListQuerySchema>;

export const commissionRuleListResponseSchema = z.object({
  items: z.array(commissionRulePublicSchema),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});
export type CommissionRuleListResponse = z.infer<typeof commissionRuleListResponseSchema>;

/**
 * Helper response for "GET /commission-rules/:id/affected-projects" —
 * tells the user how many existing Projects would be affected IF this
 * rule had been the one applied at project-create time. Informational
 * only; existing projects keep their snapshotted contract.
 */
export const commissionRuleAffectedProjectsSchema = z.object({
  ruleId: z.string(),
  affectedProjectCount: z.number().int().nonnegative(),
  totalRevenueUsd: z.number().nonnegative(),
});
export type CommissionRuleAffectedProjects = z.infer<typeof commissionRuleAffectedProjectsSchema>;
