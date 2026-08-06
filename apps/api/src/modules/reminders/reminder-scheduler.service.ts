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
  computeReminderDedupeKey,
  readRecipientEntries,
  type ResolverSource,
} from './recipient-resolver';
import type { CronTriggerSpec } from './reminder-trigger.types';
import { deriveScanTargets, evaluateConditions } from './reminder-conditions.evaluator';
import { buildConditionContexts } from './reminder-condition-context';
import { cronMatches } from './cron-matcher';
import { DEFAULT_TZ, isWithinQuietHours, nextQuietEnd } from './tz-utils';
import { renderTaskTitle, taskSpecFor } from './reminder-task-specs';
import {
  fetchSourcesForKind as scanForKind,
  isScannableKind as isKnownScanKind,
} from './reminder-entity-scans';

const QUEUE_NAME = 'reminders';
const JOB_NAME = 'quarter-hour-tick';
// Every 15 minutes (was hourly) — due reminders now fire within ≤15m
// of their scheduled time, and quiet-hours deferral resurfaces at a
// finer granularity.
const CRON = '*/15 * * * *';
const TZ = 'Asia/Karachi';

// Delivery retry policy. A send that throws is retried on a growing
// backoff; after MAX_ATTEMPTS failures the reminder is dead-lettered
// (status='failed') so it stops looping and becomes visible in the
// ops view. Backoff steps are indexed by the attempt just completed
// (attempt 1 → wait 15m, attempt 2 → 1h, …); the final step is
// reused if attempts somehow exceed the table length.
const MAX_ATTEMPTS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const RETRY_BACKOFF_MS = [
  15 * 60 * 1000, // 15 minutes
  60 * 60 * 1000, // 1 hour
  4 * 60 * 60 * 1000, // 4 hours
  12 * 60 * 60 * 1000, // 12 hours
];

