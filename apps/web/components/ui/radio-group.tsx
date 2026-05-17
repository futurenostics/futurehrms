'use client';

import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * RadioGroup primitives.
 *
 * Two variants:
 *
 *   1. <RadioGroup> + <RadioGroupItem> — classic vertical stack or
 *      inline row of radio buttons. 18px circle, mirrors Checkbox
 *      sizing rhythm so a Checkbox and Radio sitting next to each
 *      other in a form align visually.
 *
 *   2. <RadioCardGroup> + <RadioCard> — card-style picker for high-
 *      prominence choices. Each card is a full-width clickable
 *      surface with a title and (optional) description. Selected
 *      card gets the fn-accent border + fn-accent-soft background.
 *      Used by the parked employee-sheet for Contract Type
 *      (Full-time / Part-time / Contractor / Intern).
 *
 * Both backed by Radix's RadioGroup primitive so keyboard nav
 * (arrows + space) and ARIA roles are correct.
 */

/* ----------------------------------------------------------
 * Classic RadioGroup
 * ---------------------------------------------------------- */

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root
    ref={ref}
    className={cn('gap-fn-2 flex flex-col', className)}
    {...props}
  />
));
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      'border-fn-border-strong bg-fn-bg-panel rounded-fn-full aspect-square h-[18px] w-[18px] shrink-0 cursor-pointer border-[1.5px] transition-colors',
      'hover:border-fn-accent',
      'focus-visible:ring-fn-accent focus-visible:ring-offset-fn-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'data-[state=checked]:border-fn-accent data-[state=checked]:bg-fn-accent',
      'disabled:cursor-not-allowed disabled:opacity-60',
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex h-full w-full items-center justify-center">
      <Circle className="text-fn-accent-fg h-fn-1_5 w-fn-1_5 fill-current" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

/* ----------------------------------------------------------
 * RadioCardGroup — card-style picker
 * ---------------------------------------------------------- */

const RadioCardGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root
    ref={ref}
    className={cn('gap-fn-3 grid grid-cols-1 sm:grid-cols-2', className)}
    {...props}
  />
));
RadioCardGroup.displayName = 'RadioCardGroup';

export interface RadioCardProps extends React.ComponentPropsWithoutRef<
  typeof RadioGroupPrimitive.Item
> {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

const RadioCard = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioCardProps
>(({ className, title, description, icon, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      'rounded-fn-xs border-fn-border bg-fn-bg-panel gap-fn-3 p-fn-3 group flex cursor-pointer items-start border text-left transition-colors',
      'hover:border-fn-border-strong',
      'focus-visible:ring-fn-accent focus-visible:ring-offset-fn-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'data-[state=checked]:border-fn-accent data-[state=checked]:bg-fn-accent-soft/40',
      'disabled:cursor-not-allowed disabled:opacity-60',
      className,
    )}
    {...props}
  >
    {icon && (
      <span
        aria-hidden
        className="text-fn-fg-faint group-data-[state=checked]:text-fn-accent-soft-fg flex shrink-0 items-center"
      >
        {icon}
      </span>
    )}
    <span className="gap-fn-0_5 flex flex-1 flex-col">
      <span className="text-fn-fg text-fn-base font-fn-semibold">{title}</span>
      {description && (
        <span className="text-fn-fg-muted text-fn-base-lo-plus leading-fn-snug">{description}</span>
      )}
    </span>
    <span
      aria-hidden
      className="border-fn-border-strong group-data-[state=checked]:border-fn-accent group-data-[state=checked]:bg-fn-accent mt-fn-0_5 rounded-fn-full h-[18px] w-[18px] shrink-0 border-[1.5px] transition-colors"
    >
      <RadioGroupPrimitive.Indicator className="flex h-full w-full items-center justify-center">
        <Circle className="text-fn-accent-fg h-fn-1_5 w-fn-1_5 fill-current" />
      </RadioGroupPrimitive.Indicator>
    </span>
  </RadioGroupPrimitive.Item>
));
RadioCard.displayName = 'RadioCard';

export { RadioGroup, RadioGroupItem, RadioCardGroup, RadioCard };
