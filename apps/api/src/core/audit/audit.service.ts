import { Injectable } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { RequestContextService } from '../request-context/request-context.service';

/**
 * Writes structured audit-log entries.
 *
 * Most writes flow through the Prisma audit middleware (see
 * `prisma-audit.middleware.ts`), which intercepts model writes and
 * resolves the actor from request context. This service is the explicit
 * escape hatch for non-Prisma actions worth logging — login attempts,
 * permission denials, manual approval overrides, etc.
 */
@Injectable()
export class AuditService {
  constructor(private readonly context: RequestContextService) {}

  async record(input: {
    module: string;
    entity: string;
    entityId: string;
    action: string;
    before?: unknown;
    after?: unknown;
    actorId?: string;
  }): Promise<void> {
    const ctx = this.context.get();
    await prisma.auditLog.create({
      data: {
        module: input.module,
        entity: input.entity,
        entityId: input.entityId,
        action: input.action,
        before: (input.before ?? null) as never,
        after: (input.after ?? null) as never,
        actorId: input.actorId ?? ctx?.actorId ?? null,
        ipAddress: ctx?.ipAddress ?? null,
        userAgent: ctx?.userAgent ?? null,
      },
    });
  }
}
