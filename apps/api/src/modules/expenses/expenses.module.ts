import { Logger, Module, type OnModuleInit } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { RegistryService } from '../../core/registry/registry.service';
import { EventBusService } from '../../core/events/event-bus.service';
import { ApprovalTypeRegistry } from '../approvals/approval-type.registry';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationTypesRegistry } from '../notifications/notification-types.registry';
import { ExpenseClaimsController } from './expense-claims.controller';
import { ExpenseClaimsService } from './expense-claims.service';
import { ExpenseTimelineSubscriber } from './expense-timeline.subscriber';
import { ExpenseNotificationSubscriber } from './expense-notification.subscriber';
import { expensesManifest } from './expenses.manifest';
import { buildExpenseClaimApprovalType } from './expense-claim.approval-type';
import { EXPENSE_NOTIFICATION_TYPES } from './expenses.notification-types';

@Module({
  imports: [NotificationsModule],
  controllers: [ExpenseClaimsController],
  providers: [ExpenseClaimsService, ExpenseTimelineSubscriber, ExpenseNotificationSubscriber],
  exports: [ExpenseClaimsService],
})
export class ExpensesModule implements OnModuleInit {
  private readonly logger = new Logger(ExpensesModule.name);

  constructor(
    private readonly registry: RegistryService,
    private readonly events: EventBusService,
    private readonly approvalTypes: ApprovalTypeRegistry,
    private readonly notificationTypes: NotificationTypesRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(expensesManifest);
    this.approvalTypes.register(buildExpenseClaimApprovalType(this.events, this.logger));
    for (const t of EXPENSE_NOTIFICATION_TYPES) {
      this.notificationTypes.register(t);
    }
    void this.retireLegacyOpdGymPermissions();
  }

  /** OPD/Gym modules were folded into Expenses; drop leftover permission rows. */
  private async retireLegacyOpdGymPermissions(): Promise<void> {
    try {
      const leftover = await prisma.permission.findMany({
        where: { OR: [{ key: { startsWith: 'opd:' } }, { key: { startsWith: 'gym:' } }] },
        select: { id: true },
      });
      if (leftover.length === 0) return;
      const ids = leftover.map((p) => p.id);
      await prisma.rolePermission.deleteMany({ where: { permissionId: { in: ids } } });
      await prisma.permission.deleteMany({ where: { id: { in: ids } } });
      this.logger.log(`Retired ${leftover.length} leftover OPD/Gym permission(s).`);
    } catch (err) {
      this.logger.warn(`Could not retire leftover OPD/Gym permissions: ${(err as Error).message}`);
    }
  }
}
