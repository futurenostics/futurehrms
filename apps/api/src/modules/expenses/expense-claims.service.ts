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
  CLAIM_LIST_BUCKET_STATUSES,
  EXPENSE_CLAIM_MAX_DOCUMENTS,
  expenseCategoryLabel,
  formatExpenseFinanceFeedback,
  parseExpenseDetails,
  type ExpenseClaimCategory,
  type ExpenseClaimCreateInput,
  type ExpenseClaimDetail,
  type ExpenseClaimDocumentPublic,
  type ExpenseClaimListQuery,
  type ExpenseClaimListResponse,
  type ExpenseClaimPublic,
  type ExpenseClaimReturnInput,
  type ExpenseClaimUpdateInput,
  type ExpenseCurrencyCode,
} from '@futurenostics/types';
import { allocateExpenseClaimNumber } from './expense-allocate-claim-number';
import type { AuthenticatedUser } from '../../core/auth/types';
import { EventBusService } from '../../core/events/event-bus.service';
import { StorageService } from '../../core/storage/storage.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { BenefitsService } from '../benefits/benefits.service';

const DOCUMENT_URL_TTL = 15 * 60;
const APPROVAL_KIND = 'expense-claim';

function listStatusFilter(
  query: Pick<ExpenseClaimListQuery, 'status' | 'bucket'>,
): Prisma.ExpenseClaimWhereInput['status'] {
  const bucketStatuses = query.bucket ? [...CLAIM_LIST_BUCKET_STATUSES[query.bucket]] : null;
  if (query.status) {
    if (bucketStatuses && !bucketStatuses.some((s) => s === query.status)) {
      return { in: [] };
    }
    return query.status;
  }
  if (bucketStatuses) return { in: bucketStatuses };
  return { notIn: ['draft'] };
}

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
  submittedBy: { include: { employee: { select: { fullName: true } } } },
  approvedBy: { include: { employee: { select: { fullName: true } } } },
  rejectedBy: { include: { employee: { select: { fullName: true } } } },
  returnedBy: { include: { employee: { select: { fullName: true } } } },
} satisfies Prisma.ExpenseClaimInclude;

type ExpenseClaimRow = Prisma.ExpenseClaimGetPayload<{ include: typeof INCLUDE }>;
type UserActor = ExpenseClaimRow['submittedBy'];

@Injectable()
export class ExpenseClaimsService {
  private readonly logger = new Logger(ExpenseClaimsService.name);

  constructor(
    private readonly events: EventBusService,
    private readonly storage: StorageService,
    private readonly approvals: ApprovalsService,
    private readonly benefits: BenefitsService,
  ) {}

  private canViewOrgClaims(viewer: AuthenticatedUser): boolean {
    return (
      viewer.permissions.includes('expenses:view_all') ||
      viewer.permissions.includes('expenses:approve_claim')
    );
  }

  private canSubmitOwn(viewer: AuthenticatedUser): boolean {
    return viewer.permissions.includes('expenses:submit_own');
  }

  private requireEmployeeId(viewer: AuthenticatedUser): string {
    if (!viewer.employeeId) {
      throw new BadRequestException('Your account is not linked to an employee profile.');
    }
    return viewer.employeeId;
  }

  private assertReadable(viewer: AuthenticatedUser, claim: { employeeId: string }): void {
    if (this.canViewOrgClaims(viewer)) return;
    if (
      viewer.permissions.includes('expenses:view_own') &&
      viewer.employeeId === claim.employeeId
    ) {
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
      throw new ForbiddenException('You cannot create or edit expense claims.');
    }
    if (viewer.employeeId !== claim.employeeId) {
      throw new ForbiddenException('You can only edit your own claims.');
    }
    if (!ExpenseClaimsService.editableStatuses.has(claim.status)) {
      throw new BadRequestException('This claim cannot be edited.');
    }
  }

  private decimalToNumber(value: { toString: () => string } | number): number {
    if (typeof value === 'number') return value;
    return Number(value.toString());
  }

  private actorPublic(user: UserActor): ExpenseClaimPublic['submittedBy'] {
    if (!user) return null;
    return { id: user.id, name: user.employee?.fullName ?? user.email };
  }

