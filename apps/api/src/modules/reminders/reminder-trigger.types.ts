import { z } from 'zod';
import { conditionGroupSchema } from './reminder-conditions.types';

/**
 * Trigger spec shape. Stored in `ReminderRule.triggerSpec` as JSON.
 *
 * Two flavors, discriminated by the owning rule's `triggerType`:
 *
 * ### Event-based ({@link EventTriggerSpec})
 * "When event X fires, fire the reminder for the source entity it
 * carries — optionally filtered by a condition tree against that
 * entity." Event rules fire immediately, never on a schedule offset.
 * "N days before X" use cases live on cron rules with date
 * operators (`in_exactly_days`, `anniversary_in_exactly_days`).
 *
 * ### Cron-based ({@link CronTriggerSpec})
 * "On this cron, evaluate this query and fire reminders for matches."
 *
 * Example: birthdays — `cron='0 9 * * *'` (every day 9 AM TZ),
 * `query.kind='birthday'`. Built-in queries are listed in the
 * `query.kind` enum; we keep the shape extensible by allowing
 * additional fields per kind without a migration.
 */

export const eventTriggerSpecSchema = z
  .object({
    kind: z.literal('event'),
    /** Fully-qualified event type to listen for. Must be in the catalog. */
    eventType: z.string().min(1),
    /**
     * Optional filter tree applied after the event fires — only
     * entities matching all conditions schedule a reminder. Absent
     * / null → fire for every matched entity.
     */
    conditions: conditionGroupSchema.optional().nullable(),
  })
  .strict();
export type EventTriggerSpec = z.infer<typeof eventTriggerSpecSchema>;

export const cronTriggerSpecSchema = z.object({
  kind: z.literal('cron'),
  /** Standard 5-field cron, evaluated in `Asia/Karachi` by the scheduler. */
  cron: z.string().min(1),
  /**
   * NEW preferred path. When set, the scheduler scans all rows of
   * this entity at each matching tick and applies the rule's
   * `conditions` tree. Replaces the legacy fixed `query` kinds.
   */
  sourceEntity: z.enum(['employee', 'project']).optional().nullable(),
  /**
   * LEGACY built-in queries. Kept for back-compat reads of rules
   * created before sourceEntity landed. New rules write
   * `sourceEntity` + `conditions` instead.
   *
   * Built-ins:
   *   - `birthday`         : Employees whose dateOfBirth matches today (MM-DD)
   *   - `document-expiring`: EmployeeDocuments with expiresAt in `withinDays` days
   *   - `probation-ending` : Employees with probationEndDate in `withinDays` days
   *   - `work-anniversary` : Employees whose joinDate matches today (MM-DD)
   *   - `custom`           : Reserved — Phase 3 doesn't ship custom queries
   */
  query: z
    .discriminatedUnion('kind', [
      z.object({ kind: z.literal('birthday') }),
      z.object({
        kind: z.literal('document-expiring'),
        withinDays: z.coerce.number().int().positive().max(365),
      }),
      z.object({
        kind: z.literal('probation-ending'),
        withinDays: z.coerce.number().int().positive().max(365),
      }),
      z.object({ kind: z.literal('work-anniversary') }),
      z.object({ kind: z.literal('custom'), spec: z.record(z.string(), z.unknown()) }),
    ])
    .optional()
    .nullable(),
  /**
   * Optional filter tree applied after the cron candidate list is
   * assembled — only entities matching all conditions schedule a
   * reminder. Absent / null → fire for every candidate.
   */
  conditions: conditionGroupSchema.optional().nullable(),
});
export type CronTriggerSpec = z.infer<typeof cronTriggerSpecSchema>;

export const triggerSpecSchema = z.discriminatedUnion('kind', [
  eventTriggerSpecSchema,
  cronTriggerSpecSchema,
]);
export type TriggerSpec = z.infer<typeof triggerSpecSchema>;
