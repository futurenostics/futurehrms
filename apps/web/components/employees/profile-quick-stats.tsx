'use client';

import * as React from 'react';
import type { EmployeePublic } from '@futurenostics/types';
import { cn } from '@/lib/utils';

/**
 * Quick-stat strip — 5 horizontal cells under the profile header.
 *
 * Matches docs/design/screens/employee-profile.jsx (the strip
 * directly below `<ProfileHeader />`). Each cell renders a label
 * (12px muted), a big tabular value (22px semibold), and a sub-line
 * (11.5px faint). Cells are separated by 1px dividers; the panel
 * has the standard fn-border + fn-bg-panel chrome.
 *
 * Numbers are currently derived from the employee row alone (tenure
 * computed locally, salary read from the EmployeePublic payload).
 * Commissions YTD / Performance / Active projects are placeholders
 * until those modules ship; the cell still renders so the strip's
 * shape is stable across rollouts.
 */
export interface ProfileQuickStatsProps {
  employee: EmployeePublic;
  /** PKR ↔ USD toggle from the topbar. Defaults to PKR. */
  currency?: 'PKR' | 'USD';
  /** Optional override for the salary delta sub-line. */
  salaryDeltaLabel?: string;
}

const USD_RATE = 278.5;

export function ProfileQuickStats({
  employee,
  currency = 'PKR',
  salaryDeltaLabel,
}: ProfileQuickStatsProps) {
  const tenure = React.useMemo(() => computeTenure(employee.joinDate), [employee.joinDate]);
  const formattedJoin = React.useMemo(() => formatLongDate(employee.joinDate), [employee.joinDate]);
  const salaryValue =
    employee.salaryPkr != null
      ? currency === 'USD'
        ? `$${Math.round(employee.salaryPkr / USD_RATE).toLocaleString()}`
        : `₨${employee.salaryPkr.toLocaleString('en-PK')}`
      : '—';

  // Department-derived band hint as a placeholder for the design's
  // "Eng band 3 · +9.6% Apr" sub-line. Real band data isn't modelled
  // yet; we show the department + a friendly fallback.
  const salarySub = salaryDeltaLabel ?? `${employee.department.name} · monthly base`;

  const cells: Cell[] = [
    {
      label: 'Tenure',
      value: tenure,
      sub: `since ${formattedJoin}`,
    },
    {
      label: 'Salary / mo',
      value: salaryValue,
      sub: salarySub,
    },
    {
      label: 'Commissions YTD',
      value: '—',
      sub: 'no commissions yet',
    },
    {
      label: 'Performance',
      value: '—',
      sub: 'no review on file',
    },
    {
      label: 'Active projects',
      value: String(employee.reportsCount ?? 0),
      sub: 'direct reports today',
    },
  ];

  return (
    <div className="border-fn-border bg-fn-bg-panel rounded-fn-sm grid grid-cols-2 overflow-hidden border sm:grid-cols-3 lg:grid-cols-5">
      {cells.map((c, i) => (
        <div
          key={c.label}
          className={cn(
            'px-fn-5 py-fn-4',
            // Right-edge dividers only on non-last cells AND only on
            // wide enough breakpoints; on the wrap the next row's top
            // gets a top divider instead.
            i < cells.length - 1 && 'lg:border-fn-divider lg:border-r',
          )}
        >
          <div className="text-fn-fg-muted font-fn-medium text-[12px]">{c.label}</div>
          <div
            className="text-fn-fg font-fn-semibold mt-fn-1_5 leading-fn-unit text-[22px] tabular-nums"
            style={{ letterSpacing: '-0.025em' }}
          >
            {c.value}
          </div>
          <div className="text-fn-fg-faint mt-fn-1_5 text-[11.5px]">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

type Cell = { label: string; value: string; sub: string };

function computeTenure(joinDate: string): string {
  const start = new Date(joinDate);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months <= 0) {
    const days = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86_400_000));
    return `${days}d`;
  }
  const years = Math.floor(months / 12);
  const monthsRem = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years}y`);
  if (monthsRem > 0 || years === 0) parts.push(`${monthsRem}m`);
  return parts.join(' ');
}

function formatLongDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getDate()} ${d.toLocaleString('en-GB', { month: 'short' })} ${d.getFullYear()}`;
  } catch {
    return iso.slice(0, 10);
  }
}
