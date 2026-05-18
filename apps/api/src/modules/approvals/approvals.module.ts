import { Global, Module, type OnModuleInit } from '@nestjs/common';
import { RegistryService } from '../../core/registry/registry.service';
import { ApprovalTypeRegistry } from './approval-type.registry';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';
import { approvalsManifest } from './approvals.manifest';

/**
 * Phase 3 Approvals module.
 *
 * @Global so other modules can inject the registry + service without
 * importing this module in their own imports list (the alternative
 * would be re-exporting from every consumer module).
 */
@Global()
@Module({
  controllers: [ApprovalsController],
  providers: [ApprovalTypeRegistry, ApprovalsService],
  exports: [ApprovalTypeRegistry, ApprovalsService],
})
export class ApprovalsModule implements OnModuleInit {
  constructor(private readonly registry: RegistryService) {}

  onModuleInit(): void {
    this.registry.register(approvalsManifest);
  }
}
