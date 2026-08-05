/**
 * Commission Run lifecycle service.
 *
 * - list / get
 * - create (manual: caller picks the monthKey + FX rate)
 * - recalculate (re-runs the calc engine on a draft, wiping line
 *   items and any manual adjustments — caller must confirm)
 * - adjustLineItem (draft only — patches leave/manual/isHeld with
 *   audit-logged delta)
 * - submitForApproval (draft → pending_approval)
 * - approve (pending_approval → approved). Soft SoD: approver may
 *   be the submitter; `approverIsSubmitter` flag captures it for
 *   the warning banner.
 * - reject (pending_approval → rejected). rejectReason required.
 * - lock (approved → locked). Phase 7+ payout step calls this.
 * - exportCsv (any state — RFC 4180 with the line-item columns
 *   PNG 09 shows)
 *
 * Scoping for reads: HR sees everything; everyone else with
 * `view_own_breakdown` sees only their own line items inside a run.
 */
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
  COMMISSION_RUN_TRANSITIONS,
  type CommissionLineItemAdjustInput,
  type CommissionLineItemManualCreateInput,
  type CommissionRunApproveInput,
  type CommissionRunCreateInput,
  type CommissionRunDetail,
  type CommissionRunAnalytics,
  type CommissionRunAnalyticsQuery,
  type CommissionRunListQuery,
  type CommissionRunListResponse,
  type CommissionRunRejectInput,
  type CommissionRunsTrend,
  type CommissionRunsTrendQuery,
  type CommissionRunStatus,
  type CommissionRunSubmitInput,
  type CommissionRunSummary,
  type CommissionTypeBreakdown,
  type EmployeeCommissionBreakdown,
  type EmployeeCommissionHistory,
  type EmployeeCommissionHistoryRow,
  type EmployeeCommissionTrend,
} from '@futurenostics/types';
import type { AuthenticatedUser } from '../../core/auth/types';
import { AuditService } from '../../core/audit/audit.service';
import { EventBusService } from '../../core/events/event-bus.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { ReportData } from '../../core/reports/report-formats';
import {
  calcProjectLineItems,
  coerceDesignationAmounts,
  coerceDurationMatrix,
  coerceRoleAmounts,
  coerceRevenueBrackets,
  computeFinal,
  monthLabel,
  roundUsd,
  type CalcPoolMode,
  type CalcProject,
} from './commission-calc';
import {
  COMMISSION_RUN_INCLUDE,
  toCommissionLineItemPublic,
  toCommissionRunDetail,
  toCommissionRunSummary,
} from './commission-runs.mapper';

/* ---------- Portal type-breakdown helpers (§8.2) ---------- */

type LineForType = {
  finalAmountUsd: number;
  roleName: string;
  project: { category: { slug: string } };
};

/**
 * Bucket a line item into one of the four portal commission types.
 * Documented rule (see commissionTypeBreakdownSchema): Upwork category →
 * upwork; team_lead role → TL reward; eligible_team role → allowance;
 * everything else → external.
 */
function commissionTypeOf(li: LineForType): keyof CommissionTypeBreakdown {
  const slug = li.project.category.slug;
  if (slug === 'upwork' || slug.startsWith('upwork-')) return 'upwork';
  if (li.roleName === 'team_lead') return 'tlReward';
  if (li.roleName === 'eligible_team') return 'allowance';
  return 'external';
}

function typeBreakdownOf(items: LineForType[]): CommissionTypeBreakdown {
  const t = { external: 0, allowance: 0, tlReward: 0, upwork: 0 };
  for (const li of items) t[commissionTypeOf(li)] += li.finalAmountUsd;
  return {
    external: roundUsd(t.external),
    allowance: roundUsd(t.allowance),
    tlReward: roundUsd(t.tlReward),
    upwork: roundUsd(t.upwork),
  };
}

