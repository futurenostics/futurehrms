'use client';

import type { OpdClaimDetail, OpdClaimPublic } from '@futurenostics/types';
import { opdCategoryLabel } from '@futurenostics/types';
import { OpdDocumentsSection } from '@/components/opd/opd-documents';
import { OpdFinanceOutcomeBanner } from '@/components/opd/opd-finance-outcome';
import { OpdClaimHistorySection } from '@/components/opd/opd-claim-history';
import { OPD_COPY } from '@/components/opd/opd-copy';
import { formatPkr, formatVisitDate } from '@/components/opd/opd-claim-status';

/** Read-only claim summary for submitted / approved / rejected / cancelled. */
export function OpdClaimReadOnlyView({ claim }: { claim: OpdClaimPublic | OpdClaimDetail }) {
  const history = 'history' in claim ? claim.history : [];

  return (
    <>
      <OpdFinanceOutcomeBanner claim={claim} />

      <div className="gap-fn-4 grid grid-cols-1 sm:grid-cols-2">
        <Stat label={OPD_COPY.categoryLabel} value={opdCategoryLabel(claim.category)} />
        <Stat label={OPD_COPY.billAmountStat} value={formatPkr(claim.medicineCostPkr)} />
        <Stat label={OPD_COPY.visitDateLabel} value={formatVisitDate(claim.visitDate)} />
      </div>

      {claim.notes && (
        <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs px-fn-5 py-fn-4 gap-fn-1 flex flex-col border">
          <p className="text-fn-fg-muted font-fn-semibold tracking-fn-uppercase-tight text-[12px] uppercase">
            {OPD_COPY.descriptionLabel}
          </p>
          <p className="text-fn-fg text-[13px]">{claim.notes}</p>
        </div>
      )}

      <OpdDocumentsSection claim={claim} editable={false} />

      {history.length > 0 && <OpdClaimHistorySection history={history} />}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs px-fn-4 py-fn-3 border">
      <div className="text-fn-fg-muted text-[12px]">{label}</div>
      <div className="text-fn-fg font-fn-semibold mt-fn-1 text-[18px] tabular-nums">{value}</div>
    </div>
  );
}
