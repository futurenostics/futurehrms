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

export interface CalcRevenueBracket {
  minUsd: number;
  /** null = open-ended top bracket. */
  maxUsd: number | null;
  poolPct: number;
}

/** One designation → fixed monthly amount row for `poolMode='designation_fixed'`. */
export interface CalcDesignationAmount {
  /** Designation name (matched against the assignee's designation). */
  designation: string;
  amountUsd: number;
}

/**
 * Pool modes:
 *   - percentage        : pool = revenue × poolValue%          (External / default)
 *   - fixed             : pool = poolValue                      (External flat)
 *   - tiered            : pool = revenue × bracket poolPct%     (revenue ladder)
 *   - net_revenue_share : pool = max(0, revenue − dev salary)   (Upwork; split by
 *                          assignment %, e.g. 20% winner / 80% company-not-paid)
 *   - designation_fixed : NO shared pool — each assignee earns a fixed monthly
 *                          amount looked up by their designation (B2B)
 */
export type CalcPoolMode =
  | 'percentage'
  | 'fixed'
  | 'tiered'
  | 'net_revenue_share'
  | 'designation_fixed';

export interface CalcRuleSnapshot {
  poolMode: CalcPoolMode;
  poolValue: number;
  minProjectRevenueUsd: number;
  /**
   * Per-person payout guardrails. null = no bound.
   *   - floor raises an eligible (non-zero) share up to the minimum;
   *   - cap clamps a share down to the ceiling.
   * Applied to each assignment's calculated share below.
   */
  perPersonFloorUsd?: number | null;
  perPersonCapUsd?: number | null;
  /**
   * Bracket ladder for `poolMode='tiered'`. The engine picks the
   * bracket where `minUsd <= revenue < maxUsd` (open-ended tail when
   * maxUsd is null) and uses its `poolPct` as the pool percentage.
   */
  revenueBrackets?: CalcRevenueBracket[] | null;
  /**
   * Designation → fixed monthly amount ladder for
   * `poolMode='designation_fixed'` (B2B). Each assignee earns the
   * amount matching their designation, prorated by month overlap.
   */
  designationAmounts?: CalcDesignationAmount[] | null;
}

export interface CalcAssignment {
  employeeId: string;
  roleName: string;
  percentage: number;
  /** Assignee's designation — only read by `poolMode='designation_fixed'`. */
  designation?: string | null;
}

export interface CalcProject {
  id: string;
  revenueUsd: number;
  status: string;
  startDate: Date;
  expectedCompletionDate: Date | null;
  rule: CalcRuleSnapshot;
  assignments: CalcAssignment[];
  /**
   * Developer salary for this project, already converted to USD at the
   * run's pinned FX rate. Only read by `poolMode='net_revenue_share'`
   * (Upwork), where it's subtracted from revenue to form the net pool.
   */
  developerSalaryUsd?: number | null;
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

  const proration = overlapDays / totalActiveDays;

  // Designation-fixed (B2B) has no shared pool: each assignee earns the
  // fixed monthly amount for their designation, prorated by overlap.
  if (project.rule.poolMode === 'designation_fixed') {
    const byDesignation = new Map(
      (project.rule.designationAmounts ?? []).map((d) => [d.designation, d.amountUsd]),
    );
    return project.assignments.map((a) => {
      const perMonth = a.designation ? (byDesignation.get(a.designation) ?? 0) : 0;
      return {
        projectId: project.id,
        employeeId: a.employeeId,
        roleName: a.roleName,
        snapshotPercentage: a.percentage,
        baseRevenueUsd: project.revenueUsd,
        monthFractionNumerator: overlapDays,
        monthFractionDenominator: daysInMonth,
        calculatedAmountUsd: applyGuardrails(roundUsd(perMonth * proration), project.rule),
      };
    });
  }

  // Pool modes (percentage / fixed / tiered / net_revenue_share): a
  // whole-project pool sliced by month then split by assignment %.
  const totalPool = computeTotalPool(
    project.rule,
    project.revenueUsd,
    project.developerSalaryUsd ?? 0,
  );
  const monthShare = totalPool * proration;

  return project.assignments.map((a) => {
    const rawShare = (monthShare * a.percentage) / 100;
    return {
      projectId: project.id,
      employeeId: a.employeeId,
      roleName: a.roleName,
      snapshotPercentage: a.percentage,
      baseRevenueUsd: project.revenueUsd,
      monthFractionNumerator: overlapDays,
      monthFractionDenominator: daysInMonth,
      calculatedAmountUsd: applyGuardrails(roundUsd(rawShare), project.rule),
    };
  });
}

