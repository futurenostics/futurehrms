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

export const poolModeSchema = z.enum([
  'percentage',
  'fixed',
  'tiered',
  /** Upwork: pool = revenue − developer salary (USD), split by assignment %. */
  'net_revenue_share',
  /** B2B: no shared pool — each assignee earns a fixed amount by designation. */
  'designation_fixed',
  /** Eng External: no shared pool — each assignee earns a fixed amount by role. */
  'role_fixed',
]);
export type PoolMode = z.infer<typeof poolModeSchema>;

/** One designation → fixed monthly amount row for `poolMode='designation_fixed'`. */
export const designationAmountSchema = z.object({
  designation: z.string().trim().min(1).max(60),
  amountUsd: z.coerce.number().min(0).max(99_999_999.99),
});
export type DesignationAmount = z.infer<typeof designationAmountSchema>;

export const designationAmountsSchema = z
  .array(designationAmountSchema)
  .min(1, 'At least one designation amount required')
  .superRefine((rows, ctx) => {
    const seen = new Set<string>();
    for (const r of rows) {
      if (seen.has(r.designation)) {
        ctx.addIssue({ code: 'custom', message: `Duplicate designation: ${r.designation}` });
      }
      seen.add(r.designation);
    }
  });
export type DesignationAmounts = z.infer<typeof designationAmountsSchema>;

/** One role → fixed monthly amount row for `poolMode='role_fixed'`. */
export const roleAmountSchema = z.object({
  role: z.string().trim().min(1).max(40),
  amountUsd: z.coerce.number().min(0).max(99_999_999.99),
});
export type RoleAmount = z.infer<typeof roleAmountSchema>;

export const roleAmountsSchema = z
  .array(roleAmountSchema)
  .min(1, 'At least one role amount required')
  .superRefine((rows, ctx) => {
    const seen = new Set<string>();
    for (const r of rows) {
      if (seen.has(r.role)) {
        ctx.addIssue({ code: 'custom', message: `Duplicate role: ${r.role}` });
      }
      seen.add(r.role);
    }
  });
export type RoleAmounts = z.infer<typeof roleAmountsSchema>;

/**
 * A single revenue bracket for `poolMode='tiered'`. `maxUsd=null`
 * marks the open-ended top bracket ("$50k and up"). `poolPct` is the
 * pool percentage applied to a project whose revenue falls in this
 * bracket.
 */
export const revenueBracketSchema = z.object({
  minUsd: z.coerce.number().min(0).max(99_999_999.99),
  maxUsd: z.coerce.number().min(0).max(99_999_999.99).nullable(),
  poolPct: z.coerce.number().min(0).max(100),
});
export type RevenueBracket = z.infer<typeof revenueBracketSchema>;

/**
 * The bracket ladder. Must be ascending, contiguous (each bracket
 * starts where the previous ended), and end with exactly one
 * open-ended (`maxUsd=null`) tail. Boundary convention is
 * `minUsd <= revenue < maxUsd`.
 */
export const revenueBracketsSchema = z
  .array(revenueBracketSchema)
  .min(1, 'At least one bracket required')
  .superRefine((brackets, ctx) => {
    for (let i = 0; i < brackets.length; i += 1) {
      const b = brackets[i]!;
      const isLast = i === brackets.length - 1;
      if (isLast) {
        if (b.maxUsd !== null) {
          ctx.addIssue({
            code: 'custom',
            message: 'The final bracket must be open-ended (no max)',
          });
        }
      } else {
        if (b.maxUsd === null) {
          ctx.addIssue({ code: 'custom', message: 'Only the final bracket may be open-ended' });
          return;
        }
        if (b.maxUsd <= b.minUsd) {
          ctx.addIssue({ code: 'custom', message: 'Each bracket max must exceed its min' });
        }
        if (brackets[i + 1]!.minUsd !== b.maxUsd) {
          ctx.addIssue({
            code: 'custom',
            message: 'Brackets must be contiguous — each starts where the previous ends',
          });
        }
      }
    }
  });
