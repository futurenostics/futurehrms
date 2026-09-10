import { ModuleManifest } from '../../core/registry/types';

/**
 * Attendance module manifest.
 *
 * This phase ships the schema + this manifest/module/scope skeleton
 * only — no controller yet. Permissions are scoped per ADR 0002
 * (view_own / view_team / view_all), the same pattern Employees and
 * Projects already use.
 *
 * `approve_correction` is deliberately a single permission, not
 * per-level (Line Manager / HR / HOD). The underlying Approval engine
 * already supports multi-stage chains (see docs/DECISIONS.md), so
 * splitting this into approve_l1 / approve_l2 / approve_l3 later is an
 * additive change to the approval-type definition, not a schema or
 * permission-model change.
 *
 * Role mapping agreed for this module (FlowHCM-style role -> existing
 * role): Line Manager -> team_lead, HR Manager -> hr_admin,
 * Department Head -> department_manager, Upper Management ->
 * super_admin (which gets every permission automatically via
 * RegistryService — no explicit entry needed here).
 *
 * navItems / dashboardWidgets / approvables are intentionally left
 * empty — added once the corresponding UI and approval-type
 * registration exist.
 */
export const attendanceManifest: ModuleManifest = {
  key: 'attendance',
  name: 'Attendance',
  permissions: [
    { action: 'view_own', description: 'View own attendance records' },
    {
      action: 'view_team',
      description: 'View attendance records for the user’s scoped departments',
    },
    { action: 'view_all', description: 'View attendance records across the organization' },
    { action: 'punch', description: 'Record own check-in / check-out' },
    { action: 'submit_correction', description: 'Raise an attendance correction request' },
    {
      action: 'approve_correction',
      description: 'Approve or reject an attendance correction request',
    },
    { action: 'manage_shifts', description: 'Create, edit, and assign shifts' },
    {
      action: 'manage_policies',
      description: 'Create and edit attendance policies and company holidays',
    },
  ],
  navItems: [],
  dashboardWidgets: [],
  auditedEntities: [
    'AttendanceRecord',
    'AttendanceCorrectionRequest',
    'Shift',
    'ShiftAssignment',
    'AttendancePolicy',
    'Holiday',
  ],
  defaultRolePermissions: [
    { roleSlug: 'employee', actions: ['view_own', 'punch', 'submit_correction'] },
    {
      roleSlug: 'team_lead',
      actions: ['view_own', 'view_team', 'punch', 'submit_correction', 'approve_correction'],
    },
    {
      roleSlug: 'department_manager',
      actions: ['view_own', 'view_team', 'punch', 'submit_correction'],
    },
    {
      roleSlug: 'hr_admin',
      actions: [
        'view_own',
        'view_team',
        'view_all',
        'punch',
        'submit_correction',
        'approve_correction',
        'manage_shifts',
        'manage_policies',
      ],
    },
  ],
};
