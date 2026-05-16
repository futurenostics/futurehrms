'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Spinner — small loading indicator.
 *
 * The design doesn't ship a dedicated Spinner primitive (it relies on
 * Tailwind's animate-spin + a stroked circle). This primitive
 * formalizes that into a reusable component with consistent sizing
 * and color so loading states across Button, Sheet, Save action, and
 * full-page suspense fallbacks all look identical.
 *
 * Sizes track the icon scale used elsewhere:
 *   xs  · 12px — inline with text (button label, badge)
 *   sm  · 14px — inline with form inputs
 *   md  · 16px — default, button icon size
 *   lg  · 24px — panel-level loading
 *   xl  · 36px — full-page suspense
 *
 * Color defaults to `currentColor` so the spinner inherits the
 * surrounding text color (a primary Button's spinner is the button
 * text color, a secondary Button's is its muted color). Override
 * with className `text-fn-*` when needed.
 *
 * Accessibility: when used as the sole content of a loading region,
 * wrap with role="status" and a sibling visually-hidden label or
 * pass `label` to render a sr-only span. By default it's aria-hidden
 * so it doesn't read out next to other content.
 */
const SIZES = {
  xs: 'h-fn-3 w-fn-3 border',
  sm: 'h-fn-3_5 w-fn-3_5 border',
  md: 'h-fn-4 w-fn-4 border-[2px]',
  lg: 'h-fn-6 w-fn-6 border-[2px]',
  xl: 'h-fn-9 w-fn-9 border-[3px]',
} as const;

export type SpinnerSize = keyof typeof SIZES;

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: SpinnerSize;
  /** sr-only loading label. When set, role="status" is added. */
  label?: string;
}

export function Spinner({ size = 'md', label, className, ...rest }: SpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-hidden={label ? undefined : true}
      aria-live={label ? 'polite' : undefined}
      className={cn('inline-flex items-center justify-center', className)}
      {...rest}
    >
      <span
        className={cn(
          // Stroked ring with one transparent side → the animate-spin
          // makes the "missing" segment rotate, reading as a spinner.
          'rounded-fn-full animate-spin border-current border-r-transparent',
          SIZES[size],
        )}
      />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
