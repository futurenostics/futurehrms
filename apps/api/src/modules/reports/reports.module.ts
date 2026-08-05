import { Module, type OnModuleInit } from '@nestjs/common';
import { RegistryService } from '../../core/registry/registry.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportSchedulerService } from './report-scheduler.service';
import { reportsManifest } from './reports.manifest';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportSchedulerService],
  exports: [ReportsService],
})
export class ReportsModule implements OnModuleInit {
  constructor(private readonly registry: RegistryService) {}

  onModuleInit(): void {
    this.registry.register(reportsManifest);
  }
}
