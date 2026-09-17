/**
 * End-of-day attendance backfill.
 *
 * Runs nightly at 01:00 Asia/Karachi and processes the PREVIOUS
 * calendar day (Asia/Karachi) — the day is fully over by then, so
 * nobody gets marked absent while they still have hours left to
 * punch. See docs/ATTENDANCE_MODULE_STATUS.md gap #4 for the wider
 * context this closes.
 *
 * For every employee with an active ShiftAssignment covering that
 * date who does NOT already have an AttendanceRecord for it (a real
 * punch, however late or incomplete, is never touched), creates one:
 *   - date is in the Holiday table                          -> 'holiday'
 *   - date's weekday is in the resolved policy's weekendDays -> 'weekend'
 *   - otherwise                                              -> 'absent'
 *
 * An employee with no active shift assignment for the date is
 * skipped entirely, not marked absent — punch() itself rejects a
 * check-in with "No shift is assigned" for the same employee, so
 * there's nothing they could have been absent from.
 *
 * Idempotent by construction: only creates rows for employees
 * confirmed to have none yet — no upsert, no overwrite risk, safe to
 * re-run the same date any number of times.
 *
 * Implementation: BullMQ Queue + Worker, same shape as
 * CommissionSchedulerService / ReminderSchedulerService.
 */
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { Queue, Worker, type Job } from 'bullmq';
import type IORedis from 'ioredis';
import { BULL_REDIS_CONNECTION } from '../../core/scheduler/scheduler.module';
import { AppConfigService } from '../../config/app.config';
import { EventBusService } from '../../core/events/event-bus.service';
import { wallClock, DEFAULT_TZ } from '../reminders/tz-utils';
import { resolveActivePolicy, resolveActiveShift } from './attendance-resolution';
import { localMidnightUtc } from './attendance-record.mapper';

const QUEUE_NAME = 'attendance';
const JOB_NAME = 'end-of-day-backfill';
const CRON = '0 1 * * *'; // 01:00 daily
const TZ = 'Asia/Karachi';

export interface EndOfDayResult {
  date: string;
  absent: number;
  weekend: number;
  holiday: number;
  skippedNoShift: number;
}

@Injectable()
export class AttendanceEndOfDayService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AttendanceEndOfDayService.name);
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    @Inject(BULL_REDIS_CONNECTION) private readonly redis: IORedis,
    private readonly config: AppConfigService,
    private readonly events: EventBusService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.env.NODE_ENV === 'test') return;

    this.queue = new Queue(QUEUE_NAME, { connection: this.redis });
    this.worker = new Worker(QUEUE_NAME, (job) => this.handle(job), { connection: this.redis });
    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id ?? '?'} failed: ${err.message}`, err.stack);
    });

    await this.queue.add(
      JOB_NAME,
      {},
      {
        repeat: { pattern: CRON, tz: TZ },
        jobId: 'attendance-end-of-day',
      },
    );
    this.logger.log(
      `Scheduled end-of-day attendance backfill: '${CRON}' ${TZ} (queue=${QUEUE_NAME})`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }

  /** Cron entry point — backfills yesterday (Asia/Karachi). */
  async handle(_job?: Job): Promise<EndOfDayResult> {
    return this.backfillDate(yesterdayLocalMidnightUtc(new Date()));
  }

  /**
   * Core logic, exposed separately from `handle` so an admin
   * "run now" endpoint (or a test) can target a specific past date —
   * e.g. to catch up a day the scheduler missed. Refuses today or any
   * future date — a day isn't "over" yet, so there's nothing to
   * classify (an employee scheduled for this afternoon isn't absent
   * this morning). Both the cron path and the manual override funnel
   * through here, so this is the single enforcement point.
   */
  async backfillDate(targetDate: Date): Promise<EndOfDayResult> {
    const today = localMidnightUtc(new Date());
    if (targetDate >= today) {
      throw new BadRequestException(
        'Cannot backfill today or a future date — only a day that has fully ended can be classified.',
      );
    }

    const dateLabel = targetDate.toISOString().slice(0, 10);
    this.logger.log(`end-of-day backfill — start (${dateLabel})`);

    const holiday = await prisma.holiday.findUnique({ where: { date: targetDate } });
    const weekday = targetDate.getUTCDay();

    const candidates = await this.candidateEmployees(targetDate);
    const existingIds = new Set(
      candidates.length === 0
        ? []
        : (
            await prisma.attendanceRecord.findMany({
              where: { date: targetDate, employeeId: { in: candidates.map((c) => c.id) } },
              select: { employeeId: true },
            })
          ).map((r) => r.employeeId),
    );

    let absent = 0;
    let weekend = 0;
    let holidayCount = 0;
    let skippedNoShift = 0;

    for (const employee of candidates) {
      if (existingIds.has(employee.id)) continue; // a real punch, however partial, wins

      const shift = await resolveActiveShift(employee.id, employee.departmentId, targetDate);
      if (!shift) {
        skippedNoShift += 1;
        continue;
      }
      const policy = await resolveActivePolicy(employee.id, employee.departmentId);

      let status: 'holiday' | 'weekend' | 'absent';
      if (holiday) {
        status = 'holiday';
        holidayCount += 1;
      } else if (policy.weekendDays.includes(weekday)) {
        status = 'weekend';
        weekend += 1;
      } else {
        status = 'absent';
        absent += 1;
      }

      await prisma.attendanceRecord.create({
        data: { employeeId: employee.id, date: targetDate, shiftId: shift.id, status },
      });
    }

    this.logger.log(
      `end-of-day backfill — done (${dateLabel}): absent=${absent}, weekend=${weekend}, holiday=${holidayCount}, skippedNoShift=${skippedNoShift}`,
    );
    this.events.emit(
      'attendance.end_of_day.backfilled',
      { date: dateLabel, absent, weekend, holiday: holidayCount },
      { actorId: 'system:attendance' },
    );

    return { date: dateLabel, absent, weekend, holiday: holidayCount, skippedNoShift };
  }

  /**
   * Every employee with an active ShiftAssignment (individual or via
   * their department) covering the date — the same candidate set a
   * punch on that day would have been able to resolve a shift for.
   * Deduped; resolveActiveShift settles individual-vs-department
   * priority per employee afterwards.
   */
  private async candidateEmployees(
    date: Date,
  ): Promise<Array<{ id: string; departmentId: string }>> {
    const assignments = await prisma.shiftAssignment.findMany({
      where: {
        validFrom: { lte: date },
        OR: [{ validTo: null }, { validTo: { gte: date } }],
      },
      select: { employeeId: true, departmentId: true },
    });

    const individualIds = assignments.map((a) => a.employeeId).filter((id): id is string => !!id);
    const deptIds = assignments.map((a) => a.departmentId).filter((id): id is string => !!id);
    if (individualIds.length === 0 && deptIds.length === 0) return [];

    return prisma.employee.findMany({
      where: {
        deletedAt: null,
        OR: [
          ...(individualIds.length ? [{ id: { in: individualIds } }] : []),
          ...(deptIds.length ? [{ departmentId: { in: deptIds } }] : []),
        ],
      },
      select: { id: true, departmentId: true },
    });
  }
}

/** The calendar day immediately before `now`'s local day — the day that just fully ended. */
function yesterdayLocalMidnightUtc(now: Date, tz: string = DEFAULT_TZ): Date {
  const wc = wallClock(now, tz);
  return new Date(Date.UTC(wc.year, wc.month - 1, wc.day - 1));
}
