'use client';

import type { OpdClaimPublic } from '@futurenostics/types';
import { formatOpdFinanceFeedback } from '@futurenostics/types';
import { Alert } from '@/components/ui/alert';
import { OPD_COPY } from '@/components/opd/opd-copy';

/** Outcome banner on read-only claim detail (matches commission run status language). */
export function OpdFinanceOutcomeBanner({ claim }: { claim: OpdClaimPublic }) {
  if (claim.status === 'approved') {
    return (
      <Alert tone="success" title={OPD_COPY.alertApprovedTitle}>
        {claim.approvalNote?.trim() ? (
          <p className="text-fn-base">{claim.approvalNote}</p>
        ) : (
          <p className="text-fn-base opacity-90">{OPD_COPY.alertApprovedBody}</p>
        )}
      </Alert>
    );
  }

  if (claim.status === 'rejected') {
    return (
      <Alert tone="danger" title={OPD_COPY.alertRejectedTitle}>
        <p className="text-fn-base">
          {claim.rejectionReason?.trim() || OPD_COPY.alertRejectedNoReason}
        </p>
      </Alert>
    );
  }

  if (claim.status === 'pending_approval') {
    return (
      <Alert tone="info" title={OPD_COPY.alertPendingTitle}>
        <p className="text-fn-base">{OPD_COPY.alertPendingBody}</p>
      </Alert>
    );
  }

  if (claim.status === 'returned') {
    const detail =
      claim.returnReasonCode != null
        ? formatOpdFinanceFeedback(claim.returnReasonCode, claim.returnComment)
        : OPD_COPY.alertReturnedBody;
    return (
      <Alert tone="warning" title={OPD_COPY.alertReturnedTitle}>
        <p className="text-fn-base">{detail}</p>
      </Alert>
    );
  }

  return null;
}
