'use client';

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'border-fn-border-strong bg-fn-bg-panel peer relative inline-flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded-[4px] border-[1.5px] transition-colors',
      'hover:border-fn-accent',
      'focus-visible:ring-fn-accent focus-visible:ring-offset-fn-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'data-[state=checked]:border-fn-accent data-[state=checked]:bg-fn-accent data-[state=checked]:text-fn-accent-fg',
      'disabled:cursor-not-allowed disabled:opacity-60',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <Check className="h-3 w-3" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
