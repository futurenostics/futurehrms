'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Select primitive.
 *
 * Backed by Radix Select. Trigger matches Input chrome so a Select
 * sitting next to an Input in a form row reads as the same rhythm.
 *
 * The design ships three trigger variants (docs/design/screens/
 * dropdowns-style-guide/194 _ Select _ all states.png):
 *
 *   • `default` — 34px, border-strong, used in forms / filters.
 *   • `compact` — 28px, used in dense table toolbars.
 *   • `ghost`   — borderless text-only trigger used in inline edits.
 *   • `label`   — same as default but with a colored eyebrow prefix
 *                 baked into the trigger ("Department: Engineering").
 *
 * Items support a leading icon and trailing meta string for the
 * "rich option" rows the design calls out (members with a dept tag,
 * status rows with leading colored tile, etc.).
 *
 * Content panel: rounded-fn-sm (8) — popup-container radius. Items:
 * 6px rounded inset, 10px x / 6px y padding, fn-base font, left
 * gutter reserved for the check or leading icon.
 */

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

type SelectTriggerVariant = 'default' | 'compact' | 'ghost' | 'label';

interface SelectTriggerProps extends React.ComponentPropsWithoutRef<
  typeof SelectPrimitive.Trigger
> {
  variant?: SelectTriggerVariant;
  /** Eyebrow string rendered when variant="label" (e.g. "Department"). */
  label?: string;
}

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(({ className, children, variant = 'default', label, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'rounded-fn-xs text-fn-fg gap-fn-2 text-fn-base flex w-full cursor-pointer items-center justify-between transition-colors',
      'placeholder:text-fn-fg-faint',
      'data-[placeholder]:text-fn-fg-faint',
      'aria-invalid:border-fn-danger aria-invalid:focus-visible:ring-fn-danger',
      'disabled:cursor-not-allowed disabled:opacity-60',
      // variant chrome
      variant === 'default' &&
        'border-fn-border-strong bg-fn-bg-panel shadow-fn-xs px-fn-2_5 hover:border-fn-fg-faint focus-visible:border-fn-accent focus-visible:ring-fn-accent disabled:bg-fn-bg-inset disabled:text-fn-fg-muted h-[34px] border focus-visible:outline-none focus-visible:ring-1',
      variant === 'compact' &&
        'border-fn-border-strong bg-fn-bg-panel shadow-fn-xs px-fn-2 text-fn-sm-plus hover:border-fn-fg-faint focus-visible:border-fn-accent focus-visible:ring-fn-accent disabled:bg-fn-bg-inset disabled:text-fn-fg-muted h-[28px] border focus-visible:outline-none focus-visible:ring-1',
      variant === 'ghost' &&
        'px-fn-1 font-fn-medium hover:bg-fn-bg-inset focus-visible:bg-fn-bg-inset rounded-fn-xs h-[28px] border border-transparent bg-transparent focus-visible:outline-none',
      variant === 'label' &&
        'border-fn-border-strong bg-fn-bg-panel shadow-fn-xs px-fn-2_5 hover:border-fn-fg-faint focus-visible:border-fn-accent focus-visible:ring-fn-accent disabled:bg-fn-bg-inset h-[34px] border focus-visible:outline-none focus-visible:ring-1',
      className,
    )}
    {...props}
  >
    {variant === 'label' && label && (
      <span className="text-fn-fg-faint font-fn-medium text-fn-sm-plus shrink-0">{label}:</span>
    )}
    <span className="min-w-0 flex-1 truncate text-left">{children}</span>
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="text-fn-fg-faint h-fn-3_5 w-fn-3_5 shrink-0" />
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

interface SelectItemProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> {
  /** Optional leading element (lucide icon, colored tile, avatar). */
  icon?: React.ReactNode;
  /** Optional trailing meta (count, tag, secondary string). */
  meta?: React.ReactNode;
}

const SelectItem = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Item>, SelectItemProps>(
  ({ className, children, icon, meta, ...props }, ref) => (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        'rounded-fn-xs text-fn-fg py-fn-1_5 pl-fn-8 pr-fn-2 text-fn-base gap-fn-2 relative flex w-full cursor-pointer select-none items-center outline-none',
        'focus:bg-fn-bg-inset focus:text-fn-fg',
        'data-[state=checked]:font-fn-medium data-[state=checked]:bg-fn-accent-soft/60',
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
      {icon && (
        <span className="text-fn-fg-muted -ml-fn-1 shrink-0" aria-hidden>
          {icon}
        </span>
      )}
      <SelectPrimitive.ItemText asChild>
        <span className="min-w-0 flex-1 truncate">{children}</span>
      </SelectPrimitive.ItemText>
      {meta && (
        <span className="text-fn-fg-faint text-fn-sm-plus ml-auto shrink-0 tabular-nums">
          {meta}
        </span>
      )}
    </SelectPrimitive.Item>
  ),
);
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
