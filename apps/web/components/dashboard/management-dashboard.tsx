'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Briefcase,
  CheckSquare,
  FileBarChart,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import type {
  DashboardBdRow,
  DashboardRevenueSlice,
  DashboardTopEarner,
  DashboardTrendPoint,
  ManagementDashboard,
} from '@futurenostics/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useManagementDashboard } from '@/lib/queries/dashboard';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

function usd(n: number): string {
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}
function usd2(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ManagementDashboard() {
  const { data, isPending, isError } = useManagementDashboard();

  if (isPending) {
    return (
      <div className="gap-fn-4 flex flex-col">
        <div className="gap-fn-4 grid grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] w-full" />
          ))}
        </div>
        <div className="gap-fn-4 grid grid-cols-1 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[240px] w-full" />
          ))}
        </div>
      </div>
    );
  }
  if (isError || !data) return null;

  return (
    <div className="gap-fn-6 flex flex-col">
      <KpiRow data={data} />
      <QuickActions />
      <div className="gap-fn-4 grid grid-cols-1 lg:grid-cols-2">
        <Panel title="Monthly commission trend" subtitle="Last 12 months">
          <TrendLine points={data.trend} />
        </Panel>
        <Panel title="Revenue by project category" subtitle="Upwork · External · B2B">
          <RevenueDonut slices={data.revenueByCategory} />
        </Panel>
        <Panel title="Top earners this month" subtitle="Top 5 by commission">
          <TopEarnersBars rows={data.topEarners} />
        </Panel>
        <Panel title="BD performance" subtitle="Projects won vs commission paid">
          <BdBars rows={data.bdPerformance} />
        </Panel>
      </div>
      <Panel title="Recent activity" subtitle="Latest across projects, commissions, and people">
        <ActivityFeed items={data.activity} />
      </Panel>
    </div>
  );
}

/* ───────────────────────── §9.1 KPI row ───────────────────────── */

function KpiRow({ data }: { data: ManagementDashboard }) {
  const k = data.kpis;
  return (
    <div className="gap-fn-4 grid grid-cols-2 lg:grid-cols-5">
      <KpiCard
        icon={<Briefcase className="h-fn-4 w-fn-4" />}
        label="Active projects"
        value={String(k.activeProjects.total)}
        footer={
          <div className="gap-fn-1 flex flex-wrap">
            {k.activeProjects.byCategory.map((c) => (
              <Badge key={c.slug} tone="default">
                {c.name}: {c.count}
              </Badge>
            ))}
          </div>
        }
      />
      <KpiCard
        icon={<Users className="h-fn-4 w-fn-4" />}
        label="Active employees"
        value={String(k.activeEmployees)}
      />
      <KpiCard
        icon={<Wallet className="h-fn-4 w-fn-4" />}
        label={`Liability · ${k.thisMonthLabel}`}
        value={usd(k.thisMonthLiabilityUsd)}
        footer={<span className="text-fn-fg-faint text-[11px]">This month (USD)</span>}
      />
      <Link href="/approvals?type=commission-run" className="contents">
        <KpiCard
          icon={<CheckSquare className="h-fn-4 w-fn-4" />}
          label="Pending approvals"
          value={String(k.pendingApprovals)}
          footer={<span className="text-fn-accent text-[11px]">View inbox →</span>}
          interactive
        />
      </Link>
      <KpiCard
        icon={<TrendingUp className="h-fn-4 w-fn-4" />}
        label={`Disbursed · ${k.lastMonthLabel}`}
        value={usd(k.lastMonthDisbursedUsd)}
        footer={<span className="text-fn-fg-faint text-[11px]">Last month (USD)</span>}
      />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  footer,
  interactive,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  footer?: React.ReactNode;
  interactive?: boolean;
}) {
  return (
    <div
      className={`border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-2 px-fn-4 py-fn-3_5 flex flex-col border ${
        interactive ? 'hover:border-fn-accent cursor-pointer transition-colors' : ''
      }`}
    >
      <div className="text-fn-fg-faint gap-fn-1_5 flex items-center text-[11px] uppercase tracking-[0.06em]">
        {icon}
        {label}
      </div>
      <span className="text-fn-fg font-fn-semibold text-[24px] tabular-nums">{value}</span>
      {footer}
    </div>
  );
}

