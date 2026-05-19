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
 * Selecting a type reveals a read-only preview of its title and body
 * templates with `{{variable}}` placeholders highlighted so the rule
 * author can see what the recipient will actually receive.
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
  const selected = items.find((t) => t.key === value);
  return (
    <div className="gap-fn-2 flex flex-col">
      <Combobox
        options={options}
        value={value}
        placeholder="Pick a notification type…"
        searchPlaceholder="Search types"
        emptyLabel="notification types"
        disabled={disabled}
        onValueChange={onChange}
      />
      {selected && (
        <div className="rounded-fn-xs border-fn-border bg-fn-bg-subtle/40 gap-fn-2 px-fn-3 py-fn-2_5 flex flex-col border">
          <TemplateRow label="Title" template={selected.titleTemplate} />
          <TemplateRow label="Body" template={selected.bodyTemplate} multiline />
        </div>
      )}
    </div>
  );
}

function TemplateRow({
  label,
  template,
  multiline,
}: {
  label: string;
  template: string;
  multiline?: boolean;
}) {
  return (
    <div className="gap-fn-1 flex flex-col">
      <span className="text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight text-[10.5px] uppercase">
        {label}
      </span>
      <p
        className={
          multiline
            ? 'text-fn-fg leading-fn-snug whitespace-pre-wrap font-mono text-[11.5px]'
            : 'text-fn-fg font-mono text-[12px]'
        }
      >
        {highlight(template)}
      </p>
    </div>
  );
}

function highlight(template: string): React.ReactNode {
  const parts = template.split(/(\{\{\s*\w+\s*\}\})/g);
  return parts.map((part, i) =>
    /^\{\{\s*\w+\s*\}\}$/.test(part) ? (
      <span
        key={i}
        className="rounded-fn-xs border-fn-accent/30 bg-fn-accent-soft text-fn-accent-soft-fg px-fn-1 border text-[10.5px]"
      >
        {part}
      </span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}
