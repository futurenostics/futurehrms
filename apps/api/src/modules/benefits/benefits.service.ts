import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@futurenostics/db';
import { Prisma } from '@prisma/client';
import {
  DEFAULT_GYM_MONTHLY_PKR,
  DEFAULT_MEDICAL_HALF_PKR,
  DEFAULT_OPTICAL_SUBCAP_PKR,
  GYM_MONTH_ALREADY_APPROVED_MESSAGE,
  gymPeriodKey,
  formatBenefitPkr,
  gymPeriodLabel,
  medicalPeriodKey,
  medicalPeriodLabel,
  medicalSubmitWarnings,
  periodKeyForKind,
  type BenefitPolicyKind,
  type BenefitPolicyPublic,
  type EmployeeBenefitBalances,
  type GymBalancePublic,
  type MedicalBalancePublic,
} from '@futurenostics/types';
import { EventBusService } from '../../core/events/event-bus.service';

function decimalToNumber(value: { toString: () => string } | number): number {
  if (typeof value === 'number') return value;
  return Number(value.toString());
}

@Injectable()
export class BenefitsService {
  private readonly logger = new Logger(BenefitsService.name);

  constructor(private readonly events: EventBusService) {}

  async ensureDefaultPolicies(): Promise<void> {
    await this.ensureKind('medical_opd', DEFAULT_MEDICAL_HALF_PKR, DEFAULT_OPTICAL_SUBCAP_PKR);
    await this.ensureKind('gym_monthly', DEFAULT_GYM_MONTHLY_PKR, null);
  }

  private async ensureKind(
    kind: BenefitPolicyKind,
    amountPkr: number,
    opticalSubCapPkr: number | null,
  ): Promise<void> {
    const existing = await prisma.benefitPolicy.findFirst({
      where: { kind, status: 'active' },
    });
    if (existing) return;
    await prisma.benefitPolicy.create({
      data: {
        kind,
        version: 1,
        status: 'active',
        amountPkr,
        opticalSubCapPkr,
        effectiveFrom: new Date(),
        publishedAt: new Date(),
      },
    });
    this.logger.log(`Seeded active ${kind} policy at ₨${amountPkr.toLocaleString('en-PK')}`);
  }

  async listActivePolicies(): Promise<BenefitPolicyPublic[]> {
    await this.ensureDefaultPolicies();
    const rows = await prisma.benefitPolicy.findMany({
      where: { status: 'active' },
      include: { publishedBy: { include: { employee: { select: { fullName: true } } } } },
      orderBy: { kind: 'asc' },
    });
    return rows.map((row) => this.toPolicyPublic(row));
  }

