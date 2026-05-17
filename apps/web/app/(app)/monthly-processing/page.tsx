'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Calculator, Plus, ShieldCheck, Wallet } from 'lucide-react';
import type { CommissionRunStatus, CommissionRunSummary } from '@futurenostics/types';
import { AppShell } from '@/components/shell/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DataTable,
  type DataTableColumn,
  type DataTableRowAction,
} from '@/components/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCommissionRunsList, useCreateCommissionRun } from '@/lib/queries/commission-runs';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

/**
 * Monthly Processing list page.
 *
 * Not explicitly in the design PNGs (PNG 09 shows a single run's
 * detail) — extrapolated from the Phase 2 spec which requires a
 * list view that surfaces every run, its status, and the totals.
 *
 * Header: page title + Create new run CTA. KPI strip: latest run
 * disbursement / YTD disbursed / Approved this year count. Table
 * has Month / Status / Total USD / Projects / Recipients / Created /
 * Approved by columns. Click row → /monthly-processing/[runId]
 * (detail page lands in Session 5).
 */
export default function MonthlyProcessingListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const perms = usePermissions();

  const canCreate = perms.has('commissions:create_run');

  const listQuery = useCommissionRunsList({ limit: 200 });
  const items = listQuery.data?.items ?? [];

  const [createOpen, setCreateOpen] = React.useState(searchParams.get('action') === 'create');
  React.useEffect(() => {
    setCreateOpen(searchParams.get('action') === 'create');
  }, [searchParams]);

  function openCreate() {
    const params = new URLSearchParams(searchParams.toString());
    params.set('action', 'create');
    router.push(`/monthly-processing?${params.toString()}`);
  }
  function closeCreate() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('action');
    const qs = params.toString();
    router.push(qs ? `/monthly-processing?${qs}` : '/monthly-processing');
  }

  /* ---------- KPIs ---------- */
  const kpis = React.useMemo(() => {
    const latest = items[0] ?? null;
    const ytdYear = new Date().getUTCFullYear();
    const approvedYtd = items.filter(
      (r) =>
        (r.status === 'approved' || r.status === 'locked') &&
        r.monthKey.startsWith(String(ytdYear)),
    );
    const totalYtd = approvedYtd.reduce((s, r) => s + r.totalDisbursementUsd, 0);
    const pending = items.filter((r) => r.status === 'pending_approval').length;
    return {
      latest,
      totalYtd,
      approvedCount: approvedYtd.length,
      pendingCount: pending,
    };
  }, [items]);

  /* ---------- Columns ---------- */
  const columns = React.useMemo<DataTableColumn<CommissionRunSummary>[]>(
    () => [
      {
        id: 'month',
        header: 'Month',
        cell: (row) => (
          <div className="gap-fn-0_5 flex min-w-0 flex-col">
            <span className="text-fn-fg font-fn-semibold text-[13.5px]">{row.monthLabel}</span>
            <span className="text-fn-fg-faint font-mono text-[11px]">{row.monthKey}</span>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        width: 150,
        cell: (row) => <RunStatusPill status={row.status} />,
      },
      {
        id: 'total',
        header: 'Total disbursement',
        width: 180,
        align: 'right',
        cell: (row) => (
          <span className="text-fn-fg font-fn-semibold text-[13.5px] tabular-nums">
            {formatUsd(row.totalDisbursementUsd)}
          </span>
        ),
      },
      {
        id: 'projects',
        header: 'Projects',
        width: 80,
        align: 'right',
        cell: (row) => (
          <span className="text-fn-fg-muted text-[13px] tabular-nums">{row.projectCount}</span>
        ),
      },
      {
        id: 'recipients',
        header: 'Recipients',
        width: 100,
        align: 'right',
        cell: (row) => (
          <span className="text-fn-fg-muted text-[13px] tabular-nums">{row.recipientCount}</span>
        ),
      },
      {
        id: 'created',
        header: 'Created',
        width: 130,
        cell: (row) => (
          <span className="text-fn-fg-muted text-[12.5px] tabular-nums">
            {formatDate(row.createdAt)}
          </span>
        ),
      },
      {
        id: 'approved',
        header: 'Approved',
        width: 130,
        cell: (row) =>
          row.approvedAt ? (
            <span className="gap-fn-1 text-fn-fg-muted flex items-center text-[12.5px]">
              <span className="tabular-nums">{formatDate(row.approvedAt)}</span>
              {row.approverIsSubmitter && (
                <Badge tone="warning" className="text-[10px]">
                  Self-approved
                </Badge>
              )}
            </span>
          ) : (
            <span className="text-fn-fg-faint text-[12.5px]">—</span>
          ),
      },
    ],
    [],
  );

  const rowActions = React.useCallback(
    (row: CommissionRunSummary): DataTableRowAction[] => [
      { label: 'Open run', onClick: () => router.push(`/monthly-processing/${row.id}`) },
    ],
    [router],
  );

  return (
    <AppShell breadcrumbs={[{ label: 'Monthly Processing' }]}>
      <div className="gap-fn-5 flex h-full flex-col">
        {/* Header */}
        <div className="gap-fn-3 flex shrink-0 flex-wrap items-end justify-between">
          <div className="gap-fn-1_5 flex flex-col">
            <h1
              className="text-fn-fg font-fn-semibold text-[24px]"
              style={{ letterSpacing: '-0.02em' }}
            >
              Monthly processing
            </h1>
            <p className="text-fn-fg-muted max-w-[640px] text-[14px]">
              Each month aggregates commissions from every active project. Draft → submit → approve.
              Approved runs are locked and feed Payroll downstream.
            </p>
          </div>
          {canCreate && (
            <Button size="md" onClick={openCreate}>
              <Plus className="h-fn-4 w-fn-4" /> Draft this month
            </Button>
          )}
        </div>

        {/* KPI strip */}
        <div className="gap-fn-4 grid grid-cols-1 md:grid-cols-3">
          <KpiCard
            tone="accent"
            icon={<Wallet className="h-fn-4 w-fn-4" />}
            label="Latest run"
            value={kpis.latest ? formatUsd(kpis.latest.totalDisbursementUsd) : '—'}
            sub={
              kpis.latest
                ? `${kpis.latest.monthLabel} · ${RUN_STATUS_LABEL[kpis.latest.status]}`
                : 'No runs yet'
            }
          />
          <KpiCard
            tone="success"
            icon={<ShieldCheck className="h-fn-4 w-fn-4" />}
            label={`Approved YTD ${new Date().getUTCFullYear()}`}
            value={formatUsd(kpis.totalYtd)}
            sub={`${kpis.approvedCount} approved ${kpis.approvedCount === 1 ? 'run' : 'runs'} so far`}
          />
          <KpiCard
            tone="warning"
            icon={<Calculator className="h-fn-4 w-fn-4" />}
            label="Awaiting approval"
            value={String(kpis.pendingCount)}
            sub={
              kpis.pendingCount === 0
                ? 'no runs waiting'
                : 'runs in pending_approval — Finance can approve'
            }
          />
        </div>

        {/* Runs table */}
        <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs flex min-h-0 flex-1 flex-col overflow-hidden border">
          <DataTable
            chrome="plain"
            columns={columns}
            rows={items}
            getRowKey={(r) => r.id}
            isLoading={listQuery.isPending}
            isError={listQuery.isError}
            onRetry={() => listQuery.refetch()}
            totalCount={items.length}
            onRowClick={(r) => router.push(`/monthly-processing/${r.id}`)}
            rowActions={rowActions}
            emptyState={
              <div className="gap-fn-3 py-fn-12 flex flex-col items-center text-center">
                <Calculator className="text-fn-fg-faint h-fn-8 w-fn-8" />
                <p className="text-fn-fg font-fn-semibold text-[14px]">No commission runs yet</p>
                <p className="text-fn-fg-muted max-w-[340px] text-[12.5px]">
                  {canCreate
                    ? 'The monthly scheduler drafts a run on the 1st of each month. Or create one manually.'
                    : 'Runs appear here once HR drafts the first one.'}
                </p>
                {canCreate && (
                  <Button onClick={openCreate}>
                    <Plus className="h-fn-4 w-fn-4" /> Draft this month
                  </Button>
                )}
              </div>
            }
          />
        </div>
      </div>

      <CreateRunDialog open={createOpen} onOpenChange={(v) => (v ? openCreate() : closeCreate())} />
    </AppShell>
  );
}

