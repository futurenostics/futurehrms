'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type FilterState, isFilterActive, type SectionDescriptor } from './types';

/**
 * Active-filters strip — matches the "6 FILTERS · Engineering ·
 * Sr. Engineer · Probation · Salary 250-400k · Joined 2024+ ·
 * Payoneer ✓" row from PNG 199.
 *
 * Sits above the DataTable so the user always sees what's narrowing
 * the result set without re-opening the drawer. Each chip has an X
 * that clears that section.
 *
 * The consumer provides a list of SectionDescriptors that know how
 * to render their own value as text. The bar is otherwise generic.
 */

export interface FilterChipsBarProps {
  state: FilterState;
  sections: SectionDescriptor[];
  matchedCount?: number;
  totalCount?: number;
  onClearSection: (key: string) => void;
  onClearAll: () => void;
  onOpenPanel?: () => void;
  className?: string;
}

export function FilterChipsBar({
  state,
  sections,
  matchedCount,
  totalCount,
  onClearSection,
  onClearAll,
  onOpenPanel,
  className,
}: FilterChipsBarProps) {
  const active = sections
    .map((s) => ({ section: s, text: s.renderChip(state[s.key]) }))
    .filter((entry): entry is { section: SectionDescriptor; text: string } => entry.text !== null);

  if (active.length === 0) return null;

  return (
    <div
      className={cn(
        'border-fn-border bg-fn-bg-inset/40 rounded-fn-sm px-fn-3 py-fn-2 gap-fn-2 flex flex-wrap items-center border',
        className,
      )}
    >
      <Badge tone="accent" className="shrink-0 tabular-nums">
        {active.length} {active.length === 1 ? 'filter' : 'filters'}
      </Badge>
      {active.map(({ section, text }) => (
        <button
          key={section.key}
          type="button"
          onClick={() => onClearSection(section.key)}
          className={cn(
            'rounded-fn-xs border-fn-accent/30 bg-fn-accent-soft text-fn-accent-soft-fg gap-fn-1_5 px-fn-2 py-fn-0_5 font-fn-medium inline-flex cursor-pointer items-center border text-[11.5px] transition-colors hover:opacity-80',
          )}
          title={`Clear ${section.label}`}
        >
          <span className="text-fn-fg-faint">{section.label}:</span>
          <span>{text}</span>
          <X className="h-fn-2_5 w-fn-2_5" />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-fn-fg-faint hover:text-fn-fg font-fn-medium cursor-pointer text-[11.5px] hover:underline"
      >
        Clear all
      </button>
      {typeof matchedCount === 'number' && typeof totalCount === 'number' && (
        <span className="text-fn-fg-faint ml-auto text-[11.5px] tabular-nums">
          {matchedCount.toLocaleString()} of {totalCount.toLocaleString()}
        </span>
      )}
      {onOpenPanel && (
        <Button variant="ghost" size="sm" onClick={onOpenPanel}>
          Edit
        </Button>
      )}
    </div>
  );
}

/** Mark this section's value as inactive (used by `unset` helpers). */
export function makeChipText<T extends FilterState[string]>(
  value: T | undefined,
  render: (active: T) => string,
): string | null {
  if (!value || !isFilterActive(value)) return null;
  return render(value);
}
