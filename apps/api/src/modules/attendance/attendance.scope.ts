/**
 * Row-level scoping for Attendance.
 *
 * Mirrors core/rbac/scope.ts (ADR 0002) but for AttendanceRecord.
 * Unlike Employee/Project, AttendanceRecord has no direct departmentId
 * column, so the "team" scope filters through the employee relation
 * instead. The viewer's effective set is the union of:
 *
 *   1. If `attendance:view_all` — every record.
 *   2. If `attendance:view_team` — every record whose employee's
 *      departmentId is in the viewer's scopedDepartmentIds.
 *   3. If `attendance:view_own` — every record belonging to the
 *      viewer's own employee row.
 */
import { ForbiddenException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../core/auth/types';

const MODULE = 'attendance';

const PERM = {
  viewAll: `${MODULE}:view_all`,
  viewTeam: `${MODULE}:view_team`,
  viewOwn: `${MODULE}:view_own`,
} as const;

export interface AttendanceReadScope {
  viewAll: boolean;
  /** Department IDs the viewer can see records from. Empty when viewAll=true. */
  departmentIds: string[];
  /** The viewer's own employee id, if any — drives view_own scope. */
  ownEmployeeId: string | null;
  canRead: boolean;
}

export function computeAttendanceReadScope(user: AuthenticatedUser): AttendanceReadScope {
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

export function buildAttendanceScopeWhere(
  user: AuthenticatedUser,
  base: Prisma.AttendanceRecordWhereInput = {},
): Prisma.AttendanceRecordWhereInput {
  const scope = computeAttendanceReadScope(user);

  if (scope.viewAll) {
    return base;
  }

  if (!scope.canRead) {
    // Match-nothing sentinel: cuid() values never start with `__none__`.
    return { ...base, id: '__none__' };
  }

  const disjunction: Prisma.AttendanceRecordWhereInput[] = [];
  if (scope.departmentIds.length > 0) {
    disjunction.push({ employee: { departmentId: { in: scope.departmentIds } } });
  }
  if (scope.ownEmployeeId) {
    disjunction.push({ employeeId: scope.ownEmployeeId });
  }

  return { AND: [base, { OR: disjunction }] };
}

export function assertAttendanceReadable(
  user: AuthenticatedUser,
  record: { employeeId: string; employee: { departmentId: string } },
): void {
  const scope = computeAttendanceReadScope(user);
  if (scope.viewAll) return;
  if (scope.ownEmployeeId === record.employeeId) return;
  if (scope.departmentIds.includes(record.employee.departmentId)) return;
  throw new ForbiddenException('You do not have access to this attendance record');
}
