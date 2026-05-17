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
      <Card className="hover:border-fn-accent p-fn-6 transition-colors">
        <div className="gap-fn-3 flex items-start">
          <div
            className="rounded-fn-md h-fn-10 w-fn-10 flex items-center justify-center"
            style={{ background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)' }}
          >
            <Users className="h-fn-4 w-fn-4" />
          </div>
          <div className="gap-fn-1 flex flex-1 flex-col">
            <div className="text-fn-fg-muted font-fn-medium text-[14px]">Total Employees</div>
            {isLoading ? (
              <Skeleton className="h-fn-7 w-fn-20" />
            ) : isError ? (
              <div className="text-fn-fg-faint text-[12.5px]">Could not load count.</div>
            ) : (
              <div className="font-display text-fn-fg font-fn-semibold text-[28px] tabular-nums">
                {data?.total.toLocaleString() ?? '—'}
              </div>
            )}
            {data && data.byStatus.length > 0 && (
              <div className="text-fn-fg-muted text-[12px] tabular-nums">
                {data.byStatus.map((s) => `${s.count} ${s.name.toLowerCase()}`).join(' · ')}
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
