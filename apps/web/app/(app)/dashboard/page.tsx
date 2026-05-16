'use client';

import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppShell } from '@/components/shell/app-shell';
import { useUser } from '@/hooks/use-user';
import { usePermissions } from '@/hooks/use-permissions';
import { TotalEmployeesWidget } from '@/components/employees/widgets/total-employees-widget';

export default function DashboardPage() {
  const { data: user } = useUser();
  const perms = usePermissions();
  const firstName = user?.fullName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';

  return (
    <AppShell breadcrumbs={[{ label: 'Workspace' }, { label: 'Dashboard' }]}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-fn-fg text-[22px] font-semibold tracking-tight">
            Hello, {firstName}.
          </h1>
          <p className="text-fn-fg-muted text-[13px]">
            Welcome to Futurenostics HRMS. The dashboard fills out as the modules land in subsequent
            phases.
          </p>
        </div>

        {perms.has('employees:view_all') && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TotalEmployeesWidget />
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div
              className="rounded-fn-md flex h-10 w-10 items-center justify-center"
              style={{
                background: 'var(--fn-icon-tile)',
                color: 'var(--fn-icon-tile-fg)',
              }}
            >
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex flex-col gap-0.5">
              <CardTitle>Foundation ready</CardTitle>
              <p className="text-fn-fg-muted text-[13px]">
                Auth, RBAC, audit, design tokens, and shadcn primitives are wired.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="text-fn-fg-muted grid gap-2 text-[13px]">
              <li>
                Signed in as <span className="text-fn-fg font-medium">{user?.email}</span>
              </li>
              <li>
                Roles:{' '}
                <span className="text-fn-fg font-medium">
                  {user?.roles.length ? user.roles.join(', ') : '—'}
                </span>
              </li>
              <li>
                Resolved permissions:{' '}
                <span className="font-tabular text-fn-fg font-medium">
                  {user?.permissions.length ?? 0}
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
