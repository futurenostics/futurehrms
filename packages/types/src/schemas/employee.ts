/**
 * Shared employee schemas — single source of truth for FE form
 * validation, API DTO validation, and TanStack-Query response parsing.
 *
 * `Create` and `Update` describe inputs. `Public` describes what the
 * API returns. Salary fields are conditionally included on the
 * response based on the viewer's permissions (the server omits them
 * for users without `employees:view_salary`).
 */
import { z } from 'zod';

export const contractTypeSchema = z.enum(['FullTime', 'PartTime', 'Contractor', 'Intern']);
export type ContractType = z.infer<typeof contractTypeSchema>;

export const genderSchema = z.enum(['male', 'female', 'other', 'prefer_not_to_say']);
export type Gender = z.infer<typeof genderSchema>;

const cnicPattern = /^\d{5}-\d{7}-\d{1}$/;
const phonePattern = /^\+?[\d\s\-()]{7,20}$/;

const emergencyContactSchema = z
  .object({
    name: z.string().max(120).optional(),
    relationship: z.string().max(60).optional(),
    phone: z.string().regex(phonePattern, 'Enter a valid phone').optional(),
  })
  .partial();
export type EmergencyContact = z.infer<typeof emergencyContactSchema>;

/* ---------- Create + Update inputs ---------- */

const baseInputShape = {
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().email('Enter a valid email').toLowerCase(),
  phone: z
    .string()
    .regex(phonePattern, 'Enter a valid phone')
    .nullish()
    .transform((v) => v ?? null),
  dateOfBirth: z.coerce.date().nullish(),
  gender: genderSchema.nullish(),
  cnic: z
    .string()
    .regex(cnicPattern, 'Use format 12345-1234567-1')
    .nullish()
    .transform((v) => v ?? null),
  joinDate: z.coerce.date(),
  departmentId: z.string().min(1, 'Department is required'),
  designationId: z.string().min(1, 'Designation is required'),
  statusId: z.string().min(1, 'Status is required'),
  contractType: contractTypeSchema,
  managerId: z.string().nullish(),
  salaryPkr: z.coerce.number().nonnegative('Salary must be non-negative').nullish(),
  salaryProcessedExternally: z.boolean().optional().default(false),
  hasPayoneer: z.boolean().optional().default(false),
  payoneerAccountId: z.string().max(60).nullish(),
  internshipEndDate: z.coerce.date().nullish(),
  probationEndDate: z.coerce.date().nullish(),
  biannualReviewEnabled: z.boolean().optional().default(false),
  annualReviewEnabled: z.boolean().optional().default(true),
  emergencyContact: emergencyContactSchema.nullish(),
};

export const employeeCreateSchema = z.object(baseInputShape);
export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;

// All fields optional on update — react-hook-form sends only dirty fields.
export const employeeUpdateSchema = z.object(baseInputShape).partial();
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;

/* ---------- Specialized actions ---------- */

export const changeStatusSchema = z.object({
  statusId: z.string().min(1),
  effectiveDate: z.coerce.date().optional(),
  remarks: z.string().max(500).optional(),
});
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;

export const changeManagerSchema = z.object({
  managerId: z.string().nullable(),
  remarks: z.string().max(500).optional(),
});
export type ChangeManagerInput = z.infer<typeof changeManagerSchema>;

export const changeSalarySchema = z.object({
  newSalaryPkr: z.coerce.number().nonnegative(),
  effectiveDate: z.coerce.date(),
  remarks: z.string().max(500).optional(),
});
export type ChangeSalaryInput = z.infer<typeof changeSalarySchema>;

/* ---------- List query ---------- */

export const employeeSortBySchema = z.enum(['fullName', 'eid', 'joinDate', 'createdAt']);
export type EmployeeSortBy = z.infer<typeof employeeSortBySchema>;

export const employeeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().trim().min(1).optional(),
  departmentId: z.string().optional(),
  statusId: z.string().optional(),
  managerId: z.string().optional(),
  sortBy: employeeSortBySchema.default('fullName'),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
  includeArchived: z.coerce.boolean().default(false),
});
export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;

/* ---------- Public response shape ---------- */

const employeeRefSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  eid: z.string(),
  photoUrl: z.string().nullable(),
});
export type EmployeeRef = z.infer<typeof employeeRefSchema>;

const departmentRefSchema = z.object({ id: z.string(), name: z.string(), slug: z.string() });
const designationRefSchema = z.object({ id: z.string(), name: z.string() });
const statusRefSchema = z.object({ id: z.string(), name: z.string(), slug: z.string() });

