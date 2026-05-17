'use client';

import * as React from 'react';
import { Check, ChevronDown, SearchX, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Combobox primitive — single-select and multi-select.
 *
 * Trigger matches SelectTrigger chrome so the two are visually
 * interchangeable in form rows.
 *
 * Reference: docs/design/screens/dropdowns-style-guide/196 _ Combobox.
 *   • single-select with search + check on the right
 *   • rich rows: leading avatar/icon, two-line meta, trailing badge
 *   • async loading: 4 skeleton rows in the list while loading
 *   • no-results: SearchX icon + "No <thing> match …" message
 *   • multi-select: chip rail in the trigger, checkable rows, footer
 *     with Clear all + Apply
 *
 * Options are a flat list; consecutive items with the same `group`
 * are rendered under a single group heading by cmdk.
 */

export interface ComboboxOption {
  value: string;
  label: string;
  /** Secondary line under the label (email, role, location, etc.). */
  description?: string;
  /** Leading slot (avatar circle, lucide icon, colored tile). */
  icon?: React.ReactNode;
  /** Trailing slot — typically a Badge. */
  meta?: React.ReactNode;
  /** Group heading. Consecutive same-string options share one heading. */
  group?: string;
  disabled?: boolean;
  /** Extra strings used for filter matching beyond label + description. */
  keywords?: string[];
}

interface CommonProps {
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  /** Friendly noun for the empty state ("employees", "departments"). */
  emptyLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  'aria-invalid'?: boolean;
  id?: string;
  name?: string;
}

export interface ComboboxProps extends CommonProps {
  value?: string;
  onValueChange?: (value: string) => void;
}

export interface MultiComboboxProps extends CommonProps {
  values: string[];
  onValuesChange: (values: string[]) => void;
  /** Cap chips shown in the trigger; the rest collapse to "+N more". */
  maxChips?: number;
}

/* ────────────────────────── helpers ────────────────────────── */

function groupOptions(options: ComboboxOption[]): Array<[string, ComboboxOption[]]> {
  const map = new Map<string, ComboboxOption[]>();
  for (const o of options) {
    const key = o.group ?? '';
    const arr = map.get(key) ?? [];
    arr.push(o);
    map.set(key, arr);
  }
  return Array.from(map.entries());
}

function LoadingRows() {
  return (
    <div className="gap-fn-1 p-fn-1 flex flex-col">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="px-fn-2 py-fn-1_5 gap-fn-2 flex items-center">
          <Skeleton className="h-fn-3_5 w-fn-3_5 rounded-fn-full shrink-0" />
          <Skeleton className="h-fn-3" style={{ width: `${60 + i * 10}%` }} />
        </div>
      ))}
    </div>
  );
}

function NoResults({ query, label }: { query: string; label: string }) {
  return (
    <div className="gap-fn-2 py-fn-8 flex flex-col items-center justify-center text-center">
      <span
        aria-hidden
        className="bg-fn-bg-inset rounded-fn-full h-fn-9 w-fn-9 text-fn-fg-faint inline-flex items-center justify-center"
      >
        <SearchX className="h-fn-4 w-fn-4" />
      </span>
      <p className="text-fn-fg font-fn-medium text-fn-base">No {label} match</p>
      <p className="text-fn-fg-faint text-fn-sm-plus px-fn-4">
        Nothing matched <span className="text-fn-fg font-fn-medium">&ldquo;{query}&rdquo;</span> —
        try a different search.
      </p>
    </div>
  );
}

const triggerClass = cn(
  'rounded-fn-xs border-fn-border-strong bg-fn-bg-panel text-fn-fg shadow-fn-xs px-fn-2_5 text-fn-base flex w-full cursor-pointer items-center justify-between border transition-colors',
  'hover:border-fn-fg-faint',
  'focus-visible:border-fn-accent focus-visible:ring-fn-accent focus-visible:outline-none focus-visible:ring-1',
  'aria-invalid:border-fn-danger aria-invalid:focus-visible:ring-fn-danger',
  'disabled:bg-fn-bg-inset disabled:text-fn-fg-muted disabled:cursor-not-allowed',
);

