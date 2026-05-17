/**
 * Project + ProjectCategory + ProjectAssignment schemas.
 *
 * Single source of truth for FE form validation, API DTO validation,
 * and TanStack-Query response parsing. Mirrors the Prisma models added
 * in 20260517222140_phase2_projects_commissions_initial.
 *
 * Locked decisions live in docs/DECISIONS.md § "Phase 2 — Business rules".
 */
import { z } from 'zod';

/* ---------- Enums ---------- */

export const projectStatusSchema = z.enum([
  'draft',
  'active',
  'in_billing',
  'on_hold',
  'completed',
  'cancelled',
  'refunded',
]);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

/**
 * Allowed status transitions. Used both client-side (to gate the
 * status-change dialog's option list) and server-side (to reject
 * invalid PATCHes). Keys: the FROM status. Values: the TO statuses.
 *
 * Rationale per state:
 *   - draft → active (launch) or cancelled (abandoned before launch)
 *   - active → in_billing (invoicing begins), on_hold (pause), completed, cancelled
 *   - in_billing → on_hold, completed, cancelled
 *   - on_hold → active, in_billing, cancelled (resume or kill)
 *   - completed → refunded (post-completion claw-back)
 *   - cancelled, refunded → terminal; no further transitions.
 */
export const PROJECT_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ['active', 'cancelled'],
  active: ['in_billing', 'on_hold', 'completed', 'cancelled'],
  in_billing: ['on_hold', 'completed', 'cancelled'],
  on_hold: ['active', 'in_billing', 'cancelled'],
  completed: ['refunded'],
  cancelled: [],
  refunded: [],
};

/* ---------- ProjectCategory ---------- */

export const projectCategoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'lowercase letters, digits, dashes')
    .max(60),
  description: z.string().trim().max(500).optional(),
  color: z.string().trim().min(1).max(40).default('violet'),
  parentId: z.string().min(1).nullable().optional(),
  defaultRuleId: z.string().min(1).nullable().optional(),
});
export type ProjectCategoryCreateInput = z.infer<typeof projectCategoryCreateSchema>;

export const projectCategoryUpdateSchema = projectCategoryCreateSchema.partial().extend({
  archived: z.boolean().optional(),
});
export type ProjectCategoryUpdateInput = z.infer<typeof projectCategoryUpdateSchema>;

export const projectCategoryPublicSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string(),
  parentId: z.string().nullable(),
  defaultRuleId: z.string().nullable(),
  archived: z.boolean(),
  /** Derived: number of non-archived projects in this category. */
  projectCount: z.number().int().nonnegative(),
  /** Derived: sum of revenueUsd across projects in this category. */
  totalRevenueUsd: z.number().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ProjectCategoryPublic = z.infer<typeof projectCategoryPublicSchema>;

/** Tree-shaped node for the categories editor (PNG 09). */
export const projectCategoryTreeNodeSchema: z.ZodType<ProjectCategoryTreeNode> = z.lazy(() =>
  projectCategoryPublicSchema.extend({
    children: z.array(projectCategoryTreeNodeSchema),
  }),
);
export type ProjectCategoryTreeNode = ProjectCategoryPublic & {
  children: ProjectCategoryTreeNode[];
};

/* ---------- ProjectAssignment ---------- */

export const projectAssignmentInputSchema = z.object({
  employeeId: z.string().min(1),
  roleName: z.string().trim().min(1).max(40),
  /** 0–100, two decimals. */
  percentage: z.coerce.number().min(0).max(100),
});
export type ProjectAssignmentInput = z.infer<typeof projectAssignmentInputSchema>;

export const projectAssignmentPublicSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  employee: z.object({
    id: z.string(),
    fullName: z.string(),
    eid: z.string(),
    photoUrl: z.string().nullable(),
    departmentName: z.string().nullable(),
    designationName: z.string().nullable(),
  }),
  roleName: z.string(),
  percentage: z.number(),
  assignedAt: z.string(),
  removedAt: z.string().nullable(),
});
export type ProjectAssignmentPublic = z.infer<typeof projectAssignmentPublicSchema>;

/* ---------- Project ---------- */

