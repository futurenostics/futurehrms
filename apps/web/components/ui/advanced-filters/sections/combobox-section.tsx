'use client';

import * as React from 'react';
import { MultiCombobox, type ComboboxOption } from '@/components/ui/combobox';
import { useFilterDispatch, useSectionCounts, useSectionValue } from '../context';
import { SectionCard } from '../section-card';
import type { ComboboxSection as ComboboxSectionDef } from '../types';

/**
 * Searchable combobox section — wraps the shared `MultiCombobox`
 * primitive. Used for high-cardinality lookups like Manager where
 * a checkbox list would be unwieldy.
 *
 * Per-option counts (when available) decorate each row's trailing
 * meta slot. We don't dim zero-count rows here because the combobox
 * already filters by user input; the count is informational.
 */

export const ComboboxFilterSection = React.memo(function ComboboxFilterSection({
  section,
}: {
  section: ComboboxSectionDef;
}) {
  const value = useSectionValue(section.key);
  const counts = useSectionCounts(section.key);
  const dispatch = useFilterDispatch();

  const ids = value?.kind === 'multi' ? value.ids : [];

  const options = React.useMemo<ComboboxOption[]>(() => {
    return section.options.map((o) => {
      const count = counts?.[o.id];
      return {
        value: o.id,
        label: o.label,
        description: o.description,
        icon: o.icon,
        meta:
          typeof count === 'number' ? (
            <span className="text-fn-fg-faint text-[11px] tabular-nums">{count}</span>
          ) : undefined,
        disabled: o.disabled,
      };
    });
  }, [section.options, counts]);

  const onValuesChange = React.useCallback(
    (next: string[]) => {
      dispatch({
        type: 'SET_SECTION',
        key: section.key,
        value: { kind: 'multi', ids: next },
      });
    },
    [dispatch, section.key],
  );

  const onClear = React.useCallback(
    () => dispatch({ type: 'CLEAR_SECTION', key: section.key }),
    [dispatch, section.key],
  );

  return (
    <SectionCard icon={section.icon} title={section.title} count={ids.length} onClear={onClear}>
      <MultiCombobox
        options={options}
        values={ids}
        onValuesChange={onValuesChange}
        placeholder={`Select ${section.title.toLowerCase()}…`}
        searchPlaceholder={section.searchPlaceholder ?? `Search ${section.title.toLowerCase()}…`}
        emptyLabel={section.emptyLabel ?? section.title.toLowerCase()}
      />
    </SectionCard>
  );
});
