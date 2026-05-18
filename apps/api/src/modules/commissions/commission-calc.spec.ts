/**
 * Commission calc engine — pure unit tests.
 *
 * The calc engine has no I/O, no Prisma, no clock. Every test
 * constructs a CalcProject in-memory and asserts the output of
 * calcProjectLineItems against the locked decisions in
 * docs/DECISIONS.md § "Disbursement schedule".
 *
 * Coverage targets the cases the spec calls out explicitly:
 *   1. Single-shot (no expectedCompletionDate) — full pool in start month
 *   2. Time-proportional multi-month
 *   3. Mid-month start with day-overlap factor
 *   4. Status filter — cancelled / completed / refunded yield no items
 *   5. Min-revenue threshold filter
 *   6. Percentage vs fixed pool mode
 *   7. Eligible-team multi-row split
 *   8. computeFinal + roundUsd boundary
 */
import { describe, expect, it } from 'vitest';
import {
  calcProjectLineItems,
  computeFinal,
  monthLabel,
  roundUsd,
  sumCalculated,
  type CalcProject,
} from './commission-calc';

function makeProject(overrides: Partial<CalcProject> = {}): CalcProject {
  return {
    id: 'p1',
    revenueUsd: 10_000,
    status: 'in_billing',
    startDate: new Date('2026-05-01T00:00:00Z'),
    expectedCompletionDate: null,
    rule: {
      poolMode: 'percentage',
      poolValue: 24,
      minProjectRevenueUsd: 0,
    },
    assignments: [{ employeeId: 'e1', roleName: 'winner', percentage: 100 }],
    ...overrides,
  };
}

