/**
 * opd-claim ApprovalType — Finance-only, hard separation of duties.
 *
 * Single stage (`opd:approve_claim`). Submitter cannot approve their
 * own claim. No typed confirmation phrase in v1 — Finance reviews the
 * prescription on the claim detail page (complex inbox row).
 */
import type { Logger } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { formatOpdFinanceFeedback } from '@futurenostics/types';
import type { ApprovalDecision, OpdClaim } from '@prisma/client';
import { EventBusService } from '../../core/events/event-bus.service';
import type { ApprovalMetadata, ApprovalTypeDefinition } from '../approvals/approval-type.registry';

type OpdClaimSource = OpdClaim & {
  employee: { fullName: string; eid: string; designation: { name: string } | null };
};

function formatPkr(n: number): string {
  return `₨${n.toLocaleString('en-PK')}`;
}

function hashHue(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 360;
}

export function buildOpdClaimApprovalType(
  events: EventBusService,
  logger: Logger,
): ApprovalTypeDefinition {
  return {
    kind: 'opd-claim',
    label: 'Medical claim',
    iconKey: 'HeartPulse',
    module: 'opd',
    decisionPolicy: 'single',
    requiredPermission: 'opd:approve_claim',
    softSoD: false,

    async loadSource(sourceId): Promise<OpdClaimSource | null> {
      return prisma.opdClaim.findUnique({
        where: { id: sourceId },
        include: {
          employee: {
            select: { fullName: true, eid: true, designation: { select: { name: true } } },
          },
        },
      });
    },

    async toMetadata({ source, submitterUserId }): Promise<ApprovalMetadata> {
      const claim = source as OpdClaimSource;
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
      const amount = Number(claim.claimedAmountPkr.toString());
      const visit = claim.visitDate ? claim.visitDate.toISOString().slice(0, 10) : 'No visit date';

      return {
        title: `${claim.claimNumber} — ${claim.employee.fullName}`,
        sub: `${formatPkr(amount)} · ${visit}`,
        meta: claim.employee.eid,
        hue: 145,
        // Prescription must be reviewed on the detail page. Inbox
        // "Approve" on simple rows currently only navigates to `link`.
        complex: true,
        severity: 'info',
        link: `/opd/claims/${claim.id}`,
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
      const claim = source as OpdClaimSource;
      const approvalNote = readDecisionNotes(decision);
      await prisma.opdClaim.update({
        where: { id: claim.id },
        data: {
          status: 'approved',
          approvedAt: approval.resolvedAt ?? new Date(),
          approvalNote,
        },
      });
      events.emit(
        'opd.claim.approved',
        {
          claimId: claim.id,
          claimNumber: claim.claimNumber,
          employeeId: claim.employeeId,
          claimedAmountPkr: Number(claim.claimedAmountPkr.toString()),
        },
        { actorId: approval.resolvedById ?? undefined },
      );
      logger.log(`opd-claim ${claim.id} approved via Approval ${approval.id}`);
    },

    async onRejected({ approval, source, reason, decision }) {
      const claim = source as OpdClaimSource;
      const structured = readStructuredReject(decision);
      const rejectionReason =
        structured.reasonCode != null
          ? formatOpdFinanceFeedback(structured.reasonCode, structured.comment)
          : reason;
      await prisma.opdClaim.update({
        where: { id: claim.id },
        data: {
          status: 'rejected',
          rejectedAt: approval.resolvedAt ?? new Date(),
          rejectionReasonCode: structured.reasonCode,
          rejectionComment: structured.comment,
          rejectionReason,
        },
      });
      events.emit(
        'opd.claim.rejected',
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
      const claim = source as OpdClaimSource;
      if (claim.status === 'pending_approval') {
        await prisma.opdClaim.update({
          where: { id: claim.id },
          data: {
            status: 'draft',
            submittedAt: null,
          },
        });
      }
      logger.log(
        `opd-claim ${claim.id} approval ${approval.id} cancelled — claim returned to draft`,
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
