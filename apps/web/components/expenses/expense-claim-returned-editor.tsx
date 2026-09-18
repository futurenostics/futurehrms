'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  EXPENSE_MONTH_INPUT_MAX,
  EXPENSE_MONTH_INPUT_MIN,
  MEDICAL_SUBCATEGORIES,
  sanitizeExpenseMonthInput,
  type ExpenseClaimDetail,
  type MedicalSubcategory,
} from '@futurenostics/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EXPENSE_COPY } from '@/components/expenses/expense-copy';
import { parsePkrAmount, sanitizePkrInput } from '@/components/expenses/expense-claim-status';
import { useUpdateExpenseClaim } from '@/lib/queries/expenses';

function expenseMonthValue(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 7);
}

export function ExpenseClaimReturnedEditor({ claim }: { claim: ExpenseClaimDetail }) {
  const update = useUpdateExpenseClaim(claim.id);
  const details = claim.details as { subCategory?: string } | null;
  const [amount, setAmount] = React.useState(String(claim.amountPkr));
  const [expenseMonth, setExpenseMonth] = React.useState(expenseMonthValue(claim.expenseDate));
  const [notes, setNotes] = React.useState(claim.notes ?? '');
  const [medicalSub, setMedicalSub] = React.useState<MedicalSubcategory>(
    (details?.subCategory as MedicalSubcategory) ?? 'doctor_consultation',
  );

  React.useEffect(() => {
    setAmount(String(claim.amountPkr));
    setExpenseMonth(expenseMonthValue(claim.expenseDate));
    setNotes(claim.notes ?? '');
    if (claim.category === 'medical' && details?.subCategory) {
      setMedicalSub(details.subCategory as MedicalSubcategory);
    }
  }, [claim, details?.subCategory]);

  async function save() {
    const amountPkr = parsePkrAmount(amount);
    if (!Number.isFinite(amountPkr) || amountPkr <= 0) {
      toast.error(EXPENSE_COPY.amountInvalid);
      return;
    }
    if (!expenseMonth) {
      toast.error(EXPENSE_COPY.expenseMonthRequired);
      return;
    }
    if (!notes.trim()) {
      toast.error(EXPENSE_COPY.descriptionRequired);
      return;
    }

    const payload =
      claim.category === 'medical'
        ? {
            amountPkr,
            expenseDate: expenseMonth,
            notes: notes.trim(),
            details: { subCategory: medicalSub },
          }
        : {
            amountPkr,
            expenseDate: expenseMonth,
            notes: notes.trim(),
            details: {},
          };

    try {
      await update.mutateAsync(payload);
      toast.success(EXPENSE_COPY.saveChangesSuccess);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="gap-fn-4 flex flex-col">
      {claim.category === 'medical' ? (
        <div className="gap-fn-1_5 flex flex-col">
          <Label>{EXPENSE_COPY.medicalSubLabel}</Label>
          <Select value={medicalSub} onValueChange={(v) => setMedicalSub(v as MedicalSubcategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEDICAL_SUBCATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="gap-fn-1_5 flex flex-col">
        <Label htmlFor="returned-expense-month">{EXPENSE_COPY.expenseMonthLabel}</Label>
        <Input
          id="returned-expense-month"
          type="month"
          min={EXPENSE_MONTH_INPUT_MIN}
          max={EXPENSE_MONTH_INPUT_MAX}
          value={expenseMonth}
          onChange={(e) => setExpenseMonth(sanitizeExpenseMonthInput(e.target.value))}
        />
      </div>
      <div className="gap-fn-1_5 flex flex-col">
        <Label htmlFor="returned-amount">{EXPENSE_COPY.amountLabel}</Label>
        <Input
          id="returned-amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(sanitizePkrInput(e.target.value))}
        />
      </div>
      <div className="gap-fn-1_5 flex flex-col">
        <Label htmlFor="returned-notes">{EXPENSE_COPY.descriptionLabel}</Label>
        <Textarea
          id="returned-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <Button variant="outline" disabled={update.isPending} onClick={() => void save()}>
        {EXPENSE_COPY.saveChanges}
      </Button>
    </div>
  );
}
