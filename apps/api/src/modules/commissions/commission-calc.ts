/**
 * Pure commission calculation — no Prisma calls, no I/O.
 *
 * The calc engine takes (run-month, list of projects with their
 * snapshot rule + assignments, optional list of carry-forward
 * inputs from a previous run) and returns the line-item rows to
 * insert.
 *
 * Disbursement model (see DECISIONS.md):
 *   total_pool        = poolMode === 'percentage'
 *                         ? P.revenueUsd × rule.poolValue / 100
 *                         : rule.poolValue
 *   total_active_days = (P.expectedCompletionDate ?? P.startDate.endOfMonth)
 *                         − P.startDate (inclusive)
 *   overlap_days      = days in [run-month] ∩ [P.startDate, end]
 *   month_share       = total_pool × overlap_days / total_active_days
 *   employee_share    = month_share × assignment.percentage / 100
 *
 * monthFractionNumerator/Denominator = overlap_days / days_in_month
 * (the PNG-09 "DATE 28/28" display).
 */

export interface CalcRuleSnapshot {
  poolMode: 'percentage' | 'fixed';
  poolValue: number;
  minProjectRevenueUsd: number;
}

export interface CalcAssignment {
  employeeId: string;
  roleName: string;
  percentage: number;
}

export interface CalcProject {
  id: string;
  revenueUsd: number;
  status: string;
  startDate: Date;
  expectedCompletionDate: Date | null;
  rule: CalcRuleSnapshot;
  assignments: CalcAssignment[];
}

export interface CalcLineItem {
  projectId: string;
  employeeId: string;
  roleName: string;
  snapshotPercentage: number;
  baseRevenueUsd: number;
  monthFractionNumerator: number;
  monthFractionDenominator: number;
  calculatedAmountUsd: number;
}

export interface CalcOptions {
  /** 'YYYY-MM' format — the month being calculated. */
  monthKey: string;
}

const COMMISSION_ELIGIBLE_STATUSES = new Set(['active', 'in_billing', 'on_hold']);

function parseMonth(monthKey: string): { firstDay: Date; lastDay: Date; daysInMonth: number } {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) throw new Error(`Invalid monthKey: ${monthKey}`);
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const lastDay = new Date(Date.UTC(year, month, 0)); // day 0 of next month = last day of this month
  return { firstDay, lastDay, daysInMonth: lastDay.getUTCDate() };
}

/** Days between two UTC dates, inclusive of both endpoints. */
function inclusiveDays(from: Date, to: Date): number {
  if (to < from) return 0;
  const ms = to.getTime() - from.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

function laterOf(a: Date, b: Date): Date {
  return a > b ? a : b;
}
function earlierOf(a: Date, b: Date): Date {
  return a < b ? a : b;
}

/**
 * Compute the line items the calc engine would produce for a single
 * project in a single month. Returns an empty array when the project
 * generates nothing (e.g. revenue below threshold, status excluded,
 * no overlap with the month).
 */
export function calcProjectLineItems(project: CalcProject, options: CalcOptions): CalcLineItem[] {
  // Threshold + status filters
  if (project.revenueUsd < project.rule.minProjectRevenueUsd) return [];
  if (!COMMISSION_ELIGIBLE_STATUSES.has(project.status)) return [];

  const { firstDay, lastDay, daysInMonth } = parseMonth(options.monthKey);

  // Project effective window. If expectedCompletionDate is null,
  // treat as single-shot in the project's startDate month: the
  // "end" is the last day of startDate's month.
  const projectStart = project.startDate;
  let projectEnd: Date;
  if (project.expectedCompletionDate) {
    projectEnd = project.expectedCompletionDate;
  } else {
    const y = projectStart.getUTCFullYear();
    const m = projectStart.getUTCMonth();
    projectEnd = new Date(Date.UTC(y, m + 1, 0));
  }

  const overlapStart = laterOf(projectStart, firstDay);
  const overlapEnd = earlierOf(projectEnd, lastDay);
  const overlapDays = inclusiveDays(overlapStart, overlapEnd);
  if (overlapDays <= 0) return [];

  const totalActiveDays = inclusiveDays(projectStart, projectEnd);
  if (totalActiveDays <= 0) return [];

  // Total pool for the whole project.
  const totalPool =
    project.rule.poolMode === 'percentage'
      ? (project.revenueUsd * project.rule.poolValue) / 100
      : project.rule.poolValue;

  // Month's slice of that pool.
  const monthShare = (totalPool * overlapDays) / totalActiveDays;

  return project.assignments.map((a) => {
    const calculatedAmountUsd = (monthShare * a.percentage) / 100;
    return {
      projectId: project.id,
      employeeId: a.employeeId,
      roleName: a.roleName,
      snapshotPercentage: a.percentage,
      baseRevenueUsd: project.revenueUsd,
      monthFractionNumerator: overlapDays,
      monthFractionDenominator: daysInMonth,
      calculatedAmountUsd: roundUsd(calculatedAmountUsd),
    };
  });
}

/**
 * Round to two decimal places using bankers' rounding-adjacent
 * behaviour (half-up). Cents matter; using Number.toFixed is fine
 * here because we're not summing millions of rows.
 */
export function roundUsd(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Sum line items' calculated amounts. Useful for the run-summary KPI. */
export function sumCalculated(items: Array<{ calculatedAmountUsd: number }>): number {
  return roundUsd(items.reduce((s, i) => s + i.calculatedAmountUsd, 0));
}

/**
 * Compute final = calculated + leaveAdj + manualAdj. Helper because
 * the service writes this column on every adjust call.
 */
export function computeFinal(item: {
  calculatedAmountUsd: number;
  leaveAdjustmentUsd: number;
  manualAdjustmentUsd: number;
}): number {
  return roundUsd(item.calculatedAmountUsd + item.leaveAdjustmentUsd + item.manualAdjustmentUsd);
}

/** 'YYYY-MM' → 'May 2026' */
export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  const d = new Date(Date.UTC(year, month - 1, 1));
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
