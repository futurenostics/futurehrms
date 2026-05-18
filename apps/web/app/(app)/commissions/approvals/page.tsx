'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CheckSquare, ChevronRight, Inbox } from 'lucide-react';
import type { CommissionRunSummary } from '@futurenostics/types';
import { AppShell } from '@/components/shell/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCommissionRunsList } from '@/lib/queries/commission-runs';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

/**
 * Approvals inbox — filtered view of commission runs awaiting
 * approval. Permission-gated by `commissions:approve_run` (Finance
 * Manager + Super Admin by default).
 *
 * Click a row to jump to the run detail with `?action=approve` so
 * the Approve & lock dialog auto-opens.
 *
 * Future modules (evaluations, leave, expenses) can land their own
 * approvables in this same inbox once the manifest `approvables`
 * aggregator ships.
 */
export default function ApprovalsInboxPage() {
  const router = useRouter();
  const perms = usePermissions();
  const canApprove = perms.has('commissions:approve_run');

  const listQuery = useCommissionRunsList({ status: 'pending_approval', limit: 100 });
  const items = listQuery.data?.items ?? [];

  if (!canApprove) {
    return (
      <AppShell breadcrumbs={[{ label: 'Approvals' }]}>
        <div className="gap-fn-3 py-fn-16 flex flex-col items-center text-center">
          <Inbox className="text-fn-fg-faint h-fn-8 w-fn-8" />
          <p className="text-fn-fg font-fn-semibold">No approver permissions</p>
          <p className="text-fn-fg-muted max-w-[400px] text-[13px]">
            The Approvals inbox is reserved for users with the{' '}
            <code className="font-mono">commissions:approve_run</code> permission. Finance Manager
            and Super Admin roles get this by default.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumbs={[{ label: 'Approvals' }]}>
      <div className="gap-fn-5 mx-auto flex w-full max-w-[1280px] flex-col">
        {/* Header */}
        <div className="gap-fn-2 flex flex-col">
          <div className="gap-fn-2 flex items-center">
            <h1
              className="text-fn-fg font-fn-semibold text-[24px]"
              style={{ letterSpacing: '-0.02em' }}
            >
              Approvals
            </h1>
            <Badge tone="warning">{items.length} pending</Badge>
          </div>
          <p className="text-fn-fg-muted max-w-[640px] text-[14px]">
            Commission runs waiting on your approval. Open one to review line items, then approve
            &amp; lock or reject back to draft.
          </p>
        </div>

        {/* Inbox list */}
        {listQuery.isPending ? (
          <div className="gap-fn-2 flex flex-col">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[88px] w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="gap-fn-2 flex flex-col">
            {items.map((run) => (
              <InboxRow
                key={run.id}
                run={run}
                onOpen={() => router.push(`/monthly-processing/${run.id}?action=approve`)}
              />
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

/* ───────────────────────── Sub-components ───────────────────────── */

function InboxRow({ run, onOpen }: { run: CommissionRunSummary; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'rounded-fn-sm border-fn-border bg-fn-bg-panel hover:border-fn-fg-faint px-fn-4 py-fn-3_5 gap-fn-4 flex w-full cursor-pointer items-center border text-left transition-colors',
        )}
      >
        <span
          aria-hidden
          className="rounded-fn-xs bg-fn-warning-soft text-fn-warning-soft-fg h-fn-9 w-fn-9 inline-flex shrink-0 items-center justify-center"
        >
          <CheckSquare className="h-fn-4 w-fn-4" />
        </span>
        <div className="gap-fn-1 flex min-w-0 flex-1 flex-col">
          <div className="gap-fn-2 flex flex-wrap items-center">
            <span className="text-fn-fg font-fn-semibold text-[14px]">{run.monthLabel}</span>
            <span className="text-fn-fg-faint font-mono text-[11.5px]">{run.monthKey}</span>
            <Badge tone="warning" dot>
              Pending approval
            </Badge>
          </div>
          <div className="text-fn-fg-muted gap-fn-2 flex flex-wrap items-center text-[12.5px]">
            <span>
              <strong className="text-fn-fg font-fn-semibold tabular-nums">
                {formatUsd(run.totalDisbursementUsd)}
              </strong>{' '}
              across {run.recipientCount} recipients
            </span>
            <span aria-hidden className="text-fn-fg-faint">
              ·
            </span>
            <span>{run.projectCount} projects</span>
            {run.submittedAt && (
              <>
                <span aria-hidden className="text-fn-fg-faint">
                  ·
                </span>
                <span>Submitted {formatRelative(run.submittedAt)}</span>
              </>
            )}
          </div>
        </div>
        <Button variant="secondary" size="sm" asChild onClick={(e) => e.stopPropagation()}>
          <span>
            Review &amp; approve <ChevronRight className="h-fn-3_5 w-fn-3_5" />
          </span>
        </Button>
      </button>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel py-fn-16 flex flex-col items-center border text-center">
      <Inbox className="text-fn-fg-faint h-fn-8 w-fn-8" />
      <p className="text-fn-fg mt-fn-3 font-fn-semibold text-[14px]">Inbox zero</p>
      <p className="text-fn-fg-muted mt-fn-1 max-w-[400px] text-[12.5px]">
        No commission runs are waiting on you right now. When HR submits a draft run, it shows up
        here.
      </p>
    </div>
  );
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
