'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type {
  OpdClaimCreateInput,
  OpdClaimDetail,
  OpdClaimListQuery,
  OpdClaimListResponse,
  OpdClaimPublic,
  OpdClaimReturnInput,
  OpdClaimUpdateInput,
} from '@futurenostics/types';
import { apiFetch } from '@/lib/api-client';

const KEY = {
  list: (q: Partial<OpdClaimListQuery>) => ['opd-claims', 'list', q] as const,
  one: (id: string) => ['opd-claims', 'one', id] as const,
};

function buildQs(query: Partial<OpdClaimListQuery>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** Default rows per page on the medical claims list. */
export const OPD_CLAIMS_PAGE_SIZE = 10;

export function useOpdClaims(query: Partial<OpdClaimListQuery> = {}, enabled = true) {
  return useQuery<OpdClaimListResponse>({
    queryKey: KEY.list(query),
    queryFn: () => apiFetch<OpdClaimListResponse>(`/api/opd/claims${buildQs(query)}`),
    enabled,
    placeholderData: (previous) => previous,
  });
}

/** Paginated list with infinite scroll (offset/limit + hasMore from API). */
export function useInfiniteOpdClaims(
  baseQuery: Omit<Partial<OpdClaimListQuery>, 'offset' | 'limit'>,
  pageSize = OPD_CLAIMS_PAGE_SIZE,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: ['opd-claims', 'infinite', baseQuery, pageSize] as const,
    enabled,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      apiFetch<OpdClaimListResponse>(
        `/api/opd/claims${buildQs({
          ...baseQuery,
          offset: pageParam as number,
          limit: pageSize,
        })}`,
      ),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.reduce((sum, p) => sum + p.items.length, 0);
    },
  });
}

export function useOpdClaim(id: string | null) {
  return useQuery<OpdClaimDetail>({
    queryKey: KEY.one(id ?? ''),
    queryFn: () => apiFetch<OpdClaimDetail>(`/api/opd/claims/${id}`),
    enabled: !!id,
  });
}

export function useCreateOpdClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OpdClaimCreateInput) =>
      apiFetch<OpdClaimPublic>('/api/opd/claims', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateOpdClaim(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OpdClaimUpdateInput) =>
      apiFetch<OpdClaimPublic>(`/api/opd/claims/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      invalidate(qc, data.id);
    },
  });
}

export function useSubmitOpdClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<OpdClaimPublic>(`/api/opd/claims/${id}/submit`, { method: 'POST' }),
    onSuccess: (data) => invalidate(qc, data.id),
  });
}

export function useReturnOpdClaimForCorrection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: OpdClaimReturnInput }) =>
      apiFetch<OpdClaimPublic>(`/api/opd/claims/${id}/return-for-correction`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => invalidate(qc, data.id),
  });
}

export async function uploadOpdDocument(claimId: string, file: File): Promise<OpdClaimPublic> {
  const fd = new FormData();
  fd.append('document', file);
  return apiFetch<OpdClaimPublic>(`/api/opd/claims/${claimId}/documents`, {
    method: 'POST',
    body: fd,
  });
}

export function useUploadOpdDocument(claimId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadOpdDocument(claimId, file),
    onSuccess: (data) => invalidate(qc, data.id),
  });
}

export function useRemoveOpdDocument(claimId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) =>
      apiFetch<OpdClaimPublic>(`/api/opd/claims/${claimId}/documents/${documentId}`, {
        method: 'DELETE',
      }),
    onSuccess: (data) => invalidate(qc, data.id),
  });
}

/** @deprecated Use useUploadOpdDocument */
export function useUploadOpdPrescription(id: string) {
  return useUploadOpdDocument(id);
}

function invalidate(qc: QueryClient, id?: string): void {
  qc.invalidateQueries({ queryKey: ['opd-claims'] });
  if (id) qc.invalidateQueries({ queryKey: KEY.one(id) });
  qc.invalidateQueries({ queryKey: ['approvals'] });
}
