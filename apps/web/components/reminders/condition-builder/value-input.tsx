'use client';

import * as React from 'react';
import { Combobox, MultiCombobox, type ComboboxOption } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import type { ConditionLeaf, FieldDef } from './types';

/**
 * Renders the correct value input for the (field × operator) pair.
 *
 *   unary (is_true / is_false / is_empty / is_not_empty)  → no input
 *   in / not_in on enum                                    → MultiCombobox
 *   in / not_in on string/number                           → comma-separated text
 *   between                                                → two number inputs
 *   within_days / older_than_days                          → number input (days)
 *   date before/after                                      → date input
 *   enum equals/not_equals                                 → Combobox (enum values)
 *   boolean equals/not_equals                              → "is_true / is_false" instead
 *   string equals/contains/…                               → text input
 *   number equals/gt/…                                     → number input
 */
export function ValueInput({
  field,
  operator,
  value,
  onChange,
  disabled,
}: {
  field: FieldDef | null;
  operator: string;
  value: ConditionLeaf['value'];
  onChange: (next: ConditionLeaf['value']) => void;
  disabled?: boolean;
}) {
  // Unary operators take no value.
  if (
    operator === 'is_empty' ||
    operator === 'is_not_empty' ||
    operator === 'is_true' ||
    operator === 'is_false' ||
    operator === 'matches_today' ||
    operator === 'matches_today_month_day'
  ) {
    return null;
  }
  if (!field) {
    return <Input disabled placeholder="Pick a field first" />;
  }

  // in / not_in
  if (operator === 'in' || operator === 'not_in') {
    if (field.type === 'enum' && field.enumValues) {
      const options: ComboboxOption[] = field.enumValues.map((v) => ({
        value: v.value,
        label: v.label,
      }));
      const values = Array.isArray(value) ? value.map(String) : [];
      return (
        <MultiCombobox
          options={options}
          values={values}
          placeholder="Pick values…"
          searchPlaceholder="Search"
          emptyLabel="values"
          disabled={disabled}
          onValuesChange={(next) => onChange(next)}
        />
      );
    }
    return (
      <Input
        value={Array.isArray(value) ? value.join(', ') : ''}
        disabled={disabled}
        onChange={(e) => {
          const parts = e.target.value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          if (field.type === 'number') {
            onChange(parts.map(Number).filter((n) => !Number.isNaN(n)));
          } else {
            onChange(parts);
          }
        }}
        placeholder="comma-separated values"
      />
    );
  }

  // between (number range)
  if (operator === 'between') {
    const arr = Array.isArray(value) ? value : [0, 0];
    const lo = Number(arr[0] ?? 0);
    const hi = Number(arr[1] ?? 0);
    return (
      <div className="gap-fn-1_5 flex items-center">
        <Input
          type="number"
          value={Number.isFinite(lo) ? lo : 0}
          disabled={disabled}
          onChange={(e) => onChange([Number(e.target.value), hi])}
        />
        <span className="text-fn-fg-faint text-[11px]">to</span>
        <Input
          type="number"
          value={Number.isFinite(hi) ? hi : 0}
          disabled={disabled}
          onChange={(e) => onChange([lo, Number(e.target.value)])}
        />
      </div>
    );
  }

  // Day-window / day-count operators all take an integer N regardless
  // of the field type. Same control, different evaluator semantics.
  if (
    operator === 'within_days' ||
    operator === 'older_than_days' ||
    operator === 'in_exactly_days' ||
    operator === 'anniversary_in_exactly_days'
  ) {
    return (
      <Input
        type="number"
        min={1}
        value={typeof value === 'number' ? value : 0}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }

  // Date before / after — native date input keeps it dependency-free.
  if (field.type === 'date' && (operator === 'before' || operator === 'after')) {
    const v = typeof value === 'string' ? value.slice(0, 10) : '';
    return (
      <Input
        type="date"
        value={v}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value ? `${e.target.value}T00:00:00Z` : '')}
      />
    );
  }

  // Enum single-select.
  if (field.type === 'enum' && field.enumValues) {
    const options: ComboboxOption[] = field.enumValues.map((v) => ({
      value: v.value,
      label: v.label,
    }));
    return (
      <Combobox
        options={options}
        value={typeof value === 'string' ? value : ''}
        placeholder="Pick a value…"
        searchPlaceholder="Search"
        emptyLabel="values"
        disabled={disabled}
        onValueChange={(v) => onChange(v)}
      />
    );
  }

  // Number scalar.
  if (field.type === 'number') {
    return (
      <Input
        type="number"
        value={typeof value === 'number' ? value : Number(value) || 0}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }

  // String / fallback.
  return (
    <Input
      value={typeof value === 'string' ? value : ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.hint ?? 'Value'}
    />
  );
}