export const projectCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  clientName: z.string().trim().min(1).max(120),
  categoryId: z.string().min(1),
  departmentId: z.string().min(1),
  revenueUsd: z.coerce.number().min(0).max(99_999_999.99),
  status: projectStatusSchema.default('draft'),
  startDate: z.string().min(1),
  expectedCompletionDate: z.string().nullable().optional(),
  notes: z.string().trim().max(2000).optional(),

  /**
   * If true, the caller is providing role assignments that override
   * the rule defaults. The server requires `overrideReason` to be
   * set and the per-row percentages must add up to 100.
   */
  hasOverride: z.boolean().default(false),
  overrideReason: z.string().trim().max(500).optional(),
  /**
   * Per-role assignments. When `hasOverride` is false the server
   * accepts the rule's defaults if this array is empty.
   */
  assignments: z.array(projectAssignmentInputSchema).default([]),
});
export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;

export const projectUpdateSchema = projectCreateSchema
  .omit({ assignments: true, hasOverride: true, overrideReason: true })
  .partial();
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;

export const projectChangeStatusSchema = z.object({
  toStatus: projectStatusSchema,
  reason: z.string().trim().max(500).optional(),
});
export type ProjectChangeStatusInput = z.infer<typeof projectChangeStatusSchema>;

export const projectSortBySchema = z.enum([
  'name',
  'startDate',
  'revenueUsd',
  'createdAt',
  'status',
]);
export type ProjectSortBy = z.infer<typeof projectSortBySchema>;

export const projectListQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(10_000).default(50),
  search: z.string().trim().min(1).optional(),
  categoryId: z.string().optional(),
  departmentId: z.string().optional(),
  status: projectStatusSchema.optional(),
  /** If set, only projects this employee is assigned to. */
  assignedEmployeeId: z.string().optional(),
  sortBy: projectSortBySchema.default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  includeArchived: z.coerce.boolean().default(false),
});
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;

export const projectPublicSchema = z.object({
  id: z.string(),
  name: z.string(),
  clientName: z.string(),
  category: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    color: z.string(),
    parentId: z.string().nullable(),
  }),
  department: z.object({ id: z.string(), name: z.string(), slug: z.string() }),
  commissionRule: z.object({
    id: z.string(),
    version: z.string(),
    department: z.string(),
    poolMode: z.enum(['percentage', 'fixed']),
    poolValue: z.number(),
  }),
  hasOverride: z.boolean(),
  overrideReason: z.string().nullable(),
  revenueUsd: z.number(),
  status: projectStatusSchema,
  startDate: z.string(),
  expectedCompletionDate: z.string().nullable(),
  notes: z.string().nullable(),
  assignments: z.array(projectAssignmentPublicSchema),
  /** Convenience flags computed server-side. */
  isArchived: z.boolean(),
  isLockedFromCommissions: z.boolean(), // true when status is cancelled or refunded
  createdAt: z.string(),
  updatedAt: z.string(),
  createdById: z.string(),
});
export type ProjectPublic = z.infer<typeof projectPublicSchema>;

export const projectListResponseSchema = z.object({
  items: z.array(projectPublicSchema),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});
export type ProjectListResponse = z.infer<typeof projectListResponseSchema>;

/* ---------- Commission preview ---------- */

/**
 * Per-month preview row returned by GET /projects/:id/commission-preview.
 * Lets the frontend show the same "live commission preview" panel that
 * PNG 08 has, but reading from the saved snapshot rather than computing
 * from a draft.
 */
export const projectCommissionPreviewSchema = z.object({
  /** Total pool USD for the project under its current contract. */
  commissionPoolUsd: z.number(),
  poolMode: z.enum(['percentage', 'fixed']),
  poolValueDisplay: z.string(), // '24%' or '$2,400.00'
  ruleVersion: z.string(),
  ruleStatus: z.string(),
  splits: z.array(
    z.object({
      employeeId: z.string(),
      employeeName: z.string(),
      roleName: z.string(),
      percentage: z.number(),
      shareUsd: z.number(),
    }),
  ),
  /** True when sum of split percentages == 100 (sanity check). */
  splitsSumToHundred: z.boolean(),
});
export type ProjectCommissionPreview = z.infer<typeof projectCommissionPreviewSchema>;
