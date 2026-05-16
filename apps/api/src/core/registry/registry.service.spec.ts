import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { prisma } from '@futurenostics/db';
import { RegistryService } from './registry.service';
import type { ModuleManifest } from './types';

/**
 * Registry plumbing test.
 *
 * Asserts that a manifest registered before bootstrap is reflected in
 * the Permission table after `onModuleInit` runs. This guards the
 * contract every domain module relies on: declare permissions in the
 * manifest, find them in the DB after the app boots.
 */
describe('RegistryService', () => {
  const TEST_MODULE_KEY = 'registry-test-module';

  const fakeManifest: ModuleManifest = {
    key: TEST_MODULE_KEY,
    name: 'Registry Test',
    permissions: [
      { action: 'view', description: 'View test entries' },
      { action: 'edit', description: 'Edit test entries' },
    ],
  };

  let registry: RegistryService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [RegistryService],
    }).compile();
    registry = moduleRef.get(RegistryService);
    await prisma.permission.deleteMany({ where: { module: TEST_MODULE_KEY } });
  });

  afterAll(async () => {
    await prisma.permission.deleteMany({ where: { module: TEST_MODULE_KEY } });
    await prisma.$disconnect();
  });

  it('upserts every declared permission on init', async () => {
    registry.register(fakeManifest);
    await registry.onModuleInit();

    const rows = await prisma.permission.findMany({
      where: { module: TEST_MODULE_KEY },
      orderBy: { action: 'asc' },
    });

    expect(rows.map((r) => r.key).sort()).toEqual([
      `${TEST_MODULE_KEY}:edit`,
      `${TEST_MODULE_KEY}:view`,
    ]);
    expect(rows.find((r) => r.action === 'view')?.description).toBe('View test entries');
  });

  it('is idempotent across repeated init calls', async () => {
    registry.register(fakeManifest);
    await registry.onModuleInit();
    await registry.onModuleInit();

    const count = await prisma.permission.count({ where: { module: TEST_MODULE_KEY } });
    expect(count).toBe(2);
  });

  it('updates description without creating duplicates', async () => {
    registry.register(fakeManifest);
    await registry.onModuleInit();

    // Simulate a second boot where the description has been edited.
    const next = new RegistryService();
    next.register({
      ...fakeManifest,
      permissions: [{ action: 'view', description: 'Updated copy' }],
    });
    await next.onModuleInit();

    const row = await prisma.permission.findUnique({
      where: { key: `${TEST_MODULE_KEY}:view` },
    });
    expect(row?.description).toBe('Updated copy');
  });
});
