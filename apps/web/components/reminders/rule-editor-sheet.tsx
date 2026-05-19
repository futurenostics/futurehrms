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
  type CronTriggerSpec,
  type EventTriggerSpec,
  type TriggerSpec,
} from '@/lib/queries/reminders';

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
      setRelativeTo(r.triggerSpec.relativeTo);
      const m = /^(-?)P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?)?$/.exec(r.triggerSpec.offset);
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
  }, [mode, existing.data]);

  const isDraft = existing.data?.status === 'draft' || mode === 'create';
  const isActive = existing.data?.status === 'active';
  const isArchived = existing.data?.status === 'archived';
  const busy = create.isPending || update.isPending || publish.isPending || archive.isPending;

  function buildTriggerSpec(): TriggerSpec {
    if (triggerType === 'event') {
      const offset = `${offsetDirection === 'before' ? '-' : ''}P${
        offsetUnit === 'W'
          ? `${offsetValue}W`
          : offsetUnit === 'D'
            ? `${offsetValue}D`
            : `T${offsetValue}H`
      }`;
      const spec: EventTriggerSpec = {
        kind: 'event',
        eventType,
        relativeTo,
        offset,
      };
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
    return { kind: 'cron', cron, query };
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
      } else if (ruleId) {
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
                ? `v${existing.data.version} · ${existing.data.status}`
                : 'Loading…'}
          </p>
        </SheetHeader>

        <SheetBody>
          <div className="gap-fn-5 flex flex-col">
            {/* Basics */}
            <FormSection title="Basics">
              <Field label="Key" hint="lowercase letters, digits, dashes — used in seeds + URLs">
                <Input
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  disabled={mode === 'edit'}
                  placeholder="probation-end-eng"
                />
              </Field>
              <Field label="Name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isDraft && !isActive}
                  placeholder="Probation end"
                />
              </Field>
              <Field label="Description">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!isDraft && !isActive}
                  rows={2}
                  placeholder="Notify HR and the direct manager 14 days before…"
                />
              </Field>
              <div className="gap-fn-3 grid grid-cols-2">
                <Field label="Department scope">
                  <Select
                    value={departmentId ?? 'all'}
                    onValueChange={(v) => setDepartmentId(v === 'all' ? null : v)}
                    disabled={!isDraft && !isActive}
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
                      disabled={!isActive || busy}
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
                  <div className="gap-fn-3 grid grid-cols-2">
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
                    <Field label="Anchor field">
                      <Select value={relativeTo} onValueChange={setRelativeTo} disabled={!isDraft}>
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
                  </div>
                  <Field label="Offset" hint="Fire this far before/after the anchor field's date">
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

            {/* Notification + recipients */}
            <FormSection title="Notification">
              <Field label="Notification type" hint="Defines the title, body, and email template">
                <Select
                  value={notificationType}
                  onValueChange={setNotificationType}
                  disabled={!isDraft && !isActive}
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
                  disabled={!isDraft && !isActive}
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
          {isDraft ? (
            <>
              <Button variant="secondary" onClick={handleSaveDraft} disabled={busy}>
                {busy ? <Loader2 className="h-fn-3_5 w-fn-3_5 animate-spin" /> : null}
                Save draft
              </Button>
              {mode === 'edit' && ruleId && (
                <Button onClick={handlePublish} disabled={busy} className="ml-auto">
                  Publish
                </Button>
              )}
            </>
          ) : (
            <Button onClick={handleSaveDraft} disabled={busy} className="ml-auto">
              Save changes
            </Button>
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
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="gap-fn-1 flex flex-col">
      <Label className="text-fn-fg-muted text-[12.5px]">{label}</Label>
      {children}
      {hint && <p className="text-fn-fg-faint text-[11px]">{hint}</p>}
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
