'use client';

import * as React from 'react';
import { Archive, ArchiveRestore, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  useDeleteCustomType,
  useUnarchiveCustomType,
  useUpdateCustomType,
  type Channel,
  type CustomNotificationTypePublic,
  type Severity,
} from '@/lib/queries/notifications';
import {
  insertAtCursor,
  VARIABLE_CATALOG,
  type VariableGroup,
  type VariableSuggestion,
} from '@/lib/notification-template';
import { cn } from '@/lib/utils';

/**
 * Admin sheet for managing custom notification types.
 *
 * Two-pane layout: a narrow left rail lists existing types, and a
 * wide right area is the editor. The editor groups fields into
 * three visually separated sections — Basics (identity), Delivery
 * (severity + channels), Templates (title / body / link) — so the
 * form reads top-to-bottom in a natural authoring order.
 *
 * The variable chip rail under each template input is the source
 * of truth for "what `{{vars}}` are safe to use" — clicking a chip
 * inserts the token at the input's cursor.
 */
export interface CustomTypesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SEVERITIES: Array<{
  value: Severity;
  label: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
}> = [
  { value: 'info', label: 'Info', tone: 'info' },
  { value: 'success', label: 'Success', tone: 'success' },
  { value: 'warning', label: 'Warning', tone: 'warning' },
  { value: 'danger', label: 'Danger', tone: 'danger' },
];

