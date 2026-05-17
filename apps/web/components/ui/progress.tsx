'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

/**
 * Progress primitive.
 *
 * Linear progress bar. Backed by Radix Progress so aria-* attributes
 * land for screen readers.
 *
 * Sizes
 *   sm  4px track (h-fn-1)
 *   md  6px track (h-fn-1_5) — default
 *   lg  10px track (h-fn-2_5)
 *
 * Tones (track stays fn-bg-inset; the fill changes color):
 *   accent (default) · success · warning · danger
 *
 * For determinate progress, pass `value={0..100}`. Pass
 * `indeterminate` to show a sliding shimmer.
 */
const SIZE_TRACK = {
  sm: 'h-fn-1',
  md: 'h-fn-1_5',
  lg: 'h-fn-2_5',
} as const;

const TONE_FILL = {
  accent: 'bg-fn-accent',
  success: 'bg-fn-success',
  warning: 'bg-fn-warning',
  danger: 'bg-fn-danger',
} as const;

export type ProgressSize = keyof typeof SIZE_TRACK;
export type ProgressTone = keyof typeof TONE_FILL;

export interface ProgressProps extends React.ComponentPropsWithoutRef<
  typeof ProgressPrimitive.Root
> {
  size?: ProgressSize;
  tone?: ProgressTone;
}

export const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value = 0, size = 'md', tone = 'accent', ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    value={value}
    className={cn(
      'rounded-fn-full bg-fn-bg-inset relative w-full overflow-hidden',
      SIZE_TRACK[size],
      className,
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn('h-full w-full transition-transform duration-300 ease-out', TONE_FILL[tone])}
      style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;
