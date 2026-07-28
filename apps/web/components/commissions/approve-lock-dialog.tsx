'use client';

import * as React from 'react';
import { Check, Lock, Mail, Receipt, ShieldAlert, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import type { CommissionRunSummary } from '@futurenostics/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useApproveCommissionRun } from '@/lib/queries/commission-runs';
import { cn } from '@/lib/utils';

/**
 * Approve & lock confirmation dialog — matches PNG 10.
 *
 * Per the locked decision (docs/DECISIONS.md § Phase 2 → Approve
 * dialog rendering), the payslip/email/Payoneer rows are rendered
 * as disabled `Phase 7` placeholders. The actual state transition
 * (status → approved, audit log, timeline events) fires
 * server-side; this dialog just gates it behind the typed phrase.
 */
export interface ApproveLockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: CommissionRunSummary;
  recipientCount: number;
  heldProjectsCount: number;
  /**
   * Current stage of a multi-stage approval chain, or null for a
   * single-stage approval. The typed phrase + lock summary only show
   * on the final stage; intermediate stages are a confirming click
   * that advances to the next approver.
   */
  stage?: { index: number; total: number; label: string } | null;
}

export function ApproveLockDialog({
  open,
  onOpenChange,
  run,
  recipientCount,
  heldProjectsCount,
  stage = null,
}: ApproveLockDialogProps) {
  const expectedPhrase = `APPROVE ${run.monthLabel.toUpperCase()}`;
  const [phrase, setPhrase] = React.useState('');
  const approveMutation = useApproveCommissionRun(run.id);

  React.useEffect(() => {
    if (!open) setPhrase('');
  }, [open]);

  // Final stage when there's no chain, or we're on the last step.
  const isFinalStage = !stage || stage.index >= stage.total - 1;
  const phraseMatches = phrase.trim() === expectedPhrase;
  const canApprove = isFinalStage ? phraseMatches : true;

  async function onApprove() {
    if (!canApprove) return;
    try {
      // The backend only validates the phrase on the final stage; for
      // intermediate stages we still send it (schema requires non-empty)
      // but it is ignored.
      await approveMutation.mutateAsync({
        confirmationPhrase: isFinalStage ? phrase.trim() : expectedPhrase,
      });
      toast.success(
        isFinalStage
          ? `${run.monthLabel} run approved.`
          : `Step approved — routed to the next approver.`,
      );
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <div className="gap-fn-2 flex items-center">
            <span
              aria-hidden
              className="rounded-fn-full bg-fn-bg-inset text-fn-fg-muted h-fn-7 w-fn-7 inline-flex items-center justify-center"
            >
              <Lock className="h-fn-3_5 w-fn-3_5" />
            </span>
            {stage && stage.total > 1 && (
              <Badge tone="info">
                Step {stage.index + 1} of {stage.total} · {stage.label}
              </Badge>
            )}
            {isFinalStage && <Badge tone="danger">Irreversible</Badge>}
          </div>
          <DialogTitle className="mt-fn-2">
            {isFinalStage
              ? `Approve & lock ${run.monthLabel} run?`
              : `Approve ${run.monthLabel} run — ${stage?.label}?`}
          </DialogTitle>
          <DialogDescription>
            {isFinalStage ? (
              <>
                Approving will{' '}
                <strong className="text-fn-fg font-fn-semibold">permanently lock</strong> all{' '}
                {run.projectCount} project entries. After this, corrections require a new
                compensating run. Downstream payout actions are deferred to Phase 7 — see the queued
                list below.
              </>
            ) : (
              <>
                Your approval advances this run to the next approver in the chain. The final
                approver locks it in with the typed confirmation phrase.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Summary strip */}
        <div className="gap-fn-2 py-fn-2 grid grid-cols-2">
          <SummaryCell label="Total disbursement" value={formatUsd(run.totalDisbursementUsd)} />
          <SummaryCell label="Recipients" value={`${recipientCount} people`} />
        </div>

        {/* Phase-7-deferred queued list — final stage only. */}
        {isFinalStage && (
          <ul className="gap-fn-1_5 flex flex-col text-[12.5px]">
            <QueuedRow
              icon={<Receipt className="h-fn-3_5 w-fn-3_5" />}
              label={`Payslip PDFs generated for ${recipientCount} employees`}
              tone="phase7"
            />
            <QueuedRow
              icon={<Mail className="h-fn-3_5 w-fn-3_5" />}
              label="Disbursement emails (React Email templates)"
              tone="phase7"
            />
            <QueuedRow
              icon={<Wallet className="h-fn-3_5 w-fn-3_5" />}
              label="Payoneer CSV export"
              tone="phase7"
            />
            {heldProjectsCount > 0 && (
              <QueuedRow
                icon={<ShieldAlert className="h-fn-3_5 w-fn-3_5" />}
                label={`${heldProjectsCount} held ${heldProjectsCount === 1 ? 'project' : 'projects'} → carry-forward`}
                tone="logged"
              />
            )}
          </ul>
        )}

        {/* Typed-phrase confirmation — final stage only. */}
        {isFinalStage && (
          <div className="gap-fn-1_5 py-fn-2 flex flex-col">
            <label className="text-fn-fg text-[12.5px]">
              Type{' '}
              <code className="bg-fn-bg-inset rounded-fn-xs px-fn-1_5 py-fn-0_25 font-fn-semibold font-mono text-[11.5px]">
                {expectedPhrase}
              </code>{' '}
              to confirm
            </label>
            <Input
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={expectedPhrase}
              autoFocus
              className={cn(phraseMatches && 'border-fn-success focus-visible:border-fn-success')}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onApprove} disabled={!canApprove || approveMutation.isPending}>
            {isFinalStage ? (
              <>
                <Lock className="h-fn-4 w-fn-4" /> Approve &amp; lock
              </>
            ) : (
              <>
                <Check className="h-fn-4 w-fn-4" /> Approve step
              </>
            )}
          </Button>
        </DialogFooter>

        <p className="text-fn-fg-faint border-fn-divider pt-fn-2 mt-fn-1 border-t text-center text-[11px]">
          This action is logged in the audit log as{' '}
          <code className="font-mono">commission.run.approved</code>.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-fn-xs bg-fn-bg-inset px-fn-3 py-fn-2_5 gap-fn-0_5 flex flex-col">
      <span className="text-fn-fg-faint tracking-fn-uppercase-tight text-[10.5px] uppercase">
        {label}
      </span>
      <span
        className="text-fn-fg font-fn-semibold leading-fn-unit text-[20px] tabular-nums"
        style={{ letterSpacing: '-0.02em' }}
      >
        {value}
      </span>
    </div>
  );
}

function QueuedRow({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: 'phase7' | 'logged';
}) {
  return (
    <div
      className={cn(
        'rounded-fn-xs px-fn-2_5 py-fn-1_5 gap-fn-2 flex items-center border',
        tone === 'phase7'
          ? 'border-fn-divider bg-fn-bg-inset/40 text-fn-fg-muted'
          : 'border-fn-info/30 bg-fn-info-soft/40 text-fn-info-soft-fg',
      )}
    >
      <span aria-hidden>{icon}</span>
      <span className="flex-1">{label}</span>
      {tone === 'phase7' ? (
        <Badge tone="default">Phase 7</Badge>
      ) : (
        <Badge tone="info">
          <Check className="h-fn-2_5 w-fn-2_5" /> Logged
        </Badge>
      )}
    </div>
  );
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}
