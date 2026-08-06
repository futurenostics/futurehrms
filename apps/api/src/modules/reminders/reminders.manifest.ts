import { ModuleManifest } from '../../core/registry/types';

/**
 * Reminders module manifest.
 *
 * Permissions split between rule-management (HR Admin) and scheduled-
 * reminders visibility (HR Admin + Super Admin). `trigger_test` is
 * scoped narrowly so non-admins can dry-run a rule without affecting
 * other recipients — the test fires only to the caller.
 *
 * Event subscriptions: declared as `**` (wildcard) because the
 * trigger evaluator (Session 3) needs to see every event the bus
 * delivers. The wildcard pattern is already enabled on the
 * EventEmitter2 config (events.module.ts).
 *
 * Scheduled jobs: hourly tick that evaluates time-based rules. The
 * actual worker is wired in Session 3.
 *
 * Audited entities: ReminderRule + Reminder so publish + fire + cancel
 * actions land in the AuditLog via the Prisma middleware.
 */
export const remindersManifest: ModuleManifest = {
  key: 'reminders',
  name: 'Reminders',
  permissions: [
    { action: 'view_rules', description: 'View reminder rules and their version history' },
    { action: 'create_rule', description: 'Create a draft reminder rule' },
    { action: 'update_rule', description: 'Update a draft reminder rule' },
    {
      action: 'publish_rule',
      description: 'Publish a draft rule (supersedes the previous version)',
    },
    { action: 'archive_rule', description: 'Archive an active rule (stops future scheduling)' },
    { action: 'view_scheduled', description: 'View scheduled reminders (debug / runbook)' },
    {
      action: 'trigger_test',
      description: 'Manually fire a rule for testing — only sends to the caller',
    },
    {
      action: 'manage_recipient_resolvers',
      description:
        'Reserved for future custom-resolver registration. Phase 3 ships built-in resolvers only.',
    },
    {
      action: 'view_tasks',
      description: 'View the full reminder-task queue (all assignees), not just your own',
    },
    {
      action: 'complete_tasks',
      description: 'Complete or cancel any reminder task (not only your own)',
    },
  ],
  navItems: [
    {
      label: 'Reminder Rules',
      path: '/settings/reminder-rules',
      icon: 'BellRing',
      requires: 'reminders:view_rules',
      group: 'Reminders & Reviews',
      order: 10,
    },
    {
      label: 'Reminder Tasks',
      path: '/reminder-tasks',
      icon: 'ClipboardCheck',
      requires: 'reminders:view_tasks',
      group: 'Reminders & Reviews',
      order: 15,
    },
  ],
  scheduledJobs: [
    {
      name: 'reminders.tick',
      cron: '*/15 * * * *',
      handler: 'tick',
    },
  ],
  eventSubscriptions: [{ event: '**', handler: 'onAnyEvent' }],
  auditedEntities: ['ReminderRule', 'Reminder', 'ReminderTask'],
  defaultRolePermissions: [
    { roleSlug: 'employee', actions: [] },
    { roleSlug: 'team_lead', actions: ['view_rules'] },
    { roleSlug: 'department_manager', actions: ['view_rules'] },
    {
      roleSlug: 'hr_admin',
      actions: [
        'view_rules',
        'create_rule',
        'update_rule',
        'publish_rule',
        'archive_rule',
        'view_scheduled',
        'trigger_test',
        'view_tasks',
        'complete_tasks',
      ],
    },
    { roleSlug: 'finance_manager', actions: ['view_rules'] },
  ],
};
