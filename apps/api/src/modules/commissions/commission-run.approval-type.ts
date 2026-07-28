/**
 * commission-run ApprovalType registration.
 *
 * Migrates the Phase 2 bespoke approval flow onto the generic
 * Approvals module while keeping every Phase-2 invariant intact:
 *
 *   - Soft SoD: submitter MAY approve their own run (the
 *     approverIsSubmitter flag still lands on the CommissionRun row
 *     and on the ApprovalDecision's confirmationData).
 *   - Typed phrase: validateConfirmation enforces
 *     `APPROVE <MONTH YEAR>` against the run's monthKey, exactly
 *     as before (PNG 10 contract).
 *   - Denormalised columns: onApproved / onRejected dual-write the
 *     CommissionRun.approved* / .rejected* / .submittedBy* fields so
 *     existing readers + the export endpoint + the run detail page
 *     keep working.
 *   - commission.run.approved event: still emitted with the
 *     recipients[] array (employee id + totalUsd). The timeline
 *     subscriber listens to this — DO NOT change the payload shape.
 *
 * Registration happens on commissions.module.ts onModuleInit.
 */
import type { Logger } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import type { CommissionRun } from '@prisma/client';
import { EventBusService } from '../../core/events/event-bus.service';
import type { ApprovalMetadata, ApprovalTypeDefinition } from '../approvals/approval-type.registry';
import { monthLabel, roundUsd } from './commission-calc';

export interface CommissionRunSourceData extends CommissionRun {
  /** Eager-loaded summary fields the inbox renderer + side effects use. */
  _totalDisbursementUsd: number;
  _recipientCount: number;
  _projectCount: number;
  _recipients: Array<{ employeeId: string; totalUsd: number }>;
}

