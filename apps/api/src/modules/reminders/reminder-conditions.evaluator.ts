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

    default:
      return false;
  }
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
