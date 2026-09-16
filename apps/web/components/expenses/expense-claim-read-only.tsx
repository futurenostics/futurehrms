'use client';

import type { ExpenseClaimDetail } from '@futurenostics/types';
import { expenseCategoryLabel, medicalSubcategoryLabel } from '@futurenostics/types';
import { EXPENSE_COPY } from '@/components/expenses/expense-copy';
import { ExpenseDocumentsSection } from '@/components/expenses/expense-documents';
import {
  formatExpenseDate,
  formatExpenseMonth,
  formatPkr,
} from '@/components/expenses/expense-claim-status';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-fn-fg-faint text-[11.5px] uppercase tracking-[0.06em]">{label}</p>
      <p className="text-fn-fg mt-fn-0_5 text-[13.5px]">{value}</p>
    </div>
  );
}

export function ExpenseClaimReadOnlyView({
  claim,
  documentsEditable = false,
}: {
  claim: ExpenseClaimDetail;
  documentsEditable?: boolean;
}) {
  const d = claim.details as Record<string, unknown> | null;
  return (
    <div className="gap-fn-5 flex flex-col">
      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-4 p-fn-5 grid grid-cols-2 border">
        <Field label={EXPENSE_COPY.categoryLabel} value={expenseCategoryLabel(claim.category)} />
        <Field
          label={EXPENSE_COPY.amountLabel}
          value={`${formatPkr(claim.amountPkr)} ${claim.currency}`}
        />
        <Field
          label={EXPENSE_COPY.expenseMonthLabel}
          value={formatExpenseMonth(claim.expenseDate)}
        />
        {claim.submittedBy && <Field label="Submitted by" value={claim.submittedBy.name} />}
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

      <ExpenseDocumentsSection
        claimId={claim.id}
        documents={claim.documents}
        editable={documentsEditable}
      />

      {claim.history.length > 0 && (
        <div>
          <p className="text-fn-fg font-fn-semibold mb-fn-2 text-[14px]">
            {EXPENSE_COPY.historyTitle}
          </p>
          <ul className="gap-fn-2 flex flex-col">
            {claim.history.map((h) => (
              <li key={h.id} className="text-fn-fg-muted text-[12.5px]">
                {formatExpenseDate(h.occurredAt)} · {h.title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
