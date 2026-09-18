'use client';

import type { ExpenseClaimDetail } from '@futurenostics/types';
import { expenseCategoryLabel, medicalSubcategoryLabel } from '@futurenostics/types';
import { EXPENSE_COPY } from '@/components/expenses/expense-copy';
import { ExpenseDocumentsSection } from '@/components/expenses/expense-documents';
import { formatExpenseMonth, formatPkr } from '@/components/expenses/expense-claim-status';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-fn-fg-muted text-[12px]">{label}</p>
      <p className="text-fn-fg mt-fn-0_5 text-[13.5px]">{value}</p>
    </div>
  );
}

export function ExpenseClaimReadOnlyView({
  claim,
  documentsEditable = false,
  hideSummary = false,
}: {
  claim: ExpenseClaimDetail;
  documentsEditable?: boolean;
  hideSummary?: boolean;
}) {
  const d = claim.details as Record<string, unknown> | null;
  return (
    <div className="gap-fn-6 flex flex-col">
      {!hideSummary ? (
        <div className="gap-fn-4 grid grid-cols-2">
          <Field label={EXPENSE_COPY.categoryLabel} value={expenseCategoryLabel(claim.category)} />
          <Field label={EXPENSE_COPY.amountLabel} value={formatPkr(claim.amountPkr)} />
          <Field
            label={EXPENSE_COPY.expenseMonthLabel}
            value={formatExpenseMonth(claim.expenseDate)}
          />
          {claim.submittedBy ? <Field label="Submitted by" value={claim.submittedBy.name} /> : null}
          {claim.category === 'medical' && d?.subCategory ? (
            <Field
              label={EXPENSE_COPY.medicalSubLabel}
              value={medicalSubcategoryLabel(String(d.subCategory))}
            />
          ) : null}
          {claim.notes ? (
            <div className="col-span-2">
              <Field label={EXPENSE_COPY.descriptionLabel} value={claim.notes} />
            </div>
          ) : null}
        </div>
      ) : null}

      <ExpenseDocumentsSection
        claimId={claim.id}
        documents={claim.documents}
        editable={documentsEditable}
      />
    </div>
  );
}
