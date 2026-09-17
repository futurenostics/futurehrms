'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import {
  DataTable,
  type DataTableColumn,
  type DataTableRowAction,
} from '@/components/ui/data-table';
import { Plus } from 'lucide-react';
import { useEmployeesList, useReferences } from '@/lib/queries/employees';
import { EmployeePicker } from '@/components/attendance/employee-picker';
import { ShiftAssignmentEditorSheet } from '@/components/attendance/shift-assignment-editor-sheet';
import {
  useDeleteShiftAssignment,
  useShiftAssignments,
  useShifts,
  type ShiftAssignmentPublic,
} from '@/lib/queries/attendance';

export interface ShiftAssignmentsTabProps {
  canManage: boolean;
}

export function ShiftAssignmentsTab({ canManage }: ShiftAssignmentsTabProps) {
  const [employeeFilter, setEmployeeFilter] = React.useState<string | null>(null);
  const [departmentFilter, setDepartmentFilter] = React.useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const query = {
    employeeId: employeeFilter ?? undefined,
    departmentId: departmentFilter ?? undefined,
  };
  const assignmentsQuery = useShiftAssignments(query);
  const shiftsQuery = useShifts();
  const refs = useReferences();
  const employeesQuery = useEmployeesList({ limit: 200, sortBy: 'fullName', sortDir: 'asc' });
  const remove = useDeleteShiftAssignment();

  const rows = assignmentsQuery.data?.items ?? [];

  const shiftNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const s of shiftsQuery.data?.items ?? []) m.set(s.id, s.name);
    return m;
  }, [shiftsQuery.data]);

  const employeeNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employeesQuery.data?.items ?? []) m.set(e.id, e.fullName);
    return m;
  }, [employeesQuery.data]);

  const departmentNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const d of refs.data?.departments ?? []) m.set(d.id, d.name);
    return m;
  }, [refs.data]);

  const departmentOptions = (refs.data?.departments ?? []).map((d) => ({
    value: d.id,
    label: d.name,
  }));

  async function handleDelete(assignment: ShiftAssignmentPublic): Promise<void> {
    if (!confirm('Remove this shift assignment?')) return;
    try {
      await remove.mutateAsync(assignment.id);
      toast.success('Assignment removed');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const columns = React.useMemo<DataTableColumn<ShiftAssignmentPublic>[]>(
    () => [
      {
        id: 'target',
        header: 'Assigned to',
        cell: (a) => (
          <span className="text-fn-fg font-fn-semibold text-[13px]">
            {a.employeeId
              ? (employeeNameById.get(a.employeeId) ?? '—')
              : (departmentNameById.get(a.departmentId ?? '') ?? '—')}
            <span className="text-fn-fg-faint ml-fn-1_5 font-fn-medium text-[11px] uppercase">
              {a.assignmentType === 'individual' ? 'Employee' : 'Department'}
            </span>
          </span>
        ),
      },
      {
        id: 'shift',
        header: 'Shift',
        width: 160,
        cell: (a) => (
          <span className="text-fn-fg-muted text-[12.5px]">
            {shiftNameById.get(a.shiftId) ?? '—'}
          </span>
        ),
      },
      {
        id: 'validity',
        header: 'Valid',
        width: 200,
        cell: (a) => (
          <span className="text-fn-fg-muted text-[12.5px] tabular-nums">
            {new Date(a.validFrom).toLocaleDateString()} –{' '}
            {a.validTo ? new Date(a.validTo).toLocaleDateString() : 'open-ended'}
          </span>
        ),
      },
      {
        id: 'priority',
        header: 'Priority',
        width: 90,
        align: 'right',
        cell: (a) => (
          <span className="text-fn-fg-muted text-[12.5px] tabular-nums">{a.priority}</span>
        ),
      },
    ],
    [employeeNameById, departmentNameById, shiftNameById],
  );

  const rowActions = React.useCallback(
    (a: ShiftAssignmentPublic): DataTableRowAction[] =>
      canManage
        ? [{ label: 'Remove', variant: 'destructive', onClick: () => void handleDelete(a) }]
        : [],
    [canManage],
  );

  return (
    <div className="gap-fn-4 flex flex-col">
      <div className="gap-fn-3 flex flex-wrap items-center justify-between">
        <p className="text-fn-fg-muted max-w-[560px] text-[13px]">
          Which employee or department uses which shift, and from when. An individual assignment
          beats a department assignment when both are active, by priority.
        </p>
        {canManage && (
          <Button size="md" onClick={() => setSheetOpen(true)}>
            <Plus className="h-fn-4 w-fn-4" /> Assign shift
          </Button>
        )}
      </div>

      <div className="gap-fn-2_5 flex flex-wrap items-center">
        <div className="w-[240px]">
          <EmployeePicker
            value={employeeFilter}
            onChange={(id) => {
              setEmployeeFilter(id);
              if (id) setDepartmentFilter(null);
            }}
            placeholder="Filter by employee"
          />
        </div>
        <div className="w-[220px]">
          <Combobox
            options={departmentOptions}
            value={departmentFilter ?? ''}
            onValueChange={(v) => {
              setDepartmentFilter(v || null);
              if (v) setEmployeeFilter(null);
            }}
            placeholder="Filter by department"
            loading={refs.isPending}
          />
        </div>
        {(employeeFilter || departmentFilter) && (
          <button
            type="button"
            onClick={() => {
              setEmployeeFilter(null);
              setDepartmentFilter(null);
            }}
            className="text-fn-accent-soft-fg font-fn-semibold cursor-pointer text-[12.5px] hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs overflow-hidden border">
        <DataTable<ShiftAssignmentPublic>
          chrome="plain"
          columns={columns}
          rows={rows}
          getRowKey={(a) => a.id}
          isLoading={assignmentsQuery.isPending}
          isError={assignmentsQuery.isError}
          onRetry={() => assignmentsQuery.refetch()}
          totalCount={rows.length}
          rowActions={rowActions}
          emptyState={
            <div className="gap-fn-2 py-fn-12 flex flex-col items-center text-center">
              <p className="text-fn-fg font-fn-semibold text-[14px]">No shift assignments</p>
              <p className="text-fn-fg-muted max-w-[360px] text-[12.5px]">
                {canManage
                  ? 'Assign a shift to an employee or a whole department to get started.'
                  : 'Ask HR to set up shift assignments.'}
              </p>
            </div>
          }
        />
      </div>

      {canManage && <ShiftAssignmentEditorSheet open={sheetOpen} onOpenChange={setSheetOpen} />}
    </div>
  );
}
