/**
 * Timezone + quiet-hours helpers for the reminder scheduler.
 *
 * No date library is used — wall-clock components in an arbitrary IANA
 * zone are read via `Intl.DateTimeFormat` (the same approach the
 * cron-matcher uses), and wall-clock → UTC conversion uses the standard
 * offset trick. Accurate to the second; the only imprecision is at the
 * exact DST-transition boundary (acceptable for deferral, and the org
 * default zone Asia/Karachi has no DST).
 */

export const DEFAULT_TZ = 'Asia/Karachi';

export interface WallClock {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  second: number;
}

/** Read a UTC instant's wall-clock components in the given IANA zone. */
export function wallClock(date: Date, tz: string): WallClock {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? '0');
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

/** Parse "HH:MM" into minutes-of-day, or null if malformed. */
export function parseHHMM(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Is `now` inside the recipient's quiet window? Handles windows that
 * wrap past midnight (e.g. 21:00–08:00). Returns false when either
 * bound is missing or they're equal (no window).
 */
export function isWithinQuietHours(
  now: Date,
  tz: string,
  start: string | null,
  end: string | null,
): boolean {
  const startMin = parseHHMM(start);
  const endMin = parseHHMM(end);
  if (startMin === null || endMin === null || startMin === endMin) return false;

  const wc = wallClock(now, tz);
  const nowMin = wc.hour * 60 + wc.minute;

  if (startMin < endMin) {
    // Same-day window, e.g. 12:00–13:00.
    return nowMin >= startMin && nowMin < endMin;
  }
  // Wrapping window, e.g. 21:00–08:00.
  return nowMin >= startMin || nowMin < endMin;
}

/**
 * The next UTC instant at which the recipient's local clock reads
 * `end`. Called only when `now` is inside the quiet window, so the
 * result is always in the future.
 */
export function nextQuietEnd(now: Date, tz: string, end: string): Date {
  const endMin = parseHHMM(end);
  if (endMin === null) return now; // guarded by caller; defensive
  const endH = Math.floor(endMin / 60);
  const endM = endMin % 60;

  const wc = wallClock(now, tz);
  const nowMin = wc.hour * 60 + wc.minute;

  // If we haven't reached `end` yet today (local), it's today; else it's
  // tomorrow (the wrapping-window late-evening case).
  let { year, month, day } = wc;
  if (nowMin >= endMin) {
    const next = new Date(Date.UTC(year, month - 1, day));
    next.setUTCDate(next.getUTCDate() + 1);
    year = next.getUTCFullYear();
    month = next.getUTCMonth() + 1;
    day = next.getUTCDate();
  }
  return zonedWallClockToUtc(year, month, day, endH, endM, tz);
}

/** Convert a wall-clock time in `tz` to the corresponding UTC instant. */
function zonedWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tz: string,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offset = tzOffsetMs(new Date(utcGuess), tz);
  return new Date(utcGuess - offset);
}

/** How far ahead of UTC the zone is at `date`, in milliseconds. */
function tzOffsetMs(date: Date, tz: string): number {
  const wc = wallClock(date, tz);
  const asIfUtc = Date.UTC(wc.year, wc.month - 1, wc.day, wc.hour, wc.minute, wc.second);
  return asIfUtc - date.getTime();
}
