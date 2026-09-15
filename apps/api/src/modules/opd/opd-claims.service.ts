import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { Prisma } from '@prisma/client';
import {
  formatOpdFinanceFeedback,
  OPD_CLAIM_MAX_DOCUMENTS,
  type OpdClaimCreateInput,
  type OpdClaimDetail,
  type OpdClaimDocumentPublic,
  type OpdClaimHistoryEntry,
  type OpdClaimListQuery,
  type OpdClaimListResponse,
  type OpdClaimPublic,
  type OpdClaimReturnInput,
  type OpdClaimUpdateInput,
} from '@futurenostics/types';
import { allocateOpdClaimNumber } from './opd-allocate-claim-number';
import type { AuthenticatedUser } from '../../core/auth/types';
import { EventBusService } from '../../core/events/event-bus.service';
import { StorageService } from '../../core/storage/storage.service';
import { ApprovalsService } from '../approvals/approvals.service';

const DOCUMENT_URL_TTL = 15 * 60;

const INCLUDE = {
  employee: {
    select: {
      id: true,
      fullName: true,
      eid: true,
      department: { select: { name: true } },
    },
  },
  documents: { orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.OpdClaimInclude;

type OpdClaimRow = Prisma.OpdClaimGetPayload<{ include: typeof INCLUDE }>;

@Injectable()
export class OpdClaimsService {
  private readonly logger = new Logger(OpdClaimsService.name);

  constructor(
    private readonly events: EventBusService,
    private readonly storage: StorageService,
    private readonly approvals: ApprovalsService,
  ) {}

  private canViewAll(viewer: AuthenticatedUser): boolean {
    return viewer.permissions.includes('opd:view_all');
  }

  private canSubmitOwn(viewer: AuthenticatedUser): boolean {
    return viewer.permissions.includes('opd:submit_own');
  }

  private requireEmployeeId(viewer: AuthenticatedUser): string {
    if (!viewer.employeeId) {
      throw new BadRequestException('Your account is not linked to an employee profile.');
    }
    return viewer.employeeId;
  }

  private assertReadable(viewer: AuthenticatedUser, claim: { employeeId: string }): void {
    if (this.canViewAll(viewer)) return;
    if (viewer.permissions.includes('opd:view_own') && viewer.employeeId === claim.employeeId) {
      return;
    }
    throw new ForbiddenException('You do not have access to this claim.');
  }

  private static editableStatuses = new Set(['draft', 'returned']);

  private assertOwnEditable(
    viewer: AuthenticatedUser,
    claim: { employeeId: string; status: string },
  ): void {
    if (!this.canSubmitOwn(viewer)) {
      throw new ForbiddenException('You cannot create or edit medical claims.');
    }
    if (viewer.employeeId !== claim.employeeId) {
      throw new ForbiddenException('You can only edit your own claims.');
    }
    if (!OpdClaimsService.editableStatuses.has(claim.status)) {
      throw new BadRequestException('This claim cannot be edited.');
    }
  }

  private async loadHistory(claimId: string, employeeId: string): Promise<OpdClaimHistoryEntry[]> {
    const rows = await prisma.timelineEntry.findMany({
      where: { module: 'opd', employeeId },
      orderBy: { occurredAt: 'desc' },
      take: 50,
    });
    return rows
      .filter((row) => {
        const details = row.details as { claimId?: string } | null;
        return details?.claimId === claimId;
      })
      .map((row) => ({
        id: row.id,
        title: row.title,
        occurredAt: row.occurredAt.toISOString(),
        eventType: row.eventType,
      }));
  }

  private decimalToNumber(value: { toString: () => string } | number): number {
    if (typeof value === 'number') return value;
    return Number(value.toString());
  }

  private async signDocuments(
    docs: OpdClaimRow['documents'],
    includeUrl: boolean,
  ): Promise<OpdClaimDocumentPublic[]> {
    return Promise.all(
      docs.map(async (doc) => {
        let url: string | null = null;
        if (includeUrl) {
          try {
            url = await this.storage.getSignedDownloadUrl({
              bucket: 'documents',
              key: doc.storageKey,
              expiresInSeconds: DOCUMENT_URL_TTL,
            });
          } catch (err) {
            this.logger.warn(
              `Failed to sign document URL for ${doc.id}: ${(err as Error).message}`,
            );
          }
        }
        return { id: doc.id, fileName: doc.fileName, url };
      }),
    );
  }

  private async toPublic(row: OpdClaimRow, includeUrl: boolean): Promise<OpdClaimPublic> {
    const documents = await this.signDocuments(row.documents, includeUrl);
    return {
      id: row.id,
      claimNumber: row.claimNumber,
      employeeId: row.employeeId,
      employee: {
        id: row.employee.id,
        fullName: row.employee.fullName,
        eid: row.employee.eid,
        departmentName: row.employee.department?.name ?? null,
      },
      status: row.status as OpdClaimPublic['status'],
      category: row.category as OpdClaimPublic['category'],
      medicineCostPkr: this.decimalToNumber(row.medicineCostPkr),
      claimedAmountPkr: this.decimalToNumber(row.claimedAmountPkr),
      visitDate: row.visitDate ? row.visitDate.toISOString() : null,
      notes: row.notes,
      documentCount: row.documents.length,
      documents,
      submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
      approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
      approvalNote: row.approvalNote,
      rejectedAt: row.rejectedAt ? row.rejectedAt.toISOString() : null,
      rejectionReasonCode: row.rejectionReasonCode,
      rejectionComment: row.rejectionComment,
      rejectionReason: row.rejectionReason,
      returnedAt: row.returnedAt ? row.returnedAt.toISOString() : null,
      returnReasonCode: row.returnReasonCode,
      returnComment: row.returnComment,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /* ---------- Reads ---------- */

  async list(viewer: AuthenticatedUser, query: OpdClaimListQuery): Promise<OpdClaimListResponse> {
    const where: Prisma.OpdClaimWhereInput = {};
    if (this.canViewAll(viewer)) {
      if (query.employeeId) where.employeeId = query.employeeId;
    } else if (viewer.permissions.includes('opd:view_own') && viewer.employeeId) {
      where.employeeId = viewer.employeeId;
      if (!query.status) {
        where.status = { notIn: ['draft', 'cancelled'] };
      }
    } else {
      throw new ForbiddenException('You do not have access to medical claims.');
    }
    if (query.status) where.status = query.status;

    const sortDir = query.sortDir ?? 'desc';
    const orderBy =
      query.sortBy === 'billAmount' ? { medicineCostPkr: sortDir } : { createdAt: sortDir };

    const [total, rows] = await Promise.all([
      prisma.opdClaim.count({ where }),
      prisma.opdClaim.findMany({
        where,
        include: INCLUDE,
        orderBy,
        skip: query.offset,
        take: query.limit,
      }),
    ]);

    const items = await Promise.all(rows.map((row) => this.toPublic(row, false)));
    return { items, total, hasMore: query.offset + rows.length < total };
  }

  async findOne(viewer: AuthenticatedUser, id: string): Promise<OpdClaimDetail> {
    const row = await prisma.opdClaim.findUnique({ where: { id }, include: INCLUDE });
    if (!row) throw new NotFoundException('Claim not found.');
    this.assertReadable(viewer, row);
    const base = await this.toPublic(row, true);
    const history = await this.loadHistory(id, row.employeeId);
    return { ...base, history };
  }

  /* ---------- Writes ---------- */

  async create(viewer: AuthenticatedUser, input: OpdClaimCreateInput): Promise<OpdClaimPublic> {
    if (!this.canSubmitOwn(viewer))
      throw new ForbiddenException('You cannot create or edit medical claims.');
    const employeeId = this.requireEmployeeId(viewer);

    const claimNumber = await allocateOpdClaimNumber();
    const row = await prisma.opdClaim.create({
      data: {
        employeeId,
        claimNumber,
        status: 'draft',
        category: input.category,
        medicineCostPkr: new Prisma.Decimal(input.medicineCostPkr),
        claimedAmountPkr: new Prisma.Decimal(input.claimedAmountPkr),
        visitDate: input.visitDate ? new Date(input.visitDate) : null,
        notes: input.notes,
      },
      include: INCLUDE,
    });

    this.events.emit('opd.claim.created', { claimId: row.id, employeeId }, { actorId: viewer.id });
    return this.toPublic(row, false);
  }

  async update(
    viewer: AuthenticatedUser,
    id: string,
    input: OpdClaimUpdateInput,
  ): Promise<OpdClaimPublic> {
    const existing = await prisma.opdClaim.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Claim not found.');
    this.assertOwnEditable(viewer, existing);

    const nextMedicine = input.medicineCostPkr ?? this.decimalToNumber(existing.medicineCostPkr);
    const nextClaimed =
      input.claimedAmountPkr ??
      (input.medicineCostPkr != null
        ? input.medicineCostPkr
        : this.decimalToNumber(existing.claimedAmountPkr));
    if (nextClaimed > nextMedicine) {
      throw new BadRequestException('The amount cannot be more than the bill total.');
    }

    const row = await prisma.opdClaim.update({
      where: { id },
      data: {
        ...(input.medicineCostPkr != null
          ? {
              medicineCostPkr: new Prisma.Decimal(input.medicineCostPkr),
              claimedAmountPkr: new Prisma.Decimal(input.medicineCostPkr),
            }
          : {}),
        ...(input.claimedAmountPkr != null
          ? { claimedAmountPkr: new Prisma.Decimal(input.claimedAmountPkr) }
          : {}),
        ...(input.visitDate !== undefined
          ? { visitDate: input.visitDate ? new Date(input.visitDate) : null }
          : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      include: INCLUDE,
    });
    return this.toPublic(row, true);
  }

  async addDocument(
    viewer: AuthenticatedUser,
    id: string,
    input: { storageKey: string; fileName: string },
  ): Promise<OpdClaimPublic> {
    const existing = await prisma.opdClaim.findUnique({
      where: { id },
      include: { documents: true },
    });
    if (!existing) throw new NotFoundException('Claim not found.');
    this.assertOwnEditable(viewer, existing);

    if (existing.documents.length >= OPD_CLAIM_MAX_DOCUMENTS) {
      throw new BadRequestException(
        `You can add at most ${OPD_CLAIM_MAX_DOCUMENTS} files per claim.`,
      );
    }

    const sortOrder = existing.documents.length;
    await prisma.opdClaimDocument.create({
      data: {
        claimId: id,
        storageKey: input.storageKey,
        fileName: input.fileName,
        sortOrder,
      },
    });

    const row = await prisma.opdClaim.findUniqueOrThrow({ where: { id }, include: INCLUDE });
    return this.toPublic(row, true);
  }

  async removeDocument(
    viewer: AuthenticatedUser,
    claimId: string,
    documentId: string,
  ): Promise<OpdClaimPublic> {
    const existing = await prisma.opdClaim.findUnique({ where: { id: claimId } });
    if (!existing) throw new NotFoundException('Claim not found.');
    this.assertOwnEditable(viewer, existing);

    const doc = await prisma.opdClaimDocument.findFirst({
      where: { id: documentId, claimId },
    });
    if (!doc) throw new NotFoundException('File not found.');

    await prisma.opdClaimDocument.delete({ where: { id: documentId } });
    await this.storage
      .deleteObject({ bucket: 'documents', key: doc.storageKey })
      .catch(() => undefined);

    const row = await prisma.opdClaim.findUniqueOrThrow({
      where: { id: claimId },
      include: INCLUDE,
    });
    return this.toPublic(row, true);
  }

  /** @deprecated Use POST /documents — kept for older clients/tests. */
  async recordPrescription(
    viewer: AuthenticatedUser,
    id: string,
    input: { storageKey: string; fileName: string },
  ): Promise<OpdClaimPublic> {
    return this.addDocument(viewer, id, input);
  }

  async submit(viewer: AuthenticatedUser, id: string): Promise<OpdClaimPublic> {
    if (!this.canSubmitOwn(viewer))
      throw new ForbiddenException('You cannot create or edit medical claims.');
    const existing = await prisma.opdClaim.findUnique({ where: { id }, include: INCLUDE });
    if (!existing) throw new NotFoundException('Claim not found.');
    if (viewer.employeeId !== existing.employeeId) {
      throw new ForbiddenException('You can only submit your own claims.');
    }
    if (!OpdClaimsService.editableStatuses.has(existing.status)) {
      throw new BadRequestException('This claim cannot be submitted.');
    }
    if (!existing.category) {
      throw new BadRequestException('Select a claim category before you submit.');
    }
    if (!existing.visitDate) {
      throw new BadRequestException('Add the date of visit before you submit.');
    }
    if (!existing.notes?.trim()) {
      throw new BadRequestException('Add a short description before you submit.');
    }
    if (existing.documents.length === 0) {
      throw new BadRequestException(
        'Add at least one document (prescription and itemised bill) before you submit.',
      );
    }

    await prisma.opdClaim.update({
      where: { id },
      data: {
        status: 'pending_approval',
        submittedAt: new Date(),
        returnReasonCode: null,
        returnComment: null,
        returnedAt: null,
      },
    });

    try {
      await this.approvals.submit({
        type: 'opd-claim',
        sourceId: id,
        submittedById: viewer.id,
      });
    } catch (err) {
      const rollbackStatus = existing.status === 'returned' ? 'returned' : 'draft';
      await prisma.opdClaim.update({
        where: { id },
        data: {
          status: rollbackStatus,
          submittedAt: rollbackStatus === 'draft' ? null : existing.submittedAt,
        },
      });
      throw err;
    }

    this.events.emit(
      'opd.claim.submitted',
      {
        claimId: id,
        claimNumber: existing.claimNumber,
        employeeId: existing.employeeId,
        claimedAmountPkr: this.decimalToNumber(existing.claimedAmountPkr),
      },
      { actorId: viewer.id },
    );

    const fresh = await prisma.opdClaim.findUniqueOrThrow({ where: { id }, include: INCLUDE });
    return this.toPublic(fresh, true);
  }

  async returnForCorrection(
    viewer: AuthenticatedUser,
    id: string,
    input: OpdClaimReturnInput,
  ): Promise<OpdClaimPublic> {
    if (!viewer.permissions.includes('opd:approve_claim')) {
      throw new ForbiddenException('You cannot return claims for correction.');
    }
    const existing = await prisma.opdClaim.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Claim not found.');
    if (existing.status !== 'pending_approval') {
      throw new BadRequestException('Only pending claims can be returned for correction.');
    }

    const approval = await this.approvals.findActiveBySource('opd-claim', id);
    if (!approval) {
      throw new BadRequestException('No active approval found for this claim.');
    }

    const feedback = formatOpdFinanceFeedback(input.reasonCode, input.comment ?? null);

    await prisma.$transaction([
      prisma.opdClaim.update({
        where: { id },
        data: {
          status: 'returned',
          returnedAt: new Date(),
          returnReasonCode: input.reasonCode,
          returnComment: input.comment?.trim() || null,
        },
      }),
      prisma.approval.update({
        where: { id: approval.id },
        data: {
          status: 'cancelled',
          resolvedAt: new Date(),
          resolvedById: viewer.id,
          resolveReason: feedback,
        },
      }),
    ]);

    this.events.emit(
      'opd.claim.returned',
      {
        claimId: id,
        claimNumber: existing.claimNumber,
        employeeId: existing.employeeId,
        reasonCode: input.reasonCode,
        comment: input.comment ?? null,
      },
      { actorId: viewer.id },
    );

    const fresh = await prisma.opdClaim.findUniqueOrThrow({ where: { id }, include: INCLUDE });
    return this.toPublic(fresh, true);
  }
}
