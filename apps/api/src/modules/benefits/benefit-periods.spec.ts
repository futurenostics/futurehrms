/**
 * Period keys, remaining math, and medical submit warnings — pure, no I/O.
 */
import { describe, expect, it } from 'vitest';
import {
  expenseMonthSchema,
  formatOpdOverLimitWarning,
  gymPeriodKey,
  medicalPeriodKey,
  medicalSubmitWarnings,
  sanitizeExpenseMonthInput,
} from '@futurenostics/types';

describe('benefit period keys', () => {
  it('maps January–June to H1 and July–December to H2', () => {
    expect(medicalPeriodKey(new Date('2026-01-01T00:00:00.000Z'))).toBe('2026-H1');
    expect(medicalPeriodKey(new Date('2026-06-15T00:00:00.000Z'))).toBe('2026-H1');
    expect(medicalPeriodKey(new Date('2026-07-01T00:00:00.000Z'))).toBe('2026-H2');
    expect(medicalPeriodKey(new Date('2026-12-31T12:00:00.000Z'))).toBe('2026-H2');
  });

  it('maps gym months as YYYY-MM', () => {
    expect(gymPeriodKey(new Date('2026-08-01T00:00:00.000Z'))).toBe('2026-08');
    expect(gymPeriodKey(new Date('2026-01-15T00:00:00.000Z'))).toBe('2026-01');
  });
});

describe('medicalSubmitWarnings', () => {
  it('does not warn when the claim fits the OPD pool', () => {
    expect(
      medicalSubmitWarnings({
        amountPkr: 5000,
        remainingPkr: 25000,
      }),
    ).toEqual([]);
  });

  it('warns on OPD over-limit without blocking', () => {
    expect(
      medicalSubmitWarnings({
        amountPkr: 8000,
        remainingPkr: 5000,
      }),
    ).toEqual([formatOpdOverLimitWarning(3000)]);
  });

  it('does not apply a separate optical cap', () => {
    expect(
      medicalSubmitWarnings({
        amountPkr: 4000,
        remainingPkr: 25000,
      }),
    ).toEqual([]);
  });
});

describe('expense month', () => {
  it('accepts four-digit years including 2024', () => {
    expect(expenseMonthSchema.parse('2024-09')).toBe('2024-09-01');
    expect(expenseMonthSchema.parse('2025-01')).toBe('2025-01-01');
    expect(expenseMonthSchema.parse('2026-12')).toBe('2026-12-01');
  });

  it('rejects five-digit years like 20255', () => {
    expect(() => expenseMonthSchema.parse('20255-09')).toThrow();
  });

  it('trims extra year digits in the month picker', () => {
    expect(sanitizeExpenseMonthInput('20255-09')).toBe('2025-09');
    expect(sanitizeExpenseMonthInput('2024-03')).toBe('2024-03');
  });
});
