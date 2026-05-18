'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type {
  CommissionRuleAffectedProjects,
  CommissionRuleCreateInput,
  CommissionRuleFilterCountsResponse,
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
    // Array filters (departments, categoryIds, …) → comma-joined ids.
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      params.set(k, v.join(','));
      continue;
    }
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Filter-counts fetcher — called by the AdvancedFilters primitive
 * (debounce owned by the primitive). Mirrors the employees + projects
 * fetchers.
 */
export interface CommissionRuleFilterCountsParams {
  departments?: string[];
  categoryIds?: string[];
  statuses?: string[];
  poolModes?: string[];
  poolValueMin?: number;
  poolValueMax?: number;
  effectiveFromStart?: string;
  effectiveFromEnd?: string;
  search?: string;
  activeOnly?: boolean;
}

export async function fetchCommissionRuleFilterCounts(
  params: CommissionRuleFilterCountsParams,
): Promise<CommissionRuleFilterCountsResponse> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      qs.set(k, v.join(','));
    } else {
      qs.set(k, String(v));
    }
  }
  const tail = qs.toString();
  return apiFetch<CommissionRuleFilterCountsResponse>(
    `/api/commission-rules/filter-counts${tail ? `?${tail}` : ''}`,
  );
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
