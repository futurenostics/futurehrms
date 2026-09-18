'use client';

import type { ExpenseClaimPublic } from '@futurenostics/types';
import { formatExpenseFinanceFeedback } from '@futurenostics/types';
import { Alert } from '@/components/ui/alert';
import { EXPENSE_COPY, EXPENSE_STATUS_LABEL } from '@/components/expenses/expense-copy';
import { formatExpenseDate } from '@/components/expenses/expense-claim-status';

function actorLine(name: string | undefined, at: string | null): string | null {
  const who = name?.trim();
  const when = at ? formatExpenseDate(at) : null;
  if (who && when) return `${who} · ${when}`;
  if (who) return who;
  if (when) return when;
  return null;
}

/** Outcome only when there is something to read beyond the status badge. */
export function ExpenseClaimOutcomeBanner({ claim }: { claim: ExpenseClaimPublic }) {
  if (claim.status === 'returned') {
    const reason = claim.returnReasonCode
      ? formatExpenseFinanceFeedback(claim.returnReasonCode, claim.returnComment)
      : EXPENSE_COPY.alertReturnedBody;
    const meta = actorLine(claim.returnedBy?.name, claim.returnedAt);
    return (
      <Alert tone="warning" title={EXPENSE_STATUS_LABEL.returned} showIcon={false}>
        <p>
          {reason}
          {meta ? <span className="text-fn-fg-muted"> · {meta}</span> : null}
        </p>
      </Alert>
    );
  }

  if (claim.status === 'rejected') {
    const reason = claim.rejectionReason || EXPENSE_COPY.alertRejectedNoReason;
    const meta = actorLine(claim.rejectedBy?.name, claim.rejectedAt);
    return (
      <Alert tone="danger" title={EXPENSE_STATUS_LABEL.rejected} showIcon={false}>
        <p>
          {reason}
          {meta ? <span className="text-fn-fg-muted"> · {meta}</span> : null}
        </p>
      </Alert>
    );
  }

  if (claim.status === 'approved' && claim.approvalNote?.trim()) {
    const meta = actorLine(claim.approvedBy?.name, claim.approvedAt);
    return (
      <Alert tone="success" title={EXPENSE_STATUS_LABEL.approved} showIcon={false}>
        <p>
          {claim.approvalNote.trim()}
          {meta ? <span className="text-fn-fg-muted"> · {meta}</span> : null}
        </p>
      </Alert>
    );
  }

  return null;
}
