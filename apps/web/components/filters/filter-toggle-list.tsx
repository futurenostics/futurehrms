'use client';

import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

/**
 * Labeled checkbox list — matches PNG 199 Compensation section.
 *
 *   ☐ Payoneer linked (USD payouts)
 *     32 employees · earns commission
 *
 * Each option is a named toggle with a primary label + an optional
 * secondary sub-label (count + qualifier text).
 */

export interface FilterToggleOption {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface FilterToggleListProps {
  options: FilterToggleOption[];
  values: string[];
  onValuesChange: (next: string[]) => void;
}

export function FilterToggleList({ options, values, onValuesChange }: FilterToggleListProps) {
  const set = new Set(values);
  function toggle(id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onValuesChange([...next]);
  }
  return (
    <ul className="gap-fn-1 flex flex-col">
      {options.map((opt) => {
        const checked = set.has(opt.id);
        return (
          <li key={opt.id}>
            <label
              className={cn(
                'rounded-fn-xs px-fn-2 py-fn-1_5 gap-fn-2_5 hover:bg-fn-bg-inset flex items-start text-[12.5px] transition-colors',
                opt.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
              )}
            >
              <Checkbox
                checked={checked}
                disabled={opt.disabled}
                onCheckedChange={() => toggle(opt.id)}
                className="mt-fn-0_5"
              />
              <div className="gap-fn-0_5 flex min-w-0 flex-1 flex-col">
                <span className="text-fn-fg font-fn-medium">{opt.label}</span>
                {opt.description && (
                  <span className="text-fn-fg-faint text-[11px]">{opt.description}</span>
                )}
              </div>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
