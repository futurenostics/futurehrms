'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type {
  ProjectAssignmentInput,
  ProjectChangeStatusInput,
  ProjectCategoryCreateInput,
  ProjectCategoryPublic,
  ProjectCategoryTreeNode,
  ProjectCategoryUpdateInput,
  ProjectCommissionPreview,
  ProjectCreateInput,
  ProjectListQuery,
  ProjectListResponse,
  ProjectPublic,
  ProjectUpdateInput,
} from '@futurenostics/types';
import { apiFetch } from '@/lib/api-client';

/* ---------- Query keys ---------- */

const KEY = {
  list: (q: Partial<ProjectListQuery>) => ['projects', 'list', q] as const,
  infinite: (q: Partial<ProjectListQuery>) => ['projects', 'list', 'infinite', q] as const,
  one: (id: string) => ['projects', 'one', id] as const,
  preview: (id: string) => ['projects', 'one', id, 'commission-preview'] as const,
  categories: () => ['project-categories', 'list'] as const,
  categoryTree: () => ['project-categories', 'tree'] as const,
};

function buildQs(query: Partial<ProjectListQuery>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/* ---------- Projects ---------- */

export function useProjectsList(query: Partial<ProjectListQuery>) {
  return useQuery<ProjectListResponse>({
    queryKey: KEY.list(query),
    queryFn: () => apiFetch<ProjectListResponse>(`/api/projects${buildQs(query)}`),
    placeholderData: (previous) => previous,
  });
}

export type ProjectInfiniteFilters = Omit<Partial<ProjectListQuery>, 'offset' | 'limit'>;

/**
 * Infinite-scroll list for the Projects page. Filter changes restart at
 * offset 0 because the filter object is part of the queryKey.
 */
export function useInfiniteProjects(filters: ProjectInfiniteFilters, pageSize = 50) {
  return useInfiniteQuery({
    queryKey: KEY.infinite({ ...filters, limit: pageSize }),
    queryFn: ({ pageParam }) =>
      apiFetch<ProjectListResponse>(
        `/api/projects${buildQs({ ...filters, offset: pageParam as number, limit: pageSize })}`,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.reduce((sum, p) => sum + p.items.length, 0);
    },
  });
}

export function useProject(id: string | null | undefined) {
  return useQuery<ProjectPublic>({
    queryKey: KEY.one(id ?? ''),
    queryFn: () => apiFetch<ProjectPublic>(`/api/projects/${id}`),
    enabled: Boolean(id),
  });
}

export function useProjectCommissionPreview(id: string | null | undefined) {
  return useQuery<ProjectCommissionPreview>({
    queryKey: KEY.preview(id ?? ''),
    queryFn: () => apiFetch<ProjectCommissionPreview>(`/api/projects/${id}/commission-preview`),
    enabled: Boolean(id),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectCreateInput) =>
      apiFetch<ProjectPublic>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateProjectQueries(qc),
  });
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectUpdateInput) =>
      apiFetch<ProjectPublic>(`/api/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateProjectQueries(qc, id),
  });
}

export function useDeleteProject(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<void>(`/api/projects/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateProjectQueries(qc, id),
  });
}

export function useChangeProjectStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectChangeStatusInput) =>
      apiFetch<ProjectPublic>(`/api/projects/${id}/change-status`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateProjectQueries(qc, id),
  });
}

export function useAssignProjectRole(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectAssignmentInput) =>
      apiFetch<ProjectPublic>(`/api/projects/${id}/assign-role`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateProjectQueries(qc, id),
  });
}

export function useRemoveProjectAssignment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) =>
      apiFetch<void>(`/api/projects/${projectId}/assign-role/${assignmentId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => invalidateProjectQueries(qc, projectId),
  });
}

/* ---------- Categories ---------- */

export function useProjectCategories() {
  return useQuery<ProjectCategoryPublic[]>({
    queryKey: KEY.categories(),
    queryFn: () => apiFetch<ProjectCategoryPublic[]>('/api/project-categories'),
    staleTime: 5 * 60_000,
  });
}

export function useProjectCategoryTree() {
  return useQuery<ProjectCategoryTreeNode[]>({
    queryKey: KEY.categoryTree(),
    queryFn: () => apiFetch<ProjectCategoryTreeNode[]>('/api/project-categories/tree'),
    staleTime: 5 * 60_000,
  });
}

export function useCreateProjectCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectCategoryCreateInput) =>
      apiFetch<ProjectCategoryPublic>('/api/project-categories', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateCategoryQueries(qc),
  });
}

export function useUpdateProjectCategory(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectCategoryUpdateInput) =>
      apiFetch<ProjectCategoryPublic>(`/api/project-categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateCategoryQueries(qc),
  });
}

/* ---------- Helpers ---------- */

function invalidateProjectQueries(qc: QueryClient, id?: string): void {
  qc.invalidateQueries({ queryKey: ['projects', 'list'] });
  if (id) {
    qc.invalidateQueries({ queryKey: KEY.one(id) });
    qc.invalidateQueries({ queryKey: KEY.preview(id) });
  }
}

function invalidateCategoryQueries(qc: QueryClient): void {
  qc.invalidateQueries({ queryKey: ['project-categories'] });
}
