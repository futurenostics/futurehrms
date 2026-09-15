import { ModuleManifest } from '../../core/registry/types';

/**
 * OPD (outpatient medical reimbursement) module.
 *
 * Employees submit claims with a prescription image; Finance approves
 * or rejects via the generic Approvals inbox (`opd-claim` kind).
 */
export const opdManifest: ModuleManifest = {
  key: 'opd',
  name: 'Medical claims',
  permissions: [
    { action: 'view_own', description: 'View own medical reimbursement claims' },
    { action: 'view_all', description: 'View all employees’ medical claims (HR / Finance)' },
    { action: 'submit_own', description: 'Create, edit, and submit own medical claims' },
    { action: 'approve_claim', description: 'Approve or decline medical claims' },
  ],
  navItems: [
    {
      label: 'Medical claims',
      path: '/opd',
      icon: 'HeartPulse',
      requires: 'opd:view_all',
      group: 'HR Core',
      order: 25,
    },
  ],
  auditedEntities: ['OpdClaim', 'OpdClaimDocument'],
  defaultRolePermissions: [
    { roleSlug: 'employee', actions: ['view_own', 'submit_own'] },
    { roleSlug: 'team_lead', actions: ['view_own', 'submit_own'] },
    { roleSlug: 'department_manager', actions: ['view_own', 'submit_own'] },
    { roleSlug: 'hr_admin', actions: ['view_own', 'submit_own', 'view_all'] },
    {
      roleSlug: 'finance_manager',
      actions: ['view_own', 'submit_own', 'view_all', 'approve_claim'],
    },
  ],
};