export type RevenueBrackets = z.infer<typeof revenueBracketsSchema>;

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

const commissionRuleBaseSchema = z.object({
  department: z.string().min(1).max(60),
  categoryId: z.string().min(1),
  poolMode: poolModeSchema,
  poolValue: z.coerce.number().min(0).max(99_999_999.99),
  /** Projects below this revenue threshold generate no line items. 0 = no threshold. */
  minProjectRevenueUsd: z.coerce.number().min(0).max(99_999_999.99).default(0),
  /**
   * Per-person payout guardrails applied to each line item's calculated
   * amount. null / omitted = no bound. Cap must be >= floor when both set.
   */
  perPersonFloorUsd: z.coerce.number().min(0).max(99_999_999.99).nullable().optional(),
  perPersonCapUsd: z.coerce.number().min(0).max(99_999_999.99).nullable().optional(),
  /** Bracket ladder for `poolMode='tiered'`; null/omitted otherwise. */
  revenueBrackets: revenueBracketsSchema.nullable().optional(),
  /** Designation → amount ladder for `poolMode='designation_fixed'`; null otherwise. */
  designationAmounts: designationAmountsSchema.nullable().optional(),
  /** Role → amount ladder for `poolMode='role_fixed'`; null otherwise. */
  roleAmounts: roleAmountsSchema.nullable().optional(),
  rolePercentages: rolePercentagesSchema,
  disbursementSchedule: z.record(z.string(), z.unknown()).nullable().optional(),
  effectiveFrom: z.string().min(1).optional(),
  status: commissionRuleStatusSchema.default('draft'),
  pendingReason: z.string().trim().max(500).optional(),
});

/**
 * Cross-field validation shared by create + update:
 *   - per-person cap must be >= floor when both are set;
 *   - a tiered rule needs a bracket ladder (except while `pending`),
 *     and non-tiered rules must not carry brackets (so a mode switch
 *     can't leave stale data behind).
 */
function commissionRuleRefine(
  input: {
    poolMode?: PoolMode;
    revenueBrackets?: RevenueBrackets | null;
    designationAmounts?: DesignationAmounts | null;
    roleAmounts?: RoleAmounts | null;
    status?: CommissionRuleStatus;
    perPersonFloorUsd?: number | null;
    perPersonCapUsd?: number | null;
  },
  ctx: z.RefinementCtx,
): void {
  if (
    input.perPersonCapUsd != null &&
    input.perPersonFloorUsd != null &&
    input.perPersonCapUsd < input.perPersonFloorUsd
  ) {
    ctx.addIssue({
      code: 'custom',
      message: 'perPersonCapUsd must be >= perPersonFloorUsd',
      path: ['perPersonCapUsd'],
    });
  }

  if (input.poolMode === 'tiered') {
    if (
      input.status !== 'pending' &&
      (!input.revenueBrackets || input.revenueBrackets.length === 0)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Tiered rules require at least one revenue bracket',
        path: ['revenueBrackets'],
      });
    }
  } else if (input.poolMode !== undefined && input.revenueBrackets) {
    ctx.addIssue({
      code: 'custom',
      message: 'Revenue brackets only apply to tiered rules',
      path: ['revenueBrackets'],
    });
  }

  if (input.poolMode === 'designation_fixed') {
    if (
      input.status !== 'pending' &&
      (!input.designationAmounts || input.designationAmounts.length === 0)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Designation-fixed rules require at least one designation amount',
        path: ['designationAmounts'],
      });
    }
  } else if (input.poolMode !== undefined && input.designationAmounts) {
    ctx.addIssue({
      code: 'custom',
      message: 'Designation amounts only apply to designation-fixed rules',
      path: ['designationAmounts'],
    });
  }

  if (input.poolMode === 'role_fixed') {
    if (input.status !== 'pending' && (!input.roleAmounts || input.roleAmounts.length === 0)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Role-fixed rules require at least one role amount',
        path: ['roleAmounts'],
      });
    }
  } else if (input.poolMode !== undefined && input.roleAmounts) {
    ctx.addIssue({
      code: 'custom',
      message: 'Role amounts only apply to role-fixed rules',
      path: ['roleAmounts'],
    });
  }
}

