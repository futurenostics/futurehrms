/**
 * Live preview for the rule editor.
 *
 * Two read-only operations powering the FE's "N entities match"
 * counter under the condition builder, and the "M recipients" count
 * next to the recipient list header:
 *
 *   - previewConditions({ sourceKind, conditions, departmentId? })
 *       Scans the entity table, hydrates each row with the same
 *       loaders the runtime uses, evaluates the condition tree, and
 *       returns `{ matched, total, sample: [{ id, label }] }`.
 *
 *   - previewRecipients({ recipientResolvers, sourceKind?, sourceId? })
 *       Resolves the entries against the given source (or null, for
 *       resolvers that don't need one — `specific-employees`,
 *       `role-members`). Returns `{ count, sample: [{ id, name }] }`.
 *
 * Same code paths as the live scheduler (`evaluateConditions` +
 * `buildConditionContexts` + `RecipientResolverRegistry`), so the
 * preview never drifts from what the rule will actually do.
 */
import { Injectable } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import type { ReminderRule } from '@prisma/client';
import {
  RecipientResolverRegistry,
  type RecipientEntry,
  type ResolverSource,
} from './recipient-resolver';
import { evaluateConditions } from './reminder-conditions.evaluator';
import type { ConditionNode } from './reminder-conditions.types';
import { buildConditionContexts } from './reminder-condition-context';
import {
  fetchLabelsForSample,
  fetchSourcesForKind,
  isScannableKind,
} from './reminder-entity-scans';

const SAMPLE_LIMIT = 5;

export interface ConditionPreviewInput {
  sourceKind: string;
  conditions?: ConditionNode;
  departmentId?: string | null;
}

export interface ConditionPreviewResult {
  matched: number;
  total: number;
  sample: Array<{ id: string; label: string }>;
}

export interface RecipientPreviewInput {
  recipientResolvers: RecipientEntry[];
  sourceKind?: string | null;
  sourceId?: string | null;
  departmentId?: string | null;
}

export interface RecipientPreviewResult {
  count: number;
  sample: Array<{ id: string; name: string; email: string | null }>;
}

@Injectable()
export class ConditionPreviewService {
  constructor(private readonly resolvers: RecipientResolverRegistry) {}

  async previewConditions(input: ConditionPreviewInput): Promise<ConditionPreviewResult> {
    if (!isScannableKind(input.sourceKind)) {
      return { matched: 0, total: 0, sample: [] };
    }

    const sources = await fetchSourcesForKind(input.sourceKind, input.departmentId ?? null);
    const total = sources.length;
    if (total === 0) return { matched: 0, total: 0, sample: [] };

    // No conditions = every scanned row matches. Skip the hydrate
    // step entirely so this stays cheap for the "count my employees"
    // case (no filters set yet).
    if (!input.conditions) {
      const sampleIds = sources.slice(0, SAMPLE_LIMIT).map((s) => s.id);
      const labels = await fetchLabelsForSample(input.sourceKind, sampleIds);
      return {
        matched: total,
        total,
        sample: sampleIds.map((id) => ({ id, label: labels.get(id) ?? id })),
      };
    }

    const contexts = await buildConditionContexts(sources);
    const matchedIds: string[] = [];
    for (const s of sources) {
      const ctx = contexts.get(`${s.kind}:${s.id}`);
      if (ctx && evaluateConditions(input.conditions, ctx)) {
        matchedIds.push(s.id);
      }
    }

    const sampleIds = matchedIds.slice(0, SAMPLE_LIMIT);
    const labels = await fetchLabelsForSample(input.sourceKind, sampleIds);
    return {
      matched: matchedIds.length,
      total,
      sample: sampleIds.map((id) => ({ id, label: labels.get(id) ?? id })),
    };
  }

  async previewRecipients(input: RecipientPreviewInput): Promise<RecipientPreviewResult> {
    if (input.recipientResolvers.length === 0) {
      return { count: 0, sample: [] };
    }

    const source: ResolverSource =
      input.sourceKind && input.sourceId
        ? ({ kind: input.sourceKind, id: input.sourceId } as ResolverSource)
        : null;

    // The resolver registry expects a ReminderRule shape so it can
    // read department scoping. The preview doesn't have a persisted
    // rule yet — we synthesize the minimal subset the resolvers
    // actually read.
    const syntheticRule = {
      id: '__preview__',
      key: '__preview__',
      departmentId: input.departmentId ?? null,
    } as unknown as ReminderRule;

    const userIds = await this.resolvers.resolveMany(
      input.recipientResolvers,
      syntheticRule,
      source,
    );

    if (userIds.length === 0) return { count: 0, sample: [] };

    const sample = await prisma.user.findMany({
      where: { id: { in: userIds.slice(0, SAMPLE_LIMIT) } },
      select: {
        id: true,
        email: true,
        employee: { select: { fullName: true } },
      },
    });

    return {
      count: userIds.length,
      sample: sample.map((u) => ({
        id: u.id,
        name: u.employee?.fullName ?? u.email,
        email: u.email,
      })),
    };
  }
}
