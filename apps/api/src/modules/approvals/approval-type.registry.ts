/**
 * ApprovalTypeRegistry — module-owned definitions for what each
 * approvable kind means.
 *
 * Modules register on `onModuleInit` with:
 *   - kind / label / iconKey      : presentation
 *   - decisionPolicy              : single | multi | threshold
 *   - requiredPermission          : who can act on an approval of this kind
 *   - softSoD                     : true = submitter may also approve
 *                                    (commission-run keeps this true to
 *                                    preserve the Phase 2 decision)
 *   - loadSource(sourceId)        : fetch the underlying entity
 *   - toMetadata(source, submitter): compute the inbox-row blob persisted
 *                                    onto Approval.metadata
 *   - confirmationPhraseFor(src)  : the typed phrase the approver must
 *                                    enter (PNG 10), or null
 *   - validateConfirmation(...)   : throw to reject (e.g. wrong phrase)
 *   - onApproved / onRejected /
 *     onCancelled                 : side effects on resolve. For
 *                                    commission-run these dual-write
 *                                    the CommissionRun's denormalised
 *                                    approval columns and emit the
 *                                    domain event the timeline
 *                                    subscriber listens to.
 *
 * Phase 3 ships only `single` policy. `multi` and `threshold` are
 * declared in the type union so future modules can flag intent;
 * the service rejects submissions for non-single policies with a
 * "policy not implemented" message until the resolver logic lands.
 */
import { Injectable, Logger } from '@nestjs/common';
import type { Approval, ApprovalDecision } from '@prisma/client';

export type DecisionPolicy = 'single' | 'multi' | 'threshold';

/**
 * One stage in a sequential approver chain. Approvers are matched by
 * permission (anyone holding `requiredPermission` can act on the
 * stage). `label` is shown in the inbox progress indicator.
 */
export interface ApprovalStage {
  requiredPermission: string;
  label: string;
}

export interface ApprovalRequester {
  userId: string;
  /** Display name — falls back to email if no Employee profile linked. */
  name: string;
  /** Optional secondary line — e.g. 'HR Admin', 'BD Associate'. */
  role: string | null;
  /** OKLCH hue for the avatar tile. */
  hue: number;
  initials: string;
}

export interface ApprovalMetadata {
  /** The headline ('May 2026 commission run'). */
  title: string;
  /** Short sub-line ('11 recipients · $9,256'). */
  sub: string;
  /** Optional third-line detail. */
  meta?: string;
  /** Module / event-tone hint — drives the inbox dot color. */
  hue?: number;
  /** True for runs/payrolls that warrant individual review (no bulk approve). */
  complex?: boolean;
  /** Display severity (info / warning / danger) for the inbox icon tile. */
  severity?: 'info' | 'success' | 'warning' | 'danger';
  /** Frontend deep-link to open the source's detail page. */
  link?: string;
  /** Snapshot of the submitter at submit time. */
  requester?: ApprovalRequester;
  /** Any additional source-specific blob the inbox row may read. */
  [k: string]: unknown;
}

export interface ApprovalTypeContext {
  /** The Approval row being resolved. */
  approval: Approval;
  /** The source entity. Loaded via the type's loadSource. */
  source: unknown;
  /** The decision row that triggered the resolve (approve / reject). */
  decision?: ApprovalDecision;
  /** For cancel — the user that cancelled. */
  cancelledById?: string;
  /** For cancel — the reason. */
  cancelReason?: string;
}

export interface ApprovalTypeDefinition {
  /** Stable kind key — 'commission-run', 'overtime.request', etc. */
  kind: string;
  /** Inbox chip + row label. */
  label: string;
  /** Lucide icon name — frontend maps to a component. */
  iconKey?: string;
  /** Owning module key — used for filtering / grouping. */
  module: string;
  /** Decision policy. Phase 3 only implements 'single'. */
  decisionPolicy: DecisionPolicy;
  /** For threshold: how many approve decisions resolve the approval. */
  thresholdCount?: number;
  /**
   * Permission key required to act on a single-stage approval. When
   * `stages` is set with more than one entry this is ignored in favour
   * of the per-stage permissions (kept for back-compat + as the
   * implicit single stage when `stages` is omitted).
   */
  requiredPermission: string;
  /**
   * Sequential approver chain. Omit (or a single entry) for the legacy
   * single-approver behaviour. With 2+ entries the approval advances
   * one stage per approve and only resolves after the final stage.
   */
  stages?: ApprovalStage[];
  /** True = same user may submit + approve. False = hard SoD block. */
  softSoD: boolean;

  /** Load the source entity. Returns null if missing — service will
   *  cancel the approval automatically. */
  loadSource(sourceId: string): Promise<unknown | null>;

  /** Build the inbox metadata blob at submit time. */
  toMetadata(args: { source: unknown; submitterUserId: string }): Promise<ApprovalMetadata>;

  /** The typed confirmation phrase the approver must enter, or null. */
  confirmationPhraseFor?(source: unknown): string | null;

  /** Validate the confirmationData. Throw with a BadRequestException
   *  message on mismatch. */
  validateConfirmation?(args: { source: unknown; confirmationData: unknown }): void;

  /** Side effects ---------- */
  onApproved?(ctx: ApprovalTypeContext): Promise<void>;
  onRejected?(ctx: ApprovalTypeContext & { reason: string }): Promise<void>;
  onCancelled?(ctx: ApprovalTypeContext): Promise<void>;
}

/**
 * Normalise a type's chain to a concrete stage list. A type with no
 * (or a single) `stages` entry becomes one stage keyed by its
 * `requiredPermission` — i.e. identical to the legacy behaviour.
 */
export function resolveStages(def: ApprovalTypeDefinition): ApprovalStage[] {
  if (def.stages && def.stages.length > 0) return def.stages;
  return [{ requiredPermission: def.requiredPermission, label: 'Approval' }];
}

@Injectable()
export class ApprovalTypeRegistry {
  private readonly logger = new Logger(ApprovalTypeRegistry.name);
  private readonly defs = new Map<string, ApprovalTypeDefinition>();

  register(def: ApprovalTypeDefinition): void {
    if (this.defs.has(def.kind)) {
      this.logger.warn(`ApprovalType '${def.kind}' re-registered`);
    }
    this.defs.set(def.kind, def);
  }

  get(kind: string): ApprovalTypeDefinition | undefined {
    return this.defs.get(kind);
  }

  require(kind: string): ApprovalTypeDefinition {
    const def = this.defs.get(kind);
    if (!def) {
      throw new Error(
        `Unknown ApprovalType '${kind}'. Did the owning module forget to register it on init?`,
      );
    }
    return def;
  }

  list(): ApprovalTypeDefinition[] {
    return Array.from(this.defs.values()).sort((a, b) => a.label.localeCompare(b.label));
  }
}
