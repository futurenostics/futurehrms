'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Network,
  Wallet,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/shell/app-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ProfileHeader } from '@/components/employees/profile-header';
import { StatusPill } from '@/components/employees/status-pill';
import { useDeleteEmployee, useEmployee, useSalaryHistory } from '@/lib/queries/employees';
import { ChangeStatusDialog } from '@/components/employees/dialogs/change-status-dialog';
import { ChangeManagerDialog } from '@/components/employees/dialogs/change-manager-dialog';
import { ChangeSalaryDialog } from '@/components/employees/dialogs/change-salary-dialog';
import { EmployeeFormSheet } from '@/components/employees/employee-form-sheet';
import { ProfileQuickStats } from '@/components/employees/profile-quick-stats';
import { ProfileTimeline } from '@/components/employees/profile-timeline';
import { CompensationCard, DocumentsCard } from '@/components/employees/profile-sidebar-cards';
import { EmployeeCommissionsTab } from '@/components/employees/employee-commissions-tab';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

const TAB_KEYS = [
  'overview',
  'jobcomp',
  'salary',
  'documents',
  'evaluations',
  'commissions',
] as const;
type TabKey = (typeof TAB_KEYS)[number];

function isTabKey(value: string | null): value is TabKey {
  return TAB_KEYS.includes((value ?? '') as TabKey);
}

