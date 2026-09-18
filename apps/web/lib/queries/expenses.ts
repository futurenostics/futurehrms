'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type {
  ExpenseClaimCreateInput,
  ExpenseClaimDetail,
  ExpenseClaimListQuery,
  ExpenseClaimListResponse,
  ExpenseClaimPublic,
  ExpenseClaimReturnInput,
  ExpenseClaimUpdateInput,
} from '@futurenostics/types';
import { apiFetch } from '@/lib/api-client';

const KEY = {
  list: (q: Partial<ExpenseClaimListQuery>) => ['expense-claims', 'list', q] as const,
  one: (id: string) => ['expense-claims', 'one', id] as const,
};

function buildQs(query: Partial<ExpenseClaimListQuery>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const EXPENSE_CLAIMS_PAGE_SIZE = 10;

export function useExpenseClaims(query: Partial<ExpenseClaimListQuery> = {}, enabled = true) {
  return useQuery<ExpenseClaimListResponse>({
    queryKey: KEY.list(query),
    queryFn: () => apiFetch<ExpenseClaimListResponse>(`/api/expenses/claims${buildQs(query)}`),
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function useExpenseClaim(id: string | null) {
  return useQuery<ExpenseClaimDetail>({
    queryKey: KEY.one(id ?? ''),
    queryFn: () => apiFetch<ExpenseClaimDetail>(`/api/expenses/claims/${id}`),
    enabled: !!id,
  });
}

export function useCreateExpenseClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseClaimCreateInput) =>
      apiFetch<ExpenseClaimPublic>('/api/expenses/claims', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateExpenseClaim(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseClaimUpdateInput) =>
      apiFetch<ExpenseClaimPublic>(`/api/expenses/claims/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => invalidate(qc, data.id),
  });
}

export function useSubmitExpenseClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<ExpenseClaimPublic>(`/api/expenses/claims/${id}/submit`, { method: 'POST' }),
    onSuccess: (data) => invalidate(qc, data.id),
  });
}

export function useReturnExpenseClaimForCorrection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ExpenseClaimReturnInput }) =>
      apiFetch<ExpenseClaimPublic>(`/api/expenses/claims/${id}/return-for-correction`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => invalidate(qc, data.id),
  });
}

export async function uploadExpenseDocument(
  claimId: string,
  file: File,
): Promise<ExpenseClaimPublic> {
  const fd = new FormData();
  fd.append('document', file);
  return apiFetch<ExpenseClaimPublic>(`/api/expenses/claims/${claimId}/documents`, {
    method: 'POST',
    body: fd,
  });
}

export function useUploadExpenseDocument(claimId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadExpenseDocument(claimId, file),
    onSuccess: (data) => invalidate(qc, data.id),
  });
}

export function useRemoveExpenseDocument(claimId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) =>
      apiFetch<ExpenseClaimPublic>(`/api/expenses/claims/${claimId}/documents/${documentId}`, {
        method: 'DELETE',
      }),
    onSuccess: (data) => invalidate(qc, data.id),
  });
}

function invalidate(qc: QueryClient, id?: string): void {
  qc.invalidateQueries({ queryKey: ['expense-claims'] });
  if (id) qc.invalidateQueries({ queryKey: KEY.one(id) });
  qc.invalidateQueries({ queryKey: ['approvals'] });
  qc.invalidateQueries({ queryKey: ['benefit-balances'] });
}
