'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiFetch, isApiError } from '@/lib/api-client';
import type {
  DepartmentHeadRef,
  DepartmentListResponse,
  DepartmentPublic,
} from '@futurenostics/types';

export type { DepartmentPublic, DepartmentListResponse, DepartmentHeadRef };

const KEY = {
  list: (includeHidden: boolean) => ['settings', 'departments', { includeHidden }] as const,
};

function invalidateDepartments(qc: QueryClient): void {
  qc.invalidateQueries({ queryKey: ['settings', 'departments'] });
  // Departments are a reference option on the employee form — keep those
  // dropdowns in sync too.
  qc.invalidateQueries({ queryKey: ['employees', 'references'] });
}

interface DepartmentMutationInput {
  name: string;
  description: string | null;
  headEmployeeId: string | null;
}

export function useDepartments(includeHidden = false) {
  return useQuery<DepartmentListResponse>({
    queryKey: KEY.list(includeHidden),
    queryFn: () =>
      apiFetch(`/api/settings/departments${includeHidden ? '?includeHidden=true' : ''}`),
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation<DepartmentPublic, Error, DepartmentMutationInput>({
    mutationFn: (input) =>
      apiFetch('/api/settings/departments', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => invalidateDepartments(qc),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation<DepartmentPublic, Error, DepartmentMutationInput & { id: string }>({
    mutationFn: ({ id, ...input }) =>
      apiFetch(`/api/settings/departments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateDepartments(qc),
  });
}

export function useHideDepartment() {
  const qc = useQueryClient();
  return useMutation<{ id: string }, Error, string>({
    mutationFn: (id) => apiFetch(`/api/settings/departments/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateDepartments(qc),
  });
}

export function useRestoreDepartment() {
  const qc = useQueryClient();
  return useMutation<DepartmentPublic, Error, string>({
    mutationFn: (id) => apiFetch(`/api/settings/departments/${id}/restore`, { method: 'POST' }),
    onSuccess: () => invalidateDepartments(qc),
  });
}

/**
 * When a create/rename fails because the name clashes with a hidden
 * department, the API returns `409 { code: 'DEPARTMENT_HIDDEN', hiddenId }`
 * instead of a generic duplicate error. Callers use this to route into a
 * restore-confirm dialog rather than showing a "name taken" toast.
 */
export function hiddenDepartmentId(err: unknown): string | null {
  if (!isApiError(err)) return null;
  const body = err.body as { code?: string; hiddenId?: string } | null;
  if (body?.code === 'DEPARTMENT_HIDDEN' && typeof body.hiddenId === 'string') {
    return body.hiddenId;
  }
  return null;
}
