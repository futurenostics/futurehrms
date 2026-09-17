'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useReferences } from '@/lib/queries/employees';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { EmployeePicker } from '@/components/attendance/employee-picker';
import { useCreateShiftAssignment, useShifts } from '@/lib/queries/attendance';

export interface ShiftAssignmentEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TargetType = 'employee' | 'department';

function todayDateValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ShiftAssignmentEditorSheet({
  open,
  onOpenChange,
}: ShiftAssignmentEditorSheetProps) {
  const refs = useReferences();
  const shiftsQuery = useShifts();
  const create = useCreateShiftAssignment();

  const [targetType, setTargetType] = React.useState<TargetType>('employee');
  const [employeeId, setEmployeeId] = React.useState<string | null>(null);
  const [departmentId, setDepartmentId] = React.useState<string | null>(null);
  const [shiftId, setShiftId] = React.useState('');
  const [validFrom, setValidFrom] = React.useState(todayDateValue());
  const [validTo, setValidTo] = React.useState('');
  const [priority, setPriority] = React.useState('');

  React.useEffect(() => {
    if (open) return;
    setTargetType('employee');
    setEmployeeId(null);
    setDepartmentId(null);
    setShiftId('');
    setValidFrom(todayDateValue());
    setValidTo('');
    setPriority('');
  }, [open]);

  const activeShiftOptions = (shiftsQuery.data?.items ?? [])
    .filter((s) => s.isActive)
    .map((s) => ({ value: s.id, label: `${s.name} (${s.startTime}–${s.endTime})` }));

  const departmentOptions = (refs.data?.departments ?? []).map((d) => ({
    value: d.id,
    label: d.name,
  }));

  const canSave =
    !create.isPending &&
    !!shiftId &&
    !!validFrom &&
    (targetType === 'employee' ? !!employeeId : !!departmentId) &&
    (!validTo || validTo > validFrom);

  async function handleSave(): Promise<void> {
    try {
      await create.mutateAsync({
        employeeId: targetType === 'employee' ? employeeId : null,
        departmentId: targetType === 'department' ? departmentId : null,
        shiftId,
        validFrom: new Date(validFrom).toISOString(),
        validTo: validTo ? new Date(validTo).toISOString() : null,
        priority: priority ? Number(priority) : undefined,
      });
      toast.success('Shift assigned');
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="md">
        <SheetHeader>
          <SheetTitle>Assign a shift</SheetTitle>
        </SheetHeader>

        <SheetBody>
          <div className="gap-fn-4 flex flex-col">
            <Field label="Assign to">
              <Select
                value={targetType}
                onValueChange={(v) => setTargetType(v as TargetType)}
                disabled={create.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">An employee</SelectItem>
                  <SelectItem value="department">A department</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {targetType === 'employee' ? (
              <Field label="Employee">
                <EmployeePicker
                  value={employeeId}
                  onChange={setEmployeeId}
                  disabled={create.isPending}
                />
              </Field>
            ) : (
              <Field label="Department">
                <Combobox
                  options={departmentOptions}
                  value={departmentId ?? ''}
                  onValueChange={(v) => setDepartmentId(v || null)}
                  loading={refs.isPending}
                  placeholder="Select department"
                  disabled={create.isPending}
                />
              </Field>
            )}

            <Field label="Shift">
              <Combobox
                options={activeShiftOptions}
                value={shiftId}
                onValueChange={setShiftId}
                loading={shiftsQuery.isPending}
                placeholder="Select shift"
                emptyLabel="active shifts"
                disabled={create.isPending}
              />
            </Field>

            <div className="gap-fn-3 grid grid-cols-2">
              <Field label="Valid from">
                <Input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  disabled={create.isPending}
                />
              </Field>
              <Field label="Valid to" hint="Optional — open-ended if blank">
                <Input
                  type="date"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                  disabled={create.isPending}
                />
              </Field>
            </div>

            <Field
              label="Priority"
              hint="Higher wins when an employee and their department both have an assignment. Defaults to 10 (individual) / 0 (department)."
            >
              <Input
                type="number"
                min={0}
                max={100}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={create.isPending}
                placeholder="Auto"
              />
            </Field>
          </div>
        </SheetBody>

        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={!canSave} className="ml-auto">
            Assign
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="gap-fn-1 flex flex-col">
      <Label className="text-fn-fg-muted text-[12px]">{label}</Label>
      {children}
      {hint && <p className="text-fn-fg-faint text-[11px]">{hint}</p>}
    </div>
  );
}