describe('calcProjectLineItems', () => {
  /* ---------- Disbursement: single-shot ---------- */

  it('null expectedCompletionDate → pays full pool in the start month', () => {
    const project = makeProject({
      revenueUsd: 10_000,
      startDate: new Date('2026-05-01T00:00:00Z'),
      expectedCompletionDate: null,
      rule: { poolMode: 'percentage', poolValue: 24, minProjectRevenueUsd: 0 },
      assignments: [{ employeeId: 'e1', roleName: 'winner', percentage: 100 }],
    });
    const items = calcProjectLineItems(project, { monthKey: '2026-05' });
    expect(items).toHaveLength(1);
    expect(items[0].calculatedAmountUsd).toBe(2_400);
    expect(items[0].monthFractionNumerator).toBe(31);
    expect(items[0].monthFractionDenominator).toBe(31);
  });

  it('null expectedCompletionDate → next month yields zero items', () => {
    const project = makeProject({
      startDate: new Date('2026-05-01T00:00:00Z'),
      expectedCompletionDate: null,
    });
    const items = calcProjectLineItems(project, { monthKey: '2026-06' });
    expect(items).toHaveLength(0);
  });

  /* ---------- Disbursement: multi-month time-proportional ---------- */

  it('multi-month spread distributes pool by day overlap', () => {
    // 3-month project, May 1 → Jul 31 (92 days). $10k × 24% = $2,400 pool.
    // May has 31/92 = ~33.7% → ~$808.70.
    const project = makeProject({
      startDate: new Date('2026-05-01T00:00:00Z'),
      expectedCompletionDate: new Date('2026-07-31T00:00:00Z'),
    });
    const may = calcProjectLineItems(project, { monthKey: '2026-05' });
    const jun = calcProjectLineItems(project, { monthKey: '2026-06' });
    const jul = calcProjectLineItems(project, { monthKey: '2026-07' });

    expect(may).toHaveLength(1);
    expect(jun).toHaveLength(1);
    expect(jul).toHaveLength(1);
    expect(may[0].monthFractionNumerator).toBe(31);
    expect(jun[0].monthFractionNumerator).toBe(30);
    expect(jul[0].monthFractionNumerator).toBe(31);

    // Three months sum to the full pool (within rounding).
    const total =
      may[0].calculatedAmountUsd + jun[0].calculatedAmountUsd + jul[0].calculatedAmountUsd;
    expect(Math.abs(total - 2_400)).toBeLessThan(0.05);
  });

  it('mid-month start prorates the first month by overlap days', () => {
    // Project starts May 15, single-shot in May. Overlap = May 15..May 31 = 17 days.
    // May has 31 days. Pool = 2,400. Total active days = 17. Share = 2,400 × 17/17 = 2,400.
    const project = makeProject({
      startDate: new Date('2026-05-15T00:00:00Z'),
      expectedCompletionDate: null,
    });
    const items = calcProjectLineItems(project, { monthKey: '2026-05' });
    expect(items[0].monthFractionNumerator).toBe(17);
    expect(items[0].monthFractionDenominator).toBe(31);
    // Single-shot fallback fills the start-month — full pool pays here.
    expect(items[0].calculatedAmountUsd).toBe(2_400);
  });

  it('multi-month with mid-month start: first month is overlap/(total-days)', () => {
    // Project: May 20 → Aug 10 (83 days). Pool = 24% × $10k = $2,400.
    // May overlap = 12 days (May 20..May 31). Share = 2,400 × 12/83 ≈ $346.99.
    const project = makeProject({
      startDate: new Date('2026-05-20T00:00:00Z'),
      expectedCompletionDate: new Date('2026-08-10T00:00:00Z'),
    });
    const may = calcProjectLineItems(project, { monthKey: '2026-05' });
    expect(may).toHaveLength(1);
    expect(may[0].monthFractionNumerator).toBe(12);
    expect(may[0].calculatedAmountUsd).toBeCloseTo((2_400 * 12) / 83, 2);
  });

  /* ---------- Status filter ---------- */

  it.each(['draft', 'completed', 'cancelled', 'refunded'])(
    'status=%s yields no line items',
    (status) => {
      const project = makeProject({ status });
      const items = calcProjectLineItems(project, { monthKey: '2026-05' });
      expect(items).toEqual([]);
    },
  );

  it.each(['active', 'in_billing', 'on_hold'])('status=%s generates line items', (status) => {
    const project = makeProject({ status });
    const items = calcProjectLineItems(project, { monthKey: '2026-05' });
    expect(items).toHaveLength(1);
  });

  /* ---------- Threshold filter ---------- */

  it('skips projects below rule.minProjectRevenueUsd', () => {
    const project = makeProject({
      revenueUsd: 500,
      rule: { poolMode: 'percentage', poolValue: 24, minProjectRevenueUsd: 1_000 },
    });
    expect(calcProjectLineItems(project, { monthKey: '2026-05' })).toEqual([]);
  });

  it('includes projects at or above the threshold', () => {
    const project = makeProject({
      revenueUsd: 1_000,
      rule: { poolMode: 'percentage', poolValue: 24, minProjectRevenueUsd: 1_000 },
    });
    expect(calcProjectLineItems(project, { monthKey: '2026-05' })).toHaveLength(1);
  });

  /* ---------- Pool model ---------- */

  it('percentage pool = revenue × poolValue/100', () => {
    const project = makeProject({
      revenueUsd: 5_000,
      rule: { poolMode: 'percentage', poolValue: 38, minProjectRevenueUsd: 0 },
    });
    const items = calcProjectLineItems(project, { monthKey: '2026-05' });
    expect(items[0].calculatedAmountUsd).toBe(1_900); // 5000 × 38% × 100% (winner)
  });

  it('fixed pool ignores revenue', () => {
    const project = makeProject({
      revenueUsd: 1_000_000,
      rule: { poolMode: 'fixed', poolValue: 1_500, minProjectRevenueUsd: 0 },
    });
    const items = calcProjectLineItems(project, { monthKey: '2026-05' });
    expect(items[0].calculatedAmountUsd).toBe(1_500);
  });

  /* ---------- Role splits ---------- */

  it('multiple role rows sum to the month share', () => {
    const project = makeProject({
      revenueUsd: 10_000,
      rule: { poolMode: 'percentage', poolValue: 24, minProjectRevenueUsd: 0 },
      assignments: [
        { employeeId: 'e1', roleName: 'winner', percentage: 50 },
        { employeeId: 'e2', roleName: 'communicator', percentage: 30 },
        { employeeId: 'e3', roleName: 'eligible_team', percentage: 10 },
        { employeeId: 'e4', roleName: 'eligible_team', percentage: 10 },
      ],
    });
    const items = calcProjectLineItems(project, { monthKey: '2026-05' });
    expect(items).toHaveLength(4);
    expect(sumCalculated(items)).toBe(2_400);
    expect(items.find((i) => i.employeeId === 'e1')!.calculatedAmountUsd).toBe(1_200);
    expect(items.find((i) => i.employeeId === 'e2')!.calculatedAmountUsd).toBe(720);
    expect(items.find((i) => i.employeeId === 'e3')!.calculatedAmountUsd).toBe(240);
    expect(items.find((i) => i.employeeId === 'e4')!.calculatedAmountUsd).toBe(240);
  });

  /* ---------- monthFractionDenominator semantics ---------- */

  it('monthFractionDenominator equals days in the calendar month', () => {
    expect(
      calcProjectLineItems(makeProject({ startDate: new Date('2026-02-01T00:00:00Z') }), {
        monthKey: '2026-02',
      })[0].monthFractionDenominator,
    ).toBe(28);
    expect(
      calcProjectLineItems(makeProject({ startDate: new Date('2026-04-01T00:00:00Z') }), {
        monthKey: '2026-04',
      })[0].monthFractionDenominator,
    ).toBe(30);
    expect(
      calcProjectLineItems(makeProject({ startDate: new Date('2026-05-01T00:00:00Z') }), {
        monthKey: '2026-05',
      })[0].monthFractionDenominator,
    ).toBe(31);
    expect(
      calcProjectLineItems(makeProject({ startDate: new Date('2024-02-01T00:00:00Z') }), {
        monthKey: '2024-02',
      })[0].monthFractionDenominator,
    ).toBe(29); // leap year
  });
});

