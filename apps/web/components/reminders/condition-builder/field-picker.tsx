'use client';

import * as React from 'react';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import type { EntityDef, FieldDef } from './types';

/**
 * Field picker — flattened Combobox over every queryable path with
 * the owning entity as the group heading.
 *
 *   Employee
 *     ▸ EID
 *     ▸ Full name
 *     ▸ Department › Slug
 *     …
 *   Project
 *     ▸ Name
 *     …
 *
 * Combobox already supports `group` on options + has a built-in
 * search box, so the user can type "department" to filter across
 * entities without manual collapsing.
 */
export function FieldPicker({
  entities,
  value,
  onChange,
  disabled,
}: {
  entities: EntityDef[];
  value: string;
  onChange: (path: string, field: FieldDef) => void;
  disabled?: boolean;
}) {
  const options = React.useMemo<ComboboxOption[]>(() => {
    const out: ComboboxOption[] = [];
    for (const entity of entities) {
      for (const field of entity.fields) {
        out.push({
          value: field.path,
          label: field.label,
          description: field.type,
          group: entity.label,
          keywords: [entity.label, entity.key, field.path],
        });
      }
    }
    return out;
  }, [entities]);

  const lookup = React.useMemo(() => {
    const m = new Map<string, FieldDef>();
    for (const e of entities) for (const f of e.fields) m.set(f.path, f);
    return m;
  }, [entities]);

  return (
    <Combobox
      options={options}
      value={value}
      placeholder="Pick a field…"
      searchPlaceholder="Search fields"
      emptyLabel="fields"
      disabled={disabled}
      onValueChange={(next) => {
        const field = lookup.get(next);
        if (field) onChange(next, field);
      }}
    />
  );
}
