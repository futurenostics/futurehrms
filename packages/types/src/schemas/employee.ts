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

/* ---------- Enums new to the form-sheet redesign ---------- */

export const employmentRecordSchema = z.enum([
  'on_roll',
  'off_roll',
  'intern_stipend',
  'consultant_invoice',
]);
export type EmploymentRecord = z.infer<typeof employmentRecordSchema>;

export const systemRoleSchema = z.enum([
  'employee',
  'team_lead',
  'manager',
  'hr',
  'finance',
  'super_admin',
]);
export type SystemRole = z.infer<typeof systemRoleSchema>;

const baseInputShape = {
  /**
   * Canonical display name. The sheet UI splits this into First +
   * Last inputs and joins them on save; the API also accepts firstName
   * + lastName directly and falls back to fullName when both arrive.
   */
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(120),
  firstName: z.string().trim().min(1, 'First name is required').max(60).optional(),
  lastName: z.string().trim().min(1, 'Last name is required').max(60).optional(),
  pronouns: z.string().trim().max(40).nullish(),

  /** Work email — locked after onboarding per the design's Contact section. */
  email: z.string().email('Enter a valid email').toLowerCase(),
  /** Optional secondary email used as a login fallback. */
  personalEmail: z
    .string()
    .email('Enter a valid email')
    .toLowerCase()
    .nullish()
    .transform((v) => v ?? null),
  /** Work phone. */
  phone: z
    .string()
    .regex(phonePattern, 'Enter a valid phone')
    .nullish()
    .transform((v) => v ?? null),
  /** Optional personal phone. */
  personalPhone: z
    .string()
    .regex(phonePattern, 'Enter a valid phone')
    .nullish()
    .transform((v) => v ?? null),
  /** Free-form mailing address; rendered as a textarea. */
  address: z.string().max(500).nullish(),

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
  /** Independent of contractType — tracks the legal / payroll record. */
  employmentRecord: employmentRecordSchema.nullish(),
  managerId: z.string().nullish(),

  salaryPkr: z.coerce.number().nonnegative('Salary must be non-negative').nullish(),
  salaryEffectiveDate: z.coerce.date().nullish(),
  salaryProcessedExternally: z.boolean().optional().default(false),
  hasPayoneer: z.boolean().optional().default(false),
  payoneerAccountId: z.string().max(60).nullish(),
  payoneerEmail: z
    .string()
    .email('Enter a valid email')
    .toLowerCase()
    .nullish()
    .transform((v) => v ?? null),
  /** Free-form so HR can pick a fixed name without a junction table. */
  commissionRate: z.string().max(60).nullish(),
  eligibleForCommissions: z.boolean().optional().default(false),

  /** PKR payroll bank — name picked from a fixed list in the UI. */
  bankName: z.string().max(80).nullish(),
  bankBranch: z.string().max(120).nullish(),
  iban: z.string().max(34).nullish(),

  internshipEndDate: z.coerce.date().nullish(),
  probationEndDate: z.coerce.date().nullish(),
  biannualReviewEnabled: z.boolean().optional().default(false),
  annualReviewEnabled: z.boolean().optional().default(true),
  emergencyContact: emergencyContactSchema.nullish(),

  /** In-app permission role. Defaults to 'employee' on create. */
  systemRole: systemRoleSchema.optional().default('employee'),
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

export const employeeSortBySchema = z.enum([
  'fullName',
  'eid',
  'joinDate',
  'createdAt',
  'salaryPkr',
]);
export type EmployeeSortBy = z.infer<typeof employeeSortBySchema>;

export const employeeListQuerySchema = z.object({
  /** Number of rows to skip before returning the next page. */
  offset: z.coerce.number().int().min(0).default(0),
  /** Maximum rows in this page. Capped server-side to protect the DB. */
  limit: z.coerce.number().int().min(1).max(10_000).default(50),
  search: z.string().trim().min(1).optional(),
  departmentId: z.string().optional(),
  statusId: z.string().optional(),
  managerId: z.string().optional(),
  contractType: contractTypeSchema.optional(),
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
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  pronouns: z.string().nullable(),
  email: z.string().email(),
  personalEmail: z.string().email().nullable(),
  phone: z.string().nullable(),
  personalPhone: z.string().nullable(),
  address: z.string().nullable(),
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
  employmentRecord: employmentRecordSchema.nullable(),
  manager: employeeRefSchema.nullable(),
  reportsCount: z.number().int().nonnegative(),
  photoUrl: z.string().nullable(),
  hasPayoneer: z.boolean(),
  internshipEndDate: z.string().nullable(),
  probationEndDate: z.string().nullable(),
  emergencyContact: emergencyContactSchema.nullable(),
  systemRole: systemRoleSchema.nullable(),

  /** Present when viewer has `employees:view_salary`. */
  salaryPkr: z.number().nullable().optional(),
  salaryEffectiveDate: z.string().nullable().optional(),
  salaryProcessedExternally: z.boolean().optional(),
  payoneerAccountId: z.string().nullable().optional(),
  payoneerEmail: z.string().nullable().optional(),
  eligibleForCommissions: z.boolean().optional(),
  commissionRate: z.string().nullable().optional(),

  /** PKR payroll bank info. */
  bankName: z.string().nullable().optional(),
  bankBranch: z.string().nullable().optional(),
  iban: z.string().nullable().optional(),

  /** Offboarding state. terminatedAt non-null = employment ended. */
  noticePeriodStart: z.string().nullable().optional(),
  terminatedAt: z.string().nullable().optional(),
  lastWorkingDay: z.string().nullable().optional(),
  terminationReason: z.string().nullable().optional(),

  lastIncrementDate: z.string().nullable().optional(),
  isArchived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EmployeePublic = z.infer<typeof employeePublicSchema>;

/* ---------- Offboarding ---------- */

export const terminateEmployeeSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500),
  lastWorkingDay: z.coerce.date(),
  notes: z.string().max(2000).optional(),
});
export type TerminateEmployeeInput = z.infer<typeof terminateEmployeeSchema>;

