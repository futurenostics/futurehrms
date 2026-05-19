/**
 * Reminder-rule condition tree — a layered filter on top of the
 * existing event / cron trigger model.
 *
 * Trigger answers "WHEN should this rule consider firing" (an event
 * fires, or a cron tick matches). Conditions answer "for WHICH
 * matched entity should it actually fire". Without conditions the
 * rule fires for every entity the trigger surfaces — matching the
 * original Phase-3 behaviour.
 *
 * The tree is always rooted at a group so the operator (AND/OR) at
 * the root is explicit. A leaf is a single field-operator-value
 * comparison.
 *
 *   group ─── operator: 'and' | 'or'
 *      ├── leaf  { field, operator, value }
 *      ├── leaf  { … }
 *      └── group { operator, conditions: [...] }   ← nesting allowed
 *
 * Operator semantics are typed (see condition-operators.ts on the
 * frontend + the evaluator). Field paths are dotted, scoped to the
 * source entity that the trigger produced — e.g.
 *   employee.department.slug
 *   employee.joinDate
 *   project.status
 *
 * The field catalog (reminder-field-catalog.ts) lists every legal
 * path + its declared type; the FE uses it to build the picker.
 */
import { z } from 'zod';

/** Operator IDs accepted on leaf conditions. Validated per-type by the evaluator. */
export const CONDITION_OPERATORS = [
  // string + enum
  'equals',
  'not_equals',
  'contains',
  'starts_with',
  'ends_with',
  'in',
  'not_in',
  // number
  'gt',
  'gte',
  'lt',
  'lte',
  'between',
  // date
  'before',
  'after',
  'within_days',
  'older_than_days',
  // boolean
  'is_true',
  'is_false',
  // any
  'is_empty',
  'is_not_empty',
] as const;
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

/* ---------------- Recursive zod schema ---------------- */

const leafSchema = z.object({
  kind: z.literal('leaf'),
  field: z.string().min(1),
  operator: z.enum(CONDITION_OPERATORS),
  /**
   * Operator-specific value:
   *   equals/not_equals    : string | number | boolean
   *   contains/...         : string
   *   in/not_in            : (string | number)[]
   *   gt/gte/lt/lte        : number
   *   between              : [number, number]
   *   before/after         : ISO date string
   *   within_days/older_…  : number  (count of days)
   *   is_true/false/empty… : null (no value needed)
   */
  value: z
    .union([
      z.string(),
      z.number(),
      z.boolean(),
      z.null(),
      z.array(z.union([z.string(), z.number()])),
    ])
    .optional(),
});

export type ConditionLeaf = z.infer<typeof leafSchema>;

// Recursive group schema — zod needs the lazy/late binding via interface trick.
//
// Backwards-compat note: older rules carry a group-level `operator`
// (single 'and' | 'or' that applied to every sibling). New rules
// carry `connectors[]` — one entry per (i, i+1) sibling pair, so the
// user can mix AND / OR within a single level. SQL-standard precedence
// applies in the evaluator: AND binds tighter than OR.
//
// When reading: if `connectors` is set, it wins. Otherwise we derive
// it from `operator` (all entries equal). On write the FE emits
// `connectors` only and omits `operator`; the BE accepts either.
export interface ConditionGroup {
  kind: 'group';
  /** Legacy uniform operator. Optional. Use `connectors` for mixed AND/OR. */
  operator?: 'and' | 'or';
  /**
   * Per-pair connectors. `connectors[i]` joins `conditions[i]` to
   * `conditions[i+1]`. Length = max(0, conditions.length - 1).
   */
  connectors?: Array<'and' | 'or'>;
  conditions: Array<ConditionLeaf | ConditionGroup>;
}

export const conditionGroupSchema: z.ZodType<ConditionGroup> = z.lazy(() =>
  z
    .object({
      kind: z.literal('group'),
      operator: z.enum(['and', 'or']).optional(),
      connectors: z
        .array(z.enum(['and', 'or']))
        .max(50)
        .optional(),
      conditions: z.array(z.union([leafSchema, conditionGroupSchema])).max(50),
    })
    .refine(
      (g) => g.operator !== undefined || g.connectors !== undefined || g.conditions.length <= 1,
      {
        message: 'group must declare either operator or connectors when it has more than one child',
      },
    ),
);

export const conditionLeafSchema = leafSchema;
export const conditionNodeSchema = z.union([leafSchema, conditionGroupSchema]);
export type ConditionNode = ConditionLeaf | ConditionGroup;
