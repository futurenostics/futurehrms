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

  /**
   * The department IDs the user's roles are scoped to. Used by the
   * row-level scoping helpers in modules with team-only views
   * (employees, leave, attendance, ...).
   *
   * A user holding ANY role with `departmentScope = null` (global)
   * implicitly sees every department — that case is signalled by an
   * empty list combined with a global permission like `view_all` on
   * the consuming module. Callers must check the permission first.
   */
  async getScopedDepartmentIds(userId: string): Promise<string[]> {
    const rows = await prisma.userRole.findMany({
      where: { userId, departmentScope: { not: null } },
      select: { departmentScope: true },
    });
    const set = new Set<string>();
    for (const row of rows) {
      if (row.departmentScope) set.add(row.departmentScope);
    }
    return [...set];
  }
}
