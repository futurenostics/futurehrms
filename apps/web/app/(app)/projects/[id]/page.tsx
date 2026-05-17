'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  CalendarClock,
  CalendarDays,
  Clock,
  Edit3,
  Plus,
  Settings,
  Trash2,
  UserCircle2,
  Users,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ProjectPublic, ProjectStatus } from '@futurenostics/types';
import { PROJECT_STATUS_TRANSITIONS } from '@futurenostics/types';
import { AppShell } from '@/components/shell/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProjectFormSheet } from '@/components/projects/project-form-sheet';
import {
  useChangeProjectStatus,
  useDeleteProject,
  useProject,
  useProjectCommissionPreview,
  useRemoveProjectAssignment,
} from '@/lib/queries/projects';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

const TAB_KEYS = ['overview', 'roles', 'commissions', 'timeline', 'settings'] as const;
type TabKey = (typeof TAB_KEYS)[number];

function isTabKey(value: string | null): value is TabKey {
  return TAB_KEYS.includes((value ?? '') as TabKey);
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? null;
  const router = useRouter();
  const searchParams = useSearchParams();
  const perms = usePermissions();

  const projectQuery = useProject(id);
  const project = projectQuery.data;
  const previewQuery = useProjectCommissionPreview(id);

  const canEdit = perms.has('projects:update');
  const canDelete = perms.has('projects:delete');
  const canChangeStatus = perms.has('projects:change_status');
  const canAssignRoles = perms.has('projects:assign_roles');

  const requestedTab = searchParams.get('tab');
  const activeTab: TabKey = isTabKey(requestedTab) ? requestedTab : 'overview';

  function setTab(next: TabKey) {
    const search = new URLSearchParams(searchParams);
    search.set('tab', next);
    router.replace(`?${search.toString()}`, { scroll: false });
  }

  const editOpen = searchParams.get('sheet') === 'edit';
  const setEditOpen = React.useCallback(
    (next: boolean) => {
      const search = new URLSearchParams(searchParams);
      if (next) search.set('sheet', 'edit');
      else search.delete('sheet');
      const qs = search.toString();
      router.push(qs ? `?${qs}` : window.location.pathname, { scroll: false });
    },
    [router, searchParams],
  );

  const [changeStatusOpen, setChangeStatusOpen] = React.useState(false);
  const [archiveOpen, setArchiveOpen] = React.useState(false);

  const deleteMutation = useDeleteProject(id ?? '');

  if (projectQuery.isPending) {
    return <DetailSkeleton />;
  }

  if (projectQuery.isError || !project) {
    return (
      <AppShell breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: '—' }]}>
        <div className="gap-fn-3 py-fn-16 flex flex-col items-center text-center">
          <AlertCircle className="text-fn-danger h-fn-8 w-fn-8" />
          <p className="text-fn-fg font-fn-semibold">Project not found</p>
          <p className="text-fn-fg-muted max-w-[400px] text-[13px]">
            The project may have been archived or you don&rsquo;t have access to it.
          </p>
          <Button asChild variant="secondary">
            <Link href="/projects">
              <ArrowLeft className="h-fn-4 w-fn-4" /> Back to projects
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const hue = colorToHue(project.category.color);

  return (
    <AppShell breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: project.name }]}>
      <div className="gap-fn-5 mx-auto flex w-full max-w-[1280px] flex-col">
        {/* Header */}
        <ProjectHeader
          project={project}
          hue={hue}
          canEdit={canEdit}
          canChangeStatus={canChangeStatus}
          canDelete={canDelete}
          onEdit={() => setEditOpen(true)}
          onChangeStatus={() => setChangeStatusOpen(true)}
          onArchive={() => setArchiveOpen(true)}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="roles">
              Role assignments
              <Badge tone="default" className="ml-fn-1">
                {project.assignments.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="commissions">Commission history</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-fn-5">
            <OverviewTab project={project} preview={previewQuery.data ?? null} />
          </TabsContent>

          <TabsContent value="roles" className="mt-fn-5">
            <RoleAssignmentsTab project={project} canEdit={canAssignRoles} hue={hue} />
          </TabsContent>

          <TabsContent value="commissions" className="mt-fn-5">
            <CommissionHistoryTab projectId={project.id} />
          </TabsContent>

          <TabsContent value="timeline" className="mt-fn-5">
            <PlaceholderPanel
              icon={<Clock className="h-fn-5 w-fn-5" />}
              title="Project timeline lands in a follow-up"
              body="Lifecycle events (created, status changed, role assigned/removed, override toggled) are emitted today but the per-project timeline view ships with the next release."
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-fn-5">
            <SettingsTab
              project={project}
              canDelete={canDelete}
              onArchive={() => setArchiveOpen(true)}
            />
          </TabsContent>
        </Tabs>
      </div>

      {editOpen && (
        <ProjectFormSheet mode="edit" projectId={project.id} open onOpenChange={setEditOpen} />
      )}

      <ChangeStatusDialog
        open={changeStatusOpen}
        onOpenChange={setChangeStatusOpen}
        project={project}
      />

      <ArchiveConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        project={project}
        onConfirm={async () => {
          try {
            await deleteMutation.mutateAsync();
            toast.success('Project archived.');
            router.push('/projects');
          } catch (err) {
            toast.error((err as Error).message);
          }
        }}
      />
    </AppShell>
  );
}

