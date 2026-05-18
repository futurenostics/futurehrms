'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Calculator, ShieldCheck, TrendingUp, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCommissionRunsList,
  useEmployeeCommissionBreakdown,
  useEmployeeCommissionTrend,
} from '@/lib/queries/commission-runs';
import { cn } from '@/lib/utils';

/**
 * Dashboard commission widgets — three composable cards.
 *
 *   MyCommissionWidget       — current month total + per-line summary
 *   MyCommissionTrendWidget  — 12-month sparkline + delta vs prev mo
 *   CommissionRunStatusWidget — HR/Finance only, surface latest run state
 *
 * Permissions are checked by the parent (the dashboard page) so this
 * file stays presentational. All three lay out as a single Card with
 * the same chrome so the grid renders evenly.
 */

const CURRENT_MONTH_KEY = (() => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
})();

/* ─────────────── My commission this month ─────────────── */

export function MyCommissionWidget({ employeeId }: { employeeId: string | null }) {
  const breakdown = useEmployeeCommissionBreakdown(employeeId, CURRENT_MONTH_KEY);
  if (!employeeId) {
    return (
      <WidgetCard icon={<Wallet className="h-fn-4 w-fn-4" />} title="My commission this month">
        <p className="text-fn-fg-muted text-[12.5px]">
          Linked-employee record missing — ask HR to wire your profile.
        </p>
      </WidgetCard>
    );
  }
  if (breakdown.isPending) {
    return (
      <WidgetCard icon={<Wallet className="h-fn-4 w-fn-4" />} title="My commission this month">
        <Skeleton className="h-fn-8 w-2/3" />
        <Skeleton className="h-fn-3 w-full" />
      </WidgetCard>
    );
  }
  const data = breakdown.data;
  const status = data?.runStatus ?? null;
  const isPreview = !status || status === 'draft' || status === 'rejected';

  return (
    <WidgetCard
      icon={<Wallet className="h-fn-4 w-fn-4" />}
      title="My commission this month"
      right={
        status ? (
          <Badge tone={runTone(status)} dot>
            {runLabel(status)}
          </Badge>
        ) : (
          <Badge tone="default">No run</Badge>
        )
      }
    >
      <div className="gap-fn-1 flex flex-col">
        <span
          className="text-fn-fg font-fn-semibold leading-fn-unit text-[32px] tabular-nums"
          style={{ letterSpacing: '-0.03em' }}
        >
          {formatUsd(data?.totalUsd ?? 0)}
        </span>
        <span className="text-fn-fg-faint text-[12px]">
          {data?.monthLabel ?? '—'}
          {isPreview && data && data.totalUsd > 0 && ' · preview, may change before approval'}
          {data && data.totalUsd === 0 && ' · no projects credited this month'}
        </span>
      </div>
      {data && data.lineItems.length > 0 && (
        <ul className="border-fn-divider gap-fn-1_5 pt-fn-2 mt-fn-2 flex flex-col border-t text-[12px]">
          {data.lineItems.slice(0, 3).map((li) => (
            <li key={li.id} className="gap-fn-2 flex items-center justify-between">
              <span className="text-fn-fg truncate">{li.project.name}</span>
              <span className="text-fn-fg-muted font-fn-semibold shrink-0 tabular-nums">
                {formatUsd(li.finalAmountUsd)}
              </span>
            </li>
          ))}
          {data.lineItems.length > 3 && (
            <li className="text-fn-fg-faint text-[11px]">
              +{data.lineItems.length - 3} more on your profile
            </li>
          )}
        </ul>
      )}
    </WidgetCard>
  );
}

/* ─────────────── My commission trend ─────────────── */

export function MyCommissionTrendWidget({ employeeId }: { employeeId: string | null }) {
  const trend = useEmployeeCommissionTrend(employeeId, 12);
  if (!employeeId) return null;
  if (trend.isPending) {
    return (
      <WidgetCard
        icon={<TrendingUp className="h-fn-4 w-fn-4" />}
        title="My commission trend"
        sub="Last 12 months"
      >
        <Skeleton className="h-[100px] w-full" />
      </WidgetCard>
    );
  }
  const points = trend.data?.points ?? [];
  const max = Math.max(1, ...points.map((p) => p.totalUsd));
  const total = points.reduce((s, p) => s + p.totalUsd, 0);
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const delta = last && prev ? last.totalUsd - prev.totalUsd : 0;
  const deltaPct = prev && prev.totalUsd > 0 ? (delta / prev.totalUsd) * 100 : 0;

  return (
    <WidgetCard
      icon={<TrendingUp className="h-fn-4 w-fn-4" />}
      title="My commission trend"
      sub={`${points.length}-month total · ${formatUsd(total)}`}
      right={
        prev ? (
          <Badge tone={delta >= 0 ? 'success' : 'danger'}>
            {delta >= 0 ? '+' : ''}
            {deltaPct.toFixed(0)}% mo/mo
          </Badge>
        ) : null
      }
    >
      <SparkBars points={points} max={max} />
    </WidgetCard>
  );
}

