import { Injectable } from '@nestjs/common';
import { prisma } from '@futurenostics/db';

/**
 * Resolves the effective permission set for a user.
 *
 * Permissions are sourced from the user's `UserRole` rows joined to
 * `RolePermission`. The result is a flat set of permission keys
 * (e.g. `commissions:approve`). Callers (the PermissionGuard, the
 * /auth/me endpoint) treat presence in the set as the only signal.
 */
@Injectable()
export class RbacService {
  async getEffectivePermissions(userId: string): Promise<Set<string>> {
    const rows = await prisma.userRole.findMany({
      where: { userId },
      select: {
        role: {
          select: {
            permissions: {
              select: { permission: { select: { key: true } } },
            },
          },
        },
      },
    });

    const keys = new Set<string>();
    for (const row of rows) {
      for (const perm of row.role.permissions) {
        keys.add(perm.permission.key);
      }
    }
    return keys;
  }

  async getRolesForUser(userId: string): Promise<string[]> {
    const rows = await prisma.userRole.findMany({
      where: { userId },
      select: { role: { select: { slug: true } } },
    });
    return rows.map((r) => r.role.slug);
  }
}
