import { Module, type OnModuleInit } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { RegistryService } from '../../core/registry/registry.service';
import { ReminderRulesService } from './reminder-rules.service';
import { RemindersController } from './reminders.controller';
import { remindersManifest } from './reminders.manifest';

/**
 * Phase 3 Reminders module — backend kickoff.
 *
 * Session 2 ships:
 *   - ReminderRule + Reminder Prisma models (migration applied)
 *   - reminders manifest with permissions + nav item + scheduled-job
 *     and event-subscription declarations
 *   - ReminderRulesService: CRUD + publish + archive + trigger-test
 *   - RemindersController: REST surface for the upcoming Reminder
 *     Rules list page
 *
 * Session 3 adds:
 *   - Event-based trigger evaluator (listens on `**` and inserts
 *     Reminder rows when an active rule's spec matches)
 *   - Cron-based scheduler tick (hourly; runs built-in queries)
 *   - Recipient resolver registry
 *   - Frontend rules list + editor + scheduled-reminders viewer
 */
@Module({
  imports: [NotificationsModule],
  controllers: [RemindersController],
  providers: [ReminderRulesService],
  exports: [ReminderRulesService],
})
export class RemindersModule implements OnModuleInit {
  constructor(private readonly registry: RegistryService) {}

  onModuleInit(): void {
    this.registry.register(remindersManifest);
  }
}
