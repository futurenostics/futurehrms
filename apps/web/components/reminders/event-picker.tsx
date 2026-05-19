'use client';

import * as React from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useEventCatalog } from '@/lib/queries/reminders';

/**
 * Picker for `triggerSpec.eventType`.
 *
 *   - Combobox over every event the BE catalog exposes, grouped by
 *     domain prefix (Employee, Project, Commission, Approval).
 *   - Bottom row "Other event type…" flips the input to a freeform
 *     <Input> for ad-hoc strings — the trigger evaluator matches
 *     by exact-string compare, so anything goes.
 *
 * The "Other" mode is sticky: once you pick a freeform value, the
 * picker stays in freeform mode until the user clicks "Pick from
 * catalog" to switch back.
 */
const FREEFORM_VALUE = '__freeform__';

export function EventPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const catalog = useEventCatalog();

  const knownTypes = React.useMemo(
    () => new Set((catalog.data?.events ?? []).map((e) => e.type)),
    [catalog.data],
  );

  // Freeform mode = the current value isn't in the catalog OR the
  // user explicitly toggled freeform.
  const [forceFreeform, setForceFreeform] = React.useState(false);
  const isFreeform = forceFreeform || (value.length > 0 && !knownTypes.has(value));

  const options = React.useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = (catalog.data?.events ?? []).map((e) => ({
      value: e.type,
      label: e.label,
      description: e.type,
      group: e.group,
      keywords: [e.type, e.group, e.label],
    }));
    opts.push({
      value: FREEFORM_VALUE,
      label: 'Other event type…',
      description: 'Type any string the system emits (e.g. myco.custom.event).',
      group: 'Custom',
    });
    return opts;
  }, [catalog.data]);

  if (catalog.isPending) return <Skeleton className="h-fn-9 w-full" />;

  if (isFreeform) {
    return (
      <div className="gap-fn-2 flex flex-col">
        <Input
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="myco.custom.event"
          aria-label="Custom event type"
        />
        <div className="gap-fn-2 text-fn-fg-faint flex items-center text-[11px]">
          <Pencil className="h-fn-3 w-fn-3" />
          <span>Custom event — must match the type string emitted by the publisher.</span>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => {
                setForceFreeform(false);
                onChange('');
              }}
            >
              Pick from catalog
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Combobox
      options={options}
      value={value}
      placeholder="Pick an event…"
      searchPlaceholder="Search events"
      emptyLabel="events"
      disabled={disabled}
      onValueChange={(next) => {
        if (next === FREEFORM_VALUE) {
          setForceFreeform(true);
          onChange('');
        } else {
          setForceFreeform(false);
          onChange(next);
        }
      }}
    />
  );
}
