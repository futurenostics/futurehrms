'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFilterDispatch, useFiltersContext } from './context';
import type { FilterSchema, FilterSection, FilterState, FilterValue } from './types';

/**
 * Selected-filter chips that render below the search bar on the host
 * page. Each chip:
 *   • shows "<Section>: <option label>" (or range/date summary)
 *   • has an × to remove that specific selection
 *
 * Reads state directly from the store so it stays in sync without
 * the host page having to plumb state through.
 */

export interface ChipsBarProps {
  schema: FilterSchema;
  /** Optional override for "Clear all" link copy. */
  clearAllLabel?: string;
}

export const ChipsBar = React.memo(function ChipsBar({
  schema,
  clearAllLabel = 'Clear all',
}: ChipsBarProps) {
  const ctx = useFiltersContext();
  const dispatch = useFilterDispatch();
  const state = React.useSyncExternalStore(ctx.subscribe, ctx.getSnapshot, ctx.getSnapshot);

  const chips = React.useMemo(() => buildChips(schema, state), [schema, state]);

  if (chips.length === 0) return null;

  return (
    <div className="gap-fn-1_5 flex flex-wrap items-center">
      {chips.map((chip) => (
        <Badge key={chip.id} tone="accent" className="gap-fn-1_5 pr-fn-1">
          <span className="text-fn-fg-faint mr-fn-0_5 tracking-fn-uppercase-tight text-[10.5px] uppercase">
            {chip.sectionTitle}:
          </span>
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={() => chip.remove(dispatch)}
            className="hover:bg-fn-accent-soft-fg/15 ml-fn-0_5 rounded-fn-2xs p-fn-0_5 cursor-pointer"
            aria-label={`Remove ${chip.sectionTitle} ${chip.label}`}
          >
            <X className="h-fn-2_5 w-fn-2_5" />
          </button>
        </Badge>
      ))}
      <button
        type="button"
        onClick={() => dispatch({ type: 'CLEAR_ALL' })}
        className="text-fn-fg-faint hover:text-fn-fg font-fn-medium ml-fn-1 cursor-pointer text-[12px] hover:underline"
      >
        {clearAllLabel}
      </button>
    </div>
  );
});

interface Chip {
  id: string;
  sectionTitle: string;
  label: string;
  remove(dispatch: ReturnType<typeof useFilterDispatch>): void;
}

function buildChips(schema: FilterSchema, state: FilterState): Chip[] {
  const out: Chip[] = [];
  for (const section of schema.sections) {
    const value = state[section.key];
    if (!value) continue;
    out.push(...chipsForSection(section, value));
  }
  return out;
}

function chipsForSection(section: FilterSection, value: FilterValue): Chip[] {
  switch (value.kind) {
    case 'multi':
    case 'flags': {
      const sectionOpts = 'options' in section ? section.options : [];
      return value.ids.map((id) => {
        const opt = sectionOpts.find((o) => o.id === id);
        return {
          id: `${section.key}:${id}`,
          sectionTitle: section.title,
          label: opt?.label ?? id,
          remove(dispatch) {
            const kind = value.kind;
            dispatch({
              type: 'SET_SECTION',
              key: section.key,
              value: { kind, ids: value.ids.filter((x) => x !== id) } as FilterValue,
            });
          },
        };
      });
    }
    case 'single': {
      if (value.id === null) return [];
      const sectionOpts = 'options' in section ? section.options : [];
      const opt = sectionOpts.find((o) => o.id === value.id);
      return [
        {
          id: `${section.key}:${value.id}`,
          sectionTitle: section.title,
          label: opt?.label ?? value.id,
          remove(dispatch) {
            dispatch({ type: 'CLEAR_SECTION', key: section.key });
          },
        },
      ];
    }
    case 'range': {
      if (value.min === null && value.max === null) return [];
      const label =
        value.min !== null && value.max !== null
          ? `${value.min.toLocaleString()} – ${value.max.toLocaleString()}`
          : value.min !== null
            ? `≥ ${value.min.toLocaleString()}`
            : `≤ ${value.max!.toLocaleString()}`;
      return [
        {
          id: section.key,
          sectionTitle: section.title,
          label,
          remove(dispatch) {
            dispatch({ type: 'CLEAR_SECTION', key: section.key });
          },
        },
      ];
    }
    case 'date-range': {
      if (!value.preset && !value.from && !value.to) return [];
      const presets = 'presets' in section ? section.presets : [];
      const presetLabel = value.preset ? presets.find((p) => p.id === value.preset)?.label : null;
      const label =
        presetLabel ??
        (value.from && value.to
          ? `${value.from} – ${value.to}`
          : value.from
            ? `from ${value.from}`
            : `until ${value.to}`);
      return [
        {
          id: section.key,
          sectionTitle: section.title,
          label,
          remove(dispatch) {
            dispatch({ type: 'CLEAR_SECTION', key: section.key });
          },
        },
      ];
    }
  }
}
