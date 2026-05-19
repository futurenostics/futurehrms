'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import { useReferences } from '@/lib/queries/employees';
import {
  useArchiveRule,
  useCreateRule,
  useEventCatalog,
  usePreviewConditions,
  usePreviewRecipients,
  usePublishRule,
  useReminderRule,
  useUpdateRule,
  type ConditionGroup,
  type ConditionNode,
  type TriggerSpec,
} from '@/lib/queries/reminders';
import { ConditionBuilder, countLeaves } from '@/components/reminders/condition-builder';
import { EventPicker } from '@/components/reminders/event-picker';
import { RecipientList } from '@/components/reminders/recipient-list';
import { NotificationTypePicker } from '@/components/reminders/notification-type-picker';
import { CronPicker } from '@/components/reminders/cron-picker';
import type { RecipientEntry } from '@/lib/queries/reminders';

/**
 * Rule editor sheet — used in two modes:
 *
 *   - mode='create' : empty form, hits POST /reminder-rules then publish
 *   - mode='edit'   : loads the rule by id, hits PATCH (draft only) or
 *                     shows a "draft a new version" CTA for active rules.
 *
 * Versioned-rule pattern matches the commission-rules editor: drafts
 * are mutable, active rules are not — you publish a new version
 * instead. The Phase 3 backend's rules service enforces this.
 *
 * The form covers every field the design's row exposes plus the
 * fields needed to actually wire a rule (notification type, trigger
 * spec, recipient resolver, dept scope).
 */
export interface RuleEditorSheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  mode: 'create' | 'edit';
  ruleId: string | null;
}

