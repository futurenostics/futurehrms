'use client';

import * as React from 'react';
import { Archive, Pencil, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useArchiveCustomType,
  useCreateCustomType,
  useCustomNotificationTypes,
  useUpdateCustomType,
  type Channel,
  type CustomNotificationTypePublic,
  type Severity,
} from '@/lib/queries/notifications';
import { cn } from '@/lib/utils';

/**
 * Admin sheet for managing custom notification types.
 *
 * Two-pane layout in one sheet:
 *   - left: list of existing types (active first), with edit + archive
 *   - right: a form for creating a new type or editing the selected one
 *
 * The list and the editor share state in the parent; switching between
 * "new" and "editing" just resets the form. On every save the registry
 * is rehydrated server-side and the runtime picker reflects the change
 * via TanStack-Query invalidation.
 *
 * Keep the form copy minimal — the templates support `{{var}}` style
 * placeholders that map to the notification payload at send time
 * (see `NotificationTypesRegistry.interpolate`).
 */
export interface CustomTypesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SEVERITIES: Array<{ value: Severity; label: string }> = [
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'danger', label: 'Danger' },
];

const CHANNELS: Array<{ value: Channel; label: string }> = [
  { value: 'in_app', label: 'In-app' },
  { value: 'email', label: 'Email' },
  { value: 'push', label: 'Push (future)' },
  { value: 'slack', label: 'Slack (future)' },
];

type FormState = {
  id: string | null;
  key: string;
  name: string;
  description: string;
  severity: Severity;
  channels: Channel[];
  titleTemplate: string;
  bodyTemplate: string;
  linkTemplate: string;
};

const EMPTY_FORM: FormState = {
  id: null,
  key: 'custom.',
  name: '',
  description: '',
  severity: 'info',
  channels: ['in_app'],
  titleTemplate: '',
  bodyTemplate: '',
  linkTemplate: '',
};

