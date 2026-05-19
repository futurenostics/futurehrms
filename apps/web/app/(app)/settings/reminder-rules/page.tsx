import { redirect } from 'next/navigation';

/**
 * Legacy `/settings/reminder-rules` URL — reminder rules graduated
 * from settings to a top-level feature (peer of `/commission-rules`).
 * Server-redirect keeps existing notification CTAs and bookmarks
 * working.
 */
export default function LegacyReminderRulesRedirect() {
  redirect('/reminder-rules');
}
