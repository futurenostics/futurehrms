'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, Clock, Info, UserPlus, Users } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { useEmployeeStats } from '@/lib/queries/employees';

type DeltaTone = 'success' | 'danger' | 'warning' | 'default';

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
      <div className="gap-fn-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="gap-fn-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
    <div className="rounded-fn-xs border-fn-border bg-fn-bg-panel shadow-fn-sm px-fn-6 border py-[22px]">
      {/* Row 1 — icon tile + label + info trigger on the right */}
      <div className="gap-fn-2_5 flex items-center">
        <span
          className="h-fn-7 w-fn-7 inline-flex shrink-0 items-center justify-center rounded-[7px]"
          style={{ background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)' }}
        >
          <Icon className="h-fn-3_5 w-fn-3_5" strokeWidth={2} />
        </span>
        <span className="text-fn-fg font-fn-medium text-[15px]">{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`About ${label}`}
              className="text-fn-fg-faint hover:text-fn-fg-muted focus-visible:ring-fn-accent rounded-fn-full ml-auto inline-flex h-[15px] w-[15px] shrink-0 cursor-help items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
            >
              <Info className="h-[15px] w-[15px]" strokeWidth={1.75} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6} className="max-w-[240px] text-center">
            {info}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Row 2 — large light-weight value + inline trend pill */}
      <div className="gap-fn-3 mt-[18px] flex items-center">
        <span className="text-fn-fg font-display font-fn-normal leading-fn-unit text-[34px] tabular-nums tracking-[-0.03em]">
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
      <Badge tone={tone as BadgeTone}>
        {text}
        {delta.value >= 0 ? (
          <ArrowUpRight className="h-fn-3 w-fn-3" strokeWidth={2.25} />
        ) : (
          <ArrowDownRight className="h-fn-3 w-fn-3" strokeWidth={2.25} />
        )}
      </Badge>
    );
  }
  return (
    <Badge tone={delta.tone as BadgeTone}>
      {delta.text}
      <ArrowUpRight className="h-fn-3 w-fn-3" strokeWidth={2.25} />
    </Badge>
  );
}

function KpiSkeleton() {
  return (
    <div className="rounded-fn-xs border-fn-border bg-fn-bg-panel shadow-fn-sm px-fn-6 border py-[22px]">
      <div className="gap-fn-2_5 flex items-center">
        <Skeleton className="h-fn-7 w-fn-7 rounded-[7px]" />
        <Skeleton className="h-fn-3_5 w-fn-28" />
        <Skeleton className="rounded-fn-full ml-auto h-[15px] w-[15px]" />
      </div>
      <div className="gap-fn-3 mt-[18px] flex items-center">
        <Skeleton className="h-fn-8 w-fn-16" />
        <Skeleton className="rounded-fn-xs h-fn-5 w-fn-16" />
      </div>
    </div>
  );
}
