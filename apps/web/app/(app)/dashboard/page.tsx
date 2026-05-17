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
      <div className="gap-fn-6 mx-auto flex w-full max-w-6xl flex-col">
        <div className="gap-fn-1 flex flex-col">
          <h1 className="text-fn-fg font-fn-semibold tracking-fn-tight text-[22px]">
            Hello, {firstName}.
          </h1>
          <p className="text-fn-fg-muted text-[13px]">
            Welcome to Futurenostics HRMS. The dashboard fills out as the modules land in subsequent
            phases.
          </p>
        </div>

        {perms.has('employees:view_all') && (
          <div className="gap-fn-4 grid sm:grid-cols-2 lg:grid-cols-3">
            <TotalEmployeesWidget />
          </div>
        )}

        <Card>
          <CardHeader className="gap-fn-3 flex flex-row items-center">
            <div
              className="rounded-fn-md h-fn-10 w-fn-10 flex items-center justify-center"
              style={{
                background: 'var(--fn-icon-tile)',
                color: 'var(--fn-icon-tile-fg)',
              }}
            >
              <Sparkles className="h-fn-4 w-fn-4" />
            </div>
            <div className="gap-fn-0_5 flex flex-col">
              <CardTitle>Foundation ready</CardTitle>
              <p className="text-fn-fg-muted text-[13px]">
                Auth, RBAC, audit, design tokens, and shadcn primitives are wired.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="text-fn-fg-muted gap-fn-2 grid text-[13px]">
              <li>
                Signed in as <span className="text-fn-fg font-fn-medium">{user?.email}</span>
              </li>
              <li>
                Roles:{' '}
                <span className="text-fn-fg font-fn-medium">
                  {user?.roles.length ? user.roles.join(', ') : '—'}
                </span>
              </li>
              <li>
                Resolved permissions:{' '}
                <span className="text-fn-fg font-fn-medium tabular-nums">
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
