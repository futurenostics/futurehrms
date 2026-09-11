/**
 * Punch capture — the endpoint an employee hits to check in/out.
 *
 * Flow per punch (mirrors the reference spec's Section 4.1, adapted):
 *   1. Debounce — reject a second punch within 2 minutes of the last one.
 *   2. Resolve today's date in the org's local timezone (not UTC — a
 *      punch just before UTC midnight must still land on the correct
 *      local calendar day).
 *   3. Resolve the active Shift via ShiftAssignment (individual beats
 *      department, per `priority`) — 400 if none is assigned.
 *   4. Resolve the active AttendancePolicy the same way, falling back
 *      to sane defaults if HR hasn't configured one yet.
 *   5. Find-or-create today's AttendanceRecord, then apply the punch
 *      and run the rule engine, all inside one transaction (a punch
 *      saved but its record left unclassified would be a real
 *      inconsistency, not just a cosmetic one).
 *
 * One check-in and one check-out per day for this phase — matches the
 * schema (single checkIn/checkOut columns, not a list of sessions).
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import type { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../core/auth/types';
import { AuditService } from '../../core/audit/audit.service';
import { wallClock, DEFAULT_TZ } from '../reminders/tz-utils';
import {
  buildPenaltyFlags,
  calculateOvertimeHours,
  calculateWorkingHours,
  classifyPunchStatus,
} from './attendance-rule-engine';

const DEBOUNCE_MS = 2 * 60 * 1000;

const DEFAULT_POLICY = {
  workingHoursPerDay: 8,
  maxOvertimeHoursDaily: null as number | null,
};

export type PunchType = 'in' | 'out';

export interface PunchInput {
  punchType: PunchType;
  source?: string;
}

export interface AttendanceRecordPublic {
  id: string;
  employeeId: string;
  date: string;
  shiftId: string | null;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  workingHours: number;
  overtimeHours: number;
  overtimeStatus: string;
  penaltyFlags: unknown;
}

@Injectable()
export class PunchesService {
  constructor(private readonly audit: AuditService) {}

  /** Today's AttendanceRecord for the viewer's own employee, or null before their first punch. */
  async getToday(viewer: AuthenticatedUser): Promise<AttendanceRecordPublic | null> {
    if (!viewer.employeeId) {
      throw new BadRequestException('No employee profile is linked to this account.');
    }
    const recordDate = localMidnightUtc(new Date());
    const row = await prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId: viewer.employeeId, date: recordDate } },
    });
    return row ? toPublic(row) : null;
  }

  async punch(viewer: AuthenticatedUser, input: PunchInput): Promise<AttendanceRecordPublic> {
    if (!viewer.employeeId) {
      throw new BadRequestException('No employee profile is linked to this account.');
    }
    const employeeId = viewer.employeeId;
    const now = new Date();
    const source = input.source ?? 'web';

    const lastPunch = await prisma.rawPunch.findFirst({
      where: { employeeId },
      orderBy: { timestamp: 'desc' },
    });
    if (lastPunch && now.getTime() - lastPunch.timestamp.getTime() < DEBOUNCE_MS) {
      throw new BadRequestException('Please wait a moment before punching again.');
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { departmentId: true },
    });
    if (!employee) {
      throw new BadRequestException('No employee profile is linked to this account.');
    }

    const recordDate = localMidnightUtc(now);
    const shift = await resolveActiveShift(employeeId, employee.departmentId, recordDate);
    if (!shift) {
      throw new BadRequestException(
        'No shift is assigned for this employee today — ask HR to set one up first.',
      );
    }
    const policy = await resolveActivePolicy(employeeId, employee.departmentId);

    const existing = await prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: recordDate } },
    });

    const row = await prisma.$transaction(async (tx) => {
      await tx.rawPunch.create({
        data: {
          employeeId,
          timestamp: now,
          punchType: input.punchType,
          source,
          isProcessed: true,
        },
      });

      if (input.punchType === 'in') {
        if (existing?.checkIn) {
          throw new BadRequestException('Already checked in today.');
        }
        const status = classifyPunchStatus({
          checkIn: now,
          shiftStartTime: shift.startTime,
          gracePeriodMinutes: shift.gracePeriodMinutes,
          halfDayThresholdMinutes: shift.halfDayThresholdMinutes,
        });
        const penaltyFlags = buildPenaltyFlags({
          checkIn: now,
          checkOut: null,
          shiftStartTime: shift.startTime,
          shiftEndTime: shift.endTime,
          gracePeriodMinutes: shift.gracePeriodMinutes,
          workingHours: null,
          workingHoursPerDay: policy.workingHoursPerDay,
        });
        return tx.attendanceRecord.upsert({
          where: { employeeId_date: { employeeId, date: recordDate } },
          create: {
            employeeId,
            date: recordDate,
            shiftId: shift.id,
            checkIn: now,
            checkInSource: source,
            status,
            penaltyFlags: penaltyFlags as unknown as Prisma.InputJsonValue,
          },
          update: {
            shiftId: shift.id,
            checkIn: now,
            checkInSource: source,
            status,
            penaltyFlags: penaltyFlags as unknown as Prisma.InputJsonValue,
          },
        });
      }

      // punchType === 'out'
      if (!existing?.checkIn) {
        throw new BadRequestException('Cannot check out before checking in.');
      }
      if (existing.checkOut) {
        throw new BadRequestException('Already checked out today.');
      }
      const workingHours = calculateWorkingHours(existing.checkIn, now, shift.breakDurationMinutes);
      const overtimeHours = calculateOvertimeHours({
        checkOut: now,
        shiftEndTime: shift.endTime,
        overtimeThresholdMinutes: shift.overtimeThresholdMinutes,
        maxOvertimeHoursDaily: policy.maxOvertimeHoursDaily,
      });
      const overtimeStatus =
        overtimeHours > 0 && shift.overtimeType === 'approval_based' ? 'pending_approval' : 'none';
      const penaltyFlags = buildPenaltyFlags({
        checkIn: existing.checkIn,
        checkOut: now,
        shiftStartTime: shift.startTime,
        shiftEndTime: shift.endTime,
        gracePeriodMinutes: shift.gracePeriodMinutes,
        workingHours,
        workingHoursPerDay: policy.workingHoursPerDay,
      });
      return tx.attendanceRecord.update({
        where: { id: existing.id },
        data: {
          checkOut: now,
          checkOutSource: source,
          workingHours,
          overtimeHours,
          overtimeStatus,
          penaltyFlags: penaltyFlags as unknown as Prisma.InputJsonValue,
        },
      });
    });

    await this.audit.record({
      module: 'attendance',
      entity: 'AttendanceRecord',
      entityId: row.id,
      action: input.punchType === 'in' ? 'checked_in' : 'checked_out',
      after: { status: row.status, checkIn: row.checkIn, checkOut: row.checkOut },
      actorId: viewer.id,
    });

    return toPublic(row);
  }
}

