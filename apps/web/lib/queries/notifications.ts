'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface NotificationPublic {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  severity: 'info' | 'success' | 'warning' | 'danger' | string;
  channel: string;
  status: 'unread' | 'read' | 'dismissed' | 'sent' | string;
  payload: unknown;
  sourceType: string | null;
  sourceId: string | null;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationListResponse {
  items: NotificationPublic[];
  total: number;
  unreadCount: number;
}

const KEY = {
  list: (status?: string) => ['notifications', 'list', status ?? 'active'] as const,
  unread: () => ['notifications', 'unread-count'] as const,
  types: () => ['notifications', 'types'] as const,
  customTypes: () => ['notifications', 'custom-types'] as const,
};

export type Severity = 'info' | 'success' | 'warning' | 'danger';
export type Channel = 'in_app' | 'email' | 'push' | 'slack';

export interface NotificationTypePublic {
  key: string;
  name: string;
  description: string | null;
  severity: Severity;
  module: string;
  defaultChannels: Channel[];
}

export interface CustomNotificationTypePublic {
  id: string;
  key: string;
  name: string;
  description: string | null;
  severity: Severity;
  channels: Channel[];
  titleTemplate: string;
  bodyTemplate: string;
  linkTemplate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Live registry of notification types — module-shipped + custom rows merged. */
export function useNotificationTypes() {
  return useQuery<{ items: NotificationTypePublic[] }>({
    queryKey: KEY.types(),
    queryFn: () => apiFetch<{ items: NotificationTypePublic[] }>('/api/notifications/types'),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}

/** Custom rows only — for the admin sheet. */
export function useCustomNotificationTypes() {
  return useQuery<{ items: CustomNotificationTypePublic[] }>({
    queryKey: KEY.customTypes(),
    queryFn: () =>
      apiFetch<{ items: CustomNotificationTypePublic[] }>('/api/notifications/custom-types'),
    staleTime: 60_000,
  });
}

export interface CreateCustomTypeInput {
  key: string;
  name: string;
  description?: string | null;
  severity: Severity;
  channels: Channel[];
  titleTemplate: string;
  bodyTemplate: string;
  linkTemplate?: string | null;
}

export interface UpdateCustomTypeInput {
  name?: string;
  description?: string | null;
  severity?: Severity;
  channels?: Channel[];
  titleTemplate?: string;
  bodyTemplate?: string;
  linkTemplate?: string | null;
  isActive?: boolean;
}

export function useCreateCustomType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomTypeInput) =>
      apiFetch<CustomNotificationTypePublic>('/api/notifications/custom-types', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateCustomType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCustomTypeInput }) =>
      apiFetch<CustomNotificationTypePublic>(`/api/notifications/custom-types/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useArchiveCustomType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<CustomNotificationTypePublic>(`/api/notifications/custom-types/${id}/archive`, {
        method: 'POST',
      }),
    onSuccess: () => invalidateAll(qc),
  });
}

function invalidateAll(qc: QueryClient): void {
  qc.invalidateQueries({ queryKey: ['notifications', 'types'] });
  qc.invalidateQueries({ queryKey: ['notifications', 'custom-types'] });
}

/** Polls every 30s in the background to keep the bell badge fresh. */
export function useUnreadNotificationCount() {
  return useQuery<{ count: number }>({
    queryKey: KEY.unread(),
    queryFn: () => apiFetch<{ count: number }>('/api/notifications/unread-count'),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
}

/** Recent notifications for the bell popover. Default: 10 most recent active rows. */
export function useNotifications(opts: { status?: 'active' | 'unread'; limit?: number } = {}) {
  const status = opts.status ?? 'active';
  const limit = opts.limit ?? 10;
  return useQuery<NotificationListResponse>({
    queryKey: KEY.list(status),
    queryFn: () =>
      apiFetch<NotificationListResponse>(`/api/notifications?status=${status}&limit=${limit}`),
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<NotificationPublic>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => invalidate(qc),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ updated: number }>(`/api/notifications/mark-all-read`, { method: 'POST' }),
    onSuccess: () => invalidate(qc),
  });
}

export function useDismissNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<NotificationPublic>(`/api/notifications/${id}/dismiss`, { method: 'PATCH' }),
    onSuccess: () => invalidate(qc),
  });
}

function invalidate(qc: QueryClient): void {
  qc.invalidateQueries({ queryKey: ['notifications'] });
}
