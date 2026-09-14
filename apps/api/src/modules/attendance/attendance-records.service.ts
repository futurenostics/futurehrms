/**
 * Attendance record listing — read-side of the module, split out from
 * PunchesService (which only owns the write path: capturing punches).
 *
 * This is the first caller of `attendance.scope.ts`'s
 * computeAttendanceReadScope/buildAttendanceScopeWhere — that file
 * shipped ahead of any endpoint that needed it. `view_own` sees only
 * their own employee's records; `view_team` adds their scoped
 * departments; `view_all` sees everything. An explicit `employeeId`
 * filter narrows further but never widens past what the scope allows.
 */
import { Injectable } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import type { AuthenticatedUser } from '../../core/auth/types';
import { buildAttendanceScopeWhere } from './attendance.scope';
import { toPublicAttendanceRecord, type AttendanceRecordPublic } from './attendance-record.mapper';

export interface ListAttendanceRecordsQuery {
  from: Date;
  to: Date;
  employeeId?: string;
}

export interface AttendanceRecordsList {
  items: AttendanceRecordPublic[];
  /** Count per status among the returned rows — cheap to fold in alongside the query. */
  tallies: Record<string, number>;
}

@Injectable()
export class AttendanceRecordsService {
  async list(
    viewer: AuthenticatedUser,
    query: ListAttendanceRecordsQuery,
  ): Promise<AttendanceRecordsList> {
    const where = buildAttendanceScopeWhere(viewer, {
      date: { gte: query.from, lte: query.to },
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
    });

    const rows = await prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const items = rows.map(toPublicAttendanceRecord);
    const tallies: Record<string, number> = {};
    for (const item of items) {
      tallies[item.status] = (tallies[item.status] ?? 0) + 1;
    }

    return { items, tallies };
  }
}
