/**
 * One-shot migration: convert event-triggered ReminderRule rows that
 * carry the legacy `offset` + `relativeTo` shape into cron-triggered
 * rules with the new date operators.
 *
 * Mapping (per the approved plan):
 *
 *   relativeTo = probationEndDate, offset = -PND
 *     → triggerType = 'cron'
 *       cron       = '0 9 * * *'
 *       condition  = employee.probationEndDate in_exactly_days N
 *
 *   relativeTo = internshipEndDate, offset = -PND
 *     → ... employee.internshipEndDate in_exactly_days N
 *
 *   relativeTo = joinDate, offset = -PND
 *     → ... employee.joinDate anniversary_in_exactly_days N
 *
 *   relativeTo = dateOfBirth, offset = -PND
 *     → ... employee.dateOfBirth anniversary_in_exactly_days N
 *
 * Idempotent: a rule whose spec no longer contains `offset` /
 * `relativeTo` is skipped. Unknown shapes (non-day offsets,
 * unsupported anchor fields, missing eventType) are reported and
 * the rule is left untouched + flipped to isEnabled=false so HR can
 * review.
 *
 * Usage:
 *   pnpm tsx apps/api/scripts/migrate-reminder-offsets.ts [--dry]
 *
 * Source the project's .env.local first so DATABASE_URL is set.
 */
import { PrismaClient } from '@prisma/client';

const DRY = process.argv.includes('--dry');
const prisma = new PrismaClient();

interface LegacyEventSpec {
  kind: 'event';
  eventType?: string;
  relativeTo?: string | null;
  offset?: string | null;
  conditions?: unknown;
}

type Outcome =
  | { kind: 'skip-already-migrated'; key: string }
  | { kind: 'rewrite'; key: string; from: LegacyEventSpec; to: Record<string, unknown> }
  | { kind: 'disable'; key: string; reason: string; from: LegacyEventSpec };

const ANCHOR_TO_OPERATOR: Record<string, { field: string; operator: string }> = {
  probationEndDate: { field: 'employee.probationEndDate', operator: 'in_exactly_days' },
  internshipEndDate: { field: 'employee.internshipEndDate', operator: 'in_exactly_days' },
  joinDate: { field: 'employee.joinDate', operator: 'anniversary_in_exactly_days' },
  dateOfBirth: { field: 'employee.dateOfBirth', operator: 'anniversary_in_exactly_days' },
};

/** Parse ISO 8601 duration with optional leading `-`. Returns +N days
 *  (positive means "in the future") or null when the offset isn't a
 *  pure day count, since the new model only supports day-precision. */
function parseOffsetDays(offset: string): number | null {
  const m = /^(-?)P(?:(\d+)D)?$/.exec(offset);
  if (!m) return null;
  const days = Number(m[2] ?? '0');
  if (!Number.isFinite(days)) return null;
  return m[1] === '-' ? days : -days; // -P14D means "14 days BEFORE" → +14
}

function buildNewSpec(
  legacy: LegacyEventSpec,
  daysBefore: number,
  mapping: { field: string; operator: string },
): Record<string, unknown> {
  const offsetLeaf = {
    kind: 'leaf' as const,
    field: mapping.field,
    operator: mapping.operator,
    value: daysBefore,
  };
  // Preserve any condition tree the legacy rule had — AND-chain it
  // with the new "N days before" leaf so authored filters survive.
  const conditions = legacy.conditions
    ? { kind: 'group', conditions: [offsetLeaf, legacy.conditions] }
    : { kind: 'group', conditions: [offsetLeaf] };
  return { kind: 'cron', cron: '0 9 * * *', conditions };
}

function planRewrite(rule: { key: string; triggerType: string; triggerSpec: unknown }): Outcome {
  const spec = rule.triggerSpec as LegacyEventSpec | null;
  if (!spec || typeof spec !== 'object') {
    return { kind: 'skip-already-migrated', key: rule.key };
  }
  if (rule.triggerType !== 'event') {
    return { kind: 'skip-already-migrated', key: rule.key };
  }
  if (!spec.relativeTo && !spec.offset) {
    // Plain event rule (no schedule offset) — nothing to migrate.
    return { kind: 'skip-already-migrated', key: rule.key };
  }
  if (!spec.relativeTo || !spec.offset) {
    return {
      kind: 'disable',
      key: rule.key,
      reason: 'partial offset spec (only one of relativeTo / offset set)',
      from: spec,
    };
  }
  const mapping = ANCHOR_TO_OPERATOR[spec.relativeTo];
  if (!mapping) {
    return {
      kind: 'disable',
      key: rule.key,
      reason: `unsupported anchor field '${spec.relativeTo}'`,
      from: spec,
    };
  }
  const days = parseOffsetDays(spec.offset);
  if (days === null || days <= 0) {
    return {
      kind: 'disable',
      key: rule.key,
      reason: `non-day offset '${spec.offset}' — only -PND is supported`,
      from: spec,
    };
  }
  return { kind: 'rewrite', key: rule.key, from: spec, to: buildNewSpec(spec, days, mapping) };
}

async function run(): Promise<void> {
  const rules = await prisma.reminderRule.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      key: true,
      triggerType: true,
      triggerSpec: true,
      description: true,
      isEnabled: true,
    },
  });

  const outcomes = rules.map((r) => ({ id: r.id, ...planRewrite(r) }));
  const rewrites = outcomes.filter((o) => o.kind === 'rewrite');
  const disables = outcomes.filter((o) => o.kind === 'disable');
  const skips = outcomes.filter((o) => o.kind === 'skip-already-migrated');

  console.info(
    `\nSummary: ${rewrites.length} rewrite · ${disables.length} disable · ${skips.length} skip`,
  );
  for (const o of rewrites) {
    const detail = o as Extract<typeof o, { kind: 'rewrite' }>;
    console.info(
      `  rewrite: ${o.key} ← relativeTo=${detail.from.relativeTo} offset=${detail.from.offset}`,
    );
  }
  for (const o of disables) {
    const detail = o as Extract<typeof o, { kind: 'disable' }>;
    console.info(`  disable: ${o.key} (${detail.reason})`);
  }

  if (DRY) {
    console.info('\n--dry: no DB writes.');
    return;
  }

  for (const o of rewrites) {
    const detail = o as Extract<typeof o, { kind: 'rewrite' }>;
    await prisma.reminderRule.update({
      where: { id: o.id },
      data: {
        triggerType: 'cron',
        triggerSpec: detail.to as never,
      },
    });
  }
  for (const o of disables) {
    const detail = o as Extract<typeof o, { kind: 'disable' }>;
    const rule = rules.find((r) => r.id === o.id);
    const note = `[migration] disabled: ${detail.reason}`;
    await prisma.reminderRule.update({
      where: { id: o.id },
      data: {
        isEnabled: false,
        description: rule?.description ? `${rule.description}\n\n${note}` : note,
      },
    });
  }

  console.info(`\nApplied: ${rewrites.length} rewritten, ${disables.length} disabled.`);
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
