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
  usePublishRule,
  useRecipientResolvers,
  useReminderRule,
  useUpdateRule,
  type ConditionGroup,
  type CronTriggerSpec,
  type EventTriggerSpec,
  type TriggerSpec,
} from '@/lib/queries/reminders';
import { ConditionBuilder, countLeaves } from '@/components/reminders/condition-builder';

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

const NOTIFICATION_TYPES = [
  { key: 'reminders.probation-ending', label: 'Probation ending' },
  { key: 'reminders.internship-ending', label: 'Internship ending' },
  { key: 'reminders.annual-review', label: 'Annual review' },
  { key: 'reminders.biannual-review', label: 'Biannual review' },
  { key: 'reminders.birthday', label: 'Birthday' },
  { key: 'reminders.work-anniversary', label: 'Work anniversary' },
  { key: 'reminders.visa-renewal', label: 'Visa renewal' },
  { key: 'reminders.document-expiring', label: 'Document expiring' },
];

const EVENT_TYPES = [
  { key: 'employee.created', label: 'Employee created' },
  { key: 'employee.updated', label: 'Employee updated' },
  { key: 'employee.terminated', label: 'Employee terminated' },
  { key: 'project.created', label: 'Project created' },
  { key: 'commission.run.approved', label: 'Commission run approved' },
];

const RELATIVE_FIELDS = [
  { key: 'joinDate', label: 'joinDate' },
  { key: 'probationEndDate', label: 'probationEndDate' },
  { key: 'internshipEndDate', label: 'internshipEndDate' },
  { key: 'dateOfBirth', label: 'dateOfBirth' },
];

const CRON_PRESETS = [
  { value: '0 9 * * *', label: 'Daily at 9:00 PKT' },
  { value: '0 6 * * *', label: 'Daily at 6:00 PKT' },
  { value: '0 9 * * 1', label: 'Monday 9:00 PKT' },
  { value: '0 9 1 * *', label: '1st of month 9:00 PKT' },
];

const CRON_QUERIES: Array<{ key: CronTriggerSpec['query']['kind']; label: string }> = [
  { key: 'birthday', label: 'Birthday (today)' },
  { key: 'work-anniversary', label: 'Work anniversary (today)' },
  { key: 'probation-ending', label: 'Probation ending soon' },
  { key: 'document-expiring', label: 'Document expiring soon' },
];

