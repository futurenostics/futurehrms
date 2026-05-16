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
    <div className="rounded-fn-xs border-fn-border bg-fn-bg-panel shadow-fn-sm border px-6 py-[22px]">
      {/* Row 1 — icon tile + label + info trigger on the right */}
      <div className="flex items-center gap-2.5">
        <span
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px]"
          style={{ background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)' }}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <span className="text-fn-fg text-[15px] font-medium">{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`About ${label}`}
              className="text-fn-fg-faint hover:text-fn-fg-muted focus-visible:ring-fn-accent ml-auto inline-flex h-[15px] w-[15px] shrink-0 cursor-help items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
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
      <div className="mt-[18px] flex items-center gap-3">
        <span className="text-fn-fg font-display text-[34px] font-normal tabular-nums leading-none tracking-[-0.03em]">
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
      <TrendPill tone={tone}>
        {text}
        {delta.value >= 0 ? (
          <ArrowUpRight className="h-3 w-3" strokeWidth={2.25} />
        ) : (
          <ArrowDownRight className="h-3 w-3" strokeWidth={2.25} />
        )}
      </TrendPill>
    );
  }
  return (
    <TrendPill tone={delta.tone}>
      {delta.text}
      <ArrowUpRight className="h-3 w-3" strokeWidth={2.25} />
    </TrendPill>
  );
}

const TREND_TONE: Record<DeltaTone, { bg: string; fg: string; border: string }> = {
  success: {
    bg: 'var(--fn-success-soft)',
    fg: 'var(--fn-success-soft-fg)',
    border: 'var(--fn-success)',
  },
  danger: {
    bg: 'var(--fn-danger-soft)',
    fg: 'var(--fn-danger-soft-fg)',
    border: 'var(--fn-danger)',
  },
  warning: {
    bg: 'var(--fn-warning-soft)',
    fg: 'var(--fn-warning-soft-fg)',
    border: 'var(--fn-warning)',
  },
  neutral: {
    bg: 'var(--fn-bg-inset)',
    fg: 'var(--fn-fg-muted)',
    border: 'var(--fn-border)',
  },
};

/**
 * Trend pill — the design's "outlined-pill" treatment: soft-tinted bg,
 * matching text, and a 35%-mix colored border so the pill reads even
 * when sitting on a coloured background. Used for KPI deltas only.
 */
function TrendPill({ tone, children }: { tone: DeltaTone; children: React.ReactNode }) {
  const t = TREND_TONE[tone];
  return (
    <span
      className={cn(
        'rounded-fn-xs inline-flex items-center gap-1 px-[9px] py-[2px] text-[12px] font-semibold tabular-nums leading-[1.55] tracking-[-0.005em]',
      )}
      style={{
        background: t.bg,
        color: t.fg,
        border: `1px solid color-mix(in oklch, ${t.border} 35%, transparent)`,
      }}
    >
      {children}
    </span>
  );
}

function KpiSkeleton() {
  return (
    <div className="rounded-fn-xs border-fn-border bg-fn-bg-panel shadow-fn-sm border px-6 py-[22px]">
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-7 w-7 rounded-[7px]" />
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="ml-auto h-[15px] w-[15px] rounded-full" />
      </div>
      <div className="mt-[18px] flex items-center gap-3">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="rounded-fn-xs h-5 w-16" />
      </div>
    </div>
  );
}