/** The last `monthsBack` month keys, newest first, as 'YYYY-MM'. */
function recentMonthKeys(monthsBack: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

@Injectable()
export class CommissionRunsService {
  private readonly logger = new Logger(CommissionRunsService.name);

  constructor(
    private readonly events: EventBusService,
    private readonly audit: AuditService,
    private readonly approvals: ApprovalsService,
    private readonly notifications: NotificationsService,
  ) {}

  /* ---------- Permission helpers ---------- */

  private canViewAllRuns(viewer: AuthenticatedUser): boolean {
    return viewer.permissions.includes('commissions:view_runs');
  }

  private requireRunsView(viewer: AuthenticatedUser): void {
    if (!this.canViewAllRuns(viewer)) {
      throw new ForbiddenException('commissions:view_runs required');
    }
  }

  private require(perm: string, viewer: AuthenticatedUser): void {
    if (!viewer.permissions.includes(perm)) {
      throw new ForbiddenException(`${perm} required`);
    }
  }

  /* ---------- Status guards ---------- */

  private assertTransition(current: CommissionRunStatus, to: CommissionRunStatus): void {
    const allowed = COMMISSION_RUN_TRANSITIONS[current] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Cannot transition commission run from '${current}' to '${to}'. ` +
          `Allowed: ${allowed.join(', ') || '<terminal>'}`,
      );
    }
  }

  private assertDraft(status: string): void {
    if (status !== 'draft') {
      throw new BadRequestException(
        `Operation requires draft state — run is '${status}'. ` +
          `Reject the run back to draft to make further changes.`,
      );
    }
  }

  /* ---------- Reads ---------- */

  async list(
    viewer: AuthenticatedUser,
    query: CommissionRunListQuery,
  ): Promise<CommissionRunListResponse> {
    this.requireRunsView(viewer);
    const where: Prisma.CommissionRunWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.monthPrefix) where.monthKey = { startsWith: query.monthPrefix };

    const [rows, total] = await Promise.all([
      prisma.commissionRun.findMany({
        where,
        orderBy: { monthKey: 'desc' },
        skip: query.offset,
        take: query.limit,
        include: COMMISSION_RUN_INCLUDE,
      }),
      prisma.commissionRun.count({ where }),
    ]);

    return {
      items: rows.map(toCommissionRunSummary),
      total,
      hasMore: query.offset + rows.length < total,
    };
  }

  async findOne(viewer: AuthenticatedUser, id: string): Promise<CommissionRunDetail> {
    this.requireRunsView(viewer);
    const row = await prisma.commissionRun.findUnique({
      where: { id },
      include: COMMISSION_RUN_INCLUDE,
    });
    if (!row) throw new NotFoundException('Commission run not found');
    return toCommissionRunDetail(row);
  }

  /* ---------- Calc helpers ---------- */

  /* ---------- Writes ---------- */

  async create(
    viewer: AuthenticatedUser,
    input: CommissionRunCreateInput,
  ): Promise<CommissionRunDetail> {
    this.require('commissions:create_run', viewer);

    const existing = await prisma.commissionRun.findUnique({
      where: { monthKey: input.monthKey },
    });
    if (existing) {
      throw new BadRequestException(
        `A commission run already exists for ${input.monthKey}. ` +
          `Open run ${existing.id} or recalculate it instead of creating a new one.`,
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const run = await tx.commissionRun.create({
        data: {
          monthKey: input.monthKey,
          periodStart: input.periodStart ? new Date(input.periodStart) : null,
          periodEnd: input.periodEnd ? new Date(input.periodEnd) : null,
          fxRateUsdToPkr: new Prisma.Decimal(input.fxRateUsdToPkr),
          status: 'draft',
          createdById: viewer.id,
          notes: input.notes ?? null,
        },
      });
      await this.calculateAndPopulate(tx, run.id, input.monthKey);
      return run.id;
    });

    const fresh = await prisma.commissionRun.findUniqueOrThrow({
      where: { id: created },
      include: COMMISSION_RUN_INCLUDE,
    });

    this.events.emit(
      'commission.run.created',
      {
        runId: fresh.id,
        monthKey: fresh.monthKey,
        lineItemCount: fresh.lineItems.length,
      },
      { actorId: viewer.id },
    );

    return toCommissionRunDetail(fresh);
  }

  /**
   * Re-run the calc engine on a draft run. Wipes ALL line items
   * (including manual adjustments) and regenerates from current data.
   * Caller is responsible for warning the user before this hits.
   */
  async recalculate(viewer: AuthenticatedUser, id: string): Promise<CommissionRunDetail> {
    this.require('commissions:create_run', viewer);
    const existing = await prisma.commissionRun.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Commission run not found');
    this.assertDraft(existing.status);

    await prisma.$transaction(async (tx) => {
      await tx.commissionLineItem.deleteMany({ where: { runId: id } });
      await this.calculateAndPopulate(tx, id, existing.monthKey);
    });

    this.events.emit('commission.run.recalculated', { runId: id }, { actorId: viewer.id });

    return this.findOne(viewer, id);
  }

  /**
   * Public entry for the scheduler (which doesn't sit inside an
   * outer transaction). Wraps the internal populate in its own TX.
   */
  async populateDraft(runId: string, monthKey: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await this.calculateAndPopulate(tx, runId, monthKey);
    });
  }

  /**
   * Shared by create + recalculate. Builds line items by running the
   * calc engine on every active project + pulling carry-forward rows
   * from the previous run. Writes within the given transaction.
   */
  private async calculateAndPopulate(
    tx: Prisma.TransactionClient,
    runId: string,
    monthKey: string,
  ): Promise<void> {
    // The run's pinned FX rate converts per-project developer salaries
    // (PKR) to USD for Upwork net-share projects. The optional custom
    // period overrides the calendar-month payout window.
    const run = await tx.commissionRun.findUniqueOrThrow({
      where: { id: runId },
      select: { fxRateUsdToPkr: true, periodStart: true, periodEnd: true },
    });
    const projects = await this.fetchCalcProjectsTx(tx, monthKey, Number(run.fxRateUsdToPkr));
    const lineItemsToWrite: Prisma.CommissionLineItemCreateManyInput[] = [];

    for (const project of projects) {
      const items = calcProjectLineItems(project, {
        monthKey,
        periodStart: run.periodStart,
        periodEnd: run.periodEnd,
      });
      for (const item of items) {
        lineItemsToWrite.push({
          runId,
          projectId: item.projectId,
          employeeId: item.employeeId,
          roleName: item.roleName,
          snapshotPercentage: new Prisma.Decimal(item.snapshotPercentage),
          baseRevenueUsd: new Prisma.Decimal(item.baseRevenueUsd),
          monthFractionNumerator: item.monthFractionNumerator,
          monthFractionDenominator: item.monthFractionDenominator,
          calculatedAmountUsd: new Prisma.Decimal(item.calculatedAmountUsd),
          leaveAdjustmentUsd: new Prisma.Decimal(0),
          manualAdjustmentUsd: new Prisma.Decimal(0),
          isHeld: false,
          finalAmountUsd: new Prisma.Decimal(item.calculatedAmountUsd),
        });
      }
    }

    // Carry-forward from the previous run's held items.
    const held = await this.fetchHeldFromPreviousRunTx(tx, monthKey);
    const carriedRowIds: string[] = [];
    const currentRunId = runId;
    for (const { id: prevLineId, runId: prevRunId, lineItem } of held) {
      // Recreate the row in the current run, linked back to its origin.
      lineItemsToWrite.push({
        runId: currentRunId,
        projectId: lineItem.projectId,
        employeeId: lineItem.employeeId,
        roleName: lineItem.roleName,
        snapshotPercentage: lineItem.snapshotPercentage,
        baseRevenueUsd: lineItem.baseRevenueUsd,
        monthFractionNumerator: lineItem.monthFractionNumerator,
        monthFractionDenominator: lineItem.monthFractionDenominator,
        calculatedAmountUsd: lineItem.calculatedAmountUsd,
        leaveAdjustmentUsd: new Prisma.Decimal(0),
        manualAdjustmentUsd: new Prisma.Decimal(0),
        isHeld: false,
        carryForwardFromRunId: prevRunId,
        finalAmountUsd: lineItem.finalAmountUsd,
      });
      carriedRowIds.push(prevLineId);
    }

    // Clawbacks — reverse commissions already paid on refunded projects.
    lineItemsToWrite.push(...(await this.buildClawbackLinesTx(tx, runId)));

    if (lineItemsToWrite.length > 0) {
      await tx.commissionLineItem.createMany({
        data: lineItemsToWrite,
        skipDuplicates: true,
      });
    }

    if (carriedRowIds.length > 0) {
      await tx.commissionLineItem.updateMany({
        where: { id: { in: carriedRowIds } },
        data: { carryForwardToRunId: runId },
      });
    }
  }

  /**
   * Build reversing (negative) line items for projects that were
   * refunded after their commission was already paid.
   *
   * Marker-free + idempotent by design: the amount owed back is
   * derived fresh each run as the *net* still unreversed —
   *
   *   net = Σ finalAmountUsd over the project's committed (approved /
   *         locked) line items, per (employee, role), where committed
   *         clawback lines are themselves negative and net out.
   *
   * So a reversal appears in every draft run until one commits it,
   * then the net reaches zero and no further clawback is generated.
   * Held rows are excluded — their amount lives on the carry-forward
   * child, which is counted instead (avoids double counting). This
   * also self-heals if a draft carrying a clawback is deleted.
   */
  private async buildClawbackLinesTx(
    tx: Prisma.TransactionClient,
    runId: string,
  ): Promise<Prisma.CommissionLineItemCreateManyInput[]> {
    const refunded = await tx.project.findMany({
      where: { status: 'refunded', deletedAt: null },
      select: { id: true, revenueUsd: true },
    });
    if (refunded.length === 0) return [];

    const lines: Prisma.CommissionLineItemCreateManyInput[] = [];
    for (const project of refunded) {
      const committed = await tx.commissionLineItem.findMany({
        where: {
          projectId: project.id,
          isHeld: false,
          run: { status: { in: ['approved', 'locked'] } },
        },
        select: {
          employeeId: true,
          roleName: true,
          finalAmountUsd: true,
          snapshotPercentage: true,
        },
      });

      // Net paid, grouped by the (employee, role) we'd reverse against.
      const groups = new Map<
        string,
        { employeeId: string; roleName: string; net: number; pct: Prisma.Decimal }
      >();
      for (const li of committed) {
        const key = `${li.employeeId}::${li.roleName}`;
        const g = groups.get(key) ?? {
          employeeId: li.employeeId,
          roleName: li.roleName,
          net: 0,
          pct: li.snapshotPercentage,
        };
        g.net += Number(li.finalAmountUsd);
        groups.set(key, g);
      }

      for (const g of groups.values()) {
        const reversal = Math.round(g.net * 100) / 100;
        if (reversal <= 0.005) continue; // fully reversed or never paid
        lines.push({
          runId,
          projectId: project.id,
          employeeId: g.employeeId,
          roleName: g.roleName,
          snapshotPercentage: g.pct,
          baseRevenueUsd: project.revenueUsd,
          monthFractionNumerator: 0,
          monthFractionDenominator: 1,
          calculatedAmountUsd: new Prisma.Decimal(-reversal),
          leaveAdjustmentUsd: new Prisma.Decimal(0),
          manualAdjustmentUsd: new Prisma.Decimal(0),
          manualAdjustmentNote: 'Clawback — project refunded',
          isHeld: false,
          isClawback: true,
          finalAmountUsd: new Prisma.Decimal(-reversal),
        });
      }
    }
    return lines;
  }

  // Transaction-bound versions of the fetch helpers so calculateAndPopulate
  // reads consistent data inside the same TX.
  private async fetchCalcProjectsTx(
    tx: Prisma.TransactionClient,
    _monthKey: string,
    fxRateUsdToPkr: number,
  ): Promise<CalcProject[]> {
    const projects = await tx.project.findMany({
      where: {
        deletedAt: null,
        status: { in: ['active', 'in_billing', 'on_hold'] },
      },
      include: {
        commissionRule: true,
        assignments: {
          where: { removedAt: null },
          include: { employee: { select: { designation: { select: { name: true } } } } },
        },
      },
    });
    return projects.map((p) => ({
      id: p.id,
      revenueUsd: Number(p.revenueUsd),
      status: p.status,
      startDate: p.startDate,
      expectedCompletionDate: p.expectedCompletionDate,
      // Upwork: PKR salary → USD at the run's pinned rate.
      developerSalaryUsd:
        p.developerSalaryPkr != null ? Number(p.developerSalaryPkr) * fxRateUsdToPkr : null,
      subType: p.subType ?? null,
      rule: {
        poolMode: p.commissionRule.poolMode as CalcPoolMode,
        poolValue: Number(p.commissionRule.poolValue),
        minProjectRevenueUsd: Number(p.commissionRule.minProjectRevenueUsd),
        perPersonFloorUsd:
          p.commissionRule.perPersonFloorUsd != null
            ? Number(p.commissionRule.perPersonFloorUsd)
            : null,
        perPersonCapUsd:
          p.commissionRule.perPersonCapUsd != null
            ? Number(p.commissionRule.perPersonCapUsd)
            : null,
        revenueBrackets: coerceRevenueBrackets(p.commissionRule.revenueBrackets),
        designationAmounts: coerceDesignationAmounts(p.commissionRule.designationAmounts),
        roleAmounts: coerceRoleAmounts(p.commissionRule.roleAmounts),
        durationMatrix: coerceDurationMatrix(p.commissionRule.durationMatrix),
      },
      assignments: p.assignments.map((a) => ({
        employeeId: a.employeeId,
        roleName: a.roleName,
        percentage: Number(a.percentage),
        designation: a.employee?.designation?.name ?? null,
      })),
    }));
  }

  private async fetchHeldFromPreviousRunTx(
    tx: Prisma.TransactionClient,
    currentMonthKey: string,
  ): Promise<
    Array<{
      id: string;
      runId: string;
      lineItem: Prisma.CommissionLineItemGetPayload<Record<string, never>>;
    }>
  > {
    const previousMonth = previousMonthKey(currentMonthKey);
    const prevRun = await tx.commissionRun.findUnique({
      where: { monthKey: previousMonth },
      include: {
        lineItems: { where: { isHeld: true, carryForwardToRunId: null } },
      },
    });
    if (!prevRun) return [];
    return prevRun.lineItems.map((li) => ({
      id: li.id,
      runId: prevRun.id,
      lineItem: li,
    }));
  }

  /* ---------- Adjustments ---------- */

  async adjustLineItem(
    viewer: AuthenticatedUser,
    runId: string,
    lineItemId: string,
    input: CommissionLineItemAdjustInput,
  ): Promise<CommissionRunDetail> {
    this.require('commissions:adjust_line_item', viewer);
    const run = await prisma.commissionRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException('Commission run not found');
    this.assertDraft(run.status);

    const existing = await prisma.commissionLineItem.findUnique({ where: { id: lineItemId } });
    if (!existing || existing.runId !== runId) {
      throw new NotFoundException('Line item not found on this run');
    }

    const data: Prisma.CommissionLineItemUpdateInput = {};
    let changed = false;

    // Upwork processing: a manually entered period revenue overrides the
    // snapshot base revenue and re-derives the calculated amount
    // linearly — scaling by the revenue ratio preserves whatever
    // month-fraction + rule percentage the original calc encoded. If the
    // original base was 0 we can't derive a rate, so fall back to
    // percentage × month-fraction. Must run before the leave block so
    // the leave deduction uses the refreshed calculated amount.
    let newCalculated = Number(existing.calculatedAmountUsd);
    if (input.periodRevenueUsd != null) {
      const periodRevenue = input.periodRevenueUsd;
      const priorBase = Number(existing.baseRevenueUsd);
      const priorCalc = Number(existing.calculatedAmountUsd);
      if (priorBase > 0) {
        newCalculated = roundUsd(periodRevenue * (priorCalc / priorBase));
      } else {
        const fraction =
          existing.monthFractionDenominator > 0
            ? existing.monthFractionNumerator / existing.monthFractionDenominator
            : 1;
        newCalculated = roundUsd(
          ((periodRevenue * Number(existing.snapshotPercentage)) / 100) * fraction,
        );
      }
      data.baseRevenueUsd = new Prisma.Decimal(periodRevenue);
      data.periodRevenueUsd = new Prisma.Decimal(periodRevenue);
      data.calculatedAmountUsd = new Prisma.Decimal(newCalculated);
      changed = true;
    }
    if (input.paymentSource !== undefined) {
      data.paymentSource = input.paymentSource;
      changed = true;
    }

    // Leave-days model (External): working days + approved leaves →
    // −calculated × leaves/workingDays. Takes precedence over a raw
    // leaveAdjustmentUsd if both provided.
    let newLeave = Number(existing.leaveAdjustmentUsd);
    if (input.workingDaysInMonth != null || input.leaveDays != null) {
      const workingDays = input.workingDaysInMonth ?? existing.workingDaysInMonth ?? null;
      const leaves = input.leaveDays ?? existing.leaveDays ?? 0;
      if (workingDays && workingDays > 0) {
        const cappedLeaves = Math.min(Math.max(leaves, 0), workingDays);
        const deduction = (newCalculated * cappedLeaves) / workingDays;
        newLeave = roundUsd(-deduction);
        data.leaveAdjustmentUsd = new Prisma.Decimal(newLeave);
        data.workingDaysInMonth = workingDays;
        data.leaveDays = cappedLeaves;
        changed = true;
      }
    } else if (input.leaveAdjustmentUsd !== undefined) {
      newLeave = input.leaveAdjustmentUsd;
      data.leaveAdjustmentUsd = new Prisma.Decimal(newLeave);
      changed = true;
    } else if (
      input.periodRevenueUsd != null &&
      existing.workingDaysInMonth &&
      existing.workingDaysInMonth > 0 &&
      existing.leaveDays
    ) {
      // Revenue override changed `newCalculated` — refresh the stored
      // leave deduction against the new base so the two stay consistent.
      const deduction = (newCalculated * existing.leaveDays) / existing.workingDaysInMonth;
      newLeave = roundUsd(-deduction);
      data.leaveAdjustmentUsd = new Prisma.Decimal(newLeave);
    }

    if (input.manualAdjustmentUsd !== undefined) {
      data.manualAdjustmentUsd = new Prisma.Decimal(input.manualAdjustmentUsd);
      changed = true;
    }
    if (input.manualAdjustmentNote !== undefined) {
      data.manualAdjustmentNote = input.manualAdjustmentNote;
      changed = true;
    }
    if (input.isHeld !== undefined) {
      data.isHeld = input.isHeld;
      if (input.isHeld) {
        const reason = (input.holdReason ?? '').trim();
        if (!reason) {
          throw new BadRequestException('A hold reason is required when holding a line item.');
        }
        data.holdReason = reason;
      } else {
        data.holdReason = null;
      }
      changed = true;
    } else if (input.holdReason !== undefined) {
      data.holdReason = input.holdReason;
      changed = true;
    }
    if (!changed) return this.findOne(viewer, runId);

    // Recompute final.
    const newManual = input.manualAdjustmentUsd ?? Number(existing.manualAdjustmentUsd);
    const finalAmountUsd = computeFinal({
      calculatedAmountUsd: newCalculated,
      leaveAdjustmentUsd: newLeave,
      manualAdjustmentUsd: newManual,
    });
    data.finalAmountUsd = new Prisma.Decimal(finalAmountUsd);

    await prisma.commissionLineItem.update({ where: { id: lineItemId }, data });

    this.events.emit(
      'commission.line_item.adjusted',
      {
        runId,
        lineItemId,
        employeeId: existing.employeeId,
        projectId: existing.projectId,
        priorFinalUsd: Number(existing.finalAmountUsd),
        newFinalUsd: finalAmountUsd,
      },
      { actorId: viewer.id },
    );

    return this.findOne(viewer, runId);
  }

  /**
   * Manually add a recipient the calc engine didn't generate (draft
   * runs only). The amount goes entirely into `manualAdjustmentUsd`
   * with a required note; `calculatedAmountUsd` is 0 and the month
   * fraction reads 0/days-in-month since there's no proration math.
   *
   * A recalculate wipes manual lines along with everything else — the
   * caller is warned about that on the recalc button, same as manual
   * adjustments.
   */
  async addManualLineItem(
    viewer: AuthenticatedUser,
    runId: string,
    input: CommissionLineItemManualCreateInput,
  ): Promise<CommissionRunDetail> {
    this.require('commissions:adjust_line_item', viewer);
    const run = await prisma.commissionRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException('Commission run not found');
    this.assertDraft(run.status);

    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) throw new BadRequestException('Unknown project');
    const employee = await prisma.employee.findUnique({ where: { id: input.employeeId } });
    if (!employee) throw new BadRequestException('Unknown employee');

    const duplicate = await prisma.commissionLineItem.findUnique({
      where: {
        runId_projectId_employeeId_roleName: {
          runId,
          projectId: input.projectId,
          employeeId: input.employeeId,
          roleName: input.roleName,
        },
      },
    });
    if (duplicate) {
      throw new BadRequestException(
        `A line item already exists for this employee, project, and role on this run. ` +
          `Adjust the existing line instead of adding a duplicate.`,
      );
    }

    const amount = roundUsd(input.amountUsd);
    await prisma.commissionLineItem.create({
      data: {
        runId,
        projectId: input.projectId,
        employeeId: input.employeeId,
        roleName: input.roleName,
        snapshotPercentage: new Prisma.Decimal(0),
        baseRevenueUsd: project.revenueUsd,
        monthFractionNumerator: 0,
        monthFractionDenominator: daysInMonth(run.monthKey),
        calculatedAmountUsd: new Prisma.Decimal(0),
        leaveAdjustmentUsd: new Prisma.Decimal(0),
        manualAdjustmentUsd: new Prisma.Decimal(amount),
        manualAdjustmentNote: input.note,
        isHeld: false,
        finalAmountUsd: new Prisma.Decimal(amount),
      },
    });

    this.events.emit(
      'commission.line_item.added',
      {
        runId,
        projectId: input.projectId,
        employeeId: input.employeeId,
        roleName: input.roleName,
        amountUsd: amount,
        note: input.note,
      },
      { actorId: viewer.id },
    );

    return this.findOne(viewer, runId);
  }

  /**
   * Remove a line item from a draft run. Intended for manually-added
   * lines, but any draft line can be removed — a recalculate would
   * regenerate the calc-driven ones anyway.
   */
  async removeLineItem(
    viewer: AuthenticatedUser,
    runId: string,
    lineItemId: string,
  ): Promise<CommissionRunDetail> {
    this.require('commissions:adjust_line_item', viewer);
    const run = await prisma.commissionRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException('Commission run not found');
    this.assertDraft(run.status);

    const existing = await prisma.commissionLineItem.findUnique({ where: { id: lineItemId } });
    if (!existing || existing.runId !== runId) {
      throw new NotFoundException('Line item not found on this run');
    }

    await prisma.commissionLineItem.delete({ where: { id: lineItemId } });

    this.events.emit(
      'commission.line_item.removed',
      {
        runId,
        lineItemId,
        employeeId: existing.employeeId,
        projectId: existing.projectId,
        roleName: existing.roleName,
        finalUsd: Number(existing.finalAmountUsd),
      },
      { actorId: viewer.id },
    );

    return this.findOne(viewer, runId);
  }

  /* ---------- Lifecycle ---------- */

  /**
   * Submit for approval — migrated to the generic ApprovalsService.
   *
   * We still flip the CommissionRun's state machine (draft →
   * pending_approval) + denormalised submit fields here, because the
   * run-detail page reads them directly. Then we create the Approval
   * record so the unified inbox at /approvals picks it up.
   *
   * The bespoke endpoint stays as a thin shim for backwards-compat
   * with the existing FE submit button + the Phase 2 E2E suite.
   */
  async submitForApproval(
    viewer: AuthenticatedUser,
    id: string,
    input: CommissionRunSubmitInput,
  ): Promise<CommissionRunSummary> {
    this.require('commissions:submit_run', viewer);
    const existing = await prisma.commissionRun.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Commission run not found');
    this.assertTransition(existing.status as CommissionRunStatus, 'pending_approval');

    await prisma.commissionRun.update({
      where: { id },
      data: {
        status: 'pending_approval',
        submittedAt: new Date(),
        submittedById: viewer.id,
        notes: input.notes ?? existing.notes,
      },
    });

    // Create the generic Approval row. The unified inbox picks it
    // up; bespoke approve/reject endpoints delegate to ApprovalsService
    // via findActiveBySource → approve/reject.
    await this.approvals.submit({
      type: 'commission-run',
      sourceId: id,
      submittedById: viewer.id,
    });

    this.events.emit(
      'commission.run.submitted_for_approval',
      { runId: id, monthKey: existing.monthKey },
      { actorId: viewer.id },
    );

    return this.summary(id);
  }

  /**
   * Approve — bespoke endpoint now a thin shim. Finds the active
   * generic Approval for this run and delegates to ApprovalsService.
   * The commission-run ApprovalType's onApproved side effect
   * dual-writes the CommissionRun.approved* fields and emits the
   * commission.run.approved event with the recipients[] array the
   * timeline subscriber depends on.
   */
  async approve(
    viewer: AuthenticatedUser,
    id: string,
    input: CommissionRunApproveInput,
  ): Promise<CommissionRunSummary> {
    this.require('commissions:approve_run', viewer);
    const existing = await prisma.commissionRun.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Commission run not found');
    this.assertTransition(existing.status as CommissionRunStatus, 'approved');

    const approval = await this.approvals.findActiveBySource('commission-run', id);
    if (!approval) {
      throw new BadRequestException(
        'No active approval found for this run — submit for approval first',
      );
    }

    await this.approvals.approve(viewer, approval.id, {
      confirmationData: { confirmationPhrase: input.confirmationPhrase.trim() },
      notes: input.notes,
    });

    return this.summary(id);
  }

  /**
   * Reject — bespoke endpoint now a thin shim. Finds the active
   * Approval and delegates; the type's onRejected dual-writes the
   * CommissionRun.rejected* fields and emits commission.run.rejected.
   */
  async reject(
    viewer: AuthenticatedUser,
    id: string,
    input: CommissionRunRejectInput,
  ): Promise<CommissionRunSummary> {
    this.require('commissions:reject_run', viewer);
    const existing = await prisma.commissionRun.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Commission run not found');
    this.assertTransition(existing.status as CommissionRunStatus, 'rejected');

    const approval = await this.approvals.findActiveBySource('commission-run', id);
    if (!approval) {
      throw new BadRequestException(
        'No active approval found for this run — submit for approval first',
      );
    }
    await this.approvals.reject(viewer, approval.id, { reason: input.reason });

    return this.summary(id);
  }

  async lock(viewer: AuthenticatedUser, id: string): Promise<CommissionRunSummary> {
    this.require('commissions:lock_run', viewer);
    const existing = await prisma.commissionRun.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Commission run not found');
    this.assertTransition(existing.status as CommissionRunStatus, 'locked');

    await prisma.commissionRun.update({
      where: { id },
      data: {
        status: 'locked',
        lockedAt: new Date(),
        lockedById: viewer.id,
      },
    });

    this.events.emit(
      'commission.run.locked',
      { runId: id, monthKey: existing.monthKey },
      { actorId: viewer.id },
    );

    return this.summary(id);
  }

  /**
   * Re-open a rejected run for further edits. `rejected` → `draft`.
   * The rejectReason stays on the row so the next draft pass can
   * show "previously rejected: <reason>".
   */
  async reopenRejected(viewer: AuthenticatedUser, id: string): Promise<CommissionRunSummary> {
    this.require('commissions:create_run', viewer);
    const existing = await prisma.commissionRun.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Commission run not found');
    this.assertTransition(existing.status as CommissionRunStatus, 'draft');

    await prisma.commissionRun.update({
      where: { id },
      data: { status: 'draft' },
    });
    return this.summary(id);
  }

  /* ---------- Disbursement (Module 4) ---------- */

  /**
   * Push a locked run out to the payout portals. Stamps
   * `disbursedAt` / `disbursedById` and emits `commission.run.disbursed`.
   * Only a locked run can be disbursed; re-disbursing a run just
   * re-stamps (idempotent from the caller's perspective). Emailing is a
   * separate explicit step (`sendEmails`) so HR can review the portal
   * push before recipients are notified.
   */
  async disburse(viewer: AuthenticatedUser, id: string): Promise<CommissionRunSummary> {
    this.require('commissions:lock_run', viewer);
    const existing = await prisma.commissionRun.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Commission run not found');
    if (existing.status !== 'locked') {
      throw new BadRequestException('Only a locked run can be disbursed to portals');
    }

    await prisma.commissionRun.update({
      where: { id },
      data: { disbursedAt: new Date(), disbursedById: viewer.id },
    });

    this.events.emit(
      'commission.run.disbursed',
      { runId: id, monthKey: existing.monthKey },
      { actorId: viewer.id },
    );

    return this.summary(id);
  }

  /**
   * Email (+ in-app bell) every recipient of a locked/disbursed run
   * their net payout for the month. Mirrors the automatic
   * lock-time notification but is a manual, on-demand re-send so HR can
   * push payslip emails after reviewing the portal disbursement.
   *
   * Recipients + amounts are computed from the run's line items (net of
   * clawbacks, excluding held rows). Employees without an active linked
   * user are skipped. Returns the count actually delivered.
   */
  async sendEmails(viewer: AuthenticatedUser, id: string): Promise<{ sent: number }> {
    this.require('commissions:lock_run', viewer);
    const run = await prisma.commissionRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Commission run not found');
    if (run.status !== 'locked') {
      throw new BadRequestException('Only a locked run can have payout emails sent');
    }

    const grouped = await prisma.commissionLineItem.groupBy({
      by: ['employeeId'],
      where: { runId: id, isHeld: false },
      _sum: { finalAmountUsd: true },
    });

    const label = monthLabel(run.monthKey);
    let sent = 0;
    for (const g of grouped) {
      const total = Number(g._sum.finalAmountUsd ?? 0);
      if (total <= 0) continue;

      const user = await prisma.user.findFirst({
        where: { employeeId: g.employeeId, isActive: true },
        select: { id: true },
      });
      if (!user) continue;

      await this.notifications.send({
        recipientUserId: user.id,
        typeKey: 'commissions.run-disbursed',
        payload: {
          monthLabel: label,
          amountUsd: total.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          runId: id,
          employeeId: g.employeeId,
        },
        source: { type: 'commissionRun', id },
        actorId: viewer.id,
      });
      sent += 1;
    }

    await this.audit.record({
      module: 'commissions',
      entity: 'CommissionRun',
      entityId: id,
      action: 'commission.run.emails_sent',
      actorId: viewer.id,
      after: { sent, monthKey: run.monthKey },
    });

    return { sent };
  }

  /**
   * Build a per-employee payslip report for a run: one row per
   * recipient with their net commission in USD and the approximate PKR
   * at the run's pinned FX rate. The controller renders it as a PDF the
   * recipient / HR can download or attach to the payout email.
   */
  async buildPayslipsReport(
    viewer: AuthenticatedUser,
    id: string,
  ): Promise<{ filename: string; data: ReportData }> {
    this.require('commissions:view_runs', viewer);
    const run = await prisma.commissionRun.findUnique({
      where: { id },
      include: COMMISSION_RUN_INCLUDE,
    });
    if (!run) throw new NotFoundException('Commission run not found');

    const fx = Number(run.fxRateUsdToPkr);
    const label = monthLabel(run.monthKey);

    // Net payout per employee (held rows excluded; clawbacks net in).
    const byEmployee = new Map<
      string,
      { eid: string; name: string; dept: string | null; total: number }
    >();
    for (const li of run.lineItems) {
      if (li.isHeld) continue;
      const key = li.employeeId;
      const entry = byEmployee.get(key) ?? {
        eid: li.employee.eid,
        name: li.employee.fullName,
        dept: li.employee.department?.name ?? null,
        total: 0,
      };
      entry.total += Number(li.finalAmountUsd);
      byEmployee.set(key, entry);
    }

    const rows = [...byEmployee.values()]
      .filter((e) => e.total > 0)
      .sort((a, b) => b.total - a.total)
      .map((e) => ({
        eid: e.eid,
        name: e.name,
        dept: e.dept ?? '—',
        commissionUsd: e.total.toFixed(2),
        approxPkr: Math.round(e.total * fx).toLocaleString('en-US'),
      }));

    const data: ReportData = {
      title: `Commission Payslips — ${label}`,
      subtitle: `${rows.length} recipient(s) · FX ${fx} USD→PKR · Status: ${run.status}`,
      columns: [
        { key: 'eid', header: 'EID', weight: 1 },
        { key: 'name', header: 'Employee', weight: 2 },
        { key: 'dept', header: 'Department', weight: 1.5 },
        { key: 'commissionUsd', header: 'Commission (USD)', align: 'right', weight: 1.2 },
        { key: 'approxPkr', header: 'Approx PKR', align: 'right', weight: 1.2 },
      ],
      rows,
      generatedAt: new Date(),
    };

    return { filename: `commission-payslips-${run.monthKey}.pdf`, data };
  }

  /* ---------- CSV export ---------- */

  /**
   * Export a commission run as a self-contained CSV.
   *
   * Permission: `commissions:view_runs` — if a viewer can see the run
   * detail page, they can download the CSV. There's a separate
   * `commissions:export_run` permission used by the frontend button's
   * visibility gate, but the endpoint itself only requires view.
   *
   * Returns `{ filename, csv }` so the controller can stamp the right
   * Content-Disposition header. Filename pattern:
   * `commission-run-{monthKey}-{status}.csv` (e.g.
   * `commission-run-2026-04-approved.csv`).
   *
   * The CSV body has two parts:
   *   1. Header row + one row per line item — RFC 4180 with 19 columns
   *      covering employee, project, role, calc inputs, adjustments,
   *      and the final amount. Amounts use 2-decimal formatting.
   *   2. Blank row + a summary block (Month / Status / approval chain
   *      / FX rate / totals) so the file is self-contained for
   *      external review.
   *
   * Emits `commission.run.exported` for the audit trail.
   */
  async exportCsv(
    viewer: AuthenticatedUser,
    id: string,
  ): Promise<{ filename: string; csv: string }> {
    this.require('commissions:view_runs', viewer);

    const run = await prisma.commissionRun.findUnique({
      where: { id },
      include: COMMISSION_RUN_INCLUDE,
    });
    if (!run) throw new NotFoundException('Commission run not found');

    // Resolve creator / submitter / approver labels for the summary
    // block. Each is a User → Employee lookup; the User may not have
    // a linked Employee (system / admin accounts), so fall back to the
    // user's email when no employee profile is wired.
    const userIds = [run.createdById, run.submittedById, run.approvedById].filter(
      (uid): uid is string => Boolean(uid),
    );
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          include: { employee: { select: { fullName: true } } },
        })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));
    const userLabel = (uid: string | null): string => {
      if (!uid) return '';
      const u = userById.get(uid);
      if (!u) return uid;
      const name = u.employee?.fullName;
      return name ? `${name} <${u.email}>` : u.email;
    };

    const lineItems = run.lineItems;

    /* ---------- Header + line item rows ---------- */
    const headers = [
      'Line Item ID',
      'Employee EID',
      'Employee Name',
      'Employee Email',
      'Project Name',
      'Project Category',
      'Project Status',
      'Role on Project',
      'Snapshot Percentage',
      'Base Revenue USD',
      'Month Fraction',
      'Calculated Amount USD',
      'Leave Adjustment USD',
      'Manual Adjustment USD',
      'Manual Adjustment Note',
      'Is Held',
      'Carry-forward To Run',
      'Carry-forward From Run',
      'Final Amount USD',
    ];

    const rows: string[][] = [headers];
    for (const li of lineItems) {
      rows.push([
        li.id,
        li.employee.eid,
        li.employee.fullName,
        li.employee.email,
        li.project.name,
        li.project.category.name,
        li.project.status,
        li.roleName,
        formatPercentage(Number(li.snapshotPercentage)),
        formatAmount(Number(li.baseRevenueUsd)),
        `${li.monthFractionNumerator}/${li.monthFractionDenominator}`,
        formatAmount(Number(li.calculatedAmountUsd)),
        formatAmount(Number(li.leaveAdjustmentUsd)),
        formatAmount(Number(li.manualAdjustmentUsd)),
        li.manualAdjustmentNote ?? '',
        li.isHeld ? 'yes' : 'no',
        li.carryForwardToRunId ?? '',
        li.carryForwardFromRunId ?? '',
        formatAmount(Number(li.finalAmountUsd)),
      ]);
    }

    /* ---------- Summary block ---------- */
    // Format: the summary sits in the rightmost columns so a
    // spreadsheet reader sees a visually distinct "metadata" trailer.
    // Empty columns left of the label keep alignment with the data
    // rows above.
    const summaryColPrefix = Array.from({ length: 7 }).fill('');
    const summaryRow = (label: string, value: string): string[] => [
      ...(summaryColPrefix as string[]),
      label,
      value,
    ];

    const distinctRecipients = new Set(lineItems.map((li) => li.employeeId)).size;
    const distinctProjects = new Set(lineItems.map((li) => li.projectId)).size;
    const runTotal = lineItems.reduce((sum, li) => sum + Number(li.finalAmountUsd), 0);

    const summary: string[][] = [
      [], // blank separator
      [...(summaryColPrefix as string[]), 'Run Summary'],
      summaryRow('Month', run.monthKey),
      summaryRow('Status', run.status),
      summaryRow('Created By', userLabel(run.createdById)),
      summaryRow('Created At', run.createdAt.toISOString()),
      summaryRow('Submitted By', userLabel(run.submittedById)),
      summaryRow('Submitted At', run.submittedAt?.toISOString() ?? ''),
      summaryRow('Approved By', userLabel(run.approvedById)),
      summaryRow('Approved At', run.approvedAt?.toISOString() ?? ''),
      summaryRow('Approver Is Submitter', run.approverIsSubmitter ? 'yes' : 'no'),
      summaryRow('FX Rate USD-PKR', String(Number(run.fxRateUsdToPkr))),
      summaryRow('Total Recipients', String(distinctRecipients)),
      summaryRow('Total Projects', String(distinctProjects)),
      summaryRow('Run Total USD', formatAmount(runTotal)),
    ];

    const csv = [...rows, ...summary]
      .map((row) => row.map((cell) => csvEscape(cell ?? '')).join(','))
      .join('\n');

    const filename = `commission-run-${run.monthKey}-${run.status}.csv`;

    // Audit trail — exporting financial data is a sensitive action.
    // We do BOTH:
    //   1. emit a domain event so any future subscriber (timeline,
    //      notifications, BI sink) can react;
    //   2. write directly to AuditLog via AuditService since the
    //      Prisma middleware only fires on Prisma writes — a read-only
    //      action like export wouldn't otherwise leave a trace.
    const exportedAt = new Date();
    this.events.emit(
      'commission.run.exported',
      {
        runId: run.id,
        monthKey: run.monthKey,
        status: run.status,
        exportedById: viewer.id,
        exportedAt: exportedAt.toISOString(),
        rowCount: lineItems.length,
      },
      { actorId: viewer.id },
    );
    await this.audit.record({
      module: 'commissions',
      entity: 'CommissionRun',
      entityId: run.id,
      action: 'exported',
      after: {
        monthKey: run.monthKey,
        status: run.status,
        rowCount: lineItems.length,
        filename,
      },
      actorId: viewer.id,
    });

    return { filename, csv };
  }

  /* ---------- Per-employee breakdowns ---------- */

  async employeeBreakdown(
    viewer: AuthenticatedUser,
    employeeId: string,
    monthKey: string,
  ): Promise<EmployeeCommissionBreakdown> {
    // Permission: self OR view_all_breakdowns
    if (
      viewer.employeeId !== employeeId &&
      !viewer.permissions.includes('commissions:view_all_breakdowns')
    ) {
      throw new ForbiddenException('commissions:view_all_breakdowns required');
    }

    const run = await prisma.commissionRun.findUnique({
      where: { monthKey },
      include: {
        lineItems: {
          where: { employeeId },
          include: {
            project: { include: { category: true } },
            employee: { include: { department: true, designation: true } },
          },
        },
      },
    });

    const lineItems = run?.lineItems.map(toCommissionLineItemPublic) ?? [];
    const totalUsd = roundUsd(lineItems.reduce((s, li) => s + li.finalAmountUsd, 0));

    return {
      employeeId,
      monthKey,
      monthLabel: monthLabel(monthKey),
      totalUsd,
      typeBreakdown: typeBreakdownOf(lineItems),
      fxRateUsdToPkr: run ? Number(run.fxRateUsdToPkr) : null,
      lineItems,
      runId: run?.id ?? null,
      runStatus: (run?.status as CommissionRunStatus | undefined) ?? null,
    };
  }

  /**
   * 12-month (default) commission history for the §8.2 portal table —
   * each row split into External / Allowance / TL Reward / Upwork plus
   * the run status. Self or `view_all_breakdowns`.
   */
  async employeeCommissionHistory(
    viewer: AuthenticatedUser,
    employeeId: string,
    monthsBack: number,
  ): Promise<EmployeeCommissionHistory> {
    if (
      viewer.employeeId !== employeeId &&
      !viewer.permissions.includes('commissions:view_all_breakdowns')
    ) {
      throw new ForbiddenException('commissions:view_all_breakdowns required');
    }

    const monthKeys = recentMonthKeys(monthsBack);
    const runs = await prisma.commissionRun.findMany({
      where: { monthKey: { in: monthKeys } },
      include: {
        lineItems: {
          where: { employeeId },
          include: {
            project: { include: { category: true } },
            employee: { include: { department: true, designation: true } },
          },
        },
      },
    });
    const byMonth = new Map(runs.map((r) => [r.monthKey, r]));

    const rows: EmployeeCommissionHistoryRow[] = monthKeys.map((monthKey) => {
      const run = byMonth.get(monthKey);
      const items = run?.lineItems.map(toCommissionLineItemPublic) ?? [];
      const t = typeBreakdownOf(items);
      return {
        monthKey,
        monthLabel: monthLabel(monthKey),
        external: t.external,
        allowance: t.allowance,
        tlReward: t.tlReward,
        upwork: t.upwork,
        total: roundUsd(items.reduce((s, li) => s + li.finalAmountUsd, 0)),
        status: (run?.status as CommissionRunStatus | undefined) ?? null,
      };
    });

    return { employeeId, rows };
  }

  /**
   * Per-employee payslip for one month as a ReportData (rendered to PDF
   * by the controller). Only available once the month's run is approved
   * or locked. Self or `view_all_breakdowns`.
   */
  async buildEmployeePayslip(
    viewer: AuthenticatedUser,
    employeeId: string,
    monthKey: string,
  ): Promise<{ filename: string; data: import('../../core/reports/report-formats').ReportData }> {
    const breakdown = await this.employeeBreakdown(viewer, employeeId, monthKey);
    if (!breakdown.runStatus || !['approved', 'locked'].includes(breakdown.runStatus)) {
      throw new BadRequestException('Payslip is only available once the month is approved');
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: true, designation: true },
    });
    const fx = breakdown.fxRateUsdToPkr ?? 0;
    const t = breakdown.typeBreakdown;

    const rows = [
      { item: 'External Commission', usd: t.external.toFixed(2) },
      { item: 'Commission Allowance', usd: t.allowance.toFixed(2) },
      { item: 'TL Reward', usd: t.tlReward.toFixed(2) },
      { item: 'Upwork Commission', usd: t.upwork.toFixed(2) },
      { item: 'Total', usd: breakdown.totalUsd.toFixed(2) },
      {
        item: 'Approx PKR (@ ' + fx + ')',
        usd: fx ? Math.round(breakdown.totalUsd * fx).toLocaleString('en-US') : '—',
      },
    ];

    return {
      filename: `payslip-${employee?.eid ?? employeeId}-${monthKey}.pdf`,
      data: {
        title: `Commission Payslip — ${breakdown.monthLabel}`,
        subtitle: `${employee?.fullName ?? employeeId} · ${employee?.eid ?? ''} · ${
          employee?.designation?.name ?? ''
        } · Status: ${breakdown.runStatus}`,
        columns: [
          { key: 'item', header: 'Component', weight: 2 },
          { key: 'usd', header: 'Amount (USD)', align: 'right', weight: 1 },
        ],
        rows,
        generatedAt: new Date(),
      },
    };
  }

  async employeeTrend(
    viewer: AuthenticatedUser,
    employeeId: string,
    monthsBack: number,
  ): Promise<EmployeeCommissionTrend> {
    if (
      viewer.employeeId !== employeeId &&
      !viewer.permissions.includes('commissions:view_all_breakdowns')
    ) {
      throw new ForbiddenException('commissions:view_all_breakdowns required');
    }

    const months: string[] = [];
    const now = new Date();
    for (let i = 0; i < monthsBack; i += 1) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    }
    months.reverse();

    const runs = await prisma.commissionRun.findMany({
      where: { monthKey: { in: months }, status: { in: ['approved', 'locked'] } },
      include: {
        lineItems: { where: { employeeId }, select: { finalAmountUsd: true } },
      },
    });

    const byMonth = new Map(
      runs.map((r) => [
        r.monthKey,
        roundUsd(r.lineItems.reduce((s, li) => s + Number(li.finalAmountUsd), 0)),
      ]),
    );

    return {
      employeeId,
      points: months.map((m) => ({
        monthKey: m,
        monthLabel: monthLabel(m),
        totalUsd: byMonth.get(m) ?? 0,
      })),
    };
  }

  /* ---------- Analytics / rollups ---------- */

  /**
   * Per-run rollups: top-earner leaderboard plus totals grouped by
   * department, project category, and role. Read-only; gated on
   * `view_runs` like the rest of the run detail surface. Amounts use
   * `finalAmountUsd` so adjustments and manual lines are reflected.
   */
  async runAnalytics(
    viewer: AuthenticatedUser,
    id: string,
    query: CommissionRunAnalyticsQuery,
  ): Promise<CommissionRunAnalytics> {
    this.requireRunsView(viewer);
    const run = await prisma.commissionRun.findUnique({
      where: { id },
      include: COMMISSION_RUN_INCLUDE,
    });
    if (!run) throw new NotFoundException('Commission run not found');

    const total = roundUsd(run.lineItems.reduce((s, li) => s + Number(li.finalAmountUsd), 0));

    // Per-employee leaderboard.
    type EmpAgg = { fullName: string; eid: string; departmentName: string | null; total: number };
    const byEmployee = new Map<string, EmpAgg>();
    // Grouped rollups keyed by dept / category / role.
    const deptAgg = new Map<string, { label: string; total: number; employees: Set<string> }>();
    const catAgg = new Map<
      string,
      { label: string; color: string | null; total: number; employees: Set<string> }
    >();
    const roleAgg = new Map<string, { total: number; employees: Set<string> }>();

    for (const li of run.lineItems) {
      const amount = Number(li.finalAmountUsd);

      const emp = byEmployee.get(li.employeeId) ?? {
        fullName: li.employee.fullName,
        eid: li.employee.eid,
        departmentName: li.employee.department?.name ?? null,
        total: 0,
      };
      emp.total += amount;
      byEmployee.set(li.employeeId, emp);

      const deptName = li.employee.department?.name ?? 'Unassigned';
      const dept = deptAgg.get(deptName) ?? { label: deptName, total: 0, employees: new Set() };
      dept.total += amount;
      dept.employees.add(li.employeeId);
      deptAgg.set(deptName, dept);

      const cat = catAgg.get(li.project.category.id) ?? {
        label: li.project.category.name,
        color: li.project.category.color,
        total: 0,
        employees: new Set(),
      };
      cat.total += amount;
      cat.employees.add(li.employeeId);
      catAgg.set(li.project.category.id, cat);

      const role = roleAgg.get(li.roleName) ?? { total: 0, employees: new Set() };
      role.total += amount;
      role.employees.add(li.employeeId);
      roleAgg.set(li.roleName, role);
    }

    const topEarners = Array.from(byEmployee.entries())
      .map(([employeeId, e]) => ({
        employeeId,
        fullName: e.fullName,
        eid: e.eid,
        departmentName: e.departmentName,
        totalUsd: roundUsd(e.total),
        shareOfRun: total > 0 ? roundUsd((e.total / total) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.totalUsd - a.totalUsd)
      .slice(0, query.topN);

    const byDepartment = Array.from(deptAgg.entries())
      .map(([key, d]) => ({
        key,
        label: d.label,
        color: null,
        totalUsd: roundUsd(d.total),
        recipientCount: d.employees.size,
      }))
      .sort((a, b) => b.totalUsd - a.totalUsd);

    const byCategory = Array.from(catAgg.entries())
      .map(([key, c]) => ({
        key,
        label: c.label,
        color: c.color,
        totalUsd: roundUsd(c.total),
        recipientCount: c.employees.size,
      }))
      .sort((a, b) => b.totalUsd - a.totalUsd);

    const byRole = Array.from(roleAgg.entries())
      .map(([key, r]) => ({
        key,
        label: key,
        color: null,
        totalUsd: roundUsd(r.total),
        recipientCount: r.employees.size,
      }))
      .sort((a, b) => b.totalUsd - a.totalUsd);

    return {
      runId: run.id,
      monthKey: run.monthKey,
      monthLabel: monthLabel(run.monthKey),
      status: run.status as CommissionRunStatus,
      totalUsd: total,
      recipientCount: byEmployee.size,
      projectCount: new Set(run.lineItems.map((li) => li.projectId)).size,
      topEarners,
      byDepartment,
      byCategory,
      byRole,
    };
  }

  /**
   * Cross-run trend for period-over-period analysis: one point per
   * month over the trailing `monthsBack` window, whether or not a run
   * exists. Read-only; gated on `view_runs`.
   */
  async runsTrend(
    viewer: AuthenticatedUser,
    query: CommissionRunsTrendQuery,
  ): Promise<CommissionRunsTrend> {
    this.requireRunsView(viewer);

    const months: string[] = [];
    const now = new Date();
    for (let i = 0; i < query.monthsBack; i += 1) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    }
    months.reverse();

    const runs = await prisma.commissionRun.findMany({
      where: { monthKey: { in: months } },
      select: {
        monthKey: true,
        status: true,
        lineItems: { select: { finalAmountUsd: true, employeeId: true } },
      },
    });

    const byMonth = new Map(runs.map((r) => [r.monthKey, r]));

    return {
      points: months.map((m) => {
        const r = byMonth.get(m);
        if (!r) {
          return {
            monthKey: m,
            monthLabel: monthLabel(m),
            status: null,
            totalUsd: 0,
            recipientCount: 0,
          };
        }
        const totalUsd = roundUsd(r.lineItems.reduce((s, li) => s + Number(li.finalAmountUsd), 0));
        const recipientCount = new Set(r.lineItems.map((li) => li.employeeId)).size;
        return {
          monthKey: m,
          monthLabel: monthLabel(m),
          status: r.status as CommissionRunStatus,
          totalUsd,
          recipientCount,
        };
      }),
    };
  }

  /* ---------- Internal helpers ---------- */

  private async summary(id: string): Promise<CommissionRunSummary> {
    const fresh = await prisma.commissionRun.findUniqueOrThrow({
      where: { id },
      include: COMMISSION_RUN_INCLUDE,
    });
    return toCommissionRunSummary(fresh);
  }
}

function csvEscape(value: string): string {
  if (/["\n,]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Two-decimal amount string ("1440.00"). Column headers carry the currency hint. */
function formatAmount(value: number): string {
  return value.toFixed(2);
}

/** Percentage as a plain decimal string ("50" / "33.33"). */
function formatPercentage(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}

/** Number of days in the month a 'YYYY-MM' key refers to. */
function daysInMonth(monthKey: string): number {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) throw new Error(`Invalid monthKey: ${monthKey}`);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 'YYYY-MM' → previous month 'YYYY-MM'. */
function previousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) throw new Error(`Invalid monthKey: ${monthKey}`);
  const d = new Date(Date.UTC(year, month - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
