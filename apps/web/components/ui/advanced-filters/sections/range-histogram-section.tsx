'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useFilterDispatch, useSectionMeta, useSectionValue } from '../context';
import { SectionCard } from '../section-card';
import type { RangeWithHistogramSection as RangeSectionDef } from '../types';

/**
 * Dual-handle range slider with a histogram backdrop — matches PNG 199
 * Salary section.
 *
 * Bars render *behind* the track. Bars inside the active range render
 * filled; outside, dimmed. Handles are absolutely positioned circles.
 * Below: linked PKR-formatted text inputs for min and max.
 *
 * Histogram data comes from `useSectionMeta(key)` so the primitive can
 * push new buckets in from the counts API without forcing the page to
 * pass them down through the schema.
 */

interface HistogramMeta {
  buckets?: Array<{ from: number; to: number; count: number }>;
  min?: number;
  max?: number;
}

export const RangeHistogramSection = React.memo(function RangeHistogramSection({
  section,
}: {
  section: RangeSectionDef;
}) {
  const value = useSectionValue(section.key);
  const meta = useSectionMeta<HistogramMeta>(section.key);
  const dispatch = useFilterDispatch();

  // Histogram buckets — prefer live counts from the API, fall back to
  // the schema default (used in style guide / static demos).
  const buckets =
    meta?.buckets ??
    section.histogram?.map((c, i) => ({
      from:
        section.bounds.min +
        (i * (section.bounds.max - section.bounds.min)) / section.histogram!.length,
      to:
        section.bounds.min +
        ((i + 1) * (section.bounds.max - section.bounds.min)) / section.histogram!.length,
      count: c,
    })) ??
    [];

  const bounds = {
    min: meta?.min ?? section.bounds.min,
    max: meta?.max ?? section.bounds.max,
  };

  const valueMin = value?.kind === 'range' && value.min !== null ? value.min : bounds.min;
  const valueMax = value?.kind === 'range' && value.max !== null ? value.max : bounds.max;
  const span = Math.max(1, bounds.max - bounds.min);
  const leftPct = ((valueMin - bounds.min) / span) * 100;
  const rightPct = ((valueMax - bounds.min) / span) * 100;
  const format = section.format ?? defaultFormat;

  const peakCount = Math.max(1, ...buckets.map((b) => b.count));

  const commit = React.useCallback(
    (next: { min?: number | null; max?: number | null }) => {
      const merged: { min: number | null; max: number | null } = {
        min: 'min' in next ? (next.min ?? null) : value?.kind === 'range' ? value.min : null,
        max: 'max' in next ? (next.max ?? null) : value?.kind === 'range' ? value.max : null,
      };
      // Default-bounds → treat as cleared.
      if (merged.min === bounds.min) merged.min = null;
      if (merged.max === bounds.max) merged.max = null;
      dispatch({
        type: 'SET_SECTION',
        key: section.key,
        value: { kind: 'range', ...merged },
      });
    },
    [dispatch, section.key, value, bounds.min, bounds.max],
  );

  const onClear = React.useCallback(
    () => dispatch({ type: 'CLEAR_SECTION', key: section.key }),
    [dispatch, section.key],
  );

  const active = !!(value?.kind === 'range' && (value.min !== null || value.max !== null));

  return (
    <SectionCard icon={section.icon} title={section.title} count={active ? 1 : 0} onClear={onClear}>
      {/* Histogram backdrop */}
      <div className="relative">
        <div className="h-fn-12 gap-fn-0_5 flex items-end" aria-hidden>
          {buckets.map((b, i) => {
            const insideRange = b.from >= valueMin && b.to <= valueMax;
            const heightPct = (b.count / peakCount) * 100;
            return (
              <div
                key={i}
                className={cn(
                  'rounded-fn-2xs min-h-[2px] flex-1',
                  insideRange ? 'bg-fn-accent-soft-fg/70' : 'bg-fn-fg-muted/20',
                )}
                style={{ height: `${heightPct}%` }}
              />
            );
          })}
        </div>

        {/* Track */}
        <div className="mt-fn-2 h-fn-1 relative w-full">
          <div className="bg-fn-bg-inset rounded-fn-full absolute inset-0" />
          <div
            className="bg-fn-accent rounded-fn-full absolute inset-y-0"
            style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
          />
          <RangeThumb
            position={leftPct}
            min={bounds.min}
            max={valueMax}
            step={section.step ?? 1}
            value={valueMin}
            onCommit={(v) => commit({ min: v })}
            ariaLabel={`Minimum ${section.title}`}
          />
          <RangeThumb
            position={rightPct}
            min={valueMin}
            max={bounds.max}
            step={section.step ?? 1}
            value={valueMax}
            onCommit={(v) => commit({ max: v })}
            ariaLabel={`Maximum ${section.title}`}
          />
        </div>
        <div className="text-fn-fg-faint mt-fn-2 flex justify-between text-[11px] tabular-nums">
          <span>{format(bounds.min)}</span>
          <span>{format(bounds.max)}</span>
        </div>
      </div>

      {/* Manual min/max inputs */}
      <div className="gap-fn-2 mt-fn-3 grid grid-cols-2">
        <BoundInput
          label="Min"
          unit={section.unit}
          value={valueMin}
          bounds={bounds}
          step={section.step ?? 1}
          onCommit={(v) => commit({ min: v })}
        />
        <BoundInput
          label="Max"
          unit={section.unit}
          value={valueMax}
          bounds={bounds}
          step={section.step ?? 1}
          onCommit={(v) => commit({ max: v })}
        />
      </div>
    </SectionCard>
  );
});

