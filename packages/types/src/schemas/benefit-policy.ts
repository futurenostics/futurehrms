/**
 * Company benefit policies (OPD / gym) and employee period wallets.
 */
import { z } from 'zod';

export const DEFAULT_MEDICAL_HALF_PKR = 30_000;
export const DEFAULT_OPTICAL_SUBCAP_PKR = 10_000;
export const DEFAULT_GYM_MONTHLY_PKR = 2_000;

export const BENEFIT_POLICY_KINDS = ['medical_opd', 'gym_monthly'] as const;
export const benefitPolicyKindSchema = z.enum(BENEFIT_POLICY_KINDS);
export type BenefitPolicyKind = z.infer<typeof benefitPolicyKindSchema>;

export const benefitPolicyStatusSchema = z.enum(['draft', 'active', 'archived']);
export type BenefitPolicyStatus = z.infer<typeof benefitPolicyStatusSchema>;

const KARACHI = 'Asia/Karachi';

function yearMonthInKarachi(date: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: KARACHI,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  return { year, month };
}

/** Medical: `2026-H1` (Jan–Jun) or `2026-H2` (Jul–Dec). */
export function medicalPeriodKey(date: Date): string {
  const { year, month } = yearMonthInKarachi(date);
  return `${year}-${month <= 6 ? 'H1' : 'H2'}`;
}

/** Gym: `2026-08`. */
export function gymPeriodKey(date: Date): string {
  const { year, month } = yearMonthInKarachi(date);
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function periodKeyForKind(kind: BenefitPolicyKind, date: Date): string {
  return kind === 'medical_opd' ? medicalPeriodKey(date) : gymPeriodKey(date);
}

export function medicalPeriodLabel(periodKey: string): string {
  const [year, half] = periodKey.split('-');
  if (half === 'H1') return `Jan–Jun ${year}`;
  if (half === 'H2') return `Jul–Dec ${year}`;
  return periodKey;
}

export function gymPeriodLabel(periodKey: string): string {
  const [year, month] = periodKey.split('-');
  const d = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return d.toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function formatBenefitPkr(n: number): string {
  return `₨${n.toLocaleString('en-PK')}`;
}

export function formatOpdOverLimitWarning(exceedByPkr: number): string {
  return `This claim exceeds your remaining OPD balance by ${formatBenefitPkr(exceedByPkr)}. You can still submit it for Finance review.`;
}

export const GYM_MONTH_ALREADY_APPROVED_MESSAGE =
  'You already have an approved gym claim for this month. You cannot submit another gym claim until next month.';

export function medicalSubmitWarnings(input: {
  amountPkr: number;
  remainingPkr: number;
}): string[] {
  if (input.amountPkr > input.remainingPkr) {
    return [formatOpdOverLimitWarning(input.amountPkr - input.remainingPkr)];
  }
  return [];
}

export const benefitPolicyPublishSchema = z.object({
  kind: benefitPolicyKindSchema,
  amountPkr: z.coerce.number().int().min(1).max(10_000_000),
});
export type BenefitPolicyPublishInput = z.infer<typeof benefitPolicyPublishSchema>;

export const benefitPolicyPublicSchema = z.object({
  id: z.string(),
  kind: benefitPolicyKindSchema,
  version: z.number().int(),
  status: benefitPolicyStatusSchema,
  amountPkr: z.number(),
  opticalSubCapPkr: z.number().nullable(),
  effectiveFrom: z.string(),
  publishedAt: z.string().nullable(),
  publishedByName: z.string().nullable(),
});
export type BenefitPolicyPublic = z.infer<typeof benefitPolicyPublicSchema>;

export const medicalBalancePublicSchema = z.object({
  kind: z.literal('medical_opd'),
  periodKey: z.string(),
  periodLabel: z.string(),
  allocatedPkr: z.number(),
  usedPkr: z.number(),
  remainingPkr: z.number(),
  opticalAllocatedPkr: z.number(),
  usedOpticalPkr: z.number(),
  opticalRemainingPkr: z.number(),
});
export type MedicalBalancePublic = z.infer<typeof medicalBalancePublicSchema>;

export const gymBalancePublicSchema = z.object({
  kind: z.literal('gym_monthly'),
  periodKey: z.string(),
  periodLabel: z.string(),
  allocatedPkr: z.number(),
  usedPkr: z.number(),
  remainingPkr: z.number(),
  monthLocked: z.boolean(),
});
export type GymBalancePublic = z.infer<typeof gymBalancePublicSchema>;

export const employeeBenefitBalancesSchema = z.object({
  medical: medicalBalancePublicSchema,
  gym: gymBalancePublicSchema,
});
export type EmployeeBenefitBalances = z.infer<typeof employeeBenefitBalancesSchema>;
