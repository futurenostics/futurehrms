'use client';

import * as React from 'react';
import { Building2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/shell/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DataTable,
  type DataTableColumn,
  type DataTableRowAction,
} from '@/components/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { usePermissions } from '@/hooks/use-permissions';
import { DepartmentEditorSheet } from '@/components/settings/department-editor-sheet';
import {
  useDepartments,
  useHideDepartment,
  useRestoreDepartment,
  type DepartmentPublic,
} from '@/lib/queries/departments';

type RestoreTarget = { id: string; name: string; reason: 'clash' | 'explicit' };

export default function DepartmentsSettingsPage() {
  const perms = usePermissions();
  const canView = perms.has('settings:departments:view');
  const canManage = perms.has('settings:departments:manage');

  const [includeHidden, setIncludeHidden] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DepartmentPublic | null>(null);
  const [hideTarget, setHideTarget] = React.useState<DepartmentPublic | null>(null);
  const [restoreTarget, setRestoreTarget] = React.useState<RestoreTarget | null>(null);

  const query = useDepartments(includeHidden);
  const hide = useHideDepartment();
  const restore = useRestoreDepartment();

  const rows = query.data?.items ?? [];

  function openCreate(): void {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(dept: DepartmentPublic): void {
    setEditing(dept);
    setSheetOpen(true);
  }

  function handleHiddenNameClash(hiddenId: string, name: string): void {
    setRestoreTarget({ id: hiddenId, name, reason: 'clash' });
  }

  async function confirmHide(): Promise<void> {
    if (!hideTarget) return;
    try {
      await hide.mutateAsync(hideTarget.id);
      toast.success(`Hid "${hideTarget.name}"`);
      setHideTarget(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function confirmRestore(): Promise<void> {
    if (!restoreTarget) return;
    try {
      await restore.mutateAsync(restoreTarget.id);
      toast.success(`Restored "${restoreTarget.name}"`);
      setRestoreTarget(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const columns = React.useMemo<DataTableColumn<DepartmentPublic>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        cell: (d) => (
          <div className="gap-fn-2 flex items-center">
            <span className="text-fn-fg font-fn-semibold text-[13px]">{d.name}</span>
            {d.hiddenAt && <Badge tone="warning">Hidden</Badge>}
          </div>
        ),
      },
      {
        id: 'head',
        header: 'Head',
        width: 200,
        cell: (d) =>
          d.head ? (
            <span className="text-fn-fg text-[12.5px]">{d.head.fullName}</span>
          ) : (
            <span className="text-fn-fg-faint text-[12.5px]">&mdash;</span>
          ),
      },
      {
        id: 'employees',
        header: 'Employees',
        width: 120,
        align: 'right',
        cell: (d) => (
          <span className="text-fn-fg-muted text-[12.5px] tabular-nums">{d.employeeCount}</span>
        ),
      },
    ],
    [],
  );

  const rowActions = React.useCallback(
    (dept: DepartmentPublic): DataTableRowAction[] => {
      if (!canManage) return [];
      if (dept.hiddenAt) {
        return [
          {
            label: 'Restore',
            onClick: () => setRestoreTarget({ id: dept.id, name: dept.name, reason: 'explicit' }),
          },
        ];
      }
      return [
        { label: 'Rename', onClick: () => openEdit(dept) },
        {
          label: 'Hide',
          variant: 'destructive',
          onClick: () => setHideTarget(dept),
        },
      ];
    },
    [canManage],
  );

  if (!canView) {
    return (
      <AppShell breadcrumbs={[{ label: 'Settings' }, { label: 'Departments' }]}>
        <div className="gap-fn-2 py-fn-16 flex flex-col items-center text-center">
          <p className="text-fn-fg font-fn-semibold text-[14px]">Restricted</p>
          <p className="text-fn-fg-muted max-w-[360px] text-[12.5px]">
            You don&rsquo;t have permission to view departments.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumbs={[{ label: 'Settings' }, { label: 'Departments' }]}>
      <div className="gap-fn-5 mx-auto flex w-full max-w-[1120px] flex-col">
        <div className="flex items-start justify-between">
          <div className="gap-fn-1_5 flex flex-col">
            <h1
              className="text-fn-fg font-fn-semibold text-[22px]"
              style={{ letterSpacing: '-0.02em' }}
            >
              Departments
            </h1>
            <p className="text-fn-fg-muted max-w-[560px] text-[13px]">
              The departments employees, job titles, and projects belong to. Hiding a department
              keeps its history intact — it just stops it from being assigned to anyone new.
            </p>
          </div>
          {canManage && (
            <Button size="md" onClick={openCreate}>
              <Plus className="h-fn-4 w-fn-4" /> New department
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="gap-fn-2 flex items-center">
            <Switch
              id="show-hidden-departments"
              checked={includeHidden}
              onCheckedChange={setIncludeHidden}
            />
            <Label htmlFor="show-hidden-departments" className="text-fn-fg-muted text-[12.5px]">
              Show hidden departments
            </Label>
          </div>
        </div>

        <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs overflow-hidden border">
          <DataTable<DepartmentPublic>
            chrome="plain"
            columns={columns}
            rows={rows}
            getRowKey={(d) => d.id}
            isLoading={query.isPending}
            isError={query.isError}
            onRetry={() => query.refetch()}
            totalCount={rows.length}
            onRowClick={canManage ? (d) => (!d.hiddenAt ? openEdit(d) : undefined) : undefined}
            rowActions={rowActions}
            emptyState={
              <EmptyState
                icon={<Building2 className="h-fn-6 w-fn-6" />}
                title="No departments yet"
                description={
                  canManage
                    ? 'Create the first department so employees and job titles have somewhere to belong.'
                    : 'Ask an admin to set up departments.'
                }
                actions={
                  canManage && (
                    <Button size="sm" onClick={openCreate}>
                      <Plus className="h-fn-3_5 w-fn-3_5" /> New department
                    </Button>
                  )
                }
              />
            }
          />
        </div>
      </div>

      {canManage && (
        <DepartmentEditorSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          department={editing}
          onHiddenNameClash={handleHiddenNameClash}
        />
      )}

      <Dialog open={!!hideTarget} onOpenChange={(open) => !open && setHideTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {hideTarget && hideTarget.employeeCount > 0
                ? 'Still in use'
                : `Hide "${hideTarget?.name}"?`}
            </DialogTitle>
            <DialogDescription>
              {hideTarget && hideTarget.employeeCount > 0
                ? `${hideTarget.name} still has ${hideTarget.employeeCount} employee(s). Move them to another department before hiding it.`
                : 'It stops appearing in pickers, but existing history that references it is unaffected. You can restore it later.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setHideTarget(null)}>
              Cancel
            </Button>
            {hideTarget && hideTarget.employeeCount === 0 && (
              <Button
                variant="destructive"
                onClick={() => void confirmHide()}
                disabled={hide.isPending}
              >
                Hide department
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!restoreTarget} onOpenChange={(open) => !open && setRestoreTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore &ldquo;{restoreTarget?.name}&rdquo;?</DialogTitle>
            <DialogDescription>
              {restoreTarget?.reason === 'clash'
                ? `A hidden department is already named "${restoreTarget.name}". Restore it instead of creating a duplicate.`
                : 'It becomes available again in every department picker.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRestoreTarget(null)}>
              Cancel
            </Button>
            <Button onClick={() => void confirmRestore()} disabled={restore.isPending}>
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