const CHANNELS: Array<{ value: Channel; label: string; hint: string; disabled?: boolean }> = [
  { value: 'in_app', label: 'In-app', hint: 'Bell + inbox' },
  { value: 'email', label: 'Email', hint: 'SMTP / Resend' },
  { value: 'push', label: 'Push', hint: 'Future', disabled: true },
  { value: 'slack', label: 'Slack', hint: 'Future', disabled: true },
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

const KEY_PREFIX = 'custom.';

const EMPTY_FORM: FormState = {
  id: null,
  key: KEY_PREFIX,
  name: '',
  description: '',
  severity: 'info',
  channels: ['in_app'],
  titleTemplate: '',
  bodyTemplate: '',
  linkTemplate: '',
};

type TemplateField = 'titleTemplate' | 'bodyTemplate' | 'linkTemplate';

export function CustomTypesSheet({ open, onOpenChange }: CustomTypesSheetProps) {
  const list = useCustomNotificationTypes();
  const create = useCreateCustomType();
  const update = useUpdateCustomType();
  const archive = useArchiveCustomType();
  const unarchive = useUnarchiveCustomType();
  const remove = useDeleteCustomType();

  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const isNew = form.id === null;
  const busy =
    create.isPending ||
    update.isPending ||
    archive.isPending ||
    unarchive.isPending ||
    remove.isPending;

  // Refs for caret-aware chip insertion.
  const titleRef = React.useRef<HTMLInputElement>(null);
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);
  const linkRef = React.useRef<HTMLInputElement>(null);

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

  function setField(field: TemplateField, value: string): void {
    setForm((p) => ({ ...p, [field]: value }));
  }

  function insertVariable(field: TemplateField, varName: string): void {
    const el =
      field === 'titleTemplate'
        ? titleRef.current
        : field === 'bodyTemplate'
          ? bodyRef.current
          : linkRef.current;
    if (!el) {
      // Fallback: append at end.
      setField(field, (form[field] ?? '') + `{{${varName}}}`);
      return;
    }
    insertAtCursor(el, `{{${varName}}}`, (next) => setField(field, next));
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

  async function handleUnarchive(row: CustomNotificationTypePublic): Promise<void> {
    try {
      await unarchive.mutateAsync(row.id);
      toast.success(`Restored '${row.key}'`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleDelete(row: CustomNotificationTypePublic): Promise<void> {
    if (
      !confirm(
        `Permanently delete '${row.key}'? This can't be undone. Refused when any reminder rule still references this key.`,
      )
    ) {
      return;
    }
    try {
      await remove.mutateAsync(row.id);
      toast.success(`Deleted '${row.key}'`);
      if (form.id === row.id) setForm(EMPTY_FORM);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const items = list.data?.items ?? [];

  // The full key always starts with "custom." — the prefix is a
  // static chip in the input so the separator can never be typoed.
  const keySuffix = isNew
    ? form.key.startsWith(KEY_PREFIX)
      ? form.key.slice(KEY_PREFIX.length)
      : form.key
    : form.key;
  const keyError = isNew
    ? keySuffix.length === 0
      ? 'Pick a slug, e.g. "birthday" → custom.birthday'
      : !/^[a-z0-9][a-z0-9-]*$/.test(keySuffix)
        ? 'Lowercase letters, digits, and dashes only'
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
            placeholders; click a chip below each template to insert one at the cursor.
          </p>
        </SheetHeader>

        <SheetBody>
          <div className="gap-fn-5 grid grid-cols-[240px_1fr]">
            {/* Left rail — existing types */}
            <div className="gap-fn-2 flex flex-col">
              <div className="gap-fn-2 flex items-center justify-between">
                <h3 className="text-fn-fg font-fn-semibold text-[12.5px]">Existing</h3>
                <Badge tone="default">{items.length}</Badge>
              </div>
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
                        form.id === row.id && 'border-fn-accent/45 bg-fn-accent-soft/15',
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
                        <div className="gap-fn-1 flex shrink-0 flex-col items-end">
                          {!row.isActive && <Badge tone="warning">Archived</Badge>}
                          {row.usageCount > 0 && (
                            <Badge tone="accent">
                              {row.usageCount} rule{row.usageCount === 1 ? '' : 's'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="gap-fn-1 flex flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadForEdit(row)}
                          disabled={busy}
                        >
                          <Pencil className="h-fn-3 w-fn-3" /> Edit
                        </Button>
                        {row.isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleArchive(row)}
                            disabled={busy}
                            className="text-fn-fg-muted hover:text-fn-warning"
                          >
                            <Archive className="h-fn-3 w-fn-3" /> Archive
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleUnarchive(row)}
                            disabled={busy}
                            className="text-fn-fg-muted hover:text-fn-accent"
                          >
                            <ArchiveRestore className="h-fn-3 w-fn-3" /> Unarchive
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDelete(row)}
                          disabled={busy || row.usageCount > 0}
                          title={
                            row.usageCount > 0
                              ? `In use by ${row.usageCount} reminder rule${row.usageCount === 1 ? '' : 's'} — archive or update them first`
                              : 'Permanently delete this type'
                          }
                          className="text-fn-fg-muted hover:text-fn-danger"
                        >
                          <Trash2 className="h-fn-3 w-fn-3" /> Delete
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Editor — three sections stacked vertically using the full width */}
            <div className="gap-fn-5 flex flex-col">
              <div className="gap-fn-2 flex items-center">
                <h3 className="text-fn-fg font-fn-semibold text-[14px]">
                  {isNew ? 'New custom type' : `Editing ${form.key}`}
                </h3>
                {!isNew && (
                  <>
                    <Badge tone="accent">Editing</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm(EMPTY_FORM)}
                      disabled={busy}
                      className="ml-auto"
                    >
                      Start new
                    </Button>
                  </>
                )}
              </div>

              {/* Basics */}
              <FormSection title="Basics" hint="Identity that picks this type out of the registry.">
                <div className="gap-fn-3 grid grid-cols-2">
                  <FormField
                    label="Key"
                    hint="'custom.' is fixed. Type a slug — letters, digits, dashes only."
                    error={keySuffix.length > 0 ? keyError : null}
                  >
                    {isNew ? (
                      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs focus-within:border-fn-accent focus-within:ring-fn-accent/30 flex items-center border focus-within:ring-2">
                        <span className="text-fn-fg-muted bg-fn-bg-subtle/60 border-r-fn-border px-fn-2_5 py-fn-1_5 select-none border-r font-mono text-[12.5px]">
                          custom.
                        </span>
                        <input
                          value={keySuffix}
                          onChange={(e) => {
                            const normalized = e.target.value
                              .toLowerCase()
                              .replace(/\s+/g, '-')
                              .replace(/\./g, '-')
                              .replace(/[^a-z0-9-]/g, '');
                            setForm((p) => ({ ...p, key: KEY_PREFIX + normalized }));
                          }}
                          disabled={busy}
                          placeholder="weekly-pulse"
                          aria-invalid={!!keyError}
                          className="text-fn-fg placeholder:text-fn-fg-faint px-fn-2_5 py-fn-1_5 flex-1 bg-transparent font-mono text-[12.5px] outline-none disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                    ) : (
                      <Input value={form.key} disabled placeholder="custom.weekly-pulse" />
                    )}
                  </FormField>
                  <FormField label="Name" hint="Shown in pickers and the bell.">
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      disabled={busy}
                      placeholder="Weekly team pulse"
                    />
                  </FormField>
                </div>
                <FormField
                  label="Description"
                  hint="Optional. Helps other admins know what this is for."
                >
                  <Textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    disabled={busy}
                    placeholder="A quick weekly nudge for the team — drives the Friday pulse-check email."
                  />
                </FormField>
              </FormSection>

              {/* Delivery */}
              <FormSection
                title="Delivery"
                hint="How the notification is presented and where it lands."
              >
                <div className="gap-fn-3 grid grid-cols-[200px_1fr]">
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
                            <span className="gap-fn-2 inline-flex items-center">
                              <Badge tone={s.tone}>{s.label}</Badge>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Channels" hint="At least one required.">
                    <div className="gap-fn-2 flex flex-wrap">
                      {CHANNELS.map((c) => {
                        const active = form.channels.includes(c.value);
                        return (
                          <button
                            key={c.value}
                            type="button"
                            disabled={busy || c.disabled}
                            onClick={() => toggleChannel(c.value)}
                            title={c.hint}
                            className={cn(
                              'rounded-fn-xs px-fn-2_5 py-fn-1_5 font-fn-medium gap-fn-1_5 inline-flex items-center border text-[12.5px] transition-colors',
                              busy || c.disabled
                                ? 'cursor-not-allowed opacity-60'
                                : 'cursor-pointer',
                              active
                                ? 'border-fn-accent/40 bg-fn-accent-soft text-fn-accent-soft-fg'
                                : 'border-fn-border bg-fn-bg-panel text-fn-fg-muted hover:border-fn-fg-faint',
                            )}
                          >
                            {c.label}
                            <span
                              className={cn(
                                'text-[10.5px]',
                                active ? 'text-fn-accent-soft-fg/70' : 'text-fn-fg-faint',
                              )}
                            >
                              {c.hint}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </FormField>
                </div>
              </FormSection>

              {/* Templates */}
              <FormSection
                title="Templates"
                hint="Authored copy with {{var}} placeholders. Click a chip to insert at the cursor."
              >
                <FormField label="Title">
                  <Input
                    ref={titleRef}
                    value={form.titleTemplate}
                    onChange={(e) => setField('titleTemplate', e.target.value)}
                    disabled={busy}
                    placeholder="Pulse check-in for {{employeeName}}"
                  />
                  <VariableChips
                    groups={VARIABLE_CATALOG}
                    onInsert={(v) => insertVariable('titleTemplate', v)}
                    disabled={busy}
                  />
                </FormField>

                <FormField label="Body">
                  <Textarea
                    ref={bodyRef}
                    rows={5}
                    value={form.bodyTemplate}
                    onChange={(e) => setField('bodyTemplate', e.target.value)}
                    disabled={busy}
                    placeholder="Hey {{employeeName}}, take a moment to log this week's wins."
                  />
                  <VariableChips
                    groups={VARIABLE_CATALOG}
                    onInsert={(v) => insertVariable('bodyTemplate', v)}
                    disabled={busy}
                  />
                </FormField>

                <FormField label="Link" hint="Optional — in-app deep link for the bell row.">
                  <Input
                    ref={linkRef}
                    value={form.linkTemplate}
                    onChange={(e) => setField('linkTemplate', e.target.value)}
                    disabled={busy}
                    placeholder="/employees/{{employeeEid}}"
                  />
                  <VariableChips
                    groups={VARIABLE_CATALOG}
                    onInsert={(v) => insertVariable('linkTemplate', v)}
                    disabled={busy}
                  />
                </FormField>
              </FormSection>
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

function VariableChips({
  groups,
  onInsert,
  disabled,
}: {
  groups: VariableGroup[];
  onInsert: (varName: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="gap-fn-1_5 flex flex-col">
      {groups.map((g) => (
        <div key={g.label} className="gap-fn-2 flex flex-wrap items-center">
          <span className="text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight w-fn-20 shrink-0 text-[10px] uppercase">
            {g.label}
          </span>
          <div className="gap-fn-1 flex flex-wrap">
            {g.variables.map((v) => (
              <VariableChip
                key={v.key}
                suggestion={v}
                disabled={disabled}
                onClick={() => onInsert(v.key)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function VariableChip({
  suggestion,
  disabled,
  onClick,
}: {
  suggestion: VariableSuggestion;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={suggestion.description}
      className={cn(
        'rounded-fn-xs border-fn-accent-soft-fg/30 bg-fn-accent-soft text-fn-accent-soft-fg px-fn-1_5 py-fn-0_5 font-fn-medium inline-flex items-center border font-mono text-[10.5px] transition-colors',
        disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-fn-accent-soft/80 cursor-pointer',
      )}
    >
      {`{{${suggestion.key}}}`}
    </button>
  );
}

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="gap-fn-3 flex flex-col">
      <div className="gap-fn-1 border-b-fn-divider pb-fn-2 flex flex-col border-b">
        <h4 className="text-fn-fg font-fn-semibold tracking-fn-uppercase-tight text-[11px] uppercase">
          {title}
        </h4>
        {hint && <p className="text-fn-fg-faint text-[11.5px]">{hint}</p>}
      </div>
      <div className="gap-fn-3 flex flex-col">{children}</div>
    </section>
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
