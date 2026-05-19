'use client';

import { redirect, useParams } from 'next/navigation';

/**
 * /reminder-rules/:id — rule view today is the editor sheet itself,
 * which now opens over the rules list (`?sheet=edit&id=…`) so the
 * list stays mounted underneath.
 */
export default function ReminderRuleDetailPage() {
  const params = useParams();
  const id = String(params.id);
  redirect(`/reminder-rules?sheet=edit&id=${encodeURIComponent(id)}`);
}
