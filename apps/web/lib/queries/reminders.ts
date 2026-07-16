'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

/* ---------- Types ---------- */

export type ReminderRuleStatus = 'draft' | 'active' | 'archived';
export type TriggerType = 'event' | 'cron';

/* ---------- Condition tree (mirrors BE reminder-conditions.types.ts) ---------- */

export interface ConditionLeaf {
  kind: 'leaf';
  field: string;
  operator: string;
  value?: string | number | boolean | null | Array<string | number>;
}

export interface ConditionGroup {
  kind: 'group';
  /** Legacy uniform operator. Optional. Kept for back-compat reads. */
  operator?: 'and' | 'or';
  /**
   * Per-pair connectors. `connectors[i]` joins `conditions[i]` to
   * `conditions[i+1]`. Length = max(0, conditions.length - 1).
   * SQL-standard precedence: AND binds tighter than OR.
   */
  connectors?: Array<'and' | 'or'>;
  conditions: Array<ConditionLeaf | ConditionGroup>;
}

export type ConditionNode = ConditionLeaf | ConditionGroup;

export interface EventTriggerSpec {
  kind: 'event';
  eventType: string;
  conditions?: ConditionGroup | null;
}

export interface CronTriggerSpec {
  kind: 'cron';
  cron: string;
  /** New preferred path: entity to scan + condition tree filter. */
  sourceEntity?: 'employee' | 'project' | null;
  /** LEGACY built-in queries. Kept for back-compat reads. */
  query?:
    | { kind: 'birthday' }
    | { kind: 'work-anniversary' }
    | { kind: 'probation-ending'; withinDays: number }
    | { kind: 'document-expiring'; withinDays: number }
    | { kind: 'custom'; spec: Record<string, unknown> }
    | null;
  conditions?: ConditionGroup | null;
}

export type TriggerSpec = EventTriggerSpec | CronTriggerSpec;

/* ---------- Field catalog ---------- */

export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'enum';

export type DateRole = 'anniversary' | 'one-shot-future' | 'historical';

export interface FieldDef {
  path: string;
  label: string;
  type: FieldType;
  entity: string;
  hint?: string;
  enumValues?: Array<{ value: string; label: string }>;
  /** Set on date fields — filters the operator menu so impossible
   *  combinations (e.g. "is today" on Date of birth) are hidden. */
  dateRole?: DateRole;
}

export interface EntityDef {
  key: string;
  label: string;
  description: string;
  fields: FieldDef[];
}

export interface FieldCatalogResponse {
  entities: EntityDef[];
  operators: Record<FieldType, Array<{ id: string; label: string }>>;
  dateOperatorsByRole: Record<DateRole, string[]>;
}

/* ---------- Event catalog ---------- */

export type EventSourceKind =
  | 'employee'
  | 'employeeDocument'
  | 'project'
  | 'commissionRun'
  | 'approval'
  | null;

export interface EventTypeDef {
  type: string;
  label: string;
  description: string;
  group: string;
  sourceKind: EventSourceKind;
}

export interface EventCatalogResponse {
  events: EventTypeDef[];
  groups: string[];
}

export interface ReminderRulePublic {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: ReminderRuleStatus;
  triggerType: TriggerType;
  triggerSpec: TriggerSpec;
  notificationType: string;
  /** Legacy single-resolver key. */
  recipientResolver: string;
  /** New multi-source recipient list. Null on legacy rows. */
  recipientResolvers: RecipientEntry[] | null;
  departmentId: string | null;
  isEnabled: boolean;
  version: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  publishedAt: string | null;
  publishedById: string | null;
  createdAt: string;
  createdById: string;
}

export interface SchedulerStatus {
  cron: string;
  timezone: string;
  nextRunIso: string | null;
  lastEvaluatedAtIso: string | null;
  emailsSent30d: number;
  retriesPending: number;
  scheduledNext30d: number;
}

export interface TimelineBucket {
  date: string;
  byRule: Array<{ ruleId: string; ruleKey: string; count: number }>;
  total: number;
}

/** Schema field describing one input the resolver expects in its config. */
export type ResolverConfigField =
  | { key: string; type: 'user-multi'; label: string; required?: boolean }
  | { key: string; type: 'role'; label: string; required?: boolean }
  | {
      key: string;
      type: 'enum';
      label: string;
      required?: boolean;
      options: Array<{ value: string; label: string; description?: string }>;
    };

export interface RecipientResolver {
  key: string;
  label: string;
  description: string | null;
  /** Null = no user-supplied config (the resolver is static). */
  configSchema: ResolverConfigField[] | null;
}

/** One entry in `recipientResolvers` on a rule. */
export interface RecipientEntry {
  kind: string;
  config?: Record<string, unknown>;
}

