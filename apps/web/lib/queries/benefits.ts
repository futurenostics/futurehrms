'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BenefitPolicyKind,
  BenefitPolicyPublic,
  EmployeeBenefitBalances,
} from '@futurenostics/types';
import { apiFetch } from '@/lib/api-client';

const KEY = {
  policies: ['benefit-policies'] as const,
  balances: (month?: string) => ['benefit-balances', month ?? 'current'] as const,
};

export function useBenefitPolicies(enabled = true) {
  return useQuery<BenefitPolicyPublic[]>({
    queryKey: KEY.policies,
    queryFn: () => apiFetch<BenefitPolicyPublic[]>('/api/benefits/policies'),
    enabled,
  });
}

export function usePublishBenefitPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { kind: BenefitPolicyKind; amountPkr: number }) =>
      apiFetch<BenefitPolicyPublic>('/api/benefits/policies/publish', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY.policies });
      void qc.invalidateQueries({ queryKey: ['benefit-balances'] });
    },
  });
}

export function useMyBenefitBalances(month?: string, enabled = true) {
  const qs = month ? `?month=${encodeURIComponent(month)}` : '';
  return useQuery<EmployeeBenefitBalances>({
    queryKey: KEY.balances(month),
    queryFn: () => apiFetch<EmployeeBenefitBalances>(`/api/benefits/balances${qs}`),
    enabled,
  });
}
