'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type {
  ChangeManagerInput,
  ChangeSalaryInput,
  ChangeStatusInput,
  CsvImportCommitResult,
  CsvImportPreview,
  EmployeeCreateInput,
  EmployeeFilterCountsResponse,
  EmployeeListQuery,
  EmployeeListResponse,
  EmployeePublic,
  EmployeeStats,
  EmployeeUpdateInput,
  OrgChartNode,
  ReferencesResponse,
  SalaryHistoryEntry,
  TimelineEntryPublic,
} from '@futurenostics/types';
import { apiFetch } from '@/lib/api-client';

const KEY = {
  list: (query: Partial<EmployeeListQuery>) => ['employees', 'list', query] as const,
  infinite: (filters: Partial<EmployeeListQuery>) =>
    ['employees', 'list', 'infinite', filters] as const,
  one: (id: string) => ['employees', 'one', id] as const,
  references: () => ['employees', 'references'] as const,
  salaryHistory: (id: string) => ['employees', id, 'salary-history'] as const,
  timeline: (id: string) => ['employees', id, 'timeline'] as const,
  orgChart: () => ['employees', 'org-chart'] as const,
  total: () => ['employees', 'total'] as const,
  stats: () => ['employees', 'stats'] as const,
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

/**
 * Single-page list — used by drop-downs and pickers that need a bounded
 * candidate set (e.g. the change-manager dialog). The Employees list page
 * uses {@link useInfiniteEmployees} instead.
 */
export function useEmployeesList(query: Partial<EmployeeListQuery>) {
  return useQuery<EmployeeListResponse>({
    queryKey: KEY.list(query),
    queryFn: () => apiFetch<EmployeeListResponse>(`/api/employees${buildQs(query)}`),
    placeholderData: (previous) => previous,
  });
}

/**
 * Infinite-scroll list — feeds the `<DataTable>` on the Employees list
 * page. Filter/search/sort changes invalidate via the query key (which
 * includes the filter object), so changing a filter restarts at offset 0.
 *
 * `getNextPageParam` returns `undefined` once the API reports `hasMore:
 * false`, which is the React-Query signal to stop firing fetchNextPage.
 */
export type EmployeeInfiniteFilters = Omit<Partial<EmployeeListQuery>, 'offset' | 'limit'>;

export function useInfiniteEmployees(filters: EmployeeInfiniteFilters, pageSize = 50) {
  return useInfiniteQuery({
    queryKey: KEY.infinite({ ...filters, limit: pageSize }),
    queryFn: ({ pageParam }) =>
      apiFetch<EmployeeListResponse>(
        `/api/employees${buildQs({ ...filters, offset: pageParam as number, limit: pageSize })}`,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.reduce((sum, p) => sum + p.items.length, 0);
    },
  });
}

export function useEmployee(id: string | null | undefined) {
  return useQuery<EmployeePublic>({
    queryKey: KEY.one(id ?? ''),
    queryFn: () => apiFetch<EmployeePublic>(`/api/employees/${id}`),
    enabled: Boolean(id),
  });
}

/**
 * Filter-counts fetcher — directly callable from the AdvancedFilters
 * primitive (which debounces its own calls). Not a React-Query hook
 * because the primitive owns its own caching boundary (it'd be wasteful
 * to spin up a separate cache key for what's effectively a transient
 * view-state computation).
 */
export interface EmployeeFilterCountsParams {
  departmentIds?: string[];
  designationIds?: string[];
  statusIds?: string[];
  contractTypes?: string[];
  managerIds?: string[];
  employmentRecords?: string[];
  tenureBuckets?: string[];
  compensationFlags?: string[];
  documentFlags?: string[];
  salaryMin?: number;
  salaryMax?: number;
  joinDateFrom?: string;
  joinDateTo?: string;
  search?: string;
  includeArchived?: boolean;
}

export async function fetchEmployeeFilterCounts(
  params: EmployeeFilterCountsParams,
): Promise<EmployeeFilterCountsResponse> {
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
  return apiFetch<EmployeeFilterCountsResponse>(
    `/api/employees/filter-counts${tail ? `?${tail}` : ''}`,
  );
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

export function useEmployeeStats() {
  return useQuery<EmployeeStats>({
    queryKey: KEY.stats(),
    queryFn: () => apiFetch<EmployeeStats>('/api/employees/stats'),
    staleTime: 60_000,
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
  qc.invalidateQueries({ queryKey: ['employees', 'stats'] });
  qc.invalidateQueries({ queryKey: ['employees', 'org-chart'] });
  if (id) {
    qc.invalidateQueries({ queryKey: KEY.one(id) });
    qc.invalidateQueries({ queryKey: KEY.timeline(id) });
    qc.invalidateQueries({ queryKey: KEY.salaryHistory(id) });
  }
}
