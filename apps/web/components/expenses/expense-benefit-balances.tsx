'use client';

import { formatBenefitPkr, type EmployeeBenefitBalances } from '@futurenostics/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function ExpenseBenefitBalances({
  balances,
  loading,
  show = 'all',
  compact = false,
}: {
  balances: EmployeeBenefitBalances | undefined;
  loading?: boolean;
  show?: 'all' | 'medical' | 'gym';
  compact?: boolean;
}) {
  if (loading) {
    return (
      <div className={cn('gap-fn-6 grid', show === 'all' ? 'grid-cols-2' : 'grid-cols-1')}>
        <Skeleton className="h-fn-12 w-full" />
        {show === 'all' ? <Skeleton className="h-fn-12 w-full" /> : null}
      </div>
    );
  }
  if (!balances) return null;

  const medical = show === 'all' || show === 'medical';
  const gym = show === 'all' || show === 'gym';

  return (
    <div className={cn('gap-fn-8 grid', show === 'all' ? 'grid-cols-2' : 'grid-cols-1')}>
      {medical ? (
        <BalanceStat
          compact={compact}
          title="Medical"
          remainingPkr={balances.medical.remainingPkr}
          allocatedPkr={balances.medical.allocatedPkr}
          period={balances.medical.periodLabel}
        />
      ) : null}
      {gym ? (
        <BalanceStat
          compact={compact}
          title="Gym"
          remainingPkr={balances.gym.remainingPkr}
          allocatedPkr={balances.gym.allocatedPkr}
          period={balances.gym.periodLabel}
          extra={balances.gym.monthLocked ? 'Claim already approved this month' : undefined}
        />
      ) : null}
    </div>
  );
}

function BalanceStat({
  title,
  remainingPkr,
  allocatedPkr,
  period,
  extra,
  compact,
}: {
  title: string;
  remainingPkr: number;
  allocatedPkr: number;
  period: string;
  extra?: string;
  compact?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-fn-fg-muted text-[12.5px]">{title}</p>
      <p
        className={cn(
          'text-fn-fg font-fn-semibold tracking-fn-tight tabular-nums',
          compact ? 'text-[18px]' : 'text-[22px]',
        )}
      >
        {formatBenefitPkr(remainingPkr)}
        <span className="text-fn-fg-muted font-fn-regular ml-fn-1_5 text-[13px]">left</span>
      </p>
      <p className="text-fn-fg-faint mt-fn-0_5 text-[12px]">
        of {formatBenefitPkr(allocatedPkr)} · {period}
      </p>
      {extra ? <p className="text-fn-fg-muted mt-fn-0_5 text-[12px]">{extra}</p> : null}
    </div>
  );
}
