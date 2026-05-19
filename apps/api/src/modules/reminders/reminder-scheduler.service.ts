/**
 * Reminder scheduler — the cron + firing side of the pipeline.
 *
 * Two responsibilities, both run on the same hourly tick:
 *
 *   1. **Fire due reminders.** Any `Reminder` row with
 *      `status='scheduled'` and `scheduledFor <= now` is sent via
 *      NotificationsService and transitioned to `fired` with the
 *      resulting notificationId.
 *
 *   2. **Evaluate cron-based rules.** Active+enabled rules with
 *      `triggerType='cron'` whose cron expression matches the
 *      current tick get their built-in query run (birthday,
 *      probation-ending, etc.). Matches insert Reminder rows with
 *      `scheduledFor=now` so they fire on the same tick.
 *
 * Timezone: the cron lives in Asia/Karachi (declared in the manifest
 * + on the BullMQ repeatable job). Today's-birthday queries compare
 * the local MM-DD of the source's date field against the local
 * MM-DD of `now`, so a birthday on May 18 fires when 05-18 hits in
 * PKT — even if the underlying scheduledFor is stored UTC.
 *
 * Idempotency: the firing loop dedupes via a row-level `status`
 * transition (only `scheduled → fired` updates count). A retry of
 * the same tick can't double-send.
 */
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { Prisma, type Reminder, type ReminderRule } from '@prisma/client';
import { Queue, Worker, type Job } from 'bullmq';
import type IORedis from 'ioredis';
import { BULL_REDIS_CONNECTION } from '../../core/scheduler/scheduler.module';
import { AppConfigService } from '../../config/app.config';
import { EventBusService } from '../../core/events/event-bus.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  RecipientResolverRegistry,
  readRecipientEntries,
  type ResolverSource,
} from './recipient-resolver';
import type { CronTriggerSpec } from './reminder-trigger.types';
import { deriveScanTargets, evaluateConditions } from './reminder-conditions.evaluator';
import { buildConditionContext } from './reminder-condition-context';

const QUEUE_NAME = 'reminders';
const JOB_NAME = 'hourly-tick';
const CRON = '0 * * * *'; // top of every hour
const TZ = 'Asia/Karachi';

/** What the scheduler-status endpoint returns. */
export interface SchedulerStatus {
  cron: string;
  timezone: string;
  nextRunIso: string | null;
  lastEvaluatedAtIso: string | null;
  emailsSent30d: number;
  retriesPending: number;
  scheduledNext30d: number;
}