export function RuleEditorSheet({ open, onOpenChange, mode, ruleId }: RuleEditorSheetProps) {
  const router = useRouter();
  const refs = useReferences();
  const existing = useReminderRule(mode === 'edit' ? ruleId : null);
  const create = useCreateRule();
  const update = useUpdateRule(ruleId ?? '');
  const publish = usePublishRule(ruleId ?? '');
  const archive = useArchiveRule(ruleId ?? '');

  /* ---------- Local form state ---------- */
  const [key, setKey] = React.useState('');
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [triggerType, setTriggerType] = React.useState<'event' | 'cron'>('event');
  const [departmentId, setDepartmentId] = React.useState<string | null>(null);
  // Default to the first reminders-module type; the picker fetches
  // the live registry on mount so the user sees every available
  // type (module-shipped + custom) by then.
  const [notificationType, setNotificationType] = React.useState('reminders.probation-ending');
  // Multi-source recipient list. Defaults to a single 'self' entry
  // for new rules so the user has something to start adjusting.
  // The legacy `recipientResolver` column is derived from the first
  // entry's kind at save time — see handleSaveDraft.
  const [recipientResolvers, setRecipientResolvers] = React.useState<RecipientEntry[]>([
    { kind: 'self' },
  ]);
  const [isEnabled, setIsEnabled] = React.useState(true);

  // event-trigger fields
  const [eventType, setEventType] = React.useState('employee.created');

  // cron-trigger fields
  const [cron, setCron] = React.useState('0 9 * * *');

  // condition-tree (shared across both trigger types)
  const [conditions, setConditions] = React.useState<ConditionGroup | null>(null);

  // Hydrate from existing rule when editing
  React.useEffect(() => {
    if (mode !== 'edit' || !existing.data) return;
    const r = existing.data;
    setKey(r.key);
    setName(r.name);
    setDescription(r.description ?? '');
    setTriggerType(r.triggerType);
    setDepartmentId(r.departmentId);
    setNotificationType(r.notificationType);
    // Prefer the new multi-source array if present; otherwise fall
    // back to a single entry built from the legacy column so the
    // user sees what they had before.
    setRecipientResolvers(
      r.recipientResolvers && r.recipientResolvers.length > 0
        ? r.recipientResolvers
        : [{ kind: r.recipientResolver }],
    );
    setIsEnabled(r.isEnabled);
    if (r.triggerSpec.kind === 'event') {
      setEventType(r.triggerSpec.eventType);
    } else if (r.triggerSpec.kind === 'cron') {
      setCron(r.triggerSpec.cron);
      // Legacy fields (sourceEntity from round 2, query.kind from
      // round 1) stay on the BE row for back-compat but are no
      // longer surfaced here — conditions determine the scan.
    }
    setConditions(r.triggerSpec.conditions ?? null);
  }, [mode, existing.data]);

  /* ---------- Live preview ---------- */
  const eventCatalog = useEventCatalog();
  // Derive the source kind we want to preview against:
  //   - event triggers: pull from the event catalog's sourceKind
  //   - cron triggers: take the entity of the first condition leaf
  //     since the scheduler scans those entities anyway
  const previewSourceKind = React.useMemo<string | null>(() => {
    if (triggerType === 'event') {
      const def = eventCatalog.data?.events.find((e) => e.type === eventType);
      return def?.sourceKind ?? null;
    }
    return firstEntityFromConditions(conditions);
  }, [triggerType, eventType, conditions, eventCatalog.data]);

  const conditionPreview = usePreviewConditions({
    sourceKind: previewSourceKind,
    conditions: conditions ?? undefined,
    departmentId,
  });

  const recipientPreview = usePreviewRecipients({
    recipientResolvers,
    sourceKind: previewSourceKind,
    departmentId,
  });

  const isDraft = existing.data?.status === 'draft' || mode === 'create';
  const isActive = existing.data?.status === 'active';
  const isArchived = existing.data?.status === 'archived';
  const busy = create.isPending || update.isPending || publish.isPending || archive.isPending;

  // Active and archived rules are content-locked. The sheet renders
  // in pure view mode for those — toggle Enabled from the rules-list
  // Switch instead, where the per-row mutation lives.
  const readonly = !isDraft;

  // Required-field validation. Mirrors the BE zod schema so the user
  // gets inline feedback before the request lands and the Save button
  // doesn't fire a doomed POST.
  const keyError =
    mode === 'create' && (key.trim().length === 0 || !/^[a-z0-9][a-z0-9-]*$/.test(key.trim()))
      ? 'lowercase letters, digits, dashes — used in seeds + URLs'
      : null;
  const nameError = isDraft && name.trim().length === 0 ? 'Name is required' : null;
  // Rules with zero recipients silently no-op at fire time, which is
  // confusing. Block save until the editor has at least one entry
  // that actually has its required config filled in.
  const recipientsError =
    isDraft && recipientResolvers.length === 0 ? 'Add at least one recipient source' : null;
  const canSave = !busy && !keyError && !nameError && !recipientsError;

  function buildTriggerSpec(): TriggerSpec {
    if (triggerType === 'event') {
      // Event rules fire at the event moment. "N days before X" lives
      // on cron rules via the in_exactly_days / anniversary_in_exactly_days
      // condition operators on date fields.
      return { kind: 'event', eventType, conditions };
    }
    // Conditions-driven cron: the scheduler walks the tree and picks
    // its scan targets from the entity prefixes the conditions
    // reference. We don't emit sourceEntity or query on new writes.
    return { kind: 'cron', cron, conditions };
  }

  async function handleSaveDraft() {
    try {
      const spec = buildTriggerSpec();
      // The legacy single-string column stays in sync with the first
      // entry's kind so older read paths get a sensible value too.
      const legacyResolver = recipientResolvers[0]?.kind ?? 'self';
      if (mode === 'create') {
        const created = await create.mutateAsync({
          key,
          name,
          description: description || undefined,
          triggerType,
          triggerSpec: spec,
          notificationType,
          recipientResolver: legacyResolver,
          recipientResolvers,
          departmentId,
        });
        toast.success(`Draft "${created.key}" created`);
        router.push(`/reminder-rules?sheet=edit&id=${encodeURIComponent(created.id)}`);
      } else if (ruleId && isDraft) {
        await update.mutateAsync({
          name,
          description,
          triggerSpec: spec,
          notificationType,
          recipientResolver: legacyResolver,
          recipientResolvers,
          departmentId,
          isEnabled,
        });
        toast.success('Draft saved');
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handlePublish() {
    if (!ruleId) return;
    try {
      await publish.mutateAsync();
      toast.success('Rule published — scheduler will pick it up on the next tick');
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleArchive() {
    if (!ruleId) return;
    if (!confirm('Archive this rule? It will stop firing immediately.')) return;
    try {
      await archive.mutateAsync();
      toast.success('Rule archived');
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="lg">
        <SheetHeader>
          <SheetTitle>
            {mode === 'create' ? 'New reminder rule' : `${name || 'Reminder rule'}`}
          </SheetTitle>
          <p className="text-fn-fg-faint text-[12px]">
            {mode === 'create'
              ? 'Drafts can be edited freely. Publishing creates v1.0; future edits draft a new version.'
              : existing.data
                ? `v${existing.data.version} · ${existing.data.status}${
                    readonly ? ' · view only' : ''
                  }`
                : 'Loading…'}
          </p>
        </SheetHeader>

        <SheetBody>
          <div className="gap-fn-5 flex flex-col">
            {/* Basics */}
            <FormSection title="Basics">
              <Field
                label="Key"
                hint="lowercase letters, digits, dashes — used in seeds + URLs"
                error={key.length > 0 ? keyError : null}
              >
                <Input
                  value={key}
                  // Normalize as the user types:
                  //   - uppercase → lowercase
                  //   - any whitespace → '-'
                  //   - collapse runs of '-' so "Probation  END" → "probation-end"
                  //   - strip any other illegal characters (the BE regex
                  //     allows only [a-z0-9-]).
                  onChange={(e) =>
                    setKey(
                      e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, '-')
                        .replace(/[^a-z0-9-]/g, '')
                        .replace(/-{2,}/g, '-'),
                    )
                  }
                  disabled={mode === 'edit'}
                  placeholder="probation-end-eng"
                  aria-invalid={!!(key.length > 0 && keyError)}
                />
              </Field>
              <Field label="Name" error={name.length === 0 ? null : nameError}>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={readonly}
                  placeholder="Probation end"
                  aria-invalid={!!nameError && name.length > 0}
                />
              </Field>
              <Field label="Description">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={readonly}
                  rows={2}
                  placeholder="Notify HR and the direct manager 14 days before…"
                />
              </Field>
              <div className="gap-fn-3 grid grid-cols-2">
                <Field label="Department scope">
                  <Select
                    value={departmentId ?? 'all'}
                    onValueChange={(v) => setDepartmentId(v === 'all' ? null : v)}
                    disabled={readonly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All departments</SelectItem>
                      {(refs.data?.departments ?? []).map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Enabled">
                  <div className="h-fn-9 gap-fn-2 flex items-center">
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={setIsEnabled}
                      // Toggling Enabled on active rules lives on the
                      // rules-list Switch — the sheet stays read-only
                      // for active/archived so there's no editor
                      // surface that can round-trip a "not allowed"
                      // error.
                      disabled={readonly || busy}
                    />
                    <span className="text-fn-fg-muted text-[12.5px]">
                      {isEnabled ? 'Firing on schedule' : 'Muted'}
                    </span>
                  </div>
                </Field>
              </div>
            </FormSection>

            {/* Trigger */}
            <FormSection title="Trigger">
              <Field label="Trigger type">
                <div className="gap-fn-1_5 flex">
                  <TypeChip
                    label="Event-based"
                    active={triggerType === 'event'}
                    onClick={() => setTriggerType('event')}
                    disabled={mode === 'edit'}
                  />
                  <TypeChip
                    label="Time-based (cron)"
                    active={triggerType === 'cron'}
                    onClick={() => setTriggerType('cron')}
                    disabled={mode === 'edit'}
                  />
                </div>
              </Field>

              {triggerType === 'event' ? (
                <Field
                  label="Event type"
                  hint="Pick an emitted event the system publishes. Event rules fire when the event happens — for 'N days before X' semantics, switch to Time-based (cron) and use date operators in Conditions."
                >
                  <EventPicker value={eventType} onChange={setEventType} disabled={!isDraft} />
                </Field>
              ) : (
                <>
                  <Field label="Cron schedule">
                    <CronPicker value={cron} onChange={setCron} disabled={!isDraft} />
                  </Field>
                  <p className="text-fn-fg-faint -mt-fn-1 text-[11.5px]">
                    The scheduler scans whichever entities your conditions reference at each tick.
                    Add a condition on Employee, Project, Commission rule, etc. — the scheduler
                    figures out the rest.
                  </p>
                </>
              )}
            </FormSection>

            {/* Optional condition tree — hidden when the event has no
                source entity (e.g. commission.rule.published); for those
                rules conditions can't reference anything meaningful. */}
            {!(triggerType === 'event' && previewSourceKind === null) && (
              <FormSection
                title={
                  conditions ? `Conditions · ${countLeaves(conditions)}` : 'Conditions (optional)'
                }
              >
                <p className="text-fn-fg-muted text-[12px]">
                  {triggerType === 'event'
                    ? `Filter the source entity — only matching ${friendlyKind(previewSourceKind)} schedule a reminder.`
                    : 'Layer filters on the cron scan — only entities matching these conditions schedule a reminder. Combine fields across Employee, Department, Project, Commission rule, and more, with AND / OR groups for any-of / all-of logic.'}
                </p>
                <ConditionBuilder
                  value={conditions}
                  onChange={setConditions}
                  disabled={readonly}
                  eventSourceKind={triggerType === 'event' ? previewSourceKind : null}
                />
                <PreviewChip
                  tone="info"
                  loading={conditionPreview.isFetching}
                  empty={!previewSourceKind}
                  emptyLabel="Pick an event type or add a condition to preview matches"
                  label={
                    conditionPreview.data
                      ? `${conditionPreview.data.matched.toLocaleString()} of ${conditionPreview.data.total.toLocaleString()} ${friendlyKind(previewSourceKind)} match${conditionPreview.data.matched === 1 ? 'es' : ''}`
                      : null
                  }
                  sample={conditionPreview.data?.sample.map((s) => s.label) ?? []}
                />
              </FormSection>
            )}

            {/* Notification + recipients */}
            <FormSection title="Notification">
              <Field
                label="Notification type"
                hint="Defines the title, body, and email template. Manage custom types from the rules-list header."
              >
                <NotificationTypePicker
                  value={notificationType}
                  onChange={setNotificationType}
                  disabled={readonly}
                />
              </Field>
              <Field
                label="Recipients"
                hint="Add one or more sources — Specific employees, Role members, a Relation to the source (manager / reports / etc.), or the static groups like HR. The final list is the dedup'd union."
                error={recipientResolvers.length > 0 ? null : recipientsError}
              >
                <RecipientList
                  value={recipientResolvers}
                  onChange={setRecipientResolvers}
                  disabled={readonly}
                />
                <PreviewChip
                  tone="success"
                  loading={recipientPreview.isFetching}
                  empty={recipientResolvers.length === 0}
                  emptyLabel="Add a recipient source to see who would be notified"
                  label={
                    recipientPreview.data
                      ? `${recipientPreview.data.count.toLocaleString()} recipient${recipientPreview.data.count === 1 ? '' : 's'}`
                      : null
                  }
                  sample={recipientPreview.data?.sample.map((s) => s.name) ?? []}
                />
              </Field>
            </FormSection>

            {isActive && (
              <p className="rounded-fn-xs border-fn-info-soft-fg/35 bg-fn-info-soft/40 text-fn-info-soft-fg px-fn-3 py-fn-2 border text-[12.5px]">
                Active rules are read-only here. Toggle <strong>Enabled</strong> from the rules
                list, or draft a new version to change content.
              </p>
            )}
            {isArchived && (
              <p className="rounded-fn-xs border-fn-warning-soft-fg/35 bg-fn-warning-soft/40 text-fn-warning-soft-fg px-fn-3 py-fn-2 border text-[12.5px]">
                This is an archived version. Draft a new version from the rule list to make changes.
              </p>
            )}
          </div>
        </SheetBody>

        <SheetFooter>
          {isActive && (
            <Button variant="ghost" onClick={handleArchive} disabled={busy}>
              Archive
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          {isDraft && (
            <>
              <Button
                variant="secondary"
                onClick={handleSaveDraft}
                disabled={!canSave}
                title={keyError ?? nameError ?? recipientsError ?? undefined}
              >
                {busy ? <Loader2 className="h-fn-3_5 w-fn-3_5 animate-spin" /> : null}
                Save draft
              </Button>
              {mode === 'edit' && ruleId && (
                <Button onClick={handlePublish} disabled={busy} className="ml-auto">
                  Publish
                </Button>
              )}
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="gap-fn-3 flex flex-col">
      <h3 className="text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight text-[11px] uppercase">
        {title}
      </h3>
      <div className="gap-fn-3 flex flex-col">{children}</div>
    </section>
  );
}

function Field({
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
      <Label className="text-fn-fg-muted text-[12.5px]">{label}</Label>
      {children}
      {error ? (
        <p className="text-fn-danger text-[11px]">{error}</p>
      ) : hint ? (
        <p className="text-fn-fg-faint text-[11px]">{hint}</p>
      ) : null}
    </div>
  );
}

function PreviewChip({
  tone,
  loading,
  empty,
  emptyLabel,
  label,
  sample,
}: {
  tone: 'info' | 'success';
  loading: boolean;
  empty: boolean;
  emptyLabel: string;
  label: string | null;
  sample: string[];
}) {
  if (empty) {
    return <p className="text-fn-fg-faint text-[11.5px]">{emptyLabel}</p>;
  }
  if (loading && !label) {
    return (
      <span className="text-fn-fg-faint gap-fn-1_5 inline-flex items-center text-[11.5px]">
        <Loader2 className="h-fn-3 w-fn-3 animate-spin" /> Counting…
      </span>
    );
  }
  if (!label) return null;
  const toneCls =
    tone === 'success'
      ? 'border-fn-success-soft-fg/35 bg-fn-success-soft/50 text-fn-success-soft-fg'
      : 'border-fn-info-soft-fg/35 bg-fn-info-soft/50 text-fn-info-soft-fg';
  return (
    <div className="gap-fn-2 flex flex-wrap items-center">
      <span
        className={`rounded-fn-xs px-fn-2 py-fn-0_5 font-fn-semibold inline-flex items-center border text-[11px] tabular-nums ${toneCls}`}
      >
        {label}
      </span>
      {sample.length > 0 && (
        <span className="text-fn-fg-faint text-[11px]">
          {sample.slice(0, 3).join(' · ')}
          {sample.length > 3 ? ' · …' : ''}
        </span>
      )}
    </div>
  );
}

function friendlyKind(kind: string | null): string {
  if (!kind) return 'entities';
  const map: Record<string, string> = {
    employee: 'employees',
    employeeDocument: 'documents',
    department: 'departments',
    designation: 'designations',
    project: 'projects',
    projectCategory: 'project categories',
    projectAssignment: 'assignments',
    commissionRule: 'commission rules',
    commissionRun: 'commission runs',
  };
  return map[kind] ?? `${kind} rows`;
}

function firstEntityFromConditions(node: ConditionNode | null | undefined): string | null {
  if (!node) return null;
  if (node.kind === 'leaf') {
    const dot = node.field.indexOf('.');
    return dot > 0 ? node.field.slice(0, dot) : node.field;
  }
  for (const child of node.conditions) {
    const found = firstEntityFromConditions(child);
    if (found) return found;
  }
  return null;
}

function TypeChip({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'rounded-fn-xs px-fn-3 py-fn-1_5 font-fn-medium border text-[12.5px] transition-colors',
        active
          ? 'border-fn-accent/30 bg-fn-accent-soft text-fn-accent-soft-fg'
          : 'border-fn-border bg-fn-bg-panel text-fn-fg-muted hover:border-fn-fg-faint',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
