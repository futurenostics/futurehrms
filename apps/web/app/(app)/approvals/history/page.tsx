'use client';

import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { AppShell } from '@/components/shell/app-shell';
import { Button } from '@/components/ui/button';
import { ExpenseApprovalHistory } from '@/components/approvals/expense-approval-history';
import { usePermissions } from '@/hooks/use-permissions';
import { EXPENSE_COPY } from '@/components/expenses/expense-copy';

export default function ApprovalsHistoryPage() {
  const perms = usePermissions();
  const canView = perms.has('expenses:approve_claim');

  if (!canView) {
    return (
      <AppShell breadcrumbs={[{ label: 'Approvals', href: '/approvals' }, { label: 'History' }]}>
        <div className="gap-fn-3 py-fn-16 flex flex-col items-center text-center">
          <ShieldCheck className="text-fn-fg-faint h-fn-8 w-fn-8" />
          <p className="text-fn-fg font-fn-semibold">No access</p>
          <p className="text-fn-fg-muted max-w-[420px] text-[13px]">
            Expense claim history is available to users who can approve expenses.
          </p>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/approvals">Back to inbox</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumbs={[{ label: 'Approvals', href: '/approvals' }, { label: 'History' }]}>
      <div className="gap-fn-5 mx-auto flex w-full max-w-[1280px] flex-col">
        <div className="gap-fn-3 flex flex-col">
          <Button variant="ghost" size="sm" className="self-start" asChild>
            <Link href="/approvals">
              <ArrowLeft className="h-fn-3_5 w-fn-3_5" /> Inbox
            </Link>
          </Button>
          <div className="gap-fn-1 flex flex-col">
            <h1 className="text-fn-fg font-fn-semibold tracking-fn-tight text-[26px]">
              Approval history
            </h1>
            <p className="text-fn-fg-muted text-[13px]">{EXPENSE_COPY.orgHistoryIntro}</p>
          </div>
        </div>
        <ExpenseApprovalHistory />
      </div>
    </AppShell>
  );
}
