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
import { useChangeStatus, useReferences } from '@/lib/queries/employees';

// Mirrors the server-side STATUS_TRANSITIONS in employees.service.ts.
// Duplicated intentionally — the server is the source of truth (we'd
// never trust a client check alone); this just hides clearly-invalid
// options from the dropdown so users don't pick them in the first place.
const TRANSITIONS: Record<string, string[]> = {
  intern: ['probation', 'contractor', 'terminated'],
  probation: ['permanent', 'contractor', 'terminated', 'on-leave'],
  permanent: ['on-leave', 'terminated'],
  contractor: ['permanent', 'terminated'],
  'on-leave': ['permanent', 'terminated'],
  terminated: [],
};

export function ChangeStatusDialog({
  open,
  onOpenChange,
  employee,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeePublic;
}) {
  const refs = useReferences();
  const mutation = useChangeStatus(employee.id);

  const [statusId, setStatusId] = React.useState('');
  const [effectiveDate, setEffectiveDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setStatusId('');
      setEffectiveDate(new Date().toISOString().slice(0, 10));
      setRemarks('');
    }
  }, [open]);

  const allowedSlugs = new Set(TRANSITIONS[employee.status.slug] ?? []);
  const options = (refs.data?.statuses ?? []).filter(
    (s) => s.id !== employee.status.id && allowedSlugs.has(s.slug),
  );

  function submit() {
    if (!statusId) {
      toast.error('Pick a new status.');
      return;
    }
    mutation.mutate(
      {
        statusId,
        effectiveDate: new Date(effectiveDate),
        ...(remarks ? { remarks } : {}),
      },
      {
        onSuccess: () => {
          toast.success('Status updated.');
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
          <DialogTitle>Change status</DialogTitle>
          <DialogDescription>
            Move {employee.fullName} from <strong>{employee.status.name}</strong> to a different
            status. Only valid transitions are listed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">New status</Label>
            <Select value={statusId} onValueChange={setStatusId}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Pick a new status…" />
              </SelectTrigger>
              <SelectContent>
                {options.length === 0 && (
                  <div className="text-fn-fg-muted px-2 py-2 text-[12.5px]">
                    No valid transitions from {employee.status.name}.
                  </div>
                )}
                {options.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="effective">Effective date</Label>
            <Input
              id="effective"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="remarks">Remarks (optional)</Label>
            <Input
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Why is the status changing?"
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending || options.length === 0}>
            {mutation.isPending ? 'Updating…' : 'Change status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
