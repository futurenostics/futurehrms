'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

/* ---------- Types ---------- */

export type ReminderRuleStatus = 'draft' | 'active' | 'archived';
export type TriggerType = 'event' | 'cron';

export interface EventTriggerSpec {
  kind: 'event';
  eventType: string;
  relativeTo: string;
  offset: string; // ISO 8601 duration with optional leading -
}

export interface CronTriggerSpec {
  kind: 'cron';
  cron: string;
  query:
    | { kind: 'birthday' }
    | { kind: 'work-anniversary' }
    | { kind: 'probation-ending'; withinDays: number }
    | { kind: 'document-expiring'; withinDays: number }
    | { kind: 'custom'; spec: Record<string, unknown> };
}

export type TriggerSpec = EventTriggerSpec | CronTriggerSpec;

export interface ReminderRulePublic {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: ReminderRuleStatus;
  triggerType: TriggerType;
  triggerSpec: TriggerSpec;
  notificationType: string;
  recipientResolver: string;
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

export interface RecipientResolver {
  key: string;
  label: string;
  description: string | null;
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
  status: () => ['reminders', 'status'] as const,
  timeline: () => ['reminders', 'timeline'] as const,
  scheduled: (s?: string) => ['reminders', 'list', s ?? 'all'] as const,
};

export function useReminderRules(status?: ReminderRuleStatus | 'all') {
  return useQuery<{ items: ReminderRulePublic[]; total: number }>({
    queryKey: KEY.rules(status),
    queryFn: () =>
      apiFetch(
        `/api/reminder-rules${status && status !== 'all' ? `?status=${status}` : ''}`,
      ),
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

/* ---------- Mutations ---------- */

export interface CreateRuleInput {
  key: string;
  name: string;
  description?: string;
  triggerType: TriggerType;
  triggerSpec: TriggerSpec;
  notificationType: string;
  recipientResolver: string;
  departmentId?: string | null;
}

export interface UpdateRuleInput {
  name?: string;
  description?: string | null;
  triggerSpec?: TriggerSpec;
  notificationType?: string;
  recipientResolver?: string;
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

export function useArchiveRule(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<ReminderRulePublic>(`/api/reminder-rules/${id}/archive`, { method: 'POST' }),
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
      apiFetch<{ notificationId: string }>(
        `/api/reminder-rules/${id}/trigger-test`,
        { method: 'POST' },
      ),
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
