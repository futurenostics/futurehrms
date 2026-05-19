/**
 * Pure evaluator for the reminder-rule condition tree.
 *
 * Signature: `evaluateConditions(tree, context) -> boolean`
 *
 *   - tree:    the root ConditionGroup, or undefined for "no
 *              conditions — always true"
 *   - context: a plain object representing the source entity, with
 *              relations flattened to nested objects so dotted paths
 *              resolve via simple object navigation
 *              (e.g. { employee: { department: { slug: 'eng' } } })
 *
 * No I/O. No Prisma. No clock. Easy to unit test, easy to reason
 * about. Caller is responsible for hydrating the context.
 *
 * Operator semantics are spelled out inline so the contract is one
 * file; the FE picker mirrors them via condition-builder/operators.ts.
 */
import type { ConditionLeaf, ConditionNode } from './reminder-conditions.types';

export type EvalContext = Record<string, unknown>;

/** Evaluate the (optional) tree against the context. Missing tree = match-all. */
export function evaluateConditions(tree: ConditionNode | undefined, context: EvalContext): boolean {
  if (!tree) return true;
  return evalNode(tree, context);
}

/**
 * Walk the tree, collect each leaf's entity prefix (the first segment
 * of its dotted field path — e.g. `employee` from
 * `employee.department.slug`). Returns the deduped Set.
 *
 * The cron scheduler uses this to figure out which Prisma tables to
 * scan each tick — no more user-supplied `sourceEntity`. Pure +
 * synchronous so it's cheap to call on every tick.
 */
export function deriveScanTargets(tree: ConditionNode | undefined): Set<string> {
  const out = new Set<string>();
  if (!tree) return out;
  walk(tree, out);
  return out;
}

function walk(node: ConditionNode, out: Set<string>): void {
  if (node.kind === 'leaf') {
    const prefix = node.field.split('.')[0];
    if (prefix) out.add(prefix);
    return;
  }
  for (const child of node.conditions) walk(child, out);
}

function evalNode(node: ConditionNode, ctx: EvalContext): boolean {
  if (node.kind === 'leaf') return evalLeaf(node, ctx);

  if (node.conditions.length === 0) {
    // Empty group is "no constraints" — defaults to true so an
    // accidental empty AND doesn't kill every reminder.
    return true;
  }
  if (node.conditions.length === 1) return evalNode(node.conditions[0]!, ctx);

  // Derive the per-pair connectors. New payloads carry `connectors`
  // directly; older payloads only carry a group-level `operator` we
  // expand here so the rest of the evaluator only has one shape to
  // think about.
  const connectors =
    node.connectors && node.connectors.length === node.conditions.length - 1
      ? node.connectors
      : Array<'and' | 'or'>(node.conditions.length - 1).fill(node.operator ?? 'and');

  // SQL-standard precedence: AND binds tighter than OR. So
  //   A OR B AND C OR D
  // groups as
  //   A OR (B AND C) OR D
  // Walk left-to-right, collect contiguous AND-chains, OR them.
  let andChain = evalNode(node.conditions[0]!, ctx);
  let orAccumulator = false;
  for (let i = 0; i < connectors.length; i++) {
    const next = node.conditions[i + 1]!;
    if (connectors[i] === 'and') {
      andChain = andChain && evalNode(next, ctx);
    } else {
      // End the current AND chain, fold it into the OR accumulator,
      // and start a fresh chain from `next`.
      orAccumulator = orAccumulator || andChain;
      if (orAccumulator) return true; // short-circuit
      andChain = evalNode(next, ctx);
    }
  }
  return orAccumulator || andChain;
}

