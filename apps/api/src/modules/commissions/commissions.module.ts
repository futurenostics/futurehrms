import { Module, type OnModuleInit } from '@nestjs/common';
import { RegistryService } from '../../core/registry/registry.service';
import { CommissionsController } from './commissions.controller';
import { CommissionRulesService } from './commission-rules.service';
import { CommissionRunsService } from './commission-runs.service';
import { CommissionRunsController } from './commission-runs.controller';
import { EmployeeCommissionsController } from './employee-commissions.controller';
import { CommissionTimelineSubscriber } from './commission-timeline.subscriber';
import { CommissionSchedulerService } from './commission-scheduler.service';
import { commissionsManifest } from './commissions.manifest';

@Module({
  controllers: [
    CommissionsController, // rules
    CommissionRunsController, // runs
    EmployeeCommissionsController, // per-employee breakdowns
  ],
  providers: [
    CommissionRulesService,
    CommissionRunsService,
    CommissionTimelineSubscriber,
    CommissionSchedulerService,
  ],
  exports: [CommissionRulesService, CommissionRunsService],
})
export class CommissionsModule implements OnModuleInit {
  constructor(private readonly registry: RegistryService) {}

  onModuleInit(): void {
    this.registry.register(commissionsManifest);
  }
}
