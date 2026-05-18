'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { FilterMultiSelectOption } from './filter-multi-select';

/**
 * Searchable multi-select — matches PNG 199 Designation section.
 *
 * Search input + filtered rows + "Show <N> more" expander when the
 * list is longer than `initialVisible` rows.
 */

export interface FilterSearchableListProps {
  options: FilterMultiSelectOption[];
  values: string[];
  onValuesChange: (next: string[]) => void;
  placeholder?: string;
  /** How many rows to show before "Show N more" expander kicks in. */
  initialVisible?: number;
}

export function FilterSearchableList({
  options,
  values,
  onValuesChange,
  placeholder = 'Search…',
  initialVisible = 6,
}: FilterSearchableListProps) {
  const [query, setQuery] = React.useState('');
  const [expanded, setExpanded] = React.useState(false);
  const set = new Set(values);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query]);

  const visible = expanded || query ? filtered : filtered.slice(0, initialVisible);
  const hiddenCount = expanded || query ? 0 : Math.max(0, filtered.length - visible.length);

  function toggle(id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onValuesChange([...next]);
  }

  return (
    <div className="gap-fn-2 flex flex-col">
      <div className="relative">
        <Search className="text-fn-fg-faint left-fn-2_5 h-fn-3_5 w-fn-3_5 pointer-events-none absolute top-1/2 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-fn-8 h-fn-7"
        />
      </div>

      {visible.length === 0 ? (
        <p className="text-fn-fg-faint px-fn-2 py-fn-3 text-center text-[12px]">No matches</p>
      ) : (
        <ul className="gap-fn-0_5 flex flex-col">
          {visible.map((opt) => {
            const checked = set.has(opt.id);
            return (
              <li key={opt.id}>
                <label
                  className={cn(
                    'rounded-fn-xs px-fn-2 py-fn-1_5 gap-fn-2_5 hover:bg-fn-bg-inset flex items-center text-[12.5px] transition-colors',
                    opt.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    disabled={opt.disabled}
                    onCheckedChange={() => toggle(opt.id)}
                  />
                  <span className="text-fn-fg font-fn-medium flex-1 truncate">{opt.label}</span>
                  {opt.count !== undefined && (
                    <span className="text-fn-fg-faint shrink-0 text-[11.5px] tabular-nums">
                      {opt.count}
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-fn-accent-soft-fg font-fn-semibold px-fn-2 cursor-pointer self-start text-[11.5px] hover:underline"
        >
          Show {hiddenCount} more →
        </button>
      )}
    </div>
  );
}