export function buildCommissionRunApprovalType(
  events: EventBusService,
  logger: Logger,
): ApprovalTypeDefinition {
  return {
    kind: 'commission-run',
    label: 'Commission run',
    iconKey: 'Calculator',
    module: 'commissions',
    decisionPolicy: 'single',
    requiredPermission: 'commissions:approve_run',
    // Two-level sign-off: a finance reviewer approves first, then a
    // second-level (director) approver gives final sign-off. The typed
    // phrase (PNG 10) is enforced on the final stage only.
    stages: [
      { requiredPermission: 'commissions:approve_run', label: 'Finance review' },
      { requiredPermission: 'commissions:final_approve_run', label: 'Final sign-off' },
    ],
    // Phase 2 decision: approver may be the submitter. We surface the
    // flag downstream rather than blocking. See DECISIONS.md L401-412.
    softSoD: true,

    async loadSource(sourceId): Promise<CommissionRunSourceData | null> {
      const run = await prisma.commissionRun.findUnique({
        where: { id: sourceId },
        include: {
          lineItems: { select: { employeeId: true, projectId: true, finalAmountUsd: true } },
        },
      });
      if (!run) return null;
      const byEmployee = new Map<string, number>();
      for (const li of run.lineItems) {
        byEmployee.set(
          li.employeeId,
          (byEmployee.get(li.employeeId) ?? 0) + Number(li.finalAmountUsd),
        );
      }
      const projects = new Set(run.lineItems.map((li) => li.projectId));
      const total = Array.from(byEmployee.values()).reduce((s, v) => s + v, 0);
      return {
        ...run,
        _totalDisbursementUsd: roundUsd(total),
        _recipientCount: byEmployee.size,
        _projectCount: projects.size,
        _recipients: Array.from(byEmployee.entries()).map(([employeeId, totalUsd]) => ({
          employeeId,
          totalUsd: roundUsd(totalUsd),
        })),
      };
    },

    async toMetadata({ source, submitterUserId }): Promise<ApprovalMetadata> {
      const run = source as CommissionRunSourceData;
      const label = monthLabel(run.monthKey);
      const submitter = await prisma.user.findUnique({
        where: { id: submitterUserId },
        include: {
          employee: { select: { fullName: true, designation: { select: { name: true } } } },
        },
      });
      const fullName = submitter?.employee?.fullName ?? submitter?.email ?? 'Unknown';
      const role = submitter?.employee?.designation?.name ?? null;
      const initials = fullName
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('');
      const requesterHue = hashHue(submitter?.email ?? submitterUserId);

      const totalLabel = `$${run._totalDisbursementUsd.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
      return {
        title: `${label} commission run`,
        sub: `${run._recipientCount} recipient${run._recipientCount === 1 ? '' : 's'} · Total ${totalLabel}`,
        meta: `${run._projectCount} project${run._projectCount === 1 ? '' : 's'} · FX ${Number(run.fxRateUsdToPkr).toString()} USD→PKR`,
        hue: 280, // Commission lavender — matches design KIND_META
        complex: true, // Commission runs warrant individual review (PNG 11)
        severity: 'info',
        link: `/monthly-processing/${run.id}?action=approve`,
        requester: {
          userId: submitterUserId,
          name: fullName,
          role,
          hue: requesterHue,
          initials: initials || fullName[0]!.toUpperCase(),
        },
      };
    },

    confirmationPhraseFor(source): string {
      const run = source as CommissionRunSourceData;
      return `APPROVE ${monthLabel(run.monthKey).toUpperCase()}`;
    },

    validateConfirmation({ source, confirmationData }) {
      const run = source as CommissionRunSourceData;
      const expected = `APPROVE ${monthLabel(run.monthKey).toUpperCase()}`;
      const data = (confirmationData ?? {}) as { confirmationPhrase?: string };
      const phrase = (data.confirmationPhrase ?? '').trim();
      if (phrase !== expected) {
        throw new BadRequestException(`Confirmation phrase mismatch. Expected '${expected}'.`);
      }
    },

    /* ---------- Side effects: keep CommissionRun denormalised columns
     * in sync + emit the domain event the timeline subscriber listens
     * to. ---------- */
    async onApproved({ approval, source, decision }) {
      const run = source as CommissionRunSourceData;
      const confirmation = (decision?.confirmationData ?? {}) as {
        confirmationPhrase?: string;
        notes?: string | null;
        approverIsSubmitter?: boolean;
      };
      const approverIsSubmitter =
        confirmation.approverIsSubmitter ?? approval.submittedById === approval.resolvedById;

      await prisma.commissionRun.update({
        where: { id: run.id },
        data: {
          status: 'approved',
          approvedAt: approval.resolvedAt ?? new Date(),
          approvedById: approval.resolvedById,
          approverIsSubmitter,
          approvalConfirmationPhrase: confirmation.confirmationPhrase?.trim() ?? null,
          notes: confirmation.notes ?? run.notes,
        },
      });

      events.emit(
        'commission.run.approved',
        {
          runId: run.id,
          monthKey: run.monthKey,
          monthLabel: monthLabel(run.monthKey),
          approverIsSubmitter,
          recipients: run._recipients,
        },
        { actorId: approval.resolvedById ?? undefined },
      );
      logger.log(
        `commission-run ${run.id} approved via Approval ${approval.id} (recipients=${run._recipients.length})`,
      );
    },

    async onRejected({ approval, source, reason }) {
      const run = source as CommissionRunSourceData;
      await prisma.commissionRun.update({
        where: { id: run.id },
        data: {
          status: 'rejected',
          rejectedAt: approval.resolvedAt ?? new Date(),
          rejectedById: approval.resolvedById,
          rejectReason: reason,
        },
      });
      events.emit(
        'commission.run.rejected',
        { runId: run.id, monthKey: run.monthKey, reason },
        { actorId: approval.resolvedById ?? undefined },
      );
    },

    async onCancelled({ approval, source }) {
      // Cancelling the approval doesn't auto-rewind the run — the run
      // stays in whatever state it was in before submit. We just log
      // for the audit trail.
      logger.log(
        `commission-run ${(source as CommissionRunSourceData).id} approval ${approval.id} cancelled`,
      );
    },
  };
}

/**
 * Stable OKLCH hue from an arbitrary string — used for the requester
 * avatar tint in the inbox metadata.
 */
function hashHue(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 360;
}
