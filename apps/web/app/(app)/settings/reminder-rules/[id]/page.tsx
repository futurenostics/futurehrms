'use client';

import { redirect, useParams } from 'next/navigation';

/**
 * /settings/reminder-rules/:id — rule view today is the editor sheet
 * itself (the design doesn't show a separate detail page). Redirect
 * to /edit so HR has a single canonical surface for inspecting and
 * mutating a rule.
 */
export default function ReminderRuleDetailPage() {
  const params = useParams();
  const id = String(params.id);
  redirect(`/settings/reminder-rules/${id}/edit`);
}
