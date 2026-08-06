'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ReminderTaskCompleteInput,
  ReminderTaskListQuery,
  ReminderTaskListResponse,
  ReminderTaskPublic,
} from '@futurenostics/types';
import { apiFetch } from '@/lib/api-client';

function qs(query: Partial<ReminderTaskListQuery>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function useReminderTasks(query: Partial<ReminderTaskListQuery> = {}) {
  return useQuery<ReminderTaskListResponse>({
    queryKey: ['reminder-tasks', query],
    queryFn: () => apiFetch<ReminderTaskListResponse>(`/api/reminder-tasks${qs(query)}`),
    placeholderData: (prev) => prev,
  });
}

export function useCompleteReminderTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; data: ReminderTaskCompleteInput }) =>
      apiFetch<ReminderTaskPublic>(`/api/reminder-tasks/${input.id}/complete`, {
        method: 'POST',
        body: JSON.stringify(input.data),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['reminder-tasks'] }),
  });
}

export function useCancelReminderTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      apiFetch<ReminderTaskPublic>(`/api/reminder-tasks/${input.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: input.reason }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['reminder-tasks'] }),
  });
}