  private async signDocuments(
    docs: ExpenseClaimRow['documents'],
    includeUrl: boolean,
  ): Promise<ExpenseClaimDocumentPublic[]> {
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

  private async toPublic(row: ExpenseClaimRow, includeUrl: boolean): Promise<ExpenseClaimPublic> {
    const documents = await this.signDocuments(row.documents, includeUrl);
    const category = row.category as ExpenseClaimCategory;
    let details: unknown = row.details;
    try {
      details = parseExpenseDetails(category, row.details);
    } catch {
      details = row.details;
    }
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
      status: row.status === 'cancelled' ? 'draft' : (row.status as ExpenseClaimPublic['status']),
      category,
      amountPkr: this.decimalToNumber(row.amount),
      currency: row.currency as ExpenseCurrencyCode,
      expenseDate: row.expenseDate ? row.expenseDate.toISOString() : null,
      notes: row.notes,
      details,
      documentCount: row.documents.length,
      documents,
      submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
      submittedBy: this.actorPublic(row.submittedBy),
      approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
      approvedBy: this.actorPublic(row.approvedBy),
      approvalNote: row.approvalNote,
      rejectedAt: row.rejectedAt ? row.rejectedAt.toISOString() : null,
      rejectedBy: this.actorPublic(row.rejectedBy),
      rejectionReasonCode: row.rejectionReasonCode,
      rejectionComment: row.rejectionComment,
      rejectionReason: row.rejectionReason,
      returnedAt: row.returnedAt ? row.returnedAt.toISOString() : null,
      returnedBy: this.actorPublic(row.returnedBy),
      returnReasonCode: row.returnReasonCode,
      returnComment: row.returnComment,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async list(
    viewer: AuthenticatedUser,
    query: ExpenseClaimListQuery,
  ): Promise<ExpenseClaimListResponse> {
    const where: Prisma.ExpenseClaimWhereInput = {};
    const orgScope = query.scope === 'org';
    if (orgScope) {
      if (!this.canViewOrgClaims(viewer)) {
        throw new ForbiddenException('You do not have access to all expense claims.');
      }
      if (query.employeeId) where.employeeId = query.employeeId;
    } else if (viewer.permissions.includes('expenses:view_own') && viewer.employeeId) {
      where.employeeId = viewer.employeeId;
    } else {
      throw new ForbiddenException('You do not have access to expense claims.');
    }
    where.status = listStatusFilter(query);
    if (query.category) where.category = query.category;

    const sortDir = query.sortDir ?? 'desc';
    const orderBy = query.sortBy === 'amount' ? { amount: sortDir } : { createdAt: sortDir };

    const [total, rows] = await Promise.all([
      prisma.expenseClaim.count({ where }),
      prisma.expenseClaim.findMany({
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

  async findOne(viewer: AuthenticatedUser, id: string): Promise<ExpenseClaimDetail> {
    const row = await prisma.expenseClaim.findUnique({ where: { id }, include: INCLUDE });
    if (!row) throw new NotFoundException('Claim not found.');
    this.assertReadable(viewer, row);
    const base = await this.toPublic(row, true);
    const financeReview =
      row.status === 'pending_approval' && viewer.permissions.includes('expenses:approve_claim');
    let benefitWarnings: string[] | undefined;
    let benefitSnapshot: Awaited<ReturnType<BenefitsService['getMyBalances']>> | undefined;
    if (financeReview && row.expenseDate) {
      if (row.category === 'medical' || row.category === 'gym') {
        benefitSnapshot = await this.benefits.getMyBalances(row.employeeId, row.expenseDate);
      }
      if (row.category === 'medical') {
        benefitWarnings = await this.benefits.warningsForClaim({
          employeeId: row.employeeId,
          category: 'medical',
          amountPkr: this.decimalToNumber(row.amount),
          expenseDate: row.expenseDate,
        });
      }
    }
    return {
      ...base,
      ...(benefitWarnings?.length ? { benefitWarnings } : {}),
      ...(benefitSnapshot ? { benefitSnapshot } : {}),
    };
  }

  async create(
    viewer: AuthenticatedUser,
    input: ExpenseClaimCreateInput,
  ): Promise<ExpenseClaimPublic> {
    if (!this.canSubmitOwn(viewer)) {
      throw new ForbiddenException('You cannot create or edit expense claims.');
    }
    const employeeId = this.requireEmployeeId(viewer);
    const details = parseExpenseDetails(input.category, input.details);
    if (input.category === 'gym') {
      await this.benefits.assertGymAmountAllowed(input.amountPkr);
    }
    const claimNumber = await allocateExpenseClaimNumber();
    const row = await prisma.expenseClaim.create({
      data: {
        employeeId,
        claimNumber,
        status: 'draft',
        category: input.category,
        amount: new Prisma.Decimal(input.amountPkr),
        currency: input.currency,
        expenseDate: input.expenseDate ? new Date(input.expenseDate) : null,
        notes: input.notes,
        details: details as Prisma.InputJsonValue,
      },
      include: INCLUDE,
    });
    this.events.emit(
      'expenses.claim.created',
      { claimId: row.id, employeeId, category: input.category },
      { actorId: viewer.id },
    );
    return this.toPublic(row, false);
  }

  async update(
    viewer: AuthenticatedUser,
    id: string,
    input: ExpenseClaimUpdateInput,
  ): Promise<ExpenseClaimPublic> {
    const existing = await prisma.expenseClaim.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Claim not found.');
    this.assertOwnEditable(viewer, existing);

    const nextCategory = (input.category ?? existing.category) as ExpenseClaimCategory;
    const nextDetailsRaw = input.details !== undefined ? input.details : existing.details;
    const details = parseExpenseDetails(nextCategory, nextDetailsRaw);
    const nextAmount = input.amountPkr ?? this.decimalToNumber(existing.amount);
    if (nextCategory === 'gym') {
      await this.benefits.assertGymAmountAllowed(nextAmount);
    }
    const row = await prisma.expenseClaim.update({
      where: { id },
      data: {
        category: nextCategory,
        details: details as Prisma.InputJsonValue,
        ...(input.amountPkr != null ? { amount: new Prisma.Decimal(input.amountPkr) } : {}),
        ...(input.currency != null ? { currency: input.currency } : {}),
        ...(input.expenseDate !== undefined
          ? { expenseDate: input.expenseDate ? new Date(input.expenseDate) : null }
          : {}),
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
  ): Promise<ExpenseClaimPublic> {
    const existing = await prisma.expenseClaim.findUnique({
      where: { id },
      include: { documents: true },
    });
    if (!existing) throw new NotFoundException('Claim not found.');
    this.assertOwnEditable(viewer, existing);
    if (existing.documents.length >= EXPENSE_CLAIM_MAX_DOCUMENTS) {
      throw new BadRequestException(
        `You can add at most ${EXPENSE_CLAIM_MAX_DOCUMENTS} files per claim.`,
      );
    }
    await prisma.expenseClaimDocument.create({
      data: {
        claimId: id,
        storageKey: input.storageKey,
        fileName: input.fileName,
        sortOrder: existing.documents.length,
      },
    });
    const row = await prisma.expenseClaim.findUniqueOrThrow({ where: { id }, include: INCLUDE });
    return this.toPublic(row, true);
  }

  async removeDocument(
    viewer: AuthenticatedUser,
    claimId: string,
    documentId: string,
  ): Promise<ExpenseClaimPublic> {
    const existing = await prisma.expenseClaim.findUnique({ where: { id: claimId } });
    if (!existing) throw new NotFoundException('Claim not found.');
    this.assertOwnEditable(viewer, existing);
    const doc = await prisma.expenseClaimDocument.findFirst({
      where: { id: documentId, claimId },
    });
    if (!doc) throw new NotFoundException('File not found.');
    await prisma.expenseClaimDocument.delete({ where: { id: documentId } });
    await this.storage
      .deleteObject({ bucket: 'documents', key: doc.storageKey })
      .catch(() => undefined);
    const row = await prisma.expenseClaim.findUniqueOrThrow({
      where: { id: claimId },
      include: INCLUDE,
    });
    return this.toPublic(row, true);
  }

  async submit(viewer: AuthenticatedUser, id: string): Promise<ExpenseClaimPublic> {
    if (!this.canSubmitOwn(viewer)) {
      throw new ForbiddenException('You cannot create or edit expense claims.');
    }
    const existing = await prisma.expenseClaim.findUnique({ where: { id }, include: INCLUDE });
    if (!existing) throw new NotFoundException('Claim not found.');
    if (viewer.employeeId !== existing.employeeId) {
      throw new ForbiddenException('You can only submit your own claims.');
    }
    if (!ExpenseClaimsService.editableStatuses.has(existing.status)) {
      throw new BadRequestException('This claim cannot be submitted.');
    }
    if (!existing.expenseDate) {
      throw new BadRequestException('Add the expense month before you submit.');
    }
    if (existing.documents.length === 0) {
      throw new BadRequestException('Add at least one document before you submit.');
    }
    // Same ExpenseClaim + claim number. Return-for-correction cancels the
    // previous Approval; submit opens a new pending Approval on this source.
    const category = existing.category as ExpenseClaimCategory;
    try {
      parseExpenseDetails(category, existing.details);
    } catch {
      throw new BadRequestException('Complete the required fields for this category.');
    }
    if (!existing.notes?.trim()) {
      throw new BadRequestException('Add a description before you submit.');
    }

    const amountPkr = this.decimalToNumber(existing.amount);
    if (category === 'gym') {
      await this.benefits.assertGymAmountAllowed(amountPkr);
      await this.benefits.assertGymSubmitAllowed(existing.employeeId, existing.expenseDate);
    }

    const warnings =
      category === 'medical'
        ? await this.benefits.warningsForClaim({
            employeeId: existing.employeeId,
            category,
            amountPkr,
            expenseDate: existing.expenseDate,
          })
        : [];

    await prisma.expenseClaim.update({
      where: { id },
      data: {
        status: 'pending_approval',
        submittedAt: new Date(),
        submittedById: viewer.id,
        returnReasonCode: null,
        returnComment: null,
        returnedAt: null,
        returnedById: null,
      },
    });

    try {
      await this.approvals.submit({
        type: APPROVAL_KIND,
        sourceId: id,
        submittedById: viewer.id,
      });
    } catch (err) {
      const rollbackStatus = existing.status === 'returned' ? 'returned' : 'draft';
      await prisma.expenseClaim.update({
        where: { id },
        data: {
          status: rollbackStatus,
          submittedAt: rollbackStatus === 'draft' ? null : existing.submittedAt,
          submittedById: rollbackStatus === 'draft' ? null : existing.submittedById,
          returnReasonCode: existing.returnReasonCode,
          returnComment: existing.returnComment,
          returnedAt: existing.returnedAt,
          returnedById: existing.returnedById,
        },
      });
      throw err;
    }

    this.events.emit(
      'expenses.claim.submitted',
      {
        claimId: id,
        claimNumber: existing.claimNumber,
        employeeId: existing.employeeId,
        category,
        amountPkr,
        categoryLabel: expenseCategoryLabel(category),
      },
      { actorId: viewer.id },
    );

    const fresh = await prisma.expenseClaim.findUniqueOrThrow({ where: { id }, include: INCLUDE });
    const publicClaim = await this.toPublic(fresh, true);
    return { ...publicClaim, warnings };
  }

  async returnForCorrection(
    viewer: AuthenticatedUser,
    id: string,
    input: ExpenseClaimReturnInput,
  ): Promise<ExpenseClaimPublic> {
    if (!viewer.permissions.includes('expenses:approve_claim')) {
      throw new ForbiddenException('You cannot return claims for correction.');
    }
    const existing = await prisma.expenseClaim.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Claim not found.');
    if (existing.status !== 'pending_approval') {
      throw new BadRequestException('Only pending claims can be returned for correction.');
    }
    const approval = await this.approvals.findActiveBySource(APPROVAL_KIND, id);
    if (!approval) {
      throw new BadRequestException('No active approval found for this claim.');
    }
    const feedback = formatExpenseFinanceFeedback(input.reasonCode, input.comment ?? null);
    await prisma.$transaction([
      prisma.expenseClaim.update({
        where: { id },
        data: {
          status: 'returned',
          returnedAt: new Date(),
          returnedById: viewer.id,
          returnReasonCode: input.reasonCode,
          returnComment: input.comment?.trim() || null,
        },
      }),
      prisma.approval.update({
        where: { id: approval.id },
        data: {
          // The Approval is cancelled; the ExpenseClaim stays `returned`.
          status: 'cancelled',
          resolvedAt: new Date(),
          resolvedById: viewer.id,
          resolveReason: feedback,
        },
      }),
    ]);
    this.events.emit(
      'expenses.claim.returned',
      {
        claimId: id,
        claimNumber: existing.claimNumber,
        employeeId: existing.employeeId,
        reasonCode: input.reasonCode,
        comment: input.comment ?? null,
      },
      { actorId: viewer.id },
    );
    const fresh = await prisma.expenseClaim.findUniqueOrThrow({ where: { id }, include: INCLUDE });
    return this.toPublic(fresh, true);
  }
}