/* ────────────────────────── single ────────────────────────── */

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyLabel = 'options',
  loading,
  disabled,
  className,
  id,
  ...rest
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const selected = options.find((o) => o.value === value);
  const grouped = React.useMemo(() => groupOptions(options), [options]);

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
          className={cn(triggerClass, 'h-[34px]', !selected && 'text-fn-fg-faint', className)}
          {...rest}
        >
          <span className="gap-fn-2 flex min-w-0 flex-1 items-center">
            {selected?.icon && (
              <span className="shrink-0" aria-hidden>
                {selected.icon}
              </span>
            )}
            <span className="truncate">{selected?.label ?? placeholder}</span>
          </span>
          <ChevronDown className="text-fn-fg-faint h-fn-3_5 w-fn-3_5 ml-fn-2 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        sideOffset={4}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} />
          <CommandList>
            {loading ? (
              <LoadingRows />
            ) : (
              <>
                <CommandEmpty>
                  <NoResults query={query} label={emptyLabel} />
                </CommandEmpty>
                {grouped.map(([heading, items]) => (
                  <CommandGroup key={heading || '_'} heading={heading || undefined}>
                    {items.map((opt) => {
                      const isSelected = opt.value === value;
                      return (
                        <CommandItem
                          key={opt.value}
                          value={opt.value}
                          disabled={opt.disabled}
                          keywords={[opt.label, opt.description ?? '', ...(opt.keywords ?? [])]}
                          onSelect={(v) => {
                            onValueChange?.(v);
                            setOpen(false);
                          }}
                        >
                          {opt.icon && (
                            <span className="shrink-0" aria-hidden>
                              {opt.icon}
                            </span>
                          )}
                          <span className="gap-fn-0_25 flex min-w-0 flex-1 flex-col">
                            <span className="truncate">{opt.label}</span>
                            {opt.description && (
                              <span className="text-fn-fg-faint text-fn-sm-plus truncate">
                                {opt.description}
                              </span>
                            )}
                          </span>
                          {opt.meta && <span className="ml-fn-2 shrink-0">{opt.meta}</span>}
                          <Check
                            className={cn(
                              'h-fn-3_5 w-fn-3_5 text-fn-accent ml-fn-2 shrink-0',
                              isSelected ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ))}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ────────────────────────── multi ────────────────────────── */

export function MultiCombobox({
  options,
  values,
  onValuesChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyLabel = 'options',
  loading,
  disabled,
  className,
  id,
  maxChips = 3,
  ...rest
}: MultiComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const selectedSet = React.useMemo(() => new Set(values), [values]);
  const selected = options.filter((o) => selectedSet.has(o.value));
  const grouped = React.useMemo(() => groupOptions(options), [options]);

  function toggle(value: string) {
    onValuesChange(selectedSet.has(value) ? values.filter((v) => v !== value) : [...values, value]);
  }

  function clearAll(e: React.MouseEvent) {
    e.stopPropagation();
    onValuesChange([]);
  }

  function removeChip(value: string, e: React.MouseEvent) {
    e.stopPropagation();
    onValuesChange(values.filter((v) => v !== value));
  }

  const visibleChips = selected.slice(0, maxChips);
  const overflow = selected.length - visibleChips.length;

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
            triggerClass,
            'py-fn-1 gap-fn-1_5 h-auto min-h-[34px] items-center',
            selected.length === 0 && 'text-fn-fg-faint',
            className,
          )}
          {...rest}
        >
          <span className="gap-fn-1 flex min-w-0 flex-1 flex-wrap items-center">
            {selected.length === 0 ? (
              <span className="truncate">{placeholder}</span>
            ) : (
              <>
                {visibleChips.map((opt) => (
                  <span
                    key={opt.value}
                    className="bg-fn-accent-soft text-fn-accent-soft-fg border-fn-accent/35 rounded-fn-xs gap-fn-1 px-fn-1_5 py-fn-0_25 text-fn-sm-plus font-fn-medium inline-flex max-w-[160px] items-center border"
                  >
                    <span className="truncate">{opt.label}</span>
                    <span
                      role="button"
                      tabIndex={-1}
                      aria-label={`Remove ${opt.label}`}
                      onClick={(e) => removeChip(opt.value, e)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          removeChip(opt.value, e as unknown as React.MouseEvent);
                        }
                      }}
                      className="hover:bg-fn-accent/15 -mr-fn-0_25 rounded-fn-full h-fn-3 w-fn-3 inline-flex shrink-0 cursor-pointer items-center justify-center"
                    >
                      <X className="h-fn-2_5 w-fn-2_5" />
                    </span>
                  </span>
                ))}
                {overflow > 0 && (
                  <span className="text-fn-fg-muted bg-fn-bg-inset rounded-fn-xs px-fn-1_5 py-fn-0_25 text-fn-sm-plus font-fn-medium">
                    +{overflow} more
                  </span>
                )}
              </>
            )}
          </span>
          {selected.length > 0 && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear selection"
              onClick={clearAll}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  clearAll(e as unknown as React.MouseEvent);
                }
              }}
              className="text-fn-fg-faint hover:text-fn-fg ml-fn-1 shrink-0 cursor-pointer"
            >
              <X className="h-fn-3 w-fn-3" />
            </span>
          )}
          <ChevronDown className="text-fn-fg-faint h-fn-3_5 w-fn-3_5 ml-fn-1 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter>
          <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} />
          <CommandList>
            {loading ? (
              <LoadingRows />
            ) : (
              <>
                <CommandEmpty>
                  <NoResults query={query} label={emptyLabel} />
                </CommandEmpty>
                {grouped.map(([heading, items]) => (
                  <CommandGroup key={heading || '_'} heading={heading || undefined}>
                    {items.map((opt) => {
                      const isSelected = selectedSet.has(opt.value);
                      return (
                        <CommandItem
                          key={opt.value}
                          value={opt.value}
                          disabled={opt.disabled}
                          keywords={[opt.label, opt.description ?? '', ...(opt.keywords ?? [])]}
                          onSelect={() => toggle(opt.value)}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              'h-fn-3_5 w-fn-3_5 rounded-fn-xs border-fn-border-strong inline-flex shrink-0 items-center justify-center border',
                              isSelected && 'bg-fn-accent border-fn-accent text-fn-accent-fg',
                            )}
                          >
                            {isSelected && <Check className="h-fn-2_5 w-fn-2_5" />}
                          </span>
                          {opt.icon && (
                            <span className="shrink-0" aria-hidden>
                              {opt.icon}
                            </span>
                          )}
                          <span className="gap-fn-0_25 flex min-w-0 flex-1 flex-col">
                            <span className="truncate">{opt.label}</span>
                            {opt.description && (
                              <span className="text-fn-fg-faint text-fn-sm-plus truncate">
                                {opt.description}
                              </span>
                            )}
                          </span>
                          {opt.meta && <span className="ml-fn-2 shrink-0">{opt.meta}</span>}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ))}
              </>
            )}
          </CommandList>
          {selected.length > 0 && !loading && (
            <div className="border-fn-divider px-fn-2 py-fn-1_5 gap-fn-2 flex items-center justify-between border-t">
              <span className="text-fn-fg-faint text-fn-sm-plus">{selected.length} selected</span>
              <button
                type="button"
                onClick={() => onValuesChange([])}
                className="text-fn-fg-muted hover:text-fn-fg font-fn-medium text-fn-sm-plus cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
