'use client';

import * as React from 'react';
import { LayoutGrid, UserSearch, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Combobox, MultiCombobox, type ComboboxOption } from '@/components/ui/combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmployeesList } from '@/lib/queries/employees';
import type { EmployeePublic } from '@futurenostics/types';
import {
  useRecipientResolvers,
  useReminderRoles,
  type RecipientEntry,
  type ResolverConfigField,
} from '@/lib/queries/reminders';
import { cn } from '@/lib/utils';

/**
 * Multi-source recipient editor.
 *
 * A reminder rule's `recipientResolvers` is an ordered list of
 * `{ kind, config? }` entries. At fire time the BE resolves each
 * entry to a user-id set and unions them (dedup'd). The user can:
 *
 *   - add as many entries as they want (must have ≥1 to save)
 *   - pick from any registered resolver kind
 *   - configure the kinds that need it (specific-users, role-members,
 *     relation) via the per-kind editor below the kind dropdown
 *
 * Resolver registry is the source of truth: the kinds dropdown lists
 * everything the BE registered, and the config editor reflects each
 * kind's `configSchema`. No hardcoded enumeration.
 */
export interface RecipientListProps {
  value: RecipientEntry[];
  onChange: (next: RecipientEntry[]) => void;
  disabled?: boolean;
}

export function RecipientList({ value, onChange, disabled }: RecipientListProps) {
  const resolvers = useRecipientResolvers();
  const items = resolvers.data?.items ?? [];

  if (resolvers.isPending) {
    return <Skeleton className="h-fn-16 w-full" />;
  }

  const kinds = items.map((r) => ({
    value: r.key,
    label: r.label,
    description: r.description ?? undefined,
  }));

  function update(index: number, next: RecipientEntry) {
    const arr = [...value];
    arr[index] = next;
    onChange(arr);
  }
  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }
  function addPerson() {
    // The "Find a person" path: insert a specific-employees entry
    // primed with an empty employeeIds list. The card's config
    // editor renders the MultiCombobox right away, so the search
    // input is one click closer to the user than going via the
    // kind dropdown.
    onChange([...value, { kind: 'specific-employees', config: { employeeIds: [] } }]);
  }
  function addGroup() {
    // The "Add a group" path: pick whichever non-specific-employees
    // kind comes first so the user sees a different starting point
    // than "Specific employee(s)".
    const first = items.find((r) => r.key !== 'specific-employees')?.key ?? items[0]?.key ?? 'self';
    onChange([...value, { kind: first }]);
  }

  return (
    <div className="gap-fn-2 flex flex-col">
      {value.length === 0 ? (
        <div className="rounded-fn-xs border-fn-border bg-fn-bg-subtle/40 px-fn-3 py-fn-4 gap-fn-2 flex flex-col items-start border border-dashed">
          <span className="text-fn-fg-muted text-[12.5px]">
            No recipients yet — add at least one.
          </span>
          {!disabled && <AddRecipientCtas onPerson={addPerson} onGroup={addGroup} />}
        </div>
      ) : (
        value.map((entry, i) => {
          const def = items.find((r) => r.key === entry.kind);
          return (
            <RecipientCard
              key={i}
              kinds={kinds}
              entry={entry}
              schema={def?.configSchema ?? null}
              disabled={disabled}
              onChange={(next) => update(i, next)}
              onRemove={() => remove(i)}
            />
          );
        })
      )}

      {value.length > 0 && !disabled && (
        <AddRecipientCtas onPerson={addPerson} onGroup={addGroup} />
      )}
    </div>
  );
}

/**
 * The two-CTA split surfaced both at empty state and after the
 * last existing entry. "Find a person" is the high-frequency path;
 * "Add a group" covers the static + parameterised kinds.
 */