/** What the scheduler-status endpoint returns. */
export interface SchedulerStatus {
  cron: string;
  timezone: string;
  nextRunIso: string | null;
  lastEvaluatedAtIso: string | null;
  emailsSent30d: number;
  retriesPending: number;
  scheduledNext30d: number;
  deadLetterCount: number;
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
        jobId: 'reminders-tick',
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
    // Follow-ups run after firing so tasks opened this tick aren't
    // immediately nudged (their cadence clock starts now).
    const followUps = await this.processTaskFollowUps();
    this.logger.log(
      `reminder tick — done: fired=${fired}, scheduled=${scheduled}, followUps=${followUps}`,
    );
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
        await this.recordFailure(r as Reminder, err as Error);
      }
    }
    return fired;
  }

  /**
   * A send that threw: bump the attempt counter and either push the
   * reminder out on a backoff step (still `scheduled`) or, once the
   * cap is reached, dead-letter it (`status='failed'`) so it stops
   * retrying forever and surfaces in the scheduled/ops view.
   */
  private async recordFailure(reminder: Reminder, err: Error): Promise<void> {
    const attempts = reminder.attempts + 1;
    const now = new Date();
    const deadLettered = attempts >= MAX_ATTEMPTS;

    if (deadLettered) {
      this.logger.error(
        `reminder ${reminder.id} (rule ${reminder.ruleId}) dead-lettered after ${attempts} attempts: ${err.message}`,
      );
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: 'failed', attempts, lastError: err.message, lastAttemptAt: now },
      });
      this.events.emit(
        'reminder.failed',
        { reminderId: reminder.id, ruleId: reminder.ruleId, attempts, error: err.message },
        { actorId: 'system:reminders' },
      );
      return;
    }

    const backoff = RETRY_BACKOFF_MS[Math.min(attempts - 1, RETRY_BACKOFF_MS.length - 1)]!;
    const nextAttemptAt = new Date(now.getTime() + backoff);
    this.logger.warn(
      `reminder ${reminder.id} send failed (attempt ${attempts}/${MAX_ATTEMPTS}), retrying at ${nextAttemptAt.toISOString()}: ${err.message}`,
    );
    await prisma.reminder.update({
      where: { id: reminder.id },
      data: {
        attempts,
        lastError: err.message,
        lastAttemptAt: now,
        scheduledFor: nextAttemptAt,
      },
    });
  }

  private async fireOne(reminder: Reminder & { rule: ReminderRule }): Promise<void> {
    // The rule was joined in fireDueReminders so this is the freshest
    // snapshot. The check matters because the rule could have been
    // disabled / archived in the gap between the Reminder row being
    // scheduled (potentially days earlier) and this tick — already-
    // scheduled reminders for a disabled rule must NOT fire.
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

    // Same window for the recipient — a user soft-deleted or
    // deactivated between scheduling and firing must NOT receive
    // the reminder. We re-validate live; the User row is cheap to
    // hit and the wasted notification would be worse.
    const user = await prisma.user.findUnique({
      where: { id: reminder.recipientUserId },
      select: {
        id: true,
        isActive: true,
        deletedAt: true,
        employee: { select: { timezone: true, quietHoursStart: true, quietHoursEnd: true } },
      },
    });
    if (!user || !user.isActive || user.deletedAt) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: 'recipient deactivated or deleted',
        },
      });
      return;
    }

    // Quiet hours — if it's currently within the recipient's quiet
    // window, defer this reminder to the end of the window (in their
    // timezone) instead of firing. It stays `scheduled` and goes out on
    // a later tick once the window closes.
    const tz = user.employee?.timezone ?? DEFAULT_TZ;
    const qStart = user.employee?.quietHoursStart ?? null;
    const qEnd = user.employee?.quietHoursEnd ?? null;
    if (qEnd && isWithinQuietHours(new Date(), tz, qStart, qEnd)) {
      const deferTo = nextQuietEnd(new Date(), tz, qEnd);
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { scheduledFor: deferTo },
      });
      this.logger.log(
        `reminder ${reminder.id} deferred to ${deferTo.toISOString()} (recipient quiet hours ${qStart}-${qEnd} ${tz})`,
      );
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

    // Task-generating reminders (probation / internship / reviews /
    // increment) open a follow-up task the assignee must complete. The
    // scheduler re-notifies until it's done (see processTaskFollowUps).
    await this.maybeCreateTask(reminder);
  }

  /**
   * If the fired reminder's notification type is a task kind, open one
   * follow-up task per (rule, subject, assignee) — deduped against any
   * already-open task so repeated fires don't pile up duplicates.
   */
  private async maybeCreateTask(reminder: Reminder & { rule: ReminderRule }): Promise<void> {
    const spec = taskSpecFor(reminder.rule.notificationType);
    if (!spec) return;

    const existing = await prisma.reminderTask.findFirst({
      where: {
        ruleId: reminder.ruleId,
        assigneeUserId: reminder.recipientUserId,
        sourceType: reminder.sourceType,
        sourceId: reminder.sourceId,
        status: 'open',
      },
      select: { id: true },
    });
    if (existing) return;

    const name = await this.subjectName(reminder.sourceType, reminder.sourceId, reminder.payload);
    const now = new Date();
    await prisma.reminderTask.create({
      data: {
        ruleId: reminder.ruleId,
        notificationType: reminder.rule.notificationType,
        assigneeUserId: reminder.recipientUserId,
        sourceType: reminder.sourceType,
        sourceId: reminder.sourceId,
        title: renderTaskTitle(spec.titleTemplate, name),
        description: reminder.rule.description ?? null,
        dueDate: new Date(now.getTime() + spec.dueInDays * DAY_MS),
        followUpEveryDays: spec.followUpEveryDays,
      },
    });
  }

  /** Resolve a display name for the task subject (employee today). */
  private async subjectName(
    sourceType: string | null,
    sourceId: string | null,
    payload: Prisma.JsonValue | null,
  ): Promise<string> {
    const fromPayload = (payload as { fullName?: string } | null)?.fullName;
    if (fromPayload) return fromPayload;
    if (sourceType === 'employee' && sourceId) {
      const e = await prisma.employee.findUnique({
        where: { id: sourceId },
        select: { fullName: true },
      });
      if (e) return e.fullName;
    }
    return '';
  }

  /* ---------- Task follow-ups (auto-remind until completion) ---------- */

  /**
   * Walk open tasks; flag overdue ones, and re-notify the assignee once
   * a follow-up interval has elapsed since the last nudge (or since the
   * task was created). This is the spec's "if a form is uncompleted by
   * its due date, send reminder emails automatically until completion."
   */
  async processTaskFollowUps(): Promise<number> {
    const now = new Date();
    const open = await prisma.reminderTask.findMany({
      where: { status: 'open' },
      take: 500,
    });

    let sent = 0;
    for (const task of open) {
      const isOverdue = now > task.dueDate;
      const since = task.lastFollowUpAt ?? task.createdAt;
      const dueForNudge = now.getTime() - since.getTime() >= task.followUpEveryDays * DAY_MS;

      if (!dueForNudge) {
        // Still keep the overdue flag fresh for the HR queue.
        if (isOverdue && !task.overdue) {
          await prisma.reminderTask.update({
            where: { id: task.id },
            data: { overdue: true },
          });
        }
        continue;
      }

      // Only nudge live assignees; a deactivated user can't act on it.
      const user = await prisma.user.findUnique({
        where: { id: task.assigneeUserId },
        select: { id: true, isActive: true, deletedAt: true },
      });
      if (!user || !user.isActive || user.deletedAt) continue;

      const name = await this.subjectName(task.sourceType, task.sourceId, null);
      try {
        await this.notifications.send({
          recipientUserId: task.assigneeUserId,
          typeKey: task.notificationType,
          payload: {
            fullName: name,
            taskId: task.id,
            followUp: true,
            overdue: isOverdue,
          },
          source:
            task.sourceType && task.sourceId
              ? { type: task.sourceType, id: task.sourceId }
              : undefined,
          actorId: 'system:reminders',
        });
        await prisma.reminderTask.update({
          where: { id: task.id },
          data: {
            followUpCount: { increment: 1 },
            lastFollowUpAt: now,
            overdue: isOverdue,
          },
        });
        this.events.emit(
          'reminder.task.followed_up',
          { taskId: task.id, ruleId: task.ruleId, overdue: isOverdue },
          { actorId: 'system:reminders' },
        );
        sent += 1;
      } catch (err) {
        this.logger.warn(`task follow-up ${task.id} failed: ${(err as Error).message}`);
      }
    }
    return sent;
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
        if (!cronMatches(spec.cron, this.lastEvaluatedAt ?? new Date())) continue;
        scheduled += await this.runCronQuery(rule, spec);
      } catch (err) {
        this.logger.warn(`cron eval failed for ${rule.key}: ${(err as Error).message}`);
      }
    }
    return scheduled;
  }

  private async runCronQuery(rule: ReminderRule, spec: CronTriggerSpec): Promise<number> {
    const now = new Date();

    // Aggregate "monthly birthday sheet" — one digest to HR, not one
    // reminder per employee. Handled up front and returns early.
    if (spec.query?.kind === 'birthday-digest') {
      return this.scheduleBirthdayDigest(rule, now);
    }

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

    // Batch-hydrate every non-null source once, before the loop.
    // Conditions evaluation then reads from the in-memory map
    // instead of doing one Prisma findUnique per source.
    const realSources = sources.filter((s): s is NonNullable<ResolverSource> => s !== null);
    const contexts = spec.conditions ? await buildConditionContexts(realSources) : null;

    let scheduled = 0;
    for (const source of sources) {
      // Per-rule condition tree: read the hydrated context from the
      // batched map. Absent tree = match-all.
      if (spec.conditions && source) {
        const ctx = contexts?.get(`${source.kind}:${source.id}`);
        if (!ctx || !evaluateConditions(spec.conditions, ctx)) continue;
      }
      const recipients = await this.resolvers.resolveMany(readRecipientEntries(rule), rule, source);
      if (recipients.length === 0) continue;
      await prisma.reminder.createMany({
        data: recipients.map((recipientUserId) => {
          const sourceType = source?.kind ?? null;
          const sourceId = source?.id ?? null;
          return {
            ruleId: rule.id,
            recipientUserId,
            sourceType,
            sourceId,
            scheduledFor: now,
            status: 'scheduled' as const,
            payload: payloadTag as never,
            dedupeKey: computeReminderDedupeKey({
              ruleId: rule.id,
              recipientUserId,
              sourceType,
              sourceId,
              scheduledFor: now,
            }),
          };
        }),
        skipDuplicates: true,
      });
      scheduled += recipients.length;
    }
    return scheduled;
  }

  /**
   * Build the "monthly birthday sheet" and schedule one digest reminder
   * per resolved recipient (HR). Employees are matched by the local
   * month of dateOfBirth == the current month; the formatted list rides
   * in the payload for the digest notification template.
   */
  private async scheduleBirthdayDigest(rule: ReminderRule, now: Date): Promise<number> {
    const month = now.getMonth() + 1; // 1-12, local server time
    const employees = await prisma.employee.findMany({
      where: {
        deletedAt: null,
        dateOfBirth: { not: null },
        ...(rule.departmentId ? { departmentId: rule.departmentId } : {}),
      },
      select: { fullName: true, dateOfBirth: true },
    });
    const monthly = employees
      .filter((e) => e.dateOfBirth && e.dateOfBirth.getMonth() + 1 === month)
      .sort((a, b) => a.dateOfBirth!.getDate() - b.dateOfBirth!.getDate());

    const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const birthdayList =
      monthly.length === 0
        ? 'No birthdays this month.'
        : monthly
            .map(
              (e) =>
                `${e.dateOfBirth!.toLocaleString('en-US', { month: 'short', day: 'numeric' })} — ${e.fullName}`,
            )
            .join('; ');

    const recipients = await this.resolvers.resolveMany(readRecipientEntries(rule), rule, null);
    if (recipients.length === 0) return 0;

    await prisma.reminder.createMany({
      data: recipients.map((recipientUserId) => ({
        ruleId: rule.id,
        recipientUserId,
        sourceType: null,
        sourceId: null,
        scheduledFor: now,
        status: 'scheduled' as const,
        payload: { monthLabel, birthdayCount: monthly.length, birthdayList } as never,
        dedupeKey: computeReminderDedupeKey({
          ruleId: rule.id,
          recipientUserId,
          sourceType: null,
          sourceId: null,
          scheduledFor: now,
        }),
      })),
      skipDuplicates: true,
    });
    return recipients.length;
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
    const rows = await scanForKind(kind, departmentId);
    if (rows.length === 0 && !isKnownScanKind(kind)) {
      this.logger.warn(`fetchSourcesForKind: unknown entity kind '${kind}'`);
    }
    return rows;
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
    const [emailsSent30d, retriesPending, scheduledNext30d, deadLetterCount] = await Promise.all([
      prisma.notification.count({
        where: {
          channel: { in: ['email', 'both'] },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      // Reminders awaiting a retry after at least one failed send.
      prisma.reminder.count({
        where: { status: 'scheduled', attempts: { gt: 0 } },
      }),
      prisma.reminder.count({
        where: {
          status: 'scheduled',
          scheduledFor: { gte: now, lte: thirtyDaysFromNow },
        },
      }),
      prisma.reminder.count({ where: { status: 'failed' } }),
    ]);
    return {
      cron: CRON,
      timezone: TZ,
      nextRunIso: next.toISOString(),
      lastEvaluatedAtIso: this.lastEvaluatedAt?.toISOString() ?? null,
      emailsSent30d,
      retriesPending,
      scheduledNext30d,
      deadLetterCount,
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

function nextHourBoundary(from: Date): Date {
  const d = new Date(from);
  d.setUTCMinutes(0, 0, 0);
  d.setUTCHours(d.getUTCHours() + 1);
  return d;
}