/** The record date is the punch's calendar day in the org's local timezone, stored as UTC midnight. */
function localMidnightUtc(instant: Date, tz: string = DEFAULT_TZ): Date {
  const wc = wallClock(instant, tz);
  return new Date(Date.UTC(wc.year, wc.month - 1, wc.day));
}

async function resolveActiveShift(
  employeeId: string,
  departmentId: string,
  date: Date,
): Promise<{
  id: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  halfDayThresholdMinutes: number;
  breakDurationMinutes: number;
  overtimeType: string;
  overtimeThresholdMinutes: number;
} | null> {
  const assignment = await prisma.shiftAssignment.findFirst({
    where: {
      AND: [
        { OR: [{ employeeId }, { departmentId }] },
        { validFrom: { lte: date } },
        { OR: [{ validTo: null }, { validTo: { gte: date } }] },
      ],
    },
    orderBy: { priority: 'desc' },
    include: { shift: true },
  });
  return assignment?.shift ?? null;
}

async function resolveActivePolicy(
  employeeId: string,
  departmentId: string,
): Promise<{ workingHoursPerDay: number; maxOvertimeHoursDaily: number | null }> {
  const policy = await prisma.attendancePolicy.findFirst({
    where: {
      isActive: true,
      OR: [
        { scopeType: 'individual', scopeId: employeeId },
        { scopeType: 'department', scopeId: departmentId },
        { scopeType: 'global' },
      ],
    },
    orderBy: { priority: 'desc' },
  });
  if (!policy) return DEFAULT_POLICY;
  return {
    workingHoursPerDay: Number(policy.workingHoursPerDay),
    maxOvertimeHoursDaily:
      policy.maxOvertimeHoursDaily != null ? Number(policy.maxOvertimeHoursDaily) : null,
  };
}

function toPublic(row: {
  id: string;
  employeeId: string;
  date: Date;
  shiftId: string | null;
  checkIn: Date | null;
  checkOut: Date | null;
  status: string;
  workingHours: Prisma.Decimal;
  overtimeHours: Prisma.Decimal;
  overtimeStatus: string;
  penaltyFlags: unknown;
}): AttendanceRecordPublic {
  return {
    id: row.id,
    employeeId: row.employeeId,
    date: row.date.toISOString(),
    shiftId: row.shiftId,
    checkIn: row.checkIn?.toISOString() ?? null,
    checkOut: row.checkOut?.toISOString() ?? null,
    status: row.status,
    workingHours: Number(row.workingHours),
    overtimeHours: Number(row.overtimeHours),
    overtimeStatus: row.overtimeStatus,
    penaltyFlags: row.penaltyFlags,
  };
}
