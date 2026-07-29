/**
 * Read-side helpers for the Reminders list views — scheduled inbox
 * + the "Next 30 days" timeline strip + per-rule fire counts.
 *
 * Separated from the rules service so the rules service stays focused
 * on the versioned-rule lifecycle.
 */
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import type { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../core/auth/types';

export interface ReminderPublic {
  id: string;
  ruleId: string;
  ruleKey: string;
  ruleName: string;
  recipientUserId: string;
  recipientEmail: string;
  recipientName: string | null;
  sourceType: string | null;
  sourceId: string | null;
  scheduledFor: string;
  status: string;
  firedAt: string | null;
  notificationId: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  attempts: number;
  lastError: string | null;
  lastAttemptAt: string | null;
  createdAt: string;
}

export interface TimelineBucket {
  /** YYYY-MM-DD in the org's local timezone. */
  date: string;
  /** Per-rule counts for the day. */
  byRule: Array<{ ruleId: string; ruleKey: string; count: number }>;
  total: number;
}

@Injectable()
export class RemindersReadService {
  /**
   * Pending and recently-fired reminders for the scheduler debug view.
   * HR-admin-only by default.
   */
  async listScheduled(
    viewer: AuthenticatedUser,
    query: {
      status?: 'scheduled' | 'fired' | 'cancelled' | 'failed' | 'all';
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ items: ReminderPublic[]; total: number }> {
    if (!viewer.permissions.includes('reminders:view_scheduled')) {
      throw new ForbiddenException('reminders:view_scheduled required');
    }
    const where: Prisma.ReminderWhereInput = {};
    if (query.status && query.status !== 'all') where.status = query.status;

    const [rows, total] = await Promise.all([
      prisma.reminder.findMany({
        where,
        include: {
          rule: { select: { key: true, name: true } },
          // recipient looked up below to keep the include shallow
        },
        orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'desc' }],
        skip: query.offset ?? 0,
        take: Math.min(query.limit ?? 50, 200),
      }),
      prisma.reminder.count({ where }),
    ]);

    const userIds = Array.from(new Set(rows.map((r) => r.recipientUserId)));
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, employee: { select: { fullName: true } } },
        })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));

    return {
      items: rows.map((r): ReminderPublic => {
        const u = byId.get(r.recipientUserId);
        return {
          id: r.id,
          ruleId: r.ruleId,
          ruleKey: r.rule.key,
          ruleName: r.rule.name,
          recipientUserId: r.recipientUserId,
          recipientEmail: u?.email ?? '',
          recipientName: u?.employee?.fullName ?? null,
          sourceType: r.sourceType,
          sourceId: r.sourceId,
          scheduledFor: r.scheduledFor.toISOString(),
          status: r.status,
          firedAt: r.firedAt?.toISOString() ?? null,
          notificationId: r.notificationId,
          cancelledAt: r.cancelledAt?.toISOString() ?? null,
          cancelReason: r.cancelReason,
          attempts: r.attempts,
          lastError: r.lastError,
          lastAttemptAt: r.lastAttemptAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
        };
      }),
      total,
    };
  }

  /**
   * The "Next 30 days · scheduled triggers" strip on the rules list
   * page. Returns one bucket per day with per-rule counts so the
   * frontend can render the colored-dot stack the design shows.
   */
  async timelineNext30Days(
    viewer: AuthenticatedUser,
  ): Promise<{ buckets: TimelineBucket[]; total: number }> {
    if (!viewer.permissions.includes('reminders:view_rules')) {
      throw new ForbiddenException('reminders:view_rules required');
    }
    const now = new Date();
    const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const rows = await prisma.reminder.findMany({
      where: {
        status: 'scheduled',
        scheduledFor: { gte: now, lte: horizon },
      },
      select: {
        scheduledFor: true,
        rule: { select: { id: true, key: true } },
      },
      orderBy: { scheduledFor: 'asc' },
    });

    const byDay = new Map<string, Map<string, { ruleKey: string; count: number }>>();
    for (const r of rows) {
      const day = isoDay(r.scheduledFor);
      const dayMap = byDay.get(day) ?? new Map();
      const entry = dayMap.get(r.rule.id) ?? { ruleKey: r.rule.key, count: 0 };
      entry.count += 1;
      dayMap.set(r.rule.id, entry);
      byDay.set(day, dayMap);
    }

    const buckets: TimelineBucket[] = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayMap]) => ({
        date,
        byRule: Array.from(dayMap.entries()).map(([ruleId, v]) => ({
          ruleId,
          ruleKey: v.ruleKey,
          count: v.count,
        })),
        total: Array.from(dayMap.values()).reduce((sum, v) => sum + v.count, 0),
      }));
    return { buckets, total: rows.length };
  }

  /**
   * Per-rule fire count over the next 30 days — drives the TRIGGERS
   * column on the rules list page. Returns a `Map<ruleId, count>`-like
   * record so the frontend can join in-memory.
   */
  async triggerCountsNext30Days(viewer: AuthenticatedUser): Promise<Record<string, number>> {
    if (!viewer.permissions.includes('reminders:view_rules')) {
      throw new ForbiddenException('reminders:view_rules required');
    }
    const now = new Date();
    const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const rows = await prisma.reminder.groupBy({
      by: ['ruleId'],
      where: {
        status: 'scheduled',
        scheduledFor: { gte: now, lte: horizon },
      },
      _count: { _all: true },
    });
    const out: Record<string, number> = {};
    for (const r of rows) out[r.ruleId] = r._count._all;
    return out;
  }

  async cancelScheduled(
    viewer: AuthenticatedUser,
    id: string,
    reason: string,
  ): Promise<{ id: string; status: string }> {
    if (!viewer.permissions.includes('reminders:view_scheduled')) {
      throw new ForbiddenException('reminders:view_scheduled required');
    }
    const row = await prisma.reminder.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Reminder not found');
    if (row.status !== 'scheduled') {
      return { id, status: row.status };
    }
    const updated = await prisma.reminder.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });
    return { id, status: updated.status };
  }

  /**
   * Requeue a dead-lettered reminder: reset it to `scheduled` for the
   * next tick and clear the attempt counter so it gets a fresh retry
   * budget. Used from the ops view once the underlying delivery issue
   * (SMTP down, bad address) has been fixed.
   */
  async retryReminder(
    viewer: AuthenticatedUser,
    id: string,
  ): Promise<{ id: string; status: string }> {
    if (!viewer.permissions.includes('reminders:view_scheduled')) {
      throw new ForbiddenException('reminders:view_scheduled required');
    }
    const row = await prisma.reminder.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Reminder not found');
    if (row.status !== 'failed') {
      // Only dead-lettered rows are requeueable; anything else is a no-op.
      return { id, status: row.status };
    }
    const updated = await prisma.reminder.update({
      where: { id },
      data: {
        status: 'scheduled',
        scheduledFor: new Date(),
        attempts: 0,
        lastError: null,
      },
    });
    return { id, status: updated.status };
  }
}

function isoDay(d: Date): string {
  // Asia/Karachi local day boundary so the timeline strip lines up
  // with the office's idea of "today".
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}
