'use client';

import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

/**
 * Multi-select checkbox row list — matches PNG 199 Department section.
 *
 * Each row: [checkbox] [optional color dot] [label] [count, right-aligned]
 *
 * Caller owns the selection state and supplies a flat option list. If
 * `searchable` is true the consumer should use FilterSearchableList
 * instead — this one is for short fixed lists (departments, statuses).
 */

export interface FilterMultiSelectOption {
  id: string;
  label: string;
  /** Optional OKLCH hue for the leading dot (department color etc.). */
  hue?: number;
  /** Right-aligned count (number of rows matching this option). */
  count?: number;
  disabled?: boolean;
}

export interface FilterMultiSelectProps {
  options: FilterMultiSelectOption[];
  values: string[];
  onValuesChange: (next: string[]) => void;
}

export function FilterMultiSelect({ options, values, onValuesChange }: FilterMultiSelectProps) {
  const set = new Set(values);

  function toggle(id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onValuesChange([...next]);
  }

  return (
    <ul className="gap-fn-0_5 flex flex-col">
      {options.map((opt) => {
        const checked = set.has(opt.id);
        return (
          <li key={opt.id}>
            <label
              className={cn(
                'rounded-fn-xs px-fn-2 py-fn-1_5 gap-fn-2_5 hover:bg-fn-bg-inset flex items-center text-[12.5px] transition-colors',
                opt.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
              )}
            >
              <Checkbox
                checked={checked}
                disabled={opt.disabled}
                onCheckedChange={() => toggle(opt.id)}
              />
              {opt.hue !== undefined && (
                <span
                  aria-hidden
                  className="rounded-fn-full h-fn-1_5 w-fn-1_5 inline-block shrink-0"
                  style={{ background: `oklch(0.55 0.16 ${opt.hue})` }}
                />
              )}
              <span className="text-fn-fg font-fn-medium flex-1 truncate">{opt.label}</span>
              {opt.count !== undefined && (
                <span className="text-fn-fg-faint shrink-0 text-[11.5px] tabular-nums">
                  {opt.count}
                </span>
              )}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
