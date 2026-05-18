'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';

/**
 * Section card chrome — matches PNG 199/200/201. Each section in the
 * drawer is wrapped in this card; the body is the per-type widget.
 *
 *   [icon] [TITLE] [count badge]                          [Clear]
 *   ─────────────────────────────────────────────────────────────
 *   <children>
 *
 * Always expanded — the design intentionally has no collapse toggle.
 */

export interface SectionCardProps {
  icon?: React.ReactNode;
  title: string;
  /** Active selection count for this section — drives the inline badge and Clear button. */
  count?: number;
  onClear?: () => void;
  children: React.ReactNode;
}

export const SectionCard = React.memo(function SectionCard({
  icon,
  title,
  count = 0,
  onClear,
  children,
}: SectionCardProps) {
  const showClear = count > 0 && !!onClear;
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
            onClick={onClear}
            className="text-fn-fg-faint hover:text-fn-fg font-fn-medium cursor-pointer text-[11px] hover:underline"
          >
            Clear
          </button>
        )}
      </header>
      <div className="px-fn-3 py-fn-3">{children}</div>
    </section>
  );
});
