import { redirect } from 'next/navigation';

/**
 * Legacy `/reminder-rules/new` deep-link — the editor sheet now opens
 * over the rules list via `?sheet=create` so the list stays mounted.
 */
export default function LegacyNewReminderRuleRedirect() {
  redirect('/reminder-rules?sheet=create');
}