function evalLeaf(leaf: ConditionLeaf, ctx: EvalContext): boolean {
  const actual = getPath(ctx, leaf.field);
  const value = leaf.value;

  switch (leaf.operator) {
    case 'is_empty':
      return isEmpty(actual);
    case 'is_not_empty':
      return !isEmpty(actual);
    case 'is_true':
      return actual === true;
    case 'is_false':
      return actual === false;

    case 'equals':
      return looseEquals(actual, value);
    case 'not_equals':
      return !looseEquals(actual, value);

    case 'contains':
      return typeof actual === 'string' && typeof value === 'string' && actual.includes(value);
    case 'starts_with':
      return typeof actual === 'string' && typeof value === 'string' && actual.startsWith(value);
    case 'ends_with':
      return typeof actual === 'string' && typeof value === 'string' && actual.endsWith(value);

    case 'in':
      return Array.isArray(value) && value.some((v) => looseEquals(actual, v));
    case 'not_in':
      return Array.isArray(value) && !value.some((v) => looseEquals(actual, v));

    case 'gt':
      return typeof actual === 'number' && typeof value === 'number' && actual > value;
    case 'gte':
      return typeof actual === 'number' && typeof value === 'number' && actual >= value;
    case 'lt':
      return typeof actual === 'number' && typeof value === 'number' && actual < value;
    case 'lte':
      return typeof actual === 'number' && typeof value === 'number' && actual <= value;
    case 'between': {
      if (typeof actual !== 'number') return false;
      if (!Array.isArray(value) || value.length !== 2) return false;
      const [lo, hi] = value as [number, number];
      return typeof lo === 'number' && typeof hi === 'number' && actual >= lo && actual <= hi;
    }

    case 'before': {
      const a = toDateMs(actual);
      const b = toDateMs(value);
      return a !== null && b !== null && a < b;
    }
    case 'after': {
      const a = toDateMs(actual);
      const b = toDateMs(value);
      return a !== null && b !== null && a > b;
    }
    case 'within_days': {
      const a = toDateMs(actual);
      if (a === null || typeof value !== 'number') return false;
      const now = Date.now();
      const delta = a - now;
      return delta >= 0 && delta <= value * 86_400_000;
    }
    case 'older_than_days': {
      const a = toDateMs(actual);
      if (a === null || typeof value !== 'number') return false;
      const now = Date.now();
      return now - a >= value * 86_400_000;
    }
    case 'matches_today_month_day': {
      // Compare just MM-DD (Asia/Karachi). Used for birthdays /
      // anniversaries — the year shouldn't matter.
      const a = toDateString(actual, { month: '2-digit', day: '2-digit' });
      if (!a) return false;
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Karachi',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      return a === today;
    }
    case 'matches_today': {
      // Full-date equality (YYYY-MM-DD, Asia/Karachi).
      const a = toDateString(actual, { year: 'numeric', month: '2-digit', day: '2-digit' });
      if (!a) return false;
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Karachi',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      return a === today;
    }
    case 'in_exactly_days': {
      // Whole-day calendar difference in Asia/Karachi.
      // True when (field-day - today) === value.
      if (typeof value !== 'number') return false;
      const fieldDay = pktDateOnly(actual);
      const todayDay = pktDateOnly(new Date());
      if (fieldDay === null || todayDay === null) return false;
      return diffCalendarDays(fieldDay, todayDay) === value;
    }
    case 'anniversary_in_exactly_days': {
      // Same as in_exactly_days, but against the NEXT yearly
      // anniversary of `field` from today. Handles year-wrap (Dec → Jan).
      if (typeof value !== 'number') return false;
      const fieldDay = pktDateOnly(actual);
      const todayDay = pktDateOnly(new Date());
      if (fieldDay === null || todayDay === null) return false;
      const anniv = nextYearlyAnniversary(fieldDay, todayDay);
      return diffCalendarDays(anniv, todayDay) === value;
    }

    default:
      return false;
  }
}

function toDateString(value: unknown, opts: Intl.DateTimeFormatOptions): string | null {
  const ms = toDateMs(value);
  if (ms === null) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', ...opts }).format(
    new Date(ms),
  );
}

/* ---------- helpers ---------- */

/** Dotted-path getter — safe on null/undefined intermediates. */
function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, segment) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[segment];
  }, obj);
}

/** Match Number to string-with-number, Date to ISO string, etc. — keeps the UI lax. */
function looseEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a instanceof Date) return looseEquals(a.toISOString(), b);
  if (b instanceof Date) return looseEquals(a, b.toISOString());
  if (typeof a === 'number' && typeof b === 'string') return String(a) === b;
  if (typeof a === 'string' && typeof b === 'number') return a === String(b);
  return false;
}

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Get the {year, month, day} of a value in Asia/Karachi. Returns
 * null if the value isn't a parseable date. Used by the exact-day
 * operators so DST / TZ shifts can't push a comparison off by one.
 */
function pktDateOnly(value: unknown): { y: number; m: number; d: number } | null {
  const ms = value instanceof Date ? value.getTime() : toDateMs(value);
  if (ms === null) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(ms));
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? '0');
  return { y: get('year'), m: get('month'), d: get('day') };
}

/** Whole-day signed difference (a - b) using a UTC-noon proxy to avoid DST jitter. */
function diffCalendarDays(
  a: { y: number; m: number; d: number },
  b: { y: number; m: number; d: number },
): number {
  const aMs = Date.UTC(a.y, a.m - 1, a.d, 12);
  const bMs = Date.UTC(b.y, b.m - 1, b.d, 12);
  return Math.round((aMs - bMs) / 86_400_000);
}

/**
 * The next yearly anniversary of `source` on or after `today`. If
 * today is past this year's MM-DD, returns next year's. Leap-day
 * anchors (Feb 29) land on Mar 1 in non-leap years (Date's natural
 * roll-forward).
 */
function nextYearlyAnniversary(
  source: { y: number; m: number; d: number },
  today: { y: number; m: number; d: number },
): { y: number; m: number; d: number } {
  const thisYear = { y: today.y, m: source.m, d: source.d };
  // Normalize leap-day so Date.UTC doesn't silently roll into March
  // and break the equality check we do downstream.
  const normalized = (cand: { y: number; m: number; d: number }) => {
    const ms = Date.UTC(cand.y, cand.m - 1, cand.d, 12);
    const dt = new Date(ms);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  };
  const thisYearNorm = normalized(thisYear);
  if (diffCalendarDays(thisYearNorm, today) >= 0) return thisYearNorm;
  return normalized({ y: today.y + 1, m: source.m, d: source.d });
}

/** Accept ISO string, Date, or epoch number. Returns ms or null. */
function toDateMs(value: unknown): number | null {
  if (value == null) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Date.parse(value);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}
