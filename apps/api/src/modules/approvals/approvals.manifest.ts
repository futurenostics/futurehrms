import { ModuleManifest } from '../../core/registry/types';

/**
 * Approvals module manifest.
 *
 * The module is the cross-module inbox. It doesn't own any approval
 * KINDS itself — every kind is registered by its owning module (e.g.
 * Commissions registers `commission-run`, future Overtime will
 * register `overtime.request`, etc.).
 *
 * Permissions:
 *   - view_own_inbox  : list + see detail of approvals you can act on
 *   - view_all_inbox  : admin / debug — see every pending approval
 *   - submit          : reserved — kinds today are submitted by their
 *                       owning module (commission-run submit lives in
 *                       commissions:submit_run). Kept so future generic
 *                       submitters can land cleanly.
 *   - cancel_any      : admin escape hatch — cancel any approval
 *                       regardless of its kind-specific permission
 *
 * Audited entities: Approval + ApprovalDecision.
 *
 * Events emitted: approval.submitted, approval.approved,
 * approval.rejected, approval.cancelled.
 *
 * Event subscriptions: none directly. The migration in 4B has
 * commission-run-side effects fire DOMAIN events that subscribers
 * (timeline) already listen to — the approval bus is upstream of
 * those.
 */
export const approvalsManifest: ModuleManifest = {
  key: 'approvals',
  name: 'Approvals',
  permissions: [
    { action: 'view_own_inbox', description: 'View + act on approvals in your inbox' },
    { action: 'view_all_inbox', description: 'View every pending approval (admin)' },
    {
      action: 'submit',
      description:
        'Reserved — generic submit affordance for kinds without a bespoke submit endpoint',
    },
    { action: 'cancel_any', description: 'Cancel any approval (admin escape hatch)' },
  ],
  navItems: [
    {
      label: 'Approvals',
      path: '/approvals',
      icon: 'CheckSquare',
      requires: 'approvals:view_own_inbox',
      group: 'Commission & Payroll',
      order: 30,
    },
  ],
  auditedEntities: ['Approval', 'ApprovalDecision'],
  defaultRolePermissions: [
    { roleSlug: 'employee', actions: [] },
    { roleSlug: 'team_lead', actions: ['view_own_inbox'] },
    { roleSlug: 'department_manager', actions: ['view_own_inbox'] },
    { roleSlug: 'hr_admin', actions: ['view_own_inbox', 'view_all_inbox'] },
    { roleSlug: 'finance_manager', actions: ['view_own_inbox', 'view_all_inbox'] },
  ],
};