export const employeePublicSchema = z.object({
  id: z.string(),
  eid: z.string(),
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  gender: genderSchema.nullable(),
  /** Masked unless viewer has `employees:view_pii` (currently always masked for non-HR). */
  cnicMasked: z.string().nullable(),
  joinDate: z.string(),
  joinedDaysAgo: z.number().int().nonnegative(),
  department: departmentRefSchema,
  designation: designationRefSchema,
  status: statusRefSchema,
  contractType: contractTypeSchema,
  manager: employeeRefSchema.nullable(),
  reportsCount: z.number().int().nonnegative(),
  photoUrl: z.string().nullable(),
  hasPayoneer: z.boolean(),
  internshipEndDate: z.string().nullable(),
  probationEndDate: z.string().nullable(),
  emergencyContact: emergencyContactSchema.nullable(),
  /** Present when viewer has `employees:view_salary`. */
  salaryPkr: z.number().nullable().optional(),
  salaryProcessedExternally: z.boolean().optional(),
  payoneerAccountId: z.string().nullable().optional(),
  lastIncrementDate: z.string().nullable().optional(),
  isArchived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EmployeePublic = z.infer<typeof employeePublicSchema>;

export const employeeListResponseSchema = z.object({
  data: z.array(employeePublicSchema),
  meta: z.object({
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});
export type EmployeeListResponse = z.infer<typeof employeeListResponseSchema>;

/* ---------- Salary history + timeline ---------- */

export const salaryHistoryEntrySchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  oldSalaryPkr: z.number().nullable(),
  newSalaryPkr: z.number(),
  effectiveDate: z.string(),
  remarks: z.string().nullable(),
  changedBy: z.string().nullable(),
  changedByName: z.string().nullable(),
  createdAt: z.string(),
});
export type SalaryHistoryEntry = z.infer<typeof salaryHistoryEntrySchema>;

export const timelineEntrySchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  eventType: z.string(),
  module: z.string(),
  title: z.string(),
  details: z.unknown().nullable(),
  occurredAt: z.string(),
  createdById: z.string().nullable(),
  createdAt: z.string(),
});
export type TimelineEntryPublic = z.infer<typeof timelineEntrySchema>;

/* ---------- Org chart ---------- */

export const orgChartNodeSchema: z.ZodType<{
  id: string;
  fullName: string;
  eid: string;
  designation: string;
  department: string;
  photoUrl: string | null;
  reports: Array<z.infer<typeof orgChartNodeSchema>>;
}> = z.lazy(() =>
  z.object({
    id: z.string(),
    fullName: z.string(),
    eid: z.string(),
    designation: z.string(),
    department: z.string(),
    photoUrl: z.string().nullable(),
    reports: z.array(orgChartNodeSchema),
  }),
);
export type OrgChartNode = z.infer<typeof orgChartNodeSchema>;

/* ---------- CSV import ---------- */

export const csvRowStatusSchema = z.enum(['valid', 'warning', 'error']);
export type CsvRowStatus = z.infer<typeof csvRowStatusSchema>;

export const csvImportRowSchema = z.object({
  rowNumber: z.number().int(),
  status: csvRowStatusSchema,
  raw: z.record(z.string(), z.string()),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});
export type CsvImportRow = z.infer<typeof csvImportRowSchema>;

export const csvImportPreviewSchema = z.object({
  total: z.number().int(),
  valid: z.number().int(),
  warnings: z.number().int(),
  errors: z.number().int(),
  rows: z.array(csvImportRowSchema),
});
export type CsvImportPreview = z.infer<typeof csvImportPreviewSchema>;

export const csvImportCommitResultSchema = z.object({
  total: z.number().int(),
  created: z.number().int(),
  skipped: z.number().int(),
  errors: z.number().int(),
  errorDetails: z.array(z.object({ rowNumber: z.number().int(), errors: z.array(z.string()) })),
});
export type CsvImportCommitResult = z.infer<typeof csvImportCommitResultSchema>;

/* ---------- Reference lookups (departments, designations, statuses, managers) ---------- */

export const referencesResponseSchema = z.object({
  departments: z.array(z.object({ id: z.string(), name: z.string(), slug: z.string() })),
  designations: z.array(z.object({ id: z.string(), name: z.string(), departmentId: z.string() })),
  statuses: z.array(z.object({ id: z.string(), name: z.string(), slug: z.string() })),
});
export type ReferencesResponse = z.infer<typeof referencesResponseSchema>;
