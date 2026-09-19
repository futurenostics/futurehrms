import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { formatExpenseFinanceFeedback } from '@futurenostics/types';
import { EventBusService, type DomainEvent } from '../../core/events/event-bus.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ExpenseNotificationSubscriber implements OnApplicationBootstrap {
  private readonly logger = new Logger(ExpenseNotificationSubscriber.name);

  constructor(
    private readonly bus: EventBusService,
    private readonly notifications: NotificationsService,
  ) {}

  onApplicationBootstrap(): void {
    this.bus.on('expenses.claim.submitted', (e) => void this.onSubmitted(e));
    this.bus.on('expenses.claim.approved', (e) => void this.onApproved(e));
    this.bus.on('expenses.claim.rejected', (e) => void this.onRejected(e));
    this.bus.on('expenses.claim.returned', (e) => void this.onReturned(e));
  }

  private async onSubmitted(event: DomainEvent<unknown>): Promise<void> {
    const p = event.payload as {
      claimId: string;
      claimNumber?: string;
      employeeId: string;
      amountPkr: number;
      categoryLabel?: string;
    };
    const employee = await prisma.employee.findUnique({
      where: { id: p.employeeId },
      select: { fullName: true, user: { select: { id: true } } },
    });
    const amount = `₨${p.amountPkr.toLocaleString('en-PK')}`;
    const claimNumber = p.claimNumber ?? p.claimId.slice(-8);
    if (employee?.user?.id) {
      await this.safeSend(
        employee.user.id,
        'expenses.claim-submitted-employee',
        { claimId: p.claimId, claimNumber, amount },
        { type: 'expenseClaim', id: p.claimId },
      );
    }
    const approvers = await this.financeApproverUserIds();
    for (const userId of approvers) {
      await this.safeSend(
        userId,
        'expenses.claim-submitted',
        {
          claimId: p.claimId,
          claimNumber,
          employeeName: employee?.fullName ?? 'Employee',
          amount,
          category: p.categoryLabel ?? 'expense',
        },
        { type: 'expenseClaim', id: p.claimId },
      );
    }
  }

  private async onApproved(event: DomainEvent<unknown>): Promise<void> {
    const p = event.payload as { claimId: string; claimNumber?: string; employeeId: string };
    const userId = await this.employeeUserId(p.employeeId);
    if (!userId) return;
    const claim = await prisma.expenseClaim.findUnique({
      where: { id: p.claimId },
      select: { claimNumber: true, approvalNote: true },
    });
    await this.safeSend(
      userId,
      'expenses.claim-approved',
      {
        claimId: p.claimId,
        claimNumber: claim?.claimNumber ?? p.claimNumber ?? '',
        note: claim?.approvalNote?.trim() ?? '',
      },
      { type: 'expenseClaim', id: p.claimId },
    );
  }

  private async onRejected(event: DomainEvent<unknown>): Promise<void> {
    const p = event.payload as {
      claimId: string;
      claimNumber?: string;
      employeeId: string;
      reason: string;
    };
    const userId = await this.employeeUserId(p.employeeId);
    if (!userId) return;
    await this.safeSend(
      userId,
      'expenses.claim-rejected',
      {
        claimId: p.claimId,
        claimNumber: p.claimNumber ?? '',
        reason: p.reason,
      },
      { type: 'expenseClaim', id: p.claimId },
    );
  }

  private async onReturned(event: DomainEvent<unknown>): Promise<void> {
    const p = event.payload as {
      claimId: string;
      claimNumber?: string;
      employeeId: string;
      reasonCode: string;
      comment?: string | null;
    };
    const userId = await this.employeeUserId(p.employeeId);
    if (!userId) return;
    const feedback = formatExpenseFinanceFeedback(p.reasonCode, p.comment);
    await this.safeSend(
      userId,
      'expenses.claim-returned',
      {
        claimId: p.claimId,
        claimNumber: p.claimNumber ?? '',
        feedback,
      },
      { type: 'expenseClaim', id: p.claimId },
    );
  }

  private async financeApproverUserIds(): Promise<string[]> {
    const rows = await prisma.user.findMany({
      where: {
        isActive: true,
        roles: {
          some: {
            role: {
              permissions: {
                some: { permission: { key: 'expenses:approve_claim' } },
              },
            },
          },
        },
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  private async employeeUserId(employeeId: string): Promise<string | null> {
    const user = await prisma.user.findFirst({
      where: { employeeId, isActive: true },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  private async safeSend(
    recipientUserId: string,
    typeKey: string,
    payload: Record<string, string>,
    source: { type: string; id: string },
  ): Promise<void> {
    try {
      await this.notifications.send({
        recipientUserId,
        typeKey,
        payload,
        source,
        actorId: 'system:expenses',
      });
    } catch (err) {
      this.logger.warn(`Notification ${typeKey} failed: ${(err as Error).message}`);
    }
  }
}