/* ───────────────────────── Sub-components ───────────────────────── */

function KpiCard({
  tone,
  icon,
  label,
  value,
  sub,
}: {
  tone: 'accent' | 'success' | 'warning';
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  const toneClasses: Record<typeof tone, string> = {
    accent: 'border-fn-accent/30 bg-fn-accent-soft/40',
    success: 'border-fn-success/30 bg-fn-success-soft/40',
    warning: 'border-fn-warning/30 bg-fn-warning-soft/40',
  };
  return (
    <div className={cn('rounded-fn-sm p-fn-4 gap-fn-2_5 flex flex-col border', toneClasses[tone])}>
      <div className="gap-fn-2 text-fn-fg-muted font-fn-medium flex items-center text-[12px]">
        <span
          aria-hidden
          className="rounded-fn-xs h-fn-7 w-fn-7 bg-fn-bg-panel text-fn-fg inline-flex shrink-0 items-center justify-center"
        >
          {icon}
        </span>
        {label}
      </div>
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

function CreateRunDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const createMutation = useCreateCommissionRun();
  const [monthKey, setMonthKey] = React.useState(currentMonthKey());
  const [fxRate, setFxRate] = React.useState('0.0035');
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setMonthKey(currentMonthKey());
      setFxRate('0.0035');
      setNotes('');
    }
  }, [open]);

  async function submit() {
    try {
      const created = await createMutation.mutateAsync({
        monthKey,
        fxRateUsdToPkr: Number(fxRate),
        notes: notes || undefined,
      });
      toast.success(
        `Draft for ${created.monthLabel} created — ${created.lineItems.length} line items calculated.`,
      );
      onOpenChange(false);
      router.push(`/monthly-processing/${created.id}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Draft a commission run</DialogTitle>
          <DialogDescription>
            Generates a draft run for the chosen month by calculating against every active project.
            Adjust line items before submitting for approval.
          </DialogDescription>
        </DialogHeader>

        <div className="gap-fn-3 py-fn-2 flex flex-col">
          <div className="gap-fn-1_5 flex flex-col">
            <label className="text-fn-fg font-fn-medium text-[12.5px]">Month (YYYY-MM)</label>
            <Input
              value={monthKey}
              onChange={(e) => setMonthKey(e.target.value)}
              placeholder="2026-05"
            />
          </div>
          <div className="gap-fn-1_5 flex flex-col">
            <label className="text-fn-fg font-fn-medium text-[12.5px]">USD → PKR FX rate</label>
            <Input
              type="number"
              step="0.0001"
              value={fxRate}
              onChange={(e) => setFxRate(e.target.value)}
            />
            <span className="text-fn-fg-faint text-[11.5px]">
              Pinned to the run. Display-only in Phase 2; Phase 7 payslips read it.
            </span>
          </div>
          <div className="gap-fn-1_5 flex flex-col">
            <label className="text-fn-fg font-fn-medium text-[12.5px]">Notes (optional)</label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything Finance should know before review?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={createMutation.isPending}>
            <Plus className="h-fn-4 w-fn-4" /> Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Helpers ───────────────────────── */

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
