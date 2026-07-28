import { ModuleManifest } from '../../core/registry/types';

/**
 * Commissions module manifest.
 *
 * Permission split enforces separation of duties:
 *   - HR Admin: manage_rules + create_run (sets the rules, drafts the
 *     monthly run, walks line items)
 *   - Finance Manager: approve_run + lock_run (reviews + approves)
 *   - Super Admin: all of the above (for emergencies)
 *
 * Session 1 ships only the rules half. Run + LineItem + approval
 * permissions are declared here so they exist in the Permission table
 * from boot — the endpoints land in Session 2.
 *
 * auditedEntities lists every model that's writeable. Session 1 only
 * ships CommissionRule; CommissionRun + CommissionLineItem will be
 * added when those models exist.
 */
export const commissionsManifest: ModuleManifest = {
  key: 'commissions',
  name: 'Commissions',
  permissions: [
    {
      action: 'view_own_breakdown',
      description: 'View own commission breakdown (per month)',
    },
    {
      action: 'view_all_breakdowns',
      description: 'View any employee’s commission breakdown',
    },
    { action: 'view_rules', description: 'View commission rules and their version history' },
    {
      action: 'manage_rules',
      description: 'Create, edit, and publish commission rule versions',
    },
    { action: 'view_runs', description: 'View commission runs (draft, pending, approved)' },
    { action: 'create_run', description: 'Create or recalculate a draft commission run' },
    {
      action: 'adjust_line_item',
      description: 'Manually adjust a draft commission line item — audited',
    },
    {
      action: 'submit_run',
      description: 'Submit a draft commission run for approval',
    },
    {
      action: 'approve_run',
      description:
        'First-level (finance) approval of a pending commission run (separation of duties — different role than create_run)',
    },
    {
      action: 'final_approve_run',
      description: 'Second-level (final) sign-off on a commission run approval chain',
    },
    {
      action: 'lock_run',
      description: 'Lock an approved commission run (final state — irreversible)',
    },
    {
      action: 'reject_run',
      description: 'Send a pending commission run back to draft with a reason',
    },
    { action: 'export_run', description: 'Export a commission run to CSV' },
    {
      action: 'raise_dispute',
      description: 'Flag one of your own commission line items as disputed',
    },
    {
      action: 'manage_disputes',
      description: 'View all commission disputes and resolve or reject them',
    },
  ],
  navItems: [
    {
      label: 'Monthly Processing',
      path: '/monthly-processing',
      icon: 'Calculator',
      requires: 'commissions:view_runs',
      group: 'Commission & Payroll',
      order: 20,
    },
    {
      label: 'Commission Rules',
      path: '/commission-rules',
      icon: 'Scale',
      requires: 'commissions:view_rules',
      group: 'Commission & Payroll',
      order: 25,
    },
  ],
  dashboardWidgets: [
    {
      key: 'commissions.mine_this_month',
      title: 'My commission this month',
      requires: 'commissions:view_own_breakdown',
      order: 40,
    },
    {
      key: 'commissions.run_status',
      title: 'Commission run status',
      requires: 'commissions:view_runs',
      order: 50,
    },
    {
      key: 'commissions.my_trend',
      title: 'My commission trend',
      requires: 'commissions:view_own_breakdown',
      order: 60,
    },
  ],
  approvables: [
    {
      kind: 'commission-run',
      label: 'Commission run approval',
      requires: 'commissions:approve_run',
    },
  ],
  auditedEntities: ['CommissionRule', 'CommissionRun', 'CommissionLineItem', 'CommissionDispute'],
  defaultRolePermissions: [
    { roleSlug: 'employee', actions: ['view_own_breakdown', 'raise_dispute'] },
    { roleSlug: 'team_lead', actions: ['view_own_breakdown', 'raise_dispute'] },
    { roleSlug: 'department_manager', actions: ['view_own_breakdown', 'raise_dispute'] },
    {
      roleSlug: 'hr_admin',
      actions: [
        'view_own_breakdown',
        'view_all_breakdowns',
        'view_rules',
        'manage_rules',
        'view_runs',
        'create_run',
        'adjust_line_item',
        'submit_run',
        'reject_run',
        'export_run',
        'raise_dispute',
        'manage_disputes',
      ],
    },
    {
      roleSlug: 'finance_manager',
      actions: [
        'view_own_breakdown',
        'view_all_breakdowns',
        'view_rules',
        'view_runs',
        'approve_run',
        'final_approve_run',
        'lock_run',
        'export_run',
        'raise_dispute',
        'manage_disputes',
      ],
    },
  ],
};
