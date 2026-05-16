import { Global, Module, type OnModuleInit } from '@nestjs/common';
import { AuditService } from './audit.service';
import { RegistryService } from '../registry/registry.service';
import { RequestContextService } from '../request-context/request-context.service';
import { installPrismaAuditMiddleware } from './prisma-audit.middleware';

/**
 * Default set of audited models for Phase 0 — the HR Core writes that
 * any auditor would expect to see in the timeline. Domain modules add
 * to this set by declaring `auditedEntities` in their manifest.
 */
const PHASE_0_AUDITED_MODELS = new Set([
  'Employee',
  'SalaryHistory',
  'Role',
  'Permission',
  'UserRole',
]);

@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule implements OnModuleInit {
  constructor(
    private readonly registry: RegistryService,
    private readonly context: RequestContextService,
  ) {}

  onModuleInit(): void {
    const audited = new Set(PHASE_0_AUDITED_MODELS);
    for (const manifest of this.registry.list()) {
      for (const entity of manifest.auditedEntities ?? []) {
        audited.add(entity);
      }
    }
    installPrismaAuditMiddleware(audited, this.context);
  }
}
