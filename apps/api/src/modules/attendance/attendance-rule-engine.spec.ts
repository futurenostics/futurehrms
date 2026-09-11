/**
 * Attendance rule engine — pure unit tests.
 *
 * No Prisma, no clock — every test builds inputs in-memory. Coverage
 * targets the cases the reference spec calls out explicitly: on-time,
 * late, half-day boundary, working-hours math, overtime math + cap,
 * every penalty flag, and an overnight shift crossing midnight.
 *
 * Dates below use Asia/Karachi (UTC+5, no DST) — e.g. "09:05 local" on
 * 2026-01-05 is "2026-01-05T04:05:00Z".
 */
import { describe, expect, it } from 'vitest';
import {
  buildPenaltyFlags,
  calculateOvertimeHours,
  calculateWorkingHours,
  classifyPunchStatus,
  roundTo2,
} from './attendance-rule-engine';

const TZ = 'Asia/Karachi';
const SHIFT = {
  shiftStartTime: '09:00',
  shiftEndTime: '18:00',
  gracePeriodMinutes: 15,
  halfDayThresholdMinutes: 120,
  overtimeThresholdMinutes: 30,
};

describe('classifyPunchStatus', () => {
  it('is present exactly at shift start', () => {
    expect(
      classifyPunchStatus({
        checkIn: new Date('2026-01-05T04:00:00Z'), // 09:00 local
        ...SHIFT,
        tz: TZ,
      }),
    ).toBe('present');
  });

  it('is present at the edge of the grace period', () => {
    expect(
      classifyPunchStatus({
        checkIn: new Date('2026-01-05T04:15:00Z'), // 09:15 local, exactly grace boundary
        ...SHIFT,
        tz: TZ,
      }),
    ).toBe('present');
  });

  it('is late one minute past the grace period', () => {
    expect(
      classifyPunchStatus({
        checkIn: new Date('2026-01-05T04:16:00Z'), // 09:16 local
        ...SHIFT,
        tz: TZ,
      }),
    ).toBe('late');
  });

  it('is late right up to the half-day threshold', () => {
    expect(
      classifyPunchStatus({
        checkIn: new Date('2026-01-05T05:59:00Z'), // 10:59 local — 1 minute before the 11:00 threshold
        ...SHIFT,
        tz: TZ,
      }),
    ).toBe('late');
  });

  it('is half_day once past the half-day threshold', () => {
    expect(
      classifyPunchStatus({
        checkIn: new Date('2026-01-05T06:20:00Z'), // 11:20 local (2h20m after start)
        ...SHIFT,
        tz: TZ,
      }),
    ).toBe('half_day');
  });

  it('is present for an early check-in (before shift start)', () => {
    expect(
      classifyPunchStatus({
        checkIn: new Date('2026-01-05T03:30:00Z'), // 08:30 local
        ...SHIFT,
        tz: TZ,
      }),
    ).toBe('present');
  });
});

describe('calculateWorkingHours', () => {
  it('subtracts the break duration', () => {
    const checkIn = new Date('2026-01-05T04:00:00Z'); // 09:00
    const checkOut = new Date('2026-01-05T13:00:00Z'); // 18:00 (9h raw)
    expect(calculateWorkingHours(checkIn, checkOut, 60)).toBe(8);
  });

  it('never goes negative when the break exceeds the raw duration', () => {
    const checkIn = new Date('2026-01-05T04:00:00Z');
    const checkOut = new Date('2026-01-05T04:30:00Z'); // 30 raw minutes
    expect(calculateWorkingHours(checkIn, checkOut, 60)).toBe(0);
  });

  it('handles an overnight shift correctly (checkout the next calendar day)', () => {
    const checkIn = new Date('2026-01-05T17:00:00Z'); // 22:00 local, Jan 5
    const checkOut = new Date('2026-01-06T02:00:00Z'); // 07:00 local, Jan 6 (9h raw)
    expect(calculateWorkingHours(checkIn, checkOut, 0)).toBe(9);
  });
});

