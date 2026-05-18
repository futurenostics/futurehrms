import { Logger, Module, type OnModuleInit } from '@nestjs/common';
import { RegistryService } from '../../core/registry/registry.service';
import { EventBusService } from '../../core/events/event-bus.service';
import { ApprovalTypeRegistry } from '../approvals/approval-type.registry';
import { CommissionsController } from './commissions.controller';
import { CommissionRulesService } from './commission-rules.service';
import { CommissionRunsService } from './commission-runs.service';
import { CommissionRunsController } from './commission-runs.controller';
import { EmployeeCommissionsController } from './employee-commissions.controller';
import { CommissionTimelineSubscriber } from './commission-timeline.subscriber';
import { CommissionSchedulerService } from './commission-scheduler.service';
import { commissionsManifest } from './commissions.manifest';
import { buildCommissionRunApprovalType } from './commission-run.approval-type';

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
  private readonly logger = new Logger(CommissionsModule.name);

  constructor(
    private readonly registry: RegistryService,
    private readonly events: EventBusService,
    private readonly approvalTypes: ApprovalTypeRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(commissionsManifest);
    this.approvalTypes.register(buildCommissionRunApprovalType(this.events, this.logger));
  }
}
