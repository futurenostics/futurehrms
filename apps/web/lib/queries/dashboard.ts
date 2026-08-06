'use client';

import { useQuery } from '@tanstack/react-query';
import type { ManagementDashboard } from '@futurenostics/types';
import { apiFetch } from '@/lib/api-client';

/** Company-wide management dashboard snapshot (Module 7 §9). */
export function useManagementDashboard(enabled = true) {
  return useQuery<ManagementDashboard>({
    queryKey: ['dashboard', 'management'],
    queryFn: () => apiFetch<ManagementDashboard>('/api/dashboard/management'),
    enabled,
  });
}