describe('calculateOvertimeHours', () => {
  it('is zero within the overtime threshold', () => {
    const checkOut = new Date('2026-01-05T13:20:00Z'); // 18:20 local — 20min past end, under 30min threshold
    expect(
      calculateOvertimeHours({
        checkOut,
        shiftEndTime: SHIFT.shiftEndTime,
        overtimeThresholdMinutes: SHIFT.overtimeThresholdMinutes,
        tz: TZ,
      }),
    ).toBe(0);
  });

  it('counts hours past the threshold', () => {
    const checkOut = new Date('2026-01-05T15:00:00Z'); // 20:00 local — 2h past shift end
    expect(
      calculateOvertimeHours({
        checkOut,
        shiftEndTime: SHIFT.shiftEndTime,
        overtimeThresholdMinutes: SHIFT.overtimeThresholdMinutes,
        tz: TZ,
      }),
    ).toBe(1.5); // 2h - 30min threshold
  });

  it('caps at maxOvertimeHoursDaily when set', () => {
    const checkOut = new Date('2026-01-05T18:00:00Z'); // 23:00 local — 5h past shift end
    expect(
      calculateOvertimeHours({
        checkOut,
        shiftEndTime: SHIFT.shiftEndTime,
        overtimeThresholdMinutes: SHIFT.overtimeThresholdMinutes,
        maxOvertimeHoursDaily: 2,
        tz: TZ,
      }),
    ).toBe(2);
  });

  it('stays correct across an overnight shift end (e.g. 07:00 end, checkout next day)', () => {
    // Night shift ends 07:00 local; checked out 07:45 local same calendar instant regardless of date.
    const checkOut = new Date('2026-01-06T02:45:00Z'); // 07:45 local
    expect(
      calculateOvertimeHours({
        checkOut,
        shiftEndTime: '07:00',
        overtimeThresholdMinutes: 30,
        tz: TZ,
      }),
    ).toBe(0.25); // 45min past end - 30min threshold = 15min
  });
});

describe('buildPenaltyFlags', () => {
  const base = {
    shiftStartTime: SHIFT.shiftStartTime,
    shiftEndTime: SHIFT.shiftEndTime,
    gracePeriodMinutes: SHIFT.gracePeriodMinutes,
    workingHoursPerDay: 8,
    tz: TZ,
  };

  it('flags nothing for a clean on-time full day', () => {
    const flags = buildPenaltyFlags({
      ...base,
      checkIn: new Date('2026-01-05T04:00:00Z'), // 09:00
      checkOut: new Date('2026-01-05T13:00:00Z'), // 18:00
      workingHours: 8,
    });
    expect(flags).toEqual([]);
  });

  it('flags late_arrival with the correct minute count', () => {
    const flags = buildPenaltyFlags({
      ...base,
      checkIn: new Date('2026-01-05T04:37:00Z'), // 09:37 local — 37min after start, 15min grace
      checkOut: new Date('2026-01-05T13:00:00Z'),
      workingHours: 8,
    });
    expect(flags).toContainEqual({ type: 'late_arrival', minutes: 22 });
  });

  it('flags missing_checkout when there is a check-in but no check-out', () => {
    const flags = buildPenaltyFlags({
      ...base,
      checkIn: new Date('2026-01-05T04:00:00Z'),
      checkOut: null,
      workingHours: null,
    });
    expect(flags).toEqual([{ type: 'missing_checkout' }]);
  });

  it('flags early_departure with the correct minute count', () => {
    const flags = buildPenaltyFlags({
      ...base,
      checkIn: new Date('2026-01-05T04:00:00Z'),
      checkOut: new Date('2026-01-05T12:45:00Z'), // 17:45 local — 15min before 18:00 end
      workingHours: 7.75,
    });
    expect(flags).toContainEqual({ type: 'early_departure', minutes: 15 });
  });

  it('flags short_hours when working hours fall under the daily target', () => {
    const flags = buildPenaltyFlags({
      ...base,
      checkIn: new Date('2026-01-05T04:00:00Z'),
      checkOut: new Date('2026-01-05T10:00:00Z'), // 6h raw
      workingHours: 6,
    });
    expect(flags).toContainEqual({ type: 'short_hours', deficit: 2 });
  });

  it('combines multiple flags on the same day', () => {
    const flags = buildPenaltyFlags({
      ...base,
      checkIn: new Date('2026-01-05T04:37:00Z'), // late by 22min
      checkOut: new Date('2026-01-05T12:45:00Z'), // 15min early
      workingHours: 7.13,
    });
    expect(flags).toContainEqual({ type: 'late_arrival', minutes: 22 });
    expect(flags).toContainEqual({ type: 'early_departure', minutes: 15 });
    expect(flags).toContainEqual({ type: 'short_hours', deficit: 0.87 });
    expect(flags).toHaveLength(3);
  });
});

describe('roundTo2', () => {
  it('rounds to two decimal places', () => {
    expect(roundTo2(1.005)).toBeCloseTo(1.01, 2);
    expect(roundTo2(7.999)).toBe(8);
    expect(roundTo2(0)).toBe(0);
  });
});
