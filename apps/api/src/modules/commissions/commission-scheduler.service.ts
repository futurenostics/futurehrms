/**
 * Monthly commission-run scheduler.
 *
 * Runs at 02:00 Asia/Karachi on the 1st of each month. The job
 * handler creates a draft CommissionRun for the PREVIOUS month
 * (since on June 1 we want to start drafting May's run).
 *
 * Idempotent: if a run for the previous month already exists, the
 * handler logs and exits — no exception, no duplicate row.
 *
 * Implementation: BullMQ Queue + Worker bound to the shared
 * IORedis connection from SchedulerModule. Repeatable cron job
 * pattern: '0 2 1 * *' (02:00 on day-of-month 1) in Asia/Karachi.
 *
 * FX rate at create time: pulled from env (`COMMISSION_DEFAULT_FX_RATE`)
 * with a 0.0035 fallback if unset. HR can update the rate via the
 * run-detail screen before submitting.
 */
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { Prisma } from '@prisma/client';
import { Queue, Worker, type Job } from 'bullmq';
import type IORedis from 'ioredis';
import { BULL_REDIS_CONNECTION } from '../../core/scheduler/scheduler.module';
import { AppConfigService } from '../../config/app.config';
import { CommissionRunsService } from './commission-runs.service';
import { EventBusService } from '../../core/events/event-bus.service';

const QUEUE_NAME = 'commission-runs';
const JOB_NAME = 'monthly-draft';
const CRON = '0 2 1 * *'; // 02:00 on the 1st of each month
const TZ = 'Asia/Karachi';

@Injectable()
export class CommissionSchedulerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(CommissionSchedulerService.name);
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    @Inject(BULL_REDIS_CONNECTION) private readonly redis: IORedis,
    private readonly config: AppConfigService,
    private readonly runs: CommissionRunsService,
    private readonly events: EventBusService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // In test envs we don't want to schedule anything.
    if (this.config.env.NODE_ENV === 'test') return;

    this.queue = new Queue(QUEUE_NAME, { connection: this.redis });
    this.worker = new Worker(QUEUE_NAME, (job) => this.handle(job), {
      connection: this.redis,
    });
    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id ?? '?'} failed: ${err.message}`, err.stack);
    });

    // Idempotent: BullMQ keys repeatables by (name + pattern + tz), so
    // re-adding on every boot just refreshes the entry without
    // duplicating.
    await this.queue.add(
      JOB_NAME,
      {},
      {
        repeat: { pattern: CRON, tz: TZ },
        jobId: 'commission-monthly-draft',
      },
    );
    this.logger.log(`Scheduled monthly draft creation: '${CRON}' ${TZ} (queue=${QUEUE_NAME})`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }

  /**
   * Handler entry point — also exposed for manual trigger from
   * tests or an admin "run now" button. Idempotent.
   */
  async handle(_job?: Job): Promise<{ status: string; runId?: string; monthKey: string }> {
    const targetMonthKey = previousMonthKey(currentMonthKey());
    this.logger.log(`Scheduled tick — drafting run for ${targetMonthKey}`);

    const existing = await prisma.commissionRun.findUnique({
      where: { monthKey: targetMonthKey },
    });
    if (existing) {
      this.logger.log(
        `Run for ${targetMonthKey} already exists (id=${existing.id}, status=${existing.status}); skipping`,
      );
      return { status: 'skipped', runId: existing.id, monthKey: targetMonthKey };
    }

    // Default FX rate for scheduler-created runs. HR can edit on the
    // run-detail screen before approval.
    const fxRate = this.config.env.COMMISSION_DEFAULT_FX_RATE ?? 0.0035;

    // Use a synthetic "system" actor for the audit log + event payload.
    // The Run's createdById is set to the SEED_ADMIN_EMAIL user's id so
    // the schema FK is satisfied; the audit row will note the action
    // came from the scheduler (we surface this via the
    // commission.run.created event payload's `source: 'scheduler'`).
    const systemUser = await prisma.user.findFirst({
      where: { email: this.config.env.SEED_ADMIN_EMAIL.toLowerCase() },
    });
    if (!systemUser) {
      this.logger.warn('No system user found — cannot create scheduled run');
      return { status: 'no-system-user', monthKey: targetMonthKey };
    }

    const created = await prisma.commissionRun.create({
      data: {
        monthKey: targetMonthKey,
        fxRateUsdToPkr: new Prisma.Decimal(fxRate),
        status: 'draft',
        createdById: systemUser.id,
        notes: 'Drafted automatically by the monthly scheduler.',
      },
    });
    // Run the calc engine in its own transaction to populate line items.
    await this.runs.populateDraft(created.id, targetMonthKey);

    this.events.emit(
      'commission.run.created',
      {
        runId: created.id,
        monthKey: targetMonthKey,
        source: 'scheduler',
      },
      { actorId: systemUser.id },
    );

    return { status: 'created', runId: created.id, monthKey: targetMonthKey };
  }
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function previousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) throw new Error(`Invalid monthKey: ${monthKey}`);
  const d = new Date(Date.UTC(year, month - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
