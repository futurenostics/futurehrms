/**
 * Reminder tasks (Reminders module).
 *
 * A task is spawned when a task-generating reminder fires (probation /
 * internship / performance-review types). It has an open/completed
 * lifecycle and a due date; the scheduler re-notifies the assignee on a
 * cadence until it's done. This is the "evaluation form uncompleted →
 * follow up until completion" + "HR dashboard lists pending tasks" side
 * of the spec.
 */
import { z } from 'zod';

export const reminderTaskStatusSchema = z.enum(['open', 'completed', 'cancelled']);
export type ReminderTaskStatus = z.infer<typeof reminderTaskStatusSchema>;

export const reminderTaskPublicSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  ruleName: z.string().nullable(),
  notificationType: z.string(),
  assigneeUserId: z.string(),
  assigneeName: z.string().nullable(),
  sourceType: z.string().nullable(),
  sourceId: z.string().nullable(),
  /** Resolved label for the subject (usually the employee's name). */
  subjectLabel: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  dueDate: z.string(),
  followUpEveryDays: z.number().int(),
  status: reminderTaskStatusSchema,
  overdue: z.boolean(),
  followUpCount: z.number().int().nonnegative(),
  lastFollowUpAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  completedByName: z.string().nullable(),
  completionNote: z.string().nullable(),
  createdAt: z.string(),
});
export type ReminderTaskPublic = z.infer<typeof reminderTaskPublicSchema>;

export const reminderTaskListQuerySchema = z.object({
  status: reminderTaskStatusSchema.optional(),
  /** Only tasks assigned to the caller. */
  mine: z.coerce.boolean().optional(),
  /** Only overdue open tasks. */
  overdue: z.coerce.boolean().optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type ReminderTaskListQuery = z.infer<typeof reminderTaskListQuerySchema>;

export const reminderTaskListResponseSchema = z.object({
  items: z.array(reminderTaskPublicSchema),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
  /** Convenience counts for the HR queue header. */
  openCount: z.number().int().nonnegative(),
  overdueCount: z.number().int().nonnegative(),
});
export type ReminderTaskListResponse = z.infer<typeof reminderTaskListResponseSchema>;

export const reminderTaskCompleteSchema = z.object({
  note: z.string().trim().max(1000).optional(),
});
export type ReminderTaskCompleteInput = z.infer<typeof reminderTaskCompleteSchema>;

export const reminderTaskCancelSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});
export type ReminderTaskCancelInput = z.infer<typeof reminderTaskCancelSchema>;
