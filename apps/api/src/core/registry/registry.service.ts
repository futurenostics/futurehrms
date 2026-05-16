import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { permissionKey, type ModuleManifest } from './types';

/**
 * Collects module manifests at boot and projects them onto the database,
 * the navigation tree, and the runtime event/scheduler wiring.
 *
 * Phase 0: the manifest list is empty (no domain modules registered yet).
 * The plumbing has to work so that registering a fake manifest in a test
 * surfaces its permissions in the DB.
 */
@Injectable()
export class RegistryService implements OnModuleInit {
  private readonly logger = new Logger(RegistryService.name);
  private readonly manifests = new Map<string, ModuleManifest>();

  register(manifest: ModuleManifest): void {
    if (this.manifests.has(manifest.key)) {
      throw new Error(`Module '${manifest.key}' is already registered`);
    }
    this.manifests.set(manifest.key, manifest);
  }

  list(): ModuleManifest[] {
    return [...this.manifests.values()];
  }

  get(key: string): ModuleManifest | undefined {
    return this.manifests.get(key);
  }

  async onModuleInit(): Promise<void> {
    await this.syncPermissions();
  }

  /**
   * Upserts every declared permission into the DB.
   *
   * This is idempotent and additive — old permissions that are no longer
   * declared remain in the table (and may still be assigned to roles)
   * but are not surfaced in the role-management UI. A future cleanup
   * command can prune orphaned permissions; we don't auto-delete because
   * doing so could silently strip access from a custom role.
   */
  private async syncPermissions(): Promise<void> {
    const manifests = this.list();
    if (manifests.length === 0) {
      this.logger.log('No modules registered — permission table left untouched.');
      return;
    }

    for (const manifest of manifests) {
      for (const perm of manifest.permissions) {
        const key = permissionKey(manifest.key, perm.action);
        await prisma.permission.upsert({
          where: { key },
          create: {
            key,
            module: manifest.key,
            action: perm.action,
            description: perm.description,
          },
          update: { description: perm.description },
        });
      }
    }
    this.logger.log(`Synced permissions for ${manifests.length} module(s).`);
  }
}
