'use client';

import * as React from 'react';
import { Archive, ArchiveRestore, Pencil, Plus, RotateCcw, X } from 'lucide-react';
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
  useUnarchiveCustomType,
  useUpdateCustomType,
  type Channel,
  type CustomNotificationTypePublic,
  type Severity,
} from '@/lib/queries/notifications';
import {
  defaultSamplePayload,
  insertAtCursor,
  interpolate,
  tokenizeTemplate,
  VARIABLE_CATALOG,
  type VariableGroup,
  type VariableSuggestion,
} from '@/lib/notification-template';
import { cn } from '@/lib/utils';

/**
 * Admin sheet for managing custom notification types.
 *
 * Two-pane layout: left lists existing types, right is the editor.
 * The editor itself splits into the form (inputs) and a live
 * preview pane that renders the interpolated title/body/link
 * against an editable sample payload so authors can verify what
 * recipients actually see before saving.
 *
 * The variable chip rail under each template input is the source
 * of truth for "what `{{vars}}` are safe to use" — clicking a chip
 * inserts the token at the input's cursor. The chips come from
 * `lib/notification-template.ts` (kept FE-only since they're just
 * documentation for the author).
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

type TemplateField = 'titleTemplate' | 'bodyTemplate' | 'linkTemplate';

export function CustomTypesSheet({ open, onOpenChange }: CustomTypesSheetProps) {
  const list = useCustomNotificationTypes();
  const create = useCreateCustomType();
  const update = useUpdateCustomType();
  const archive = useArchiveCustomType();
  const unarchive = useUnarchiveCustomType();

  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const isNew = form.id === null;
  const busy = create.isPending || update.isPending || archive.isPending || unarchive.isPending;

  // Sample payload powering the live preview. Defaults to every
  // catalog variable populated with its sample value so the preview
  // renders something useful from the first character typed.
  const [samplePayloadText, setSamplePayloadText] = React.useState<string>(() =>
    JSON.stringify(defaultSamplePayload(), null, 2),
  );
  const parsedSample = React.useMemo<{
    payload: Record<string, unknown> | null;
    error: string | null;
  }>(() => {
    try {
      const parsed = JSON.parse(samplePayloadText) as unknown;
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { payload: null, error: 'Sample payload must be a JSON object' };
      }
      return { payload: parsed as Record<string, unknown>, error: null };
    } catch (err) {
      return { payload: null, error: (err as Error).message };
    }
  }, [samplePayloadText]);

  // Refs for caret-aware chip insertion.
  const titleRef = React.useRef<HTMLInputElement>(null);
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);
  const linkRef = React.useRef<HTMLInputElement>(null);

  // Reset the form whenever the sheet closes — keeps "Manage types"
  // a clean entry point on the next open.
  React.useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
      setSamplePayloadText(JSON.stringify(defaultSamplePayload(), null, 2));
    }
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

  const items = list.data?.items ?? [];

  // The full key always starts with "custom." — that prefix is
  // surfaced as a static chip next to the input so the author can
  // only type the suffix (and can never typo the separator). The
  // suffix is what gets validated.
  const KEY_PREFIX = 'custom.';
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

  // The variable chip rail is detached from any rule, so show every
  // group — author can pick whichever payload shape they target.
  const variableGroups = VARIABLE_CATALOG;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="xl">
        <SheetHeader>
          <SheetTitle>Manage notification types</SheetTitle>
          <p className="text-fn-fg-faint text-[12px]">
            Custom notification types are persisted and immediately available to every reminder
            rule. Templates use <code className="font-mono text-[11px]">{`{{var}}`}</code>{' '}
            placeholders that map to the notification payload at send time. Click a variable chip to
            insert it at the cursor.
          </p>
        </SheetHeader>

        <SheetBody>
          <div className="gap-fn-5 grid grid-cols-[240px_1fr]">
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
                            className="text-fn-fg-muted hover:text-fn-danger"
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

            {/* Right — editor + live preview */}
            <div className="gap-fn-4 grid grid-cols-1 xl:grid-cols-[1fr_320px]">
              <div className="gap-fn-3 flex flex-col">
                <h3 className="text-fn-fg font-fn-semibold text-[12.5px]">
                  {isNew ? 'New custom type' : `Editing ${form.key}`}
                </h3>

                <FormField
                  label="Key"
                  hint="The 'custom.' prefix is fixed. Type a slug — lowercase letters, digits, dashes only."
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
                  hint="Click a variable chip below to insert at the cursor."
                >
                  <Input
                    ref={titleRef}
                    value={form.titleTemplate}
                    onChange={(e) => setField('titleTemplate', e.target.value)}
                    disabled={busy}
                    placeholder="Pulse check-in for {{employeeName}}"
                  />
                  <VariableChips
                    groups={variableGroups}
                    onInsert={(v) => insertVariable('titleTemplate', v)}
                    disabled={busy}
                  />
                </FormField>

                <FormField label="Body template">
                  <Textarea
                    ref={bodyRef}
                    rows={3}
                    value={form.bodyTemplate}
                    onChange={(e) => setField('bodyTemplate', e.target.value)}
                    disabled={busy}
                    placeholder="Hey {{employeeName}}, take a moment to log this week's wins."
                  />
                  <VariableChips
                    groups={variableGroups}
                    onInsert={(v) => insertVariable('bodyTemplate', v)}
                    disabled={busy}
                  />
                </FormField>

                <FormField
                  label="Link template (optional)"
                  hint="In-app deep link for the bell row."
                >
                  <Input
                    ref={linkRef}
                    value={form.linkTemplate}
                    onChange={(e) => setField('linkTemplate', e.target.value)}
                    disabled={busy}
                    placeholder="/employees/{{employeeEid}}"
                  />
                  <VariableChips
                    groups={variableGroups}
                    onInsert={(v) => insertVariable('linkTemplate', v)}
                    disabled={busy}
                  />
                </FormField>
              </div>

              {/* Live preview pane */}
              <aside className="border-fn-border bg-fn-bg-subtle/40 rounded-fn-xs gap-fn-3 px-fn-3 py-fn-3 flex flex-col self-start border">
                <div className="gap-fn-1 flex items-center justify-between">
                  <h3 className="text-fn-fg font-fn-semibold text-[12.5px]">Live preview</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setSamplePayloadText(JSON.stringify(defaultSamplePayload(), null, 2))
                    }
                    title="Reset sample payload to catalog defaults"
                    className="text-fn-fg-faint hover:text-fn-fg"
                  >
                    <RotateCcw className="h-fn-3 w-fn-3" />
                  </Button>
                </div>

                <PreviewRow
                  label="Title"
                  template={form.titleTemplate}
                  payload={parsedSample.payload}
                />
                <PreviewRow
                  label="Body"
                  template={form.bodyTemplate}
                  payload={parsedSample.payload}
                  multiline
                />
                <PreviewRow
                  label="Link"
                  template={form.linkTemplate}
                  payload={parsedSample.payload}
                  monoOnly
                />

                <div className="gap-fn-1 flex flex-col">
                  <Label className="text-fn-fg-muted text-[11.5px]">Sample payload</Label>
                  <Textarea
                    rows={6}
                    value={samplePayloadText}
                    onChange={(e) => setSamplePayloadText(e.target.value)}
                    className="font-mono text-[11px]"
                  />
                  {parsedSample.error ? (
                    <p className="text-fn-danger text-[11px]">{parsedSample.error}</p>
                  ) : (
                    <p className="text-fn-fg-faint text-[11px]">
                      Edit to test interpolation. JSON object only.
                    </p>
                  )}
                </div>
              </aside>
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
    <div className="gap-fn-2 flex flex-col">
      {groups.map((g) => (
        <div key={g.label} className="gap-fn-1 flex flex-wrap items-center">
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

function PreviewRow({
  label,
  template,
  payload,
  multiline,
  monoOnly,
}: {
  label: string;
  template: string;
  payload: Record<string, unknown> | null;
  multiline?: boolean;
  monoOnly?: boolean;
}) {
  const rendered = template ? interpolate(template, payload) : '';
  const tokens = template ? tokenizeTemplate(template, payload) : [];
  return (
    <div className="gap-fn-1 flex flex-col">
      <Label className="text-fn-fg-muted text-[11.5px]">{label}</Label>
      {template ? (
        <>
          <div
            className={cn(
              'text-fn-fg leading-fn-snug',
              multiline ? 'whitespace-pre-wrap text-[12px]' : 'text-[12.5px]',
              monoOnly && 'font-mono text-[11.5px]',
            )}
          >
            {rendered || <span className="text-fn-fg-faint italic">(empty)</span>}
          </div>
          <div className="gap-fn-0_5 flex flex-wrap font-mono text-[10.5px]">
            {tokens.map((t, i) =>
              t.kind === 'text' ? (
                <span key={i} className="text-fn-fg-faint whitespace-pre-wrap">
                  {t.value}
                </span>
              ) : (
                <span
                  key={i}
                  className={cn(
                    'rounded-fn-xs px-fn-1 border',
                    t.unset
                      ? 'border-fn-warning-soft-fg/40 bg-fn-warning-soft text-fn-warning-soft-fg'
                      : 'border-fn-accent-soft-fg/30 bg-fn-accent-soft text-fn-accent-soft-fg',
                  )}
                  title={t.unset ? `${t.value}: not in sample payload` : t.value}
                >
                  {`{{${t.value}}}`}
                </span>
              ),
            )}
          </div>
        </>
      ) : (
        <span className="text-fn-fg-faint text-[11.5px] italic">(template empty)</span>
      )}
    </div>
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
