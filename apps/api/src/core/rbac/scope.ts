/**
 * Row-level scoping helpers.
 *
 * Domain modules that hold per-department data (employees, leave,
 * attendance, payroll, ...) call the helpers here instead of writing
 * raw `where` clauses. This makes "the only way to read employees is
 * the way that respects the viewer's scope" enforceable at the data
 * layer — controllers don't think about scoping; the helper handles it.
 *
 * See ADR 0002 for the rationale.
 */
import { ForbiddenException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types';

const MODULE = 'employees';

const PERM = {
  viewAll: `${MODULE}:view_all`,
  viewTeam: `${MODULE}:view_team`,
  viewOwn: `${MODULE}:view_own`,
  viewSalary: `${MODULE}:view_salary`,
  viewPii: `${MODULE}:view_pii`,
} as const;

export interface EmployeeReadScope {
  /** True if the user can see every employee row regardless of department. */
  viewAll: boolean;
  /**
   * Department IDs the user may read. Empty when viewAll=true OR when
   * the user has no team scope (their effective set is just `ownEmployeeId`).
   */
  departmentIds: string[];
  /** The viewer's own employee id, if any — drives view_own scope. */
  ownEmployeeId: string | null;
  /** Combined: can the viewer see at least one employee row? */
  canRead: boolean;
}

/**
 * Compute the viewer's effective employee-read scope. Pure function;
 * doesn't touch the DB.
 */
export function computeEmployeeReadScope(user: AuthenticatedUser): EmployeeReadScope {
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

/**
 * Build the Prisma WHERE clause that scopes a query to the rows the
 * viewer can read. Combines with a caller-supplied base via AND so
 * filters from query params (search, status, includeArchived) still
 * apply on top.
 *
 * Returns a clause that matches nothing when the viewer can't read
 * anything — preferable to throwing here so list endpoints just
 * return an empty page (the caller can still 403 explicitly when
 * needed by checking `scope.canRead` first).
 */
export function buildEmployeeScopeWhere(
  user: AuthenticatedUser,
  base: Prisma.EmployeeWhereInput = {},
): Prisma.EmployeeWhereInput {
  const scope = computeEmployeeReadScope(user);

  if (scope.viewAll) {
    return base;
  }

  if (!scope.canRead) {
    // Match-nothing sentinel: cuid() values never start with `__none__`.
    return { ...base, id: '__none__' };
  }

  const scopedDisjunction: Prisma.EmployeeWhereInput[] = [];
  if (scope.departmentIds.length > 0) {
    scopedDisjunction.push({ departmentId: { in: scope.departmentIds } });
  }
  if (scope.ownEmployeeId) {
    scopedDisjunction.push({ id: scope.ownEmployeeId });
  }

  return {
    AND: [base, { OR: scopedDisjunction }],
  };
}

/**
 * Throw 403 unless the viewer can read at least one employee row.
 * Useful in single-record endpoints where returning an empty page
 * isn't a meaningful response.
 */
export function assertEmployeeReadable(
  user: AuthenticatedUser,
  employee: { id: string; departmentId: string },
): void {
  const scope = computeEmployeeReadScope(user);
  if (scope.viewAll) return;
  if (scope.ownEmployeeId === employee.id) return;
  if (scope.departmentIds.includes(employee.departmentId)) return;
  throw new ForbiddenException('You do not have access to this employee');
}

export function canViewSalary(user: AuthenticatedUser): boolean {
  return user.permissions.includes(PERM.viewSalary);
}

export function canViewPii(user: AuthenticatedUser): boolean {
  return user.permissions.includes(PERM.viewPii);
}