export function RuleEditorSheet({ open, onOpenChange, mode, ruleId }: RuleEditorSheetProps) {
  const router = useRouter();
  const refs = useReferences();
  const resolvers = useRecipientResolvers();
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
  const [notificationType, setNotificationType] = React.useState(NOTIFICATION_TYPES[0]!.key);
  const [recipientResolver, setRecipientResolver] = React.useState('manager+hr');
  const [isEnabled, setIsEnabled] = React.useState(true);

  // event-trigger fields
  const [eventType, setEventType] = React.useState(EVENT_TYPES[0]!.key);
  const [relativeTo, setRelativeTo] = React.useState(RELATIVE_FIELDS[0]!.key);
  const [offsetValue, setOffsetValue] = React.useState(14);
  const [offsetUnit, setOffsetUnit] = React.useState<'D' | 'W' | 'H'>('D');
  const [offsetDirection, setOffsetDirection] = React.useState<'before' | 'after'>('before');

  // cron-trigger fields
  const [cron, setCron] = React.useState(CRON_PRESETS[0]!.value);
  const [queryKind, setQueryKind] = React.useState<CronTriggerSpec['query']['kind']>('birthday');
  const [withinDays, setWithinDays] = React.useState(14);

  // condition-tree (shared across both trigger types)
  const [conditions, setConditions] = React.useState<ConditionGroup | null>(null);

  // Schedule offset is OPTIONAL on event-based rules. Default is
  // "fire immediately when the event fires" — conditions handle the
  // filtering. Expand the disclosure only when you want to schedule
  // ahead of (or after) a date on the entity (e.g. probationEndDate).
  const [useScheduleOffset, setUseScheduleOffset] = React.useState(false);

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
    setRecipientResolver(r.recipientResolver);
    setIsEnabled(r.isEnabled);
    if (r.triggerSpec.kind === 'event') {
      setEventType(r.triggerSpec.eventType);
      setUseScheduleOffset(!!(r.triggerSpec.relativeTo && r.triggerSpec.offset));
      if (r.triggerSpec.relativeTo) setRelativeTo(r.triggerSpec.relativeTo);
      const m =
        r.triggerSpec.offset != null
          ? /^(-?)P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?)?$/.exec(r.triggerSpec.offset)
          : null;
      if (m) {
        setOffsetDirection(m[1] === '-' ? 'before' : 'after');
        if (m[2]) {
          setOffsetValue(Number(m[2]));
          setOffsetUnit('W');
        } else if (m[3]) {
          setOffsetValue(Number(m[3]));
          setOffsetUnit('D');
        } else if (m[4]) {
          setOffsetValue(Number(m[4]));
          setOffsetUnit('H');
        }
      }
    } else if (r.triggerSpec.kind === 'cron') {
      setCron(r.triggerSpec.cron);
      setQueryKind(r.triggerSpec.query.kind);
      if (
        r.triggerSpec.query.kind === 'probation-ending' ||
        r.triggerSpec.query.kind === 'document-expiring'
      ) {
        setWithinDays(r.triggerSpec.query.withinDays);
      }
    }
    setConditions(r.triggerSpec.conditions ?? null);
  }, [mode, existing.data]);

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
  const canSave = !busy && !keyError && !nameError;

  function buildTriggerSpec(): TriggerSpec {
    if (triggerType === 'event') {
      // Schedule offset is optional. Only attach relativeTo + offset
      // when the disclosure is expanded — otherwise the BE schedules
      // for the event time (fire immediately).
      const spec: EventTriggerSpec = {
        kind: 'event',
        eventType,
        conditions,
      };
      if (useScheduleOffset) {
        spec.relativeTo = relativeTo;
        spec.offset = `${offsetDirection === 'before' ? '-' : ''}P${
          offsetUnit === 'W'
            ? `${offsetValue}W`
            : offsetUnit === 'D'
              ? `${offsetValue}D`
              : `T${offsetValue}H`
        }`;
      }
      return spec;
    }
    const query: CronTriggerSpec['query'] =
      queryKind === 'probation-ending'
        ? { kind: 'probation-ending', withinDays }
        : queryKind === 'document-expiring'
          ? { kind: 'document-expiring', withinDays }
          : queryKind === 'work-anniversary'
            ? { kind: 'work-anniversary' }
            : { kind: 'birthday' };
    return { kind: 'cron', cron, query, conditions };
  }

  async function handleSaveDraft() {
    try {
      const spec = buildTriggerSpec();
      if (mode === 'create') {
        const created = await create.mutateAsync({
          key,
          name,
          description: description || undefined,
          triggerType,
          triggerSpec: spec,
          notificationType,
          recipientResolver,
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
          recipientResolver,
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
                <>
                  <Field label="Event type">
                    <Select value={eventType} onValueChange={setEventType} disabled={!isDraft}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_TYPES.map((t) => (
                          <SelectItem key={t.key} value={t.key}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  {/* Schedule offset — optional. Default = fire immediately. */}
                  <div className="rounded-fn-xs border-fn-border bg-fn-bg-subtle/40 gap-fn-2_5 px-fn-3 py-fn-2_5 flex flex-col border">
                    <div className="gap-fn-2 flex items-center justify-between">
                      <div className="gap-fn-0_5 flex flex-col">
                        <span className="text-fn-fg font-fn-semibold text-[12.5px]">
                          Schedule offset
                        </span>
                        <span className="text-fn-fg-faint text-[11.5px]">
                          {useScheduleOffset
                            ? 'Fire ahead of (or after) a date on the entity.'
                            : 'Off — reminder fires when the event happens. Use conditions to filter who qualifies.'}
                        </span>
                      </div>
                      <Switch
                        checked={useScheduleOffset}
                        disabled={!isDraft}
                        onCheckedChange={setUseScheduleOffset}
                        aria-label="Toggle schedule offset"
                      />
                    </div>

                    {useScheduleOffset && (
                      <>
                        <Field label="Anchor field" hint="Date field on the event payload">
                          <Select
                            value={relativeTo}
                            onValueChange={setRelativeTo}
                            disabled={!isDraft}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {RELATIVE_FIELDS.map((f) => (
                                <SelectItem key={f.key} value={f.key}>
                                  {f.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Offset" hint="Fire this far before/after the anchor date">
                          <div className="gap-fn-2 grid grid-cols-3">
                            <Input
                              type="number"
                              value={offsetValue}
                              onChange={(e) => setOffsetValue(Number(e.target.value))}
                              min={0}
                              disabled={!isDraft}
                            />
                            <Select
                              value={offsetUnit}
                              onValueChange={(v) => setOffsetUnit(v as typeof offsetUnit)}
                              disabled={!isDraft}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="D">Days</SelectItem>
                                <SelectItem value="W">Weeks</SelectItem>
                                <SelectItem value="H">Hours</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select
                              value={offsetDirection}
                              onValueChange={(v) => setOffsetDirection(v as typeof offsetDirection)}
                              disabled={!isDraft}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="before">before</SelectItem>
                                <SelectItem value="after">after</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </Field>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Field label="Cron schedule" hint="Asia/Karachi">
                    <Select value={cron} onValueChange={setCron} disabled={!isDraft}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CRON_PRESETS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label} <span className="text-fn-fg-faint font-mono">{p.value}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Query">
                    <Select
                      value={queryKind}
                      onValueChange={(v) => setQueryKind(v as CronTriggerSpec['query']['kind'])}
                      disabled={!isDraft}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CRON_QUERIES.map((q) => (
                          <SelectItem key={q.key} value={q.key}>
                            {q.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {(queryKind === 'probation-ending' || queryKind === 'document-expiring') && (
                    <Field label="Within (days)">
                      <Input
                        type="number"
                        value={withinDays}
                        onChange={(e) => setWithinDays(Number(e.target.value))}
                        min={1}
                        max={365}
                        disabled={!isDraft}
                      />
                    </Field>
                  )}
                </>
              )}
            </FormSection>

            {/* Optional condition tree */}
            <FormSection
              title={
                conditions ? `Conditions · ${countLeaves(conditions)}` : 'Conditions (optional)'
              }
            >
              <p className="text-fn-fg-muted text-[12px]">
                Layer extra filters on top of the trigger — only entities matching these conditions
                will schedule a reminder. Combine fields across Employee, Department, Project,
                Commission rule, and more, with AND / OR groups for any-of / all-of logic.
              </p>
              <ConditionBuilder value={conditions} onChange={setConditions} disabled={readonly} />
            </FormSection>

            {/* Notification + recipients */}
            <FormSection title="Notification">
              <Field label="Notification type" hint="Defines the title, body, and email template">
                <Select
                  value={notificationType}
                  onValueChange={setNotificationType}
                  disabled={readonly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTIFICATION_TYPES.map((t) => (
                      <SelectItem key={t.key} value={t.key}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Recipients">
                <Select
                  value={recipientResolver}
                  onValueChange={setRecipientResolver}
                  disabled={readonly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(resolvers.data?.items ?? []).map((r) => (
                      <SelectItem key={r.key} value={r.key}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                title={keyError ?? nameError ?? undefined}
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
