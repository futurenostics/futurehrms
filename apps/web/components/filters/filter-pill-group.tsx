'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Toggleable chip group — matches PNG 199 Status section + the
 * date-range preset row.
 *
 * Supports single- or multi-select. The active variant gets the
 * checkmark + accent-soft fill; in single-select mode the active
 * variant fills warning-soft (yellow-ish) to match the design's
 * "Probation" pill emphasis.
 */

export interface FilterPillOption {
  id: string;
  label: string;
  disabled?: boolean;
}

interface CommonProps {
  options: FilterPillOption[];
  /** 'accent' (default, blue) | 'warning' (yellow, e.g. Probation) */
  activeTone?: 'accent' | 'warning';
  className?: string;
}

interface MultiProps extends CommonProps {
  mode?: 'multi';
  values: string[];
  onValuesChange: (next: string[]) => void;
}
interface SingleProps extends CommonProps {
  mode: 'single';
  value: string | null;
  onValueChange: (next: string | null) => void;
}

export type FilterPillGroupProps = MultiProps | SingleProps;

export function FilterPillGroup(props: FilterPillGroupProps) {
  const { options, activeTone = 'accent', className } = props;

  function isActive(id: string): boolean {
    if (props.mode === 'single') return props.value === id;
    return (props as MultiProps).values.includes(id);
  }

  function toggle(id: string) {
    if (props.mode === 'single') {
      props.onValueChange(props.value === id ? null : id);
      return;
    }
    const m = props as MultiProps;
    const next = m.values.includes(id) ? m.values.filter((v) => v !== id) : [...m.values, id];
    m.onValuesChange(next);
  }

  return (
    <div className={cn('gap-fn-1_5 flex flex-wrap', className)}>
      {options.map((opt) => {
        const active = isActive(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            disabled={opt.disabled}
            onClick={() => toggle(opt.id)}
            className={cn(
              'rounded-fn-xs px-fn-2_5 py-fn-1 gap-fn-1 font-fn-medium inline-flex cursor-pointer items-center border text-[12px] transition-colors',
              active &&
                activeTone === 'accent' &&
                'border-fn-accent/30 bg-fn-accent-soft text-fn-accent-soft-fg',
              active &&
                activeTone === 'warning' &&
                'border-fn-warning/30 bg-fn-warning-soft text-fn-warning-soft-fg',
              !active &&
                'border-fn-border bg-fn-bg-panel text-fn-fg-muted hover:border-fn-fg-faint',
              opt.disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            {active && <Check className="h-fn-2_5 w-fn-2_5" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
