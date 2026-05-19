import { Module, type OnModuleInit } from '@nestjs/common';
import { EmailModule } from '../../core/email/email.module';
import { RegistryService } from '../../core/registry/registry.service';
import { EmailChannel } from './channels/email.channel';
import { InAppChannel } from './channels/in-app.channel';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationTypesRegistry } from './notification-types.registry';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { notificationsManifest } from './notifications.manifest';
import { CustomNotificationTypesService } from './custom-notification-types.service';

/**
 * Phase 3 Notifications module.
 *
 * The NotificationTypesRegistry is exported so other modules can call
 * `notificationTypes.register(...)` from their own onModuleInit hooks.
 * The NotificationsService is exported so other modules can call
 * `.send(...)` for domain events.
 */
@Module({
  imports: [EmailModule],
  controllers: [NotificationsController],
  providers: [
    NotificationTypesRegistry,
    NotificationPreferencesService,
    CustomNotificationTypesService,
    InAppChannel,
    EmailChannel,
    NotificationsService,
  ],
  exports: [
    NotificationsService,
    NotificationTypesRegistry,
    NotificationPreferencesService,
    CustomNotificationTypesService,
  ],
})
export class NotificationsModule implements OnModuleInit {
  constructor(
    private readonly registry: RegistryService,
    private readonly customTypes: CustomNotificationTypesService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.registry.register(notificationsManifest);
    // Pull every active CustomNotificationType row into the in-memory
    // registry so the rest of the system treats DB-defined types
    // identically to module-shipped ones.
    await this.customTypes.hydrateRegistryOnBoot();
  }
}
