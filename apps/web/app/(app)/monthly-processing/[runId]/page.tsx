'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Calculator,
  Check,
  Download,
  FileSpreadsheet,
  Flag,
  Lock,
  PauseCircle,
  PlayCircle,
  Send,
  Trash2,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  CommissionDisputePublic,
  CommissionLeaderboardRow,
  CommissionLineItemPublic,
  CommissionPaymentSource,
  CommissionRollupRow,
  CommissionRunDetail,
  CommissionRunStatus,
} from '@futurenostics/types';
import { AppShell } from '@/components/shell/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ApproveLockDialog } from '@/components/commissions/approve-lock-dialog';
import {
  useAddLineItem,
  useAdjustLineItem,
  useCommissionRun,
  useCommissionRunAnalytics,
  useDisburseCommissionRun,
  useLockCommissionRun,
  useRecalculateCommissionRun,
  useRejectCommissionRun,
  useRemoveLineItem,
  useSendCommissionEmails,
  useSubmitCommissionRun,
} from '@/lib/queries/commission-runs';
import { downloadFile } from '@/lib/api-client';
import { useProjectsList } from '@/lib/queries/projects';
import { useEmployeesList } from '@/lib/queries/employees';
import { useCommissionDisputes, useResolveDispute } from '@/lib/queries/commission-disputes';
import { useApprovals } from '@/lib/queries/approvals';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

/**
 * Commission run detail page — matches PNG 09.
 *
 * Header: breadcrumb (Commissions › Monthly Processing › May 2026),
 * h1 with status pill + processing window + meta strip (last
 * recalculated, FX rate, rule version pinned).
 *
 * Action buttons depend on state:
 *   draft            Recalculate (warning), Submit for approval
 *   pending_approval Reject, Approve & lock
 *   approved         Lock (Phase 7+), Export CSV
 *   locked           Export CSV
 *   rejected         Reopen for editing, Export
 *
 * Below the header: 4-card KPI strip (Total to disburse, Projects in
 * run, Leave-prorated, Carry-forward) + line items DataTable grouped
 * by employee with inline manual/leave adjustments + per-row hold
 * toggle in draft state.
 *
 * The Approve & lock typed-phrase modal is in
 * `components/commissions/approve-lock-dialog.tsx`.
 */
