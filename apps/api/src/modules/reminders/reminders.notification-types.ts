import type { NotificationTypeDefinition } from '../notifications/notification-types.registry';

/**
 * Notification types owned by the Reminders module.
 *
 * Each key maps 1:1 to a rule's `notificationType` field. The friendly
 * names match the design's "Email template" column.
 */
export const REMINDERS_NOTIFICATION_TYPES: NotificationTypeDefinition[] = [
  {
    key: 'reminders.probation-ending',
    name: 'Probation ending',
    description: 'Fires N days before an employee’s probationEndDate.',
    severity: 'warning',
    defaultChannels: ['in_app', 'email'],
    titleTemplate: 'Probation ending soon: {{fullName}}',
    bodyTemplate:
      '{{fullName}}’s probation ends on {{probationEndDate}}. Confirm whether the employee is moving to permanent status or needs an extension.',
    linkTemplate: '/employees/{{employeeId}}',
    module: 'reminders',
  },
  {
    key: 'reminders.internship-ending',
    name: 'Internship ending',
    description: 'Fires N days before an intern’s internshipEndDate.',
    severity: 'warning',
    defaultChannels: ['in_app', 'email'],
    titleTemplate: 'Internship ending: {{fullName}}',
    bodyTemplate:
      '{{fullName}}’s internship ends on {{internshipEndDate}}. Confirm conversion to FTE or scheduled offboarding.',
    linkTemplate: '/employees/{{employeeId}}',
    module: 'reminders',
  },
  {
    key: 'reminders.annual-review',
    name: 'Annual review',
    description: 'Fires N days before an employee’s annual review window.',
    severity: 'info',
    defaultChannels: ['in_app', 'email'],
    titleTemplate: 'Annual review window opens for {{fullName}}',
    bodyTemplate:
      'Schedule {{fullName}}’s annual review. The review window opens shortly — coordinate with the employee and their manager.',
    linkTemplate: '/employees/{{employeeId}}',
    module: 'reminders',
  },
  {
    key: 'reminders.biannual-review',
    name: 'Biannual review',
    description: 'Fires N days before an Engineering biannual review.',
    severity: 'info',
    defaultChannels: ['in_app', 'email'],
    titleTemplate: 'Biannual review window opens for {{fullName}}',
    bodyTemplate:
      '{{fullName}} has a biannual review scheduled. Confirm reviewer assignments and goals.',
    linkTemplate: '/employees/{{employeeId}}',
    module: 'reminders',
  },
  {
    key: 'reminders.birthday',
    name: 'Birthday',
    description: 'Fires on an employee’s birthday.',
    severity: 'success',
    defaultChannels: ['in_app'],
    titleTemplate: '🎂 Today is {{fullName}}’s birthday',
    bodyTemplate: 'Say happy birthday to {{fullName}}.',
    linkTemplate: '/employees/{{employeeId}}',
    module: 'reminders',
  },
  {
    key: 'reminders.work-anniversary',
    name: 'Work anniversary',
    description: 'Fires on an employee’s joinDate anniversary.',
    severity: 'success',
    defaultChannels: ['in_app', 'email'],
    titleTemplate: '{{fullName}} celebrates {{yearsLabel}} today',
    bodyTemplate:
      'It’s {{fullName}}’s work anniversary. Send a quick note recognising their contribution.',
    linkTemplate: '/employees/{{employeeId}}',
    module: 'reminders',
  },
  {
    key: 'reminders.visa-renewal',
    name: 'Visa renewal',
    description: 'Fires 90 days before a tracked visa expiry.',
    severity: 'danger',
    defaultChannels: ['in_app', 'email'],
    titleTemplate: 'Visa expires {{visaExpiryDate}} — {{fullName}}',
    bodyTemplate:
      '{{fullName}}’s visa expires on {{visaExpiryDate}}. Start the renewal paperwork now.',
    linkTemplate: '/employees/{{employeeId}}',
    module: 'reminders',
  },
  {
    key: 'reminders.document-expiring',
    name: 'Document expiring',
    description: 'Fires when a tracked employee document is N days from expiry.',
    severity: 'warning',
    defaultChannels: ['in_app', 'email'],
    titleTemplate: 'Document expiring: {{documentKind}} — {{fullName}}',
    bodyTemplate:
      '{{fullName}}’s {{documentKind}} expires on {{expiresAt}}. Request an updated copy.',
    linkTemplate: '/employees/{{employeeId}}',
    module: 'reminders',
  },
];
