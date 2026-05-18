'use client';

import * as React from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useFilterDispatch, useSectionCounts, useSectionValue } from '../context';
import { SectionCard } from '../section-card';
import type { CheckboxListSection as CheckboxListSectionDef, FilterOption } from '../types';

/**
 * Searchable / collapsing checkbox list — Department, Designation,
 * Status, etc.
 *
 * • Reads only its own slice via `useSectionValue(key)` — siblings
 *   never re-render when this list toggles.
 * • Per-option counts dim 0-result options when counts are available.
 * • `showLimit` collapses past N items behind a "Show all (N)" toggle.
 */

export const CheckboxListSection = React.memo(function CheckboxListSection({
  section,
}: {
  section: CheckboxListSectionDef;
}) {
  const value = useSectionValue(section.key);
  const counts = useSectionCounts(section.key);
  const dispatch = useFilterDispatch();

  const ids = value?.kind === 'multi' ? value.ids : [];
  const set = React.useMemo(() => new Set(ids), [ids]);

  const [query, setQuery] = React.useState('');
  const [expanded, setExpanded] = React.useState(false);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return section.options;
    const q = query.trim().toLowerCase();
    return section.options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || (o.description?.toLowerCase().includes(q) ?? false),
    );
  }, [section.options, query]);

  const limit = section.showLimit;
  const visible = !limit || expanded ? filtered : filtered.slice(0, limit);
  const hiddenCount = filtered.length - visible.length;

  const onToggle = React.useCallback(
    (id: string) => {
      const isOn = set.has(id);
      const nextIds = isOn ? ids.filter((x) => x !== id) : [...ids, id];
      dispatch({
        type: 'SET_SECTION',
        key: section.key,
        value: { kind: 'multi', ids: nextIds },
      });
    },
    [dispatch, section.key, set, ids],
  );

  const onClear = React.useCallback(
    () => dispatch({ type: 'CLEAR_SECTION', key: section.key }),
    [dispatch, section.key],
  );

  return (
    <SectionCard icon={section.icon} title={section.title} count={ids.length} onClear={onClear}>
      {section.searchable && (
        <div className="mb-fn-2 relative">
          <Search
            className="text-fn-fg-faint left-fn-2 h-fn-3_5 w-fn-3_5 pointer-events-none absolute top-1/2 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${section.title.toLowerCase()}…`}
            className="pl-fn-7"
          />
        </div>
      )}
      <ul className="gap-fn-1 flex flex-col">
        {visible.map((opt) => (
          <CheckboxRow
            key={opt.id}
            option={opt}
            checked={set.has(opt.id)}
            count={counts?.[opt.id]}
            onToggle={onToggle}
          />
        ))}
      </ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-fn-accent-soft-fg hover:text-fn-accent hover:bg-fn-accent-soft/40 rounded-fn-xs gap-fn-1 mt-fn-2 px-fn-2 py-fn-1_5 font-fn-medium inline-flex w-full cursor-pointer items-center justify-center text-[11.5px]"
        >
          <ChevronDown className="h-fn-3 w-fn-3" /> Show all ({filtered.length})
        </button>
      )}
      {section.searchable && filtered.length === 0 && (
        <p className="text-fn-fg-faint py-fn-3 text-center text-[12px]">
          No {section.title.toLowerCase()} match &ldquo;{query}&rdquo;.
        </p>
      )}
    </SectionCard>
  );
});

const CheckboxRow = React.memo(function CheckboxRow({
  option,
  checked,
  count,
  onToggle,
}: {
  option: FilterOption;
  checked: boolean;
  count: number | undefined;
  onToggle: (id: string) => void;
}) {
  const dimmed = count === 0 && !checked;
  return (
    <li>
      <label
        className={cn(
          'rounded-fn-xs px-fn-2 py-fn-1_5 gap-fn-2 hover:bg-fn-bg-inset flex items-center text-[12.5px] transition-colors',
          option.disabled || dimmed ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        )}
      >
        <Checkbox
          checked={checked}
          disabled={option.disabled}
          onCheckedChange={() => onToggle(option.id)}
        />
        {option.icon && (
          <span
            aria-hidden
            className="text-fn-fg-muted h-fn-3_5 w-fn-3_5 inline-flex shrink-0 items-center justify-center"
          >
            {option.icon}
          </span>
        )}
        <span className="text-fn-fg font-fn-medium flex-1 truncate">{option.label}</span>
        {typeof count === 'number' && (
          <span className="text-fn-fg-faint text-[11px] tabular-nums">{count}</span>
        )}
      </label>
    </li>
  );
});
