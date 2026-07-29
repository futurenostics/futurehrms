'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type {
  CommissionLineItemAdjustInput,
  CommissionLineItemManualCreateInput,
  CommissionRunAnalytics,
  CommissionRunApproveInput,
  CommissionRunCreateInput,
  CommissionRunDetail,
  CommissionRunListQuery,
  CommissionRunListResponse,
  CommissionRunRejectInput,
  CommissionRunsTrend,
  CommissionRunSubmitInput,
  CommissionRunSummary,
  EmployeeCommissionBreakdown,
  EmployeeCommissionTrend,
} from '@futurenostics/types';
import { apiFetch } from '@/lib/api-client';

const KEY = {
  list: (q: Partial<CommissionRunListQuery>) => ['commission-runs', 'list', q] as const,
  one: (id: string) => ['commission-runs', 'one', id] as const,
  employeeBreakdown: (employeeId: string, month: string) =>
    ['employees', employeeId, 'commission-breakdown', month] as const,
  employeeTrend: (employeeId: string, monthsBack: number) =>
    ['employees', employeeId, 'commission-trend', monthsBack] as const,
  analytics: (id: string, topN: number) => ['commission-runs', 'analytics', id, topN] as const,
  trend: (monthsBack: number) => ['commission-runs', 'trend', monthsBack] as const,
};

function buildQs(query: Partial<CommissionRunListQuery>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useCommissionRunsList(query: Partial<CommissionRunListQuery> = {}) {
  return useQuery<CommissionRunListResponse>({
    queryKey: KEY.list(query),
    queryFn: () => apiFetch<CommissionRunListResponse>(`/api/commission-runs${buildQs(query)}`),
    placeholderData: (previous) => previous,
  });
}

export function useCommissionRun(id: string | null | undefined) {
  return useQuery<CommissionRunDetail>({
    queryKey: KEY.one(id ?? ''),
    queryFn: () => apiFetch<CommissionRunDetail>(`/api/commission-runs/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateCommissionRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CommissionRunCreateInput) =>
      apiFetch<CommissionRunDetail>('/api/commission-runs', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateRunQueries(qc),
  });
}

export function useRecalculateCommissionRun(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<CommissionRunDetail>(`/api/commission-runs/${id}/recalculate`, {
        method: 'POST',
      }),
    onSuccess: () => invalidateRunQueries(qc, id),
  });
}

export function useAdjustLineItem(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { lineItemId: string; data: CommissionLineItemAdjustInput }) =>
      apiFetch<CommissionRunDetail>(
        `/api/commission-runs/${runId}/line-items/${input.lineItemId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(input.data),
        },
      ),
    onSuccess: () => invalidateRunQueries(qc, runId),
  });
}

export function useAddLineItem(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CommissionLineItemManualCreateInput) =>
      apiFetch<CommissionRunDetail>(`/api/commission-runs/${runId}/line-items`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateRunQueries(qc, runId),
  });
}

export function useRemoveLineItem(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lineItemId: string) =>
      apiFetch<CommissionRunDetail>(`/api/commission-runs/${runId}/line-items/${lineItemId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => invalidateRunQueries(qc, runId),
  });
}

export function useSubmitCommissionRun(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CommissionRunSubmitInput) =>
      apiFetch<CommissionRunSummary>(`/api/commission-runs/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateRunQueries(qc, id),
  });
}

export function useApproveCommissionRun(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CommissionRunApproveInput) =>
      apiFetch<CommissionRunSummary>(`/api/commission-runs/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateRunQueries(qc, id),
  });
}

export function useRejectCommissionRun(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CommissionRunRejectInput) =>
      apiFetch<CommissionRunSummary>(`/api/commission-runs/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateRunQueries(qc, id),
  });
}

export function useLockCommissionRun(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<CommissionRunSummary>(`/api/commission-runs/${id}/lock`, { method: 'POST' }),
    onSuccess: () => invalidateRunQueries(qc, id),
  });
}

export function useReopenCommissionRun(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<CommissionRunSummary>(`/api/commission-runs/${id}/reopen`, { method: 'POST' }),
    onSuccess: () => invalidateRunQueries(qc, id),
  });
}

/* ---------- Analytics ---------- */

export function useCommissionRunAnalytics(id: string | null | undefined, topN = 10) {
  return useQuery<CommissionRunAnalytics>({
    queryKey: KEY.analytics(id ?? '', topN),
    queryFn: () =>
      apiFetch<CommissionRunAnalytics>(`/api/commission-runs/${id}/analytics?topN=${topN}`),
    enabled: Boolean(id),
  });
}

export function useCommissionRunsTrend(monthsBack = 12) {
  return useQuery<CommissionRunsTrend>({
    queryKey: KEY.trend(monthsBack),
    queryFn: () =>
      apiFetch<CommissionRunsTrend>(
        `/api/commission-runs/analytics/trend?monthsBack=${monthsBack}`,
      ),
  });
}

/* ---------- Per-employee breakdowns ---------- */

export function useEmployeeCommissionBreakdown(
  employeeId: string | null | undefined,
  monthKey: string | null | undefined,
) {
  return useQuery<EmployeeCommissionBreakdown>({
    queryKey: KEY.employeeBreakdown(employeeId ?? '', monthKey ?? ''),
    queryFn: () =>
      apiFetch<EmployeeCommissionBreakdown>(
        `/api/employees/${employeeId}/commission-breakdown?month=${monthKey}`,
      ),
    enabled: Boolean(employeeId && monthKey),
  });
}

export function useEmployeeCommissionTrend(employeeId: string | null | undefined, monthsBack = 12) {
  return useQuery<EmployeeCommissionTrend>({
    queryKey: KEY.employeeTrend(employeeId ?? '', monthsBack),
    queryFn: () =>
      apiFetch<EmployeeCommissionTrend>(
        `/api/employees/${employeeId}/commission-trend?monthsBack=${monthsBack}`,
      ),
    enabled: Boolean(employeeId),
  });
}

function invalidateRunQueries(qc: QueryClient, id?: string): void {
  qc.invalidateQueries({ queryKey: ['commission-runs', 'list'] });
  if (id) qc.invalidateQueries({ queryKey: KEY.one(id) });
}
