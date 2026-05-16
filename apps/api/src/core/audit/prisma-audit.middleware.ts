import { Logger } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import type { Prisma } from '@prisma/client';
import type { RequestContextService } from '../request-context/request-context.service';

/**
 * Installs a Prisma extension that mirrors every write on an audited
 * model into the AuditLog table.
 *
 * Modules opt-in by listing their entity names in their manifest's
 * `auditedEntities`. The set is collected once at boot and passed in
 * here. We use the Prisma client extension API (the documented
 * replacement for `prisma.$use`, removed in Prisma 6).
 *
 * For Phase 0, audited entities are: Employee, SalaryHistory, Role,
 * Permission, UserRole.
 */
export function installPrismaAuditMiddleware(
  auditedModels: Set<string>,
  context: RequestContextService,
): void {
  const logger = new Logger('PrismaAudit');

  prisma.$use(async (params, next) => {
    const result = (await next(params)) as unknown;

    if (!params.model || !auditedModels.has(params.model)) {
      return result;
    }

    const action = mapAction(params.action);
    if (!action) {
      return result;
    }

    try {
      const ctx = context.get();
      const after = isRecord(result) ? result : null;
      const before = extractBefore(params.args);
      const entityId = extractId(result, before);

      if (!entityId) {
        return result;
      }

      await prisma.auditLog.create({
        data: {
          module: params.model.toLowerCase(),
          entity: params.model,
          entityId,
          action,
          before: before as Prisma.InputJsonValue,
          after: after as Prisma.InputJsonValue,
          actorId: ctx?.actorId ?? null,
          ipAddress: ctx?.ipAddress ?? null,
          userAgent: ctx?.userAgent ?? null,
        },
      });
    } catch (err) {
      logger.warn(
        `Audit log skipped for ${params.model}.${params.action}: ${(err as Error).message}`,
      );
    }

    return result;
  });
}

function mapAction(action: Prisma.PrismaAction): string | null {
  switch (action) {
    case 'create':
    case 'createMany':
      return 'create';
    case 'update':
    case 'updateMany':
    case 'upsert':
      return 'update';
    case 'delete':
    case 'deleteMany':
      return 'delete';
    default:
      return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractBefore(args: unknown): Record<string, unknown> | null {
  if (!isRecord(args)) return null;
  const data = args['data'];
  return isRecord(data) ? data : null;
}

function extractId(after: unknown, before: Record<string, unknown> | null): string | null {
  if (isRecord(after) && typeof after['id'] === 'string') return after['id'];
  if (before && typeof before['id'] === 'string') return before['id'];
  return null;
}
