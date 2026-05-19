/**
 * Local re-exports + helpers for the condition builder.
 *
 * Mirrors the BE shape from
 * apps/api/src/modules/reminders/reminder-conditions.types.ts, with
 * the same wire format so save/load is a straight pass-through.
 *
 * The helpers below produce default leaves / groups so the UI never
 * has to hand-write a fresh node — keeps invariants centralised
 * (e.g. "a new leaf always starts with the first field of the first
 * entity, equals operator, empty value").
 */
import type {
  ConditionGroup,
  ConditionLeaf,
  ConditionNode,
  EntityDef,
  FieldDef,
  FieldType,
} from '@/lib/queries/reminders';

export type { ConditionGroup, ConditionLeaf, ConditionNode, EntityDef, FieldDef, FieldType };

/** Default operator the picker pre-selects for a new leaf on a given
 *  field. For date fields the choice depends on the field's role so
 *  the default is always valid for that field's allowed operator
 *  list (e.g. `within_days` would be invalid on Date of birth). */
export function defaultOperatorFor(type: FieldType, field?: FieldDef): string {
  switch (type) {
    case 'string':
    case 'enum':
      return 'equals';
    case 'number':
      return 'equals';
    case 'date':
      switch (field?.dateRole) {
        case 'anniversary':
          return 'anniversary_in_exactly_days';
        case 'one-shot-future':
          return 'in_exactly_days';
        case 'historical':
          return 'older_than_days';
        default:
          return 'within_days';
      }
    case 'boolean':
      return 'is_true';
  }
}

/** Default value to seed when the operator changes. Lets the user start typing immediately. */
export function defaultValueFor(operator: string, type: FieldType): ConditionLeaf['value'] {
  if (
    operator === 'is_empty' ||
    operator === 'is_not_empty' ||
    operator === 'is_true' ||
    operator === 'is_false' ||
    operator === 'matches_today' ||
    operator === 'matches_today_month_day'
  ) {
    return null;
  }
  if (operator === 'between') return [0, 0];
  if (operator === 'in' || operator === 'not_in') return [];
  if (
    type === 'number' ||
    operator === 'within_days' ||
    operator === 'older_than_days' ||
    operator === 'in_exactly_days' ||
    operator === 'anniversary_in_exactly_days'
  ) {
    return 0;
  }
  if (type === 'boolean') return null;
  return '';
}

/** First field of the first entity — used to seed a brand-new leaf. */
export function firstField(entities: EntityDef[]): FieldDef | null {
  for (const e of entities) {
    if (e.fields.length > 0) return e.fields[0]!;
  }
  return null;
}

export function newLeaf(entities: EntityDef[]): ConditionLeaf {
  const f = firstField(entities);
  if (!f) {
    return { kind: 'leaf', field: '', operator: 'equals', value: '' };
  }
  const op = defaultOperatorFor(f.type, f);
  return { kind: 'leaf', field: f.path, operator: op, value: defaultValueFor(op, f.type) };
}

export function newGroup(entities: EntityDef[]): ConditionGroup {
  return { kind: 'group', conditions: [newLeaf(entities)], connectors: [] };
}

/**
 * Returns the per-pair connector array — derives a uniform array from
 * `operator` when an old payload doesn't have `connectors` set, and
 * pads with 'and' if the lengths don't match.
 */
export function deriveConnectors(group: ConditionGroup): Array<'and' | 'or'> {
  const need = Math.max(0, group.conditions.length - 1);
  if (group.connectors && group.connectors.length === need) return group.connectors;
  const fallback = group.operator ?? 'and';
  return Array<'and' | 'or'>(need).fill(fallback);
}

/** Build the lookup that the recursive components use a hundred times a render. */
export function buildFieldIndex(entities: EntityDef[]): Map<string, FieldDef> {
  const m = new Map<string, FieldDef>();
  for (const e of entities) for (const f of e.fields) m.set(f.path, f);
  return m;
}

/** Count of leaves anywhere in the tree — used by the badge on the rule row. */
export function countLeaves(node: ConditionNode | null | undefined): number {
  if (!node) return 0;
  if (node.kind === 'leaf') return 1;
  return node.conditions.reduce((sum, c) => sum + countLeaves(c), 0);
}