/**
 * Clamp a per-person calculated share to the rule's payout guardrails.
 * The floor only lifts an eligible (already non-zero) share so that
 * people who earned nothing this month aren't handed the minimum; the
 * cap always clamps down. Cap is assumed >= floor (validated at the
 * API layer). Both are optional — null/undefined means no bound.
 */
function applyGuardrails(amount: number, rule: CalcRuleSnapshot): number {
  let out = amount;
  if (rule.perPersonFloorUsd != null && out > 0 && out < rule.perPersonFloorUsd) {
    out = rule.perPersonFloorUsd;
  }
  if (rule.perPersonCapUsd != null && out > rule.perPersonCapUsd) {
    out = rule.perPersonCapUsd;
  }
  return roundUsd(out);
}

/**
 * Find the bracket a revenue falls into using the `minUsd <= revenue
 * < maxUsd` convention (open-ended tail when maxUsd is null). Returns
 * the bracket's `poolPct`, or null when no bracket matches (e.g.
 * revenue below the lowest bracket's min).
 */
export function resolveTieredPoolPct(
  brackets: CalcRevenueBracket[] | null | undefined,
  revenueUsd: number,
): number | null {
  if (!brackets) return null;
  for (const b of brackets) {
    const underMax = b.maxUsd === null || revenueUsd < b.maxUsd;
    if (revenueUsd >= b.minUsd && underMax) return b.poolPct;
  }
  return null;
}

/**
 * Coerce an untyped stored value (Prisma JSON, API payload) into the
 * calc engine's bracket array. Returns null when the value isn't a
 * well-formed bracket list, so callers fall back to a zero pool
 * safely rather than throwing.
 */
export function coerceRevenueBrackets(value: unknown): CalcRevenueBracket[] | null {
  if (!Array.isArray(value)) return null;
  const brackets: CalcRevenueBracket[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const row = entry as Record<string, unknown>;
    const minUsd = Number(row.minUsd);
    const poolPct = Number(row.poolPct);
    const maxUsd = row.maxUsd === null || row.maxUsd === undefined ? null : Number(row.maxUsd);
    if (!Number.isFinite(minUsd) || !Number.isFinite(poolPct)) return null;
    if (maxUsd !== null && !Number.isFinite(maxUsd)) return null;
    brackets.push({ minUsd, maxUsd, poolPct });
  }
  return brackets;
}

/**
 * Coerce a stored value (Prisma JSON / API payload) into the calc
 * engine's designation-amount array. Returns null when malformed so
 * callers fall back to zero payouts rather than throwing.
 */
export function coerceDesignationAmounts(value: unknown): CalcDesignationAmount[] | null {
  if (!Array.isArray(value)) return null;
  const out: CalcDesignationAmount[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const row = entry as Record<string, unknown>;
    const designation = typeof row.designation === 'string' ? row.designation : null;
    const amountUsd = Number(row.amountUsd);
    if (!designation || !Number.isFinite(amountUsd)) return null;
    out.push({ designation, amountUsd });
  }
  return out;
}

/**
 * The whole-project commission pool for a rule + revenue. `percentage`
 * and `fixed` are the original modes; `tiered` selects a bracket's
 * `poolPct` by revenue (0 when no bracket matches); `net_revenue_share`
 * subtracts the developer salary from revenue.
 */
export function computeTotalPool(
  rule: CalcRuleSnapshot,
  revenueUsd: number,
  developerSalaryUsd = 0,
): number {
  if (rule.poolMode === 'fixed') return rule.poolValue;
  if (rule.poolMode === 'tiered') {
    const pct = resolveTieredPoolPct(rule.revenueBrackets, revenueUsd);
    return pct === null ? 0 : (revenueUsd * pct) / 100;
  }
  // Upwork: distributable pool is revenue net of the developer's salary
  // (already in USD). Winner takes their assignment %; the remainder is
  // the company's and simply isn't paid out as a line item.
  if (rule.poolMode === 'net_revenue_share') {
    return Math.max(0, revenueUsd - developerSalaryUsd);
  }
  // designation_fixed has no shared pool (handled in calcProjectLineItems).
  if (rule.poolMode === 'designation_fixed') return 0;
  return (revenueUsd * rule.poolValue) / 100;
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