function AddRecipientCtas({ onPerson, onGroup }: { onPerson: () => void; onGroup: () => void }) {
  return (
    <div className="gap-fn-2 flex flex-wrap">
      <Button type="button" variant="secondary" size="sm" onClick={onPerson}>
        <UserSearch className="h-fn-3_5 w-fn-3_5" /> Find a person
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onGroup}>
        <LayoutGrid className="h-fn-3_5 w-fn-3_5" /> Add a group
      </Button>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function RecipientCard({
  kinds,
  entry,
  schema,
  disabled,
  onChange,
  onRemove,
}: {
  kinds: ComboboxOption[];
  entry: RecipientEntry;
  schema: ResolverConfigField[] | null;
  disabled?: boolean;
  onChange: (next: RecipientEntry) => void;
  onRemove: () => void;
}) {
  function setKind(next: string) {
    // Reset config when switching kinds — old config is unlikely to
    // be valid for the new kind.
    onChange({ kind: next });
  }
  function setConfigValue(key: string, val: unknown) {
    const cfg = { ...(entry.config ?? {}), [key]: val };
    onChange({ ...entry, config: cfg });
  }

  return (
    <div
      className={cn(
        'rounded-fn-xs border-fn-border bg-fn-bg-panel gap-fn-2_5 px-fn-3 py-fn-2_5 flex flex-col border',
      )}
    >
      <div className="gap-fn-2 flex items-start">
        <div className="min-w-[200px] flex-1">
          <Combobox
            options={kinds}
            value={entry.kind}
            placeholder="Pick a recipient kind…"
            searchPlaceholder="Search recipient kinds"
            emptyLabel="recipient kinds"
            disabled={disabled}
            onValueChange={setKind}
          />
        </div>
        {!disabled && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label="Remove recipient"
            className="text-fn-fg-faint hover:text-fn-danger"
          >
            <X className="h-fn-4 w-fn-4" />
          </Button>
        )}
      </div>

      {schema && schema.length > 0 && (
        <div className="gap-fn-2 flex flex-col">
          {schema.map((field) => (
            <ConfigFieldEditor
              key={field.key}
              field={field}
              value={entry.config?.[field.key]}
              disabled={disabled}
              onChange={(v) => setConfigValue(field.key, v)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */

function ConfigFieldEditor({
  field,
  value,
  disabled,
  onChange,
}: {
  field: ResolverConfigField;
  value: unknown;
  disabled?: boolean;
  onChange: (next: unknown) => void;
}) {
  if (field.type === 'enum') {
    return (
      <LabelRow label={field.label}>
        <Select
          value={typeof value === 'string' ? value : ''}
          disabled={disabled}
          onValueChange={onChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pick a value…" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </LabelRow>
    );
  }
  if (field.type === 'role') {
    return (
      <LabelRow label={field.label}>
        <RolePicker
          value={typeof value === 'string' ? value : ''}
          disabled={disabled}
          onChange={onChange}
        />
      </LabelRow>
    );
  }
  if (field.type === 'user-multi') {
    return (
      <LabelRow label={field.label}>
        <UserMultiPicker
          values={Array.isArray(value) ? (value as string[]) : []}
          disabled={disabled}
          onChange={onChange}
        />
      </LabelRow>
    );
  }
  return null;
}

function LabelRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="gap-fn-1 flex flex-col">
      <span className="text-fn-fg-muted text-[11.5px]">{label}</span>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- */

function RolePicker({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (next: string) => void;
}) {
  const roles = useReminderRoles();
  const options: ComboboxOption[] = (roles.data?.items ?? []).map((r) => ({
    value: r.slug,
    label: r.name,
    description: r.slug,
  }));
  if (roles.isPending) return <Skeleton className="h-fn-9 w-full" />;
  return (
    <Combobox
      options={options}
      value={value}
      placeholder="Pick a role…"
      searchPlaceholder="Search roles"
      emptyLabel="roles"
      disabled={disabled}
      onValueChange={(v) => onChange(v)}
    />
  );
}

function UserMultiPicker({
  values,
  disabled,
  onChange,
}: {
  values: string[];
  disabled?: boolean;
  onChange: (next: string[]) => void;
}) {
  const employees = useEmployeesList({ limit: 200 });
  const options: ComboboxOption[] = ((employees.data?.items ?? []) as EmployeePublic[]).map(
    (e) => ({
      value: e.id,
      label: e.fullName,
      description: e.email ?? e.eid,
    }),
  );
  if (employees.isPending) return <Skeleton className="h-fn-9 w-full" />;
  return (
    <MultiCombobox
      options={options}
      values={values}
      placeholder="Pick employee(s)…"
      searchPlaceholder="Search employees"
      emptyLabel="employees"
      disabled={disabled}
      onValuesChange={(next) => onChange(next)}
    />
  );
}
