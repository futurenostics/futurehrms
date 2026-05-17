'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type { EmployeePublic } from '@futurenostics/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useChangeManager, useEmployeesList } from '@/lib/queries/employees';

const NONE_VALUE = '__none__';

export function ChangeManagerDialog({
  open,
  onOpenChange,
  employee,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeePublic;
}) {
  const candidates = useEmployeesList({ limit: 200, sortBy: 'fullName', sortDir: 'asc' });
  const mutation = useChangeManager(employee.id);

  const [managerId, setManagerId] = React.useState<string>(employee.manager?.id ?? NONE_VALUE);
  const [remarks, setRemarks] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setManagerId(employee.manager?.id ?? NONE_VALUE);
      setRemarks('');
    }
  }, [open, employee.manager?.id]);

  const options = candidates.data?.items.filter((e) => e.id !== employee.id && !e.isArchived) ?? [];

  function submit() {
    if (managerId === (employee.manager?.id ?? NONE_VALUE)) {
      toast.error('Pick a different manager.');
      return;
    }
    mutation.mutate(
      {
        managerId: managerId === NONE_VALUE ? null : managerId,
        ...(remarks ? { remarks } : {}),
      },
      {
        onSuccess: () => {
          toast.success('Manager updated.');
          onOpenChange(false);
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change manager</DialogTitle>
          <DialogDescription>
            {employee.manager ? (
              <>
                Reassign {employee.fullName} from <strong>{employee.manager.fullName}</strong> to a
                different manager.
              </>
            ) : (
              <>Set a manager for {employee.fullName}.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="gap-fn-3 flex flex-col">
          <div className="gap-fn-1_5 flex flex-col">
            <Label htmlFor="manager">New manager</Label>
            <Select value={managerId} onValueChange={setManagerId}>
              <SelectTrigger id="manager">
                <SelectValue placeholder="Pick a manager…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>No manager (top-level)</SelectItem>
                {options.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.fullName} · {emp.designation.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="gap-fn-1_5 flex flex-col">
            <Label htmlFor="remarks">Remarks (optional)</Label>
            <Input
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Why is the manager changing?"
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Updating…' : 'Change manager'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
