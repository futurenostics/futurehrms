'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';

/**
 * Filter section card — matches PNG 199/200/201.
 *
 *   [icon] [TITLE] [count badge]                          [Clear]
 *   ─────────────────────────────────────────────────────────────
 *   <children>
 *
 * Always expanded — the design intentionally avoids a collapse
 * affordance so every filter section is visible at a glance. If a
 * particular surface needs section-level collapse later, build a
 * dedicated `<CollapsibleFilterSection>` rather than reintroducing
 * the toggle here (so the default behaviour stays flat).
 *
 * Active count badge only renders when `count > 0`. The Clear link
 * only renders when `onClear` is provided AND `count > 0`.
 */

export interface FilterSectionProps {
  icon?: React.ReactNode;
  title: string;
  /** Number of selections inside this section — drives the badge + Clear link. */
  count?: number;
  onClear?: () => void;
  children: React.ReactNode;
}

export function FilterSection({ icon, title, count = 0, onClear, children }: FilterSectionProps) {
  const showClear = count > 0 && onClear;

  return (
    <section className="rounded-fn-sm border-fn-border bg-fn-bg-panel overflow-hidden border">
      <header className="border-fn-divider gap-fn-2 px-fn-3 py-fn-2_5 flex items-center justify-between border-b">
        <div className="gap-fn-2 flex flex-1 items-center">
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
        </div>
        {showClear && (
          <button
            type="button"
            onClick={() => onClear?.()}
            className="text-fn-fg-faint hover:text-fn-fg font-fn-medium cursor-pointer text-[11px] hover:underline"
          >
            Clear
          </button>
        )}
      </header>
      <div className="px-fn-3 py-fn-3">{children}</div>
    </section>
  );
}
