'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, TrendingUp, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useEmployeeCommissionBreakdown,
  useEmployeeCommissionTrend,
} from '@/lib/queries/commission-runs';
import { cn } from '@/lib/utils';

/**
 * Per-employee commissions tab on the profile page.
 *
 * Two stacked cards:
 *   1. Selected-month breakdown (line items + total). Defaults to
 *      the current month; a month-picker dropdown sits in the card
 *      header so the viewer can look at past months.
 *   2. 12-month trend with the same sparkline used on the dashboard
 *      widget.
 *
 * Self-view and HR-view share this component — the API enforces
 * `commissions:view_all_breakdowns` for non-self lookups.
 */
export function EmployeeCommissionsTab({ employeeId }: { employeeId: string }) {
  const [monthKey, setMonthKey] = React.useState(currentMonthKey());
  const monthOptions = React.useMemo(() => generatePastMonths(12), []);

  const breakdown = useEmployeeCommissionBreakdown(employeeId, monthKey);
  const trend = useEmployeeCommissionTrend(employeeId, 12);

  return (
    <div className="gap-fn-4 flex flex-col">
      {/* Breakdown */}
      <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel overflow-hidden border">
        <div className="border-fn-divider gap-fn-2 px-fn-4 py-fn-3 flex flex-wrap items-center justify-between border-b">
          <div className="gap-fn-2 flex items-center">
            <span
              aria-hidden
              className="rounded-fn-xs bg-fn-icon-tile text-fn-icon-tile-fg h-fn-7 w-fn-7 inline-flex items-center justify-center"
            >
              <Wallet className="h-fn-3_5 w-fn-3_5" />
            </span>
            <div>
              <h3 className="text-fn-fg font-fn-semibold text-[13.5px]">Monthly breakdown</h3>
              <p className="text-fn-fg-faint text-[11.5px]">
                Line items + total for the selected month.
              </p>
            </div>
          </div>
          <div className="gap-fn-2 flex items-center">
            {breakdown.data?.runStatus && (
              <Badge tone={runTone(breakdown.data.runStatus)} dot>
                {runLabel(breakdown.data.runStatus)}
              </Badge>
            )}
            <select
              value={monthKey}
              onChange={(e) => setMonthKey(e.target.value)}
              className="border-fn-border-strong bg-fn-bg-panel text-fn-fg rounded-fn-xs px-fn-2 py-fn-1 h-fn-7 cursor-pointer border text-[12px]"
            >
              {monthOptions.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-fn-4 py-fn-4 gap-fn-3 flex flex-col">
          {breakdown.isPending ? (
            <Skeleton className="h-[120px] w-full" />
          ) : (
            <>
              <div className="gap-fn-1 flex flex-col">
                <span className="text-fn-fg-faint tracking-fn-uppercase-tight text-[10.5px] uppercase">
                  Total {breakdown.data?.monthLabel}
                </span>
                <span
                  className="text-fn-fg font-fn-semibold leading-fn-unit text-[32px] tabular-nums"
                  style={{ letterSpacing: '-0.025em' }}
                >
                  {formatUsd(breakdown.data?.totalUsd ?? 0)}
                </span>
                <span className="text-fn-fg-faint text-[11.5px]">
                  {breakdown.data?.lineItems.length ?? 0}{' '}
                  {breakdown.data?.lineItems.length === 1 ? 'project' : 'projects'} credited
                </span>
              </div>

              {breakdown.data && breakdown.data.lineItems.length > 0 ? (
                <ul className="gap-fn-2 flex flex-col">
                  {breakdown.data.lineItems.map((li) => (
                    <li
                      key={li.id}
                      className="border-fn-divider rounded-fn-xs px-fn-3 py-fn-2 bg-fn-bg-subtle/40 gap-fn-3 flex items-center border"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-fn-fg font-fn-medium truncate text-[12.5px]">
                          {li.project.name}
                        </div>
                        <div className="text-fn-fg-faint truncate text-[11px]">
                          {li.project.clientName} · {roleLabel(li.roleName)} ·{' '}
                          {li.snapshotPercentage}% of pool · {li.monthFractionDisplay}
                        </div>
                      </div>
                      <Badge tone="default">{li.project.category.name}</Badge>
                      <span className="text-fn-fg font-fn-semibold shrink-0 text-[13px] tabular-nums">
                        {formatUsd(li.finalAmountUsd)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-fn-fg-muted text-[12.5px]">
                  No commission line items for this month.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Trend */}
      <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel overflow-hidden border">
        <div className="border-fn-divider gap-fn-2 px-fn-4 py-fn-3 flex items-center justify-between border-b">
          <div className="gap-fn-2 flex items-center">
            <span
              aria-hidden
              className="rounded-fn-xs bg-fn-icon-tile text-fn-icon-tile-fg h-fn-7 w-fn-7 inline-flex items-center justify-center"
            >
              <TrendingUp className="h-fn-3_5 w-fn-3_5" />
            </span>
            <div>
              <h3 className="text-fn-fg font-fn-semibold text-[13.5px]">12-month trend</h3>
              <p className="text-fn-fg-faint text-[11.5px]">Approved + locked totals per month.</p>
            </div>
          </div>
          <Link
            href="/monthly-processing"
            className="text-fn-accent-soft-fg gap-fn-1 font-fn-semibold inline-flex items-center text-[12px] hover:underline"
          >
            All runs <ArrowRight className="h-fn-3 w-fn-3" />
          </Link>
        </div>
        <div className="px-fn-4 py-fn-4">
          {trend.isPending ? (
            <Skeleton className="h-[120px] w-full" />
          ) : (
            <TrendBars points={trend.data?.points ?? []} />
          )}
        </div>
      </div>
    </div>
  );
}

function TrendBars({
  points,
}: {
  points: Array<{ monthKey: string; monthLabel: string; totalUsd: number }>;
}) {
  const max = Math.max(1, ...points.map((p) => p.totalUsd));
  return (
    <div className="gap-fn-1 flex items-end" style={{ height: 120 }}>
      {points.map((p) => {
        const heightPct = max === 0 ? 0 : (p.totalUsd / max) * 100;
        return (
          <div key={p.monthKey} className="gap-fn-1 flex flex-1 flex-col items-center justify-end">
            <span className="text-fn-fg-faint text-[10px] tabular-nums">
              {p.totalUsd === 0 ? '' : formatUsdCompact(p.totalUsd)}
            </span>
            <div className="relative w-full flex-1">
              <span
                className={cn(
                  'rounded-fn-xs absolute bottom-0 left-0 right-0',
                  p.totalUsd > 0 ? 'bg-fn-accent' : 'bg-fn-bg-inset',
                )}
                style={{ height: `${Math.max(4, heightPct)}%` }}
                title={`${p.monthLabel}: ${formatUsd(p.totalUsd)}`}
              />
            </div>
            <span className="text-fn-fg-faint font-mono text-[10px] uppercase">
              {p.monthKey.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Helpers ───────────────────────── */

const RUN_TONES: Record<string, React.ComponentProps<typeof Badge>['tone']> = {
  draft: 'default',
  pending_approval: 'warning',
  approved: 'success',
  locked: 'info',
  rejected: 'danger',
};
const RUN_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  locked: 'Locked',
  rejected: 'Rejected',
};
function runTone(status: string) {
  return RUN_TONES[status] ?? 'default';
}
function runLabel(status: string) {
  return RUN_LABELS[status] ?? status;
}

const ROLE_LABELS: Record<string, string> = {
  winner: 'Winner',
  communicator: 'Communicator',
  eligible_team: 'Eligible team',
};
function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role.replace(/_/g, ' ');
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function generatePastMonths(n: number): Array<{ key: string; label: string }> {
  const now = new Date();
  const out: Array<{ key: string; label: string }> = [];
  for (let i = 0; i < n; i += 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push({
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    });
  }
  return out;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatUsdCompact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}
