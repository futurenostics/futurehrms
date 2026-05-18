'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useFilterDispatch, useSectionValue } from '../context';
import { SectionCard } from '../section-card';
import type { DateRangeSection as DateRangeSectionDef } from '../types';

/**
 * Date range with preset chips — matches PNG 199 Joining Date.
 *
 *   [Last 30 days] [Last 90 days] [This year] [All time]
 *   ┌─────────────┐  ┌─────────────┐
 *   │  from       │  │  to         │
 *   └─────────────┘  └─────────────┘
 *
 * Preset chips set both `from` and `to` (computed at click time so
 * "Last 30 days" is always fresh). Manual edits in either input clear
 * the active preset chip.
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
      const def = section.presets.find((p) => p.id === id);
      if (!def) return;
      // Toggle off if already active.
      if (preset === id) {
        dispatch({ type: 'CLEAR_SECTION', key: section.key });
        return;
      }
      const range = def.range();
      dispatch({
        type: 'SET_SECTION',
        key: section.key,
        value: { kind: 'date-range', preset: id, from: range.from, to: range.to },
      });
    },
    [dispatch, section.key, section.presets, preset],
  );

  const onFromChange = React.useCallback(
    (next: string) => {
      dispatch({
        type: 'SET_SECTION',
        key: section.key,
        value: { kind: 'date-range', preset: null, from: next || null, to },
      });
    },
    [dispatch, section.key, to],
  );

  const onToChange = React.useCallback(
    (next: string) => {
      dispatch({
        type: 'SET_SECTION',
        key: section.key,
        value: { kind: 'date-range', preset: null, from, to: next || null },
      });
    },
    [dispatch, section.key, from],
  );

  const onClear = React.useCallback(
    () => dispatch({ type: 'CLEAR_SECTION', key: section.key }),
    [dispatch, section.key],
  );

  return (
    <SectionCard
      icon={section.icon}
      title={section.title}
      count={isActive ? 1 : 0}
      onClear={onClear}
    >
      <div className="gap-fn-1_5 mb-fn-2_5 flex flex-wrap">
        {section.presets.map((p) => {
          const active = preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPresetClick(p.id)}
              className={cn(
                'rounded-fn-xs px-fn-2_5 py-fn-1 font-fn-medium cursor-pointer border text-[12px] transition-colors',
                active
                  ? 'bg-fn-accent-soft text-fn-accent-soft-fg border-fn-accent-soft-fg/35'
                  : 'border-fn-border text-fn-fg-muted hover:text-fn-fg hover:bg-fn-bg-inset bg-transparent',
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="gap-fn-2 grid grid-cols-2">
        <label className="gap-fn-1 flex flex-col">
          <span className="text-fn-fg-faint font-fn-medium tracking-fn-uppercase-tight text-[11px] uppercase">
            From
          </span>
          <Input
            type="date"
            value={from ?? ''}
            onChange={(e) => onFromChange(e.target.value)}
            className="tabular-nums"
          />
        </label>
        <label className="gap-fn-1 flex flex-col">
          <span className="text-fn-fg-faint font-fn-medium tracking-fn-uppercase-tight text-[11px] uppercase">
            To
          </span>
          <Input
            type="date"
            value={to ?? ''}
            onChange={(e) => onToChange(e.target.value)}
            className="tabular-nums"
          />
        </label>
      </div>
    </SectionCard>
  );
});
