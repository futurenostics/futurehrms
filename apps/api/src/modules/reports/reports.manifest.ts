import { ModuleManifest } from '../../core/registry/types';

/**
 * Reports module manifest (Module 5 — Reports & Exports).
 *
 * Permissions:
 *   - view: see the catalog + run the standard reports.
 *   - export_payroll: run the Payoneer payroll-advice file — the one
 *     report that emits bank/payout identifiers, so it's a higher-trust
 *     grant than plain `view`. The download endpoint is gated on `view`;
 *     the service re-checks each report's own required permission, so a
 *     viewer without `export_payroll` can run everything except the
 *     Payoneer advice.
 *   - manage_schedule: control the automated monthly report email.
 *
 * The monthly scheduled report (💡 §7) is declared as a scheduledJob so
 * the registry surface is accurate; the BullMQ wiring lives in
 * `report-scheduler.service.ts`.
 */
export const reportsManifest: ModuleManifest = {
  key: 'reports',
  name: 'Reports & Exports',
  permissions: [
    { action: 'view', description: 'View the report catalog and run standard reports' },
    {
      action: 'export_payroll',
      description: 'Generate the Payoneer payroll-advice file (contains payout identifiers)',
    },
    { action: 'manage_schedule', description: 'Manage the automated monthly report email' },
  ],
  navItems: [
    {
      label: 'Reports',
      path: '/reports',
      icon: 'FileBarChart',
      requires: 'reports:view',
      group: 'Commission & Payroll',
      order: 40,
    },
  ],
  scheduledJobs: [
    {
      name: 'reports.monthly-summary',
      cron: '0 6 1 * *',
      handler: 'runMonthlySummary',
    },
  ],
  auditedEntities: ['Report'],
  defaultRolePermissions: [
    { roleSlug: 'super_admin', actions: ['view', 'export_payroll', 'manage_schedule'] },
    { roleSlug: 'finance_manager', actions: ['view', 'export_payroll', 'manage_schedule'] },
    { roleSlug: 'hr_admin', actions: ['view', 'export_payroll'] },
    { roleSlug: 'department_manager', actions: ['view'] },
  ],
};
