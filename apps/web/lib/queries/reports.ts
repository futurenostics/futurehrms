'use client';

import { useQuery } from '@tanstack/react-query';
import type { ReportCatalog } from '@futurenostics/types';
import { apiFetch, downloadFile } from '@/lib/api-client';

export function useReportCatalog() {
  return useQuery<ReportCatalog>({
    queryKey: ['reports', 'catalog'],
    queryFn: () => apiFetch<ReportCatalog>('/api/reports'),
  });
}

export interface ReportDownloadParams {
  format: string;
  monthKey?: string;
  year?: number;
  dateFrom?: string;
  dateTo?: string;
  employeeIds?: string[];
  department?: string;
  category?: string;
  projectStatus?: string;
}

/** Build the download URL + trigger an authenticated file download. */
export async function downloadReport(
  key: string,
  params: ReportDownloadParams,
  filename: string,
): Promise<void> {
  const qs = new URLSearchParams();
  qs.set('format', params.format);
  if (params.monthKey) qs.set('monthKey', params.monthKey);
  if (params.year) qs.set('year', String(params.year));
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params.dateTo) qs.set('dateTo', params.dateTo);
  if (params.employeeIds?.length) qs.set('employeeIds', params.employeeIds.join(','));
  if (params.department && params.department !== 'all') qs.set('department', params.department);
  if (params.category && params.category !== 'all') qs.set('category', params.category);
  if (params.projectStatus && params.projectStatus !== 'all')
    qs.set('projectStatus', params.projectStatus);

  await downloadFile(`/api/reports/${key}/download?${qs.toString()}`, filename);
}
