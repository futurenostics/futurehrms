import { ModuleManifest } from '../../core/registry/types';

/**
 * Settings module manifest — Layer 1 "Company Configuration"
 * (docs/ROADMAP.md, docs/layer-1-company-configuration.md).
 *
 * Permission keys for every Layer 1 sub-feature are declared up front,
 * even though this PR only ships Departments' endpoints — designations
 * (job titles), roles, and user accounts land in later Layer 1 pieces,
 * and declaring their keys now means the `defaultRolePermissions`
 * bindings below (and any seed data referencing them) keep working as
 * each piece's controller/service is added, rather than pointing at
 * permissions that don't exist yet.
 *
 * Company profile (1.4) and employee statuses (1.3) are NOT declared
 * here yet — they weren't part of the original Departments build and
 * get their own permission keys when those pieces are implemented.
 *
 * Setup vs Operations split (docs/layer-1-company-configuration.md
 * "Who does this work, and where it lives"): departments + designations
 * are Operations work, owned by HR Admin. Roles + user accounts are
 * Setup work, done rarely, at install — Super Admin only (Super Admin
 * gets every permission automatically via RegistryService, so no
 * explicit binding is needed for it here).
 */
export const settingsManifest: ModuleManifest = {
  key: 'settings',
  name: 'Settings',
  permissions: [
    { action: 'departments:view', description: 'View departments' },
    {
      action: 'departments:manage',
      description: 'Create, rename, hide, and restore departments',
    },
    { action: 'designations:view', description: 'View job titles' },
    {
      action: 'designations:manage',
      description: 'Create, rename, hide, and restore job titles',
    },
    { action: 'roles:view', description: 'View roles' },
    { action: 'roles:manage', description: 'Create and edit roles' },
    { action: 'permissions:view', description: 'View the permissions catalog' },
    { action: 'users:view', description: 'View user accounts' },
    {
      action: 'users:manage',
      description: 'Create, deactivate, and reset user accounts',
    },
  ],
  navItems: [
    {
      label: 'Departments',
      path: '/settings/departments',
      icon: 'Building2',
      requires: 'settings:departments:view',
      group: 'HR Core',
      order: 30,
    },
  ],
  settingsPages: [
    {
      key: 'departments',
      label: 'Departments',
      path: '/settings/departments',
      requires: 'settings:departments:view',
      group: 'Organization',
      order: 20,
    },
  ],
  auditedEntities: ['Department'],
  defaultRolePermissions: [
    {
      roleSlug: 'hr_admin',
      actions: [
        'departments:view',
        'departments:manage',
        'designations:view',
        'designations:manage',
        'users:view',
      ],
    },
  ],
};
