'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type {
  CommissionDisputeCreateInput,
  CommissionDisputeListQuery,
  CommissionDisputeListResponse,
  CommissionDisputePublic,
  CommissionDisputeResolveInput,
} from '@futurenostics/types';
import { apiFetch } from '@/lib/api-client';

const KEY = {
  list: (q: Partial<CommissionDisputeListQuery>) => ['commission-disputes', 'list', q] as const,
};

function buildQs(query: Partial<CommissionDisputeListQuery>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useCommissionDisputes(query: Partial<CommissionDisputeListQuery> = {}) {
  return useQuery<CommissionDisputeListResponse>({
    queryKey: KEY.list(query),
    queryFn: () =>
      apiFetch<CommissionDisputeListResponse>(`/api/commission-disputes${buildQs(query)}`),
    placeholderData: (previous) => previous,
  });
}

export function useRaiseDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CommissionDisputeCreateInput) =>
      apiFetch<CommissionDisputePublic>('/api/commission-disputes', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidate(qc),
  });
}

export function useResolveDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; data: CommissionDisputeResolveInput }) =>
      apiFetch<CommissionDisputePublic>(`/api/commission-disputes/${input.id}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify(input.data),
      }),
    onSuccess: () => invalidate(qc),
  });
}

function invalidate(qc: QueryClient): void {
  qc.invalidateQueries({ queryKey: ['commission-disputes'] });
}