/* ───────────────────────── Header ───────────────────────── */

function ProjectHeader({
  project,
  hue,
  canEdit,
  canChangeStatus,
  canDelete,
  onEdit,
  onChangeStatus,
  onArchive,
}: {
  project: ProjectPublic;
  hue: number;
  canEdit: boolean;
  canChangeStatus: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onChangeStatus: () => void;
  onArchive: () => void;
}) {
  return (
    <div className="gap-fn-3 flex flex-wrap items-start justify-between">
      <div className="gap-fn-3 flex min-w-0 flex-1 items-start">
        <span
          aria-hidden
          className="rounded-fn-sm font-fn-semibold mt-fn-1 h-fn-10 w-fn-10 inline-flex shrink-0 items-center justify-center"
          style={{
            background: `oklch(0.92 0.07 ${hue})`,
            color: `oklch(0.38 0.16 ${hue})`,
          }}
        >
          <Briefcase className="h-fn-5 w-fn-5" />
        </span>
        <div className="gap-fn-2 flex min-w-0 flex-col">
          <div className="gap-fn-2 flex flex-wrap items-center">
            <h1
              className="text-fn-fg font-fn-semibold text-[24px]"
              style={{ letterSpacing: '-0.02em' }}
            >
              {project.name}
            </h1>
            <ProjectStatusPill status={project.status} />
            {project.hasOverride && <Badge tone="warning">Override</Badge>}
          </div>
          <div className="text-fn-fg-muted gap-fn-2 flex flex-wrap items-center text-[13px]">
            <span className="gap-fn-1 flex items-center">
              <UserCircle2 className="h-fn-3_5 w-fn-3_5" />
              {project.clientName}
            </span>
            <span aria-hidden className="text-fn-fg-faint">
              ·
            </span>
            <Badge tone="default">{project.category.name}</Badge>
            <span aria-hidden className="text-fn-fg-faint">
              ·
            </span>
            <span>{project.department.name}</span>
            <span aria-hidden className="text-fn-fg-faint">
              ·
            </span>
            <span className="text-fn-fg-faint font-mono text-[11.5px]">
              PRJ-{project.id.slice(-4).toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="gap-fn-2 flex shrink-0 flex-wrap items-center">
        {canChangeStatus && (
          <Button variant="secondary" onClick={onChangeStatus}>
            <CalendarClock className="h-fn-4 w-fn-4" /> Change status
          </Button>
        )}
        {canEdit && (
          <Button variant="secondary" onClick={onEdit}>
            <Edit3 className="h-fn-4 w-fn-4" /> Edit
          </Button>
        )}
        {canDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More actions">
                <Settings className="h-fn-4 w-fn-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onArchive} className="text-fn-danger-soft-fg">
                <Trash2 className="h-fn-3_5 w-fn-3_5" /> Archive project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Overview ───────────────────────── */

function OverviewTab({
  project,
  preview,
}: {
  project: ProjectPublic;
  preview: Awaited<ReturnType<typeof useProjectCommissionPreview>['data']> | null;
}) {
  return (
    <div className="gap-fn-4 grid grid-cols-1 lg:grid-cols-[1fr_360px]">
      <div className="gap-fn-4 flex flex-col">
        {/* Key facts grid */}
        <Card title="Key facts">
          <div className="gap-fn-4 grid grid-cols-2 sm:grid-cols-3">
            <Fact icon={<Wallet className="h-fn-3_5 w-fn-3_5" />} label="Revenue">
              {formatUsd(project.revenueUsd)}
            </Fact>
            <Fact icon={<CalendarDays className="h-fn-3_5 w-fn-3_5" />} label="Start date">
              {formatDate(project.startDate)}
            </Fact>
            <Fact icon={<CalendarClock className="h-fn-3_5 w-fn-3_5" />} label="Expected end">
              {project.expectedCompletionDate
                ? formatDate(project.expectedCompletionDate)
                : 'Single-shot'}
            </Fact>
            <Fact icon={<Briefcase className="h-fn-3_5 w-fn-3_5" />} label="Commission rule">
              v{project.commissionRule.version}
            </Fact>
            <Fact icon={<Wallet className="h-fn-3_5 w-fn-3_5" />} label="Pool">
              {project.commissionRule.poolMode === 'percentage'
                ? `${project.commissionRule.poolValue}% of revenue`
                : formatUsd(project.commissionRule.poolValue)}
            </Fact>
            <Fact icon={<Users className="h-fn-3_5 w-fn-3_5" />} label="Assignments">
              {project.assignments.length}
            </Fact>
          </div>
        </Card>

        {/* Assignments preview */}
        <Card
          title="Role assignments"
          right={<Badge tone="default">{project.assignments.length} active</Badge>}
        >
          {project.assignments.length === 0 ? (
            <p className="text-fn-fg-muted text-[13px]">
              No assignments yet. Use the Role assignments tab to add Winner, Communicator, and
              Eligible team members.
            </p>
          ) : (
            <ul className="gap-fn-2 flex flex-col">
              {project.assignments.map((a) => (
                <li
                  key={a.id}
                  className="border-fn-divider px-fn-3 py-fn-2_5 rounded-fn-xs bg-fn-bg-subtle/40 gap-fn-3 flex items-center border"
                >
                  <span
                    aria-hidden
                    className="rounded-fn-xs bg-fn-icon-tile text-fn-icon-tile-fg font-fn-semibold h-fn-7 w-fn-7 inline-flex items-center justify-center text-[11px]"
                  >
                    {initialsOf(a.employee.fullName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-fn-fg font-fn-medium truncate text-[13px]">
                      {a.employee.fullName}
                    </div>
                    <div className="text-fn-fg-faint truncate text-[11.5px]">
                      {a.employee.designationName ?? '—'} · {a.employee.departmentName ?? '—'}
                    </div>
                  </div>
                  <RoleBadge role={a.roleName} />
                  <span className="text-fn-fg font-fn-semibold text-[13px] tabular-nums">
                    {a.percentage}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {project.notes && (
          <Card title="Notes">
            <p className="text-fn-fg-muted whitespace-pre-wrap text-[13px]">{project.notes}</p>
          </Card>
        )}
      </div>

      {/* Right rail: commission preview */}
      <aside className="gap-fn-4 flex flex-col">
        <CommissionPreviewCard preview={preview} project={project} />
      </aside>
    </div>
  );
}

function CommissionPreviewCard({
  preview,
  project,
}: {
  preview: Awaited<ReturnType<typeof useProjectCommissionPreview>['data']> | null;
  project: ProjectPublic;
}) {
  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel overflow-hidden border">
      <div className="border-fn-divider px-fn-4 py-fn-3 gap-fn-2 flex items-center justify-between border-b">
        <div className="gap-fn-1 font-fn-semibold tracking-fn-uppercase-tight flex items-center text-[11px] uppercase">
          <span className="text-fn-accent-soft-fg">●</span>
          <span className="text-fn-fg-muted">Live commission preview</span>
        </div>
        <Badge tone="info">Rule v{project.commissionRule.version}</Badge>
      </div>
      <div className="px-fn-4 py-fn-4 gap-fn-3 flex flex-col">
        <div className="gap-fn-1 flex flex-col">
          <span className="text-fn-fg-faint tracking-fn-uppercase-tight text-[11px] uppercase">
            Commission pool
          </span>
          <span
            className="text-fn-fg font-fn-semibold leading-fn-unit text-[28px] tabular-nums"
            style={{ letterSpacing: '-0.025em' }}
          >
            {formatUsd(preview?.commissionPoolUsd ?? 0)}
          </span>
          <span className="text-fn-fg-faint text-[11.5px]">
            {preview?.poolValueDisplay ?? '—'} of {formatUsd(project.revenueUsd)}
          </span>
        </div>

        {preview && preview.splits.length > 0 && (
          <div className="gap-fn-2 flex flex-col">
            <span className="text-fn-fg-faint tracking-fn-uppercase-tight text-[11px] uppercase">
              Pool split
            </span>
            <ul className="gap-fn-1_5 flex flex-col">
              {preview.splits.map((s, i) => (
                <li
                  key={`${s.employeeId}-${s.roleName}-${i}`}
                  className="gap-fn-2 flex items-center justify-between text-[12.5px]"
                >
                  <span className="text-fn-fg truncate">{s.employeeName}</span>
                  <RoleBadge role={s.roleName} />
                  <span className="text-fn-fg font-fn-semibold shrink-0 tabular-nums">
                    {formatUsd(s.shareUsd)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-fn-fg-faint border-fn-divider pt-fn-3 leading-fn-normal border-t text-[11px]">
          Preview only — final amounts are computed at month-end using rules active on the
          processing date.
        </p>
      </div>
    </div>
  );
}

/* ───────────────────────── Role assignments tab ───────────────────────── */

function RoleAssignmentsTab({
  project,
  canEdit,
  hue,
}: {
  project: ProjectPublic;
  canEdit: boolean;
  hue: number;
}) {
  const removeMutation = useRemoveProjectAssignment(project.id);
  return (
    <Card
      title="Active assignments"
      right={
        canEdit && (
          <Button asChild variant="secondary" size="sm">
            <Link href={`/projects/${project.id}?sheet=edit`}>
              <Plus className="h-fn-3_5 w-fn-3_5" /> Add or change
            </Link>
          </Button>
        )
      }
    >
      {project.assignments.length === 0 ? (
        <div className="gap-fn-3 py-fn-8 flex flex-col items-center text-center">
          <Users className="text-fn-fg-faint h-fn-8 w-fn-8" />
          <p className="text-fn-fg font-fn-semibold">No one assigned</p>
          <p className="text-fn-fg-muted max-w-[340px] text-[12.5px]">
            Add a Winner, Communicator, and Eligible team members via the Edit sheet so the
            commission engine knows who to pay out.
          </p>
        </div>
      ) : (
        <ul className="gap-fn-2 flex flex-col">
          {project.assignments.map((a) => (
            <li
              key={a.id}
              className="border-fn-divider rounded-fn-xs bg-fn-bg-subtle/40 px-fn-3 py-fn-2_5 gap-fn-3 flex items-center border"
            >
              <span
                aria-hidden
                className="rounded-fn-xs font-fn-semibold h-fn-7 w-fn-7 inline-flex items-center justify-center text-[11px]"
                style={{
                  background: `oklch(0.92 0.07 ${hue})`,
                  color: `oklch(0.38 0.16 ${hue})`,
                }}
              >
                {initialsOf(a.employee.fullName)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-fn-fg font-fn-medium truncate text-[13px]">
                  {a.employee.fullName}
                </div>
                <div className="text-fn-fg-faint truncate text-[11.5px]">
                  {a.employee.designationName ?? '—'} · {a.employee.departmentName ?? '—'}
                </div>
              </div>
              <RoleBadge role={a.roleName} />
              <span className="text-fn-fg font-fn-semibold w-[48px] text-right text-[13px] tabular-nums">
                {a.percentage}%
              </span>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${a.employee.fullName} from ${a.roleName}`}
                  onClick={async () => {
                    if (!confirm(`Remove ${a.employee.fullName} from ${a.roleName}?`)) return;
                    try {
                      await removeMutation.mutateAsync(a.id);
                      toast.success('Assignment removed.');
                    } catch (err) {
                      toast.error((err as Error).message);
                    }
                  }}
                >
                  <Trash2 className="h-fn-3_5 w-fn-3_5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ───────────────────────── Commission history tab ───────────────────────── */

function CommissionHistoryTab({ projectId }: { projectId: string }) {
  // Phase 2 Session 3 stub — pulls run line items for this project from
  // the Commission Run lifecycle endpoints in Session 5+. For now we
  // render a small "coming soon" panel so the tab structure is real.
  return (
    <PlaceholderPanel
      icon={<Wallet className="h-fn-5 w-fn-5" />}
      title="Commission history lands with the monthly run UI"
      body={`Line items for project ${projectId.slice(-4).toUpperCase()} appear here once the monthly processing screen ships in Session 5. The data already flows into the engine — this view just reads it.`}
    />
  );
}

/* ───────────────────────── Settings tab ───────────────────────── */

function SettingsTab({
  project,
  canDelete,
  onArchive,
}: {
  project: ProjectPublic;
  canDelete: boolean;
  onArchive: () => void;
}) {
  return (
    <div className="gap-fn-4 flex flex-col">
      <Card title="Project metadata">
        <ul className="text-fn-fg-muted gap-fn-2 flex flex-col text-[12.5px]">
          <li>
            <span className="text-fn-fg-faint inline-block w-[120px]">Created</span>
            <span className="text-fn-fg">{formatDate(project.createdAt)}</span>
          </li>
          <li>
            <span className="text-fn-fg-faint inline-block w-[120px]">Last updated</span>
            <span className="text-fn-fg">{formatDate(project.updatedAt)}</span>
          </li>
          <li>
            <span className="text-fn-fg-faint inline-block w-[120px]">Category</span>
            <span className="text-fn-fg">{project.category.name}</span>
            <span className="text-fn-fg-faint ml-fn-2 text-[11.5px]">
              (cannot be changed after creation — archive + re-create)
            </span>
          </li>
          <li>
            <span className="text-fn-fg-faint inline-block w-[120px]">Department</span>
            <span className="text-fn-fg">{project.department.name}</span>
          </li>
        </ul>
      </Card>

      {canDelete && (
        <div className="rounded-fn-sm border-fn-danger/40 bg-fn-danger-soft/30 p-fn-4 gap-fn-3 flex flex-col border">
          <div>
            <h3 className="text-fn-fg font-fn-semibold text-[14px]">Danger zone</h3>
            <p className="text-fn-fg-muted mt-fn-1 text-[12.5px]">
              Archiving stops future commission accruals. Past approved runs remain locked and fully
              readable.
            </p>
          </div>
          <div>
            <Button variant="destructive" onClick={onArchive}>
              <Trash2 className="h-fn-4 w-fn-4" /> Archive project
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Change-status dialog ───────────────────────── */

function ChangeStatusDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectPublic;
}) {
  const change = useChangeProjectStatus(project.id);
  const allowed = PROJECT_STATUS_TRANSITIONS[project.status];
  const [next, setNext] = React.useState<ProjectStatus | null>(null);
  const [reason, setReason] = React.useState('');

  React.useEffect(() => {
    if (!open) {
      setNext(null);
      setReason('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change project status</DialogTitle>
          <DialogDescription>
            Current: <strong>{labelFor(project.status)}</strong>. Pick the new status — past
            commission runs are unaffected.
          </DialogDescription>
        </DialogHeader>

        {allowed.length === 0 ? (
          <p className="text-fn-fg-muted py-fn-4 text-[13px]">
            This status is terminal — no further transitions are possible.
          </p>
        ) : (
          <div className="gap-fn-3 py-fn-2 flex flex-col">
            <div className="gap-fn-2 flex flex-wrap">
              {allowed.map((to) => (
                <button
                  key={to}
                  type="button"
                  onClick={() => setNext(to)}
                  className={cn(
                    'rounded-fn-xs px-fn-2_5 py-fn-1_5 font-fn-medium cursor-pointer border text-[12.5px] transition-colors',
                    next === to
                      ? 'border-fn-accent bg-fn-accent-soft text-fn-accent-soft-fg'
                      : 'border-fn-border bg-fn-bg-panel text-fn-fg hover:border-fn-fg-faint',
                  )}
                >
                  → {labelFor(to)}
                </button>
              ))}
            </div>
            <div className="gap-fn-1_5 flex flex-col">
              <label className="text-fn-fg font-fn-medium text-[12.5px]">Reason (optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="border-fn-border-strong rounded-fn-xs px-fn-2_5 py-fn-2 bg-fn-bg-panel text-fn-fg placeholder:text-fn-fg-faint focus-visible:border-fn-accent focus-visible:ring-fn-accent border text-[13px] outline-none focus-visible:ring-1"
                placeholder="Client invoice overdue — placed on hold"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!next || change.isPending}
            onClick={async () => {
              if (!next) return;
              try {
                await change.mutateAsync({ toStatus: next, reason: reason || undefined });
                toast.success(`Status changed to ${labelFor(next)}.`);
                onOpenChange(false);
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Archive confirm ───────────────────────── */

function ArchiveConfirmDialog({
  open,
  onOpenChange,
  project,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectPublic;
  onConfirm: () => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive {project.name}?</DialogTitle>
          <DialogDescription>
            Archiving stops future commission accruals. Past approved runs remain locked. You can
            re-create the project later if needed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            <Trash2 className="h-fn-4 w-fn-4" /> Archive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Shared sub-components ───────────────────────── */

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel overflow-hidden border">
      <div className="border-fn-divider px-fn-4 py-fn-3 gap-fn-2 flex items-center justify-between border-b">
        <h2 className="text-fn-fg font-fn-semibold text-[13.5px]">{title}</h2>
        {right}
      </div>
      <div className="px-fn-4 py-fn-4">{children}</div>
    </div>
  );
}

function Fact({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="gap-fn-1 flex flex-col">
      <span className="text-fn-fg-faint gap-fn-1 tracking-fn-uppercase-tight flex items-center text-[11px] uppercase">
        {icon} {label}
      </span>
      <span className="text-fn-fg font-fn-semibold text-[14px] tabular-nums">{children}</span>
    </div>
  );
}

function PlaceholderPanel({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel py-fn-12 flex flex-col items-center justify-center border text-center">
      <span className="text-fn-fg-faint mb-fn-3">{icon}</span>
      <p className="text-fn-fg font-fn-semibold text-[14px]">{title}</p>
      <p className="text-fn-fg-muted mt-fn-1 max-w-[420px] text-[12.5px]">{body}</p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <AppShell breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: '…' }]}>
      <div className="gap-fn-5 mx-auto flex w-full max-w-[1280px] flex-col">
        <div className="gap-fn-3 flex items-start">
          <Skeleton className="rounded-fn-sm h-fn-10 w-fn-10" />
          <div className="gap-fn-2 flex flex-1 flex-col">
            <Skeleton className="h-fn-6 w-1/3" />
            <Skeleton className="h-fn-4 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-fn-10 w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    </AppShell>
  );
}

/* ───────────────────────── Helpers ───────────────────────── */

const STATUS_TO_TONE: Record<ProjectStatus, React.ComponentProps<typeof Badge>['tone']> = {
  draft: 'default',
  active: 'info',
  in_billing: 'success',
  on_hold: 'warning',
  completed: 'success',
  cancelled: 'danger',
  refunded: 'danger',
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  in_billing: 'In billing',
  on_hold: 'Payment hold',
  completed: 'Complete',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

function labelFor(status: ProjectStatus): string {
  return STATUS_LABELS[status];
}

function ProjectStatusPill({ status }: { status: ProjectStatus }) {
  return (
    <Badge tone={STATUS_TO_TONE[status]} dot>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

const ROLE_LABELS: Record<string, string> = {
  winner: 'Winner',
  communicator: 'Communicator',
  eligible_team: 'Eligible team',
};

const ROLE_TONES: Record<string, React.ComponentProps<typeof Badge>['tone']> = {
  winner: 'accent',
  communicator: 'info',
  eligible_team: 'default',
};

function RoleBadge({ role }: { role: string }) {
  return <Badge tone={ROLE_TONES[role] ?? 'default'}>{ROLE_LABELS[role] ?? role}</Badge>;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

function colorToHue(color: string): number {
  switch (color) {
    case 'violet':
      return 280;
    case 'amber':
      return 65;
    case 'orange':
      return 35;
    case 'red':
      return 22;
    case 'teal':
      return 175;
    case 'slate':
      return 245;
    default: {
      let h = 0;
      for (const c of color) h = (h * 31 + c.charCodeAt(0)) | 0;
      return Math.abs(h) % 360;
    }
  }
}