export const commissionRuleCreateSchema =
  commissionRuleBaseSchema.superRefine(commissionRuleRefine);
export type CommissionRuleCreateInput = z.infer<typeof commissionRuleCreateSchema>;

/** Update a draft rule. Cannot edit a published rule — publish a new version instead. */
export const commissionRuleUpdateSchema = commissionRuleBaseSchema
  .partial()
  .superRefine(commissionRuleRefine);
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
  minProjectRevenueUsd: z.number(),
  perPersonFloorUsd: z.number().nullable(),
  perPersonCapUsd: z.number().nullable(),
  revenueBrackets: revenueBracketsSchema.nullable(),
  designationAmounts: designationAmountsSchema.nullable(),
  roleAmounts: roleAmountsSchema.nullable(),
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

/**
 * Comma-separated id list — same coercer pattern used by the employees
 * and projects schemas. Accepts a string[] or a comma-joined string.
 */
const ruleCsvIds = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => {
    if (v === undefined) return [] as string[];
    if (Array.isArray(v)) return v.filter(Boolean);
    return v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  });

/** ISO-string date — input + output both `string` so the type round-trips through URL params. */
const ruleIsoDate = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date')
  .optional();

export const commissionRuleListQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(10_000).default(200),
  search: z.string().trim().min(1).optional(),

  /* Array-shaped filters — array IDs / slugs / status. */
  departments: ruleCsvIds,
  categoryIds: ruleCsvIds,
  statuses: ruleCsvIds,
  /** Pool mode slugs (`percentage` | `fixed`). */
  poolModes: ruleCsvIds,

  /* Range filters. */
  poolValueMin: z.coerce.number().nonnegative().optional(),
  poolValueMax: z.coerce.number().nonnegative().optional(),
  effectiveFromStart: ruleIsoDate,
  effectiveFromEnd: ruleIsoDate,

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

/* ---------- Filter counts (Advanced Filters drawer) ---------- */

export const commissionRuleFilterCountsQuerySchema = z.object({
  departments: ruleCsvIds,
  categoryIds: ruleCsvIds,
  statuses: ruleCsvIds,
  poolModes: ruleCsvIds,
  poolValueMin: z.coerce.number().nonnegative().optional(),
  poolValueMax: z.coerce.number().nonnegative().optional(),
  effectiveFromStart: ruleIsoDate,
  effectiveFromEnd: ruleIsoDate,
  search: z.string().trim().min(1).optional(),
  activeOnly: z.coerce.boolean().default(false),
});
export type CommissionRuleFilterCountsQuery = z.infer<typeof commissionRuleFilterCountsQuerySchema>;

export const commissionRuleFilterCountBucketSchema = z.object({
  from: z.union([z.number(), z.string()]),
  to: z.union([z.number(), z.string()]),
  count: z.number().int().nonnegative(),
});
export type CommissionRuleFilterCountBucket = z.infer<typeof commissionRuleFilterCountBucketSchema>;

export const commissionRuleFilterCountsResponseSchema = z.object({
  total: z.number().int().nonnegative(),
  byDepartment: z.record(z.string(), z.number().int().nonnegative()),
  byCategory: z.record(z.string(), z.number().int().nonnegative()),
  byStatus: z.record(z.string(), z.number().int().nonnegative()),
  byPoolMode: z.record(z.string(), z.number().int().nonnegative()),
  /** Pool value histogram across the active set. */
  poolValue: z.object({
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
    buckets: z.array(commissionRuleFilterCountBucketSchema),
  }),
  /** Effective-from month buckets between earliest and latest. */
  effectiveFrom: z.object({
    earliest: z.string().nullable(),
    latest: z.string().nullable(),
    buckets: z.array(commissionRuleFilterCountBucketSchema),
  }),
});
export type CommissionRuleFilterCountsResponse = z.infer<
  typeof commissionRuleFilterCountsResponseSchema
>;

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
