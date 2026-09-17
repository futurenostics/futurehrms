/**
 * Shared Shift/AttendancePolicy resolution — split out of
 * punches.service.ts so attendance-end-of-day.service.ts (the batch
 * job) resolves "was this employee scheduled to work today" using the
 * exact same individual-beats-department priority logic the punch
 * flow already enforces, instead of a second, possibly-drifting copy.
 *
 * `resolveActivePolicy` now also returns `weekendDays` — previously
 * fetched off the AttendancePolicy row and discarded (see
 * docs/ATTENDANCE_MODULE_STATUS.md gap #3). The end-of-day job is its
 * first real reader.
 */
import { prisma } from '@futurenostics/db';

export interface ResolvedShift {
  id: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  halfDayThresholdMinutes: number;
  breakDurationMinutes: number;
  overtimeType: string;
  overtimeThresholdMinutes: number;
}

export interface ResolvedPolicy {
  workingHoursPerDay: number;
  maxOvertimeHoursDaily: number | null;
  /** Day-of-week numbers, 0 = Sunday .. 6 = Saturday. */
  weekendDays: number[];
}

const DEFAULT_POLICY: ResolvedPolicy = {
  workingHoursPerDay: 8,
  maxOvertimeHoursDaily: null,
  weekendDays: [0, 6],
};

export async function resolveActiveShift(
  employeeId: string,
  departmentId: string,
  date: Date,
): Promise<ResolvedShift | null> {
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

export async function resolveActivePolicy(
  employeeId: string,
  departmentId: string,
): Promise<ResolvedPolicy> {
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
    weekendDays: policy.weekendDays,
  };
}
