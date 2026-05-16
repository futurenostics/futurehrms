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
import {
  useDeleteEmployee,
  useEmployee,
  useSalaryHistory,
  useTimeline,
} from '@/lib/queries/employees';
import { ChangeStatusDialog } from '@/components/employees/dialogs/change-status-dialog';
import { ChangeManagerDialog } from '@/components/employees/dialogs/change-manager-dialog';
import { ChangeSalaryDialog } from '@/components/employees/dialogs/change-salary-dialog';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

const TAB_KEYS = ['personal', 'job', 'salary', 'timeline', 'documents', 'evaluations'] as const;
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
  const activeTab: TabKey = isTabKey(requestedTab) ? requestedTab : 'personal';

  const [changeStatusOpen, setChangeStatusOpen] = React.useState(false);
  const [changeManagerOpen, setChangeManagerOpen] = React.useState(false);
  const [changeSalaryOpen, setChangeSalaryOpen] = React.useState(false);
  const [archiveOpen, setArchiveOpen] = React.useState(false);
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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
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
              onChangeStatus={() => setChangeStatusOpen(true)}
              onChangeManager={() => setChangeManagerOpen(true)}
              onChangeSalary={() => setChangeSalaryOpen(true)}
              onArchive={() => setArchiveOpen(true)}
            />

            <Tabs value={activeTab} onValueChange={(v) => setTab(v as TabKey)}>
              <TabsList>
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="job">Job</TabsTrigger>
                {perms.has('employees:view_salary') && (
                  <TabsTrigger value="salary">Salary History</TabsTrigger>
                )}
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
              </TabsList>

              <TabsContent value="personal">
                <PersonalTab employee={employee} />
              </TabsContent>
              <TabsContent value="job">
                <JobTab employee={employee} />
              </TabsContent>
              {perms.has('employees:view_salary') && (
                <TabsContent value="salary">
                  <SalaryTab employeeId={employee.id} />
                </TabsContent>
              )}
              <TabsContent value="timeline">
                <TimelineTab employeeId={employee.id} />
              </TabsContent>
              <TabsContent value="documents">
                <PlaceholderTab
                  title="Documents"
                  body="Document storage and upload will be available in a future release. The placeholder card here will list contracts, offer letters, ID copies, and other employee files."
                />
              </TabsContent>
              <TabsContent value="evaluations">
                <PlaceholderTab
                  title="Evaluations"
                  body="Performance evaluations land in a later phase. This tab will show evaluation history, current evaluation cycle, and submitted forms."
                />
              </TabsContent>
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
          icon={<Mail className="h-3.5 w-3.5" />}
          hideIcon
        />
        <Field label="Email" value={employee.email} icon={<Mail className="h-3.5 w-3.5" />} />
        <Field
          label="Phone"
          value={employee.phone ?? '—'}
          icon={<Phone className="h-3.5 w-3.5" />}
        />
        <Field
          label="Date of birth"
          value={employee.dateOfBirth ? formatDate(employee.dateOfBirth) : '—'}
          icon={<Calendar className="h-3.5 w-3.5" />}
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
          icon={<Briefcase className="h-3.5 w-3.5" />}
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
                className="text-fn-fg font-medium hover:underline"
              >
                {employee.manager.fullName}
              </Link>
            ) : (
              '—'
            )
          }
          icon={<Network className="h-3.5 w-3.5" />}
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-fn-md border-fn-border bg-fn-bg-subtle flex items-start gap-3 border p-4">
          <div
            className="rounded-fn-md flex h-9 w-9 items-center justify-center"
            style={{ background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)' }}
          >
            <Wallet className="h-4 w-4" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="text-fn-fg-faint text-[11px] font-semibold uppercase tracking-wider">
              Current salary
            </div>
            <div className="font-tabular text-fn-fg text-[18px] font-semibold">
              {employee?.salaryPkr != null ? formatPkr(employee.salaryPkr) : '—'}
            </div>
          </div>
        </div>
        <div className="rounded-fn-md border-fn-border bg-fn-bg-subtle flex items-start gap-3 border p-4">
          <div
            className="rounded-fn-md flex h-9 w-9 items-center justify-center"
            style={{ background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)' }}
          >
            <Clock className="h-4 w-4" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="text-fn-fg-faint text-[11px] font-semibold uppercase tracking-wider">
              Last increment
            </div>
            <div className="font-tabular text-fn-fg text-[15px] font-medium">
              {employee?.lastIncrementDate
                ? formatDate(employee.lastIncrementDate)
                : 'No prior change'}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-fn-md border-fn-border mt-5 overflow-hidden border">
        <table className="w-full text-[13px]">
          <thead className="bg-fn-bg-subtle text-fn-fg-faint text-[11px] font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2 text-left">Effective</th>
              <th className="px-3 py-2 text-right">From</th>
              <th className="px-3 py-2 text-right">To</th>
              <th className="px-3 py-2 text-right">Change</th>
              <th className="px-3 py-2 text-left">Reason</th>
              <th className="px-3 py-2 text-left">Changed by</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="text-fn-fg-muted px-3 py-6 text-center">
                  No salary changes recorded yet.
                </td>
              </tr>
            )}
            {entries.map((entry) => {
              const delta = entry.oldSalaryPkr ? entry.newSalaryPkr - entry.oldSalaryPkr : null;
              const pct = entry.oldSalaryPkr ? (delta! / entry.oldSalaryPkr) * 100 : null;
              return (
                <tr key={entry.id} className="border-fn-divider border-t">
                  <td className="font-tabular text-fn-fg px-3 py-2.5">
                    {formatDate(entry.effectiveDate)}
                  </td>
                  <td className="font-tabular text-fn-fg-muted px-3 py-2.5 text-right">
                    {entry.oldSalaryPkr != null ? formatPkr(entry.oldSalaryPkr) : '—'}
                  </td>
                  <td className="font-tabular text-fn-fg px-3 py-2.5 text-right font-medium">
                    {formatPkr(entry.newSalaryPkr)}
                  </td>
                  <td
                    className={cn(
                      'font-tabular px-3 py-2.5 text-right',
                      (delta ?? 0) >= 0 ? 'text-fn-success-soft-fg' : 'text-fn-danger-soft-fg',
                    )}
                  >
                    {pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` : '—'}
                  </td>
                  <td className="text-fn-fg-muted px-3 py-2.5">{entry.remarks ?? '—'}</td>
                  <td className="text-fn-fg-muted px-3 py-2.5">{entry.changedByName ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function TimelineTab({ employeeId }: { employeeId: string }) {
  const timelineQuery = useTimeline(employeeId);
  if (timelineQuery.isLoading) return <SectionSkeleton />;
  const entries = timelineQuery.data ?? [];

  if (entries.length === 0) {
    return (
      <Section title="Timeline">
        <p className="text-fn-fg-muted text-[13px]">No timeline entries yet.</p>
      </Section>
    );
  }

  return (
    <Section title="Timeline">
      <ol className="flex flex-col gap-4">
        {entries.map((entry, idx) => (
          <li key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="bg-fn-accent-soft text-fn-accent-soft-fg flex h-7 w-7 items-center justify-center rounded-full">
                <span className="bg-fn-accent inline-block h-1.5 w-1.5 rounded-full" aria-hidden />
              </div>
              {idx < entries.length - 1 && <div className="bg-fn-divider mt-1 w-px flex-1" />}
            </div>
            <div className="flex-1 pb-3">
              <div className="text-fn-fg text-[13px] font-medium">{entry.title}</div>
              <div className="text-fn-fg-faint font-tabular text-[11.5px]">
                {formatDateTime(entry.occurredAt)} · {entry.module}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function PlaceholderTab({ title, body }: { title: string; body: string }) {
  return (
    <Section title={title}>
      <div className="rounded-fn-md border-fn-border bg-fn-bg-subtle flex items-start gap-3 border border-dashed p-5">
        <AlertCircle className="text-fn-fg-faint mt-0.5 h-4 w-4" />
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
        'rounded-fn-lg border-fn-border bg-fn-bg-panel shadow-fn-sm border p-6',
        subdued && 'bg-fn-bg-subtle mt-4',
      )}
    >
      <h2 className="text-fn-fg mb-4 text-[14px] font-semibold tracking-tight">{title}</h2>
      {children}
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 md:grid-cols-3">{children}</dl>
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
    <div className="flex flex-col gap-0.5">
      <dt className="text-fn-fg-faint flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
        {icon && !hideIcon && <span className="text-fn-fg-faint">{icon}</span>}
        {label}
      </dt>
      <dd className="text-fn-fg text-[13px]">{value}</dd>
    </div>
  );
}

function ProfileHeaderSkeleton() {
  return (
    <div className="rounded-fn-lg border-fn-border bg-fn-bg-panel shadow-fn-sm border p-6">
      <div className="flex items-start gap-5">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-64" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="rounded-fn-lg border-fn-border bg-fn-bg-panel shadow-fn-sm border p-6">
      <Skeleton className="mb-4 h-4 w-32" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-fn-lg border-fn-danger-soft bg-fn-danger-soft/40 text-fn-danger-soft-fg flex items-center justify-between border px-4 py-3 text-[13px]">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
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

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
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
