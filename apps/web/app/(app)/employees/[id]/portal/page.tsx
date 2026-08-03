'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Briefcase, TrendingUp, Wallet } from 'lucide-react';
import { AppShell } from '@/components/shell/app-shell';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmployeeAvatar } from '@/components/employees/employee-avatar';
import { useEmployee, useEmployeeAssignedProjects } from '@/lib/queries/employees';
import {
  useEmployeeCommissionBreakdown,
  useEmployeeCommissionTrend,
} from '@/lib/queries/commission-runs';

/**
 * /employees/[id]/portal — read-only "view as" of an employee's
 * self-service portal. Admins see exactly what the employee sees —
 * salary, this month's commission + trend, and active projects — with
 * no edit affordances. Composed entirely from existing read endpoints.
 */
export default function EmployeePortalPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? '';

  const monthKey = React.useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const employeeQuery = useEmployee(id);
  const breakdown = useEmployeeCommissionBreakdown(id, monthKey);
  const trend = useEmployeeCommissionTrend(id, 6);
  const projects = useEmployeeAssignedProjects(id);

  const employee = employeeQuery.data;

  return (
    <AppShell
      breadcrumbs={[
        { label: 'HR Core' },
        { label: 'Employees' },
        { label: employee?.fullName ?? 'Portal' },
        { label: 'Portal' },
      ]}
    >
      <div className="gap-fn-5 flex h-full flex-col">
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => router.push(`/employees/${id}`)}
        >
          <ArrowLeft className="h-fn-3_5 w-fn-3_5" /> Back to profile
        </Button>

        <Alert tone="info">
          <span className="font-fn-semibold">Read-only preview.</span> This is the self-service
          portal {employee ? employee.fullName : 'this employee'} sees — you are viewing it, not
          acting as them. Nothing here is editable.
        </Alert>

        {/* Identity header */}
        {employee && (
          <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-3 px-fn-5 py-fn-4 flex items-center border">
            <EmployeeAvatar fullName={employee.fullName} photoUrl={employee.photoUrl} size="lg" />
            <div className="gap-fn-0_5 flex min-w-0 flex-col">
              <h1 className="text-fn-fg font-fn-semibold tracking-fn-tight text-[22px]">
                {employee.fullName}
              </h1>
              <p className="text-fn-fg-muted text-[13px]">
                {employee.eid} · {employee.designation.name} · {employee.department.name}
              </p>
            </div>
            <Badge tone="default" className="ml-auto">
              {employee.status.name}
            </Badge>
          </div>
        )}

        {/* Salary + commission-this-month stat row */}
        <div className="gap-fn-4 grid grid-cols-1 md:grid-cols-3">
          <StatCard
            icon={<Wallet className="h-fn-4 w-fn-4" />}
            label="Monthly salary (PKR)"
            value={
              employee?.salaryPkr != null ? `Rs ${employee.salaryPkr.toLocaleString('en-PK')}` : '—'
            }
            hint={
              employee?.salaryEffectiveDate
                ? `Effective ${formatDate(employee.salaryEffectiveDate)}`
                : 'No salary on record'
            }
          />
          <StatCard
            icon={<TrendingUp className="h-fn-4 w-fn-4" />}
            label={`Commission · ${breakdown.data?.monthLabel ?? monthLabelOf(monthKey)}`}
            value={breakdown.data ? formatUsd(breakdown.data.totalUsd) : '—'}
            hint={
              breakdown.data?.runStatus
                ? `Run ${breakdown.data.runStatus.replace('_', ' ')}`
                : 'No run this month'
            }
          />
          <StatCard
            icon={<Briefcase className="h-fn-4 w-fn-4" />}
            label="Active projects"
            value={projects.data ? String(projects.data.length) : '—'}
            hint="Currently assigned"
          />
        </div>

        {/* Commission trend (last 6 months) */}
        <Section title="Commission — last 6 months">
          {trend.data && trend.data.points.length > 0 ? (
            <div className="gap-fn-2 flex flex-col">
              {trend.data.points.map((p) => {
                const max = Math.max(...trend.data!.points.map((x) => x.totalUsd), 1);
                const pct = Math.max(2, Math.round((p.totalUsd / max) * 100));
                return (
                  <div key={p.monthKey} className="gap-fn-3 flex items-center">
                    <span className="text-fn-fg-muted w-[92px] shrink-0 text-[12px] tabular-nums">
                      {p.monthLabel}
                    </span>
                    <div className="bg-fn-bg-inset h-fn-2 rounded-fn-full relative flex-1 overflow-hidden">
                      <div
                        className="bg-fn-accent rounded-fn-full absolute inset-y-0 left-0 h-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-fn-fg w-[88px] shrink-0 text-right text-[12px] tabular-nums">
                      {formatUsd(p.totalUsd)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyLine text="No commission history yet." />
          )}
        </Section>

        {/* Active projects */}
        <Section title="Active projects">
          {projects.data && projects.data.length > 0 ? (
            <div className="gap-fn-2 flex flex-col">
              {projects.data.map((p) => (
                <div
                  key={p.projectId}
                  className="border-fn-divider gap-fn-3 py-fn-2_5 flex items-center border-t first:border-t-0"
                >
                  <div className="gap-fn-0_5 flex min-w-0 flex-col">
                    <span className="text-fn-fg font-fn-medium truncate text-[13px]">{p.name}</span>
                    <span className="text-fn-fg-faint truncate text-[11.5px]">
                      {p.clientName} · {roleLabel(p.roleName)} · {p.percentage}% share
                    </span>
                  </div>
                  <Badge tone={PROJECT_TONES[p.status] ?? 'default'} className="ml-auto" dot>
                    {p.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyLine text="Not assigned to any active projects." />
          )}
        </Section>
      </div>
    </AppShell>
  );
}

/* ---------- pieces ---------- */

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-2 px-fn-4 py-fn-3_5 flex flex-col border">
      <div className="text-fn-fg-faint gap-fn-1_5 flex items-center text-[11px] uppercase tracking-[0.08em]">
        {icon}
        {label}
      </div>
      <span className="text-fn-fg font-fn-semibold text-[22px] tabular-nums">{value}</span>
      <span className="text-fn-fg-faint text-[11.5px]">{hint}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs px-fn-5 py-fn-4 gap-fn-3 flex flex-col border">
      <h2 className="text-fn-fg font-fn-semibold text-[14px]">{title}</h2>
      {children}
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-fn-fg-faint py-fn-2 text-[12.5px]">{text}</p>;
}

const PROJECT_TONES: Record<string, React.ComponentProps<typeof Badge>['tone']> = {
  active: 'success',
  in_billing: 'info',
  on_hold: 'warning',
};

function formatUsd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function monthLabelOf(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function roleLabel(role: string): string {
  return role.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
