'use client';

import Link from 'next/link';
import { ArrowLeft, Wallet } from 'lucide-react';
import { AppShell } from '@/components/shell/app-shell';
import { Button } from '@/components/ui/button';
import { ExpenseClaimsPanel } from '@/components/expenses/expense-claims-panel';
import { EXPENSE_COPY } from '@/components/expenses/expense-copy';
import { usePermissions } from '@/hooks/use-permissions';

export default function ExpensesHistoryPage() {
  const perms = usePermissions();

  if (!perms.has('expenses:view_own')) {
    return (
      <AppShell breadcrumbs={[{ label: 'Expenses', href: '/expenses' }, { label: 'History' }]}>
        <div className="gap-fn-3 py-fn-16 flex flex-col items-center text-center">
          <Wallet className="text-fn-fg-faint h-fn-8 w-fn-8" />
          <p className="text-fn-fg font-fn-semibold">{EXPENSE_COPY.noAccessTitle}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumbs={[{ label: 'Expenses', href: '/expenses' }, { label: 'History' }]}>
      <div className="gap-fn-5 mx-auto flex w-full max-w-6xl flex-col">
        <div className="gap-fn-3 flex flex-col">
          <Button variant="ghost" size="sm" className="self-start" asChild>
            <Link href="/expenses">
              <ArrowLeft className="h-fn-3_5 w-fn-3_5" /> Active claims
            </Link>
          </Button>
          <div>
            <h1 className="text-fn-fg font-fn-semibold tracking-fn-tight text-[26px]">History</h1>
            <p className="text-fn-fg-muted mt-fn-1 text-[13.5px]">
              {EXPENSE_COPY.pageIntroHistory}
            </p>
          </div>
        </div>
        <ExpenseClaimsPanel mine hideCreateButton hideListHeader bucket="resolved" />
      </div>
    </AppShell>
  );
}
