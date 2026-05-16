'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type {
  ChangeManagerInput,
  ChangeSalaryInput,
  ChangeStatusInput,
  CsvImportCommitResult,
  CsvImportPreview,
  EmployeeCreateInput,
  EmployeeListQuery,
  EmployeeListResponse,
  EmployeePublic,
  EmployeeUpdateInput,
  OrgChartNode,
  ReferencesResponse,
  SalaryHistoryEntry,
  TimelineEntryPublic,
} from '@futurenostics/types';
import { apiFetch } from '@/lib/api-client';

const KEY = {
  list: (query: Partial<EmployeeListQuery>) => ['employees', 'list', query] as const,
  one: (id: string) => ['employees', 'one', id] as const,
  references: () => ['employees', 'references'] as const,
  salaryHistory: (id: string) => ['employees', id, 'salary-history'] as const,
  timeline: (id: string) => ['employees', id, 'timeline'] as const,
  orgChart: () => ['employees', 'org-chart'] as const,
  total: () => ['employees', 'total'] as const,
};

function buildQs(query: Partial<EmployeeListQuery>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useEmployeesList(query: Partial<EmployeeListQuery>) {
  return useQuery<EmployeeListResponse>({
    queryKey: KEY.list(query),
    queryFn: () => apiFetch<EmployeeListResponse>(`/api/employees${buildQs(query)}`),
    placeholderData: (previous) => previous,
  });
}

export function useEmployee(id: string | null | undefined) {
  return useQuery<EmployeePublic>({
    queryKey: KEY.one(id ?? ''),
    queryFn: () => apiFetch<EmployeePublic>(`/api/employees/${id}`),
    enabled: Boolean(id),
  });
}

export function useReferences() {
  return useQuery<ReferencesResponse>({
    queryKey: KEY.references(),
    queryFn: () => apiFetch<ReferencesResponse>('/api/employees/references'),
    staleTime: 10 * 60_000,
  });
}

export function useSalaryHistory(id: string | null | undefined) {
  return useQuery<SalaryHistoryEntry[]>({
    queryKey: KEY.salaryHistory(id ?? ''),
    queryFn: () => apiFetch<SalaryHistoryEntry[]>(`/api/employees/${id}/salary-history`),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useTimeline(id: string | null | undefined) {
  return useQuery<TimelineEntryPublic[]>({
    queryKey: KEY.timeline(id ?? ''),
    queryFn: () => apiFetch<TimelineEntryPublic[]>(`/api/employees/${id}/timeline`),
    enabled: Boolean(id),
  });
}

export function useOrgChart() {
  return useQuery<OrgChartNode[]>({
    queryKey: KEY.orgChart(),
    queryFn: () => apiFetch<OrgChartNode[]>('/api/employees/org-chart'),
  });
}

export function useEmployeeTotal() {
  return useQuery<{
    total: number;
    byStatus: Array<{ slug: string; name: string; count: number }>;
  }>({
    queryKey: KEY.total(),
    queryFn: () => apiFetch('/api/employees/total'),
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EmployeeCreateInput) =>
      apiFetch<EmployeePublic>('/api/employees', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => invalidateEmployeeQueries(qc, data.id),
  });
}

export function useUpdateEmployee(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EmployeeUpdateInput) =>
      apiFetch<EmployeePublic>(`/api/employees/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateEmployeeQueries(qc, id),
  });
}

export function useDeleteEmployee(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<void>(`/api/employees/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateEmployeeQueries(qc, id),
  });
}

export function useChangeStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangeStatusInput) =>
      apiFetch<EmployeePublic>(`/api/employees/${id}/change-status`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateEmployeeQueries(qc, id),
  });
}

export function useChangeManager(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangeManagerInput) =>
      apiFetch<EmployeePublic>(`/api/employees/${id}/change-manager`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateEmployeeQueries(qc, id),
  });
}

export function useChangeSalary(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangeSalaryInput) =>
      apiFetch<EmployeePublic>(`/api/employees/${id}/change-salary`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateEmployeeQueries(qc, id),
  });
}

export function useUploadPhoto(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('photo', file);
      return apiFetch<{ documentId: string; photoUrl: string | null }>(
        `/api/employees/${id}/photo`,
        { method: 'POST', body: fd },
      );
    },
    onSuccess: () => invalidateEmployeeQueries(qc, id),
  });
}

export function useImportPreview() {
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return apiFetch<CsvImportPreview>('/api/employees/import/preview', {
        method: 'POST',
        body: fd,
      });
    },
  });
}

export function useImportCommit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return apiFetch<CsvImportCommitResult>('/api/employees/import', {
        method: 'POST',
        body: fd,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

function invalidateEmployeeQueries(qc: QueryClient, id?: string): void {
  qc.invalidateQueries({ queryKey: ['employees', 'list'] });
  qc.invalidateQueries({ queryKey: ['employees', 'total'] });
  qc.invalidateQueries({ queryKey: ['employees', 'org-chart'] });
  if (id) {
    qc.invalidateQueries({ queryKey: KEY.one(id) });
    qc.invalidateQueries({ queryKey: KEY.timeline(id) });
    qc.invalidateQueries({ queryKey: KEY.salaryHistory(id) });
  }
}