export default function EmployeeProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? null;
  const searchParams = useSearchParams();
  const router = useRouter();
  const perms = usePermissions();

  const employeeQuery = useEmployee(id);
  const employee = employeeQuery.data;

  const requestedTab = searchParams.get('tab');
  const activeTab: TabKey = isTabKey(requestedTab) ? requestedTab : 'overview';

  const [changeStatusOpen, setChangeStatusOpen] = React.useState(false);
  const [changeManagerOpen, setChangeManagerOpen] = React.useState(false);
  const [changeSalaryOpen, setChangeSalaryOpen] = React.useState(false);
  const [archiveOpen, setArchiveOpen] = React.useState(false);

  // Edit-sheet open state derived from ?sheet=edit so the browser back
  // button closes the sheet and the URL is shareable.
  const editOpen = searchParams.get('sheet') === 'edit';
  const setEditOpen = React.useCallback(
    (next: boolean) => {
      const params = new URLSearchParams(searchParams);
      if (next) params.set('sheet', 'edit');
      else params.delete('sheet');
      const qs = params.toString();
      router.push(qs ? `?${qs}` : window.location.pathname, { scroll: false });
    },
    [router, searchParams],
  );
  const archiveMutation = useDeleteEmployee(id ?? '');

  function setTab(next: TabKey) {
    const search = new URLSearchParams(searchParams);
    search.set('tab', next);
    router.replace(`?${search.toString()}`, { scroll: false });
  }

  function handleArchive() {
    archiveMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('Employee archived.');
        setArchiveOpen(false);
        router.push('/employees');
      },
      onError: (err) => toast.error((err as Error).message),
    });
  }

  return (
    <AppShell
      breadcrumbs={[
        { label: 'HR Core' },
        { label: 'Employees' },
        { label: employee?.fullName ?? 'Loading…' },
      ]}
    >
      <div className="gap-fn-4 mx-auto flex w-full max-w-6xl flex-col">
        {employeeQuery.isLoading && <ProfileHeaderSkeleton />}
        {employeeQuery.isError && (
          <ErrorState
            message={(employeeQuery.error as Error)?.message ?? 'Could not load employee'}
            onRetry={() => employeeQuery.refetch()}
          />
        )}
        {employee && (
          <>
            <ProfileHeader
              employee={employee}
              onEdit={() => setEditOpen(true)}
              onChangeStatus={() => setChangeStatusOpen(true)}
              onChangeManager={() => setChangeManagerOpen(true)}
              onChangeSalary={() => setChangeSalaryOpen(true)}
              onArchive={() => setArchiveOpen(true)}
              onViewPortal={() => router.push(`/employees/${employee.id}/portal`)}
            />

            {/* Quick-stat strip — sits directly under the header per the
                design's profile screen layout. */}
            <ProfileQuickStats employee={employee} />

            {/* Tab anchor bar — restructured to match the design:
                Overview · Job & comp · Salary history · Timeline ·
                Documents · Evaluations · Commissions. The active tab
                content renders in a 2-col grid below: left column owns
                the primary content, right column owns the sidebar
                cards (Compensation + Documents). */}
            <Tabs value={activeTab} onValueChange={(v) => setTab(v as TabKey)}>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="jobcomp">Job &amp; comp</TabsTrigger>
                {perms.has('employees:view_salary') && (
                  <TabsTrigger value="salary">Salary history</TabsTrigger>
                )}
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
                <TabsTrigger value="commissions">Commissions</TabsTrigger>
              </TabsList>

              <div className="gap-fn-5 mt-fn-4 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
                <div className="min-w-0">
                  <TabsContent value="overview" className="mt-0">
                    <div className="gap-fn-5 flex flex-col">
                      <PersonalTab employee={employee} />
                      {/* Activity timeline lives at the bottom of the
                          Overview tab now — the standalone Timeline tab
                          was removed in favour of this co-located view
                          so the profile reads top-to-bottom as
                          "who they are → what's been happening". */}
                      <ProfileTimeline employeeId={employee.id} />
                    </div>
                  </TabsContent>
                  <TabsContent value="jobcomp" className="mt-0">
                    <JobTab employee={employee} />
                  </TabsContent>
                  {perms.has('employees:view_salary') && (
                    <TabsContent value="salary" className="mt-0">
                      <SalaryTab employeeId={employee.id} />
                    </TabsContent>
                  )}
                  <TabsContent value="documents" className="mt-0">
                    <PlaceholderTab
                      title="Documents"
                      body="Document storage and upload will be available in a future release."
                    />
                  </TabsContent>
                  <TabsContent value="evaluations" className="mt-0">
                    <PlaceholderTab
                      title="Evaluations"
                      body="Performance evaluations land in a later phase."
                    />
                  </TabsContent>
                  <TabsContent value="commissions" className="mt-0">
                    <EmployeeCommissionsTab employeeId={employee.id} />
                  </TabsContent>
                </div>

                {/* Sidebar — Compensation + Documents cards. Hidden on
                    narrow viewports where they stack under the primary
                    tab content (the grid collapses to one column). */}
                <aside className="gap-fn-4 flex min-w-0 flex-col">
                  {perms.has('employees:view_salary') && (
                    <CompensationCard
                      employee={employee}
                      onIncrement={() => setChangeSalaryOpen(true)}
                    />
                  )}
                  <DocumentsCard employee={employee} />
                </aside>
              </div>
            </Tabs>

            <ChangeStatusDialog
              open={changeStatusOpen}
              onOpenChange={setChangeStatusOpen}
              employee={employee}
            />
            <ChangeManagerDialog
              open={changeManagerOpen}
              onOpenChange={setChangeManagerOpen}
              employee={employee}
            />
            <ChangeSalaryDialog
              open={changeSalaryOpen}
              onOpenChange={setChangeSalaryOpen}
              employee={employee}
            />

            <EmployeeFormSheet
              open={editOpen}
              onOpenChange={setEditOpen}
              mode="edit"
              employee={employee}
              onSuccess={() => employeeQuery.refetch()}
            />

            <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Archive {employee.fullName}?</DialogTitle>
                  <DialogDescription>
                    Archived employees disappear from the default list but their data and history
                    are preserved. You can restore from the archive at any time.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="secondary" onClick={() => setArchiveOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleArchive}
                    disabled={archiveMutation.isPending}
                  >
                    {archiveMutation.isPending ? 'Archiving…' : 'Archive'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </AppShell>
  );
}

/* ---------- Tabs ---------- */

function PersonalTab({
  employee,
}: {
  employee: NonNullable<ReturnType<typeof useEmployee>['data']>;
}) {
  return (
    <Section title="Personal information">
      <FieldGrid>
        <Field
          label="Full name"
          value={employee.fullName}
          icon={<Mail className="h-fn-3_5 w-fn-3_5" />}
          hideIcon
        />
        <Field label="Email" value={employee.email} icon={<Mail className="h-fn-3_5 w-fn-3_5" />} />
        <Field
          label="Phone"
          value={employee.phone ?? '—'}
          icon={<Phone className="h-fn-3_5 w-fn-3_5" />}
        />
        <Field
          label="Date of birth"
          value={employee.dateOfBirth ? formatDate(employee.dateOfBirth) : '—'}
          icon={<Calendar className="h-fn-3_5 w-fn-3_5" />}
        />
        <Field label="Gender" value={formatGender(employee.gender)} />
        <Field label="CNIC" value={employee.cnicMasked ?? '—'} />
      </FieldGrid>
      {employee.emergencyContact && (
        <Section title="Emergency contact" subdued>
          <FieldGrid>
            <Field label="Name" value={employee.emergencyContact.name ?? '—'} />
            <Field label="Relationship" value={employee.emergencyContact.relationship ?? '—'} />
            <Field label="Phone" value={employee.emergencyContact.phone ?? '—'} />
          </FieldGrid>
        </Section>
      )}
    </Section>
  );
}

function JobTab({ employee }: { employee: NonNullable<ReturnType<typeof useEmployee>['data']> }) {
  return (
    <Section title="Employment">
      <FieldGrid>
        <Field
          label="Department"
          value={employee.department.name}
          icon={<Briefcase className="h-fn-3_5 w-fn-3_5" />}
        />
        <Field label="Designation" value={employee.designation.name} />
        <Field label="Status" value={<StatusPill status={employee.status} />} />
        <Field label="Contract type" value={employee.contractType} />
        <Field label="Join date" value={formatDate(employee.joinDate)} />
        <Field
          label="Manager"
          value={
            employee.manager ? (
              <Link
                href={`/employees/${employee.manager.id}`}
                className="text-fn-fg font-fn-medium hover:underline"
              >
                {employee.manager.fullName}
              </Link>
            ) : (
              '—'
            )
          }
          icon={<Network className="h-fn-3_5 w-fn-3_5" />}
        />
        <Field
          label="Internship end"
          value={employee.internshipEndDate ? formatDate(employee.internshipEndDate) : '—'}
        />
        <Field
          label="Probation end"
          value={employee.probationEndDate ? formatDate(employee.probationEndDate) : '—'}
        />
      </FieldGrid>
    </Section>
  );
}

function SalaryTab({ employeeId }: { employeeId: string }) {
  const salaryQuery = useSalaryHistory(employeeId);
  const employeeQuery = useEmployee(employeeId);
  const employee = employeeQuery.data;

  if (salaryQuery.isLoading) return <SectionSkeleton />;
  if (salaryQuery.isError) {
    return (
      <Section title="Salary history">
        <p className="text-fn-fg-muted text-[13px]">
          {(salaryQuery.error as Error)?.message ?? 'Could not load salary history.'}
        </p>
      </Section>
    );
  }

  const entries = salaryQuery.data ?? [];

  return (
    <Section title="Compensation">
      <div className="gap-fn-3 grid sm:grid-cols-2">
        <div className="rounded-fn-md border-fn-border bg-fn-bg-subtle gap-fn-3 p-fn-4 flex items-start border">
          <div
            className="rounded-fn-md h-fn-9 w-fn-9 flex items-center justify-center"
            style={{ background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)' }}
          >
            <Wallet className="h-fn-4 w-fn-4" />
          </div>
          <div className="gap-fn-0_5 flex flex-col">
            <div className="text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight text-[11px] uppercase">
              Current salary
            </div>
            <div className="text-fn-fg font-fn-semibold text-[18px] tabular-nums">
              {employee?.salaryPkr != null ? formatPkr(employee.salaryPkr) : '—'}
            </div>
          </div>
        </div>
        <div className="rounded-fn-md border-fn-border bg-fn-bg-subtle gap-fn-3 p-fn-4 flex items-start border">
          <div
            className="rounded-fn-md h-fn-9 w-fn-9 flex items-center justify-center"
            style={{ background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)' }}
          >
            <Clock className="h-fn-4 w-fn-4" />
          </div>
          <div className="gap-fn-0_5 flex flex-col">
            <div className="text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight text-[11px] uppercase">
              Last increment
            </div>
            <div className="text-fn-fg font-fn-medium text-[15px] tabular-nums">
              {employee?.lastIncrementDate
                ? formatDate(employee.lastIncrementDate)
                : 'No prior change'}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-fn-md border-fn-border mt-fn-5 overflow-hidden border">
        <table className="w-full text-[13px]">
          <thead className="bg-fn-bg-subtle text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight text-[11px] uppercase">
            <tr>
              <th className="px-fn-3 py-fn-2 text-left">Effective</th>
              <th className="px-fn-3 py-fn-2 text-right">From</th>
              <th className="px-fn-3 py-fn-2 text-right">To</th>
              <th className="px-fn-3 py-fn-2 text-right">Change</th>
              <th className="px-fn-3 py-fn-2 text-left">Reason</th>
              <th className="px-fn-3 py-fn-2 text-left">Changed by</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="text-fn-fg-muted px-fn-3 py-fn-6 text-center">
                  No salary changes recorded yet.
                </td>
              </tr>
            )}
            {entries.map((entry) => {
              const delta = entry.oldSalaryPkr ? entry.newSalaryPkr - entry.oldSalaryPkr : null;
              const pct = entry.oldSalaryPkr ? (delta! / entry.oldSalaryPkr) * 100 : null;
              return (
                <tr key={entry.id} className="border-fn-divider border-t">
                  <td className="text-fn-fg px-fn-3 py-fn-2_5 tabular-nums">
                    {formatDate(entry.effectiveDate)}
                  </td>
                  <td className="text-fn-fg-muted px-fn-3 py-fn-2_5 text-right tabular-nums">
                    {entry.oldSalaryPkr != null ? formatPkr(entry.oldSalaryPkr) : '—'}
                  </td>
                  <td className="text-fn-fg px-fn-3 py-fn-2_5 font-fn-medium text-right tabular-nums">
                    {formatPkr(entry.newSalaryPkr)}
                  </td>
                  <td
                    className={cn(
                      'px-fn-3 py-fn-2_5 text-right tabular-nums',
                      (delta ?? 0) >= 0 ? 'text-fn-success-soft-fg' : 'text-fn-danger-soft-fg',
                    )}
                  >
                    {pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` : '—'}
                  </td>
                  <td className="text-fn-fg-muted px-fn-3 py-fn-2_5">{entry.remarks ?? '—'}</td>
                  <td className="text-fn-fg-muted px-fn-3 py-fn-2_5">
                    {entry.changedByName ?? '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function PlaceholderTab({ title, body }: { title: string; body: string }) {
  return (
    <Section title={title}>
      <div className="rounded-fn-md border-fn-border bg-fn-bg-subtle gap-fn-3 p-fn-5 flex items-start border border-dashed">
        <AlertCircle className="text-fn-fg-faint mt-fn-0_5 h-fn-4 w-fn-4" />
        <p className="text-fn-fg-muted text-[13px]">{body}</p>
      </div>
    </Section>
  );
}

/* ---------- Helpers ---------- */

function Section({
  title,
  subdued,
  children,
}: {
  title: string;
  subdued?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-fn-xs border-fn-border bg-fn-bg-panel shadow-fn-sm p-fn-6 border',
        subdued && 'bg-fn-bg-subtle mt-fn-4',
      )}
    >
      <h2 className="text-fn-fg mb-fn-4 font-fn-semibold tracking-fn-tight text-[14px]">{title}</h2>
      {children}
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <dl className="gap-x-fn-6 gap-y-fn-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
      {children}
    </dl>
  );
}

function Field({
  label,
  value,
  icon,
  hideIcon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hideIcon?: boolean;
}) {
  return (
    <div className="gap-fn-0_5 flex flex-col">
      <dt className="text-fn-fg-faint gap-fn-1_5 font-fn-semibold tracking-fn-uppercase-tight flex items-center text-[11px] uppercase">
        {icon && !hideIcon && <span className="text-fn-fg-faint">{icon}</span>}
        {label}
      </dt>
      <dd className="text-fn-fg text-[13px]">{value}</dd>
    </div>
  );
}

function ProfileHeaderSkeleton() {
  return (
    <div className="rounded-fn-xs border-fn-border bg-fn-bg-panel shadow-fn-sm p-fn-6 border">
      <div className="gap-fn-5 flex items-start">
        <Skeleton className="h-fn-20 w-fn-20 rounded-fn-full" />
        <div className="gap-fn-2 flex flex-1 flex-col">
          <Skeleton className="h-fn-5 w-fn-48" />
          <Skeleton className="h-fn-3 w-fn-64" />
          <Skeleton className="h-fn-3 w-fn-40" />
        </div>
      </div>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="rounded-fn-xs border-fn-border bg-fn-bg-panel shadow-fn-sm p-fn-6 border">
      <Skeleton className="mb-fn-4 h-fn-4 w-fn-32" />
      <div className="gap-fn-3 grid grid-cols-3">
        <Skeleton className="h-fn-10 w-full" />
        <Skeleton className="h-fn-10 w-full" />
        <Skeleton className="h-fn-10 w-full" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-fn-lg border-fn-danger-soft bg-fn-danger-soft/40 text-fn-danger-soft-fg px-fn-4 py-fn-3 flex items-center justify-between border text-[13px]">
      <div className="gap-fn-2 flex items-center">
        <AlertCircle className="h-fn-4 w-fn-4" />
        {message}
      </div>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function formatPkr(value: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatGender(value: string | null): string {
  if (!value) return '—';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
