'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Collapsible filter section card — matches PNG 199.
 *
 *   [icon] [TITLE] [count badge]                          [Clear ▼]
 *   ─────────────────────────────────────────────────────────────
 *   <children>
 *
 * Header is sticky-on-collapse. Active count badge only renders when
 * `count > 0`. Clear link only renders when `onClear` is provided AND
 * count > 0.
 */

export interface FilterSectionProps {
  icon?: React.ReactNode;
  title: string;
  /** Number of selections inside this section — drives the badge + clear link. */
  count?: number;
  defaultOpen?: boolean;
  onClear?: () => void;
  children: React.ReactNode;
}

export function FilterSection({
  icon,
  title,
  count = 0,
  defaultOpen = true,
  onClear,
  children,
}: FilterSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const showClear = count > 0 && onClear;

  return (
    <section className="rounded-fn-sm border-fn-border bg-fn-bg-panel overflow-hidden border">
      <header className="border-fn-divider gap-fn-2 px-fn-3 py-fn-2_5 flex items-center justify-between border-b">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="gap-fn-2 flex flex-1 cursor-pointer items-center text-left"
        >
          {icon && (
            <span
              aria-hidden
              className="text-fn-fg-muted h-fn-3_5 w-fn-3_5 inline-flex shrink-0 items-center justify-center"
            >
              {icon}
            </span>
          )}
          <span className="text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight text-[11px] uppercase">
            {title}
          </span>
          {count > 0 && (
            <Badge tone="accent" className="tabular-nums">
              {count}
            </Badge>
          )}
        </button>
        <div className="gap-fn-2 flex items-center">
          {showClear && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear?.();
              }}
              className="text-fn-fg-faint hover:text-fn-fg font-fn-medium cursor-pointer text-[11px] hover:underline"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Collapse' : 'Expand'}
            className="text-fn-fg-faint hover:text-fn-fg cursor-pointer"
          >
            <ChevronDown
              className={cn('h-fn-4 w-fn-4 transition-transform', !open && '-rotate-90')}
            />
          </button>
        </div>
      </header>
      {open && <div className="px-fn-3 py-fn-3">{children}</div>}
    </section>
  );
}
