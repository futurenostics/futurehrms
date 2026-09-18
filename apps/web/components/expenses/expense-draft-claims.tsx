'use client';

import { useRouter } from 'next/navigation';
import { useExpenseClaims } from '@/lib/queries/expenses';
import { EXPENSE_COPY } from '@/components/expenses/expense-copy';
import { formatPkr } from '@/components/expenses/expense-claim-status';

/** Unsubmitted drafts — one quiet line, not a second table. */
export function ExpenseDraftClaims() {
  const router = useRouter();
  const drafts = useExpenseClaims({
    status: 'draft',
    limit: 10,
    sortBy: 'createdAt',
    sortDir: 'desc',
    scope: 'mine',
  });

  if (drafts.isPending) return null;
  const rows = drafts.data?.items ?? [];
  if (rows.length === 0) return null;

  return (
    <div className="gap-fn-2 flex flex-wrap items-baseline">
      <span className="text-fn-fg-muted text-[12.5px]">{EXPENSE_COPY.draftsTitle}</span>
      {rows.map((row, i) => (
        <button
          key={row.id}
          type="button"
          onClick={() => router.push(`/expenses/claims/${row.id}`)}
          className="text-fn-fg hover:text-fn-accent text-[12.5px] transition-colors"
        >
          {row.claimNumber}
          <span className="text-fn-fg-faint ml-fn-1 tabular-nums">{formatPkr(row.amountPkr)}</span>
          {i < rows.length - 1 ? <span className="text-fn-fg-faint ml-fn-2">·</span> : null}
        </button>
      ))}
    </div>
  );
}
