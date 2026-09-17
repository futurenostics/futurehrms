'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import {
  useCreateShift,
  useUpdateShift,
  type ShiftFormInput,
  type ShiftPublic,
} from '@/lib/queries/attendance';

export interface ShiftEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create mode. */
  shift: ShiftPublic | null;
}

const EMPTY_FORM: ShiftFormInput = {
  name: '',
  startTime: '09:00',
  endTime: '18:00',
  gracePeriodMinutes: 15,
  halfDayThresholdMinutes: 120,
  breakDurationMinutes: 0,
  overtimeType: 'auto',
  overtimeThresholdMinutes: 30,
};

export function ShiftEditorSheet({ open, onOpenChange, shift }: ShiftEditorSheetProps) {
  const isNew = shift === null;
  const create = useCreateShift();
  const update = useUpdateShift();
  const busy = create.isPending || update.isPending;

  const [form, setForm] = React.useState<ShiftFormInput>(EMPTY_FORM);

  React.useEffect(() => {
    if (!open) return;
    setForm(
      shift
        ? {
            name: shift.name,
            startTime: shift.startTime,
            endTime: shift.endTime,
            gracePeriodMinutes: shift.gracePeriodMinutes,
            halfDayThresholdMinutes: shift.halfDayThresholdMinutes,
            breakDurationMinutes: shift.breakDurationMinutes,
            overtimeType: shift.overtimeType,
            overtimeThresholdMinutes: shift.overtimeThresholdMinutes,
          }
        : EMPTY_FORM,
    );
  }, [open, shift]);

  const canSave = !busy && form.name.trim().length > 0 && !!form.startTime && !!form.endTime;

  async function handleSave(): Promise<void> {
    try {
      if (isNew) {
        await create.mutateAsync({ ...form, name: form.name.trim() });
        toast.success(`Created "${form.name.trim()}"`);
      } else {
        await update.mutateAsync({ id: shift.id, input: { ...form, name: form.name.trim() } });
        toast.success('Shift updated');
      }
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="md">
        <SheetHeader>
          <SheetTitle>{isNew ? 'New shift' : `Editing ${shift.name}`}</SheetTitle>
        </SheetHeader>

        <SheetBody>
          <div className="gap-fn-4 flex flex-col">
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                disabled={busy}
                placeholder="General shift"
              />
            </Field>

            <div className="gap-fn-3 grid grid-cols-2">
              <Field label="Start time">
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                  disabled={busy}
                />
              </Field>
              <Field label="End time">
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                  disabled={busy}
                />
              </Field>
            </div>

            <div className="gap-fn-3 grid grid-cols-2">
              <Field label="Grace period (min)" hint="Late arrival tolerance">
                <Input
                  type="number"
                  min={0}
                  value={form.gracePeriodMinutes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, gracePeriodMinutes: Number(e.target.value) }))
                  }
                  disabled={busy}
                />
              </Field>
              <Field label="Half-day threshold (min)" hint="Minutes late before half-day">
                <Input
                  type="number"
                  min={0}
                  value={form.halfDayThresholdMinutes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, halfDayThresholdMinutes: Number(e.target.value) }))
                  }
                  disabled={busy}
                />
              </Field>
            </div>

            <div className="gap-fn-3 grid grid-cols-2">
              <Field label="Break duration (min)">
                <Input
                  type="number"
                  min={0}
                  value={form.breakDurationMinutes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, breakDurationMinutes: Number(e.target.value) }))
                  }
                  disabled={busy}
                />
              </Field>
              <Field label="Overtime threshold (min)">
                <Input
                  type="number"
                  min={0}
                  value={form.overtimeThresholdMinutes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, overtimeThresholdMinutes: Number(e.target.value) }))
                  }
                  disabled={busy}
                />
              </Field>
            </div>

            <Field label="Overtime type">
              <Select
                value={form.overtimeType}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, overtimeType: v as ShiftFormInput['overtimeType'] }))
                }
                disabled={busy}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="approval_based">Approval-based</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </SheetBody>

        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={!canSave} className="ml-auto">
            {isNew ? 'Create shift' : 'Save changes'}
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
