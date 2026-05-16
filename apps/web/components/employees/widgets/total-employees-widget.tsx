'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmployeeTotal } from '@/lib/queries/employees';

/**
 * Dashboard widget — Total Employees. Registered via the employees
 * manifest's `dashboardWidgets`; gated by `employees:view_all`.
 */
export function TotalEmployeesWidget() {
  const { data, isLoading, isError } = useEmployeeTotal();

  return (
    <Link href="/employees" className="block">
      <Card className="hover:border-fn-accent p-6 transition-colors">
        <div className="flex items-start gap-3">
          <div
            className="rounded-fn-md flex h-10 w-10 items-center justify-center"
            style={{ background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)' }}
          >
            <Users className="h-4 w-4" />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <div className="text-fn-fg-muted text-[14px] font-medium">Total Employees</div>
            {isLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : isError ? (
              <div className="text-fn-fg-faint text-[12.5px]">Could not load count.</div>
            ) : (
              <div className="font-tabular font-display text-fn-fg text-[28px] font-semibold">
                {data?.total.toLocaleString() ?? '—'}
              </div>
            )}
            {data && data.byStatus.length > 0 && (
              <div className="font-tabular text-fn-fg-muted text-[12px]">
                {data.byStatus.map((s) => `${s.count} ${s.name.toLowerCase()}`).join(' · ')}
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
