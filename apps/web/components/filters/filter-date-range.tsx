'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { FilterPillGroup, type FilterPillOption } from './filter-pill-group';

/**
 * Date-range filter — matches PNG 199 + PNG 201 Joining Date section.
 *
 * Preset chip row → two date inputs. The default preset list covers
 * the design's options (Any / Last 30d / Last 90d / This year / Last
 * year / Custom). Consumers can pass a custom list for entity-specific
 * windows (e.g. project start dates, run months).
 *
 * The PNG-201 inline calendar is intentionally deferred for v1 — we
 * use native <input type="date"> which matches the design's text
 * input fields and gives every browser a calendar popout for free.
 */

export interface DatePreset {
  id: string;
  label: string;
  /** Returns { from, to } in ISO YYYY-MM-DD relative to today. */
  resolve(): { from: string; to: string };
}

const today = () => new Date();
const fmt = (d: Date) => d.toISOString().slice(0, 10);

export const DEFAULT_DATE_PRESETS: DatePreset[] = [
  {
    id: 'any',
    label: 'Any',
    resolve: () => ({ from: '', to: '' }),
  },
  {
    id: 'last-30d',
    label: 'Last 30d',
    resolve: () => {
      const t = today();
      const f = new Date(t);
      f.setDate(f.getDate() - 30);
      return { from: fmt(f), to: fmt(t) };
    },
  },
  {
    id: 'last-90d',
    label: 'Last 90d',
    resolve: () => {
      const t = today();
      const f = new Date(t);
      f.setDate(f.getDate() - 90);
      return { from: fmt(f), to: fmt(t) };
    },
  },
  {
    id: 'this-year',
    label: 'This year',
    resolve: () => {
      const t = today();
      return { from: fmt(new Date(t.getUTCFullYear(), 0, 1)), to: fmt(t) };
    },
  },
  {
    id: 'last-year',
    label: 'Last year',
    resolve: () => {
      const t = today();
      const year = t.getUTCFullYear() - 1;
      return { from: fmt(new Date(year, 0, 1)), to: fmt(new Date(year, 11, 31)) };
    },
  },
  {
    id: 'custom',
    label: 'Custom',
    resolve: () => ({ from: '', to: '' }),
  },
];

export interface FilterDateRangeProps {
  value: { preset: string | null; from: string | null; to: string | null };
  onValueChange: (next: { preset: string | null; from: string | null; to: string | null }) => void;
  presets?: DatePreset[];
  fromPlaceholder?: string;
  toPlaceholder?: string;
}

export function FilterDateRange({
  value,
  onValueChange,
  presets = DEFAULT_DATE_PRESETS,
  fromPlaceholder = '01 Jan 2026',
  toPlaceholder = 'Today',
}: FilterDateRangeProps) {
  const pillOptions: FilterPillOption[] = presets.map((p) => ({
    id: p.id,
    label: p.label,
  }));

  function selectPreset(id: string | null) {
    if (id === null) {
      onValueChange({ preset: null, from: null, to: null });
      return;
    }
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    if (id === 'custom') {
      onValueChange({ preset: 'custom', from: value.from, to: value.to });
      return;
    }
    if (id === 'any') {
      onValueChange({ preset: null, from: null, to: null });
      return;
    }
    const resolved = preset.resolve();
    onValueChange({ preset: id, from: resolved.from || null, to: resolved.to || null });
  }

  return (
    <div className="gap-fn-3 flex flex-col">
      <FilterPillGroup
        mode="single"
        options={pillOptions}
        value={value.preset}
        onValueChange={selectPreset}
      />
      <div className="gap-fn-2 flex items-center">
        <Input
          type="date"
          value={value.from ?? ''}
          placeholder={fromPlaceholder}
          onChange={(e) =>
            onValueChange({ preset: 'custom', from: e.target.value || null, to: value.to })
          }
          className="h-fn-7 flex-1"
        />
        <span className="text-fn-fg-faint" aria-hidden>
          —
        </span>
        <Input
          type="date"
          value={value.to ?? ''}
          placeholder={toPlaceholder}
          onChange={(e) =>
            onValueChange({ preset: 'custom', from: value.from, to: e.target.value || null })
          }
          className="h-fn-7 flex-1"
        />
      </div>
    </div>
  );
}
