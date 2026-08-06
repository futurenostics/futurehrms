import { Module, type OnModuleInit } from '@nestjs/common';
import { RegistryService } from '../../core/registry/registry.service';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { dashboardManifest } from './dashboard.manifest';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule implements OnModuleInit {
  constructor(private readonly registry: RegistryService) {}

  onModuleInit(): void {
    this.registry.register(dashboardManifest);
  }
}
