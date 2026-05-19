'use client';

import * as React from 'react';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotificationTypes } from '@/lib/queries/notifications';

/**
 * Picker for `rule.notificationType`. Combobox over the live
 * registry — module-shipped + custom rows together — grouped by
 * each type's `module` so `reminders.*`, `custom.*`, etc. visually
 * separate.
 *
 * No freeform escape hatch: notification types are strict-validated
 * at send time, so picking an unregistered string would just blow up
 * the runtime. Adding a new type happens in the Manage types sheet,
 * which writes to the registry on save.
 */
export function NotificationTypePicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const types = useNotificationTypes();
  if (types.isPending) return <Skeleton className="h-fn-9 w-full" />;
  const items = types.data?.items ?? [];
  const options: ComboboxOption[] = items.map((t) => ({
    value: t.key,
    label: t.name,
    description: t.key,
    group: t.module === 'custom' ? 'Custom' : `Module · ${t.module}`,
    keywords: [t.key, t.module, t.name],
  }));
  return (
    <Combobox
      options={options}
      value={value}
      placeholder="Pick a notification type…"
      searchPlaceholder="Search types"
      emptyLabel="notification types"
      disabled={disabled}
      onValueChange={onChange}
    />
  );
}