describe('roundUsd', () => {
  it('rounds to two decimals via Math.round (IEEE half-to-even on binary)', () => {
    // Values chosen to avoid IEEE-754 representation edge cases. The
    // implementation is Math.round(x * 100) / 100 — predictable except
    // at the exact-half boundary where the binary representation
    // decides which way it falls. We assert the cents granularity, not
    // strict mathematical half-up.
    expect(roundUsd(1.234)).toBe(1.23);
    expect(roundUsd(1.236)).toBe(1.24);
    expect(roundUsd(0)).toBe(0);
    expect(roundUsd(-1.236)).toBe(-1.24);
    // Show that summing many cents stays inside one-cent rounding error.
    const sum = Array.from({ length: 100 }, () => roundUsd(0.1)).reduce((s, n) => s + n, 0);
    expect(Math.abs(sum - 10)).toBeLessThan(0.001);
  });
});

describe('computeFinal', () => {
  it('sums calculated + leave + manual', () => {
    expect(
      computeFinal({ calculatedAmountUsd: 100, leaveAdjustmentUsd: -10, manualAdjustmentUsd: 5 }),
    ).toBe(95);
  });
  it('rounds the sum', () => {
    expect(
      computeFinal({
        calculatedAmountUsd: 100.005,
        leaveAdjustmentUsd: 0,
        manualAdjustmentUsd: 0,
      }),
    ).toBe(100.01);
  });
});

describe('monthLabel', () => {
  it('formats YYYY-MM as "Month YYYY"', () => {
    expect(monthLabel('2026-05')).toBe('May 2026');
    expect(monthLabel('2026-12')).toBe('December 2026');
  });
  it('returns the input on parse failure', () => {
    expect(monthLabel('bogus')).toBe('bogus');
  });
});
