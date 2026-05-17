import { Module, type OnModuleInit } from '@nestjs/common';
import { RegistryService } from '../../core/registry/registry.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { projectsManifest } from './projects.manifest';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule implements OnModuleInit {
  constructor(private readonly registry: RegistryService) {}

  onModuleInit(): void {
    this.registry.register(projectsManifest);
  }
}
