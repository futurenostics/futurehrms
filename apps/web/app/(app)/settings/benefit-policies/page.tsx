'use client';

import * as React from 'react';
import { HeartPulse } from 'lucide-react';
import { toast } from 'sonner';
import type { BenefitPolicyKind, BenefitPolicyPublic } from '@futurenostics/types';
import { formatBenefitPkr } from '@futurenostics/types';
import { AppShell } from '@/components/shell/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/use-permissions';
import { useBenefitPolicies, usePublishBenefitPolicy } from '@/lib/queries/benefits';

export default function BenefitPoliciesPage() {
  const perms = usePermissions();
  const canManage = perms.has('benefits:manage_policies');
  const policies = useBenefitPolicies(canManage);
  const publish = usePublishBenefitPolicy();

  if (!canManage) {
    return (
      <AppShell
        breadcrumbs={[{ label: 'Settings', href: '/settings' }, { label: 'Benefit policies' }]}
      >
        <Alert tone="warning">You do not have permission to edit benefit policies.</Alert>
      </AppShell>
    );
  }

  const medical = policies.data?.find((p) => p.kind === 'medical_opd');
  const gym = policies.data?.find((p) => p.kind === 'gym_monthly');

  return (
    <AppShell
      breadcrumbs={[{ label: 'Settings', href: '/settings' }, { label: 'Benefit policies' }]}
    >
      <div className="gap-fn-5 mx-auto flex w-full max-w-3xl flex-col">
        <div>
          <h1 className="text-fn-fg font-fn-semibold tracking-fn-tight text-[26px]">
            Benefit policies
          </h1>
          <p className="text-fn-fg-muted mt-fn-1 text-[13.5px]">
            Company-wide OPD (per half-year) and gym (per month) amounts. Increases apply to the
            current period immediately. Decreases wait until the next cycle.
          </p>
        </div>

        {policies.isPending ? (
          <div className="gap-fn-4 flex flex-col">
            <Skeleton className="h-fn-16 w-full" />
            <Skeleton className="h-fn-16 w-full" />
          </div>
        ) : (
          <div className="gap-fn-4 flex flex-col">
            <PolicyCard
              title="Medical / OPD"
              hint="Allocated each January–June and July–December."
              policy={medical}
              busy={publish.isPending}
              onPublish={(amountPkr) => void publishKind('medical_opd', amountPkr)}
            />
            <PolicyCard
              title="Gym"
              hint="Allocated each calendar month. One approved claim per month, up to this amount."
              policy={gym}
              busy={publish.isPending}
              onPublish={(amountPkr) => void publishKind('gym_monthly', amountPkr)}
            />
          </div>
        )}
      </div>
    </AppShell>
  );

  async function publishKind(kind: BenefitPolicyKind, amountPkr: number) {
    try {
      await publish.mutateAsync({ kind, amountPkr });
      toast.success('Policy published.');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
}

function PolicyCard({
  title,
  hint,
  policy,
  busy,
  onPublish,
}: {
  title: string;
  hint: string;
  policy: BenefitPolicyPublic | undefined;
  busy: boolean;
  onPublish: (amountPkr: number) => void;
}) {
  const [amount, setAmount] = React.useState('');
  React.useEffect(() => {
    if (policy) setAmount(String(policy.amountPkr));
  }, [policy]);

  return (
    <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs p-fn-5 border">
      <div className="gap-fn-2 mb-fn-4 flex items-start">
        <HeartPulse className="text-fn-fg-muted mt-fn-0_5 h-fn-4 w-fn-4 shrink-0" />
        <div>
          <p className="text-fn-fg font-fn-semibold text-[15px]">{title}</p>
          <p className="text-fn-fg-muted mt-fn-0_5 text-[12.5px]">{hint}</p>
          {policy ? (
            <p className="text-fn-fg-faint mt-fn-1 text-[12px]">
              Active: {formatBenefitPkr(policy.amountPkr)} · v{policy.version}
              {policy.publishedByName ? ` · ${policy.publishedByName}` : ''}
            </p>
          ) : null}
        </div>
      </div>
      <div className="gap-fn-3 flex items-end">
        <div className="gap-fn-1_5 flex min-w-0 flex-1 flex-col">
          <Label htmlFor={`amount-${title}`}>Amount (PKR)</Label>
          <Input
            id={`amount-${title}`}
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
          />
        </div>
        <Button
          disabled={busy || !amount}
          onClick={() => {
            const n = Number(amount);
            if (!Number.isFinite(n) || n < 1) {
              toast.error('Enter a valid amount.');
              return;
            }
            onPublish(n);
          }}
        >
          Publish
        </Button>
      </div>
    </div>
  );
}
