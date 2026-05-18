'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

/* ---------- Types (mirror apps/api/.../approvals.service.ts) ---------- */

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface ApprovalMetadata {
  title: string;
  sub?: string | null;
  meta?: string | null;
  /** OKLCH hue 0..360 — drives the kind tag tint */
  hue?: number;
  /** When true, the row gets "Review & approve" only (no bulk checkbox). */
  complex?: boolean;
  severity?: 'info' | 'success' | 'warning' | 'danger';
  link?: string | null;
  requester?: {
    userId: string;
    name: string;
    role?: string | null;
    hue?: number;
    initials?: string;
  };
  /** Optional SLA breach marker — e.g. "1 day past SLA". */
  overdueBy?: string | null;
}

export interface ApprovalDecisionPublic {
  id: string;
  decidedById: string;
  decidedByEmail: string;
  decidedByName: string | null;
  decision: 'approve' | 'reject';
  decidedAt: string;
  confirmationData: unknown;
}

export interface ApprovalPublic {
  id: string;
  type: string;
  sourceType: string;
  sourceId: string;
  status: ApprovalStatus;
  submittedById: string;
  submittedByEmail: string;
  submittedByName: string | null;
  submittedAt: string;
  requiredPermission: string;
  decisionPolicy: string;
  metadata: ApprovalMetadata;
  resolvedAt: string | null;
  resolvedById: string | null;
  resolveReason: string | null;
  decisions: ApprovalDecisionPublic[];
}

export interface ApprovalListResponse {
  items: ApprovalPublic[];
  total: number;
  /** Counts keyed by type (+ a synthetic "all" total). */
  counts: Record<string, number>;
}

export interface ApprovalTypePublic {
  kind: string;
  label: string;
  iconKey: string | null;
  module: string;
  requiredPermission: string;
  decisionPolicy: string;
}

export interface ApprovalListQuery {
  status?: ApprovalStatus | 'all';
  type?: string;
  for?: 'me' | 'all';
  limit?: number;
  offset?: number;
}

/* ---------- Query keys ---------- */

const KEY = {
  list: (q: ApprovalListQuery) =>
    [
      'approvals',
      'list',
      q.status ?? 'pending',
      q.type ?? 'all',
      q.for ?? 'me',
      q.limit ?? 50,
      q.offset ?? 0,
    ] as const,
  types: () => ['approvals', 'types'] as const,
  one: (id: string) => ['approvals', 'one', id] as const,
};

/* ---------- Hooks ---------- */

export function useApprovals(query: ApprovalListQuery = {}) {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.type) params.set('type', query.type);
  if (query.for) params.set('for', query.for);
  if (query.limit != null) params.set('limit', String(query.limit));
  if (query.offset != null) params.set('offset', String(query.offset));
  const qs = params.toString();
  return useQuery<ApprovalListResponse>({
    queryKey: KEY.list(query),
    queryFn: () => apiFetch<ApprovalListResponse>(`/api/approvals${qs ? `?${qs}` : ''}`),
    refetchOnWindowFocus: true,
  });
}

export function useApprovalTypes() {
  return useQuery<{ items: ApprovalTypePublic[] }>({
    queryKey: KEY.types(),
    queryFn: () => apiFetch<{ items: ApprovalTypePublic[] }>('/api/approvals/types'),
    staleTime: 10 * 60 * 1000,
  });
}

export function useApproval(id: string | null) {
  return useQuery<ApprovalPublic>({
    queryKey: KEY.one(id ?? ''),
    queryFn: () => apiFetch<ApprovalPublic>(`/api/approvals/${id}`),
    enabled: !!id,
  });
}

/* ---------- Mutations ---------- */

export interface ApproveInput {
  confirmationData?: Record<string, unknown>;
  notes?: string;
}

export function useApproveApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ApproveInput }) =>
      apiFetch<ApprovalPublic>(`/api/approvals/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidate(qc),
  });
}

export function useRejectApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiFetch<ApprovalPublic>(`/api/approvals/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => invalidate(qc),
  });
}

export function useCancelApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiFetch<ApprovalPublic>(`/api/approvals/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => invalidate(qc),
  });
}

function invalidate(qc: QueryClient): void {
  qc.invalidateQueries({ queryKey: ['approvals'] });
  // Approvals resolving usually flips commission-run / payroll-run /
  // overtime state — invalidate the most obvious shared keys.
  qc.invalidateQueries({ queryKey: ['commission-runs'] });
  qc.invalidateQueries({ queryKey: ['notifications'] });
}