export default function CommissionRunDetailPage() {
  const params = useParams<{ runId: string }>();
  const runId = params?.runId ?? null;
  const searchParams = useSearchParams();
  const perms = usePermissions();

  const canRecalc = perms.has('commissions:create_run');
  const canSubmit = perms.has('commissions:submit_run');
  // Either stage's approver sees the approve button; the dialog + backend
  // gate the actual stage by permission.
  const canApprove =
    perms.has('commissions:approve_run') || perms.has('commissions:final_approve_run');
  const canReject = perms.has('commissions:reject_run');
  const canLock = perms.has('commissions:lock_run');
  const canAdjust = perms.has('commissions:adjust_line_item');
  const canExport = perms.has('commissions:export_run');

  const runQuery = useCommissionRun(runId);
  const run = runQuery.data;

  // Fetch the active approval (if any) to drive multi-stage UI. Scoped
  // to approvals the viewer can act on; harmless no-op otherwise.
  const activeApprovalQuery = useApprovals(
    { type: 'commission-run', status: 'pending', for: 'me' },
    { enabled: run?.status === 'pending_approval' && canApprove },
  );
  const activeApproval = activeApprovalQuery.data?.items.find((a) => a.sourceId === runId);
  const approvalStage =
    activeApproval && activeApproval.stages.length > 1
      ? {
          index: activeApproval.currentStage,
          total: activeApproval.stages.length,
          label: activeApproval.stages[activeApproval.currentStage]?.label ?? 'Approval',
        }
      : null;

  const [submitOpen, setSubmitOpen] = React.useState(false);
  const [recalcOpen, setRecalcOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  // Approve dialog auto-opens when ?action=approve so the Approvals
  // inbox link can prime the flow.
  const initialAction = searchParams.get('action');
  const [approveOpen, setApproveOpen] = React.useState(initialAction === 'approve');

  // Post-approval / post-lock actions (Module 4).
  const lockMut = useLockCommissionRun(runId ?? '');
  const disburseMut = useDisburseCommissionRun(runId ?? '');
  const sendEmailsMut = useSendCommissionEmails(runId ?? '');
  const [payslipBusy, setPayslipBusy] = React.useState(false);

  const handleLock = React.useCallback(() => {
    lockMut.mutate(undefined, {
      onSuccess: () => toast.success('Run locked for disbursement'),
      onError: (e) => toast.error((e as Error).message),
    });
  }, [lockMut]);

  const handleDisburse = React.useCallback(() => {
    disburseMut.mutate(undefined, {
      onSuccess: () => toast.success('Disbursed to payout portals'),
      onError: (e) => toast.error((e as Error).message),
    });
  }, [disburseMut]);

  const handleSendEmails = React.useCallback(() => {
    sendEmailsMut.mutate(undefined, {
      onSuccess: (r) => toast.success(`Payout emails sent to ${r.sent} recipient(s)`),
      onError: (e) => toast.error((e as Error).message),
    });
  }, [sendEmailsMut]);

  const handleDownloadPayslips = React.useCallback(async () => {
    if (!runId) return;
    setPayslipBusy(true);
    try {
      await downloadFile(
        `/api/commission-runs/${runId}/payslips.pdf`,
        `commission-payslips-${run?.monthKey ?? runId}.pdf`,
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPayslipBusy(false);
    }
  }, [runId, run?.monthKey]);

  if (runQuery.isPending) {
    return <RunSkeleton />;
  }
  if (runQuery.isError || !run) {
    return (
      <AppShell
        breadcrumbs={[{ label: 'Monthly Processing', href: '/monthly-processing' }, { label: '—' }]}
      >
        <div className="gap-fn-3 py-fn-16 flex flex-col items-center text-center">
          <AlertCircle className="text-fn-danger h-fn-8 w-fn-8" />
          <p className="text-fn-fg font-fn-semibold">Commission run not found</p>
          <Button asChild variant="secondary">
            <Link href="/monthly-processing">
              <ArrowLeft className="h-fn-4 w-fn-4" /> Back
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Monthly Processing', href: '/monthly-processing' },
        { label: run.monthLabel },
      ]}
    >
      <div className="gap-fn-5 mx-auto flex w-full max-w-[1280px] flex-col">
        {/* Header */}
        <RunHeader
          run={run}
          canRecalc={canRecalc}
          canSubmit={canSubmit}
          canApprove={canApprove}
          canReject={canReject}
          canLock={canLock}
          canExport={canExport}
          onRecalculate={() => setRecalcOpen(true)}
          onSubmit={() => setSubmitOpen(true)}
          onApprove={() => setApproveOpen(true)}
          onReject={() => setRejectOpen(true)}
          onLock={handleLock}
          onDisburse={handleDisburse}
          onSendEmails={handleSendEmails}
          onDownloadPayslips={handleDownloadPayslips}
          locking={lockMut.isPending}
          disbursing={disburseMut.isPending}
          sendingEmails={sendEmailsMut.isPending}
          payslipBusy={payslipBusy}
        />

        {/* KPI strip */}
        <KpiStrip run={run} />

        {/* Insights — leaderboard + rollups */}
        <InsightsSection runId={run.id} />

        {/* Line items table */}
        <LineItemsTable run={run} canAdjust={canAdjust && run.status === 'draft'} />

        {/* Consolidated per-employee draft (spec 6.5) */}
        <ConsolidatedDraft run={run} />

        {/* Disputes raised by employees on this run */}
        <DisputesSection runId={run.id} canManage={perms.has('commissions:manage_disputes')} />
      </div>

      {/* Dialogs */}
      <RecalculateDialog open={recalcOpen} onOpenChange={setRecalcOpen} runId={run.id} />
      <SubmitDialog open={submitOpen} onOpenChange={setSubmitOpen} runId={run.id} />
      <RejectDialog open={rejectOpen} onOpenChange={setRejectOpen} runId={run.id} />
      <ApproveLockDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        run={run}
        recipientCount={run.recipientCount}
        heldProjectsCount={run.carryForwardCount}
        stage={approvalStage}
      />
    </AppShell>
  );
}

/* ───────────────────────── Header ───────────────────────── */

function RunHeader({
  run,
  canRecalc,
  canSubmit,
  canApprove,
  canReject,
  canLock,
  canExport,
  onRecalculate,
  onSubmit,
  onApprove,
  onReject,
  onLock,
  onDisburse,
  onSendEmails,
  onDownloadPayslips,
  locking,
  disbursing,
  sendingEmails,
  payslipBusy,
}: {
  run: CommissionRunDetail;
  canRecalc: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canLock: boolean;
  canExport: boolean;
  onRecalculate: () => void;
  onSubmit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onLock: () => void;
  onDisburse: () => void;
  onSendEmails: () => void;
  onDownloadPayslips: () => void;
  locking: boolean;
  disbursing: boolean;
  sendingEmails: boolean;
  payslipBusy: boolean;
}) {
  return (
    <div className="gap-fn-3 flex flex-wrap items-start justify-between">
      <div className="gap-fn-2 flex min-w-0 flex-1 flex-col">
        <div className="gap-fn-2 flex flex-wrap items-center">
          <h1
            className="text-fn-fg font-fn-semibold text-[24px]"
            style={{ letterSpacing: '-0.02em' }}
          >
            {run.monthLabel} commission run
          </h1>
          <RunStatusPill status={run.status} />
          {run.approverIsSubmitter && run.status === 'approved' && (
            <Badge tone="warning">Self-approved</Badge>
          )}
        </div>
        <p className="text-fn-fg-muted max-w-[640px] text-[13px]">
          Processing window: 01–{lastDayOf(run.monthKey)} {run.monthLabel}. Auto-locked from active
          projects and rules pinned at calc time.
        </p>
        <MetaStrip run={run} />
      </div>
      <div className="gap-fn-2 flex shrink-0 flex-wrap items-center">
        {canExport && (
          <Button asChild variant="ghost" size="md">
            <a href={`/api/commission-runs/${run.id}/export`} target="_blank" rel="noreferrer">
              <FileSpreadsheet className="h-fn-4 w-fn-4" /> Export
            </a>
          </Button>
        )}
        {/* State-dependent primary action */}
        {run.status === 'draft' && (
          <>
            {canRecalc && (
              <Button variant="secondary" onClick={onRecalculate}>
                <Calculator className="h-fn-4 w-fn-4" /> Recalculate
              </Button>
            )}
            {canSubmit && (
              <Button onClick={onSubmit}>
                <Send className="h-fn-4 w-fn-4" /> Submit for approval
              </Button>
            )}
          </>
        )}
        {run.status === 'pending_approval' && (
          <>
            {canReject && (
              <Button variant="secondary" onClick={onReject}>
                <XCircle className="h-fn-4 w-fn-4" /> Reject
              </Button>
            )}
            {canApprove && (
              <Button onClick={onApprove}>
                <Lock className="h-fn-4 w-fn-4" /> Approve &amp; lock
              </Button>
            )}
          </>
        )}
        {run.status === 'approved' && canLock && (
          <Button variant="secondary" onClick={onLock} disabled={locking}>
            <Lock className="h-fn-4 w-fn-4" /> {locking ? 'Locking…' : 'Lock run'}
          </Button>
        )}
        {run.status === 'locked' && (
          <>
            <Button variant="ghost" size="md" onClick={onDownloadPayslips} disabled={payslipBusy}>
              <Download className="h-fn-4 w-fn-4" /> {payslipBusy ? 'Preparing…' : 'Payslips (PDF)'}
            </Button>
            {canLock && (
              <>
                <Button variant="secondary" onClick={onSendEmails} disabled={sendingEmails}>
                  <Send className="h-fn-4 w-fn-4" /> {sendingEmails ? 'Sending…' : 'Send emails'}
                </Button>
                <Button onClick={onDisburse} disabled={disbursing || run.disbursedAt !== null}>
                  <Check className="h-fn-4 w-fn-4" />{' '}
                  {run.disbursedAt
                    ? 'Disbursed'
                    : disbursing
                      ? 'Disbursing…'
                      : 'Disburse to portals'}
                </Button>
              </>
            )}
          </>
        )}
        {run.status === 'rejected' && canRecalc && (
          <Button variant="secondary" onClick={onRecalculate}>
            <PlayCircle className="h-fn-4 w-fn-4" /> Reopen for editing
          </Button>
        )}
      </div>
    </div>
  );
}

function MetaStrip({ run }: { run: CommissionRunDetail }) {
  return (
    <div className="gap-fn-3 mt-fn-1 flex flex-wrap items-center text-[12px]">
      <Meta label="Created">{formatRelative(run.createdAt)}</Meta>
      <Sep />
      <Meta label="FX">1 USD = {run.fxRateUsdToPkr.toFixed(4)} PKR</Meta>
      {run.submittedAt && (
        <>
          <Sep />
          <Meta label="Submitted">{formatRelative(run.submittedAt)}</Meta>
        </>
      )}
      {run.approvedAt && (
        <>
          <Sep />
          <Meta label="Approved">{formatRelative(run.approvedAt)}</Meta>
        </>
      )}
      {run.disbursedAt && (
        <>
          <Sep />
          <Meta label="Disbursed">{formatRelative(run.disbursedAt)}</Meta>
        </>
      )}
      {run.rejectedAt && run.rejectReason && (
        <>
          <Sep />
          <Meta label="Rejected">{run.rejectReason}</Meta>
        </>
      )}
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="text-fn-fg-muted gap-fn-1 inline-flex items-center">
      <span className="text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight text-[10.5px] uppercase">
        {label}
      </span>
      <span>{children}</span>
    </span>
  );
}

function Sep() {
  return (
    <span className="text-fn-fg-faint" aria-hidden>
      ·
    </span>
  );
}

/* ───────────────────────── KPI strip ───────────────────────── */

function KpiStrip({ run }: { run: CommissionRunDetail }) {
  return (
    <div className="gap-fn-4 grid grid-cols-2 md:grid-cols-4">
      <KpiCard
        label="Total to disburse"
        value={formatUsd(run.totalDisbursementUsd)}
        sub={`across ${run.recipientCount} ${run.recipientCount === 1 ? 'recipient' : 'recipients'}`}
        accent
      />
      <KpiCard
        label="Projects in run"
        value={String(run.projectCount)}
        sub={`${run.lineItems.length} line items`}
      />
      <KpiCard
        label="Leave-prorated"
        value={String(run.leaveProratedCount)}
        sub={run.leaveProratedCount === 0 ? 'no adjustments yet' : 'rows with leave adjustments'}
      />
      <KpiCard
        label="Carry-forward"
        value={String(run.carryForwardCount)}
        sub={
          run.carryForwardCount === 0 ? 'no held items rolled in' : 'rows rolled from previous run'
        }
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-fn-sm p-fn-4 gap-fn-2 flex flex-col border',
        accent ? 'border-fn-accent/30 bg-fn-accent-soft/40' : 'border-fn-border bg-fn-bg-panel',
      )}
    >
      <span className="text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight text-[11px] uppercase">
        {label}
      </span>
      <span
        className="text-fn-fg font-fn-semibold leading-fn-unit text-[28px] tabular-nums"
        style={{ letterSpacing: '-0.025em' }}
      >
        {value}
      </span>
      <span className="text-fn-fg-faint text-[11.5px]">{sub}</span>
    </div>
  );
}

