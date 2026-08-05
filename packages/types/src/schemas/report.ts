/**
 * Reports & Exports (Module 5) — shared schemas.
 *
 * A report is a named, filterable, downloadable summary. The backend
 * owns a registry of report *definitions*; the catalog endpoint returns
 * the subset the caller may run, and a download endpoint renders one to
 * CSV / XLSX / PDF.
 *
 * Filters (§7.2) are a single flat bag; each report declares which keys
 * it actually consumes (`supportedFilters`) so the UI can render only
 * the relevant controls.
 */
import { z } from 'zod';

/* ---------- Formats ---------- */

export const reportFormatSchema = z.enum(['csv', 'xlsx', 'pdf']);
export type ReportFormat = z.infer<typeof reportFormatSchema>;

/* ---------- Filters (§7.2) ---------- */

/** The filter keys a report can opt into. */
export const reportFilterKeySchema = z.enum([
  'monthKey', // 'YYYY-MM' — single-month reports
  'year', // annual reports
  'dateFrom', // ISO date (inclusive)
  'dateTo', // ISO date (inclusive)
  'employeeIds', // multi-select employees
  'department', // department slug, or 'all'
  'category', // project category slug (external | upwork | b2b), or 'all'
  'projectStatus', // project status, or 'all'
]);
export type ReportFilterKey = z.infer<typeof reportFilterKeySchema>;

/**
 * The full filter bag. All keys optional; a report reads only the keys
 * it declares in `supportedFilters` and ignores the rest.
 */
export const reportFiltersSchema = z.object({
  monthKey: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'monthKey must be YYYY-MM')
    .optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  employeeIds: z.array(z.string()).optional(),
  department: z.string().optional(),
  category: z.string().optional(),
  projectStatus: z.string().optional(),
});
export type ReportFilters = z.infer<typeof reportFiltersSchema>;

/** Query-string variant used by the download endpoint (comma-joined ids). */
export const reportDownloadQuerySchema = z.object({
  format: reportFormatSchema.default('csv'),
  monthKey: reportFiltersSchema.shape.monthKey,
  year: reportFiltersSchema.shape.year,
  dateFrom: reportFiltersSchema.shape.dateFrom,
  dateTo: reportFiltersSchema.shape.dateTo,
  /** Comma-joined employee id list. */
  employeeIds: z.string().optional(),
  department: reportFiltersSchema.shape.department,
  category: reportFiltersSchema.shape.category,
  projectStatus: reportFiltersSchema.shape.projectStatus,
});
export type ReportDownloadQuery = z.infer<typeof reportDownloadQuerySchema>;

/* ---------- Catalog ---------- */

export const reportGroupSchema = z.enum(['financial', 'people', 'projects', 'audit']);
export type ReportGroup = z.infer<typeof reportGroupSchema>;

export const reportCatalogItemSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
  group: reportGroupSchema,
  /** Formats this report can render to. */
  formats: z.array(reportFormatSchema).min(1),
  /** Filter keys this report consumes. */
  supportedFilters: z.array(reportFilterKeySchema),
  /** Filter keys that MUST be set for the report to run (e.g. monthKey). */
  requiredFilters: z.array(reportFilterKeySchema),
  /** Permission the caller needs to run it. */
  requiredPermission: z.string(),
});
export type ReportCatalogItem = z.infer<typeof reportCatalogItemSchema>;

export const reportCatalogSchema = z.object({
  items: z.array(reportCatalogItemSchema),
});
export type ReportCatalog = z.infer<typeof reportCatalogSchema>;
