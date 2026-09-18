'use client';

import Link from 'next/link';
import { Wallet } from 'lucide-react';
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
        <div className="gap-fn-2 py-fn-16 flex flex-col items-center text-center">
          <Wallet className="text-fn-fg-faint h-fn-6 w-fn-6" />
          <p className="text-fn-fg-muted text-[13px]">{EXPENSE_COPY.noAccessBody}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumbs={[{ label: 'Expenses', href: '/expenses' }, { label: 'History' }]}>
      <div className="gap-fn-6 mx-auto flex w-full max-w-6xl flex-col">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-fn-fg font-fn-semibold tracking-fn-tight text-[26px]">History</h1>
            <p className="text-fn-fg-muted mt-fn-1 text-[13px]">{EXPENSE_COPY.pageIntroHistory}</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/expenses">Active</Link>
          </Button>
        </div>
        <ExpenseClaimsPanel mine hideCreateButton hideListHeader bucket="resolved" />
      </div>
    </AppShell>
  );
}
