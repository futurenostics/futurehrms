import { Module, type OnModuleInit } from '@nestjs/common';
import { RegistryService } from '../../core/registry/registry.service';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { employeesManifest } from './employees.manifest';

@Module({
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule implements OnModuleInit {
  constructor(private readonly registry: RegistryService) {}

  onModuleInit(): void {
    this.registry.register(employeesManifest);
  }
}
