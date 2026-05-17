import { Module, type OnModuleInit } from '@nestjs/common';
import { RegistryService } from '../../core/registry/registry.service';
import { CommissionsController } from './commissions.controller';
import { CommissionRulesService } from './commission-rules.service';
import { commissionsManifest } from './commissions.manifest';

@Module({
  controllers: [CommissionsController],
  providers: [CommissionRulesService],
  exports: [CommissionRulesService],
})
export class CommissionsModule implements OnModuleInit {
  constructor(private readonly registry: RegistryService) {}

  onModuleInit(): void {
    this.registry.register(commissionsManifest);
  }
}
