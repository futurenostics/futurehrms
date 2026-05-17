'use client';

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Checkbox primitive.
 *
 * The design ships no dedicated Checkbox primitive — every form
 * checkbox in `docs/design/screens/*.jsx` uses inline-styled
 * `CheckSquare` components. This primitive distills that pattern:
 *
 *   18 × 18 box · 4px radius · 1.5px stroke-strong border
 *   bg-bg-panel idle → bg-fn-accent + fn-accent border on checked
 *   focus ring 2px fn-accent with 2px fn-bg offset
 *   indeterminate state shows a horizontal Minus instead of Check
 *
 * Used by:
 *   - Login form remember-me toggle
 *   - Employees-list per-row select + master checkbox
 *   - Future employee-sheet emergency-contact "has secondary" toggle
 *   - More-filters popover "include archived" option
 */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, checked, ...props }, ref) => {
  const isIndeterminate = checked === 'indeterminate';
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      checked={checked}
      className={cn(
        'border-fn-border-strong bg-fn-bg-panel peer relative inline-flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded-[4px] border-[1.5px] transition-colors',
        'hover:border-fn-accent',
        'focus-visible:ring-fn-accent focus-visible:ring-offset-fn-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'data-[state=checked]:border-fn-accent data-[state=checked]:bg-fn-accent data-[state=checked]:text-fn-accent-fg',
        'data-[state=indeterminate]:border-fn-accent data-[state=indeterminate]:bg-fn-accent data-[state=indeterminate]:text-fn-accent-fg',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        {isIndeterminate ? (
          <Minus className="h-fn-3 w-fn-3" strokeWidth={3} />
        ) : (
          <Check className="h-fn-3 w-fn-3" strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
