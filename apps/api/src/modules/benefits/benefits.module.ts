import { Logger, Module, type OnModuleInit } from '@nestjs/common';
import { RegistryService } from '../../core/registry/registry.service';
import { BenefitsController } from './benefits.controller';
import { BenefitsService } from './benefits.service';
import { BenefitsEventSubscriber } from './benefits.subscriber';
import { benefitsManifest } from './benefits.manifest';

@Module({
  controllers: [BenefitsController],
  providers: [BenefitsService, BenefitsEventSubscriber],
  exports: [BenefitsService],
})
export class BenefitsModule implements OnModuleInit {
  private readonly logger = new Logger(BenefitsModule.name);

  constructor(
    private readonly registry: RegistryService,
    private readonly benefits: BenefitsService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.registry.register(benefitsManifest);
    try {
      await this.benefits.ensureDefaultPolicies();
    } catch (err) {
      this.logger.warn(`Could not seed default benefit policies: ${(err as Error).message}`);
    }
  }
}
