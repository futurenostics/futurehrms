'use client';

import type { ExpenseClaimPublic } from '@futurenostics/types';
import { formatExpenseFinanceFeedback } from '@futurenostics/types';
import { Alert } from '@/components/ui/alert';
import { EXPENSE_COPY, EXPENSE_STATUS_LABEL } from '@/components/expenses/expense-copy';
import { formatExpenseDate } from '@/components/expenses/expense-claim-status';

function actorLine(name: string | undefined, at: string | null): string {
  const who = name?.trim();
  const when = at ? formatExpenseDate(at) : null;
  if (who && when) return `${EXPENSE_COPY.lastActionBy} ${who} · ${when}`;
  if (who) return `${EXPENSE_COPY.lastActionBy} ${who}`;
  if (when) return when;
  return '';
}

function joinParts(...parts: Array<string | null | undefined>): string {
  return parts.filter((p) => p && p.trim().length > 0).join(' ');
}

/** Status + last Finance/employee action, shown at the top of claim detail. */
export function ExpenseClaimOutcomeBanner({ claim }: { claim: ExpenseClaimPublic }) {
  if (claim.status === 'returned') {
    const reason = claim.returnReasonCode
      ? formatExpenseFinanceFeedback(claim.returnReasonCode, claim.returnComment)
      : EXPENSE_COPY.alertReturnedBody;
    const meta = actorLine(claim.returnedBy?.name, claim.returnedAt);
    return (
      <Alert tone="warning" title={EXPENSE_STATUS_LABEL.returned}>
        <p className="text-fn-base">{joinParts(reason, meta ? `· ${meta}` : null)}</p>
      </Alert>
    );
  }

  if (claim.status === 'rejected') {
    const reason = claim.rejectionReason || EXPENSE_COPY.alertRejectedNoReason;
    const meta = actorLine(claim.rejectedBy?.name, claim.rejectedAt);
    return (
      <Alert tone="danger" title={EXPENSE_STATUS_LABEL.rejected}>
        <p className="text-fn-base">{joinParts(reason, meta ? `· ${meta}` : null)}</p>
      </Alert>
    );
  }

  if (claim.status === 'approved') {
    const note = claim.approvalNote?.trim() || EXPENSE_COPY.alertApprovedBody;
    const meta = actorLine(claim.approvedBy?.name, claim.approvedAt);
    return (
      <Alert tone="success" title={EXPENSE_STATUS_LABEL.approved}>
        <p className="text-fn-base">{joinParts(note, meta ? `· ${meta}` : null)}</p>
      </Alert>
    );
  }

  if (claim.status === 'pending_approval') {
    const meta = actorLine(claim.submittedBy?.name, claim.submittedAt);
    return (
      <Alert tone="info" title={EXPENSE_STATUS_LABEL.pending_approval}>
        <p className="text-fn-base">
          {joinParts(EXPENSE_COPY.alertPendingBody, meta ? `· ${meta}` : null)}
        </p>
      </Alert>
    );
  }

  return (
    <Alert tone="info" title={EXPENSE_STATUS_LABEL.draft}>
      <p className="text-fn-base">This claim has not been submitted yet.</p>
    </Alert>
  );
}
