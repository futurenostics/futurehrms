'use client';

import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Command — command palette / searchable-list primitive backed by cmdk.
 *
 * Used as the body of Combobox (Department / Designation / Manager
 * pickers) and as the standalone palette for future ⌘K search.
 *
 * Each sub-component mirrors cmdk's structure (Root / Input / List /
 * Item / Group / Separator / Empty) styled to the design tokens.
 */

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      'rounded-fn-xs bg-fn-bg-panel text-fn-fg flex h-full w-full flex-col overflow-hidden',
      className,
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div
    className="border-fn-divider gap-fn-2 px-fn-3 flex items-center border-b"
    cmdk-input-wrapper=""
  >
    <Search className="text-fn-fg-faint h-fn-3_5 w-fn-3_5 shrink-0" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        'placeholder:text-fn-fg-faint text-fn-base h-[34px] w-full bg-transparent outline-none disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  </div>
));
CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn(
      // cmdk sets --cmdk-list-height to the natural content height. We
      // clamp to 320px so the dropdown gains a vertical scrollbar once
      // the list exceeds that, while still shrinking neatly for short
      // lists. The Webkit scrollbar overrides below ensure the bar is
      // visible (not auto-hidden) on macOS.
      'p-fn-1 overflow-y-auto overflow-x-hidden',
      '[&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-[8px]',
      '[&::-webkit-scrollbar-thumb]:rounded-fn-full [&::-webkit-scrollbar-thumb]:bg-fn-border-strong [&::-webkit-scrollbar-thumb:hover]:bg-fn-fg-faint',
      className,
    )}
    style={{
      height: 'min(320px, var(--cmdk-list-height))',
      transitionProperty: 'height',
      transitionDuration: '120ms',
    }}
    {...props}
  />
));
CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="text-fn-fg-muted text-fn-base py-fn-6 text-center"
    {...props}
  />
));
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      // Don't clip the group — that interferes with cmdk's internal
      // height measurement and prevents the outer CommandList scroll
      // from triggering on grouped lists (field picker, event picker,
      // notification-type picker).
      'text-fn-fg',
      // cmdk adds `[cmdk-group-heading]` styling for the group label
      '[&_[cmdk-group-heading]]:text-fn-fg-faint [&_[cmdk-group-heading]]:px-fn-2 [&_[cmdk-group-heading]]:py-fn-1_5 [&_[cmdk-group-heading]]:text-fn-sm [&_[cmdk-group-heading]]:font-fn-semibold [&_[cmdk-group-heading]]:tracking-fn-uppercase-tight [&_[cmdk-group-heading]]:uppercase',
      className,
    )}
    {...props}
  />
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn('bg-fn-divider -mx-fn-1 my-fn-1 h-px', className)}
    {...props}
  />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      'rounded-fn-xs text-fn-fg py-fn-1_5 px-fn-2 text-fn-base gap-fn-2 relative flex cursor-pointer select-none items-center outline-none',
      'data-[selected=true]:bg-fn-bg-inset data-[selected=true]:text-fn-fg',
      'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
      className,
    )}
    {...props}
  />
));
CommandItem.displayName = CommandPrimitive.Item.displayName;

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandSeparator,
  CommandItem,
};
