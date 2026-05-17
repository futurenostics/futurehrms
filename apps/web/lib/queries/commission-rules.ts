'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type {
  CommissionRuleAffectedProjects,
  CommissionRuleCreateInput,
  CommissionRuleListQuery,
  CommissionRuleListResponse,
  CommissionRulePublic,
  CommissionRulePublishInput,
  CommissionRuleUpdateInput,
} from '@futurenostics/types';
import { apiFetch } from '@/lib/api-client';

const KEY = {
  list: (q: Partial<CommissionRuleListQuery>) => ['commission-rules', 'list', q] as const,
  one: (id: string) => ['commission-rules', 'one', id] as const,
  affected: (id: string) => ['commission-rules', 'one', id, 'affected-projects'] as const,
};

function buildQs(query: Partial<CommissionRuleListQuery>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useCommissionRulesList(query: Partial<CommissionRuleListQuery> = {}) {
  return useQuery<CommissionRuleListResponse>({
    queryKey: KEY.list(query),
    queryFn: () => apiFetch<CommissionRuleListResponse>(`/api/commission-rules${buildQs(query)}`),
    placeholderData: (previous) => previous,
  });
}

export function useCommissionRule(id: string | null | undefined) {
  return useQuery<CommissionRulePublic>({
    queryKey: KEY.one(id ?? ''),
    queryFn: () => apiFetch<CommissionRulePublic>(`/api/commission-rules/${id}`),
    enabled: Boolean(id),
  });
}

export function useAffectedProjects(id: string | null | undefined) {
  return useQuery<CommissionRuleAffectedProjects>({
    queryKey: KEY.affected(id ?? ''),
    queryFn: () =>
      apiFetch<CommissionRuleAffectedProjects>(`/api/commission-rules/${id}/affected-projects`),
    enabled: Boolean(id),
  });
}

export function useCreateCommissionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CommissionRuleCreateInput) =>
      apiFetch<CommissionRulePublic>('/api/commission-rules', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateRuleQueries(qc),
  });
}

export function useUpdateCommissionRule(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CommissionRuleUpdateInput) =>
      apiFetch<CommissionRulePublic>(`/api/commission-rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateRuleQueries(qc, id),
  });
}

export function usePublishCommissionRule(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CommissionRulePublishInput) =>
      apiFetch<CommissionRulePublic>(`/api/commission-rules/${id}/publish`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateRuleQueries(qc, id),
  });
}

function invalidateRuleQueries(qc: QueryClient, id?: string): void {
  qc.invalidateQueries({ queryKey: ['commission-rules', 'list'] });
  if (id) qc.invalidateQueries({ queryKey: KEY.one(id) });
}
