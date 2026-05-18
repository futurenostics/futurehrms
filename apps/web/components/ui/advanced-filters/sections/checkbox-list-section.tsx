'use client';

import * as React from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useFilterDispatch, useSectionCounts, useSectionValue } from '../context';
import { SectionCard } from '../section-card';
import type { CheckboxListSection as CheckboxListSectionDef, FilterOption } from '../types';

/**
 * Searchable / collapsing checkbox list — Department, Designation,
 * Tenure. Each row:
 *
 *   [✓] [hue dot] Engineering                                 28
 *
 * Selected rows render with a soft accent-tinted background so the
 * selection stands out without color-coding every option.
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
            className="text-fn-fg-faint left-fn-2_5 h-fn-3_5 w-fn-3_5 pointer-events-none absolute top-1/2 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${section.title.toLowerCase()}…`}
            className="pl-fn-8"
          />
        </div>
      )}
      <ul className="gap-fn-0_5 flex flex-col">
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
          className="text-fn-accent hover:text-fn-accent/80 gap-fn-1 mt-fn-2 font-fn-semibold inline-flex cursor-pointer items-center text-[12.5px]"
        >
          Show {hiddenCount} more <ArrowRight className="h-fn-3 w-fn-3" />
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
          'rounded-fn-xs px-fn-2 py-fn-2 gap-fn-2_5 flex items-center text-[13px] transition-colors',
          checked ? 'bg-fn-accent-soft/40' : 'hover:bg-fn-bg-inset',
          option.disabled || dimmed ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        )}
      >
        <Checkbox
          checked={checked}
          disabled={option.disabled}
          onCheckedChange={() => onToggle(option.id)}
        />
        {typeof option.hue === 'number' && (
          <span
            aria-hidden
            className="h-fn-2 w-fn-2 rounded-fn-full shrink-0"
            style={{ background: `oklch(0.6 0.15 ${option.hue})` }}
          />
        )}
        {option.icon && !option.hue && (
          <span
            aria-hidden
            className="text-fn-fg-muted h-fn-3_5 w-fn-3_5 inline-flex shrink-0 items-center justify-center"
          >
            {option.icon}
          </span>
        )}
        <span
          className={cn(
            'flex-1 truncate',
            checked ? 'text-fn-fg font-fn-semibold' : 'text-fn-fg-muted font-fn-medium',
          )}
        >
          {option.label}
        </span>
        {typeof count === 'number' && (
          <span className="text-fn-fg-faint text-[12px] tabular-nums">{count}</span>
        )}
      </label>
    </li>
  );
});
