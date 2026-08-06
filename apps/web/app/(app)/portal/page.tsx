'use client';

import * as React from 'react';
import { Briefcase, Download, TrendingUp, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import type { CommissionRunStatus, EmployeeCommissionHistoryRow } from '@futurenostics/types';
import { AppShell } from '@/components/shell/app-shell';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmployeeAvatar } from '@/components/employees/employee-avatar';
import { useUser } from '@/hooks/use-user';
import {
  useEmployee,
  useEmployeeAssignedProjects,
  type AssignedProject,
} from '@/lib/queries/employees';
import {
  downloadPayslip,
  useEmployeeCommissionBreakdown,
  useEmployeeCommissionHistory,
} from '@/lib/queries/commission-runs';

/**
 * /portal — the employee's own self-service portal (Module 6). Resolves
 * the logged-in user's employeeId and renders three read-only tabs:
 * Overview, Commission History, My Projects. Admins previewing another
 * employee's portal use /employees/[id]/portal instead.
 */
const CURRENT_MONTH = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
})();

export default function SelfServicePortalPage() {
  const { data: user, isPending: userLoading } = useUser();
  const employeeId = user?.employeeId ?? null;

  const employeeQuery = useEmployee(employeeId ?? '');
  const employee = employeeQuery.data;
  const thisMonth = useEmployeeCommissionBreakdown(employeeId, CURRENT_MONTH);
  const history = useEmployeeCommissionHistory(employeeId, 12);
  const projects = useEmployeeAssignedProjects(employeeId, 'all');

  if (userLoading) {
    return (
      <AppShell breadcrumbs={[{ label: 'My Portal' }]}>
        <div className="gap-fn-4 flex flex-col">
          <Skeleton className="h-fn-16 w-full" />
          <Skeleton className="h-[320px] w-full" />
        </div>
      </AppShell>
    );
  }

  if (!employeeId) {
    return (
      <AppShell breadcrumbs={[{ label: 'My Portal' }]}>
        <Alert tone="warning">
          <span className="font-fn-semibold">No employee profile linked.</span> Your login
          isn&apos;t connected to an employee record yet, so there&apos;s no portal to show. Contact
          HR to have your account linked.
        </Alert>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumbs={[{ label: 'My Portal' }]}>
      <div className="gap-fn-5 mx-auto flex w-full max-w-[1120px] flex-col">
        {/* Welcome card (§8.1) */}
        <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-3 px-fn-5 py-fn-4 flex items-center border">
          {employee ? (
            <>
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
            </>
          ) : (
            <Skeleton className="h-fn-12 w-full" />
          )}
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">Commission History</TabsTrigger>
            <TabsTrigger value="projects">My Projects</TabsTrigger>
          </TabsList>

          {/* ─────────── Overview ─────────── */}
          <TabsContent value="overview" className="mt-fn-5">
            <div className="gap-fn-5 flex flex-col">
              {/* Salary + USD conversion (§8.1) */}
              <div className="gap-fn-4 grid grid-cols-1 md:grid-cols-3">
                <StatCard
                  icon={<Wallet className="h-fn-4 w-fn-4" />}
                  label="Base salary (PKR)"
                  value={
                    employee?.salaryPkr != null
                      ? `Rs ${employee.salaryPkr.toLocaleString('en-PK')}`
                      : '—'
                  }
                  hint={
                    thisMonth.data?.fxRateUsdToPkr
                      ? `USD rate ${thisMonth.data.fxRateUsdToPkr}`
                      : 'No FX rate this month'
                  }
                />
                <StatCard
                  icon={<Wallet className="h-fn-4 w-fn-4" />}
                  label="Salary (USD equivalent)"
                  value={
                    employee?.salaryPkr != null && thisMonth.data?.fxRateUsdToPkr
                      ? `$${Math.round(
                          Number(employee.salaryPkr) * thisMonth.data.fxRateUsdToPkr,
                        ).toLocaleString('en-US')}`
                      : '—'
                  }
                  hint="At this month's pinned rate"
                />
                <StatCard
                  icon={<TrendingUp className="h-fn-4 w-fn-4" />}
                  label={`Commission · ${thisMonth.data?.monthLabel ?? monthLabelOf(CURRENT_MONTH)}`}
                  value={thisMonth.data ? money(thisMonth.data.totalUsd) : '—'}
                  hint={
                    thisMonth.data?.runStatus
                      ? statusBadge(thisMonth.data.runStatus).label
                      : 'Not processed yet'
                  }
                />
              </div>

              {/* This month by type (§8.1 breakdown by type) */}
              <Section title={`This month by type · ${thisMonth.data?.monthLabel ?? ''}`}>
                {thisMonth.isPending ? (
                  <Skeleton className="h-fn-16 w-full" />
                ) : thisMonth.data && thisMonth.data.totalUsd > 0 ? (
                  <div className="gap-fn-3 grid grid-cols-2 md:grid-cols-4">
                    <TypeStat label="External" value={thisMonth.data.typeBreakdown.external} />
                    <TypeStat
                      label="Comm. Allowance"
                      value={thisMonth.data.typeBreakdown.allowance}
                    />
                    <TypeStat label="TL Reward" value={thisMonth.data.typeBreakdown.tlReward} />
                    <TypeStat label="Upwork" value={thisMonth.data.typeBreakdown.upwork} />
                  </div>
                ) : (
                  <EmptyLine text="No commission processed this month yet." />
                )}
              </Section>

              {/* Active projects quick list */}
              <Section title="Active projects">
                <ActiveProjectsList
                  loading={projects.isPending}
                  projects={(projects.data ?? []).filter((p) => isActive(p.status))}
                />
              </Section>
            </div>
          </TabsContent>

          {/* ─────────── Commission History (§8.2) ─────────── */}
          <TabsContent value="history" className="mt-fn-5">
            <CommissionHistoryTab
              employeeId={employeeId}
              loading={history.isPending}
              rows={history.data?.rows ?? []}
            />
          </TabsContent>

          {/* ─────────── My Projects (§8.3) ─────────── */}
          <TabsContent value="projects" className="mt-fn-5">
            <MyProjectsTab loading={projects.isPending} projects={projects.data ?? []} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

/* ───────────────────────── Commission History tab ───────────────────────── */

function CommissionHistoryTab({
  employeeId,
  loading,
  rows,
}: {
  employeeId: string;
  loading: boolean;
  rows: EmployeeCommissionHistoryRow[];
}) {
  const [detailMonth, setDetailMonth] = React.useState<string | null>(null);
  const [busyMonth, setBusyMonth] = React.useState<string | null>(null);

  async function payslip(monthKey: string) {
    setBusyMonth(monthKey);
    try {
      await downloadPayslip(employeeId, monthKey);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyMonth(null);
    }
  }

  if (loading) return <Skeleton className="h-[360px] w-full" />;

  return (
    <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs overflow-hidden border">
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead className="bg-fn-bg-inset text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight text-[10.5px] uppercase">
            <tr>
              <th className="px-fn-4 py-fn-2_5 text-left">Month</th>
              <th className="px-fn-4 py-fn-2_5 text-right">External</th>
              <th className="px-fn-4 py-fn-2_5 text-right">Comm. Allowance</th>
              <th className="px-fn-4 py-fn-2_5 text-right">TL Reward</th>
              <th className="px-fn-4 py-fn-2_5 text-right">Upwork</th>
              <th className="px-fn-4 py-fn-2_5 text-right">Total</th>
              <th className="px-fn-4 py-fn-2_5 text-left">Status</th>
              <th className="px-fn-4 py-fn-2_5 text-right">Payslip</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const badge = statusBadge(r.status);
              const canDownload = r.status === 'approved' || r.status === 'locked';
              return (
                <tr
                  key={r.monthKey}
                  className="border-fn-divider hover:bg-fn-bg-inset/40 cursor-pointer border-t transition-colors"
                  onClick={() => r.total > 0 && setDetailMonth(r.monthKey)}
                >
                  <td className="px-fn-4 py-fn-2_5 text-fn-fg font-fn-medium">{r.monthLabel}</td>
                  <td className="px-fn-4 py-fn-2_5 text-fn-fg-muted text-right tabular-nums">
                    {money(r.external)}
                  </td>
                  <td className="px-fn-4 py-fn-2_5 text-fn-fg-muted text-right tabular-nums">
                    {money(r.allowance)}
                  </td>
                  <td className="px-fn-4 py-fn-2_5 text-fn-fg-muted text-right tabular-nums">
                    {money(r.tlReward)}
                  </td>
                  <td className="px-fn-4 py-fn-2_5 text-fn-fg-muted text-right tabular-nums">
                    {money(r.upwork)}
                  </td>
                  <td className="px-fn-4 py-fn-2_5 text-fn-fg font-fn-semibold text-right tabular-nums">
                    {money(r.total)}
                  </td>
                  <td className="px-fn-4 py-fn-2_5">
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </td>
                  <td className="px-fn-4 py-fn-2_5 text-right" onClick={(e) => e.stopPropagation()}>
                    {canDownload ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyMonth === r.monthKey}
                        onClick={() => payslip(r.monthKey)}
                      >
                        <Download className="h-fn-3_5 w-fn-3_5" /> PDF
                      </Button>
                    ) : (
                      <span className="text-fn-fg-faint text-[11px]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <MonthDetailDialog
        employeeId={employeeId}
        monthKey={detailMonth}
        onClose={() => setDetailMonth(null)}
      />
    </div>
  );
}

function MonthDetailDialog({
  employeeId,
  monthKey,
  onClose,
}: {
  employeeId: string;
  monthKey: string | null;
  onClose: () => void;
}) {
  const breakdown = useEmployeeCommissionBreakdown(employeeId, monthKey ?? '');
  return (
    <Dialog open={monthKey !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Commission detail · {breakdown.data?.monthLabel ?? ''}</DialogTitle>
          <DialogDescription>
            Line-by-line breakdown of your commission for the month.
          </DialogDescription>
        </DialogHeader>
        {breakdown.isPending ? (
          <Skeleton className="h-fn-16 w-full" />
        ) : breakdown.data && breakdown.data.lineItems.length > 0 ? (
          <div className="gap-fn-1 flex flex-col">
            {breakdown.data.lineItems.map((li) => (
              <div
                key={li.id}
                className="border-fn-divider py-fn-2 gap-fn-3 flex items-center border-t first:border-t-0"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-fn-fg font-fn-medium truncate text-[13px]">
                    {li.project.name}
                  </span>
                  <span className="text-fn-fg-faint text-[11px]">
                    {li.project.category.name} · {roleLabel(li.roleName)}
                  </span>
                </div>
                <span className="text-fn-fg ml-auto text-right text-[13px] tabular-nums">
                  {money(li.finalAmountUsd)}
                </span>
              </div>
            ))}
            <div className="border-fn-border mt-fn-1 py-fn-2 flex items-center border-t">
              <span className="text-fn-fg-muted font-fn-semibold text-[12px]">Total</span>
              <span className="text-fn-fg font-fn-semibold ml-auto text-[14px] tabular-nums">
                {money(breakdown.data.totalUsd)}
              </span>
            </div>
          </div>
        ) : (
          <EmptyLine text="No line items for this month." />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── My Projects tab ───────────────────────── */

function MyProjectsTab({ loading, projects }: { loading: boolean; projects: AssignedProject[] }) {
  if (loading) return <Skeleton className="h-[320px] w-full" />;
  const active = projects.filter((p) => isActive(p.status));
  const archived = projects.filter((p) => !isActive(p.status));

  return (
    <div className="gap-fn-5 flex flex-col">
      <Section title={`Active projects (${active.length})`}>
        <ProjectTable projects={active} emptyText="Not assigned to any active projects." />
      </Section>
      <Section title={`Completed / archived (${archived.length})`}>
        <ProjectTable projects={archived} emptyText="No completed or archived projects." />
      </Section>
    </div>
  );
}

function ProjectTable({ projects, emptyText }: { projects: AssignedProject[]; emptyText: string }) {
  if (projects.length === 0) return <EmptyLine text={emptyText} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead className="text-fn-fg-faint tracking-fn-uppercase-tight text-[10.5px] uppercase">
          <tr>
            <th className="py-fn-2 pr-fn-3 text-left">Project</th>
            <th className="py-fn-2 px-fn-3 text-left">Category</th>
            <th className="py-fn-2 px-fn-3 text-left">Role</th>
            <th className="py-fn-2 px-fn-3 text-left">Start</th>
            <th className="py-fn-2 pl-fn-3 text-right">Commission</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.projectId} className="border-fn-divider border-t">
              <td className="py-fn-2_5 pr-fn-3">
                <div className="flex min-w-0 flex-col">
                  <span className="text-fn-fg font-fn-medium truncate">{p.name}</span>
                  <span className="text-fn-fg-faint truncate text-[11px]">{p.clientName}</span>
                </div>
              </td>
              <td className="py-fn-2_5 px-fn-3 text-fn-fg-muted">{p.categoryName}</td>
              <td className="py-fn-2_5 px-fn-3 text-fn-fg-muted">{roleLabel(p.roleName)}</td>
              <td className="py-fn-2_5 px-fn-3 text-fn-fg-muted tabular-nums">
                {formatDate(p.startDate)}
              </td>
              <td className="py-fn-2_5 pl-fn-3 text-fn-fg text-right tabular-nums">
                {money(p.commissionUsd)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActiveProjectsList({
  loading,
  projects,
}: {
  loading: boolean;
  projects: AssignedProject[];
}) {
  if (loading) return <Skeleton className="h-fn-16 w-full" />;
  if (projects.length === 0) return <EmptyLine text="Not assigned to any active projects." />;
  return (
    <div className="gap-fn-2 flex flex-col">
      {projects.map((p) => (
        <div
          key={p.projectId}
          className="border-fn-divider gap-fn-3 py-fn-2_5 flex items-center border-t first:border-t-0"
        >
          <Briefcase className="text-fn-fg-faint h-fn-4 w-fn-4 shrink-0" />
          <div className="gap-fn-0_5 flex min-w-0 flex-col">
            <span className="text-fn-fg font-fn-medium truncate text-[13px]">{p.name}</span>
            <span className="text-fn-fg-faint truncate text-[11.5px]">
              {p.categoryName} · {roleLabel(p.roleName)} · {p.percentage}% share
            </span>
          </div>
          <Badge tone={PROJECT_TONES[p.status] ?? 'default'} className="ml-auto" dot>
            {p.status.replace(/_/g, ' ')}
          </Badge>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── pieces ───────────────────────── */

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

function TypeStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-fn-border rounded-fn-xs px-fn-3 py-fn-2_5 gap-fn-1 flex flex-col border">
      <span className="text-fn-fg-faint text-[10.5px] uppercase tracking-[0.06em]">{label}</span>
      <span className="text-fn-fg font-fn-semibold text-[16px] tabular-nums">{money(value)}</span>
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

function isActive(status: string): boolean {
  return status === 'active' || status === 'in_billing' || status === 'on_hold';
}

function statusBadge(status: CommissionRunStatus | null): {
  label: string;
  tone: React.ComponentProps<typeof Badge>['tone'];
} {
  switch (status) {
    case 'locked':
      return { label: 'Disbursed', tone: 'success' };
    case 'approved':
      return { label: 'Approved', tone: 'info' };
    case 'pending_approval':
      return { label: 'Pending', tone: 'warning' };
    case 'rejected':
      return { label: 'Rejected', tone: 'danger' };
    case 'draft':
      return { label: 'Pending', tone: 'default' };
    default:
      return { label: 'No run', tone: 'default' };
  }
}

function money(n: number): string {
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
