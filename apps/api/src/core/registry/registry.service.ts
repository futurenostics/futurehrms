import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
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
/**
 * Registration timing note: domain modules call `register()` from their
 * own `onModuleInit`. RegistryService waits until `onApplicationBootstrap`
 * to sync to the DB — Nest fires that hook after every module's
 * `onModuleInit` has resolved, so the registry sees the full manifest
 * list rather than a partial slice ordered by import position.
 */
@Injectable()
export class RegistryService implements OnApplicationBootstrap {
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

  async onApplicationBootstrap(): Promise<void> {
    await this.syncPermissions();
  }

  /** Public for tests that want to verify the upsert happens. */
  async syncPermissionsNow(): Promise<void> {
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

    await this.applyDefaultRolePermissions(manifests);
    await this.grantAllToSuperAdmin();

    this.logger.log(`Synced permissions for ${manifests.length} module(s).`);
  }

  /**
   * Apply each manifest's declared defaultRolePermissions to the matching
   * system roles. Idempotent — uses upsert on the join row. Missing
   * roles or permissions are skipped silently.
   */
  private async applyDefaultRolePermissions(manifests: ModuleManifest[]): Promise<void> {
    const attachments = manifests.flatMap((m) =>
      (m.defaultRolePermissions ?? []).flatMap((attachment) =>
        attachment.actions.map((action) => ({
          roleSlug: attachment.roleSlug,
          permKey: permissionKey(m.key, action),
        })),
      ),
    );
    if (attachments.length === 0) return;

    const [roles, perms] = await Promise.all([
      prisma.role.findMany({
        where: { slug: { in: [...new Set(attachments.map((a) => a.roleSlug))] } },
      }),
      prisma.permission.findMany({
        where: { key: { in: [...new Set(attachments.map((a) => a.permKey))] } },
      }),
    ]);
    const roleBySlug = new Map(roles.map((r) => [r.slug, r]));
    const permByKey = new Map(perms.map((p) => [p.key, p]));

    for (const attachment of attachments) {
      const role = roleBySlug.get(attachment.roleSlug);
      const perm = permByKey.get(attachment.permKey);
      if (!role || !perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        create: { roleId: role.id, permissionId: perm.id },
        update: {},
      });
    }
  }

  /**
   * Super-admin is privileged-by-definition: it gets every permission
   * the system has, automatically. Re-runs each boot so newly-registered
   * permissions land immediately rather than waiting for a manual grant.
   */
  private async grantAllToSuperAdmin(): Promise<void> {
    const role = await prisma.role.findUnique({ where: { slug: 'super_admin' } });
    if (!role) return;
    const perms = await prisma.permission.findMany({ select: { id: true } });
    for (const perm of perms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        create: { roleId: role.id, permissionId: perm.id },
        update: {},
      });
    }
  }
}
