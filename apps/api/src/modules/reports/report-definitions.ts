/**
 * Report registry (Module 5).
 *
 * The single source of truth for the report catalog: each entry pairs
 * the §7.1 metadata (name, formats, filters, permission) with the
 * builder that produces its `ReportData`. The service reads this to
 * serve the catalog and to dispatch a download.
 *
 * Adding a report = add a builder in `report-builders.ts` + one entry
 * here. No controller or FE change needed — the catalog renders
 * generically.
 */
import type { ReportCatalogItem, ReportFilterKey, ReportFilters } from '@futurenostics/types';
import type { ReportData } from '../../core/reports/report-formats';
import {
  buildAnnualSummary,
  buildBdPerformance,
  buildEmployeeMaster,
  buildMonthlyCommissionSummary,
  buildPayoneerAdvice,
  buildProjectActivity,
  buildRulesAuditLog,
  buildUpworkRevenue,
  type ReportBuilderCtx,
} from './report-builders';

export interface ReportDefinition extends ReportCatalogItem {
  /** File-name stem (without extension). May interpolate filter values. */
  filename: (filters: ReportFilters) => string;
  build: (filters: ReportFilters, ctx: ReportBuilderCtx) => Promise<ReportData>;
}

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    key: 'employee-master',
    name: 'Employee Master Report',
    description: 'Full employee directory with all profile fields.',
    group: 'people',
    formats: ['csv', 'xlsx'],
    supportedFilters: ['department', 'employeeIds'],
    requiredFilters: [],
    requiredPermission: 'reports:view',
    filename: () => 'employee-master',
    build: buildEmployeeMaster,
  },
  {
    key: 'monthly-commission-summary',
    name: 'Monthly Commission Summary',
    description: 'Per-employee commission breakdown for a month.',
    group: 'financial',
    formats: ['xlsx', 'pdf'],
    supportedFilters: ['monthKey', 'department', 'employeeIds'],
    requiredFilters: ['monthKey'],
    requiredPermission: 'reports:view',
    filename: (f) => `commission-summary-${f.monthKey}`,
    build: buildMonthlyCommissionSummary,
  },
  {
    key: 'payroll-advice-payoneer',
    name: 'Payroll Advice (Payoneer)',
    description: 'Formatted file for Payoneer bulk-payment upload.',
    group: 'financial',
    formats: ['csv'],
    supportedFilters: ['monthKey'],
    requiredFilters: ['monthKey'],
    requiredPermission: 'reports:export_payroll',
    filename: (f) => `payoneer-advice-${f.monthKey}`,
    build: buildPayoneerAdvice,
  },
  {
    key: 'project-activity',
    name: 'Project Activity Report',
    description: 'All projects with status, team, revenue, and commission data.',
    group: 'projects',
    formats: ['xlsx', 'csv'],
    supportedFilters: ['category', 'projectStatus', 'department', 'dateFrom', 'dateTo'],
    requiredFilters: [],
    requiredPermission: 'reports:view',
    filename: () => 'project-activity',
    build: buildProjectActivity,
  },
  {
    key: 'upwork-revenue',
    name: 'Upwork Revenue Report',
    description: 'Upwork project revenues with date ranges and calc breakdowns.',
    group: 'projects',
    formats: ['xlsx', 'pdf'],
    supportedFilters: ['projectStatus', 'dateFrom', 'dateTo'],
    requiredFilters: [],
    requiredPermission: 'reports:view',
    filename: () => 'upwork-revenue',
    build: buildUpworkRevenue,
  },
  {
    key: 'bd-performance',
    name: 'BD Performance Report',
    description: 'BD team members: projects brought and commissions earned.',
    group: 'people',
    formats: ['xlsx', 'pdf'],
    supportedFilters: ['monthKey'],
    requiredFilters: [],
    requiredPermission: 'reports:view',
    filename: (f) => `bd-performance${f.monthKey ? `-${f.monthKey}` : ''}`,
    build: buildBdPerformance,
  },
  {
    key: 'commission-rules-audit',
    name: 'Commission Rules Audit Log',
    description: 'History of all rule changes with timestamps and authors.',
    group: 'audit',
    formats: ['pdf', 'csv'],
    supportedFilters: ['dateFrom', 'dateTo'],
    requiredFilters: [],
    requiredPermission: 'reports:view',
    filename: () => 'commission-rules-audit',
    build: buildRulesAuditLog,
  },
  {
    key: 'annual-summary',
    name: 'Annual Summary',
    description: 'Year-over-year commission and revenue comparison.',
    group: 'financial',
    formats: ['xlsx', 'pdf'],
    supportedFilters: ['year'],
    requiredFilters: [],
    requiredPermission: 'reports:view',
    filename: (f) => `annual-summary-${f.year ?? 'current'}`,
    build: buildAnnualSummary,
  },
];

export function findReportDefinition(key: string): ReportDefinition | undefined {
  return REPORT_DEFINITIONS.find((d) => d.key === key);
}

/** Filter keys that, when present, must be non-empty for the report to run. */
export function missingRequiredFilters(
  def: ReportDefinition,
  filters: ReportFilters,
): ReportFilterKey[] {
  return def.requiredFilters.filter((k) => {
    const v = (filters as Record<string, unknown>)[k];
    return v === undefined || v === null || v === '';
  });
}

/** Catalog projection (drops the builder/filename functions). */
export function toCatalogItem(def: ReportDefinition): ReportCatalogItem {
  return {
    key: def.key,
    name: def.name,
    description: def.description,
    group: def.group,
    formats: def.formats,
    supportedFilters: def.supportedFilters,
    requiredFilters: def.requiredFilters,
    requiredPermission: def.requiredPermission,
  };
}
