'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Select primitive.
 *
 * The design doesn't ship a dedicated Select primitive — selects in
 * screens use the same chrome as Input (34px / px-fn-2_5 / border-
 * strong / rounded-fn-xs) with a ChevronDown indicator on the right.
 * That symmetry is intentional: a Select sitting next to an Input
 * in a form row reads as the same form-field rhythm.
 *
 * Trigger: matches Input dimensions exactly so they align in grids.
 * Content panel: rounded-fn-sm (8) — the design's popup-container
 *   radius (a hair larger than form-field radius).
 * Items: 6px rounded inset, 10px x / 6px y padding, fn-base font,
 *   left 32px reserved for the check indicator.
 * Label (group header): 11px uppercase, 0.06em tracking — matches
 *   the design's uppercase eyebrow style.
 */

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'rounded-fn-xs border-fn-border-strong bg-fn-bg-panel text-fn-fg shadow-fn-xs px-fn-2_5 text-fn-base flex h-[34px] w-full cursor-pointer items-center justify-between border transition-colors',
      'placeholder:text-fn-fg-faint',
      'hover:border-fn-fg-faint',
      'focus-visible:border-fn-accent focus-visible:ring-fn-accent focus-visible:outline-none focus-visible:ring-1',
      'data-[placeholder]:text-fn-fg-faint',
      'aria-invalid:border-fn-danger aria-invalid:focus-visible:ring-fn-danger',
      'disabled:bg-fn-bg-inset disabled:text-fn-fg-muted disabled:cursor-not-allowed',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="text-fn-fg-faint h-fn-3_5 w-fn-3_5" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        'rounded-fn-sm border-fn-border bg-fn-bg-panel text-fn-fg shadow-fn-popover relative z-50 min-w-[8rem] overflow-hidden border',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        position === 'popper' && 'data-[side=bottom]:translate-y-fn-1',
        className,
      )}
      sideOffset={4}
      {...props}
    >
      <SelectPrimitive.ScrollUpButton className="text-fn-fg-faint h-fn-5 flex cursor-default items-center justify-center">
        <ChevronUp className="h-fn-3 w-fn-3" />
      </SelectPrimitive.ScrollUpButton>
      <SelectPrimitive.Viewport
        className={cn(
          'p-fn-1',
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] min-w-[var(--radix-select-trigger-width)]',
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectPrimitive.ScrollDownButton className="text-fn-fg-faint h-fn-5 flex cursor-default items-center justify-center">
        <ChevronDown className="h-fn-3 w-fn-3" />
      </SelectPrimitive.ScrollDownButton>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      'text-fn-fg-faint px-fn-2 py-fn-1_5 text-fn-sm font-fn-semibold tracking-fn-uppercase-tight uppercase',
      className,
    )}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'rounded-fn-xs text-fn-fg py-fn-1_5 pl-fn-8 pr-fn-2 text-fn-base relative flex w-full cursor-pointer select-none items-center outline-none',
      'focus:bg-fn-bg-inset focus:text-fn-fg',
      'data-[state=checked]:font-fn-medium',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="left-fn-2 h-fn-3_5 w-fn-3_5 absolute flex items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="text-fn-accent h-fn-3_5 w-fn-3_5" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('bg-fn-divider -mx-fn-1 my-fn-1 h-px', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
};
