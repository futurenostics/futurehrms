'use client';

import * as React from 'react';
import { ArrowRight, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useFilterDispatch, useSectionValue } from '../context';
import { SectionCard } from '../section-card';
import type { DateRangeSection as DateRangeSectionDef } from '../types';

/**
 * Date range with preset chips — matches PNG 199 Joining Date.
 *
 *   [Any]  [Last 30d]  [Last 90d]  [This year]  [Last year]  [Custom]
 *   ┌──────────────┐ → ┌──────────────┐
 *   │ 01 Jan 2026 📅│   │ Today      📅│
 *   └──────────────┘   └──────────────┘
 *
 * Preset chips include "Any" (clears the section) and "Custom" (clears
 * the preset but keeps the date inputs editable). The date inputs are
 * separated by a right-arrow glyph for the visual "from → to" rhythm.
 */

export const DateRangeSection = React.memo(function DateRangeSection({
  section,
}: {
  section: DateRangeSectionDef;
}) {
  const value = useSectionValue(section.key);
  const dispatch = useFilterDispatch();

  const preset = value?.kind === 'date-range' ? value.preset : null;
  const from = value?.kind === 'date-range' ? value.from : null;
  const to = value?.kind === 'date-range' ? value.to : null;

  const isActive = !!(preset || from || to);

  const onPresetClick = React.useCallback(
    (id: string) => {
      if (id === 'any') {
        dispatch({ type: 'CLEAR_SECTION', key: section.key });
        return;
      }
      if (id === 'custom') {
        dispatch({
          type: 'SET_SECTION',
          key: section.key,
          value: { kind: 'date-range', preset: 'custom', from, to },
        });
        return;
      }
      const def = section.presets.find((p) => p.id === id);
      if (!def) return;
      const range = def.range();
      dispatch({
        type: 'SET_SECTION',
        key: section.key,
        value: { kind: 'date-range', preset: id, from: range.from, to: range.to },
      });
    },
    [dispatch, section.key, section.presets, from, to],
  );

  const onFromChange = React.useCallback(
    (next: string) => {
      dispatch({
        type: 'SET_SECTION',
        key: section.key,
        value: { kind: 'date-range', preset: 'custom', from: next || null, to },
      });
    },
    [dispatch, section.key, to],
  );

  const onToChange = React.useCallback(
    (next: string) => {
      dispatch({
        type: 'SET_SECTION',
        key: section.key,
        value: { kind: 'date-range', preset: 'custom', from, to: next || null },
      });
    },
    [dispatch, section.key, from],
  );

  const onClear = React.useCallback(
    () => dispatch({ type: 'CLEAR_SECTION', key: section.key }),
    [dispatch, section.key],
  );

  const allChips: Array<{ id: string; label: string; active: boolean }> = [
    { id: 'any', label: 'Any', active: !isActive },
    ...section.presets.map((p) => ({
      id: p.id,
      label: p.label,
      active: preset === p.id,
    })),
    { id: 'custom', label: 'Custom', active: preset === 'custom' },
  ];

  return (
    <SectionCard
      icon={section.icon}
      title={section.title}
      count={isActive ? 1 : 0}
      onClear={onClear}
    >
      <div className="gap-fn-1_5 mb-fn-2_5 grid grid-cols-6">
        {allChips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onPresetClick(c.id)}
            className={cn(
              'rounded-fn-xs px-fn-2 py-fn-1_5 font-fn-medium cursor-pointer border text-center text-[12px] transition-colors',
              c.active
                ? 'bg-fn-accent-soft text-fn-accent-soft-fg border-fn-accent-soft-fg/35'
                : 'border-fn-border text-fn-fg-muted hover:text-fn-fg hover:bg-fn-bg-inset bg-transparent',
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="gap-fn-2 flex items-center">
        <DateField value={from ?? ''} onChange={onFromChange} placeholder="From" />
        <ArrowRight aria-hidden className="text-fn-fg-faint h-fn-3_5 w-fn-3_5 shrink-0" />
        <DateField value={to ?? ''} onChange={onToChange} placeholder="Today" />
      </div>
    </SectionCard>
  );
});

function DateField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative flex-1">
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-fn-7 tabular-nums"
      />
      <Calendar
        aria-hidden
        className="text-fn-fg-faint right-fn-2_5 h-fn-3_5 w-fn-3_5 pointer-events-none absolute top-1/2 -translate-y-1/2"
      />
    </div>
  );
}
