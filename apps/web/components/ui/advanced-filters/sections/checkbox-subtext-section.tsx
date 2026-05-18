'use client';

import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useFilterDispatch, useSectionCounts, useSectionValue } from '../context';
import { SectionCard } from '../section-card';
import type {
  CheckboxWithSubtextSection as CheckboxSubtextSectionDef,
  FilterOption,
} from '../types';

/**
 * Checkbox list with a secondary subtitle line per option —
 * matches PNG 199 Compensation section.
 *
 *   ☐ Payoneer linked (USD payouts)
 *     32 employees · earns commission
 *
 * Distinct from `checkbox-list-section` only in that subtitles render
 * inline beneath the label, and the value is encoded as `flags` so the
 * URL key stays stable when the consumer swaps option enum labels.
 */

export const CheckboxSubtextSection = React.memo(function CheckboxSubtextSection({
  section,
}: {
  section: CheckboxSubtextSectionDef;
}) {
  const value = useSectionValue(section.key);
  const counts = useSectionCounts(section.key);
  const dispatch = useFilterDispatch();

  const ids = value?.kind === 'flags' ? value.ids : [];
  const set = React.useMemo(() => new Set(ids), [ids]);

  const onToggle = React.useCallback(
    (id: string) => {
      const isOn = set.has(id);
      const nextIds = isOn ? ids.filter((x) => x !== id) : [...ids, id];
      dispatch({
        type: 'SET_SECTION',
        key: section.key,
        value: { kind: 'flags', ids: nextIds },
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
      <ul className="gap-fn-1 flex flex-col">
        {section.options.map((opt) => (
          <Row
            key={opt.id}
            option={opt}
            checked={set.has(opt.id)}
            count={counts?.[opt.id]}
            onToggle={onToggle}
          />
        ))}
      </ul>
    </SectionCard>
  );
});

const Row = React.memo(function Row({
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
          'rounded-fn-xs px-fn-2 py-fn-1_5 gap-fn-2_5 hover:bg-fn-bg-inset flex items-start text-[12.5px] transition-colors',
          option.disabled || dimmed ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        )}
      >
        <Checkbox
          checked={checked}
          disabled={option.disabled}
          onCheckedChange={() => onToggle(option.id)}
          className="mt-fn-0_5"
        />
        <div className="gap-fn-0_5 flex min-w-0 flex-1 flex-col">
          <div className="gap-fn-2 flex items-center">
            <span className="text-fn-fg font-fn-medium flex-1 truncate">{option.label}</span>
            {typeof count === 'number' && (
              <span className="text-fn-fg-faint text-[11px] tabular-nums">{count}</span>
            )}
          </div>
          {option.description && (
            <span className="text-fn-fg-faint text-[11px]">{option.description}</span>
          )}
        </div>
      </label>
    </li>
  );
});
