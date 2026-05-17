/**
 * Row-level scoping for Projects.
 *
 * Mirrors core/rbac/scope.ts but for Project. The viewer's effective
 * project set is the union of:
 *
 *   1. If `projects:view_all` — every non-archived row.
 *   2. If `projects:view_team` — every project whose departmentId is
 *      in the viewer's scopedDepartmentIds.
 *   3. If `projects:view_own` — every project the viewer is currently
 *      an assignment on (assignment.removedAt IS NULL).
 *
 * The OR is computed once and applied as a Prisma WHERE clause so
 * list and findUnique both go through the same gate.
 */
import { ForbiddenException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../core/auth/types';

const MODULE = 'projects';
const PERM = {
  viewAll: `${MODULE}:view_all`,
  viewTeam: `${MODULE}:view_team`,
  viewOwn: `${MODULE}:view_own`,
} as const;

export interface ProjectReadScope {
  viewAll: boolean;
  /** Department IDs the viewer can see projects from. Empty when viewAll=true. */
  departmentIds: string[];
  /**
   * The viewer's own employee id, if any. When set, projects the
   * employee is currently assigned to are visible regardless of
   * department scope.
   */
  ownEmployeeId: string | null;
  canRead: boolean;
}

export function computeProjectReadScope(user: AuthenticatedUser): ProjectReadScope {
  const perms = new Set(user.permissions);
  const viewAll = perms.has(PERM.viewAll);
  const viewTeam = perms.has(PERM.viewTeam);
  const viewOwn = perms.has(PERM.viewOwn);

  if (viewAll) {
    return {
      viewAll: true,
      departmentIds: [],
      ownEmployeeId: user.employeeId,
      canRead: true,
    };
  }

  const departmentIds = viewTeam ? user.scopedDepartmentIds : [];
  const ownEmployeeId = viewOwn ? user.employeeId : null;

  return {
    viewAll: false,
    departmentIds,
    ownEmployeeId,
    canRead: departmentIds.length > 0 || ownEmployeeId !== null,
  };
}

export function buildProjectScopeWhere(
  user: AuthenticatedUser,
  base: Prisma.ProjectWhereInput = {},
): Prisma.ProjectWhereInput {
  const scope = computeProjectReadScope(user);
  if (scope.viewAll) return base;
  if (!scope.canRead) {
    // Match-nothing sentinel — cuid() values never start with `__none__`.
    return { ...base, id: '__none__' };
  }

  const disjunction: Prisma.ProjectWhereInput[] = [];
  if (scope.departmentIds.length > 0) {
    disjunction.push({ departmentId: { in: scope.departmentIds } });
  }
  if (scope.ownEmployeeId) {
    disjunction.push({
      assignments: {
        some: {
          employeeId: scope.ownEmployeeId,
          removedAt: null,
        },
      },
    });
  }

  return { AND: [base, { OR: disjunction }] };
}

export function assertProjectReadable(
  user: AuthenticatedUser,
  project: {
    id: string;
    departmentId: string;
    assignments: Array<{ employeeId: string; removedAt: Date | null }>;
  },
): void {
  const scope = computeProjectReadScope(user);
  if (scope.viewAll) return;
  if (scope.departmentIds.includes(project.departmentId)) return;
  if (
    scope.ownEmployeeId &&
    project.assignments.some((a) => a.employeeId === scope.ownEmployeeId && a.removedAt === null)
  ) {
    return;
  }
  throw new ForbiddenException('You do not have access to this project');
}
