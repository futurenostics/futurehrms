import { ModuleManifest } from '../../core/registry/types';

/**
 * Notifications module manifest.
 *
 * The module provides the dependable backend service that Reminders
 * and Approvals call. It does not register nav items or dashboard
 * widgets in Phase 3 — the bell icon lives in the topbar (not the
 * sidebar) and the full Notifications Center page is deferred until
 * the Personal Settings build.
 *
 * Permissions:
 *   - view_own       : list + read + dismiss own notifications
 *   - view_all_admin : admin / debug view across recipients
 *   - mark_read      : implied by view_own for own; admin-only for others
 *   - send_arbitrary : send a notification not tied to a domain event
 *                      (super admin only — for testing / runbooks)
 *
 * Audited entities:
 *   - Notification : status transitions land in AuditLog via the Prisma
 *     middleware (read/dismiss writes). The initial send is also
 *     surfaced via the `notification.sent` domain event.
 */
export const notificationsManifest: ModuleManifest = {
  key: 'notifications',
  name: 'Notifications',
  permissions: [
    { action: 'view_own', description: 'View, read, and dismiss own notifications' },
    {
      action: 'view_all_admin',
      description: 'View notifications across recipients (admin / debug)',
    },
    { action: 'mark_read', description: 'Mark someone else’s notification as read (admin)' },
    {
      action: 'send_arbitrary',
      description:
        'Send a notification not tied to a domain event — super admin only, for runbooks',
    },
  ],
  navItems: [],
  dashboardWidgets: [],
  auditedEntities: ['Notification'],
  defaultRolePermissions: [
    { roleSlug: 'employee', actions: ['view_own'] },
    { roleSlug: 'team_lead', actions: ['view_own'] },
    { roleSlug: 'department_manager', actions: ['view_own'] },
    { roleSlug: 'hr_admin', actions: ['view_own', 'view_all_admin', 'mark_read'] },
    { roleSlug: 'finance_manager', actions: ['view_own'] },
  ],
};
