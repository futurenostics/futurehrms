import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { EventBusService, type DomainEvent } from '../../core/events/event-bus.service';

@Injectable()
export class ExpenseTimelineSubscriber implements OnApplicationBootstrap {
  private readonly logger = new Logger(ExpenseTimelineSubscriber.name);

  constructor(private readonly bus: EventBusService) {}

  onApplicationBootstrap(): void {
    this.bus.on('expenses.claim.submitted', (e) => this.handleSubmitted(e));
    this.bus.on('expenses.claim.approved', (e) => this.handleApproved(e));
    this.bus.on('expenses.claim.rejected', (e) => this.handleRejected(e));
    this.bus.on('expenses.claim.returned', (e) => this.handleReturned(e));
  }

  private async handleSubmitted(event: DomainEvent<unknown>): Promise<void> {
    const p = event.payload as {
      claimId: string;
      claimNumber?: string;
      employeeId: string;
      amountPkr: number;
    };
    await this.write({
      employeeId: p.employeeId,
      eventType: 'expenses.claim.submitted',
      title: 'Submitted for approval',
      details: {
        claimId: p.claimId,
        claimNumber: p.claimNumber,
        amountPkr: p.amountPkr,
      },
      createdById: event.actorId,
    });
  }

  private async handleApproved(event: DomainEvent<unknown>): Promise<void> {
    const p = event.payload as { claimId: string; employeeId: string; amountPkr: number };
    await this.write({
      employeeId: p.employeeId,
      eventType: 'expenses.claim.approved',
      title: 'Expense claim approved',
      details: { claimId: p.claimId, amountPkr: p.amountPkr },
      createdById: event.actorId,
    });
  }

  private async handleRejected(event: DomainEvent<unknown>): Promise<void> {
    const p = event.payload as { claimId: string; employeeId: string; reason: string };
    await this.write({
      employeeId: p.employeeId,
      eventType: 'expenses.claim.rejected',
      title: 'Rejected',
      details: { claimId: p.claimId, reason: p.reason },
      createdById: event.actorId,
    });
  }

  private async handleReturned(event: DomainEvent<unknown>): Promise<void> {
    const p = event.payload as {
      claimId: string;
      claimNumber?: string;
      employeeId: string;
      reasonCode: string;
      comment?: string | null;
    };
    await this.write({
      employeeId: p.employeeId,
      eventType: 'expenses.claim.returned',
      title: 'Returned for correction',
      details: {
        claimId: p.claimId,
        claimNumber: p.claimNumber,
        reasonCode: p.reasonCode,
        comment: p.comment ?? null,
      },
      createdById: event.actorId,
    });
  }

  private async write(input: {
    employeeId: string;
    eventType: string;
    title: string;
    details: Record<string, unknown>;
    createdById?: string;
  }): Promise<void> {
    try {
      await prisma.timelineEntry.create({
        data: {
          employeeId: input.employeeId,
          eventType: input.eventType,
          module: 'expenses',
          title: input.title,
          details: input.details as never,
          occurredAt: new Date(),
          createdById: input.createdById ?? null,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to write timeline for ${input.eventType}: ${(err as Error).message}`,
      );
    }
  }
}