function RangeThumb({
  position,
  value,
  min,
  max,
  step,
  onCommit,
  ariaLabel,
}: {
  position: number;
  value: number;
  min: number;
  max: number;
  step: number;
  onCommit: (next: number) => void;
  ariaLabel: string;
}) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onCommit(Number(e.target.value))}
      aria-label={ariaLabel}
      className={cn(
        'h-fn-4 w-fn-4 absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-grab appearance-none',
        // eslint-disable-next-line fn-tokens/no-default-utilities
        '[&::-webkit-slider-thumb]:bg-fn-accent [&::-webkit-slider-thumb]:rounded-fn-full [&::-webkit-slider-thumb]:h-fn-4 [&::-webkit-slider-thumb]:w-fn-4 [&::-webkit-slider-thumb]:shadow-fn-sm [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white',
        // eslint-disable-next-line fn-tokens/no-default-utilities
        '[&::-moz-range-thumb]:bg-fn-accent [&::-moz-range-thumb]:rounded-fn-full [&::-moz-range-thumb]:h-fn-4 [&::-moz-range-thumb]:w-fn-4 [&::-moz-range-thumb]:shadow-fn-sm [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white',
        'pointer-events-auto bg-transparent',
      )}
      style={{ left: `${position}%`, width: '24px' }}
    />
  );
}

function BoundInput({
  label,
  unit,
  value,
  bounds,
  step,
  onCommit,
}: {
  label: string;
  unit?: string;
  value: number;
  bounds: { min: number; max: number };
  step: number;
  onCommit: (next: number) => void;
}) {
  const [draft, setDraft] = React.useState(value.toString());
  React.useEffect(() => {
    setDraft(value.toString());
  }, [value]);
  return (
    <label className="gap-fn-1 flex flex-col">
      <span className="text-fn-fg-faint font-fn-medium tracking-fn-uppercase-tight text-[11px] uppercase">
        {label}
      </span>
      <div className="relative">
        {unit && (
          <span className="text-fn-fg-faint left-fn-2 pointer-events-none absolute top-1/2 -translate-y-1/2 text-[12px]">
            {unit}
          </span>
        )}
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const n = Number(draft);
            if (!Number.isFinite(n)) {
              setDraft(value.toString());
              return;
            }
            const clamped = Math.max(bounds.min, Math.min(bounds.max, Math.round(n / step) * step));
            onCommit(clamped);
          }}
          inputMode="numeric"
          className={cn('tabular-nums', unit && 'pl-fn-7')}
        />
      </div>
    </label>
  );
}

function defaultFormat(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}
