/**
 * Shared Prisma client.
 *
 * The Prisma schema lives in `apps/api/prisma/schema.prisma` and generates
 * its client into `node_modules/@prisma/client` (per the workspace install).
 * This package re-exports a singleton wrapper so any consumer (apps/api,
 * scripts, future services) imports the same instance and middleware stack.
 */
import { PrismaClient } from '@prisma/client';

declare global {
  var __fnPrisma: PrismaClient | undefined;
}

const logLevels =
  process.env.NODE_ENV === 'production'
    ? (['error', 'warn'] as const)
    : (['query', 'error', 'warn'] as const);

export const prisma: PrismaClient =
  globalThis.__fnPrisma ??
  new PrismaClient({
    log: logLevels.map((level) => ({ level, emit: 'event' })),
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__fnPrisma = prisma;
}

export type { PrismaClient } from '@prisma/client';
export * from '@prisma/client';