export function CustomTypesSheet({ open, onOpenChange }: CustomTypesSheetProps) {
  const list = useCustomNotificationTypes();
  const create = useCreateCustomType();
  const update = useUpdateCustomType();
  const archive = useArchiveCustomType();

  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const isNew = form.id === null;
  const busy = create.isPending || update.isPending || archive.isPending;

  // Reset the form whenever the sheet closes — keeps "Manage types"
  // a clean entry point on the next open.
  React.useEffect(() => {
    if (!open) setForm(EMPTY_FORM);
  }, [open]);

  function loadForEdit(row: CustomNotificationTypePublic): void {
    setForm({
      id: row.id,
      key: row.key,
      name: row.name,
      description: row.description ?? '',
      severity: row.severity,
      channels: row.channels,
      titleTemplate: row.titleTemplate,
      bodyTemplate: row.bodyTemplate,
      linkTemplate: row.linkTemplate ?? '',
    });
  }

  function toggleChannel(c: Channel): void {
    setForm((prev) => ({
      ...prev,
      channels: prev.channels.includes(c)
        ? prev.channels.filter((x) => x !== c)
        : [...prev.channels, c],
    }));
  }

  async function handleSave(): Promise<void> {
    try {
      if (isNew) {
        await create.mutateAsync({
          key: form.key.trim(),
          name: form.name.trim(),
          description: form.description.trim() || null,
          severity: form.severity,
          channels: form.channels,
          titleTemplate: form.titleTemplate.trim(),
          bodyTemplate: form.bodyTemplate.trim(),
          linkTemplate: form.linkTemplate.trim() || null,
        });
        toast.success(`Created '${form.key.trim()}'`);
      } else if (form.id) {
        await update.mutateAsync({
          id: form.id,
          input: {
            name: form.name.trim(),
            description: form.description.trim() || null,
            severity: form.severity,
            channels: form.channels,
            titleTemplate: form.titleTemplate.trim(),
            bodyTemplate: form.bodyTemplate.trim(),
            linkTemplate: form.linkTemplate.trim() || null,
          },
        });
        toast.success('Updated');
      }
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleArchive(row: CustomNotificationTypePublic): Promise<void> {
    if (!confirm(`Archive '${row.key}'? Rules already using it keep firing until next save.`)) {
      return;
    }
    try {
      await archive.mutateAsync(row.id);
      toast.success(`Archived '${row.key}'`);
      if (form.id === row.id) setForm(EMPTY_FORM);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const items = list.data?.items ?? [];

  const keyError = isNew
    ? !/^custom\.[a-z0-9][a-z0-9-]*$/.test(form.key.trim())
      ? "Key must start with 'custom.' and use lowercase letters / digits / dashes"
      : null
    : null;
  const canSave =
    !busy &&
    !keyError &&
    form.name.trim().length > 0 &&
    form.titleTemplate.trim().length > 0 &&
    form.bodyTemplate.trim().length > 0 &&
    form.channels.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="xl">
        <SheetHeader>
          <SheetTitle>Manage notification types</SheetTitle>
          <p className="text-fn-fg-faint text-[12px]">
            Custom notification types are persisted and immediately available to every reminder
            rule. Templates use <code className="font-mono text-[11px]">{`{{var}}`}</code>{' '}
            placeholders that map to the notification payload at send time.
          </p>
        </SheetHeader>

        <SheetBody>
          <div className="gap-fn-5 grid grid-cols-[280px_1fr]">
            {/* Left — existing types */}
            <div className="gap-fn-2 flex flex-col">
              <h3 className="text-fn-fg font-fn-semibold text-[12.5px]">Existing</h3>
              {list.isPending ? (
                <Skeleton className="h-fn-16 w-full" />
              ) : items.length === 0 ? (
                <p className="text-fn-fg-faint text-[12px] italic">
                  No custom types yet. Create your first on the right.
                </p>
              ) : (
                <ul className="gap-fn-1_5 flex flex-col">
                  {items.map((row) => (
                    <li
                      key={row.id}
                      className={cn(
                        'rounded-fn-xs border-fn-border bg-fn-bg-panel gap-fn-1_5 px-fn-2_5 py-fn-2 flex flex-col border',
                        form.id === row.id && 'border-fn-accent/45',
                      )}
                    >
                      <div className="gap-fn-2 flex items-start justify-between">
                        <div className="min-w-0">
                          <div className="text-fn-fg font-fn-semibold truncate text-[12.5px]">
                            {row.name}
                          </div>
                          <div className="text-fn-fg-faint truncate font-mono text-[10.5px]">
                            {row.key}
                          </div>
                        </div>
                        {!row.isActive && <Badge tone="warning">Archived</Badge>}
                      </div>
                      <div className="gap-fn-1 flex">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadForEdit(row)}
                          disabled={busy}
                        >
                          <Pencil className="h-fn-3 w-fn-3" /> Edit
                        </Button>
                        {row.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleArchive(row)}
                            disabled={busy}
                            className="text-fn-fg-muted hover:text-fn-danger"
                          >
                            <Archive className="h-fn-3 w-fn-3" /> Archive
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setForm(EMPTY_FORM)}
                disabled={busy || isNew}
                className="self-start"
              >
                <Plus className="h-fn-3_5 w-fn-3_5" /> New type
              </Button>
            </div>

            {/* Right — editor */}
            <div className="gap-fn-3 flex flex-col">
              <h3 className="text-fn-fg font-fn-semibold text-[12.5px]">
                {isNew ? 'New custom type' : `Editing ${form.key}`}
              </h3>

              <FormField
                label="Key"
                hint="Must start with 'custom.' — lowercase letters, digits, dashes only."
                error={form.key.length > 'custom.'.length ? keyError : null}
              >
                <Input
                  value={form.key}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      key: e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, '-')
                        .replace(/[^a-z0-9.-]/g, ''),
                    }))
                  }
                  disabled={!isNew || busy}
                  placeholder="custom.weekly-pulse"
                  aria-invalid={!!keyError}
                />
              </FormField>

              <FormField label="Name" hint="Display name shown in pickers and the bell.">
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  disabled={busy}
                  placeholder="Weekly team pulse"
                />
              </FormField>

              <FormField label="Description (optional)">
                <Textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  disabled={busy}
                  placeholder="What is this reminder for?"
                />
              </FormField>

              <div className="gap-fn-3 grid grid-cols-2">
                <FormField label="Severity">
                  <Select
                    value={form.severity}
                    onValueChange={(v) => setForm((p) => ({ ...p, severity: v as Severity }))}
                    disabled={busy}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Channels" hint="At least one required.">
                  <div className="gap-fn-2 flex flex-wrap">
                    {CHANNELS.map((c) => (
                      <label
                        key={c.value}
                        className="gap-fn-1_5 text-fn-fg-muted hover:text-fn-fg flex cursor-pointer items-center text-[12px]"
                      >
                        <Checkbox
                          checked={form.channels.includes(c.value)}
                          onCheckedChange={() => toggleChannel(c.value)}
                          disabled={busy}
                        />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </FormField>
              </div>

              <FormField
                label="Title template"
                hint="Use {{placeholder}} to interpolate payload fields. Empty placeholders render as ''."
              >
                <Input
                  value={form.titleTemplate}
                  onChange={(e) => setForm((p) => ({ ...p, titleTemplate: e.target.value }))}
                  disabled={busy}
                  placeholder="Pulse check-in for {{name}}"
                />
              </FormField>

              <FormField label="Body template">
                <Textarea
                  rows={3}
                  value={form.bodyTemplate}
                  onChange={(e) => setForm((p) => ({ ...p, bodyTemplate: e.target.value }))}
                  disabled={busy}
                  placeholder="Hey {{name}}, take a moment to log this week's wins."
                />
              </FormField>

              <FormField label="Link template (optional)" hint="In-app deep link for the bell row.">
                <Input
                  value={form.linkTemplate}
                  onChange={(e) => setForm((p) => ({ ...p, linkTemplate: e.target.value }))}
                  disabled={busy}
                  placeholder="/employees/{{employeeId}}"
                />
              </FormField>
            </div>
          </div>
        </SheetBody>

        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            <X className="h-fn-3_5 w-fn-3_5" /> Close
          </Button>
          <Button onClick={() => void handleSave()} disabled={!canSave} className="ml-auto">
            {isNew ? 'Create type' : 'Save changes'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="gap-fn-1 flex flex-col">
      <Label className="text-fn-fg-muted text-[12px]">{label}</Label>
      {children}
      {error ? (
        <p className="text-fn-danger text-[11px]">{error}</p>
      ) : hint ? (
        <p className="text-fn-fg-faint text-[11px]">{hint}</p>
      ) : null}
    </div>
  );
}