/* ───────────────────────── §9.4 Quick actions ───────────────────────── */

function QuickActions() {
  return (
    <div className="gap-fn-2 flex flex-wrap">
      <Button asChild variant="secondary" size="sm">
        <Link href="/monthly-processing">
          <Wallet className="h-fn-4 w-fn-4" /> Process this month&apos;s commissions
        </Link>
      </Button>
      <Button asChild variant="secondary" size="sm">
        <Link href="/projects">
          <Briefcase className="h-fn-4 w-fn-4" /> Add new project
        </Link>
      </Button>
      <Button asChild variant="secondary" size="sm">
        <Link href="/employees">
          <UserPlus className="h-fn-4 w-fn-4" /> Add new employee
        </Link>
      </Button>
      <Button asChild variant="secondary" size="sm">
        <Link href="/reports">
          <FileBarChart className="h-fn-4 w-fn-4" /> Generate report
        </Link>
      </Button>
    </div>
  );
}

/* ───────────────────────── §9.2 Charts ───────────────────────── */

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs px-fn-5 py-fn-4 gap-fn-4 flex flex-col border">
      <div className="gap-fn-0_5 flex flex-col">
        <h2 className="text-fn-fg font-fn-semibold text-[14px]">{title}</h2>
        {subtitle && <p className="text-fn-fg-faint text-[11.5px]">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function TrendLine({ points }: { points: DashboardTrendPoint[] }) {
  if (points.length === 0) return <Empty text="No commission runs yet." />;
  const max = Math.max(...points.map((p) => p.totalUsd), 1);
  const n = points.length;
  const coords = points.map((p, i) => {
    const x = n === 1 ? 50 : (i / (n - 1)) * 100;
    const y = 38 - (p.totalUsd / max) * 34;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const area = `0,40 ${coords.join(' ')} 100,40`;
  return (
    <div className="gap-fn-2 flex flex-col">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-[160px] w-full">
        <polygon points={area} fill="var(--chart-1)" opacity={0.12} />
        <polyline
          points={coords.join(' ')}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth={1.4}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="text-fn-fg-faint flex justify-between text-[10px] tabular-nums">
        <span>{points[0]?.monthLabel}</span>
        <span>{points[points.length - 1]?.monthLabel}</span>
      </div>
    </div>
  );
}

function RevenueDonut({ slices }: { slices: DashboardRevenueSlice[] }) {
  if (slices.length === 0) return <Empty text="No project revenue recorded." />;
  const total = slices.reduce((s, x) => s + x.revenueUsd, 0);
  let acc = 0;
  const stops = slices.map((s, i) => {
    const from = (acc / total) * 360;
    acc += s.revenueUsd;
    const to = (acc / total) * 360;
    return `${CHART_COLORS[i % CHART_COLORS.length]} ${from.toFixed(1)}deg ${to.toFixed(1)}deg`;
  });
  return (
    <div className="gap-fn-4 flex items-center">
      <div
        className="rounded-fn-full h-[120px] w-[120px] shrink-0"
        style={{
          background: `conic-gradient(${stops.join(', ')})`,
          mask: 'radial-gradient(circle, transparent 46%, black 47%)',
          WebkitMask: 'radial-gradient(circle, transparent 46%, black 47%)',
        }}
        aria-hidden
      />
      <div className="gap-fn-2 flex min-w-0 flex-1 flex-col">
        {slices.map((s, i) => (
          <div key={s.slug} className="gap-fn-2 flex items-center text-[12px]">
            <span
              className="rounded-fn-full h-fn-2_5 w-fn-2_5 shrink-0"
              style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="text-fn-fg-muted truncate">{s.name}</span>
            <span className="text-fn-fg font-fn-medium ml-auto tabular-nums">
              {usd(s.revenueUsd)}
            </span>
            <span className="text-fn-fg-faint w-[38px] text-right tabular-nums">
              {Math.round((s.revenueUsd / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopEarnersBars({ rows }: { rows: DashboardTopEarner[] }) {
  if (rows.length === 0) return <Empty text="No commission this month yet." />;
  const max = Math.max(...rows.map((r) => r.totalUsd), 1);
  return (
    <div className="gap-fn-2_5 flex flex-col">
      {rows.map((r, i) => (
        <div key={r.employeeId} className="gap-fn-2 flex items-center">
          <span className="text-fn-fg-muted w-[120px] shrink-0 truncate text-[12px]">
            {r.fullName}
          </span>
          <div className="bg-fn-bg-inset rounded-fn-full h-fn-2_5 relative flex-1 overflow-hidden">
            <div
              className="rounded-fn-full absolute inset-y-0 left-0"
              style={{
                width: `${Math.max(2, (r.totalUsd / max) * 100)}%`,
                background: CHART_COLORS[i % CHART_COLORS.length],
              }}
            />
          </div>
          <span className="text-fn-fg w-[76px] shrink-0 text-right text-[12px] tabular-nums">
            {usd2(r.totalUsd)}
          </span>
        </div>
      ))}
    </div>
  );
}

function BdBars({ rows }: { rows: DashboardBdRow[] }) {
  if (rows.length === 0) return <Empty text="No BD activity recorded." />;
  const maxWon = Math.max(...rows.map((r) => r.projectsWon), 1);
  const maxPaid = Math.max(...rows.map((r) => r.commissionPaidUsd), 1);
  return (
    <div className="gap-fn-3 flex flex-col">
      <div className="gap-fn-3 flex items-center text-[10.5px]">
        <span className="gap-fn-1 flex items-center">
          <span className="rounded-fn-xs h-fn-2 w-fn-3" style={{ background: 'var(--chart-1)' }} />
          <span className="text-fn-fg-muted">Projects won</span>
        </span>
        <span className="gap-fn-1 flex items-center">
          <span className="rounded-fn-xs h-fn-2 w-fn-3" style={{ background: 'var(--chart-4)' }} />
          <span className="text-fn-fg-muted">Commission paid</span>
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.employeeId} className="gap-fn-1 flex flex-col">
          <div className="flex justify-between text-[11.5px]">
            <span className="text-fn-fg-muted truncate">{r.fullName}</span>
            <span className="text-fn-fg-faint tabular-nums">
              {r.projectsWon} won · {usd(r.commissionPaidUsd)}
            </span>
          </div>
          <div className="gap-fn-0_5 flex flex-col">
            <Bar pct={(r.projectsWon / maxWon) * 100} color="var(--chart-1)" />
            <Bar pct={(r.commissionPaidUsd / maxPaid) * 100} color="var(--chart-4)" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="bg-fn-bg-inset rounded-fn-full h-fn-1_5 relative w-full overflow-hidden">
      <div
        className="rounded-fn-full absolute inset-y-0 left-0"
        style={{ width: `${Math.max(2, pct)}%`, background: color }}
      />
    </div>
  );
}

/* ───────────────────────── §9.3 Activity feed ───────────────────────── */

const ACTIVITY_TONE: Record<string, React.ComponentProps<typeof Badge>['tone']> = {
  project: 'info',
  commission: 'accent',
  employee: 'success',
};

function ActivityFeed({ items }: { items: ManagementDashboard['activity'] }) {
  if (items.length === 0) return <Empty text="No recent activity." />;
  return (
    <div className="gap-fn-1 flex flex-col">
      {items.map((a) => (
        <div
          key={a.id}
          className="border-fn-divider gap-fn-3 py-fn-2 flex items-center border-t first:border-t-0"
        >
          <Badge tone={ACTIVITY_TONE[a.kind] ?? 'default'}>{a.kind}</Badge>
          <div className="flex min-w-0 flex-col">
            <span className="text-fn-fg truncate text-[12.5px]">{a.label}</span>
            {a.actor && <span className="text-fn-fg-faint truncate text-[11px]">by {a.actor}</span>}
          </div>
          <span className="text-fn-fg-faint ml-auto shrink-0 text-[11px] tabular-nums">
            {formatWhen(a.at)}
          </span>
        </div>
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-fn-fg-faint py-fn-4 text-center text-[12.5px]">{text}</p>;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
