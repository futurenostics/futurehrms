/**
 * Commission-events → TimelineEntry projection.
 *
 * Listens to commission.run.approved and writes one TimelineEntry per
 * affected employee. The entry is module='commissions' so the FE
 * can color-code or filter by source.
 *
 * Title shape per locked decision:
 *   "Commission for May 2026 approved"
 * The employee-visible title intentionally OMITS the dollar amount;
 * the figure lives on the dashboard widget (My commission this
 * month). Details payload keeps the amount + runId for the
 * profile-side detail view.
 */
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { EventBusService, type DomainEvent } from '../../core/events/event-bus.service';

@Injectable()
export class CommissionTimelineSubscriber implements OnApplicationBootstrap {
  private readonly logger = new Logger(CommissionTimelineSubscriber.name);

  constructor(private readonly bus: EventBusService) {}

  onApplicationBootstrap(): void {
    this.bus.on('commission.run.approved', (e) => this.handleApproved(e));
  }

  private async handleApproved(event: DomainEvent<unknown>): Promise<void> {
    const p = event.payload as {
      runId: string;
      monthKey: string;
      monthLabel: string;
      recipients: Array<{ employeeId: string; totalUsd: number }>;
    };

    for (const r of p.recipients) {
      try {
        await prisma.timelineEntry.create({
          data: {
            employeeId: r.employeeId,
            eventType: 'commission.run.approved',
            module: 'commissions',
            title: `Commission for ${p.monthLabel} approved`,
            details: {
              runId: p.runId,
              monthKey: p.monthKey,
              // amount kept in details for the profile-side detail view;
              // not in title because the employee sees the dollar figure
              // on the dashboard widget instead.
              totalUsd: r.totalUsd,
            } as never,
            occurredAt: new Date(),
            createdById: event.actorId ?? null,
          },
        });
      } catch (err) {
        this.logger.warn(
          `Failed to write commission timeline entry for ${r.employeeId} (run ${p.runId}): ${(err as Error).message}`,
        );
      }
    }
  }
}
