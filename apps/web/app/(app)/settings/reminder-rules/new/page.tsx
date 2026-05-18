'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { RuleEditorSheet } from '@/components/reminders/rule-editor-sheet';

/**
 * /settings/reminder-rules/new — opens the editor sheet in create mode.
 * Closing the sheet bounces back to the rules list.
 */
export default function NewReminderRulePage() {
  const router = useRouter();
  return (
    <AppShell breadcrumbs={[{ label: 'Reminders' }, { label: 'Rules' }, { label: 'New rule' }]}>
      <RuleEditorSheet
        open
        mode="create"
        ruleId={null}
        onOpenChange={(next) => {
          if (!next) router.push('/settings/reminder-rules');
        }}
      />
    </AppShell>
  );
}
