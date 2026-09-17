/**
 * Attendance rule engine — pure functions only, no Prisma, no clock.
 *
 * Mirrors the commission-calc.ts pattern: every function takes plain
 * inputs and returns a plain result, so the classification logic can
 * be unit-tested without a database (see attendance-rule-engine.spec.ts).
 *
 * Scope decisions baked into this version (minimal-first phase):
 *   - Status (present/late/half_day) is decided ONLY from check-in
 *     time vs. the shift's grace period / half-day threshold. A
 *     checkout-triggered half-day rule ("checked out before shift
 *     midpoint") from the reference spec is deliberately left out —
 *     it adds a second path to the same status with no immediate need.
 *   - A real punch always classifies as present/late/half_day,
 *     regardless of whether the day is a holiday or weekend. Those two
 *     labels are reserved for days with NO punch at all (the
 *     not-yet-built end-of-day batch job) — someone who voluntarily
 *     works a holiday should show as present/late, not "holiday".
 *   - Duration math (working hours, overtime) uses raw Date diffs, so
 *     overnight shifts (e.g. 22:00–07:00) are handled correctly
 *     without special-casing — only wall-clock-minutes comparisons
 *     (status, early departure) need the shift's time-of-day fields.
 */
import { wallClock, parseHHMM, DEFAULT_TZ } from '../reminders/tz-utils';

export type PunchStatus = 'present' | 'late' | 'half_day';

export interface PenaltyFlag {
  type: 'late_arrival' | 'early_departure' | 'short_hours' | 'missing_checkout';
  minutes?: number;
  deficit?: number;
}

function requireMinutes(time: string, label: string): number {
  const min = parseHHMM(time);
  if (min === null) throw new Error(`Invalid ${label}: "${time}" (expected "HH:mm")`);
  return min;
}

function minutesOfDay(date: Date, tz: string): number {
  const wc = wallClock(date, tz);
  return wc.hour * 60 + wc.minute;
}

export function roundTo2(value: number): number {
  // Number.EPSILON nudge counters binary float error (e.g. 1.005 * 100
  // evaluating to 100.4999... instead of 100.5, which would round down).
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** present: within grace period. late: past grace, before half-day threshold. half_day: past threshold. */
export function classifyPunchStatus(input: {
  checkIn: Date;
  shiftStartTime: string;
  gracePeriodMinutes: number;
  halfDayThresholdMinutes: number;
  tz?: string;
}): PunchStatus {
  const shiftStartMin = requireMinutes(input.shiftStartTime, 'shiftStartTime');
  const checkInMin = minutesOfDay(input.checkIn, input.tz ?? DEFAULT_TZ);
  const lateAfterMin = shiftStartMin + input.gracePeriodMinutes;
  const halfDayAfterMin = shiftStartMin + input.halfDayThresholdMinutes;

  if (checkInMin <= lateAfterMin) return 'present';
  if (checkInMin < halfDayAfterMin) return 'late';
  return 'half_day';
}

/** Net hours between two real instants, minus the shift's break, floored at 0. */
export function calculateWorkingHours(
  checkIn: Date,
  checkOut: Date,
  breakDurationMinutes: number,
): number {
  const rawMinutes = (checkOut.getTime() - checkIn.getTime()) / 60_000;
  const netMinutes = Math.max(0, rawMinutes - breakDurationMinutes);
  return roundTo2(netMinutes / 60);
}

/**
 * Minutes past (shiftEndTime + overtimeThresholdMinutes), converted to
 * hours and capped at maxOvertimeHoursDaily when set. Safe across
 * overnight shifts because it only compares time-of-day components,
 * not calendar days.
 */
export function calculateOvertimeHours(input: {
  checkOut: Date;
  shiftEndTime: string;
  overtimeThresholdMinutes: number;
  maxOvertimeHoursDaily?: number | null;
  tz?: string;
}): number {
  const shiftEndMin = requireMinutes(input.shiftEndTime, 'shiftEndTime');
  const checkOutMin = minutesOfDay(input.checkOut, input.tz ?? DEFAULT_TZ);
  const overtimeMin = Math.max(0, checkOutMin - shiftEndMin - input.overtimeThresholdMinutes);
  const hours = roundTo2(overtimeMin / 60);
  if (input.maxOvertimeHoursDaily != null) {
    return Math.min(hours, input.maxOvertimeHoursDaily);
  }
  return hours;
}

/** Additive flags — a day can carry more than one. */
export function buildPenaltyFlags(input: {
  checkIn: Date | null;
  checkOut: Date | null;
  shiftStartTime: string;
  shiftEndTime: string;
  gracePeriodMinutes: number;
  workingHours: number | null;
  workingHoursPerDay: number;
  tz?: string;
}): PenaltyFlag[] {
  const tz = input.tz ?? DEFAULT_TZ;
  const flags: PenaltyFlag[] = [];

  if (input.checkIn) {
    const shiftStartMin = requireMinutes(input.shiftStartTime, 'shiftStartTime');
    const checkInMin = minutesOfDay(input.checkIn, tz);
    const lateMinutes = checkInMin - shiftStartMin - input.gracePeriodMinutes;
    if (lateMinutes > 0) flags.push({ type: 'late_arrival', minutes: lateMinutes });
  }

  if (input.checkIn && !input.checkOut) {
    flags.push({ type: 'missing_checkout' });
  }

  if (input.checkOut) {
    const shiftEndMin = requireMinutes(input.shiftEndTime, 'shiftEndTime');
    const checkOutMin = minutesOfDay(input.checkOut, tz);
    const earlyMinutes = shiftEndMin - checkOutMin;
    if (earlyMinutes > 0) flags.push({ type: 'early_departure', minutes: earlyMinutes });
  }

  if (input.workingHours != null && input.workingHours < input.workingHoursPerDay) {
    flags.push({
      type: 'short_hours',
      deficit: roundTo2(input.workingHoursPerDay - input.workingHours),
    });
  }

  return flags;
}
