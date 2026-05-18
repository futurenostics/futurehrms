import { z } from 'zod';

/**
 * Trigger spec shape. Stored in `ReminderRule.triggerSpec` as JSON.
 *
 * Two flavors, discriminated by the owning rule's `triggerType`:
 *
 * ### Event-based ({@link EventTriggerSpec})
 * "When event X fires, schedule a reminder for N days/hours before
 * (or after) a field on the event payload."
 *
 * Example: probation ending — `eventType=employee.created`,
 * `relativeTo=probationEndDate`, `offset=-P30D` (30 days before).
 *
 * ### Cron-based ({@link CronTriggerSpec})
 * "On this cron, evaluate this query and fire reminders for matches."
 *
 * Example: birthdays — `cron='0 9 * * *'` (every day 9 AM TZ),
 * `query.kind='birthday'`. Built-in queries are listed in the
 * `query.kind` enum; we keep the shape extensible by allowing
 * additional fields per kind without a migration.
 */

export const eventTriggerSpecSchema = z.object({
  kind: z.literal('event'),
  /** Fully-qualified event type to listen for. */
  eventType: z.string().min(1),
  /**
   * Field name on the event's payload that carries the anchor date —
   * the `offset` is applied relative to this. Empty / missing field on
   * the actual event payload → the trigger no-ops for that event.
   */
  relativeTo: z.string().min(1),
  /**
   * ISO 8601 duration string with optional leading minus sign. Negative
   * = before the anchor, positive = after. Examples:
   *   `-P30D`   30 days before
   *   `-PT2H`   2 hours before
   *   `P14D`    14 days after
   */
  offset: z
    .string()
    .regex(/^-?P(?:\d+Y)?(?:\d+M)?(?:\d+W)?(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+S)?)?$/, {
      message: 'offset must be an ISO 8601 duration, optionally prefixed with -',
    }),
});
export type EventTriggerSpec = z.infer<typeof eventTriggerSpecSchema>;

export const cronTriggerSpecSchema = z.object({
  kind: z.literal('cron'),
  /** Standard 5-field cron, evaluated in `Asia/Karachi` by the scheduler. */
  cron: z.string().min(1),
  /**
   * Which built-in query the tick runs. Each kind reads from a known
   * source entity; the rule's recipientResolver decides who's notified.
   *
   * Built-ins in Phase 3:
   *   - `birthday`         : Employees whose dateOfBirth matches today (MM-DD)
   *   - `document-expiring`: EmployeeDocuments with expiresAt in `withinDays` days
   *   - `probation-ending` : Employees with probationEndDate in `withinDays` days
   *   - `work-anniversary` : Employees whose joinDate matches today (MM-DD)
   *   - `custom`           : Reserved — Phase 3 doesn't ship custom queries
   */
  query: z.discriminatedUnion('kind', [
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
  ]),
});
export type CronTriggerSpec = z.infer<typeof cronTriggerSpecSchema>;

export const triggerSpecSchema = z.discriminatedUnion('kind', [
  eventTriggerSpecSchema,
  cronTriggerSpecSchema,
]);
export type TriggerSpec = z.infer<typeof triggerSpecSchema>;

/**
 * Apply an ISO 8601 duration offset (with optional leading `-`) to a
 * Date. Returns a new Date. Throws on malformed input — callers should
 * have validated via the schema.
 */
export function applyOffset(base: Date, offset: string): Date {
  const m =
    /^(-?)P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(
      offset,
    );
  if (!m) throw new Error(`Invalid offset: ${offset}`);
  const sign = m[1] === '-' ? -1 : 1;
  const years = Number(m[2] ?? 0);
  const months = Number(m[3] ?? 0);
  const weeks = Number(m[4] ?? 0);
  const days = Number(m[5] ?? 0);
  const hours = Number(m[6] ?? 0);
  const mins = Number(m[7] ?? 0);
  const secs = Number(m[8] ?? 0);

  const d = new Date(base);
  if (years) d.setUTCFullYear(d.getUTCFullYear() + sign * years);
  if (months) d.setUTCMonth(d.getUTCMonth() + sign * months);
  const dayMs = 24 * 60 * 60 * 1000;
  d.setTime(d.getTime() + sign * (weeks * 7 * dayMs + days * dayMs));
  d.setTime(d.getTime() + sign * (hours * 3600_000 + mins * 60_000 + secs * 1_000));
  return d;
}
