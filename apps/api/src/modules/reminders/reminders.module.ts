import { Module, type OnModuleInit } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationTypesRegistry } from '../notifications/notification-types.registry';
import { RegistryService } from '../../core/registry/registry.service';
import { RecipientResolverRegistry } from './recipient-resolver';
import { ReminderRulesService } from './reminder-rules.service';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { RemindersController } from './reminders.controller';
import { RemindersReadService } from './reminders-read.service';
import { TriggerEvaluatorService } from './trigger-evaluator.service';
import { remindersManifest } from './reminders.manifest';
import { REMINDERS_NOTIFICATION_TYPES } from './reminders.notification-types';

/**
 * Phase 3 Reminders module — full pipeline.
 *
 * Wires:
 *   - rules service (CRUD + publish + archive + trigger-test)
 *   - read service (scheduled list + timeline + per-rule fire counts)
 *   - recipient resolver registry (built-ins registered at construction)
 *   - trigger evaluator (subscribes to `**` on app bootstrap)
 *   - scheduler service (BullMQ hourly cron + worker)
 *   - 8 notification types matching the design's Email template column
 */
@Module({
  imports: [NotificationsModule],
  controllers: [RemindersController],
  providers: [
    ReminderRulesService,
    RemindersReadService,
    RecipientResolverRegistry,
    TriggerEvaluatorService,
    ReminderSchedulerService,
  ],
  exports: [ReminderRulesService, ReminderSchedulerService],
})
export class RemindersModule implements OnModuleInit {
  constructor(
    private readonly registry: RegistryService,
    private readonly notificationTypes: NotificationTypesRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(remindersManifest);
    this.notificationTypes.registerMany(REMINDERS_NOTIFICATION_TYPES);
  }
}
