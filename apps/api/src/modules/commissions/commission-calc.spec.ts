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
  coerceDesignationAmounts,
  coerceDurationMatrix,
  coerceRoleAmounts,
  coerceRevenueBrackets,
  computeTotalPool,
  computeFinal,
  monthLabel,
  resolveTieredPoolPct,
  roundUsd,
  sumCalculated,
  type CalcProject,
} from './commission-calc';

const TIERS = [
  { minUsd: 0, maxUsd: 10_000, poolPct: 5 },
  { minUsd: 10_000, maxUsd: 50_000, poolPct: 8 },
  { minUsd: 50_000, maxUsd: null, poolPct: 12 },
];

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

describe('per-person guardrails (cap / floor)', () => {
  // Single-shot $10k project, 24% pool = $2,400 for the sole winner.
  it('caps a share that exceeds perPersonCapUsd', () => {
    const items = calcProjectLineItems(
      makeProject({
        rule: {
          poolMode: 'percentage',
          poolValue: 24,
          minProjectRevenueUsd: 0,
          perPersonCapUsd: 2_000,
        },
      }),
      { monthKey: '2026-05' },
    );
    expect(items[0].calculatedAmountUsd).toBe(2_000);
  });

  it('floors an eligible share below perPersonFloorUsd', () => {
    // Two winners split 50/50 → $1,200 each; floor lifts each to $1,500.
    const items = calcProjectLineItems(
      makeProject({
        rule: {
          poolMode: 'percentage',
          poolValue: 24,
          minProjectRevenueUsd: 0,
          perPersonFloorUsd: 1_500,
        },
        assignments: [
          { employeeId: 'e1', roleName: 'winner', percentage: 50 },
          { employeeId: 'e2', roleName: 'winner', percentage: 50 },
        ],
      }),
      { monthKey: '2026-05' },
    );
    expect(items.map((i) => i.calculatedAmountUsd)).toEqual([1_500, 1_500]);
  });

  it('leaves shares between floor and cap untouched', () => {
    const items = calcProjectLineItems(
      makeProject({
        rule: {
          poolMode: 'percentage',
          poolValue: 24,
          minProjectRevenueUsd: 0,
          perPersonFloorUsd: 1_000,
          perPersonCapUsd: 3_000,
        },
      }),
      { monthKey: '2026-05' },
    );
    expect(items[0].calculatedAmountUsd).toBe(2_400);
  });

  it('does not floor a zero share (unassigned / no participation)', () => {
    // percentage 0 → $0 share; the floor must not hand them the minimum.
    const items = calcProjectLineItems(
      makeProject({
        rule: {
          poolMode: 'percentage',
          poolValue: 24,
          minProjectRevenueUsd: 0,
          perPersonFloorUsd: 500,
        },
        assignments: [
          { employeeId: 'e1', roleName: 'winner', percentage: 100 },
          { employeeId: 'e2', roleName: 'eligible_team', percentage: 0 },
        ],
      }),
      { monthKey: '2026-05' },
    );
    const zero = items.find((i) => i.employeeId === 'e2');
    expect(zero?.calculatedAmountUsd).toBe(0);
  });

  it('applies both bounds: floor then cap, with cap winning at the ceiling', () => {
    // $2,400 share, cap 2,000 → 2,000 (floor 500 is below, no effect).
    const items = calcProjectLineItems(
      makeProject({
        rule: {
          poolMode: 'percentage',
          poolValue: 24,
          minProjectRevenueUsd: 0,
          perPersonFloorUsd: 500,
          perPersonCapUsd: 2_000,
        },
      }),
      { monthKey: '2026-05' },
    );
    expect(items[0].calculatedAmountUsd).toBe(2_000);
  });

  it('null bounds behave as no guardrails', () => {
    const items = calcProjectLineItems(
      makeProject({
        rule: {
          poolMode: 'percentage',
          poolValue: 24,
          minProjectRevenueUsd: 0,
          perPersonFloorUsd: null,
          perPersonCapUsd: null,
        },
      }),
      { monthKey: '2026-05' },
    );
    expect(items[0].calculatedAmountUsd).toBe(2_400);
  });
});

