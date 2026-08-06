/**
 * Which notification types spawn a follow-up task, and with what
 * cadence. Keyed by `ReminderRule.notificationType` — the "task-ness"
 * is a property of the reminder kind (a probation reminder inherently
 * creates a review task), so no per-rule config or schema change is
 * needed. When one of these fires, the scheduler opens a ReminderTask
 * and re-notifies the assignee every `followUpEveryDays` until it's
 * completed (the spec's "send reminders until completion").
 */
export interface ReminderTaskSpec {
  /** Days from the first fire to the task's due date. */
  dueInDays: number;
  /** Re-notify the assignee this often (days) while the task stays open. */
  followUpEveryDays: number;
  /** Task title; `{{name}}` is replaced with the subject's name. */
  titleTemplate: string;
}

const TASK_SPECS: Record<string, ReminderTaskSpec> = {
  'reminders.probation-ending': {
    dueInDays: 7,
    followUpEveryDays: 2,
    titleTemplate: 'Complete probation evaluation for {{name}}',
  },
  'reminders.internship-ending': {
    dueInDays: 7,
    followUpEveryDays: 2,
    titleTemplate: 'Complete internship review for {{name}}',
  },
  'reminders.annual-review': {
    dueInDays: 14,
    followUpEveryDays: 3,
    titleTemplate: 'Complete annual performance review for {{name}}',
  },
  'reminders.biannual-review': {
    dueInDays: 14,
    followUpEveryDays: 3,
    titleTemplate: 'Complete biannual performance review for {{name}}',
  },
  'reminders.increment-eligibility': {
    dueInDays: 14,
    followUpEveryDays: 5,
    titleTemplate: 'Review increment eligibility for {{name}}',
  },
};

export function taskSpecFor(notificationType: string): ReminderTaskSpec | null {
  return TASK_SPECS[notificationType] ?? null;
}

export function renderTaskTitle(template: string, name: string): string {
  return template.replace(/\{\{name\}\}/g, name || 'the employee');
}
