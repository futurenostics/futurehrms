'use client';

import { HeartPulse } from 'lucide-react';
import { AppShell } from '@/components/shell/app-shell';
import { OpdClaimsPanel } from '@/components/opd/opd-claims-panel';
import { OPD_COPY } from '@/components/opd/opd-copy';
import { usePermissions } from '@/hooks/use-permissions';

export default function OpdClaimsListPage() {
  const perms = usePermissions();
  const canViewAll = perms.has('opd:view_all');

  if (!canViewAll && !perms.has('opd:view_own')) {
    return (
      <AppShell breadcrumbs={[{ label: 'HR Core' }, { label: OPD_COPY.moduleName }]}>
        <div className="gap-fn-3 py-fn-16 flex flex-col items-center text-center">
          <HeartPulse className="text-fn-fg-faint h-fn-8 w-fn-8" />
          <p className="text-fn-fg font-fn-semibold">{OPD_COPY.noAccessTitle}</p>
          <p className="text-fn-fg-muted max-w-[420px] text-[13px]">{OPD_COPY.noAccessBody}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumbs={[{ label: 'HR Core' }, { label: OPD_COPY.moduleName }]}>
      <div className="gap-fn-5 mx-auto flex w-full max-w-6xl flex-col">
        <div>
          <h1 className="text-fn-fg font-fn-semibold tracking-fn-tight text-[26px]">
            {OPD_COPY.moduleName}
          </h1>
          <p className="text-fn-fg-muted mt-fn-1 text-[13.5px]">
            {canViewAll ? OPD_COPY.listIntroAll : OPD_COPY.pageIntroOwn}
          </p>
        </div>
        <OpdClaimsPanel mine={!canViewAll} />
      </div>
    </AppShell>
  );
}