describe('tiered pool (revenue brackets)', () => {
  it('resolveTieredPoolPct picks the bracket by minUsd <= revenue < maxUsd', () => {
    expect(resolveTieredPoolPct(TIERS, 8_000)).toBe(5);
    expect(resolveTieredPoolPct(TIERS, 25_000)).toBe(8);
    expect(resolveTieredPoolPct(TIERS, 60_000)).toBe(12);
  });

  it('boundary revenue falls into the upper bracket (max is exclusive)', () => {
    // Exactly 10,000 is NOT in [0,10000); it belongs to [10000,50000).
    expect(resolveTieredPoolPct(TIERS, 10_000)).toBe(8);
    expect(resolveTieredPoolPct(TIERS, 50_000)).toBe(12);
  });

  it('open-ended top bracket covers arbitrarily large revenue', () => {
    expect(resolveTieredPoolPct(TIERS, 5_000_000)).toBe(12);
  });

  it('returns null when no bracket matches (revenue below the lowest min)', () => {
    const above = [{ minUsd: 5_000, maxUsd: null, poolPct: 10 }];
    expect(resolveTieredPoolPct(above, 1_000)).toBeNull();
  });

  it('computeTotalPool applies the matched bracket percentage to revenue', () => {
    expect(
      computeTotalPool(
        { poolMode: 'tiered', poolValue: 0, minProjectRevenueUsd: 0, revenueBrackets: TIERS },
        25_000,
      ),
    ).toBe(2_000); // 25,000 × 8%
  });

  it('computeTotalPool yields 0 when no bracket matches', () => {
    expect(
      computeTotalPool(
        {
          poolMode: 'tiered',
          poolValue: 0,
          minProjectRevenueUsd: 0,
          revenueBrackets: [{ minUsd: 5_000, maxUsd: null, poolPct: 10 }],
        },
        1_000,
      ),
    ).toBe(0);
  });

  it('calcProjectLineItems uses the tiered pool end-to-end', () => {
    // $25k single-shot project, tier = 8% → $2,000 pool, sole winner gets it all.
    const items = calcProjectLineItems(
      makeProject({
        revenueUsd: 25_000,
        rule: {
          poolMode: 'tiered',
          poolValue: 0,
          minProjectRevenueUsd: 0,
          revenueBrackets: TIERS,
        },
      }),
      { monthKey: '2026-05' },
    );
    expect(items[0].calculatedAmountUsd).toBe(2_000);
  });

  it('coerceRevenueBrackets parses valid JSON and rejects malformed data', () => {
    expect(coerceRevenueBrackets(TIERS)).toEqual(TIERS);
    expect(coerceRevenueBrackets(null)).toBeNull();
    expect(coerceRevenueBrackets('nope')).toBeNull();
    expect(coerceRevenueBrackets([{ minUsd: 'x', maxUsd: 1, poolPct: 5 }])).toBeNull();
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

/* ---------- Upwork: net_revenue_share ---------- */

describe('net_revenue_share (Upwork)', () => {
  it('winner gets their % of (revenue − developer salary); company remainder is not a line', () => {
    // revenue 10,000 − dev salary 3,500 USD = 6,500 net; winner 20% = 1,300.
    const project = makeProject({
      revenueUsd: 10_000,
      developerSalaryUsd: 3_500,
      startDate: new Date('2026-05-01T00:00:00Z'),
      expectedCompletionDate: null,
      rule: { poolMode: 'net_revenue_share', poolValue: 0, minProjectRevenueUsd: 0 },
      assignments: [{ employeeId: 'bd1', roleName: 'winner', percentage: 20 }],
    });
    const items = calcProjectLineItems(project, { monthKey: '2026-05' });
    expect(items).toHaveLength(1); // only the winner; 80% company share is not paid out
    expect(items[0].calculatedAmountUsd).toBe(1_300);
  });

  it('net pool floors at zero when the developer salary exceeds revenue', () => {
    expect(
      computeTotalPool(
        { poolMode: 'net_revenue_share', poolValue: 0, minProjectRevenueUsd: 0 },
        4_000,
        5_000,
      ),
    ).toBe(0);
  });

  it('prorates the net share across a multi-month project', () => {
    // net 6,000; May overlap 31/61 days.
    const project = makeProject({
      revenueUsd: 10_000,
      developerSalaryUsd: 4_000,
      startDate: new Date('2026-05-01T00:00:00Z'),
      expectedCompletionDate: new Date('2026-06-30T00:00:00Z'),
      rule: { poolMode: 'net_revenue_share', poolValue: 0, minProjectRevenueUsd: 0 },
      assignments: [{ employeeId: 'bd1', roleName: 'winner', percentage: 20 }],
    });
    const items = calcProjectLineItems(project, { monthKey: '2026-05' });
    // 6000 * (31/61) * 0.20 = 609.836… → 609.84
    expect(items[0].calculatedAmountUsd).toBe(609.84);
  });
});

/* ---------- B2B: designation_fixed ---------- */

describe('designation_fixed (B2B)', () => {
  const RULE = {
    poolMode: 'designation_fixed' as const,
    poolValue: 0,
    minProjectRevenueUsd: 0,
    designationAmounts: [
      { designation: 'ATL', amountUsd: 500 },
      { designation: 'SSE', amountUsd: 300 },
    ],
  };

  it('pays each assignee the fixed amount for their designation; unknown designation → 0', () => {
    const project = makeProject({
      revenueUsd: 0,
      startDate: new Date('2026-05-01T00:00:00Z'),
      expectedCompletionDate: null,
      rule: RULE,
      assignments: [
        { employeeId: 'a', roleName: 'developer', percentage: 0, designation: 'ATL' },
        { employeeId: 'b', roleName: 'developer', percentage: 0, designation: 'SSE' },
        { employeeId: 'c', roleName: 'developer', percentage: 0, designation: 'SE' },
      ],
    });
    const items = calcProjectLineItems(project, { monthKey: '2026-05' });
    const byId = Object.fromEntries(items.map((i) => [i.employeeId, i.calculatedAmountUsd]));
    expect(byId).toEqual({ a: 500, b: 300, c: 0 });
  });

  it('prorates designation amounts across a multi-month project', () => {
    const project = makeProject({
      revenueUsd: 0,
      startDate: new Date('2026-05-01T00:00:00Z'),
      expectedCompletionDate: new Date('2026-06-30T00:00:00Z'),
      rule: RULE,
      assignments: [{ employeeId: 'a', roleName: 'developer', percentage: 0, designation: 'ATL' }],
    });
    const items = calcProjectLineItems(project, { monthKey: '2026-05' });
    // 500 * (31/61) = 254.098… → 254.1
    expect(items[0].calculatedAmountUsd).toBe(254.1);
  });

  it('does not build a shared pool for designation_fixed', () => {
    expect(computeTotalPool(RULE, 100_000)).toBe(0);
  });
});

describe('coerceDesignationAmounts', () => {
  it('parses a well-formed array', () => {
    expect(coerceDesignationAmounts([{ designation: 'ATL', amountUsd: 500 }])).toEqual([
      { designation: 'ATL', amountUsd: 500 },
    ]);
  });
  it('returns null on malformed input', () => {
    expect(coerceDesignationAmounts('nope')).toBeNull();
    expect(coerceDesignationAmounts([{ designation: 'ATL' }])).toBeNull();
    expect(coerceDesignationAmounts([{ amountUsd: 5 }])).toBeNull();
  });
});

/* ---------- Engineering External: role_fixed ---------- */

describe('role_fixed (Engineering External)', () => {
  const RULE = {
    poolMode: 'role_fixed' as const,
    poolValue: 0,
    minProjectRevenueUsd: 0,
    roleAmounts: [
      { role: 'winner', amountUsd: 500 },
      { role: 'communicator', amountUsd: 300 },
      { role: 'team_lead', amountUsd: 100 },
    ],
  };

  it('pays each assignee the fixed amount for their role; unknown role → 0', () => {
    const project = makeProject({
      revenueUsd: 0,
      startDate: new Date('2026-05-01T00:00:00Z'),
      expectedCompletionDate: null,
      rule: RULE,
      assignments: [
        { employeeId: 'a', roleName: 'winner', percentage: 0 },
        { employeeId: 'b', roleName: 'communicator', percentage: 0 },
        { employeeId: 'c', roleName: 'team_lead', percentage: 0 },
        { employeeId: 'd', roleName: 'eligible_team', percentage: 0 },
      ],
    });
    const items = calcProjectLineItems(project, { monthKey: '2026-05' });
    const byId = Object.fromEntries(items.map((i) => [i.employeeId, i.calculatedAmountUsd]));
    expect(byId).toEqual({ a: 500, b: 300, c: 100, d: 0 });
  });

  it('prorates role amounts across a multi-month project', () => {
    const project = makeProject({
      revenueUsd: 0,
      startDate: new Date('2026-05-01T00:00:00Z'),
      expectedCompletionDate: new Date('2026-06-30T00:00:00Z'),
      rule: RULE,
      assignments: [{ employeeId: 'a', roleName: 'winner', percentage: 0 }],
    });
    const items = calcProjectLineItems(project, { monthKey: '2026-05' });
    // 500 * (31/61) = 254.098… → 254.1
    expect(items[0].calculatedAmountUsd).toBe(254.1);
  });

  it('does not build a shared pool for role_fixed', () => {
    expect(computeTotalPool(RULE, 100_000)).toBe(0);
  });
});

describe('coerceRoleAmounts', () => {
  it('parses a well-formed array', () => {
    expect(coerceRoleAmounts([{ role: 'winner', amountUsd: 500 }])).toEqual([
      { role: 'winner', amountUsd: 500 },
    ]);
  });
  it('returns null on malformed input', () => {
    expect(coerceRoleAmounts('nope')).toBeNull();
    expect(coerceRoleAmounts([{ role: 'winner' }])).toBeNull();
    expect(coerceRoleAmounts([{ amountUsd: 5 }])).toBeNull();
  });
});

/* ---------- BD External: duration_matrix ---------- */

describe('duration_matrix (BD External)', () => {
  const RULE = {
    poolMode: 'duration_matrix' as const,
    poolValue: 0,
    minProjectRevenueUsd: 0,
    durationMatrix: [
      { subType: 'full_time', role: 'associate', amountUsd: 50, durationMonths: 6 },
      { subType: 'full_time', role: 'manager', amountUsd: 30, durationMonths: 6 },
      { subType: 'part_time', role: 'associate', amountUsd: 50, durationMonths: 2 },
    ],
  };

  function bd(monthKey: string) {
    const project = makeProject({
      revenueUsd: 0,
      subType: 'full_time',
      startDate: new Date('2026-01-01T00:00:00Z'),
      expectedCompletionDate: null,
      rule: RULE,
      assignments: [
        { employeeId: 'assoc', roleName: 'associate', percentage: 0 },
        { employeeId: 'mgr', roleName: 'manager', percentage: 0 },
        { employeeId: 'other', roleName: 'winner', percentage: 0 }, // not in matrix
      ],
    });
    const items = calcProjectLineItems(project, { monthKey });
    return Object.fromEntries(items.map((i) => [i.employeeId, i.calculatedAmountUsd]));
  }

  it('pays the matrix amount for months within the duration', () => {
    expect(bd('2026-01')).toEqual({ assoc: 50, mgr: 30, other: 0 }); // month 1
    expect(bd('2026-06')).toEqual({ assoc: 50, mgr: 30, other: 0 }); // month 6
  });

  it('auto-stops after the duration expires', () => {
    expect(bd('2026-07')).toEqual({ assoc: 0, mgr: 0, other: 0 }); // month 7 > 6
  });

  it('pays nothing before the project start month', () => {
    const project = makeProject({
      revenueUsd: 0,
      subType: 'full_time',
      startDate: new Date('2026-03-01T00:00:00Z'),
      expectedCompletionDate: null,
      rule: RULE,
      assignments: [{ employeeId: 'assoc', roleName: 'associate', percentage: 0 }],
    });
    expect(calcProjectLineItems(project, { monthKey: '2026-02' })).toEqual([]);
  });

  it('shorter duration for a different sub-type', () => {
    const project = makeProject({
      revenueUsd: 0,
      subType: 'part_time',
      startDate: new Date('2026-01-01T00:00:00Z'),
      expectedCompletionDate: null,
      rule: RULE,
      assignments: [{ employeeId: 'assoc', roleName: 'associate', percentage: 0 }],
    });
    expect(calcProjectLineItems(project, { monthKey: '2026-02' })[0].calculatedAmountUsd).toBe(50); // month 2 <= 2
    expect(calcProjectLineItems(project, { monthKey: '2026-03' })[0].calculatedAmountUsd).toBe(0); // month 3 > 2
  });

  it('does not build a shared pool', () => {
    expect(computeTotalPool(RULE, 100_000)).toBe(0);
  });
});

describe('coerceDurationMatrix', () => {
  it('parses a well-formed matrix', () => {
    expect(
      coerceDurationMatrix([
        { subType: 'full_time', role: 'associate', amountUsd: 50, durationMonths: 6 },
      ]),
    ).toEqual([{ subType: 'full_time', role: 'associate', amountUsd: 50, durationMonths: 6 }]);
  });
  it('returns null on malformed input', () => {
    expect(coerceDurationMatrix('nope')).toBeNull();
    expect(coerceDurationMatrix([{ subType: 'x', role: 'y', amountUsd: 5 }])).toBeNull();
    expect(coerceDurationMatrix([{ role: 'y', amountUsd: 5, durationMonths: 6 }])).toBeNull();
  });
});
