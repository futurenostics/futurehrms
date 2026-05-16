'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, Clock, Info, UserPlus, Users } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmployeeStats } from '@/lib/queries/employees';
import { cn } from '@/lib/utils';

type DeltaTone = 'success' | 'danger' | 'warning' | 'neutral';

/**
 * KPI strip — four cards above the table on the Employees list page.
 * Mirrors docs/design/screens/employees.jsx.
 *
 * Single `/api/employees/stats` round-trip backs all four; loading
 * state renders skeleton cards rather than empty space so the layout
 * doesn't jump on resolve.
 */
export function KpiStrip() {
  const { data, isLoading, isError } = useEmployeeStats();

  if (isLoading || isError || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Total headcount"
          value={data.totalHeadcount.toLocaleString()}
          info="Active employees, excluding archived and terminated."
          delta={
            data.totalDeltaPct === null ? null : { kind: 'percent', value: data.totalDeltaPct }
          }
        />
        <KpiCard
          icon={UserPlus}
          label="New this month"
          value={data.newThisMonth.toLocaleString()}
          info="Employees who joined since the first of this month."
          delta={
            data.newThisMonthDeltaPct === null
              ? null
              : { kind: 'percent', value: data.newThisMonthDeltaPct }
          }
        />
        <KpiCard
          icon={Clock}
          label="On probation"
          value={data.onProbation.toLocaleString()}
          info="Currently in probation status. The pill counts probations ending within 7 days."
          delta={
            data.onProbationClosingThisWeek > 0
              ? {
                  kind: 'literal',
                  text: `${data.onProbationClosingThisWeek} close this wk`,
                  tone: 'warning',
                }
              : null
          }
        />
        <KpiCard
          icon={Clock}
          label="Avg tenure"
          value={`${data.avgTenureYears.toFixed(1)}y`}
          info="Average tenure across active employees, with the share above 3 years on the pill."
          delta={{
            kind: 'literal',
            text: `${data.tenureOver3yPercent}% > 3y`,
            tone: 'success',
          }}
        />
      </div>
    </TooltipProvider>
  );
}

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  info: string;
  delta:
    | { kind: 'percent'; value: number }
    | { kind: 'literal'; text: string; tone: DeltaTone }
    | null;
}

function KpiCard({ icon: Icon, label, value, info, delta }: KpiCardProps) {
  return (
    <div className="rounded-fn-xs border-fn-border bg-fn-bg-panel shadow-fn-sm border p-5">
      <div className="flex items-start justify-between gap-2">
        <div
          className="rounded-fn-md flex h-10 w-10 items-center justify-center"
          style={{ background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)' }}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`About ${label}`}
              className="text-fn-fg-faint hover:bg-fn-bg-inset hover:text-fn-fg-muted focus-visible:ring-fn-accent -mr-1 -mt-1 inline-flex h-6 w-6 cursor-help items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6} className="max-w-[240px] text-center">
            {info}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="text-fn-fg-muted mt-3 text-[13px] font-medium">{label}</div>
      <div className="mt-1 flex items-end gap-2.5">
        <span className="font-display font-tabular text-fn-fg text-[28px] font-semibold leading-none tracking-tight">
          {value}
        </span>
        {delta && <DeltaPill delta={delta} />}
      </div>
    </div>
  );
}

function DeltaPill({ delta }: { delta: NonNullable<KpiCardProps['delta']> }) {
  if (delta.kind === 'percent') {
    const tone: DeltaTone = delta.value >= 0 ? 'success' : 'danger';
    const text = `${delta.value >= 0 ? '+' : ''}${delta.value.toFixed(1)}%`;
    return (
      <Pill tone={tone}>
        {text}
        {delta.value >= 0 ? (
          <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} />
        ) : (
          <ArrowDownRight className="h-3 w-3" strokeWidth={2.5} />
        )}
      </Pill>
    );
  }
  return (
    <Pill tone={delta.tone}>
      {delta.text}
      <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} />
    </Pill>
  );
}

const PILL_TONE: Record<DeltaTone, string> = {
  success: 'bg-fn-success-soft text-fn-success-soft-fg',
  danger: 'bg-fn-danger-soft text-fn-danger-soft-fg',
  warning: 'bg-fn-warning-soft text-fn-warning-soft-fg',
  neutral: 'bg-fn-bg-inset text-fn-fg-muted',
};

function Pill({ tone, children }: { tone: DeltaTone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'font-tabular inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight',
        PILL_TONE[tone],
      )}
    >
      {children}
    </span>
  );
}

function KpiSkeleton() {
  return (
    <div className="rounded-fn-xs border-fn-border bg-fn-bg-panel shadow-fn-sm border p-5">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="rounded-fn-md h-10 w-10" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-3 w-28" />
      <div className="mt-2 flex items-end gap-2.5">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}
