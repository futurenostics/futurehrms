import type { NotificationTypeDefinition } from '../notifications/notification-types.registry';

/**
 * Notification types owned by the Commissions module.
 *
 * Sent to each commission recipient (the employee) when their monthly
 * run is approved and again when it's locked for payout. Both default
 * to in-app + email, so the "email dispatch on approval & disbursement"
 * requirement is satisfied through the shared notification pipeline
 * (which also honours per-user channel preferences).
 */
export const COMMISSIONS_NOTIFICATION_TYPES: NotificationTypeDefinition[] = [
  {
    key: 'commissions.run-approved',
    name: 'Commission approved',
    description: 'Sent to each recipient when their monthly commission run is approved.',
    severity: 'info',
    defaultChannels: ['in_app', 'email'],
    titleTemplate: 'Your {{monthLabel}} commission is approved',
    bodyTemplate:
      'Your commission for {{monthLabel}} has been approved: ${{amountUsd}}. ' +
      'It will be released once the run is locked for disbursement.',
    linkTemplate: '/dashboard',
    module: 'commissions',
  },
  {
    key: 'commissions.run-disbursed',
    name: 'Commission disbursed',
    description: 'Sent to each recipient when their monthly commission run is locked for payout.',
    severity: 'success',
    defaultChannels: ['in_app', 'email'],
    titleTemplate: 'Your {{monthLabel}} commission has been disbursed',
    bodyTemplate:
      'Your commission for {{monthLabel}} (${{amountUsd}}) has been locked and is being disbursed.',
    linkTemplate: '/dashboard',
    module: 'commissions',
  },
];
