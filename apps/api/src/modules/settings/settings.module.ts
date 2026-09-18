import { Module, type OnModuleInit } from '@nestjs/common';
import { RegistryService } from '../../core/registry/registry.service';
import { settingsManifest } from './settings.manifest';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';

/**
 * Settings module — Layer 1 "Company Configuration" screens
 * (docs/layer-1-company-configuration.md). Departments (1.1) ships
 * first; job titles, employee statuses, company profile, roles, and
 * user accounts land here as sibling controllers/services in later
 * pieces.
 */
@Module({
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
})
export class SettingsModule implements OnModuleInit {
  constructor(private readonly registry: RegistryService) {}

  onModuleInit(): void {
    this.registry.register(settingsManifest);
  }
}
