import { ModuleManifest } from '../../core/registry/types';

/**
 * Management Dashboard manifest (Module 7).
 *
 * A single permission gates the company-wide financial/operational
 * snapshot. Bound to Super Admin + Finance Manager by default — the two
 * roles §9 names. Everyone else keeps the personal dashboard widgets.
 */
export const dashboardManifest: ModuleManifest = {
  key: 'dashboard',
  name: 'Management Dashboard',
  permissions: [
    {
      action: 'view_management',
      description: 'View the company-wide management dashboard (KPIs, charts, activity)',
    },
  ],
  defaultRolePermissions: [
    { roleSlug: 'super_admin', actions: ['view_management'] },
    { roleSlug: 'finance_manager', actions: ['view_management'] },
  ],
};
