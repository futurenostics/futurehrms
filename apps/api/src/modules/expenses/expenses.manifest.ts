import { ModuleManifest } from '../../core/registry/types';

/**
 * Expense reimbursements — medical, gym, travel, and business development.
 * Finance approves via the generic Approvals inbox (`expense-claim`).
 */
export const expensesManifest: ModuleManifest = {
  key: 'expenses',
  name: 'Expenses',
  permissions: [
    { action: 'view_own', description: 'View own expense claims' },
    { action: 'view_all', description: 'View all employees’ expense claims' },
    { action: 'submit_own', description: 'Create, edit, and submit own expense claims' },
    { action: 'approve_claim', description: 'Approve or decline expense claims' },
  ],
  navItems: [
    {
      label: 'Expenses',
      path: '/expenses',
      icon: 'Wallet',
      requires: 'expenses:view_own',
      group: 'Workspace',
      order: 15,
    },
  ],
  eventSubscriptions: [
    { event: 'expenses.claim.submitted', handler: 'handleSubmitted' },
    { event: 'expenses.claim.approved', handler: 'handleApproved' },
    { event: 'expenses.claim.rejected', handler: 'handleRejected' },
    { event: 'expenses.claim.returned', handler: 'handleReturned' },
  ],
  approvables: [
    {
      kind: 'expense-claim',
      label: 'Expense claim',
      requires: 'expenses:approve_claim',
    },
  ],
  auditedEntities: ['ExpenseClaim', 'ExpenseClaimDocument'],
  defaultRolePermissions: [
    { roleSlug: 'employee', actions: ['view_own', 'submit_own'] },
    { roleSlug: 'team_lead', actions: ['view_own', 'submit_own'] },
    { roleSlug: 'department_manager', actions: ['view_own', 'submit_own'] },
    { roleSlug: 'hr_admin', actions: ['view_own', 'submit_own'] },
    {
      roleSlug: 'finance_manager',
      actions: ['view_own', 'submit_own', 'approve_claim'],
    },
  ],
};
