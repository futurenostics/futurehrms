'use client';

import * as React from 'react';
import Link from 'next/link';
import type { OrgChartNode } from '@futurenostics/types';
import { AppShell } from '@/components/shell/app-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmployeeAvatar } from '@/components/employees/employee-avatar';
import { useOrgChart } from '@/lib/queries/employees';
import { AlertCircle, ChevronDown, ChevronRight, Network } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OrgChartPage() {
  const { data, isLoading, isError, error, refetch } = useOrgChart();

  return (
    <AppShell breadcrumbs={[{ label: 'HR Core' }, { label: 'Org Chart' }]}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-fn-fg text-[22px] font-semibold tracking-tight">Org Chart</h1>
            <p className="text-fn-fg-muted text-[13px]">
              The reporting hierarchy across every department you can see. Click a card to open the
              profile.
            </p>
          </div>
        </div>

        <div className="rounded-fn-xs border-fn-border bg-fn-bg-panel shadow-fn-sm border p-6">
          {isLoading && <Skeleton className="h-72 w-full" />}
          {isError && (
            <div className="rounded-fn-md border-fn-danger-soft bg-fn-danger-soft/40 text-fn-danger-soft-fg flex items-center justify-between border px-3 py-2 text-[12.5px]">
              <span className="inline-flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5" />{' '}
                {(error as Error)?.message ?? 'Failed to load.'}
              </span>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          )}
          {!isLoading && !isError && (
            <div className="flex flex-col gap-6">
              {(data ?? []).length === 0 && (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <div
                    className="rounded-fn-lg flex h-12 w-12 items-center justify-center"
                    style={{ background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)' }}
                  >
                    <Network className="h-5 w-5" />
                  </div>
                  <p className="text-fn-fg text-[14px] font-medium">No hierarchy to show.</p>
                  <p className="text-fn-fg-muted text-[13px]">
                    Add employees with manager links to build out the chart.
                  </p>
                </div>
              )}
              {(data ?? []).map((root) => (
                <OrgNode key={root.id} node={root} depth={0} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

interface OrgNodeProps {
  node: OrgChartNode;
  depth: number;
}

function OrgNode({ node, depth }: OrgNodeProps) {
  const [expanded, setExpanded] = React.useState(true);
  const hasReports = node.reports.length > 0;

  return (
    <div className={cn('flex flex-col gap-3', depth === 0 ? 'mt-0' : 'mt-2')}>
      <div className="flex items-center gap-2">
        {hasReports ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-fn-xs text-fn-fg-muted hover:bg-fn-bg-inset hover:text-fn-fg inline-flex h-5 w-5 cursor-pointer items-center justify-center"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="inline-block h-5 w-5" aria-hidden />
        )}
        <Link
          href={`/employees/${node.id}`}
          className="rounded-fn-md border-fn-border bg-fn-bg-panel hover:border-fn-accent hover:bg-fn-accent-soft/40 flex flex-1 items-center gap-3 border p-3 transition-colors"
        >
          <EmployeeAvatar fullName={node.fullName} photoUrl={node.photoUrl} size="sm" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="text-fn-fg truncate text-[13px] font-medium">{node.fullName}</div>
            <div className="text-fn-fg-muted truncate text-[11.5px]">
              {node.designation} · {node.department}
            </div>
          </div>
          {hasReports && (
            <span className="font-tabular text-fn-fg-faint text-[11.5px]">
              {node.reports.length} report{node.reports.length === 1 ? '' : 's'}
            </span>
          )}
        </Link>
      </div>
      {hasReports && expanded && (
        <div className="border-fn-divider ml-7 flex flex-col gap-1 border-l pl-3">
          {node.reports.map((child) => (
            <OrgNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
