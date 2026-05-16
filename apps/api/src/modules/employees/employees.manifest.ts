import { ModuleManifest } from '../../core/registry/types';

/**
 * Employees module manifest.
 *
 * Declared permissions land in the `Permission` table on first boot via
 * the RegistryService. Nav items + dashboard widgets surface to the
 * frontend after the manifest aggregator (Phase 1.5) ships; for now
 * the sidebar's static nav config mirrors the same items as a fallback
 * so the experience is unchanged until the aggregator is wired.
 *
 * `auditedEntities` extends the Phase 0 set; writes to Employee,
 * SalaryHistory, and EmployeeDocument are mirrored to AuditLog by the
 * Prisma middleware installed in core/audit.
 */
export const employeesManifest: ModuleManifest = {
  key: 'employees',
  name: 'Employees',
  permissions: [
    { action: 'view_own', description: 'View own employee profile' },
    {
      action: 'view_team',
      description:
        'View employees within managed departments (department manager / team lead scope)',
    },
    { action: 'view_all', description: 'View every employee (HR-wide)' },
    {
      action: 'view_salary',
      description: 'View salary fields on employee profiles and the salary history',
    },
    {
      action: 'view_pii',
      description: 'View full PII (unmasked CNIC, full date of birth) — audited on read',
    },
    { action: 'create', description: 'Create new employees' },
    { action: 'update', description: 'Edit employee profile fields' },
    { action: 'delete', description: 'Archive (soft-delete) employees' },
    { action: 'change_status', description: 'Change an employee status' },
    { action: 'change_manager', description: 'Change an employee manager' },
    { action: 'change_salary', description: 'Change an employee salary' },
    { action: 'import', description: 'Bulk import employees via CSV' },
    { action: 'export', description: 'Export employees to CSV' },
  ],
  navItems: [
    {
      label: 'Employees',
      path: '/employees',
      icon: 'Users',
      requires: 'employees:view_team',
      group: 'HR Core',
      order: 10,
    },
    {
      label: 'Org Chart',
      path: '/employees/org',
      icon: 'Network',
      requires: 'employees:view_team',
      group: 'HR Core',
      order: 20,
    },
  ],
  dashboardWidgets: [
    {
      key: 'employees.total',
      title: 'Total Employees',
      requires: 'employees:view_all',
      order: 10,
    },
  ],
  auditedEntities: ['Employee', 'SalaryHistory', 'EmployeeDocument'],
  defaultRolePermissions: [
    {
      roleSlug: 'hr_admin',
      actions: [
        'view_all',
        'view_team',
        'view_own',
        'view_salary',
        'view_pii',
        'create',
        'update',
        'delete',
        'change_status',
        'change_manager',
        'change_salary',
        'import',
        'export',
      ],
    },
    {
      roleSlug: 'finance_manager',
      actions: ['view_all', 'view_team', 'view_salary', 'export'],
    },
    {
      roleSlug: 'department_manager',
      actions: ['view_team', 'view_own', 'change_status', 'change_manager'],
    },
    {
      roleSlug: 'team_lead',
      actions: ['view_team', 'view_own'],
    },
    {
      roleSlug: 'employee',
      actions: ['view_own'],
    },
  ],
};
