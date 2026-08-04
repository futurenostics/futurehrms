import { Logger, Module, type OnModuleInit } from '@nestjs/common';
import { RegistryService } from '../../core/registry/registry.service';
import { EventBusService } from '../../core/events/event-bus.service';
import { ApprovalTypeRegistry } from '../approvals/approval-type.registry';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationTypesRegistry } from '../notifications/notification-types.registry';
import { CommissionsController } from './commissions.controller';
import { CommissionRulesService } from './commission-rules.service';
import { CommissionRunsService } from './commission-runs.service';
import { CommissionRunsController } from './commission-runs.controller';
import { CommissionDisputesService } from './commission-disputes.service';
import { CommissionDisputesController } from './commission-disputes.controller';
import { EmployeeCommissionsController } from './employee-commissions.controller';
import { CommissionTimelineSubscriber } from './commission-timeline.subscriber';
import { CommissionNotificationSubscriber } from './commission-notification.subscriber';
import { CommissionSchedulerService } from './commission-scheduler.service';
import { commissionsManifest } from './commissions.manifest';
import { buildCommissionRunApprovalType } from './commission-run.approval-type';
import { COMMISSIONS_NOTIFICATION_TYPES } from './commissions.notification-types';

@Module({
  imports: [NotificationsModule],
  controllers: [
    CommissionsController, // rules
    CommissionRunsController, // runs
    CommissionDisputesController, // disputes
    EmployeeCommissionsController, // per-employee breakdowns
  ],
  providers: [
    CommissionRulesService,
    CommissionRunsService,
    CommissionDisputesService,
    CommissionTimelineSubscriber,
    CommissionNotificationSubscriber,
    CommissionSchedulerService,
  ],
  exports: [CommissionRulesService, CommissionRunsService],
})
export class CommissionsModule implements OnModuleInit {
  private readonly logger = new Logger(CommissionsModule.name);

  constructor(
    private readonly registry: RegistryService,
    private readonly events: EventBusService,
    private readonly approvalTypes: ApprovalTypeRegistry,
    private readonly notificationTypes: NotificationTypesRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(commissionsManifest);
    this.approvalTypes.register(buildCommissionRunApprovalType(this.events, this.logger));
    this.notificationTypes.registerMany(COMMISSIONS_NOTIFICATION_TYPES);
  }
}