export const moveToNoticeSchema = z.object({
  noticePeriodStart: z.coerce.date().optional(),
  remarks: z.string().max(500).optional(),
});
export type MoveToNoticeInput = z.infer<typeof moveToNoticeSchema>;

export const employeeListResponseSchema = z.object({
  /** Items in this page, in the requested sort order. */
  items: z.array(employeePublicSchema),
  /** Total matching the filters across all pages (ignoring offset/limit). */
  total: z.number().int(),
  /** True when more rows are available past this page — i.e. `offset + items.length < total`. */
  hasMore: z.boolean(),
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

/* ---------- KPI stats for the list page ---------- */

export const employeeStatsSchema = z.object({
  totalHeadcount: z.number().int().nonnegative(),
  /** Percentage delta vs last month's headcount (positive = growth). */
  totalDeltaPct: z.number().nullable(),
  newThisMonth: z.number().int().nonnegative(),
  /** Percentage delta vs last month's new-joins count (positive = growth). */
  newThisMonthDeltaPct: z.number().nullable(),
  onProbation: z.number().int().nonnegative(),
  onProbationClosingThisWeek: z.number().int().nonnegative(),
  /** Average tenure across active employees, in years (1 decimal precision on the wire). */
  avgTenureYears: z.number().nonnegative(),
  /** Percentage of active employees with tenure > 3 years. */
  tenureOver3yPercent: z.number().min(0).max(100),
  /** Distinct departments with at least one active employee — drives the header sub-line. */
  distinctDepartments: z.number().int().nonnegative(),
});
export type EmployeeStats = z.infer<typeof employeeStatsSchema>;

/* ---------- Reference lookups (departments, designations, statuses, managers) ---------- */

export const referencesResponseSchema = z.object({
  departments: z.array(z.object({ id: z.string(), name: z.string(), slug: z.string() })),
  designations: z.array(z.object({ id: z.string(), name: z.string(), departmentId: z.string() })),
  statuses: z.array(z.object({ id: z.string(), name: z.string(), slug: z.string() })),
});
export type ReferencesResponse = z.infer<typeof referencesResponseSchema>;