@Injectable()
export class ReminderSchedulerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ReminderSchedulerService.name);
  private queue?: Queue;
  private worker?: Worker;
  private lastEvaluatedAt: Date | null = null;

  constructor(
    @Inject(BULL_REDIS_CONNECTION) private readonly redis: IORedis,
    private readonly config: AppConfigService,
    private readonly notifications: NotificationsService,
    private readonly events: EventBusService,
    private readonly resolvers: RecipientResolverRegistry,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.env.NODE_ENV === 'test') return;
    this.queue = new Queue(QUEUE_NAME, { connection: this.redis });
    this.worker = new Worker(QUEUE_NAME, (job) => this.tickHandler(job), {
      connection: this.redis,
    });
    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id ?? '?'} failed: ${err.message}`, err.stack);
    });

    await this.queue.add(
      JOB_NAME,
      {},
      {
        repeat: { pattern: CRON, tz: TZ },
        jobId: 'reminders-hourly-tick',
      },
    );
    this.logger.log(`Scheduled reminder tick: '${CRON}' ${TZ} (queue=${QUEUE_NAME})`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }

  /**
   * Manual entry point — the controller's `/reminders/run-now` and
   * tests can invoke this to advance the scheduler without waiting
   * for the cron.
   */
  async tickHandler(_job?: Job): Promise<{ fired: number; scheduled: number }> {
    this.lastEvaluatedAt = new Date();
    this.logger.log('reminder tick — start');

    const [fired, scheduled] = await Promise.all([
      this.fireDueReminders(),
      this.evaluateCronRules(),
    ]);
    this.logger.log(`reminder tick — done: fired=${fired}, scheduled=${scheduled}`);
    return { fired, scheduled };
  }

  /* ---------- Firing ---------- */

  async fireDueReminders(): Promise<number> {
    const now = new Date();
    const due = await prisma.reminder.findMany({
      where: { status: 'scheduled', scheduledFor: { lte: now } },
      include: { rule: true },
      take: 500,
    });
    let fired = 0;
    for (const r of due) {
      try {
        await this.fireOne(r as Reminder & { rule: ReminderRule });
        fired += 1;
      } catch (err) {
        this.logger.error(
          `failed to fire reminder ${r.id} for rule ${r.ruleId}: ${(err as Error).message}`,
        );
      }
    }
    return fired;
  }

  private async fireOne(reminder: Reminder & { rule: ReminderRule }): Promise<void> {
    // Re-check the rule is still enabled — a rule disabled between
    // scheduling and firing should NOT fire its already-scheduled
    // reminders.
    if (reminder.rule.status !== 'active' || !reminder.rule.isEnabled) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: 'rule disabled or archived before fire',
        },
      });
      return;
    }

    const { id: notificationId } = await this.notifications.send({
      recipientUserId: reminder.recipientUserId,
      typeKey: reminder.rule.notificationType,
      payload: (reminder.payload as Record<string, unknown> | null) ?? undefined,
      source:
        reminder.sourceType && reminder.sourceId
          ? { type: reminder.sourceType, id: reminder.sourceId }
          : undefined,
      actorId: 'system:reminders',
    });

    await prisma.reminder.update({
      where: { id: reminder.id },
      data: { status: 'fired', firedAt: new Date(), notificationId },
    });

    this.events.emit(
      'reminder.fired',
      {
        reminderId: reminder.id,
        ruleId: reminder.ruleId,
        recipientUserId: reminder.recipientUserId,
        notificationId,
      },
      { actorId: 'system:reminders' },
    );
  }

  /* ---------- Cron-rule evaluation ---------- */

  async evaluateCronRules(): Promise<number> {
    const rules = await prisma.reminderRule.findMany({
      where: {
        status: 'active',
        isEnabled: true,
        triggerType: 'cron',
        deletedAt: null,
      },
    });
    let scheduled = 0;
    for (const rule of rules) {
      try {
        const spec = rule.triggerSpec as unknown as CronTriggerSpec;
        // Phase 3 ships the simple cron-match: we only fire when the
        // hour matches one of the cron's hour fields. Cron `0 9 * * *`
        // fires on the 09:00 tick (in PKT). Anything more complex is
        // a Phase 3.5 polish.
        if (!hourMatches(spec.cron, this.lastEvaluatedAt ?? new Date())) continue;
        scheduled += await this.runCronQuery(rule, spec);
      } catch (err) {
        this.logger.warn(`cron eval failed for ${rule.key}: ${(err as Error).message}`);
      }
    }
    return scheduled;
  }

  private async runCronQuery(rule: ReminderRule, spec: CronTriggerSpec): Promise<number> {
    const now = new Date();
    let sources: ResolverSource[] = [];
    let payloadTag: Record<string, unknown> = {};

    // NEW preferred path: cron + conditions, no explicit source.
    // Derive which entities to scan from the condition tree itself.
    // A condition like `project.status equals 'in_billing'` adds
    // `project` to the scan targets; multi-entity conditions scan
    // each table independently and union the sources.
    if (spec.conditions && !spec.sourceEntity) {
      const targets = deriveScanTargets(spec.conditions);
      payloadTag = { _cronTargets: Array.from(targets) };
      for (const kind of targets) {
        sources = sources.concat(await this.fetchSourcesForKind(kind, rule.departmentId));
      }
    } else if (spec.sourceEntity) {
      // LEGACY (round-2): explicit sourceEntity dropdown.
      payloadTag = { _cronSource: spec.sourceEntity };
      if (spec.sourceEntity === 'employee') {
        sources = await this.fetchSourcesForKind('employee', rule.departmentId);
      } else if (spec.sourceEntity === 'project') {
        sources = await this.fetchSourcesForKind('project', rule.departmentId);
      }
    } else if (spec.query) {
      // LEGACY path — fixed query kinds.
      payloadTag = { _cronKind: spec.query.kind };
      switch (spec.query.kind) {
        case 'birthday': {
          const employees = await this.matchingEmployees({
            deptScopeId: rule.departmentId,
            dateField: 'dateOfBirth',
            mmDdMatch: monthDayString(now),
          });
          sources = employees.map((e) => ({ kind: 'employee' as const, id: e.id }));
          break;
        }
        case 'work-anniversary': {
          const employees = await this.matchingEmployees({
            deptScopeId: rule.departmentId,
            dateField: 'joinDate',
            mmDdMatch: monthDayString(now),
          });
          sources = employees.map((e) => ({ kind: 'employee' as const, id: e.id }));
          break;
        }
        case 'probation-ending': {
          const employees = await this.employeesWithUpcomingField(
            'probationEndDate',
            spec.query.withinDays,
            rule.departmentId,
          );
          sources = employees.map((e) => ({ kind: 'employee' as const, id: e.id }));
          break;
        }
        case 'document-expiring':
        case 'custom':
          sources = [];
          break;
      }
    }

    if (sources.length === 0) return 0;

    let scheduled = 0;
    for (const source of sources) {
      // Per-rule condition tree: hydrate the candidate entity once
      // and run the evaluator. Absent tree = match-all.
      if (spec.conditions && source) {
        const context = await buildConditionContext(source);
        if (context && !evaluateConditions(spec.conditions, context)) {
          continue;
        }
      }
      const recipients = await this.resolvers.resolveMany(readRecipientEntries(rule), rule, source);
      if (recipients.length === 0) continue;
      await prisma.reminder.createMany({
        data: recipients.map((recipientUserId) => ({
          ruleId: rule.id,
          recipientUserId,
          sourceType: source?.kind ?? null,
          sourceId: source?.id ?? null,
          scheduledFor: now,
          status: 'scheduled' as const,
          payload: payloadTag as never,
        })),
      });
      scheduled += recipients.length;
    }
    return scheduled;
  }

  /**
   * Maps a condition-derived entity kind to its Prisma scan. The
   * scheduler doesn't ask which fields the condition references —
   * the evaluator pulls fields off the hydrated context, so we just
   * fetch the row ids for the right table and let
   * buildConditionContext do the relation-loading inside the loop.
   *
   * Dept scoping is applied when the table has a department relation
   * and the rule carries departmentId. Soft-deleted rows are
   * excluded where the schema supports `deletedAt`.
   */
  private async fetchSourcesForKind(
    kind: string,
    departmentId: string | null,
  ): Promise<ResolverSource[]> {
    switch (kind) {
      case 'employee': {
        const rows = await prisma.employee.findMany({
          where: { deletedAt: null, ...(departmentId ? { departmentId } : {}) },
          select: { id: true },
        });
        return rows.map((r) => ({ kind: 'employee' as const, id: r.id }));
      }
      case 'employeeDocument': {
        const rows = await prisma.employeeDocument.findMany({
          where: departmentId ? { employee: { departmentId } } : {},
          select: { id: true },
        });
        return rows.map((r) => ({ kind: 'employeeDocument' as const, id: r.id }));
      }
      case 'department': {
        const rows = await prisma.department.findMany({
          where: { isActive: true, ...(departmentId ? { id: departmentId } : {}) },
          select: { id: true },
        });
        return rows.map((r) => ({ kind: 'department' as const, id: r.id }));
      }
      case 'designation': {
        const rows = await prisma.designation.findMany({
          where: { isActive: true, ...(departmentId ? { departmentId } : {}) },
          select: { id: true },
        });
        return rows.map((r) => ({ kind: 'designation' as const, id: r.id }));
      }
      case 'project': {
        const rows = await prisma.project.findMany({
          where: { deletedAt: null, ...(departmentId ? { departmentId } : {}) },
          select: { id: true },
        });
        return rows.map((r) => ({ kind: 'project' as const, id: r.id }));
      }
      case 'projectCategory': {
        const rows = await prisma.projectCategory.findMany({
          where: { deletedAt: null, archived: false },
          select: { id: true },
        });
        return rows.map((r) => ({ kind: 'projectCategory' as const, id: r.id }));
      }
      case 'projectAssignment': {
        const rows = await prisma.projectAssignment.findMany({
          where: {
            removedAt: null,
            ...(departmentId ? { project: { departmentId } } : {}),
          },
          select: { id: true },
        });
        return rows.map((r) => ({ kind: 'projectAssignment' as const, id: r.id }));
      }
      case 'commissionRule': {
        const rows = await prisma.commissionRule.findMany({
          where: { status: 'active' },
          select: { id: true },
        });
        return rows.map((r) => ({ kind: 'commissionRule' as const, id: r.id }));
      }
      case 'commissionRun': {
        const rows = await prisma.commissionRun.findMany({
          where: { status: { not: 'locked' } },
          select: { id: true },
        });
        return rows.map((r) => ({ kind: 'commissionRun' as const, id: r.id }));
      }
      default:
        this.logger.warn(`fetchSourcesForKind: unknown entity kind '${kind}'`);
        return [];
    }
  }

  private async matchingEmployees(args: {
    deptScopeId: string | null;
    dateField: 'dateOfBirth' | 'joinDate';
    mmDdMatch: string;
  }) {
    // Postgres-side MM-DD compare via TO_CHAR.
    const dept = args.deptScopeId;
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Employee"
      WHERE "deletedAt" IS NULL
        AND ${args.dateField === 'dateOfBirth' ? Prisma.sql`"dateOfBirth"` : Prisma.sql`"joinDate"`} IS NOT NULL
        AND TO_CHAR(${args.dateField === 'dateOfBirth' ? Prisma.sql`"dateOfBirth"` : Prisma.sql`"joinDate"`}, 'MM-DD') = ${args.mmDdMatch}
        ${dept ? Prisma.sql`AND "departmentId" = ${dept}` : Prisma.empty}
    `;
    return rows;
  }

  private async employeesWithUpcomingField(
    field: 'probationEndDate' | 'internshipEndDate',
    withinDays: number,
    deptScopeId: string | null,
  ) {
    const now = new Date();
    const horizon = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
    return prisma.employee.findMany({
      where: {
        deletedAt: null,
        [field]: { gte: now, lte: horizon },
        ...(deptScopeId ? { departmentId: deptScopeId } : {}),
      },
      select: { id: true },
    });
  }

  /* ---------- Status read ---------- */

  async getStatus(): Promise<SchedulerStatus> {
    const now = new Date();
    const next = nextHourBoundary(now);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const [emailsSent30d, retriesPending, scheduledNext30d] = await Promise.all([
      prisma.notification.count({
        where: {
          channel: { in: ['email', 'both'] },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.reminder.count({
        where: { status: 'scheduled', scheduledFor: { lt: now } },
      }),
      prisma.reminder.count({
        where: {
          status: 'scheduled',
          scheduledFor: { gte: now, lte: thirtyDaysFromNow },
        },
      }),
    ]);
    return {
      cron: CRON,
      timezone: TZ,
      nextRunIso: next.toISOString(),
      lastEvaluatedAtIso: this.lastEvaluatedAt?.toISOString() ?? null,
      emailsSent30d,
      retriesPending,
      scheduledNext30d,
    };
  }
}

/* ---------- helpers ---------- */

function monthDayString(d: Date): string {
  // Pakistan local time. Server may run UTC, so shift via Intl.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  return fmt; // en-CA gives MM-DD with dash separator
}

function hourMatches(cron: string, when: Date): boolean {
  const [, hourField] = cron.split(/\s+/);
  if (!hourField || hourField === '*') return true;
  const tickHour = parseInt(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      hour: '2-digit',
      hour12: false,
    }).format(when),
    10,
  );
  // Comma-separated list and `*/N` patterns
  const tokens = hourField.split(',');
  for (const tok of tokens) {
    if (tok === '*') return true;
    if (tok.startsWith('*/')) {
      const step = Number(tok.slice(2));
      if (step && tickHour % step === 0) return true;
      continue;
    }
    if (Number(tok) === tickHour) return true;
  }
  return false;
}

function nextHourBoundary(from: Date): Date {
  const d = new Date(from);
  d.setUTCMinutes(0, 0, 0);
  d.setUTCHours(d.getUTCHours() + 1);
  return d;
}
