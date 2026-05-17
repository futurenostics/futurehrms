import { ModuleManifest } from '../../core/registry/types';

/**
 * Projects module manifest.
 *
 * Permissions split between:
 *   - reads gated by scope: view_own (assigned only), view_team
 *     (own scoped departments), view_all (HR-wide)
 *   - writes: create, update, delete, change_status, assign_roles,
 *     override (overrides flip the project's commission contract
 *     away from rule defaults, so it's a higher-trust action than
 *     plain update).
 *
 * navItems mirror what the sidebar's static nav-config still ships
 * today; once the manifest aggregator lands (Phase 1.5) the FE will
 * read these directly.
 *
 * auditedEntities: every write to Project, ProjectAssignment, and
 * ProjectCategory generates an AuditLog row via the Phase 0 prisma
 * middleware.
 */
export const projectsManifest: ModuleManifest = {
  key: 'projects',
  name: 'Projects',
  permissions: [
    { action: 'view_own', description: 'View projects the user is assigned to' },
    {
      action: 'view_team',
      description: 'View projects belonging to the user’s scoped departments',
    },
    { action: 'view_all', description: 'View every project across the organization' },
    { action: 'create', description: 'Create new projects' },
    { action: 'update', description: 'Update project fields' },
    { action: 'delete', description: 'Soft-delete (archive) projects' },
    { action: 'change_status', description: 'Transition project status' },
    {
      action: 'assign_roles',
      description: 'Add, change, or remove role assignments on a project',
    },
    {
      action: 'override',
      description:
        'Override the project’s default commission percentages — requires a reason and is audited',
    },
    { action: 'manage_categories', description: 'Create and edit the project category taxonomy' },
  ],
  navItems: [
    {
      label: 'Projects',
      path: '/projects',
      icon: 'Briefcase',
      requires: 'projects:view_own',
      group: 'Commission & Payroll',
      order: 10,
    },
    {
      label: 'Project Categories',
      path: '/projects/categories',
      icon: 'Tags',
      requires: 'projects:manage_categories',
      group: 'Commission & Payroll',
      order: 11,
    },
  ],
  dashboardWidgets: [
    {
      key: 'projects.my_active',
      title: 'My active projects',
      requires: 'projects:view_own',
      order: 20,
    },
    {
      key: 'projects.top_this_month',
      title: 'Top projects this month',
      requires: 'projects:view_all',
      order: 30,
    },
  ],
  auditedEntities: ['Project', 'ProjectAssignment', 'ProjectCategory'],
  defaultRolePermissions: [
    { roleSlug: 'employee', actions: ['view_own'] },
    { roleSlug: 'team_lead', actions: ['view_own', 'view_team'] },
    {
      roleSlug: 'department_manager',
      actions: ['view_own', 'view_team', 'create', 'update', 'assign_roles', 'change_status'],
    },
    {
      roleSlug: 'hr_admin',
      actions: [
        'view_own',
        'view_team',
        'view_all',
        'create',
        'update',
        'delete',
        'change_status',
        'assign_roles',
        'override',
        'manage_categories',
      ],
    },
    {
      roleSlug: 'finance_manager',
      actions: ['view_own', 'view_team', 'view_all'],
    },
  ],
};
