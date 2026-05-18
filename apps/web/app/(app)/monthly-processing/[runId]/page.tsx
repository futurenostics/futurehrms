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
  Lock,
  PauseCircle,
  PlayCircle,
  Send,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  CommissionLineItemPublic,
  CommissionRunDetail,
  CommissionRunStatus,
} from '@futurenostics/types';
import { AppShell } from '@/components/shell/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  useAdjustLineItem,
  useCommissionRun,
  useRecalculateCommissionRun,
  useRejectCommissionRun,
  useSubmitCommissionRun,
} from '@/lib/queries/commission-runs';
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
  const canApprove = perms.has('commissions:approve_run');
  const canReject = perms.has('commissions:reject_run');
  const canLock = perms.has('commissions:lock_run');
  const canAdjust = perms.has('commissions:adjust_line_item');
  const canExport = perms.has('commissions:export_run');

  const runQuery = useCommissionRun(runId);
  const run = runQuery.data;

  const [submitOpen, setSubmitOpen] = React.useState(false);
  const [recalcOpen, setRecalcOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  // Approve dialog auto-opens when ?action=approve so the Approvals
  // inbox link can prime the flow.
  const initialAction = searchParams.get('action');
  const [approveOpen, setApproveOpen] = React.useState(initialAction === 'approve');

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
        />

        {/* KPI strip */}
        <KpiStrip run={run} />

        {/* Line items table */}
        <LineItemsTable run={run} canAdjust={canAdjust && run.status === 'draft'} />
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
          <Button variant="secondary" disabled>
            <Lock className="h-fn-4 w-fn-4" /> Lock (Phase 7)
          </Button>
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
  // Group line items by employee for the per-employee subtotal rendering.
  const grouped = React.useMemo(() => {
    const byEmployee = new Map<
      string,
      {
        employee: CommissionLineItemPublic['employee'];
        items: CommissionLineItemPublic[];
        subtotal: number;
      }
    >();
    for (const li of run.lineItems) {
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
  }, [run.lineItems]);

  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel overflow-hidden border">
      <div className="border-fn-divider px-fn-5 py-fn-3_5 gap-fn-2 flex flex-wrap items-center border-b">
        <h2 className="text-fn-fg font-fn-semibold text-[14px]">Line items</h2>
        <Badge tone="default">{run.lineItems.length} rows</Badge>
        <span className="text-fn-fg-faint ml-auto text-[11.5px]">
          Grouped by person · sorted by total share desc
        </span>
      </div>

      {run.lineItems.length === 0 ? (
        <div className="gap-fn-2 py-fn-16 flex flex-col items-center text-center">
          <p className="text-fn-fg font-fn-semibold text-[14px]">No line items</p>
          <p className="text-fn-fg-muted max-w-[420px] text-[12.5px]">
            No projects qualified for this month. Recalculate after the project status changes land,
            or pick a different month.
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
                <Th align="right">Leave adj</Th>
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

  async function toggleHold() {
    try {
      await adjustMutation.mutateAsync({
        lineItemId: lineItem.id,
        data: { isHeld: !lineItem.isHeld },
      });
      toast.success(
        lineItem.isHeld ? 'Item un-held.' : 'Item held — will carry forward to next run.',
      );
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function adjustLeave(value: number) {
    if (Number.isNaN(value)) return;
    try {
      await adjustMutation.mutateAsync({
        lineItemId: lineItem.id,
        data: { leaveAdjustmentUsd: value },
      });
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
          {lineItem.isHeld && (
            <span className="text-fn-warning-soft-fg text-[10.5px]">
              Held — will carry forward to next run
            </span>
          )}
        </div>
      </td>
      <td className="px-fn-4 py-fn-2_5 text-fn-fg-muted text-right tabular-nums">
        {formatUsd(lineItem.baseRevenueUsd)}
      </td>
      <td className="px-fn-4 py-fn-2_5 text-fn-fg font-fn-medium text-right tabular-nums">
        {formatUsd(lineItem.calculatedAmountUsd)}
      </td>
      <td className="px-fn-4 py-fn-2_5 text-fn-fg-faint text-center tabular-nums">
        {lineItem.monthFractionDisplay}
      </td>
      <td className="px-fn-4 py-fn-2_5 text-right">
        {canAdjust ? (
          <Input
            type="number"
            step="0.01"
            defaultValue={lineItem.leaveAdjustmentUsd}
            onBlur={(e) => {
              const next = Number(e.target.value);
              if (Math.abs(next - lineItem.leaveAdjustmentUsd) > 0.001) adjustLeave(next);
            }}
            className="h-fn-7 inline-block w-[80px] text-right tabular-nums"
          />
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
