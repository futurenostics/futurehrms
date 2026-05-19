/**
 * Cron matcher.
 *
 * Reminder rules carry a 5-field cron expression (`m h dom mon dow`)
 * stored on `CronTriggerSpec.cron`. The scheduler ticks hourly and
 * asks `cronMatches(cron, when)` to decide whether the rule should
 * fire on this tick.
 *
 * Supported per field:
 *
 *   *           every value
 *   N           literal (e.g. 9)
 *   N,M,P       comma-separated list
 *   N-M         inclusive range
 *   '*'/N       step every N units from the field's min (so '*\/5' on
 *               minutes = 0,5,10,…)
 *   N/M         step every M units starting at N
 *   N-M/K       stepped range
 *
 * Sunday is 0 (Postgres / Linux cron convention). Day-of-month is
 * 1-indexed. Month is 1-indexed.
 *
 * Time is evaluated in Asia/Karachi to match the scheduler's tick
 * timezone — the same `now` instant is interpreted in PKT for all
 * field comparisons so MM-DD / weekday lines up with what the user
 * sees on the dashboard.
 *
 * Limitation: the scheduler ticks at the top of every hour. Crons
 * declaring a minute other than 0 won't fire on the actual minute
 * — they get evaluated at the next top-of-hour and round down. The
 * picker UX should hide / warn about non-zero minute values for now.
 */

const TZ = 'Asia/Karachi';

interface FieldRange {
  min: number;
  max: number;
}

const FIELDS: { name: string; range: FieldRange }[] = [
  { name: 'minute', range: { min: 0, max: 59 } },
  { name: 'hour', range: { min: 0, max: 23 } },
  { name: 'dayOfMonth', range: { min: 1, max: 31 } },
  { name: 'month', range: { min: 1, max: 12 } },
  { name: 'dayOfWeek', range: { min: 0, max: 6 } },
];

/**
 * Returns true when `when` (a UTC instant) lines up with the cron
 * expression in PKT. Returns false for malformed expressions.
 */
export function cronMatches(cron: string, when: Date): boolean {
  const tokens = cron.trim().split(/\s+/);
  if (tokens.length !== 5) return false;

  const parts = readWhenInTz(when);
  // parts: [minute, hour, dayOfMonth, month, dayOfWeek]

  for (let i = 0; i < 5; i++) {
    if (!fieldMatches(tokens[i]!, parts[i]!, FIELDS[i]!.range)) return false;
  }
  return true;
}

/**
 * Field-level match. Pure — exported for unit tests.
 */
export function fieldMatches(token: string, actual: number, range: FieldRange): boolean {
  if (token === '*') return true;
  for (const part of token.split(',')) {
    if (singleTermMatches(part, actual, range)) return true;
  }
  return false;
}

function singleTermMatches(term: string, actual: number, range: FieldRange): boolean {
  // Strip the optional `/step` suffix once.
  let step: number | null = null;
  let body = term;
  const slashIdx = term.indexOf('/');
  if (slashIdx >= 0) {
    body = term.slice(0, slashIdx);
    const stepStr = term.slice(slashIdx + 1);
    const n = Number(stepStr);
    if (!Number.isFinite(n) || n <= 0) return false;
    step = n;
  }

  let start: number;
  let end: number;
  if (body === '*' || body === '') {
    start = range.min;
    end = range.max;
  } else if (body.includes('-')) {
    const [aStr, bStr] = body.split('-');
    const a = Number(aStr);
    const b = Number(bStr);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    start = a;
    end = b;
  } else {
    const n = Number(body);
    if (!Number.isFinite(n)) return false;
    // A bare number with no step is just that value.
    if (step === null) return n === actual;
    start = n;
    end = range.max;
  }

  if (actual < start || actual > end) return false;
  if (step === null) return true;
  return (actual - start) % step === 0;
}

/**
 * Pull [minute, hour, dayOfMonth, month, dayOfWeek] out of an
 * instant, interpreted in Asia/Karachi.
 */
function readWhenInTz(when: Date): number[] {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  }).formatToParts(when);
  const get = (type: string): string => fmt.find((p) => p.type === type)?.value ?? '';
  const minute = Number(get('minute'));
  const hour = Number(get('hour'));
  const dayOfMonth = Number(get('day'));
  const month = Number(get('month'));
  const dayOfWeek = WEEKDAY_INDEX[get('weekday')] ?? 0;
  return [minute, hour, dayOfMonth, month, dayOfWeek];
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};
