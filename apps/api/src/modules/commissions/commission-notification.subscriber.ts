/**
 * Commission-events → recipient notifications.
 *
 * Emails (and in-app bells) each commission recipient when their run
 * is approved and again when it's locked for disbursement. Reuses the
 * shared NotificationsService, so channel resolution + per-user
 * preferences + email dispatch all happen there — this subscriber only
 * decides who gets notified and with what amount.
 *
 * Recipients + amounts are computed from the run's line items (net of
 * clawbacks, excluding held rows), not from the event payload, so the
 * approved and locked paths stay consistent. Employees without an
 * active linked user are skipped (nothing to deliver to).
 */
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { EventBusService, type DomainEvent } from '../../core/events/event-bus.service';
import { NotificationsService } from '../notifications/notifications.service';
import { monthLabel } from './commission-calc';

@Injectable()
export class CommissionNotificationSubscriber implements OnApplicationBootstrap {
  private readonly logger = new Logger(CommissionNotificationSubscriber.name);

  constructor(
    private readonly bus: EventBusService,
    private readonly notifications: NotificationsService,
  ) {}

  onApplicationBootstrap(): void {
    this.bus.on('commission.run.approved', (e) => this.notifyRecipients(e, 'approved'));
    this.bus.on('commission.run.locked', (e) => this.notifyRecipients(e, 'locked'));
  }

  private async notifyRecipients(
    event: DomainEvent<unknown>,
    kind: 'approved' | 'locked',
  ): Promise<void> {
    const payload = (event.payload ?? {}) as { runId?: string; monthKey?: string };
    const runId = payload.runId;
    const monthKey = payload.monthKey;
    if (!runId || !monthKey) return;

    const typeKey = kind === 'approved' ? 'commissions.run-approved' : 'commissions.run-disbursed';
    const label = monthLabel(monthKey);

    try {
      // Net payout per employee for the run (excludes held rows; clawback
      // lines are negative and net in).
      const grouped = await prisma.commissionLineItem.groupBy({
        by: ['employeeId'],
        where: { runId, isHeld: false },
        _sum: { finalAmountUsd: true },
      });

      let sent = 0;
      for (const g of grouped) {
        const total = Number(g._sum.finalAmountUsd ?? 0);
        if (total <= 0) continue; // nothing owed (or fully clawed back)

        const user = await prisma.user.findFirst({
          where: { employeeId: g.employeeId, isActive: true },
          select: { id: true },
        });
        if (!user) continue; // no login to deliver to

        await this.notifications.send({
          recipientUserId: user.id,
          typeKey,
          payload: {
            monthLabel: label,
            amountUsd: total.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
            runId,
            employeeId: g.employeeId,
          },
          source: { type: 'commissionRun', id: runId },
          actorId: 'system:commissions',
        });
        sent += 1;
      }

      this.logger.log(`commission run ${runId} ${kind}: notified ${sent} recipient(s)`);
    } catch (err) {
      this.logger.warn(
        `failed to notify recipients for commission run ${runId} (${kind}): ${(err as Error).message}`,
      );
    }
  }
}
