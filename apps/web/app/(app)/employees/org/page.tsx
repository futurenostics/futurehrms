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
      <div className="gap-fn-5 mx-auto flex w-full max-w-6xl flex-col">
        <div className="gap-fn-3 flex items-end justify-between">
          <div className="gap-fn-1 flex flex-col">
            <h1 className="text-fn-fg font-fn-semibold tracking-fn-tight text-[22px]">Org Chart</h1>
            <p className="text-fn-fg-muted text-[13px]">
              The reporting hierarchy across every department you can see. Click a card to open the
              profile.
            </p>
          </div>
        </div>

        <div className="rounded-fn-xs border-fn-border bg-fn-bg-panel shadow-fn-sm p-fn-6 border">
          {isLoading && <Skeleton className="h-fn-72 w-full" />}
          {isError && (
            <div className="rounded-fn-md border-fn-danger-soft bg-fn-danger-soft/40 text-fn-danger-soft-fg px-fn-3 py-fn-2 flex items-center justify-between border text-[12.5px]">
              <span className="gap-fn-2 inline-flex items-center">
                <AlertCircle className="h-fn-3_5 w-fn-3_5" />{' '}
                {(error as Error)?.message ?? 'Failed to load.'}
              </span>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          )}
          {!isLoading && !isError && (
            <div className="gap-fn-6 flex flex-col">
              {(data ?? []).length === 0 && (
                <div className="gap-fn-2 py-fn-12 flex flex-col items-center text-center">
                  <div
                    className="rounded-fn-lg h-fn-12 w-fn-12 flex items-center justify-center"
                    style={{ background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)' }}
                  >
                    <Network className="h-fn-5 w-fn-5" />
                  </div>
                  <p className="text-fn-fg font-fn-medium text-[14px]">No hierarchy to show.</p>
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
    <div className={cn('gap-fn-3 flex flex-col', depth === 0 ? 'mt-0' : 'mt-fn-2')}>
      <div className="gap-fn-2 flex items-center">
        {hasReports ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-fn-xs text-fn-fg-muted hover:bg-fn-bg-inset hover:text-fn-fg h-fn-5 w-fn-5 inline-flex cursor-pointer items-center justify-center"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? (
              <ChevronDown className="h-fn-3 w-fn-3" />
            ) : (
              <ChevronRight className="h-fn-3 w-fn-3" />
            )}
          </button>
        ) : (
          <span className="h-fn-5 w-fn-5 inline-block" aria-hidden />
        )}
        <Link
          href={`/employees/${node.id}`}
          className="rounded-fn-md border-fn-border bg-fn-bg-panel hover:border-fn-accent hover:bg-fn-accent-soft/40 gap-fn-3 p-fn-3 flex flex-1 items-center border transition-colors"
        >
          <EmployeeAvatar fullName={node.fullName} photoUrl={node.photoUrl} size="sm" />
          <div className="gap-fn-0_5 flex min-w-0 flex-1 flex-col">
            <div className="text-fn-fg font-fn-medium truncate text-[13px]">{node.fullName}</div>
            <div className="text-fn-fg-muted truncate text-[11.5px]">
              {node.designation} · {node.department}
            </div>
          </div>
          {hasReports && (
            <span className="text-fn-fg-faint text-[11.5px] tabular-nums">
              {node.reports.length} report{node.reports.length === 1 ? '' : 's'}
            </span>
          )}
        </Link>
      </div>
      {hasReports && expanded && (
        <div className="border-fn-divider ml-fn-7 gap-fn-1 pl-fn-3 flex flex-col border-l">
          {node.reports.map((child) => (
            <OrgNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
