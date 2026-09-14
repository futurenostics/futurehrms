/**
 * Shared AttendanceRecord shaping — split out of punches.service.ts so
 * attendance-records.service.ts (record listing/history) can reuse the
 * exact same Decimal→number mapping and local-day resolution instead
 * of re-deriving them.
 */
import type { Prisma } from '@prisma/client';
import { wallClock, DEFAULT_TZ } from '../reminders/tz-utils';

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

/** The record date is the day's calendar day in the org's local timezone, stored as UTC midnight. */
export function localMidnightUtc(instant: Date, tz: string = DEFAULT_TZ): Date {
  const wc = wallClock(instant, tz);
  return new Date(Date.UTC(wc.year, wc.month - 1, wc.day));
}

export function toPublicAttendanceRecord(row: {
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
