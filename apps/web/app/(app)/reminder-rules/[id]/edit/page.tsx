'use client';

import { redirect, useParams } from 'next/navigation';

/**
 * Legacy `/reminder-rules/:id/edit` deep-link — the editor sheet now
 * opens over the rules list via `?sheet=edit&id=…` so the list stays
 * mounted underneath.
 */
export default function LegacyEditReminderRuleRedirect() {
  const params = useParams();
  const id = String(params.id);
  redirect(`/reminder-rules?sheet=edit&id=${encodeURIComponent(id)}`);
}
