'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DataTable,
  type DataTableColumn,
  type DataTableRowAction,
} from '@/components/ui/data-table';
import { useSetShiftActive, useShifts, type ShiftPublic } from '@/lib/queries/attendance';
import { ShiftEditorSheet } from '@/components/attendance/shift-editor-sheet';

export interface ShiftsTabProps {
  canManage: boolean;
}

export function ShiftsTab({ canManage }: ShiftsTabProps) {
  const shiftsQuery = useShifts();
  const setActive = useSetShiftActive();
  const [editing, setEditing] = React.useState<ShiftPublic | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const rows = shiftsQuery.data?.items ?? [];

  function openCreate(): void {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(shift: ShiftPublic): void {
    setEditing(shift);
    setSheetOpen(true);
  }

  async function handleToggleActive(shift: ShiftPublic, next: boolean): Promise<void> {
    try {
      await setActive.mutateAsync({ id: shift.id, isActive: next });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const columns = React.useMemo<DataTableColumn<ShiftPublic>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        cell: (s) => <span className="text-fn-fg font-fn-semibold text-[13px]">{s.name}</span>,
      },
      {
        id: 'hours',
        header: 'Hours',
        width: 140,
        cell: (s) => (
          <span className="text-fn-fg-muted text-[12.5px] tabular-nums">
            {s.startTime} – {s.endTime}
          </span>
        ),
      },
      {
        id: 'grace',
        header: 'Grace period',
        width: 120,
        align: 'right',
        cell: (s) => (
          <span className="text-fn-fg-muted text-[12.5px] tabular-nums">
            {s.gracePeriodMinutes}m
          </span>
        ),
      },
      {
        id: 'overtime',
        header: 'Overtime',
        width: 140,
        cell: (s) => (
          <span className="text-fn-fg-muted text-[12.5px]">
            {s.overtimeType === 'auto' ? 'Auto' : 'Approval-based'}
          </span>
        ),
      },
      {
        id: 'active',
        header: 'Active',
        width: 90,
        cell: (s) => (
          <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
            <Switch
              checked={s.isActive}
              disabled={!canManage || setActive.isPending}
              onCheckedChange={(next) => void handleToggleActive(s, next)}
              aria-label={`${s.isActive ? 'Deactivate' : 'Activate'} ${s.name}`}
            />
          </div>
        ),
      },
    ],
    [canManage, setActive.isPending],
  );

  const rowActions = React.useCallback(
    (shift: ShiftPublic): DataTableRowAction[] =>
      canManage ? [{ label: 'Edit', onClick: () => openEdit(shift) }] : [],
    [canManage],
  );

  return (
    <div className="gap-fn-4 flex flex-col">
      <div className="flex items-center justify-between">
        <p className="text-fn-fg-muted max-w-[560px] text-[13px]">
          Work-schedule definitions employees are assigned to. Deactivating a shift keeps history
          intact — it just stops new assignments from using it.
        </p>
        {canManage && (
          <Button size="md" onClick={openCreate}>
            <Plus className="h-fn-4 w-fn-4" /> New shift
          </Button>
        )}
      </div>

      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs overflow-hidden border">
        <DataTable<ShiftPublic>
          chrome="plain"
          columns={columns}
          rows={rows}
          getRowKey={(s) => s.id}
          isLoading={shiftsQuery.isPending}
          isError={shiftsQuery.isError}
          onRetry={() => shiftsQuery.refetch()}
          totalCount={rows.length}
          onRowClick={canManage ? (s) => openEdit(s) : undefined}
          rowActions={rowActions}
          emptyState={
            <div className="gap-fn-2 py-fn-12 flex flex-col items-center text-center">
              <p className="text-fn-fg font-fn-semibold text-[14px]">No shifts yet</p>
              <p className="text-fn-fg-muted max-w-[360px] text-[12.5px]">
                {canManage
                  ? 'Create the first shift so employees can be assigned to it.'
                  : 'Ask HR to set up shifts.'}
              </p>
            </div>
          }
        />
      </div>

      {canManage && (
        <ShiftEditorSheet open={sheetOpen} onOpenChange={setSheetOpen} shift={editing} />
      )}
    </div>
  );
}
