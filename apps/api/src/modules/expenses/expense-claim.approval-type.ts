/**
 * expense-claim ApprovalType — Finance-only, soft separation of duties.
 *
 * Deducts the wallet in `onApproved` (awaited) because EventBus
 * handlers are fire-and-forget. Unique `BenefitLedgerEntry.claimId`
 * makes a retry a no-op.
 */
import type { Logger } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import {
  expenseCategoryLabel,
  formatBenefitPkr,
  formatExpenseFinanceFeedback,
} from '@futurenostics/types';
import type { ApprovalDecision, ExpenseClaim } from '@prisma/client';
import { EventBusService } from '../../core/events/event-bus.service';
import type { ApprovalMetadata, ApprovalTypeDefinition } from '../approvals/approval-type.registry';
import type { BenefitsService } from '../benefits/benefits.service';

type ExpenseClaimSource = ExpenseClaim & {
  employee: { fullName: string; eid: string; designation: { name: string } | null };
};

function hashHue(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 360;
}

export function buildExpenseClaimApprovalType(
  events: EventBusService,
  logger: Logger,
  benefits: BenefitsService,
): ApprovalTypeDefinition {
  return {
    kind: 'expense-claim',
    label: 'Expense claim',
    iconKey: 'Wallet',
    module: 'expenses',
    decisionPolicy: 'single',
    requiredPermission: 'expenses:approve_claim',
    softSoD: true,

    async loadSource(sourceId): Promise<ExpenseClaimSource | null> {
      return prisma.expenseClaim.findUnique({
        where: { id: sourceId },
        include: {
          employee: {
            select: { fullName: true, eid: true, designation: { select: { name: true } } },
          },
        },
      });
    },

    async toMetadata({ source, submitterUserId }): Promise<ApprovalMetadata> {
      const claim = source as ExpenseClaimSource;
      const submitter = await prisma.user.findUnique({
        where: { id: submitterUserId },
        include: {
          employee: { select: { fullName: true, designation: { select: { name: true } } } },
        },
      });
      const fullName = submitter?.employee?.fullName ?? submitter?.email ?? claim.employee.fullName;
      const role =
        submitter?.employee?.designation?.name ?? claim.employee.designation?.name ?? null;
      const initials = fullName
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('');
      const amount = Number(claim.amount.toString());
      const when = claim.expenseDate ? claim.expenseDate.toISOString().slice(0, 10) : 'No date';
      const kind = expenseCategoryLabel(claim.category);

      return {
        title: `${claim.claimNumber} — ${claim.employee.fullName}`,
        sub: `${kind} · ${formatBenefitPkr(amount)} · ${when}`,
        meta: claim.employee.eid,
        hue: 32,
        complex: true,
        severity: 'info',
        link: `/expenses/claims/${claim.id}`,
        requester: {
          userId: submitterUserId,
          name: fullName,
          role,
          hue: hashHue(submitter?.email ?? submitterUserId),
          initials: initials || fullName[0]!.toUpperCase(),
        },
      };
    },

    async onApproved({ approval, source, decision }) {
      const claim = source as ExpenseClaimSource;
      const approvalNote = readDecisionNotes(decision);
      await prisma.expenseClaim.update({
        where: { id: claim.id },
        data: {
          status: 'approved',
          approvedAt: approval.resolvedAt ?? new Date(),
          approvedById: approval.resolvedById,
          approvalNote,
        },
      });
      const details = claim.details as { subCategory?: string } | null;
      await benefits.applyApprovedClaim({
        claimId: claim.id,
        employeeId: claim.employeeId,
        category: claim.category,
        amountPkr: Number(claim.amount.toString()),
        expenseDate: claim.expenseDate,
        isOptical: claim.category === 'medical' && details?.subCategory === 'optical',
      });
      events.emit(
        'expenses.claim.approved',
        {
          claimId: claim.id,
          claimNumber: claim.claimNumber,
          employeeId: claim.employeeId,
          amountPkr: Number(claim.amount.toString()),
          category: claim.category,
        },
        { actorId: approval.resolvedById ?? undefined },
      );
      logger.log(`expense-claim ${claim.id} approved via Approval ${approval.id}`);
    },

    async onRejected({ approval, source, reason, decision }) {
      const claim = source as ExpenseClaimSource;
      const structured = readStructuredReject(decision);
      const rejectionReason =
        structured.reasonCode != null
          ? formatExpenseFinanceFeedback(structured.reasonCode, structured.comment)
          : reason;
      await prisma.expenseClaim.update({
        where: { id: claim.id },
        data: {
          status: 'rejected',
          rejectedAt: approval.resolvedAt ?? new Date(),
          rejectedById: approval.resolvedById,
          rejectionReasonCode: structured.reasonCode,
          rejectionComment: structured.comment,
          rejectionReason,
        },
      });
      events.emit(
        'expenses.claim.rejected',
        {
          claimId: claim.id,
          claimNumber: claim.claimNumber,
          employeeId: claim.employeeId,
          reason: rejectionReason,
          reasonCode: structured.reasonCode,
        },
        { actorId: approval.resolvedById ?? undefined },
      );
    },

    async onCancelled({ approval, source }) {
      const claim = source as ExpenseClaimSource;
      // V1: employees cannot cancel a claim. Admin/system may cancel the
      // Approval only. The claim stays the same row/number and goes back
      // to draft so it can be submitted again.
      if (claim.status === 'pending_approval') {
        await prisma.expenseClaim.update({
          where: { id: claim.id },
          data: {
            status: 'draft',
            submittedAt: null,
            submittedById: null,
          },
        });
      }
      logger.log(
        `expense-claim ${claim.id} approval ${approval.id} cancelled — claim left as ${claim.status === 'pending_approval' ? 'draft' : claim.status}`,
      );
    },
  };
}

function readStructuredReject(decision: ApprovalDecision | undefined): {
  reasonCode: string | null;
  comment: string | null;
} {
  if (!decision?.confirmationData || typeof decision.confirmationData !== 'object') {
    return { reasonCode: null, comment: null };
  }
  const data = decision.confirmationData as { reasonCode?: unknown; comment?: unknown };
  const reasonCode = typeof data.reasonCode === 'string' ? data.reasonCode : null;
  const comment =
    typeof data.comment === 'string' && data.comment.trim().length > 0 ? data.comment.trim() : null;
  return { reasonCode, comment };
}

function readDecisionNotes(decision: ApprovalDecision | undefined): string | null {
  if (!decision?.confirmationData || typeof decision.confirmationData !== 'object') {
    return null;
  }
  const notes = (decision.confirmationData as { notes?: unknown }).notes;
  if (typeof notes !== 'string') return null;
  const trimmed = notes.trim();
  return trimmed.length > 0 ? trimmed : null;
}
