'use client';

import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

/**
 * Combobox primitive.
 *
 * Searchable single-select. Trigger looks identical to a SelectTrigger
 * (same dimensions, same chrome) so a Combobox can swap in wherever a
 * Select would have been the wrong fit due to long option lists or
 * type-to-filter requirements.
 *
 * Used by (parked employee-sheet refactor):
 *   - Department picker
 *   - Designation picker (filtered by selected department)
 *   - Manager picker (active employees, excluded self when editing)
 *
 * API
 *   <Combobox
 *     options={[{ value, label, description?, group? }]}
 *     value={value}
 *     onValueChange={setValue}
 *     placeholder="Pick…"
 *     searchPlaceholder="Search…"
 *     emptyText="No matches"
 *     disabled?
 *     aria-invalid?
 *   />
 *
 * Single-select only by design. Multi-select would need a different
 * API (chips in the trigger) — defer to a future MultiCombobox if and
 * when the use case appears.
 */
export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  /** Optional group heading; consecutive items with the same group string get grouped. */
  group?: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  'aria-invalid'?: boolean;
  id?: string;
  name?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No results.',
  disabled,
  className,
  id,
  ...rest
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);

  // Group items by `group` (cmdk renders one CommandGroup per heading).
  const grouped = React.useMemo(() => {
    const map = new Map<string, ComboboxOption[]>();
    for (const o of options) {
      const key = o.group ?? '';
      const arr = map.get(key) ?? [];
      arr.push(o);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [options]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          className={cn(
            'rounded-fn-xs border-fn-border-strong bg-fn-bg-panel text-fn-fg shadow-fn-xs px-fn-2_5 text-fn-base flex h-[34px] w-full cursor-pointer items-center justify-between border transition-colors',
            'hover:border-fn-fg-faint',
            'focus-visible:border-fn-accent focus-visible:ring-fn-accent focus-visible:outline-none focus-visible:ring-1',
            'aria-invalid:border-fn-danger aria-invalid:focus-visible:ring-fn-danger',
            'disabled:bg-fn-bg-inset disabled:text-fn-fg-muted disabled:cursor-not-allowed',
            !selected && 'text-fn-fg-faint',
            className,
          )}
          {...rest}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronDown className="text-fn-fg-faint h-fn-3_5 w-fn-3_5 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        sideOffset={4}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {grouped.map(([heading, items]) => (
              <CommandGroup key={heading || '_'} heading={heading || undefined}>
                {items.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <CommandItem
                      key={opt.value}
                      value={opt.value}
                      keywords={[opt.label, opt.description ?? '']}
                      onSelect={(v) => {
                        onValueChange?.(v);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'h-fn-3_5 w-fn-3_5 text-fn-accent shrink-0',
                          isSelected ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <span className="gap-fn-0_25 flex min-w-0 flex-1 flex-col">
                        <span className="truncate">{opt.label}</span>
                        {opt.description && (
                          <span className="text-fn-fg-faint text-fn-sm-plus truncate">
                            {opt.description}
                          </span>
                        )}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
