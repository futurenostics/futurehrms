/**
 * Pure unit tests for the condition evaluator.
 *
 * No DB — each test builds an in-memory context object and a
 * condition tree, then asserts the outcome. The evaluator is the
 * canonical reference for what the operators mean; the FE picker
 * (condition-builder/operators.ts) is expected to mirror this.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConditionGroup } from './reminder-conditions.types';
import { evaluateConditions } from './reminder-conditions.evaluator';

const employee = {
  employee: {
    fullName: 'Bilal Rauf',
    email: 'bilal@futurenostics.local',
    contractType: 'permanent',
    eligibleForCommissions: true,
    salaryPkr: 350_000,
    joinDate: '2024-05-15T00:00:00Z',
    probationEndDate: '2026-05-22T00:00:00Z',
    terminatedAt: null,
    department: { slug: 'engineering', isActive: true },
    designation: { name: 'Sr. Engineer' },
    status: { slug: 'active', isTerminal: false },
    manager: { fullName: 'Asma Ali' },
  },
};

describe('evaluateConditions — base cases', () => {
  it('treats an absent tree as match-all', () => {
    expect(evaluateConditions(undefined, {})).toBe(true);
  });
  it('treats an empty group as match-all', () => {
    const tree: ConditionGroup = { kind: 'group', operator: 'and', conditions: [] };
    expect(evaluateConditions(tree, employee)).toBe(true);
  });
});

describe('string + enum operators', () => {
  const eq = (op: 'equals' | 'not_equals', v: string): ConditionGroup => ({
    kind: 'group',
    operator: 'and',
    conditions: [{ kind: 'leaf', field: 'employee.department.slug', operator: op, value: v }],
  });

  it('equals matches a string literal', () => {
    expect(evaluateConditions(eq('equals', 'engineering'), employee)).toBe(true);
    expect(evaluateConditions(eq('equals', 'finance'), employee)).toBe(false);
  });
  it('not_equals inverts equals', () => {
    expect(evaluateConditions(eq('not_equals', 'finance'), employee)).toBe(true);
  });
  it('contains / starts_with / ends_with', () => {
    const make = (op: 'contains' | 'starts_with' | 'ends_with', v: string): ConditionGroup => ({
      kind: 'group',
      operator: 'and',
      conditions: [{ kind: 'leaf', field: 'employee.fullName', operator: op, value: v }],
    });
    expect(evaluateConditions(make('contains', 'Rauf'), employee)).toBe(true);
    expect(evaluateConditions(make('starts_with', 'Bilal'), employee)).toBe(true);
    expect(evaluateConditions(make('ends_with', 'Rauf'), employee)).toBe(true);
    expect(evaluateConditions(make('contains', 'xyz'), employee)).toBe(false);
  });
  it('in / not_in over a list', () => {
    const tree: ConditionGroup = {
      kind: 'group',
      operator: 'and',
      conditions: [
        {
          kind: 'leaf',
          field: 'employee.contractType',
          operator: 'in',
          value: ['permanent', 'fixed_term'],
        },
      ],
    };
    expect(evaluateConditions(tree, employee)).toBe(true);
    expect(
      evaluateConditions(
        { ...tree, conditions: [{ ...tree.conditions[0]!, operator: 'not_in' } as never] },
        employee,
      ),
    ).toBe(false);
  });
});

describe('number operators', () => {
  const leaf = (
    op: 'gt' | 'gte' | 'lt' | 'lte' | 'between',
    value: number | number[],
  ): ConditionGroup => ({
    kind: 'group',
    operator: 'and',
    conditions: [{ kind: 'leaf', field: 'employee.salaryPkr', operator: op, value } as never],
  });
  it('gt / gte / lt / lte', () => {
    expect(evaluateConditions(leaf('gt', 300_000), employee)).toBe(true);
    expect(evaluateConditions(leaf('gt', 350_000), employee)).toBe(false);
    expect(evaluateConditions(leaf('gte', 350_000), employee)).toBe(true);
    expect(evaluateConditions(leaf('lt', 400_000), employee)).toBe(true);
    expect(evaluateConditions(leaf('lte', 350_000), employee)).toBe(true);
  });
  it('between is inclusive on both ends', () => {
    expect(evaluateConditions(leaf('between', [300_000, 400_000]), employee)).toBe(true);
    expect(evaluateConditions(leaf('between', [400_000, 500_000]), employee)).toBe(false);
  });
});

describe('date operators', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  const leaf = (
    op: 'before' | 'after' | 'within_days' | 'older_than_days',
    value: string | number,
  ): ConditionGroup => ({
    kind: 'group',
    operator: 'and',
    conditions: [{ kind: 'leaf', field: 'employee.probationEndDate', operator: op, value }],
  });

  it('before / after compare ISO strings', () => {
    expect(evaluateConditions(leaf('before', '2027-01-01T00:00:00Z'), employee)).toBe(true);
    expect(evaluateConditions(leaf('after', '2027-01-01T00:00:00Z'), employee)).toBe(false);
  });
  it('within_days matches future dates inside the window', () => {
    // probation ends 2026-05-22; today is 2026-05-15. Δ = 7 days.
    expect(evaluateConditions(leaf('within_days', 14), employee)).toBe(true);
    expect(evaluateConditions(leaf('within_days', 5), employee)).toBe(false);
  });
  it('older_than_days matches past dates beyond the window', () => {
    const joined = (op: 'older_than_days', v: number): ConditionGroup => ({
      kind: 'group',
      operator: 'and',
      conditions: [{ kind: 'leaf', field: 'employee.joinDate', operator: op, value: v }],
    });
    // joinDate 2024-05-15; today 2026-05-15 → 730 days old.
    expect(evaluateConditions(joined('older_than_days', 365), employee)).toBe(true);
    expect(evaluateConditions(joined('older_than_days', 1000), employee)).toBe(false);
  });
});

describe('boolean + empty operators', () => {
  it('is_true / is_false', () => {
    const t: ConditionGroup = {
      kind: 'group',
      operator: 'and',
      conditions: [{ kind: 'leaf', field: 'employee.eligibleForCommissions', operator: 'is_true' }],
    };
    expect(evaluateConditions(t, employee)).toBe(true);
    const inverted: ConditionGroup = {
      kind: 'group',
      operator: 'and',
      conditions: [
        { kind: 'leaf', field: 'employee.eligibleForCommissions', operator: 'is_false' },
      ],
    };
    expect(evaluateConditions(inverted, employee)).toBe(false);
  });
  it('is_empty / is_not_empty', () => {
    const t: ConditionGroup = {
      kind: 'group',
      operator: 'and',
      conditions: [{ kind: 'leaf', field: 'employee.terminatedAt', operator: 'is_empty' }],
    };
    expect(evaluateConditions(t, employee)).toBe(true);
    const inverted: ConditionGroup = {
      kind: 'group',
      operator: 'and',
      conditions: [{ kind: 'leaf', field: 'employee.terminatedAt', operator: 'is_not_empty' }],
    };
    expect(evaluateConditions(inverted, employee)).toBe(false);
  });
});

describe('group composition', () => {
  it('and-group: every condition must match', () => {
    const tree: ConditionGroup = {
      kind: 'group',
      operator: 'and',
      conditions: [
        {
          kind: 'leaf',
          field: 'employee.department.slug',
          operator: 'equals',
          value: 'engineering',
        },
        { kind: 'leaf', field: 'employee.contractType', operator: 'equals', value: 'permanent' },
      ],
    };
    expect(evaluateConditions(tree, employee)).toBe(true);
    const altered = { ...employee, employee: { ...employee.employee, contractType: 'intern' } };
    expect(evaluateConditions(tree, altered)).toBe(false);
  });
  it('or-group: any condition matching is enough', () => {
    const tree: ConditionGroup = {
      kind: 'group',
      operator: 'or',
      conditions: [
        { kind: 'leaf', field: 'employee.department.slug', operator: 'equals', value: 'finance' },
        {
          kind: 'leaf',
          field: 'employee.designation.name',
          operator: 'equals',
          value: 'Sr. Engineer',
        },
      ],
    };
    expect(evaluateConditions(tree, employee)).toBe(true);
  });
  it('nested groups compose correctly', () => {
    // (dept = engineering) AND (designation = Sr. Engineer OR salary >= 500_000)
    const tree: ConditionGroup = {
      kind: 'group',
      operator: 'and',
      conditions: [
        {
          kind: 'leaf',
          field: 'employee.department.slug',
          operator: 'equals',
          value: 'engineering',
        },
        {
          kind: 'group',
          operator: 'or',
          conditions: [
            {
              kind: 'leaf',
              field: 'employee.designation.name',
              operator: 'equals',
              value: 'Sr. Engineer',
            },
            { kind: 'leaf', field: 'employee.salaryPkr', operator: 'gte', value: 500_000 },
          ],
        },
      ],
    };
    expect(evaluateConditions(tree, employee)).toBe(true);
    const altered = {
      ...employee,
      employee: { ...employee.employee, designation: { name: 'Engineer' } },
    };
    expect(evaluateConditions(tree, altered)).toBe(false);
  });
});

describe('missing or malformed paths', () => {
  it('a missing relation evaluates to is_empty=true', () => {
    const tree: ConditionGroup = {
      kind: 'group',
      operator: 'and',
      conditions: [{ kind: 'leaf', field: 'employee.manager.fullName', operator: 'is_empty' }],
    };
    const withoutManager = {
      ...employee,
      employee: { ...employee.employee, manager: null as unknown as { fullName: string } },
    };
    expect(evaluateConditions(tree, withoutManager)).toBe(true);
  });
  it('comparing a missing path with equals returns false (not throws)', () => {
    const tree: ConditionGroup = {
      kind: 'group',
      operator: 'and',
      conditions: [
        { kind: 'leaf', field: 'employee.does.not.exist', operator: 'equals', value: 'x' },
      ],
    };
    expect(evaluateConditions(tree, employee)).toBe(false);
  });
});
