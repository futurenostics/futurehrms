'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Section row — matches PNG 199 (flat layout, no card chrome).
 *
 *   [icon] [TITLE] [count pill]                    [Clear] [chevron]
 *   ──────────────────────────────────────────────────────────────
 *   <children>
 *   ──────────────────────────────────────────────────────────────
 *
 * Sections are separated by a single bottom divider; there is no border
 * box around each one. The chevron is visual only (the design has it on
 * every section) — sections always render expanded.
 *
 * The count pill is a small purple capsule, not the standard Badge,
 * because the design treats it as part of the section title rather
 * than as a status label.
 */

export interface SectionCardProps {
  icon?: React.ReactNode;
  title: string;
  /** Active selection count — drives the inline pill and Clear button visibility. */
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
    <section className="border-fn-divider border-b last:border-b-0">
      <header className="gap-fn-2 py-fn-3 flex items-center">
        <div className="gap-fn-2 flex flex-1 items-center">
          {icon && (
            <span
              aria-hidden
              className="text-fn-fg-muted h-fn-4 w-fn-4 inline-flex shrink-0 items-center justify-center"
            >
              {icon}
            </span>
          )}
          <span className="text-fn-fg font-fn-bold tracking-fn-uppercase-tight text-[12px] uppercase">
            {title}
          </span>
          {count > 0 && (
            <span className="rounded-fn-full bg-fn-accent text-fn-accent-fg px-fn-1_5 py-fn-0_5 font-fn-semibold min-w-fn-5 inline-flex items-center justify-center text-[10.5px] tabular-nums">
              {count}
            </span>
          )}
        </div>
        {showClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-fn-accent hover:text-fn-accent/80 font-fn-medium cursor-pointer text-[12px]"
          >
            Clear
          </button>
        )}
        <ChevronDown aria-hidden className="text-fn-fg-faint h-fn-3_5 w-fn-3_5 shrink-0" />
      </header>
      <div className="pb-fn-4">{children}</div>
    </section>
  );
});
