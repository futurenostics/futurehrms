/**
 * Commission dispute / query flow.
 *
 * An employee flags one of their own commission line items ("this
 * looks wrong"); HR resolves or rejects it with a note. The dispute
 * is a tracking/communication artifact — it never mutates the run or
 * the line item. Any dollar fix is a separate draft line-item
 * adjustment.
 *
 * Scoping:
 *   - raise: `raise_dispute`, and the line item must belong to the
 *     caller (unless they also hold `manage_disputes`).
 *   - list: `manage_disputes` sees everything; everyone else sees
 *     only their own disputes.
 *   - resolve/reject: `manage_disputes`.
 */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { Prisma } from '@prisma/client';
import type {
  CommissionDisputeCreateInput,
  CommissionDisputeListQuery,
  CommissionDisputeListResponse,
  CommissionDisputePublic,
  CommissionDisputeResolveInput,
  CommissionDisputeStatus,
} from '@futurenostics/types';
import type { AuthenticatedUser } from '../../core/auth/types';
import { EventBusService } from '../../core/events/event-bus.service';

const DISPUTE_INCLUDE = {
  employee: { select: { id: true, fullName: true, eid: true } },
  lineItem: { include: { project: { select: { name: true } } } },
} satisfies Prisma.CommissionDisputeInclude;

type DisputeRow = Prisma.CommissionDisputeGetPayload<{ include: typeof DISPUTE_INCLUDE }>;

@Injectable()
export class CommissionDisputesService {
  constructor(private readonly events: EventBusService) {}

  private require(perm: string, viewer: AuthenticatedUser): void {
    if (!viewer.permissions.includes(perm)) {
      throw new ForbiddenException(`${perm} required`);
    }
  }

  private canManage(viewer: AuthenticatedUser): boolean {
    return viewer.permissions.includes('commissions:manage_disputes');
  }

  /* ---------- Raise ---------- */

  async raise(
    viewer: AuthenticatedUser,
    input: CommissionDisputeCreateInput,
  ): Promise<CommissionDisputePublic> {
    this.require('commissions:raise_dispute', viewer);

    const lineItem = await prisma.commissionLineItem.findUnique({
      where: { id: input.lineItemId },
    });
    if (!lineItem) throw new NotFoundException('Line item not found');

    // You can only dispute your own line item — unless you're HR raising
    // on someone's behalf (manage_disputes).
    if (lineItem.employeeId !== viewer.employeeId && !this.canManage(viewer)) {
      throw new ForbiddenException('You can only dispute your own commission line items');
    }

    // One open dispute per line item keeps the flow sane.
    const openExisting = await prisma.commissionDispute.findFirst({
      where: { lineItemId: lineItem.id, status: 'open' },
    });
    if (openExisting) {
      throw new BadRequestException('There is already an open dispute for this line item');
    }

    const created = await prisma.commissionDispute.create({
      data: {
        lineItemId: lineItem.id,
        runId: lineItem.runId,
        employeeId: lineItem.employeeId,
        projectId: lineItem.projectId,
        roleName: lineItem.roleName,
        disputedAmountUsd: lineItem.finalAmountUsd,
        raisedById: viewer.id,
        reason: input.reason,
        status: 'open',
      },
      include: DISPUTE_INCLUDE,
    });

    this.events.emit(
      'commission.dispute.raised',
      {
        disputeId: created.id,
        runId: created.runId,
        lineItemId: created.lineItemId,
        employeeId: created.employeeId,
      },
      { actorId: viewer.id },
    );

    return toPublic(created);
  }

  /* ---------- List ---------- */

  async list(
    viewer: AuthenticatedUser,
    query: CommissionDisputeListQuery,
  ): Promise<CommissionDisputeListResponse> {
    const where: Prisma.CommissionDisputeWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.runId) where.runId = query.runId;

    // Non-managers are always scoped to their own disputes; `mine`
    // lets a manager narrow to their own too.
    if (!this.canManage(viewer) || query.mine) {
      where.employeeId = viewer.employeeId ?? '__none__';
    }

    const [rows, total, openCount] = await Promise.all([
      prisma.commissionDispute.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.offset,
        take: query.limit,
        include: DISPUTE_INCLUDE,
      }),
      prisma.commissionDispute.count({ where }),
      prisma.commissionDispute.count({ where: { ...where, status: 'open' } }),
    ]);

    return {
      items: rows.map(toPublic),
      total,
      hasMore: query.offset + rows.length < total,
      openCount,
    };
  }

  /* ---------- Resolve / reject ---------- */

  async resolve(
    viewer: AuthenticatedUser,
    id: string,
    input: CommissionDisputeResolveInput,
  ): Promise<CommissionDisputePublic> {
    this.require('commissions:manage_disputes', viewer);

    const existing = await prisma.commissionDispute.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Dispute not found');
    if (existing.status !== 'open') {
      throw new BadRequestException(`Dispute is already ${existing.status}`);
    }

    const updated = await prisma.commissionDispute.update({
      where: { id },
      data: {
        status: input.status,
        resolutionNote: input.resolutionNote ?? null,
        resolvedById: viewer.id,
        resolvedAt: new Date(),
      },
      include: DISPUTE_INCLUDE,
    });

    this.events.emit(
      input.status === 'resolved' ? 'commission.dispute.resolved' : 'commission.dispute.rejected',
      {
        disputeId: updated.id,
        runId: updated.runId,
        employeeId: updated.employeeId,
        status: updated.status,
      },
      { actorId: viewer.id },
    );

    return toPublic(updated);
  }
}

function toPublic(row: DisputeRow): CommissionDisputePublic {
  return {
    id: row.id,
    lineItemId: row.lineItemId,
    runId: row.runId,
    employeeId: row.employeeId,
    employee: row.employee
      ? { id: row.employee.id, fullName: row.employee.fullName, eid: row.employee.eid }
      : null,
    projectId: row.projectId,
    projectName: row.lineItem?.project.name ?? null,
    roleName: row.roleName,
    disputedAmountUsd: row.disputedAmountUsd === null ? null : Number(row.disputedAmountUsd),
    raisedById: row.raisedById,
    reason: row.reason,
    status: row.status as CommissionDisputeStatus,
    resolutionNote: row.resolutionNote,
    resolvedById: row.resolvedById,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
