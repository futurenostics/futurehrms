'use client';

import * as React from 'react';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Skeleton } from '@/components/ui/skeleton';
import { useEventCatalog } from '@/lib/queries/reminders';

/**
 * Picker for `triggerSpec.eventType`. Strict combobox over the
 * backend's event catalog — event types must be values the system
 * actually emits, so freeform strings are not allowed. The BE
 * validates against the same catalog on create/update.
 */
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

  const options = React.useMemo<ComboboxOption[]>(
    () =>
      (catalog.data?.events ?? []).map((e) => ({
        value: e.type,
        label: e.label,
        description: e.type,
        group: e.group,
        keywords: [e.type, e.group, e.label],
      })),
    [catalog.data],
  );

  if (catalog.isPending) return <Skeleton className="h-fn-9 w-full" />;

  return (
    <Combobox
      options={options}
      value={value}
      placeholder="Pick an event…"
      searchPlaceholder="Search events"
      emptyLabel="events"
      disabled={disabled}
      onValueChange={onChange}
    />
  );
}
