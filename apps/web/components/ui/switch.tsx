'use client';

import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

/**
 * Switch primitive.
 *
 * Used by:
 *   - Employee-sheet footer "Active" toggle (the canonical use case).
 *   - Has-Payoneer toggle in compensation section.
 *   - More-filters "Include archived" if we ever flip from Checkbox.
 *   - Theme toggle (currently a button — could become a Switch later).
 *
 * Spec
 *   Track:  36 × 20 (h-fn-5 w-fn-9) pill
 *           bg-fn-bg-inset (off) → bg-fn-accent (on)
 *   Thumb:  16 × 16 (h-fn-4 w-fn-4) circle
 *           bg-fn-bg-panel · shadow-fn-xs
 *           translate: off → 2px from left · on → translateX 18px
 *   Focus:  2px ring fn-accent with 2px fn-bg offset
 *   Disabled: 60% opacity, cursor-not-allowed (matches Checkbox/Button)
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'rounded-fn-full bg-fn-bg-inset h-fn-5 w-fn-9 inline-flex shrink-0 cursor-pointer items-center border border-transparent transition-colors',
      'focus-visible:ring-fn-accent focus-visible:ring-offset-fn-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'data-[state=checked]:bg-fn-accent',
      'disabled:cursor-not-allowed disabled:opacity-60',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        'rounded-fn-full bg-fn-bg-panel shadow-fn-xs h-fn-4 w-fn-4 pointer-events-none block transition-transform',
        'data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-px',
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
