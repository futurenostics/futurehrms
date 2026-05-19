/**
 * Mirror of the BE's cron field parser (apps/api/src/modules/reminders/
 * cron-matcher.ts) — used by the rule editor's Custom Expression
 * input to give the user a danger-state error instead of silently
 * accepting `0 9 * * `, `not a cron`, etc.
 *
 * The grammar matches what the BE accepts:
 *
 *     m h dom mon dow         five whitespace-separated tokens
 *     *                       every value in the field's range
 *     N                       literal
 *     N,M,P                   comma-separated list
 *     N-M                     inclusive range
 *     '*'/N                   step from the field's min
 *     N/M                     step from N onwards
 *     N-M/K                   stepped range
 *
 * Returns the first violation found; otherwise null. Callers render
 * a danger border + the message under the input.
 */

const FIELDS = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'dayOfMonth', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12 },
  { name: 'dayOfWeek', min: 0, max: 6 },
] as const;

export function validateCronExpression(expr: string): string | null {
  const trimmed = expr.trim();
  if (trimmed.length === 0) return 'Cron expression is required';
  const tokens = trimmed.split(/\s+/);
  if (tokens.length !== 5) {
    return `Expected 5 fields (m h dom mon dow), got ${tokens.length}`;
  }
  for (let i = 0; i < 5; i++) {
    const err = validateField(tokens[i]!, FIELDS[i]!);
    if (err) return `${FIELDS[i]!.name}: ${err}`;
  }
  return null;
}

function validateField(token: string, range: { min: number; max: number }): string | null {
  if (token === '*') return null;
  if (token.length === 0) return 'empty token';
  const parts = token.split(',');
  for (const p of parts) {
    const err = validateTerm(p, range);
    if (err) return err;
  }
  return null;
}

function validateTerm(term: string, range: { min: number; max: number }): string | null {
  let body = term;
  let stepStr: string | null = null;
  const slash = term.indexOf('/');
  if (slash >= 0) {
    body = term.slice(0, slash);
    stepStr = term.slice(slash + 1);
    if (stepStr.length === 0) return `step missing after '/'`;
    const step = Number(stepStr);
    if (!Number.isInteger(step) || step <= 0) return `invalid step '${stepStr}'`;
  }

  if (body === '*' || body === '') return null;
  if (body.includes('-')) {
    const [a, b] = body.split('-');
    const aN = Number(a);
    const bN = Number(b);
    if (!Number.isInteger(aN) || !Number.isInteger(bN)) return `invalid range '${body}'`;
    if (aN < range.min || bN > range.max) {
      return `range '${body}' out of ${range.min}–${range.max}`;
    }
    if (aN > bN) return `range '${body}' is reversed`;
    return null;
  }

  const n = Number(body);
  if (!Number.isInteger(n)) return `not a number: '${body}'`;
  if (n < range.min || n > range.max) {
    return `value '${n}' out of ${range.min}–${range.max}`;
  }
  return null;
}