export interface ReminderPublic {
  id: string;
  ruleId: string;
  ruleKey: string;
  ruleName: string;
  recipientUserId: string;
  recipientEmail: string;
  recipientName: string | null;
  sourceType: string | null;
  sourceId: string | null;
  scheduledFor: string;
  status: 'scheduled' | 'fired' | 'cancelled';
  firedAt: string | null;
  notificationId: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
}

/* ---------- Query hooks ---------- */

const KEY = {
  rules: (status?: string) => ['reminder-rules', 'list', status ?? 'all'] as const,
  rule: (id: string) => ['reminder-rules', 'one', id] as const,
  resolvers: () => ['reminder-rules', 'recipient-resolvers'] as const,
  triggerCounts: () => ['reminder-rules', 'trigger-counts'] as const,
  fieldCatalog: () => ['reminder-rules', 'field-catalog'] as const,
  eventCatalog: () => ['reminder-rules', 'event-catalog'] as const,
  roles: () => ['reminder-rules', 'roles'] as const,
  status: () => ['reminders', 'status'] as const,
  timeline: () => ['reminders', 'timeline'] as const,
  scheduled: (s?: string) => ['reminders', 'list', s ?? 'all'] as const,
};

export function useReminderRules(status?: ReminderRuleStatus | 'all') {
  return useQuery<{ items: ReminderRulePublic[]; total: number }>({
    queryKey: KEY.rules(status),
    queryFn: () =>
      apiFetch(`/api/reminder-rules${status && status !== 'all' ? `?status=${status}` : ''}`),
  });
}

/**
 * Fetch every version of a single rule chain, newest first. Backs the
 * version-history panel in the editor sheet — also drives the "Draft
 * new version" affordance (which we hide if a draft already exists).
 */
export function useRuleVersions(key: string | null | undefined) {
  return useQuery<{ items: ReminderRulePublic[]; total: number }>({
    queryKey: ['reminder-rules', 'versions', key ?? ''],
    queryFn: () => apiFetch(`/api/reminder-rules?key=${encodeURIComponent(key ?? '')}`),
    enabled: !!key,
  });
}

export function useReminderRule(id: string | null) {
  return useQuery<ReminderRulePublic>({
    queryKey: KEY.rule(id ?? ''),
    queryFn: () => apiFetch(`/api/reminder-rules/${id}`),
    enabled: !!id,
  });
}

