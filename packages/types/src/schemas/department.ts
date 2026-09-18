/**
 * Department schema — Layer 1.1 of the company-configuration settings
 * surface (see docs/layer-1-company-configuration.md).
 *
 * Departments are soft-deleted ("hidden"), never erased — Employee,
 * Designation, Project, ReminderRule, and ShiftAssignment all FK to them.
 */
import { z } from 'zod';

const departmentDescriptionSchema = z
  .string()
  .trim()
  .max(500, 'Keep it under 500 characters')
  .nullable()
  .optional();

export const departmentCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Keep it under 80 characters'),
  description: departmentDescriptionSchema,
  /** Employee id of the department head, or null/omitted for none. */
  headEmployeeId: z.string().nullable().optional(),
});
export type DepartmentCreateInput = z.infer<typeof departmentCreateSchema>;

/**
 * Full-replace contract, not a partial patch: `departments.service.ts`'s
 * `update()` writes `description`/`headEmployeeId` as given on every call
 * (an omitted field is treated as "clear it"), the same way it already
 * treats `name` as always-required. Callers (the editor sheet) always
 * send the field's current value alongside whatever actually changed.
 */
export const departmentUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Keep it under 80 characters'),
  description: departmentDescriptionSchema,
  headEmployeeId: z.string().nullable().optional(),
});
export type DepartmentUpdateInput = z.infer<typeof departmentUpdateSchema>;

export const departmentListQuerySchema = z.object({
  includeHidden: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .optional()
    .transform((v) => v === true || v === 'true' || v === '1'),
});
export type DepartmentListQuery = z.infer<typeof departmentListQuerySchema>;

export const departmentHeadRefSchema = z.object({
  id: z.string(),
  fullName: z.string(),
});
export type DepartmentHeadRef = z.infer<typeof departmentHeadRefSchema>;

export const departmentPublicSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  employeeCount: z.number().int().nonnegative(),
  head: departmentHeadRefSchema.nullable(),
  hiddenAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DepartmentPublic = z.infer<typeof departmentPublicSchema>;

export const departmentListResponseSchema = z.object({
  items: z.array(departmentPublicSchema),
});
export type DepartmentListResponse = z.infer<typeof departmentListResponseSchema>;
