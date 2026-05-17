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
import { useChangeSalary } from '@/lib/queries/employees';

export function ChangeSalaryDialog({
  open,
  onOpenChange,
  employee,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeePublic;
}) {
  const mutation = useChangeSalary(employee.id);
  const current = employee.salaryPkr ?? null;

  const [amount, setAmount] = React.useState('');
  const [effectiveDate, setEffectiveDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setAmount('');
      setEffectiveDate(new Date().toISOString().slice(0, 10));
      setRemarks('');
    }
  }, [open]);

  const parsed = Number(amount.replace(/[,\s]/g, ''));
  const valid = Number.isFinite(parsed) && parsed >= 0;
  const delta = valid && current != null ? parsed - current : null;
  const pct = valid && current != null && current > 0 ? (delta! / current) * 100 : null;

  function submit() {
    if (!valid) {
      toast.error('Enter a non-negative number.');
      return;
    }
    if (current != null && Math.abs(parsed - current) < 0.01) {
      toast.error('New salary equals current salary.');
      return;
    }
    mutation.mutate(
      {
        newSalaryPkr: parsed,
        effectiveDate: new Date(effectiveDate),
        ...(remarks ? { remarks } : {}),
      },
      {
        onSuccess: () => {
          toast.success('Salary updated.');
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
          <DialogTitle>Record salary change</DialogTitle>
          <DialogDescription>
            Capture a salary update for {employee.fullName}. A SalaryHistory entry is created and
            the audit log records the change.
          </DialogDescription>
        </DialogHeader>

        <div className="gap-fn-3 flex flex-col">
          {current != null && (
            <div className="rounded-fn-md border-fn-border bg-fn-bg-subtle text-fn-fg-muted px-fn-3 py-fn-2 border text-[12.5px]">
              Current salary:{' '}
              <span className="text-fn-fg font-fn-medium tabular-nums">{formatPkr(current)}</span>
            </div>
          )}
          <div className="gap-fn-1_5 flex flex-col">
            <Label htmlFor="newSalary">New salary (PKR)</Label>
            <Input
              id="newSalary"
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 250000"
              className="tabular-nums"
            />
            {valid && delta != null && (
              <div
                className={`text-[11.5px] tabular-nums ${delta >= 0 ? 'text-fn-success-soft-fg' : 'text-fn-danger-soft-fg'}`}
              >
                {delta >= 0 ? '+' : ''}
                {formatPkr(delta)}
                {pct != null ? ` (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)` : ''}
              </div>
            )}
          </div>
          <div className="gap-fn-1_5 flex flex-col">
            <Label htmlFor="effective">Effective date</Label>
            <Input
              id="effective"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>
          <div className="gap-fn-1_5 flex flex-col">
            <Label htmlFor="remarks">Reason (optional)</Label>
            <Input
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Annual increment, promotion, market correction…"
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending || !valid}>
            {mutation.isPending ? 'Recording…' : 'Record change'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatPkr(value: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(value);
}
