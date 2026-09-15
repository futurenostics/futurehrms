import { Logger, Module, type OnModuleInit } from '@nestjs/common';
import { RegistryService } from '../../core/registry/registry.service';
import { EventBusService } from '../../core/events/event-bus.service';
import { ApprovalTypeRegistry } from '../approvals/approval-type.registry';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationTypesRegistry } from '../notifications/notification-types.registry';
import { OpdClaimsController } from './opd-claims.controller';
import { OpdClaimsService } from './opd-claims.service';
import { OpdTimelineSubscriber } from './opd-timeline.subscriber';
import { OpdNotificationSubscriber } from './opd-notification.subscriber';
import { opdManifest } from './opd.manifest';
import { buildOpdClaimApprovalType } from './opd-claim.approval-type';
import { OPD_NOTIFICATION_TYPES } from './opd.notification-types';

@Module({
  imports: [NotificationsModule],
  controllers: [OpdClaimsController],
  providers: [OpdClaimsService, OpdTimelineSubscriber, OpdNotificationSubscriber],
  exports: [OpdClaimsService],
})
export class OpdModule implements OnModuleInit {
  private readonly logger = new Logger(OpdModule.name);

  constructor(
    private readonly registry: RegistryService,
    private readonly events: EventBusService,
    private readonly approvalTypes: ApprovalTypeRegistry,
    private readonly notificationTypes: NotificationTypesRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(opdManifest);
    this.approvalTypes.register(buildOpdClaimApprovalType(this.events, this.logger));
    for (const t of OPD_NOTIFICATION_TYPES) {
      this.notificationTypes.register(t);
    }
  }
}