/* ───────────────────────── Line items table ───────────────────────── */

function LineItemsTable({ run, canAdjust }: { run: CommissionRunDetail; canAdjust: boolean }) {
  const [addOpen, setAddOpen] = React.useState(false);
  // Category tabs (spec 6.1): External | Upwork | B2B, plus All.
  const [categoryTab, setCategoryTab] = React.useState<CategoryTab>('all');

  const counts = React.useMemo(() => {
    const c: Record<CategoryTab, number> = { all: 0, external: 0, upwork: 0, b2b: 0 };
    for (const li of run.lineItems) {
      c.all += 1;
      c[categoryOf(li.project.category.slug)] += 1;
    }
    return c;
  }, [run.lineItems]);

  const visibleItems = React.useMemo(
    () =>
      categoryTab === 'all'
        ? run.lineItems
        : run.lineItems.filter((li) => categoryOf(li.project.category.slug) === categoryTab),
    [run.lineItems, categoryTab],
  );

  // Group visible line items by employee for the per-employee subtotal.
  const grouped = React.useMemo(() => {
    const byEmployee = new Map<
      string,
      {
        employee: CommissionLineItemPublic['employee'];
        items: CommissionLineItemPublic[];
        subtotal: number;
      }
    >();
    for (const li of visibleItems) {
      const entry = byEmployee.get(li.employeeId) ?? {
        employee: li.employee,
        items: [] as CommissionLineItemPublic[],
        subtotal: 0,
      };
      entry.items.push(li);
      entry.subtotal += li.finalAmountUsd;
      byEmployee.set(li.employeeId, entry);
    }
    return Array.from(byEmployee.values()).sort((a, b) => b.subtotal - a.subtotal);
  }, [visibleItems]);

  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel overflow-hidden border">
      <div className="border-fn-divider px-fn-5 py-fn-3_5 gap-fn-2 flex flex-wrap items-center border-b">
        <h2 className="text-fn-fg font-fn-semibold text-[14px]">Line items</h2>
        <div className="gap-fn-1 flex items-center">
          {(['all', 'external', 'upwork', 'b2b'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setCategoryTab(t)}
              className={cn(
                'rounded-fn-xs px-fn-2_5 py-fn-1 font-fn-medium cursor-pointer border text-[11.5px] transition-colors',
                categoryTab === t
                  ? 'border-fn-accent/30 bg-fn-accent-soft text-fn-accent-soft-fg'
                  : 'border-fn-border bg-fn-bg-panel text-fn-fg-muted hover:border-fn-fg-faint',
              )}
            >
              {CATEGORY_TAB_LABEL[t]} ({counts[t]})
            </button>
          ))}
        </div>
        <span className="text-fn-fg-faint ml-auto text-[11.5px]">
          Grouped by person · sorted by total share desc
        </span>
        {canAdjust && (
          <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-fn-4 w-fn-4" /> Add recipient
          </Button>
        )}
      </div>

      <AddLineItemDialog open={addOpen} onOpenChange={setAddOpen} run={run} />

      {run.lineItems.length === 0 ? (
        <div className="gap-fn-2 py-fn-16 flex flex-col items-center text-center">
          <p className="text-fn-fg font-fn-semibold text-[14px]">No line items</p>
          <p className="text-fn-fg-muted max-w-[420px] text-[12.5px]">
            No projects qualified for this month. Recalculate after the project status changes land,
            {canAdjust ? ' add a recipient manually,' : ''} or pick a different month.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <colgroup>
              <col style={{ width: '24%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '9%' }} />
            </colgroup>
            <thead className="bg-fn-bg-inset text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight text-[10.5px] uppercase">
              <tr>
                <Th align="left">Person / Role</Th>
                <Th align="left">Project</Th>
                <Th align="right">Revenue</Th>
                <Th align="right">Rate</Th>
                <Th align="center">Date</Th>
                <Th align="right">Leave (WD − L)</Th>
                <Th align="right">Hold adj</Th>
                <Th align="right">Final</Th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((group) => (
                <React.Fragment key={group.employee.id}>
                  {group.items.map((li, idx) => (
                    <LineItemRow
                      key={li.id}
                      lineItem={li}
                      isFirstForEmployee={idx === 0}
                      runId={run.id}
                      canAdjust={canAdjust}
                    />
                  ))}
                  <tr className="border-fn-divider border-t">
                    <td
                      colSpan={7}
                      className="px-fn-4 py-fn-2 text-fn-fg-muted text-right text-[11.5px]"
                    >
                      Subtotal — {group.employee.fullName}
                    </td>
                    <td className="px-fn-4 py-fn-2 text-fn-fg font-fn-semibold text-right text-[12.5px] tabular-nums">
                      {formatUsd(group.subtotal)}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
            <tfoot className="border-fn-divider bg-fn-bg-inset border-t">
              <tr>
                <td
                  colSpan={7}
                  className="px-fn-4 py-fn-3 text-fn-fg-muted font-fn-semibold text-right text-[12px]"
                >
                  Run total · {grouped.length} {grouped.length === 1 ? 'recipient' : 'recipients'}
                </td>
                <td className="px-fn-4 py-fn-3 text-fn-fg font-fn-semibold text-right text-[14px] tabular-nums">
                  {formatUsd(run.totalDisbursementUsd)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function LineItemRow({
  lineItem,
  isFirstForEmployee,
  runId,
  canAdjust,
}: {
  lineItem: CommissionLineItemPublic;
  isFirstForEmployee: boolean;
  runId: string;
  canAdjust: boolean;
}) {
  const adjustMutation = useAdjustLineItem(runId);
  const removeMutation = useRemoveLineItem(runId);

  // A manually-added line has no proration math (numerator 0); calc and
  // carry-forward rows always overlap at least one day. Clawback lines
  // also carry a zero fraction, so exclude them from the manual case.
  const isClawback = lineItem.isClawback;
  const isManual = !isClawback && lineItem.monthFractionNumerator === 0;
  const isUpwork = categoryOf(lineItem.project.category.slug) === 'upwork';

  async function remove() {
    try {
      await removeMutation.mutateAsync(lineItem.id);
      toast.success('Recipient removed.');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function toggleHold() {
    // Releasing needs no reason; holding requires one (spec 6.2.2).
    let holdReason: string | undefined;
    if (!lineItem.isHeld) {
      const reason = window.prompt('Reason for holding this project? (required)', '');
      if (reason === null) return; // cancelled
      if (reason.trim() === '') {
        toast.error('A hold reason is required.');
        return;
      }
      holdReason = reason.trim();
    }
    try {
      await adjustMutation.mutateAsync({
        lineItemId: lineItem.id,
        data: { isHeld: !lineItem.isHeld, holdReason },
      });
      toast.success(
        lineItem.isHeld ? 'Item un-held.' : 'Item held — will carry forward to next run.',
      );
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  // Leave-days deduction (External): working days + approved leaves →
  // −calculated × leaves/workingDays, computed server-side.
  async function adjustLeaveDays(patch: { workingDaysInMonth?: number; leaveDays?: number }) {
    try {
      await adjustMutation.mutateAsync({ lineItemId: lineItem.id, data: patch });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  // Upwork processing (spec 6.3): manual period revenue + payout source.
  async function adjustUpwork(patch: {
    periodRevenueUsd?: number;
    paymentSource?: CommissionPaymentSource;
  }) {
    try {
      await adjustMutation.mutateAsync({ lineItemId: lineItem.id, data: patch });
      toast.success('Upwork inputs updated.');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function adjustManual(value: number) {
    if (Number.isNaN(value)) return;
    try {
      await adjustMutation.mutateAsync({
        lineItemId: lineItem.id,
        data: { manualAdjustmentUsd: value },
      });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <tr
      className={cn(
        'border-fn-divider hover:bg-fn-bg-inset/30 border-t transition-colors',
        lineItem.isHeld && 'bg-fn-warning-soft/30 hover:bg-fn-warning-soft/40',
        lineItem.carryForwardFromRunId && 'bg-fn-info-soft/20',
        isClawback && 'bg-fn-danger-soft/20',
      )}
    >
      <td className="px-fn-4 py-fn-2_5">
        {isFirstForEmployee ? (
          <div className="gap-fn-2 flex min-w-0 items-center">
            <span
              aria-hidden
              className="rounded-fn-xs bg-fn-icon-tile text-fn-icon-tile-fg font-fn-semibold h-fn-6 w-fn-6 inline-flex shrink-0 items-center justify-center text-[10.5px]"
            >
              {initialsOf(lineItem.employee.fullName)}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="text-fn-fg font-fn-semibold truncate text-[12.5px]">
                {lineItem.employee.fullName}
              </span>
              <span className="text-fn-fg-faint tracking-fn-uppercase-tight truncate text-[10.5px] uppercase">
                {roleLabel(lineItem.roleName)}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-fn-fg-faint pl-fn-8 tracking-fn-uppercase-tight text-[10.5px] uppercase">
            {roleLabel(lineItem.roleName)}
          </div>
        )}
      </td>
      <td className="px-fn-4 py-fn-2_5">
        <div className="gap-fn-0_5 flex min-w-0 flex-col">
          <span className="text-fn-fg font-fn-medium truncate text-[12.5px]">
            {lineItem.project.name}
          </span>
          {lineItem.carryForwardFromRunId && (
            <Badge tone="info" className="self-start">
              Carry-forward from previous run
            </Badge>
          )}
          {isClawback && (
            <Badge tone="danger" className="self-start">
              Clawback — project refunded
            </Badge>
          )}
          {isManual && (
            <div className="gap-fn-2 flex items-center">
              <Badge tone="accent" className="self-start">
                Manually added
              </Badge>
              {canAdjust && (
                <button
                  type="button"
                  onClick={remove}
                  disabled={removeMutation.isPending}
                  aria-label="Remove recipient"
                  className="text-fn-fg-faint hover:text-fn-danger gap-fn-0_5 inline-flex cursor-pointer items-center text-[10.5px] transition-colors disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-fn-3 w-fn-3" /> Remove
                </button>
              )}
            </div>
          )}
          {lineItem.manualAdjustmentNote && isManual && (
            <span className="text-fn-fg-faint text-[10.5px]">{lineItem.manualAdjustmentNote}</span>
          )}
          {lineItem.isHeld && (
            <span className="text-fn-warning-soft-fg text-[10.5px]">
              Held — will carry forward to next run
            </span>
          )}
        </div>
      </td>
      <td className="px-fn-4 py-fn-2_5 text-right">
        {canAdjust && isUpwork && !isClawback ? (
          <div className="gap-fn-1 flex flex-col items-end">
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="Revenue"
              title="Actual Upwork revenue for the period (USD)"
              defaultValue={lineItem.periodRevenueUsd ?? lineItem.baseRevenueUsd}
              onBlur={(e) => {
                const v = Number(e.target.value);
                const current = lineItem.periodRevenueUsd ?? lineItem.baseRevenueUsd;
                if (!Number.isNaN(v) && v >= 0 && v !== current)
                  adjustUpwork({ periodRevenueUsd: v });
              }}
              className="h-fn-7 w-[92px] text-right tabular-nums"
            />
            <Select
              value={lineItem.paymentSource ?? undefined}
              onValueChange={(s) => adjustUpwork({ paymentSource: s as CommissionPaymentSource })}
            >
              <SelectTrigger variant="compact" className="w-[92px]">
                <SelectValue placeholder="Paid via" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profile">Profile</SelectItem>
                <SelectItem value="mastercard">Mastercard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <span className="text-fn-fg-muted tabular-nums">
            {formatUsd(lineItem.baseRevenueUsd)}
          </span>
        )}
      </td>
      <td className="px-fn-4 py-fn-2_5 text-fn-fg font-fn-medium text-right tabular-nums">
        {formatUsd(lineItem.calculatedAmountUsd)}
      </td>
      <td className="px-fn-4 py-fn-2_5 text-fn-fg-faint text-center tabular-nums">
        {lineItem.monthFractionDisplay}
      </td>
      <td className="px-fn-4 py-fn-2_5 text-right" title={leaveTooltip(lineItem)}>
        {canAdjust ? (
          <div className="gap-fn-1_5 flex items-center justify-end">
            <Input
              type="number"
              min={0}
              placeholder="WD"
              defaultValue={lineItem.workingDaysInMonth ?? ''}
              onBlur={(e) => {
                const wd = Number(e.target.value);
                if (wd > 0 && wd !== lineItem.workingDaysInMonth)
                  adjustLeaveDays({ workingDaysInMonth: wd });
              }}
              className="h-fn-7 w-[54px] text-center tabular-nums"
            />
            <span className="text-fn-fg-faint text-[11px]">−</span>
            <Input
              type="number"
              min={0}
              placeholder="L"
              defaultValue={lineItem.leaveDays ?? ''}
              onBlur={(e) => {
                const ld = Number(e.target.value);
                if (!Number.isNaN(ld) && ld !== lineItem.leaveDays)
                  adjustLeaveDays({ leaveDays: ld });
              }}
              className="h-fn-7 w-[48px] text-center tabular-nums"
            />
            <span
              className={cn(
                'w-[62px] text-[11.5px] tabular-nums',
                lineItem.leaveAdjustmentUsd < 0 ? 'text-fn-danger-soft-fg' : 'text-fn-fg-faint',
              )}
            >
              {lineItem.leaveAdjustmentUsd === 0 ? '—' : formatUsd(lineItem.leaveAdjustmentUsd)}
            </span>
          </div>
        ) : (
          <span
            className={cn(
              'tabular-nums',
              lineItem.leaveAdjustmentUsd < 0 ? 'text-fn-danger-soft-fg' : 'text-fn-fg-muted',
            )}
          >
            {lineItem.leaveAdjustmentUsd === 0 ? '—' : formatUsd(lineItem.leaveAdjustmentUsd)}
          </span>
        )}
      </td>
      <td className="px-fn-4 py-fn-2_5 text-right">
        {canAdjust ? (
          <div className="gap-fn-1 flex items-center justify-end">
            <button
              type="button"
              onClick={toggleHold}
              aria-label={lineItem.isHeld ? 'Release hold' : 'Hold and carry-forward'}
              className={cn(
                'rounded-fn-xs h-fn-7 w-fn-7 inline-flex cursor-pointer items-center justify-center border transition-colors',
                lineItem.isHeld
                  ? 'border-fn-warning bg-fn-warning-soft text-fn-warning-soft-fg'
                  : 'border-fn-border bg-fn-bg-panel text-fn-fg-muted hover:border-fn-fg-faint',
              )}
            >
              <PauseCircle className="h-fn-3_5 w-fn-3_5" />
            </button>
            <Input
              type="number"
              step="0.01"
              defaultValue={lineItem.manualAdjustmentUsd}
              onBlur={(e) => {
                const next = Number(e.target.value);
                if (Math.abs(next - lineItem.manualAdjustmentUsd) > 0.001) adjustManual(next);
              }}
              className="h-fn-7 inline-block w-[80px] text-right tabular-nums"
            />
          </div>
        ) : (
          <span className="text-fn-fg-muted tabular-nums">
            {lineItem.manualAdjustmentUsd === 0 ? '—' : formatUsd(lineItem.manualAdjustmentUsd)}
          </span>
        )}
      </td>
      <td className="px-fn-4 py-fn-2_5 text-fn-fg font-fn-semibold text-right text-[13px] tabular-nums">
        {formatUsd(lineItem.finalAmountUsd)}
      </td>
    </tr>
  );
}

function Th({
  align,
  children,
}: {
  align: 'left' | 'right' | 'center';
  children: React.ReactNode;
}) {
  return (
    <th
      className={cn(
        'px-fn-4 py-fn-2_5',
        align === 'left' && 'text-left',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
      )}
    >
      {children}
    </th>
  );
}

/* ───────────────────────── Sub-dialogs ───────────────────────── */

function RecalculateDialog({
  open,
  onOpenChange,
  runId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: string;
}) {
  const recalc = useRecalculateCommissionRun(runId);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recalculate run?</DialogTitle>
          <DialogDescription>
            Re-running the calc engine wipes every line item — including any manual leave or
            adjustment entries you&rsquo;ve typed in. Project assignments, percentages, and FX rate
            are pulled fresh.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={recalc.isPending}
            onClick={async () => {
              try {
                await recalc.mutateAsync();
                toast.success('Run recalculated.');
                onOpenChange(false);
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          >
            <Calculator className="h-fn-4 w-fn-4" /> Recalculate anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubmitDialog({
  open,
  onOpenChange,
  runId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: string;
}) {
  const submit = useSubmitCommissionRun(runId);
  const [notes, setNotes] = React.useState('');
  React.useEffect(() => {
    if (!open) setNotes('');
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit run for approval?</DialogTitle>
          <DialogDescription>
            The run flips to <strong>pending_approval</strong>. Finance can then approve & lock or
            reject it back to draft.
          </DialogDescription>
        </DialogHeader>
        <div className="gap-fn-1_5 py-fn-2 flex flex-col">
          <label className="text-fn-fg font-fn-medium text-[12.5px]">
            Notes for approver (optional)
          </label>
          <Textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything Finance should know before approving?"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={submit.isPending}
            onClick={async () => {
              try {
                await submit.mutateAsync({ notes: notes || undefined });
                toast.success('Submitted for approval.');
                onOpenChange(false);
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          >
            <Send className="h-fn-4 w-fn-4" /> Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({
  open,
  onOpenChange,
  runId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: string;
}) {
  const reject = useRejectCommissionRun(runId);
  const [reason, setReason] = React.useState('');
  React.useEffect(() => {
    if (!open) setReason('');
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject run back to draft?</DialogTitle>
          <DialogDescription>
            The run flips to <strong>rejected</strong>. The next pass picks it back up at the draft
            stage with your reason visible.
          </DialogDescription>
        </DialogHeader>
        <div className="gap-fn-1_5 py-fn-2 flex flex-col">
          <label className="text-fn-fg font-fn-medium text-[12.5px]">
            Reason <span className="text-fn-danger">*</span>
          </label>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is the run being sent back?"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={reject.isPending || reason.trim().length === 0}
            onClick={async () => {
              try {
                await reject.mutateAsync({ reason: reason.trim() });
                toast.success('Run rejected.');
                onOpenChange(false);
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          >
            <XCircle className="h-fn-4 w-fn-4" /> Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddLineItemDialog({
  open,
  onOpenChange,
  run,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: CommissionRunDetail;
}) {
  const add = useAddLineItem(run.id);
  const projectsQuery = useProjectsList({ limit: 500 });
  const employeesQuery = useEmployeesList({ limit: 500 });

  const [projectId, setProjectId] = React.useState('');
  const [employeeId, setEmployeeId] = React.useState('');
  const [roleName, setRoleName] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    if (!open) {
      setProjectId('');
      setEmployeeId('');
      setRoleName('');
      setAmount('');
      setNote('');
    }
  }, [open]);

  const projectOptions = React.useMemo(
    () =>
      (projectsQuery.data?.items ?? []).map((p) => ({
        value: p.id,
        label: p.name,
        description: p.clientName,
      })),
    [projectsQuery.data],
  );
  const employeeOptions = React.useMemo(
    () =>
      (employeesQuery.data?.items ?? []).map((e) => ({
        value: e.id,
        label: e.fullName,
        description: e.eid,
      })),
    [employeesQuery.data],
  );

  const amountNum = Number(amount);
  const amountValid = amount.trim() !== '' && Number.isFinite(amountNum) && amountNum !== 0;
  const canSave = Boolean(projectId && employeeId && roleName.trim() && amountValid && note.trim());

  async function save() {
    if (!canSave) return;
    try {
      await add.mutateAsync({
        projectId,
        employeeId,
        roleName: roleName.trim(),
        amountUsd: amountNum,
        note: note.trim(),
      });
      toast.success('Recipient added.');
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a recipient</DialogTitle>
          <DialogDescription>
            Manually credit someone the calc engine didn&rsquo;t generate. The full amount is
            recorded as a manual adjustment with a required reason. A recalculate will remove it.
          </DialogDescription>
        </DialogHeader>
        <div className="gap-fn-3 py-fn-2 flex flex-col">
          <div className="gap-fn-1_5 flex flex-col">
            <label className="text-fn-fg font-fn-medium text-[12.5px]">Project</label>
            <Combobox
              options={projectOptions}
              value={projectId}
              onValueChange={setProjectId}
              loading={projectsQuery.isPending}
              placeholder="Pick a project"
              emptyLabel="projects"
            />
          </div>
          <div className="gap-fn-1_5 flex flex-col">
            <label className="text-fn-fg font-fn-medium text-[12.5px]">Employee</label>
            <Combobox
              options={employeeOptions}
              value={employeeId}
              onValueChange={setEmployeeId}
              loading={employeesQuery.isPending}
              placeholder="Pick an employee"
              emptyLabel="employees"
            />
          </div>
          <div className="gap-fn-3 grid grid-cols-2">
            <div className="gap-fn-1_5 flex flex-col">
              <label className="text-fn-fg font-fn-medium text-[12.5px]">Role</label>
              <Input
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g. winner"
                maxLength={40}
              />
            </div>
            <div className="gap-fn-1_5 flex flex-col">
              <label className="text-fn-fg font-fn-medium text-[12.5px]">Amount (USD)</label>
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="text-right tabular-nums"
              />
            </div>
          </div>
          <div className="gap-fn-1_5 flex flex-col">
            <label className="text-fn-fg font-fn-medium text-[12.5px]">
              Reason <span className="text-fn-danger">*</span>
            </label>
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why is this recipient being added manually?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!canSave || add.isPending} onClick={save}>
            <UserPlus className="h-fn-4 w-fn-4" /> Add recipient
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Insights ───────────────────────── */

function InsightsSection({ runId }: { runId: string }) {
  const query = useCommissionRunAnalytics(runId, 10);
  const data = query.data;

  if (query.isPending) {
    return <Skeleton className="h-[280px] w-full" />;
  }
  // Nothing to chart when the run has no line items.
  if (!data || data.totalUsd === 0) return null;

  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel overflow-hidden border">
      <div className="border-fn-divider px-fn-5 py-fn-3_5 gap-fn-2 flex flex-wrap items-center border-b">
        <h2 className="text-fn-fg font-fn-semibold text-[14px]">Insights</h2>
        <span className="text-fn-fg-faint ml-auto text-[11.5px]">
          {formatUsd(data.totalUsd)} across {data.recipientCount}{' '}
          {data.recipientCount === 1 ? 'recipient' : 'recipients'} · {data.projectCount} projects
        </span>
      </div>
      <div className="gap-fn-5 p-fn-5 grid grid-cols-1 lg:grid-cols-2">
        {/* Leaderboard */}
        <div className="gap-fn-3 flex flex-col">
          <h3 className="text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight text-[10.5px] uppercase">
            Top earners
          </h3>
          <div className="gap-fn-2 flex flex-col">
            {data.topEarners.map((row, idx) => (
              <LeaderboardRow key={row.employeeId} rank={idx + 1} row={row} />
            ))}
          </div>
        </div>

        {/* Rollups */}
        <div className="gap-fn-4 flex flex-col">
          <RollupList title="By department" rows={data.byDepartment} />
          <RollupList title="By category" rows={data.byCategory} />
          <RollupList title="By role" rows={data.byRole} />
        </div>
      </div>
    </div>
  );
}

function LeaderboardRow({ rank, row }: { rank: number; row: CommissionLeaderboardRow }) {
  return (
    <div className="gap-fn-2_5 flex items-center">
      <span className="text-fn-fg-faint font-fn-semibold w-fn-4 shrink-0 text-right text-[11px] tabular-nums">
        {rank}
      </span>
      <span
        aria-hidden
        className="rounded-fn-xs bg-fn-icon-tile text-fn-icon-tile-fg font-fn-semibold h-fn-6 w-fn-6 inline-flex shrink-0 items-center justify-center text-[10.5px]"
      >
        {initialsOf(row.fullName)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-fn-fg font-fn-medium truncate text-[12.5px]">{row.fullName}</div>
        <div className="text-fn-fg-faint truncate text-[10.5px]">
          {row.departmentName ?? 'Unassigned'}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <span className="text-fn-fg font-fn-semibold text-[12.5px] tabular-nums">
          {formatUsd(row.totalUsd)}
        </span>
        <span className="text-fn-fg-faint text-[10.5px] tabular-nums">
          {Math.round(row.shareOfRun * 100)}% of run
        </span>
      </div>
    </div>
  );
}

function RollupList({ title, rows }: { title: string; rows: CommissionRollupRow[] }) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.totalUsd), 1);
  return (
    <div className="gap-fn-2 flex flex-col">
      <h3 className="text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight text-[10.5px] uppercase">
        {title}
      </h3>
      <div className="gap-fn-2 flex flex-col">
        {rows.map((r) => (
          <div key={r.key} className="gap-fn-1 flex flex-col">
            <div className="gap-fn-2 flex items-center justify-between">
              <div className="gap-fn-1_5 flex min-w-0 items-center">
                {r.color && (
                  <span
                    aria-hidden
                    className="rounded-fn-full h-fn-2 w-fn-2 shrink-0"
                    style={{ backgroundColor: r.color }}
                  />
                )}
                <span className="text-fn-fg truncate text-[12px]">{r.label}</span>
                <span className="text-fn-fg-faint shrink-0 text-[10.5px]">
                  · {r.recipientCount}
                </span>
              </div>
              <span className="text-fn-fg font-fn-medium shrink-0 text-[12px] tabular-nums">
                {formatUsd(r.totalUsd)}
              </span>
            </div>
            <div className="bg-fn-bg-inset rounded-fn-full h-fn-1_5 w-full overflow-hidden">
              <div
                className="bg-fn-accent rounded-fn-full h-full"
                style={{ width: `${(r.totalUsd / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Disputes ───────────────────────── */

function DisputesSection({ runId, canManage }: { runId: string; canManage: boolean }) {
  const query = useCommissionDisputes({ runId });
  const [resolving, setResolving] = React.useState<CommissionDisputePublic | null>(null);
  const disputes = query.data?.items ?? [];

  // Nothing to show if the run has no disputes at all.
  if (!query.isPending && disputes.length === 0) return null;

  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel overflow-hidden border">
      <div className="border-fn-divider px-fn-5 py-fn-3_5 gap-fn-2 flex flex-wrap items-center border-b">
        <Flag className="text-fn-fg-muted h-fn-4 w-fn-4" />
        <h2 className="text-fn-fg font-fn-semibold text-[14px]">Disputes</h2>
        {query.data && query.data.openCount > 0 && (
          <Badge tone="warning">{query.data.openCount} open</Badge>
        )}
        <span className="text-fn-fg-faint ml-auto text-[11.5px]">
          Raised by employees on this run
        </span>
      </div>
      {query.isPending ? (
        <div className="p-fn-5">
          <Skeleton className="h-[80px] w-full" />
        </div>
      ) : (
        <ul className="divide-fn-divider divide-y">
          {disputes.map((d) => (
            <li key={d.id} className="px-fn-5 py-fn-3 gap-fn-3 flex items-start">
              <div className="min-w-0 flex-1">
                <div className="gap-fn-2 flex flex-wrap items-center">
                  <span className="text-fn-fg font-fn-semibold text-[12.5px]">
                    {d.employee?.fullName ?? 'Employee'}
                  </span>
                  <span className="text-fn-fg-faint text-[11.5px]">
                    {d.projectName ?? '—'}
                    {d.roleName ? ` · ${roleLabel(d.roleName)}` : ''}
                    {d.disputedAmountUsd !== null ? ` · ${formatUsd(d.disputedAmountUsd)}` : ''}
                  </span>
                  <Badge tone={DISPUTE_TONES[d.status]} dot>
                    {DISPUTE_LABELS[d.status]}
                  </Badge>
                </div>
                <p className="text-fn-fg-muted mt-fn-1 text-[12px]">{d.reason}</p>
                {d.resolutionNote && (
                  <p className="text-fn-fg-faint mt-fn-0_5 text-[11px]">HR: {d.resolutionNote}</p>
                )}
              </div>
              {canManage && d.status === 'open' && (
                <Button variant="secondary" size="sm" onClick={() => setResolving(d)}>
                  Review
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <ResolveDisputeDialog
        dispute={resolving}
        onOpenChange={(open) => !open && setResolving(null)}
      />
    </div>
  );
}

function ResolveDisputeDialog({
  dispute,
  onOpenChange,
}: {
  dispute: CommissionDisputePublic | null;
  onOpenChange: (open: boolean) => void;
}) {
  const resolve = useResolveDispute();
  const [note, setNote] = React.useState('');
  React.useEffect(() => {
    if (dispute) setNote('');
  }, [dispute]);

  async function submit(status: 'resolved' | 'rejected') {
    if (!dispute) return;
    try {
      await resolve.mutateAsync({
        id: dispute.id,
        data: { status, resolutionNote: note.trim() || undefined },
      });
      toast.success(status === 'resolved' ? 'Dispute resolved.' : 'Dispute declined.');
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={Boolean(dispute)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review dispute</DialogTitle>
          <DialogDescription>
            {dispute?.employee?.fullName ?? 'The employee'} flagged{' '}
            {dispute?.projectName ?? 'a line item'}. Resolving or declining records your note — it
            doesn&rsquo;t change the amount. Adjust the line item separately if a fix is needed.
          </DialogDescription>
        </DialogHeader>
        {dispute && (
          <p className="text-fn-fg-muted bg-fn-bg-inset rounded-fn-xs px-fn-3 py-fn-2 text-[12px]">
            &ldquo;{dispute.reason}&rdquo;
          </p>
        )}
        <div className="gap-fn-1_5 py-fn-2 flex flex-col">
          <label className="text-fn-fg font-fn-medium text-[12.5px]">
            Resolution note (optional)
          </label>
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What did you find? What action (if any) was taken?"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={resolve.isPending}
            onClick={() => submit('rejected')}
          >
            <XCircle className="h-fn-4 w-fn-4" /> Decline
          </Button>
          <Button disabled={resolve.isPending} onClick={() => submit('resolved')}>
            <Check className="h-fn-4 w-fn-4" /> Resolve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const DISPUTE_TONES: Record<string, React.ComponentProps<typeof Badge>['tone']> = {
  open: 'warning',
  resolved: 'success',
  rejected: 'danger',
};
const DISPUTE_LABELS: Record<string, string> = {
  open: 'Open',
  resolved: 'Resolved',
  rejected: 'Declined',
};

/* ───────────────────────── Skeleton / helpers ───────────────────────── */

function RunSkeleton() {
  return (
    <AppShell
      breadcrumbs={[{ label: 'Monthly Processing', href: '/monthly-processing' }, { label: '…' }]}
    >
      <div className="gap-fn-5 mx-auto flex w-full max-w-[1280px] flex-col">
        <div className="gap-fn-2 flex flex-col">
          <Skeleton className="h-fn-6 w-1/3" />
          <Skeleton className="h-fn-3 w-1/2" />
        </div>
        <div className="gap-fn-4 grid grid-cols-1 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[120px] w-full" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    </AppShell>
  );
}

const RUN_STATUS_TONES: Record<CommissionRunStatus, React.ComponentProps<typeof Badge>['tone']> = {
  draft: 'default',
  pending_approval: 'warning',
  approved: 'success',
  locked: 'info',
  rejected: 'danger',
};
const RUN_STATUS_LABEL: Record<CommissionRunStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  locked: 'Locked',
  rejected: 'Rejected',
};
function RunStatusPill({ status }: { status: CommissionRunStatus }) {
  return (
    <Badge tone={RUN_STATUS_TONES[status]} dot>
      {RUN_STATUS_LABEL[status]}
    </Badge>
  );
}

const ROLE_LABELS: Record<string, string> = {
  winner: 'Winner',
  communicator: 'Communicator',
  eligible_team: 'Eligible team',
};
function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role.replace(/_/g, ' ');
}

/* ───────────────────────── Consolidated draft ───────────────────────── */

function ConsolidatedDraft({ run }: { run: CommissionRunDetail }) {
  // Salary is looked up from the employees list (gated by view_salary);
  // shown as a reference column only — NOT added to the commission total.
  const employeesQuery = useEmployeesList({ limit: 500 });
  const salaryByEmployee = React.useMemo(() => {
    const m = new Map<string, number | null>();
    for (const e of employeesQuery.data?.items ?? []) m.set(e.id, e.salaryPkr ?? null);
    return m;
  }, [employeesQuery.data]);

  const fx = run.fxRateUsdToPkr;
  const rows = React.useMemo(() => {
    const byEmp = new Map<
      string,
      {
        employee: CommissionLineItemPublic['employee'];
        external: number;
        commAllow: number;
        tlReward: number;
        upwork: number;
        total: number;
      }
    >();
    for (const li of run.lineItems) {
      const e = byEmp.get(li.employeeId) ?? {
        employee: li.employee,
        external: 0,
        commAllow: 0,
        tlReward: 0,
        upwork: 0,
        total: 0,
      };
      const amt = li.finalAmountUsd;
      if (categoryOf(li.project.category.slug) === 'upwork') e.upwork += amt;
      else if (li.roleName === 'communicator') e.commAllow += amt;
      else if (li.roleName === 'team_lead') e.tlReward += amt;
      else e.external += amt;
      e.total += amt;
      byEmp.set(li.employeeId, e);
    }
    return Array.from(byEmp.values()).sort((a, b) => b.total - a.total);
  }, [run.lineItems]);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel overflow-hidden border">
      <div className="border-fn-divider px-fn-5 py-fn-3_5 gap-fn-2 flex flex-wrap items-center border-b">
        <h2 className="text-fn-fg font-fn-semibold text-[14px]">Consolidated draft</h2>
        <Badge tone="default">{rows.length} employees</Badge>
        <span className="text-fn-fg-faint ml-auto text-[11.5px]">
          Commission payout in USD · salary + PKR shown for reference only
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-fn-divider text-fn-fg-faint border-b text-left">
              <Th align="left">#</Th>
              <Th align="left">Employee</Th>
              <Th align="right">External</Th>
              <Th align="right">Comm allow.</Th>
              <Th align="right">TL reward</Th>
              <Th align="right">Upwork</Th>
              <Th align="right">Commission total</Th>
              <Th align="right">Salary (ref)</Th>
              <Th align="right">Approx PKR</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const salaryUsd = (salaryByEmployee.get(r.employee.id) ?? null) as number | null;
              return (
                <tr key={r.employee.id} className="border-fn-divider border-t">
                  <td className="px-fn-4 py-fn-2_5 text-fn-fg-faint tabular-nums">{i + 1}</td>
                  <td className="px-fn-4 py-fn-2_5">
                    <div className="flex flex-col">
                      <span className="text-fn-fg font-fn-medium">{r.employee.fullName}</span>
                      <span className="text-fn-fg-faint font-mono text-[10.5px]">
                        {r.employee.eid}
                      </span>
                    </div>
                  </td>
                  <td className="px-fn-4 py-fn-2_5 text-fn-fg-muted text-right tabular-nums">
                    {money(r.external)}
                  </td>
                  <td className="px-fn-4 py-fn-2_5 text-fn-fg-muted text-right tabular-nums">
                    {money(r.commAllow)}
                  </td>
                  <td className="px-fn-4 py-fn-2_5 text-fn-fg-muted text-right tabular-nums">
                    {money(r.tlReward)}
                  </td>
                  <td className="px-fn-4 py-fn-2_5 text-fn-fg-muted text-right tabular-nums">
                    {money(r.upwork)}
                  </td>
                  <td className="px-fn-4 py-fn-2_5 text-fn-fg font-fn-semibold text-right tabular-nums">
                    {formatUsd(r.total)}
                  </td>
                  <td className="px-fn-4 py-fn-2_5 text-fn-fg-faint text-right tabular-nums">
                    {salaryUsd != null ? money(salaryUsd) : '—'}
                  </td>
                  <td className="px-fn-4 py-fn-2_5 text-fn-fg-faint text-right tabular-nums">
                    ~{formatPkr(r.total * fx)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Compact USD (no cents-forcing) for dense consolidated cells; '—' for zero. */
function money(v: number): string {
  return v === 0 ? '—' : formatUsd(v);
}

function formatPkr(v: number): string {
  return `PKR ${Math.round(v).toLocaleString('en-PK')}`;
}

type CategoryTab = 'all' | 'external' | 'upwork' | 'b2b';

const CATEGORY_TAB_LABEL: Record<CategoryTab, string> = {
  all: 'All',
  external: 'External',
  upwork: 'Upwork',
  b2b: 'B2B',
};

/** Map a project category slug to its top-level processing tab. */
function categoryOf(slug: string): Exclude<CategoryTab, 'all'> {
  if (slug === 'b2b') return 'b2b';
  if (slug === 'upwork' || slug.startsWith('upwork-')) return 'upwork';
  return 'external';
}

/** Formula tooltip for the leave-days deduction column. */
function leaveTooltip(li: CommissionLineItemPublic): string {
  if (!li.workingDaysInMonth) {
    return 'Enter working days (WD) and approved leaves (L) to pro-rate: final = base × (WD − L) / WD';
  }
  const wd = li.workingDaysInMonth;
  const ld = li.leaveDays ?? 0;
  const eff = wd - ld;
  const daily = li.calculatedAmountUsd / wd;
  return `Base ${formatUsd(li.calculatedAmountUsd)} ÷ ${wd} WD = ${formatUsd(daily)}/day × ${eff} effective days (${wd} − ${ld}) = ${formatUsd(daily * eff)}`;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

function lastDayOf(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return '?';
  const d = new Date(Date.UTC(year, month, 0));
  return String(d.getUTCDate()).padStart(2, '0');
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diff = (now - date.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

void Check;
void Download;