export function useRecipientResolvers() {
  return useQuery<{ items: RecipientResolver[] }>({
    queryKey: KEY.resolvers(),
    queryFn: () => apiFetch('/api/reminder-rules/recipient-resolvers'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTriggerCounts() {
  return useQuery<Record<string, number>>({
    queryKey: KEY.triggerCounts(),
    queryFn: () => apiFetch('/api/reminder-rules/trigger-counts'),
  });
}

/** Roles list for the recipient-resolver picker. */
export function useReminderRoles() {
  return useQuery<{ items: Array<{ slug: string; name: string }> }>({
    queryKey: KEY.roles(),
    queryFn: () =>
      apiFetch<{ items: Array<{ slug: string; name: string }> }>('/api/reminder-rules/roles'),
    staleTime: 10 * 60 * 1000,
  });
}

/** Catalog of event types the picker can offer. Same pattern as
 *  useFieldCatalog: cached for 10 minutes, fail-fast on error so the
 *  picker can render an actionable empty state. */
export function useEventCatalog() {
  return useQuery<EventCatalogResponse>({
    queryKey: KEY.eventCatalog(),
    queryFn: () => apiFetch<EventCatalogResponse>('/api/reminder-rules/event-catalog'),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}

/** Catalog of entities + fields + operators for the condition builder. */
export function useFieldCatalog() {
  return useQuery<FieldCatalogResponse>({
    queryKey: KEY.fieldCatalog(),
    queryFn: () => apiFetch('/api/reminder-rules/field-catalog'),
    staleTime: 10 * 60 * 1000,
    // The catalog endpoint is a static read — retrying a 404/500
    // just delays the error toast; the answer won't change in a
    // few hundred ms. Fail fast so the ConditionBuilder can show
    // an actionable empty state.
    retry: false,
  });
}

export function useSchedulerStatus() {
  return useQuery<SchedulerStatus>({
    queryKey: KEY.status(),
    queryFn: () => apiFetch('/api/reminders/status'),
    refetchInterval: 60_000,
  });
}

export function useReminderTimeline() {
  return useQuery<{ buckets: TimelineBucket[]; total: number }>({
    queryKey: KEY.timeline(),
    queryFn: () => apiFetch('/api/reminders/timeline'),
  });
}

export function useScheduledReminders(status?: ReminderPublic['status'] | 'all') {
  return useQuery<{ items: ReminderPublic[]; total: number }>({
    queryKey: KEY.scheduled(status),
    queryFn: () =>
      apiFetch(`/api/reminders${status && status !== 'all' ? `?status=${status}` : ''}`),
  });
}

/* ---------- Live preview ---------- */

export interface ConditionPreviewResult {
  matched: number;
  total: number;
  sample: Array<{ id: string; label: string }>;
}

export interface RecipientPreviewResult {
  count: number;
  sample: Array<{ id: string; name: string; email: string | null }>;
}

export function usePreviewConditions(input: {
  sourceKind: string | null;
  conditions?: ConditionNode;
  departmentId?: string | null;
}) {
  const enabled = !!input.sourceKind;
  return useQuery<ConditionPreviewResult>({
    queryKey: ['reminder-rules', 'preview-conditions', input],
    enabled,
    staleTime: 30_000,
    queryFn: () =>
      apiFetch(`/api/reminder-rules/preview-conditions`, {
        method: 'POST',
        body: JSON.stringify({
          sourceKind: input.sourceKind,
          conditions: input.conditions,
          departmentId: input.departmentId ?? null,
        }),
      }),
  });
}

export function usePreviewRecipients(input: {
  recipientResolvers: RecipientEntry[];
  sourceKind?: string | null;
  sourceId?: string | null;
  departmentId?: string | null;
}) {
  const enabled = input.recipientResolvers.length > 0;
  return useQuery<RecipientPreviewResult>({
    queryKey: ['reminder-rules', 'preview-recipients', input],
    enabled,
    staleTime: 30_000,
    queryFn: () =>
      apiFetch(`/api/reminder-rules/preview-recipients`, {
        method: 'POST',
        body: JSON.stringify({
          recipientResolvers: input.recipientResolvers,
          sourceKind: input.sourceKind ?? null,
          sourceId: input.sourceId ?? null,
          departmentId: input.departmentId ?? null,
        }),
      }),
  });
}

/* ---------- Mutations ---------- */

export interface CreateRuleInput {
  key: string;
  name: string;
  description?: string;
  triggerType: TriggerType;
  triggerSpec: TriggerSpec;
  notificationType: string;
  recipientResolver: string;
  recipientResolvers?: RecipientEntry[];
  departmentId?: string | null;
}

export interface UpdateRuleInput {
  /** Draft-only — rename the rule's slug. The API rejects collisions. */
  key?: string;
  name?: string;
  description?: string | null;
  triggerSpec?: TriggerSpec;
  notificationType?: string;
  recipientResolver?: string;
  recipientResolvers?: RecipientEntry[] | null;
  departmentId?: string | null;
  isEnabled?: boolean;
}

export function useCreateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRuleInput) =>
      apiFetch<ReminderRulePublic>('/api/reminder-rules', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateRule(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateRuleInput) =>
      apiFetch<ReminderRulePublic>(`/api/reminder-rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function usePublishRule(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<ReminderRulePublic>(`/api/reminder-rules/${id}/publish`, { method: 'POST' }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDuplicateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<ReminderRulePublic>(`/api/reminder-rules/${id}/duplicate`, {
        method: 'POST',
      }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useArchiveRule() {
  const qc = useQueryClient();
  return useMutation<ReminderRulePublic, Error, string>({
    mutationFn: (id) =>
      apiFetch<ReminderRulePublic>(`/api/reminder-rules/${id}/archive`, {
        method: 'POST',
      }),
    onSuccess: () => invalidateAll(qc),
  });
}

/**
 * Branch a new draft off an existing version (same `key`, version
 * bumped). The BE rejects when an unpublished draft already exists
 * for the chain — surface that error to the caller untouched.
 */
export function useDraftNewVersion() {
  const qc = useQueryClient();
  return useMutation<ReminderRulePublic, Error, string>({
    mutationFn: (id) =>
      apiFetch<ReminderRulePublic>(`/api/reminder-rules/${id}/draft-new-version`, {
        method: 'POST',
      }),
    onSuccess: () => invalidateAll(qc),
  });
}

/**
 * Hard-delete (soft via `deletedAt`) a draft or archived rule. The BE
 * refuses on active rules — the caller must archive first.
 */
export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation<{ id: string }, Error, string>({
    mutationFn: (id) => apiFetch<{ id: string }>(`/api/reminder-rules/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useToggleRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      apiFetch<ReminderRulePublic>(`/api/reminder-rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isEnabled }),
      }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useTriggerTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ notificationId: string }>(`/api/reminder-rules/${id}/trigger-test`, {
        method: 'POST',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useRunSchedulerNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ fired: number; scheduled: number }>(`/api/reminders/run-now`, {
        method: 'POST',
      }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useCancelScheduled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiFetch<{ id: string; status: string }>(`/api/reminders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => invalidateAll(qc),
  });
}

function invalidateAll(qc: QueryClient): void {
  qc.invalidateQueries({ queryKey: ['reminder-rules'] });
  qc.invalidateQueries({ queryKey: ['reminders'] });
}
