'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { RuleEditorSheet } from '@/components/reminders/rule-editor-sheet';

/**
 * /settings/reminder-rules/:id/edit — opens the editor sheet in
 * edit mode. Closing the sheet bounces back to the rules list.
 */
export default function EditReminderRulePage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);
  return (
    <AppShell breadcrumbs={[{ label: 'Reminders' }, { label: 'Rules' }, { label: 'Edit' }]}>
      <RuleEditorSheet
        open
        mode="edit"
        ruleId={id}
        onOpenChange={(next) => {
          if (!next) router.push('/settings/reminder-rules');
        }}
      />
    </AppShell>
  );
}