function SparkBars({
  points,
  max,
}: {
  points: Array<{ monthKey: string; monthLabel: string; totalUsd: number }>;
  max: number;
}) {
  return (
    <div className="gap-fn-2 mt-fn-1 flex flex-col">
      <div className="gap-fn-1 flex items-end" style={{ height: 80 }}>
        {points.map((p) => {
          const heightPct = max === 0 ? 0 : (p.totalUsd / max) * 100;
          return (
            <div
              key={p.monthKey}
              className="gap-fn-1 flex flex-1 flex-col items-center justify-end"
            >
              <div className="relative w-full flex-1">
                <span
                  className={cn(
                    'rounded-fn-xs absolute bottom-0 left-0 right-0 transition-colors',
                    p.totalUsd > 0 ? 'bg-fn-accent' : 'bg-fn-bg-inset',
                  )}
                  style={{ height: `${Math.max(4, heightPct)}%` }}
                  title={`${p.monthLabel}: ${formatUsd(p.totalUsd)}`}
                />
              </div>
              <span className="text-fn-fg-faint font-mono text-[9px] uppercase">
                {p.monthKey.slice(5)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────── Commission run status (HR/Finance) ─────────────── */

export function CommissionRunStatusWidget() {
  const runs = useCommissionRunsList({ limit: 3 });
  if (runs.isPending) {
    return (
      <WidgetCard icon={<Calculator className="h-fn-4 w-fn-4" />} title="Commission run status">
        <Skeleton className="h-fn-6 w-full" />
      </WidgetCard>
    );
  }
  const items = runs.data?.items ?? [];
  const pending = items.find((r) => r.status === 'pending_approval');
  const latestApproved = items.find((r) => r.status === 'approved' || r.status === 'locked');

  return (
    <WidgetCard
      icon={<Calculator className="h-fn-4 w-fn-4" />}
      title="Commission run status"
      right={
        pending ? (
          <Badge tone="warning" dot>
            {pending.monthLabel} awaiting
          </Badge>
        ) : items[0] ? (
          <Badge tone={runTone(items[0].status)} dot>
            {runLabel(items[0].status)}
          </Badge>
        ) : null
      }
    >
      {items.length === 0 ? (
        <p className="text-fn-fg-muted text-[12.5px]">No runs yet — draft this month to begin.</p>
      ) : (
        <ul className="gap-fn-2 flex flex-col text-[12.5px]">
          {pending && (
            <RunRow
              run={pending}
              href={`/monthly-processing/${pending.id}?action=approve`}
              accent
            />
          )}
          {latestApproved && !pending && (
            <RunRow run={latestApproved} href={`/monthly-processing/${latestApproved.id}`} />
          )}
          {items.length > 0 && (
            <li className="pt-fn-1">
              <Link
                href="/monthly-processing"
                className="text-fn-accent-soft-fg gap-fn-1 font-fn-semibold inline-flex items-center text-[12px] hover:underline"
              >
                See all runs <ArrowRight className="h-fn-3 w-fn-3" />
              </Link>
            </li>
          )}
        </ul>
      )}
    </WidgetCard>
  );
}

function RunRow({
  run,
  href,
  accent,
}: {
  run: {
    id: string;
    monthLabel: string;
    monthKey: string;
    totalDisbursementUsd: number;
    recipientCount: number;
  };
  href: string;
  accent?: boolean;
}) {
  return (
    <li
      className={cn(
        'rounded-fn-xs px-fn-3 py-fn-2 gap-fn-2 flex items-center border',
        accent ? 'border-fn-warning/30 bg-fn-warning-soft/30' : 'border-fn-border bg-fn-bg-panel',
      )}
    >
      <ShieldCheck className="text-fn-fg-muted h-fn-3_5 w-fn-3_5" />
      <Link href={href} className="text-fn-fg font-fn-medium flex-1 truncate hover:underline">
        {run.monthLabel}
      </Link>
      <span className="text-fn-fg-faint shrink-0 text-[11.5px]">{run.recipientCount} people</span>
      <span className="text-fn-fg font-fn-semibold shrink-0 tabular-nums">
        {formatUsd(run.totalDisbursementUsd)}
      </span>
    </li>
  );
}

/* ─────────────── Shared card chrome ─────────────── */

function WidgetCard({
  icon,
  title,
  sub,
  right,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel p-fn-4 gap-fn-3 flex flex-col border">
      <div className="gap-fn-2 flex items-start">
        <span
          aria-hidden
          className="rounded-fn-xs bg-fn-icon-tile text-fn-icon-tile-fg h-fn-7 w-fn-7 inline-flex shrink-0 items-center justify-center"
        >
          {icon}
        </span>
        <div className="flex-1">
          <h3 className="text-fn-fg font-fn-semibold text-[13px]">{title}</h3>
          {sub && <p className="text-fn-fg-faint mt-fn-0_5 text-[11.5px]">{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

/* ─────────────── Helpers ─────────────── */

const RUN_TONES: Record<string, React.ComponentProps<typeof Badge>['tone']> = {
  draft: 'default',
  pending_approval: 'warning',
  approved: 'success',
  locked: 'info',
  rejected: 'danger',
};
const RUN_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Pending',
  approved: 'Approved',
  locked: 'Locked',
  rejected: 'Rejected',
};
function runTone(status: string): React.ComponentProps<typeof Badge>['tone'] {
  return RUN_TONES[status] ?? 'default';
}
function runLabel(status: string): string {
  return RUN_LABELS[status] ?? status;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
