'use client';

import type { ExpenseClaimDetail } from '@futurenostics/types';
import { Alert } from '@/components/ui/alert';
import { ExpenseBenefitBalances } from '@/components/expenses/expense-benefit-balances';

/** Finance review: warnings + employee remaining, without extra chrome. */
export function ExpenseClaimFinanceBenefits({ claim }: { claim: ExpenseClaimDetail }) {
  const showWallet =
    (claim.category === 'medical' || claim.category === 'gym') && claim.benefitSnapshot;
  if (!showWallet && !claim.benefitWarnings?.length) return null;

  return (
    <div className="gap-fn-3 flex flex-col">
      {claim.benefitWarnings?.map((w) => (
        <Alert key={w} tone="warning" showIcon={false}>
          <p>{w}</p>
        </Alert>
      ))}
      {showWallet ? (
        <ExpenseBenefitBalances
          balances={claim.benefitSnapshot}
          compact
          show={claim.category === 'medical' ? 'medical' : 'gym'}
        />
      ) : null}
    </div>
  );
}
