/**
 * Trigger evaluator — the event-bus side of the reminders pipeline.
 *
 * Listens to `**` (every event the bus delivers) and, for each event,
 * walks the set of active+enabled event-based reminder rules whose
 * `triggerSpec.eventType` matches. For each match:
 *
 *   1. Read `triggerSpec.relativeTo` off the event payload — this is
 *      the anchor date (e.g. `probationEndDate`).
 *   2. Apply `triggerSpec.offset` (ISO 8601, optionally negative).
 *      The result is the scheduledFor timestamp.
 *   3. Resolve recipients via the rule's recipientResolver.
 *   4. Insert one Reminder row per recipient.
 *
 * The hourly scheduler tick reads the resulting rows and fires them
 * when scheduledFor is in the past.
 */
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { EventBusService, type DomainEvent } from '../../core/events/event-bus.service';
import {
  RecipientResolverRegistry,
  readRecipientEntries,
  type ResolverSource,
} from './recipient-resolver';
import { applyOffset, type EventTriggerSpec, type TriggerSpec } from './reminder-trigger.types';
import { evaluateConditions } from './reminder-conditions.evaluator';
import { buildConditionContext } from './reminder-condition-context';

@Injectable()
export class TriggerEvaluatorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TriggerEvaluatorService.name);

  constructor(
    private readonly events: EventBusService,
    private readonly resolvers: RecipientResolverRegistry,
  ) {}

  onApplicationBootstrap(): void {
    // Wildcard subscription — `**` matches every event regardless of
    // delimiter depth. EventEmitter2 is configured with wildcards in
    // events.module.ts.
    this.events.on('**', (event) => {
      void this.handleEvent(event).catch((err) => {
        this.logger.error(`evaluator error for ${event.type}: ${(err as Error).message}`);
      });
    });
    this.logger.log('Reminder trigger evaluator listening on **');
  }

  async handleEvent(event: DomainEvent<unknown>): Promise<void> {
    // Don't recurse on our own events.
    if (event.type.startsWith('reminder.')) return;
    if (event.type.startsWith('notification.')) return;

    // Narrow at the DB level on the exact eventType via a JSON path
    // filter — saves a full-table scan + in-memory filter on every
    // event. Re-validate in JS as a defence-in-depth check (the
    // JSON filter operates on string equality; if the stored shape
    // ever drifts, we still want the right behaviour).
    const rules = await prisma.reminderRule.findMany({
      where: {
        status: 'active',
        isEnabled: true,
        triggerType: 'event',
        deletedAt: null,
        triggerSpec: {
          path: ['eventType'],
          equals: event.type,
        },
      },
    });

    const matching = rules.filter((r) => {
      const spec = r.triggerSpec as unknown as TriggerSpec;
      return spec.kind === 'event' && spec.eventType === event.type;
    });
    if (matching.length === 0) return;

    const payload = (event.payload ?? {}) as Record<string, unknown>;

    for (const rule of matching) {
      const spec = rule.triggerSpec as unknown as EventTriggerSpec;
      try {
        await this.scheduleForRule(rule, spec, payload, event.actorId);
      } catch (err) {
        this.logger.warn(
          `failed to schedule reminders for rule ${rule.key} on ${event.type}: ${(err as Error).message}`,
        );
      }
    }
  }

  private async scheduleForRule(
    rule: {
      id: string;
      key: string;
      recipientResolver: string;
      departmentId: string | null;
    } & Record<string, unknown>,
    spec: EventTriggerSpec,
    payload: Record<string, unknown>,
    actorId: string | undefined,
  ): Promise<void> {
    // Schedule offset is optional. When both `relativeTo` + `offset`
    // are set, anchor the future scheduledFor relative to a date on
    // the payload. Otherwise fire immediately (use the event time).
    let scheduledFor: Date;
    if (spec.relativeTo && spec.offset) {
      const anchor = payload[spec.relativeTo];
      if (!anchor) {
        this.logger.debug(
          `rule ${rule.key}: event payload missing field '${spec.relativeTo}' — skipping`,
        );
        return;
      }
      const anchorDate =
        anchor instanceof Date
          ? anchor
          : typeof anchor === 'string' || typeof anchor === 'number'
            ? new Date(anchor)
            : null;
      if (!anchorDate || Number.isNaN(anchorDate.getTime())) {
        this.logger.debug(
          `rule ${rule.key}: anchor field '${spec.relativeTo}' is not a date — skipping`,
        );
        return;
      }
      scheduledFor = applyOffset(anchorDate, spec.offset);
      // Don't bother inserting reminders that should have fired more
      // than 24 hours ago — the source event probably happened
      // post-hoc (manual employee.created backfill etc).
      if (scheduledFor.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
        this.logger.debug(
          `rule ${rule.key}: computed scheduledFor ${scheduledFor.toISOString()} is too far in the past — skipping`,
        );
        return;
      }
    } else {
      // No schedule offset — fire as soon as the scheduler tick picks
      // it up. Use "now" so the timeline strip groups it on today.
      scheduledFor = new Date();
    }

    // Resolve the source — every event-based rule we ship today
    // wraps an Employee. If the payload has an explicit employeeId,
    // use it; otherwise fall back to source-shaped fields the
    // events normally carry.
    const source: ResolverSource = resolveSource(payload);

    // Condition tree: hydrate the source entity once (cheap; one
    // Prisma findUnique) and run the evaluator. Absent tree =
    // match-all, so existing rules without conditions are unaffected.
    if (spec.conditions && source) {
      const context = await buildConditionContext(source);
      if (context && !evaluateConditions(spec.conditions, context)) {
        this.logger.debug(
          `rule ${rule.key}: source ${source.kind}/${source.id} failed conditions — skipping`,
        );
        return;
      }
    }

    const recipients = await this.resolvers.resolveMany(
      readRecipientEntries(rule as never),
      rule as never,
      source,
    );

    if (recipients.length === 0) {
      this.logger.debug(`rule ${rule.key}: zero recipients — skipping`);
      return;
    }

    await prisma.reminder.createMany({
      data: recipients.map((recipientUserId) => ({
        ruleId: rule.id,
        recipientUserId,
        sourceType: source?.kind ?? null,
        sourceId: source?.id ?? null,
        scheduledFor,
        status: 'scheduled' as const,
        payload: payload as never,
      })),
    });

    // Emit one summary event per rule, not per recipient — keeps
    // the audit timeline scannable.
    // Future subscribers (analytics, ops dashboards) read this.
    // The hourly tick emits `reminder.fired` per actual send.
    this.logger.log(
      `scheduled ${recipients.length} reminder(s) for rule ${rule.key} on ${scheduledFor.toISOString()}`,
    );
    void actorId;
  }
}

function resolveSource(payload: Record<string, unknown>): ResolverSource {
  if (typeof payload['employeeId'] === 'string') {
    return { kind: 'employee', id: payload['employeeId'] };
  }
  if (typeof payload['documentId'] === 'string') {
    return { kind: 'employeeDocument', id: payload['documentId'] };
  }
  return null;
}
