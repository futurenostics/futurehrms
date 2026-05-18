'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useFilterDispatch, useSectionMeta, useSectionValue } from '../context';
import { SectionCard } from '../section-card';
import type { RangeWithHistogramSection as RangeSectionDef } from '../types';

/**
 * Dual-handle range slider with histogram backdrop — matches PNG 199
 * Salary section.
 *
 *   Rs 250,000 – Rs 400,000                                  monthly
 *   ▁▂▃▅▇▆▅▃▂▁▁▁▁
 *   ●━━━━━━━━━━●
 *   ┌──────────┐   ┌──────────┐
 *   │ 250,000  │   │ 400,000  │
 *   └──────────┘   └──────────┘
 *
 * Histogram bars sit behind the track. Both handles are open circles
 * (white fill, accent border). The value display above is the primary
 * affordance — bigger than the manual inputs.
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
      {/* Prominent value display */}
      <div className="mb-fn-3 flex items-baseline justify-between">
        <div className="text-fn-fg font-fn-semibold tracking-fn-tight text-[18px] tabular-nums">
          {format(valueMin)} <span className="text-fn-fg-muted mx-fn-1 font-fn-medium">–</span>{' '}
          {format(valueMax)}
        </div>
        <div className="text-fn-fg-faint text-[12px]">monthly</div>
      </div>

      {/* Histogram backdrop + track */}
      <div className="relative">
        <div className="h-fn-8 gap-fn-0_5 flex items-end" aria-hidden>
          {buckets.length > 0
            ? buckets.map((b, i) => {
                const insideRange = b.from >= valueMin && b.to <= valueMax;
                const heightPct = (b.count / peakCount) * 100;
                return (
                  <div
                    key={i}
                    className={cn(
                      'rounded-fn-2xs min-h-[2px] flex-1',
                      insideRange ? 'bg-fn-accent/40' : 'bg-fn-fg-muted/15',
                    )}
                    style={{ height: `${heightPct}%` }}
                  />
                );
              })
            : // Placeholder bars when histogram data isn't loaded yet.
              Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-fn-2xs bg-fn-fg-muted/15 min-h-[2px] flex-1"
                  style={{ height: `${30 + ((i * 13) % 60)}%` }}
                />
              ))}
        </div>

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
      </div>

      {/* Manual min/max inputs */}
      <div className="gap-fn-2 mt-fn-4 grid grid-cols-2">
        <BoundInput
          unit="min"
          value={valueMin}
          bounds={bounds}
          step={section.step ?? 1}
          onCommit={(v) => commit({ min: v })}
        />
        <BoundInput
          unit="max"
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
        '[&::-webkit-slider-thumb]:rounded-fn-full [&::-webkit-slider-thumb]:h-fn-4 [&::-webkit-slider-thumb]:w-fn-4 [&::-webkit-slider-thumb]:border-fn-accent [&::-webkit-slider-thumb]:shadow-fn-sm [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:bg-white',
        // eslint-disable-next-line fn-tokens/no-default-utilities
        '[&::-moz-range-thumb]:rounded-fn-full [&::-moz-range-thumb]:h-fn-4 [&::-moz-range-thumb]:w-fn-4 [&::-moz-range-thumb]:border-fn-accent [&::-moz-range-thumb]:shadow-fn-sm [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:bg-white',
        'pointer-events-auto bg-transparent',
      )}
      style={{ left: `${position}%`, width: '24px' }}
    />
  );
}

function BoundInput({
  unit,
  value,
  bounds,
  step,
  onCommit,
}: {
  unit: string;
  value: number;
  bounds: { min: number; max: number };
  step: number;
  onCommit: (next: number) => void;
}) {
  const [draft, setDraft] = React.useState(value.toLocaleString());
  React.useEffect(() => {
    setDraft(value.toLocaleString());
  }, [value]);
  return (
    <div className="relative">
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = Number(draft.replace(/,/g, ''));
          if (!Number.isFinite(n)) {
            setDraft(value.toLocaleString());
            return;
          }
          const clamped = Math.max(bounds.min, Math.min(bounds.max, Math.round(n / step) * step));
          onCommit(clamped);
        }}
        inputMode="numeric"
        className="pr-fn-9 text-[14px] tabular-nums"
      />
      <span className="text-fn-fg-faint right-fn-3 pointer-events-none absolute top-1/2 -translate-y-1/2 text-[12px]">
        {unit}
      </span>
    </div>
  );
}

function defaultFormat(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}
