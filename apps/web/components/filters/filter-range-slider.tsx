'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Numeric range filter — matches PNG 199 Monthly Salary section.
 *
 *   "Rs 250,000 — Rs 400,000"           [unit suffix, right]
 *   ━━━━━●━━━━━━━━━●━━━━━━━━━━━━━━━━━
 *   [ min input ]  unit  [ max input ]
 *
 * Native <input type="range"> doesn't support dual handles so we
 * stack two sliders. The min handle is constrained ≤ max, and vice
 * versa, on change.
 */

export interface FilterRangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: { min: number | null; max: number | null };
  onValueChange: (next: { min: number | null; max: number | null }) => void;
  formatValue?: (n: number) => string;
  /** Text shown on the right of the headline number line (e.g. "monthly"). */
  unitNote?: string;
  /** Text shown after the input fields (e.g. "PKR"). */
  inputSuffix?: string;
}

export function FilterRangeSlider({
  min,
  max,
  step = 1,
  value,
  onValueChange,
  formatValue = (n) => n.toLocaleString(),
  unitNote,
  inputSuffix,
}: FilterRangeSliderProps) {
  const currentMin = value.min ?? min;
  const currentMax = value.max ?? max;

  function setMin(next: number) {
    onValueChange({ min: Math.min(next, currentMax), max: value.max });
  }
  function setMax(next: number) {
    onValueChange({ min: value.min, max: Math.max(next, currentMin) });
  }

  return (
    <div className="gap-fn-3 flex flex-col">
      <div className="gap-fn-2 flex items-baseline justify-between">
        <span
          className="text-fn-fg font-fn-semibold text-[15px] tabular-nums"
          style={{ letterSpacing: '-0.015em' }}
        >
          {formatValue(currentMin)}
          <span className="text-fn-fg-faint font-fn-medium px-fn-1">—</span>
          {formatValue(currentMax)}
        </span>
        {unitNote && <span className="text-fn-fg-faint text-[11px]">{unitNote}</span>}
      </div>

      {/* Dual-handle slider (stacked native ranges) */}
      <div className="h-fn-5 relative">
        <span
          aria-hidden
          className="bg-fn-bg-inset rounded-fn-full top-fn-2 h-fn-1 absolute left-0 right-0"
        />
        <span
          aria-hidden
          className="bg-fn-accent rounded-fn-full top-fn-2 h-fn-1 absolute"
          style={{
            left: `${((currentMin - min) / (max - min)) * 100}%`,
            right: `${100 - ((currentMax - min) / (max - min)) * 100}%`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentMin}
          onChange={(e) => setMin(Number(e.target.value))}
          className={cn(
            'accent-fn-accent h-fn-5 absolute left-0 right-0 top-0 w-full cursor-pointer appearance-none bg-transparent',
            '[&::-webkit-slider-thumb]:h-fn-4 [&::-webkit-slider-thumb]:w-fn-4 [&::-webkit-slider-thumb]:rounded-fn-full [&::-webkit-slider-thumb]:bg-fn-accent [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none',
          )}
          style={{ pointerEvents: 'auto' }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentMax}
          onChange={(e) => setMax(Number(e.target.value))}
          className={cn(
            'accent-fn-accent h-fn-5 absolute left-0 right-0 top-0 w-full cursor-pointer appearance-none bg-transparent',
            '[&::-webkit-slider-thumb]:h-fn-4 [&::-webkit-slider-thumb]:w-fn-4 [&::-webkit-slider-thumb]:rounded-fn-full [&::-webkit-slider-thumb]:bg-fn-accent [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none',
          )}
          style={{ pointerEvents: 'auto' }}
        />
      </div>

      <div className="gap-fn-2 flex items-center">
        <Input
          type="number"
          value={currentMin}
          min={min}
          max={max}
          step={step}
          onChange={(e) => setMin(Number(e.target.value))}
          className="h-fn-7 flex-1 tabular-nums"
        />
        {inputSuffix && (
          <span className="text-fn-fg-faint font-fn-medium tracking-fn-uppercase-tight text-[10.5px] uppercase">
            {inputSuffix}
          </span>
        )}
        <Input
          type="number"
          value={currentMax}
          min={min}
          max={max}
          step={step}
          onChange={(e) => setMax(Number(e.target.value))}
          className="h-fn-7 flex-1 tabular-nums"
        />
      </div>
    </div>
  );
}
