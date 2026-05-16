'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/*
 * Label primitive.
 *
 * Design spec (docs/design/screens/commission-rule-form.jsx +
 * employee-profile.jsx + overtime-rules.jsx, every <label> usage):
 *   font-size:   12.5px  (text-fn-base-lo-plus)
 *   font-weight: 600     (font-fn-semibold)
 *   color:       var(--fn-fg)
 *   line-height: 1 (leading-fn-unit) — tightest possible, label is
 *                a single short line; rhythm comes from the form
 *                composition, not the label itself.
 *
 * No margin here — the form composition layer decides what space
 * sits between label and input (typically 6px via the
 * --fn-spacing-form-field-gap alias).
 */
const labelVariants = cva(
  'text-fn-fg text-fn-base-lo-plus font-fn-semibold leading-fn-unit peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
