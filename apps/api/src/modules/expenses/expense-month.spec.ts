import { describe, expect, it } from 'vitest';
import { expenseMonthSchema, sanitizeExpenseMonthInput } from '@futurenostics/types';

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