  async publish(
    kind: BenefitPolicyKind,
    amountPkr: number,
    actorId: string,
  ): Promise<BenefitPolicyPublic> {
    await this.ensureDefaultPolicies();
    const current = await prisma.benefitPolicy.findFirst({
      where: { kind, status: 'active' },
    });
    const previousAmount = current ? decimalToNumber(current.amountPkr) : null;
    const periodKey = periodKeyForKind(kind, new Date());

    if (previousAmount != null && amountPkr < previousAmount) {
      const existingCurrent = await prisma.employeeBenefitBalance.count({
        where: { kind, periodKey },
      });
      if (existingCurrent > 0) {
        throw new BadRequestException(
          'Policy decreases cannot apply mid-period. Publish a lower amount at the start of the next cycle.',
        );
      }
    }

    const last = await prisma.benefitPolicy.findFirst({
      where: { kind },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (last?.version ?? 0) + 1;
    const opticalSubCapPkr = kind === 'medical_opd' ? DEFAULT_OPTICAL_SUBCAP_PKR : null;

    const created = await prisma.$transaction(async (tx) => {
      if (current) {
        await tx.benefitPolicy.update({
          where: { id: current.id },
          data: { status: 'archived' },
        });
      }
      const row = await tx.benefitPolicy.create({
        data: {
          kind,
          version: nextVersion,
          status: 'active',
          amountPkr,
          opticalSubCapPkr,
          effectiveFrom: new Date(),
          publishedAt: new Date(),
          publishedById: actorId,
        },
        include: { publishedBy: { include: { employee: { select: { fullName: true } } } } },
      });
      if (previousAmount != null && amountPkr > previousAmount) {
        await tx.employeeBenefitBalance.updateMany({
          where: { kind, periodKey },
          data: { allocatedPkr: amountPkr, policyId: row.id },
        });
      }
      return row;
    });

    this.events.emit(
      'benefits.policy.published',
      {
        policyId: created.id,
        kind,
        version: created.version,
        amountPkr,
      },
      { actorId },
    );

    return this.toPolicyPublic(created);
  }

  async ensureCurrentBalances(employeeId: string, asOf = new Date()): Promise<void> {
    await this.ensureDefaultPolicies();
    await this.ensureBalance(employeeId, 'medical_opd', medicalPeriodKey(asOf));
    await this.ensureBalance(employeeId, 'gym_monthly', gymPeriodKey(asOf));
  }

  async getMyBalances(employeeId: string, asOf = new Date()): Promise<EmployeeBenefitBalances> {
    await this.ensureCurrentBalances(employeeId, asOf);
    const medicalKey = medicalPeriodKey(asOf);
    const gymKey = gymPeriodKey(asOf);
    const [medicalRow, gymRow, gymLocked] = await Promise.all([
      prisma.employeeBenefitBalance.findUniqueOrThrow({
        where: {
          employeeId_kind_periodKey: { employeeId, kind: 'medical_opd', periodKey: medicalKey },
        },
        include: { policy: true },
      }),
      prisma.employeeBenefitBalance.findUniqueOrThrow({
        where: {
          employeeId_kind_periodKey: { employeeId, kind: 'gym_monthly', periodKey: gymKey },
        },
      }),
      this.hasApprovedGymClaim(employeeId, gymKey),
    ]);

    const medicalAllocated = decimalToNumber(medicalRow.allocatedPkr);
    const medicalUsed = decimalToNumber(medicalRow.usedPkr);
    const opticalAllocated =
      medicalRow.policy.opticalSubCapPkr != null
        ? decimalToNumber(medicalRow.policy.opticalSubCapPkr)
        : DEFAULT_OPTICAL_SUBCAP_PKR;
    const usedOptical = decimalToNumber(medicalRow.usedOpticalPkr);
    const gymAllocated = decimalToNumber(gymRow.allocatedPkr);
    const gymUsed = decimalToNumber(gymRow.usedPkr);

    const medical: MedicalBalancePublic = {
      kind: 'medical_opd',
      periodKey: medicalKey,
      periodLabel: medicalPeriodLabel(medicalKey),
      allocatedPkr: medicalAllocated,
      usedPkr: medicalUsed,
      remainingPkr: Math.max(0, medicalAllocated - medicalUsed),
      opticalAllocatedPkr: opticalAllocated,
      usedOpticalPkr: usedOptical,
      opticalRemainingPkr: Math.max(0, opticalAllocated - usedOptical),
    };
    const gym: GymBalancePublic = {
      kind: 'gym_monthly',
      periodKey: gymKey,
      periodLabel: gymPeriodLabel(gymKey),
      allocatedPkr: gymAllocated,
      usedPkr: gymUsed,
      remainingPkr: gymLocked ? 0 : Math.max(0, gymAllocated - gymUsed),
      monthLocked: gymLocked,
    };
    return { medical, gym };
  }

  async gymMaxPkr(): Promise<number> {
    await this.ensureDefaultPolicies();
    const policy = await prisma.benefitPolicy.findFirst({
      where: { kind: 'gym_monthly', status: 'active' },
    });
    return policy ? decimalToNumber(policy.amountPkr) : DEFAULT_GYM_MONTHLY_PKR;
  }

  async assertGymAmountAllowed(amountPkr: number): Promise<void> {
    const max = await this.gymMaxPkr();
    if (amountPkr > max) {
      throw new BadRequestException(
        `Gym reimbursement cannot exceed ${formatBenefitPkr(max)} per claim.`,
      );
    }
  }

  async assertGymSubmitAllowed(employeeId: string, expenseDate: Date): Promise<void> {
    const periodKey = gymPeriodKey(expenseDate);
    if (await this.hasApprovedGymClaim(employeeId, periodKey)) {
      throw new BadRequestException(GYM_MONTH_ALREADY_APPROVED_MESSAGE);
    }
  }

  async warningsForClaim(input: {
    employeeId: string;
    category: string;
    amountPkr: number;
    expenseDate: Date;
  }): Promise<string[]> {
    if (input.category !== 'medical') return [];
    const balances = await this.getMyBalances(input.employeeId, input.expenseDate);
    return medicalSubmitWarnings({
      amountPkr: input.amountPkr,
      remainingPkr: balances.medical.remainingPkr,
    });
  }

  /**
   * Deduct on first approval only. Unique claimId on the ledger makes
   * a second call a no-op.
   */
  async applyApprovedClaim(input: {
    claimId: string;
    employeeId: string;
    category: string;
    amountPkr: number;
    expenseDate: Date | null;
    isOptical: boolean;
  }): Promise<void> {
    if (input.category !== 'medical' && input.category !== 'gym') return;
    if (!input.expenseDate) {
      this.logger.warn(`Skip benefit deduct for ${input.claimId}: missing expense date`);
      return;
    }

    const kind: BenefitPolicyKind = input.category === 'medical' ? 'medical_opd' : 'gym_monthly';
    const periodKey = periodKeyForKind(kind, input.expenseDate);
    await this.ensureBalance(input.employeeId, kind, periodKey);

    try {
      await prisma.$transaction(async (tx) => {
        await tx.benefitLedgerEntry.create({
          data: {
            claimId: input.claimId,
            employeeId: input.employeeId,
            kind,
            periodKey,
            amountPkr: input.amountPkr,
            isOptical: input.isOptical,
          },
        });
        await tx.employeeBenefitBalance.update({
          where: {
            employeeId_kind_periodKey: { employeeId: input.employeeId, kind, periodKey },
          },
          data: {
            usedPkr: { increment: input.amountPkr },
            ...(input.isOptical ? { usedOpticalPkr: { increment: input.amountPkr } } : {}),
          },
        });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return;
      }
      throw err;
    }
  }

  private async ensureBalance(
    employeeId: string,
    kind: BenefitPolicyKind,
    periodKey: string,
  ): Promise<void> {
    const existing = await prisma.employeeBenefitBalance.findUnique({
      where: { employeeId_kind_periodKey: { employeeId, kind, periodKey } },
    });
    if (existing) return;
    const policy = await prisma.benefitPolicy.findFirst({
      where: { kind, status: 'active' },
    });
    if (!policy) throw new NotFoundException(`No active ${kind} policy.`);
    try {
      await prisma.employeeBenefitBalance.create({
        data: {
          employeeId,
          kind,
          periodKey,
          allocatedPkr: policy.amountPkr,
          usedPkr: 0,
          usedOpticalPkr: 0,
          policyId: policy.id,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return;
      }
      throw err;
    }
  }

  /** Gym month lock is the ledger row written on approve — not ExpenseClaim. */
  private async hasApprovedGymClaim(employeeId: string, periodKey: string): Promise<boolean> {
    const found = await prisma.benefitLedgerEntry.findFirst({
      where: { employeeId, kind: 'gym_monthly', periodKey },
      select: { id: true },
    });
    return found != null;
  }

  private toPolicyPublic(row: {
    id: string;
    kind: string;
    version: number;
    status: string;
    amountPkr: { toString: () => string } | number;
    opticalSubCapPkr: { toString: () => string } | number | null;
    effectiveFrom: Date;
    publishedAt: Date | null;
    publishedBy: { email: string; employee: { fullName: string } | null } | null;
  }): BenefitPolicyPublic {
    return {
      id: row.id,
      kind: row.kind as BenefitPolicyKind,
      version: row.version,
      status: row.status as BenefitPolicyPublic['status'],
      amountPkr: decimalToNumber(row.amountPkr),
      opticalSubCapPkr: row.opticalSubCapPkr != null ? decimalToNumber(row.opticalSubCapPkr) : null,
      effectiveFrom: row.effectiveFrom.toISOString(),
      publishedAt: row.publishedAt?.toISOString() ?? null,
      publishedByName: row.publishedBy?.employee?.fullName ?? row.publishedBy?.email ?? null,
    };
  }
}
