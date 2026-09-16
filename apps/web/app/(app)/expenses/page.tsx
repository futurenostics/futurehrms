'use client';

import { Wallet } from 'lucide-react';
import { AppShell } from '@/components/shell/app-shell';
import { ExpenseClaimsPanel } from '@/components/expenses/expense-claims-panel';
import { EXPENSE_COPY } from '@/components/expenses/expense-copy';
import { ShowHistoryButton } from '@/components/approvals/expense-history-entry';
import { usePermissions } from '@/hooks/use-permissions';

export default function ExpensesPage() {
  const perms = usePermissions();

  if (!perms.has('expenses:view_own')) {
    return (
      <AppShell breadcrumbs={[{ label: 'Expenses' }]}>
        <div className="gap-fn-3 py-fn-16 flex flex-col items-center text-center">
          <Wallet className="text-fn-fg-faint h-fn-8 w-fn-8" />
          <p className="text-fn-fg font-fn-semibold">{EXPENSE_COPY.noAccessTitle}</p>
          <p className="text-fn-fg-muted max-w-[420px] text-[13px]">{EXPENSE_COPY.noAccessBody}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumbs={[{ label: 'Expenses' }]}>
      <div className="gap-fn-5 mx-auto flex w-full max-w-6xl flex-col">
        <div className="gap-fn-4 flex items-start justify-between">
          <div className="min-w-0">
            <h1 className="text-fn-fg font-fn-semibold tracking-fn-tight text-[26px]">
              {EXPENSE_COPY.moduleName}
            </h1>
            <p className="text-fn-fg-muted mt-fn-1 text-[13.5px]">{EXPENSE_COPY.pageIntroOwn}</p>
          </div>
          <ShowHistoryButton href="/expenses/history" />
        </div>
        <ExpenseClaimsPanel mine bucket="active" hideListHeader />
      </div>
    </AppShell>
  );
}
