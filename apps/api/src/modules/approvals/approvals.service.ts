/**
 * Generic ApprovalsService.
 *
 * Public surface:
 *   - submit       : create a pending Approval for (type, sourceId)
 *   - approve      : record an approve decision; resolve when policy met
 *   - reject       : record a reject decision; resolves immediately
 *   - cancel       : admin / system cancellation (source deleted etc)
 *   - list / get   : inbox queries (cross-module)
 *
 * Each public action audit-logs and emits a domain event:
 *   approval.submitted | approval.approved | approval.rejected |
 *   approval.cancelled
 *
 * Soft SoD: types opt in via softSoD=true. When true, the submitter
 * may also be the approver and we still record approverIsSubmitter
 * on the decision's confirmationData (so downstream side effects can
 * surface it). Hard SoD (softSoD=false) rejects same-user approve
 * with a 403.
 *
 * Decision policy:
 *   single    — first approve resolves to 'approved'.
 *   multi     — Phase 3 throws NotImplemented.
 *   threshold — Phase 3 throws NotImplemented.
 */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import type { Approval, Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../core/auth/types';
import { AuditService } from '../../core/audit/audit.service';
import { EventBusService } from '../../core/events/event-bus.service';
import {
  ApprovalTypeRegistry,
  type ApprovalMetadata,
} from './approval-type.registry';

export interface ApprovalPublic {
  id: string;
  type: string;
  sourceType: string;
  sourceId: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  submittedById: string;
  submittedByEmail: string;
  submittedByName: string | null;
  submittedAt: string;
  requiredPermission: string;
  decisionPolicy: string;
  metadata: ApprovalMetadata;
  resolvedAt: string | null;
  resolvedById: string | null;
  resolveReason: string | null;
  decisions: Array<{
    id: string;
    decidedById: string;
    decidedByEmail: string;
    decidedByName: string | null;
    decision: 'approve' | 'reject';
    decidedAt: string;
    confirmationData: unknown;
  }>;
}

export interface SubmitInput {
  type: string;
  sourceId: string;
  submittedById: string;
  /** Optional overrides for the metadata blob (rare — usually computed by the type). */
  metadataOverrides?: Partial<ApprovalMetadata>;
}

export interface DecisionInput {
  confirmationData?: unknown;
  /** Free-form notes alongside the structured confirmation data. */
  notes?: string;
}

export interface ListQuery {
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'all';
  type?: string;
  /** When 'me', filter to approvals the viewer can act on. */
  for?: 'me' | 'all';
  limit?: number;
  offset?: number;
}

@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);

  constructor(
    private readonly types: ApprovalTypeRegistry,
    private readonly events: EventBusService,
    private readonly audit: AuditService,
  ) {}

  /* ---------- Submit ---------- */

  async submit(input: SubmitInput): Promise<Approval> {
    const def = this.types.require(input.type);
    if (def.decisionPolicy !== 'single') {
      throw new BadRequestException(
        `Decision policy '${def.decisionPolicy}' is not implemented in Phase 3. Only 'single' is supported.`,
      );
    }

    const source = await def.loadSource(input.sourceId);
    if (!source) {
      throw new NotFoundException(`Source ${input.type}/${input.sourceId} not found`);
    }

    // Block duplicate pending approval per source — application-level
    // dedupe since we can't express a partial unique on a column.
    const existingPending = await prisma.approval.findFirst({
      where: { type: input.type, sourceId: input.sourceId, status: 'pending' },
    });
    if (existingPending) {
      throw new BadRequestException(
        `An approval is already pending for ${input.type}/${input.sourceId}`,
      );
    }

    const metadata = {
      ...(await def.toMetadata({ source, submitterUserId: input.submittedById })),
      ...(input.metadataOverrides ?? {}),
    };

    const created = await prisma.approval.create({
      data: {
        type: input.type,
        sourceType: input.type, // sourceType mirrors type today; future could differ
        sourceId: input.sourceId,
        status: 'pending',
        submittedById: input.submittedById,
        submittedAt: new Date(),
        requiredPermission: def.requiredPermission,
        decisionPolicy: def.decisionPolicy,
        thresholdCount: def.thresholdCount ?? null,
        metadata: metadata as never,
      },
    });

    this.events.emit(
      'approval.submitted',
      {
        approvalId: created.id,
        type: created.type,
        sourceId: created.sourceId,
        submittedById: created.submittedById,
      },
      { actorId: input.submittedById },
    );
    await this.audit.record({
      module: 'approvals',
      entity: 'Approval',
      entityId: created.id,
      action: 'submitted',
      after: { type: created.type, sourceId: created.sourceId },
      actorId: input.submittedById,
    });

    return created;
  }

  /* ---------- Approve ---------- */

  async approve(
    viewer: AuthenticatedUser,
    id: string,
    input: DecisionInput,
  ): Promise<Approval> {
    const approval = await this.requirePendingApproval(id);
    const def = this.types.require(approval.type);

    if (!viewer.permissions.includes(def.requiredPermission)) {
      throw new ForbiddenException(`${def.requiredPermission} required to approve this`);
    }

    // SoD enforcement — hard block if the type opted out of soft SoD.
    if (!def.softSoD && approval.submittedById === viewer.id) {
      throw new ForbiddenException(
        'Submitter cannot approve their own submission (this type enforces strict separation of duties)',
      );
    }
    const approverIsSubmitter = approval.submittedById === viewer.id;

    const source = await def.loadSource(approval.sourceId);
    if (!source) {
      throw new NotFoundException('Source entity not found — cancel this approval instead');
    }

    // Type-specific validation (typed phrase, notes-required, etc.)
    if (def.validateConfirmation) {
      def.validateConfirmation({ source, confirmationData: input.confirmationData });
    }

    const decisionPayload = {
      ...(input.confirmationData as Record<string, unknown> | undefined),
      notes: input.notes ?? null,
      approverIsSubmitter,
    };

    const decision = await prisma.approvalDecision.create({
      data: {
        approvalId: approval.id,
        decidedById: viewer.id,
        decision: 'approve',
        confirmationData: decisionPayload as never,
      },
    });

    // Single policy: first approve resolves.
    const updated = await prisma.approval.update({
      where: { id: approval.id },
      data: {
        status: 'approved',
        resolvedAt: new Date(),
        resolvedById: viewer.id,
      },
    });

    // Side effects — type owns the actual domain transition + event.
    if (def.onApproved) {
      try {
        await def.onApproved({ approval: updated, source, decision });
      } catch (err) {
        // Roll back the approval row so the source + approval don't
        // drift. The thrown error bubbles up to the caller.
        await prisma.approval.update({
          where: { id: approval.id },
          data: { status: 'pending', resolvedAt: null, resolvedById: null },
        });
        await prisma.approvalDecision.delete({ where: { id: decision.id } });
        this.logger.error(
          `onApproved side effect failed for ${approval.type}/${approval.sourceId}; approval rolled back`,
        );
        throw err;
      }
    }

    this.events.emit(
      'approval.approved',
      {
        approvalId: updated.id,
        type: updated.type,
        sourceId: updated.sourceId,
        approvedById: viewer.id,
        approverIsSubmitter,
      },
      { actorId: viewer.id },
    );
    await this.audit.record({
      module: 'approvals',
      entity: 'Approval',
      entityId: updated.id,
      action: 'approved',
      after: { approverIsSubmitter },
      actorId: viewer.id,
    });

    return updated;
  }

  /* ---------- Reject ---------- */

  async reject(
    viewer: AuthenticatedUser,
    id: string,
    input: { reason: string },
  ): Promise<Approval> {
    const approval = await this.requirePendingApproval(id);
    const def = this.types.require(approval.type);
    if (!viewer.permissions.includes(def.requiredPermission)) {
      throw new ForbiddenException(`${def.requiredPermission} required to reject this`);
    }
    if (!input.reason || input.reason.trim().length === 0) {
      throw new BadRequestException('A rejection reason is required');
    }

    const source = await def.loadSource(approval.sourceId);
    if (!source) {
      throw new NotFoundException('Source entity not found — cancel this approval instead');
    }

    const decision = await prisma.approvalDecision.create({
      data: {
        approvalId: approval.id,
        decidedById: viewer.id,
        decision: 'reject',
        confirmationData: { reason: input.reason } as never,
      },
    });
    const updated = await prisma.approval.update({
      where: { id: approval.id },
      data: {
        status: 'rejected',
        resolvedAt: new Date(),
        resolvedById: viewer.id,
        resolveReason: input.reason,
      },
    });

    if (def.onRejected) {
      try {
        await def.onRejected({
          approval: updated,
          source,
          decision,
          reason: input.reason,
        });
      } catch (err) {
        await prisma.approval.update({
          where: { id: approval.id },
          data: { status: 'pending', resolvedAt: null, resolvedById: null, resolveReason: null },
        });
        await prisma.approvalDecision.delete({ where: { id: decision.id } });
        throw err;
      }
    }

    this.events.emit(
      'approval.rejected',
      {
        approvalId: updated.id,
        type: updated.type,
        sourceId: updated.sourceId,
        rejectedById: viewer.id,
        reason: input.reason,
      },
      { actorId: viewer.id },
    );
    await this.audit.record({
      module: 'approvals',
      entity: 'Approval',
      entityId: updated.id,
      action: 'rejected',
      after: { reason: input.reason },
      actorId: viewer.id,
    });

    return updated;
  }

  /* ---------- Cancel ---------- */

  async cancel(
    viewer: AuthenticatedUser,
    id: string,
    reason: string,
  ): Promise<Approval> {
    const approval = await this.requirePendingApproval(id);
    const def = this.types.require(approval.type);

    // Cancel is for system / admin use — the type's required perm OR
    // approvals:cancel_any unblocks it.
    if (
      !viewer.permissions.includes('approvals:cancel_any') &&
      !viewer.permissions.includes(def.requiredPermission)
    ) {
      throw new ForbiddenException('Not allowed to cancel this approval');
    }

    const source = await def.loadSource(approval.sourceId);
    const updated = await prisma.approval.update({
      where: { id: approval.id },
      data: {
        status: 'cancelled',
        resolvedAt: new Date(),
        resolvedById: viewer.id,
        resolveReason: reason,
      },
    });
    if (def.onCancelled && source) {
      try {
        await def.onCancelled({
          approval: updated,
          source,
          cancelledById: viewer.id,
          cancelReason: reason,
        });
      } catch (err) {
        this.logger.warn(
          `onCancelled side effect failed for ${approval.type}/${approval.sourceId}: ${(err as Error).message}`,
        );
        // We don't roll back cancel — the approval is already moot.
      }
    }
    this.events.emit(
      'approval.cancelled',
      {
        approvalId: updated.id,
        type: updated.type,
        sourceId: updated.sourceId,
        cancelledById: viewer.id,
        reason,
      },
      { actorId: viewer.id },
    );
    await this.audit.record({
      module: 'approvals',
      entity: 'Approval',
      entityId: updated.id,
      action: 'cancelled',
      after: { reason },
      actorId: viewer.id,
    });
    return updated;
  }

  /* ---------- Reads ---------- */

  async list(
    viewer: AuthenticatedUser,
    query: ListQuery,
  ): Promise<{ items: ApprovalPublic[]; total: number; counts: Record<string, number> }> {
    if (
      !viewer.permissions.includes('approvals:view_own_inbox') &&
      !viewer.permissions.includes('approvals:view_all_inbox')
    ) {
      throw new ForbiddenException('approvals:view_own_inbox or view_all_inbox required');
    }
    const where: Prisma.ApprovalWhereInput = {};
    if (query.status && query.status !== 'all') where.status = query.status;
    else if (!query.status) where.status = 'pending';
    if (query.type) where.type = query.type;
    if (query.for === 'me') {
      where.requiredPermission = { in: viewer.permissions };
    }

    const [rows, total, byTypeRows] = await Promise.all([
      prisma.approval.findMany({
        where,
        include: {
          submittedBy: { include: { employee: { select: { fullName: true } } } },
          decisions: {
            include: { decidedBy: { include: { employee: { select: { fullName: true } } } } },
            orderBy: { decidedAt: 'asc' },
          },
        },
        orderBy: { submittedAt: 'desc' },
        skip: query.offset ?? 0,
        take: Math.min(query.limit ?? 50, 200),
      }),
      prisma.approval.count({ where }),
      prisma.approval.groupBy({
        by: ['type'],
        where: { ...where, type: undefined },
        _count: { _all: true },
      }),
    ]);

    const counts: Record<string, number> = { all: 0 };
    for (const r of byTypeRows) {
      counts[r.type] = r._count._all;
      counts.all += r._count._all;
    }

    return { items: rows.map(toPublic), total, counts };
  }

  async findOne(viewer: AuthenticatedUser, id: string): Promise<ApprovalPublic> {
    if (
      !viewer.permissions.includes('approvals:view_own_inbox') &&
      !viewer.permissions.includes('approvals:view_all_inbox')
    ) {
      throw new ForbiddenException('approvals:view_own_inbox or view_all_inbox required');
    }
    const row = await prisma.approval.findUnique({
      where: { id },
      include: {
        submittedBy: { include: { employee: { select: { fullName: true } } } },
        decisions: {
          include: { decidedBy: { include: { employee: { select: { fullName: true } } } } },
          orderBy: { decidedAt: 'asc' },
        },
      },
    });
    if (!row) throw new NotFoundException('Approval not found');
    return toPublic(row);
  }

  /**
   * Internal helper for legacy bespoke endpoints that need to find
   * the active approval for a given source.
   */
  async findActiveBySource(type: string, sourceId: string): Promise<Approval | null> {
    return prisma.approval.findFirst({
      where: { type, sourceId, status: 'pending' },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /** List registered types for the frontend filter chips. */
  listTypes(): Array<{
    kind: string;
    label: string;
    iconKey: string | null;
    module: string;
    requiredPermission: string;
    decisionPolicy: string;
  }> {
    return this.types.list().map((t) => ({
      kind: t.kind,
      label: t.label,
      iconKey: t.iconKey ?? null,
      module: t.module,
      requiredPermission: t.requiredPermission,
      decisionPolicy: t.decisionPolicy,
    }));
  }

  /* ---------- Internals ---------- */

  private async requirePendingApproval(id: string): Promise<Approval> {
    const a = await prisma.approval.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Approval not found');
    if (a.status !== 'pending') {
      throw new BadRequestException(`Approval is already ${a.status}`);
    }
    return a;
  }
}

function toPublic(
  row: Prisma.ApprovalGetPayload<{
    include: {
      submittedBy: { include: { employee: { select: { fullName: true } } } };
      decisions: {
        include: { decidedBy: { include: { employee: { select: { fullName: true } } } } };
      };
    };
  }>,
): ApprovalPublic {
  return {
    id: row.id,
    type: row.type,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    status: row.status as ApprovalPublic['status'],
    submittedById: row.submittedById,
    submittedByEmail: row.submittedBy.email,
    submittedByName: row.submittedBy.employee?.fullName ?? null,
    submittedAt: row.submittedAt.toISOString(),
    requiredPermission: row.requiredPermission,
    decisionPolicy: row.decisionPolicy,
    metadata: (row.metadata ?? {}) as ApprovalMetadata,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    resolvedById: row.resolvedById,
    resolveReason: row.resolveReason,
    decisions: row.decisions.map((d) => ({
      id: d.id,
      decidedById: d.decidedById,
      decidedByEmail: d.decidedBy.email,
      decidedByName: d.decidedBy.employee?.fullName ?? null,
      decision: d.decision as 'approve' | 'reject',
      decidedAt: d.decidedAt.toISOString(),
      confirmationData: d.confirmationData,
    })),
  };
}
