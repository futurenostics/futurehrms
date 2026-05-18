'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFilterDispatch, useSectionCounts, useSectionValue } from '../context';
import { SectionCard } from '../section-card';
import type { FilterOption, PillToggleSection as PillToggleSectionDef } from '../types';

/**
 * Pill-toggle row — Status, Contract Type.
 *
 *   [Permanent]  [✓ Probation]  [Intern]  [Contractor]
 *
 * Active pills get a soft fill (warning tone by default — Probation
 * is the canonical active state in PNG 199) plus a leading check.
 * Inactive pills are an outlined chip.
 */

const TONE_ACTIVE: Record<NonNullable<FilterOption['tone']>, string> = {
  default: 'bg-fn-fg/10 text-fn-fg border-fn-fg/25',
  accent: 'bg-fn-accent-soft text-fn-accent-soft-fg border-fn-accent-soft-fg/35',
  success: 'bg-fn-success-soft text-fn-success-soft-fg border-fn-success-soft-fg/35',
  warning: 'bg-fn-warning-soft text-fn-warning-soft-fg border-fn-warning-soft-fg/35',
  danger: 'bg-fn-danger-soft text-fn-danger-soft-fg border-fn-danger-soft-fg/35',
  info: 'bg-fn-info-soft text-fn-info-soft-fg border-fn-info-soft-fg/35',
};

export const PillToggleSection = React.memo(function PillToggleSection({
  section,
}: {
  section: PillToggleSectionDef;
}) {
  const value = useSectionValue(section.key);
  const counts = useSectionCounts(section.key);
  const dispatch = useFilterDispatch();

  const selectedIds: string[] = section.single
    ? value?.kind === 'single' && value.id
      ? [value.id]
      : []
    : value?.kind === 'multi'
      ? value.ids
      : [];

  const onToggle = React.useCallback(
    (id: string) => {
      if (section.single) {
        const isOn = value?.kind === 'single' && value.id === id;
        dispatch({
          type: 'SET_SECTION',
          key: section.key,
          value: { kind: 'single', id: isOn ? null : id },
        });
        return;
      }
      const ids = value?.kind === 'multi' ? value.ids : [];
      const isOn = ids.includes(id);
      const nextIds = isOn ? ids.filter((x) => x !== id) : [...ids, id];
      dispatch({
        type: 'SET_SECTION',
        key: section.key,
        value: { kind: 'multi', ids: nextIds },
      });
    },
    [dispatch, section.key, section.single, value],
  );

  const onClear = React.useCallback(
    () => dispatch({ type: 'CLEAR_SECTION', key: section.key }),
    [dispatch, section.key],
  );

  return (
    <SectionCard
      icon={section.icon}
      title={section.title}
      count={selectedIds.length}
      onClear={onClear}
    >
      <div className="gap-fn-2 flex flex-wrap">
        {section.options.map((opt) => (
          <Pill
            key={opt.id}
            option={opt}
            active={selectedIds.includes(opt.id)}
            count={counts?.[opt.id]}
            onToggle={onToggle}
          />
        ))}
      </div>
    </SectionCard>
  );
});

const Pill = React.memo(function Pill({
  option,
  active,
  count,
  onToggle,
}: {
  option: FilterOption;
  active: boolean;
  count: number | undefined;
  onToggle: (id: string) => void;
}) {
  const tone = option.tone ?? 'warning';
  const dimmed = count === 0 && !active;
  return (
    <button
      type="button"
      disabled={option.disabled}
      onClick={() => onToggle(option.id)}
      className={cn(
        'rounded-fn-xs gap-fn-1_5 px-fn-3 py-fn-1_5 font-fn-medium inline-flex items-center border text-[13px] transition-colors',
        active
          ? TONE_ACTIVE[tone]
          : 'border-fn-border text-fn-fg-muted hover:text-fn-fg hover:bg-fn-bg-inset bg-transparent',
        option.disabled || dimmed ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      )}
    >
      {active && <Check className="h-fn-3 w-fn-3" />}
      {option.icon && !active && (
        <span aria-hidden className="h-fn-3 w-fn-3 inline-flex items-center justify-center">
          {option.icon}
        </span>
      )}
      <span>{option.label}</span>
      {typeof count === 'number' && !active && (
        <span className="text-fn-fg-faint text-[11px] tabular-nums">{count}</span>
      )}
    </button>
  );
});
