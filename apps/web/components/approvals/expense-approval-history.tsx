'use client';

import { ExpenseClaimsPanel } from '@/components/expenses/expense-claims-panel';

/** Org-wide resolved expense claims for Finance (`/approvals/history`). */
export function ExpenseApprovalHistory() {
  return <ExpenseClaimsPanel mine={false} hideCreateButton hideListHeader bucket="resolved" />;
}
