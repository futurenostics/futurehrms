/**
 * Trigger evaluator — the event-bus side of the reminders pipeline.
 *
 * Listens to `**` (every event the bus delivers) and, for each event,
 * walks the set of active+enabled event-based reminder rules whose
 * `triggerSpec.eventType` matches. For each match:
 *
 *   1. Optionally evaluate `triggerSpec.conditions` against the event's
 *      source entity (hydrated from the payload).
 *   2. Resolve recipients via the rule's recipientResolver.
 *   3. Insert one Reminder row per recipient with `scheduledFor=now`
 *      so the next scheduler tick fires it.
 *
 * Event rules don't schedule ahead. "N days before X" lives on cron
 * rules with the in_exactly_days / anniversary_in_exactly_days
 * operators.
 */
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { EventBusService, type DomainEvent } from '../../core/events/event-bus.service';
import {
  RecipientResolverRegistry,
  computeReminderDedupeKey,
  readRecipientEntries,
  type ResolverSource,
} from './recipient-resolver';
import type { EventTriggerSpec, TriggerSpec } from './reminder-trigger.types';
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
    // Event rules always fire at the event moment. "N days before"
    // semantics moved to cron rules with the in_exactly_days /
    // anniversary_in_exactly_days operators on date fields.
    const scheduledFor = new Date();

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
      data: recipients.map((recipientUserId) => {
        const sourceType = source?.kind ?? null;
        const sourceId = source?.id ?? null;
        return {
          ruleId: rule.id,
          recipientUserId,
          sourceType,
          sourceId,
          scheduledFor,
          status: 'scheduled' as const,
          payload: payload as never,
          dedupeKey: computeReminderDedupeKey({
            ruleId: rule.id,
            recipientUserId,
            sourceType,
            sourceId,
            scheduledFor,
          }),
        };
      }),
      // Idempotent — duplicate event fires hit the unique
      // `dedupeKey` and silently no-op.
      skipDuplicates: true,
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
