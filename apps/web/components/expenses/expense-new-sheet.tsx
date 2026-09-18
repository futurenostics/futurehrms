'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  EXPENSE_CLAIM_CATEGORIES,
  EXPENSE_MONTH_INPUT_MAX,
  EXPENSE_MONTH_INPUT_MIN,
  GYM_MONTH_ALREADY_APPROVED_MESSAGE,
  MEDICAL_SUBCATEGORIES,
  sanitizeExpenseMonthInput,
  type ExpenseClaimCategory,
  type ExpenseClaimCreateInput,
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
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { EXPENSE_COPY } from '@/components/expenses/expense-copy';
import { ExpenseDocumentPicker } from '@/components/expenses/expense-document-picker';
import { ExpenseBenefitBalances } from '@/components/expenses/expense-benefit-balances';
import { parsePkrAmount, sanitizePkrInput } from '@/components/expenses/expense-claim-status';
import {
  useCreateExpenseClaim,
  useSubmitExpenseClaim,
  uploadExpenseDocument,
} from '@/lib/queries/expenses';
import { useMyBenefitBalances } from '@/lib/queries/benefits';

export function NewExpenseSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateExpenseClaim();
  const submit = useSubmitExpenseClaim();
  const [category, setCategory] = React.useState<ExpenseClaimCategory | ''>('');
  const [medicalSub, setMedicalSub] = React.useState<MedicalSubcategory>('doctor_consultation');
  const [amount, setAmount] = React.useState('');
  const [expenseMonth, setExpenseMonth] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [files, setFiles] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);
  const needBalances = open && !!expenseMonth && (category === 'medical' || category === 'gym');
  const balances = useMyBenefitBalances(expenseMonth || undefined, needBalances);

  React.useEffect(() => {
    if (!open) {
      setCategory('');
      setMedicalSub('doctor_consultation');
      setAmount('');
      setExpenseMonth('');
      setNotes('');
      setFiles([]);
    }
  }, [open]);

  async function submitNew() {
    if (!category) {
      toast.error('Select a category.');
      return;
    }
    if (!expenseMonth) {
      toast.error(EXPENSE_COPY.expenseMonthRequired);
      return;
    }
    const amountPkr = parsePkrAmount(amount);
    if (!Number.isFinite(amountPkr) || amountPkr <= 0) {
      toast.error(EXPENSE_COPY.amountInvalid);
      return;
    }
    const gymMax = balances.data?.gym.allocatedPkr;
    if (category === 'gym' && gymMax != null && amountPkr > gymMax) {
      toast.error(`Gym reimbursement cannot exceed ₨${gymMax.toLocaleString('en-PK')} per claim.`);
      return;
    }
    if (!notes.trim()) {
      toast.error(EXPENSE_COPY.descriptionRequired);
      return;
    }
    if (files.length < 1) {
      toast.error(EXPENSE_COPY.documentsRequired);
      return;
    }

    const shared = {
      amountPkr,
      currency: 'PKR' as const,
      expenseDate: expenseMonth,
      notes: notes.trim(),
    };

    let input: ExpenseClaimCreateInput;
    if (category === 'medical') {
      input = {
        category: 'medical',
        ...shared,
        details: { subCategory: medicalSub },
      };
    } else if (category === 'gym') {
      input = { category: 'gym', ...shared, details: {} };
    } else if (category === 'travel') {
      input = { category: 'travel', ...shared, details: {} };
    } else {
      input = { category: 'business_development', ...shared, details: {} };
    }

    setBusy(true);
    try {
      const created = await create.mutateAsync(input);
      for (const f of files) {
        await uploadExpenseDocument(created.id, f);
      }
      const submitted = await submit.mutateAsync(created.id);
      for (const warning of submitted.warnings ?? []) {
        toast.warning(warning);
      }
      toast.success(EXPENSE_COPY.submitSuccess);
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{EXPENSE_COPY.newExpense}</SheetTitle>
          <SheetDescription>Category, month, amount, description, and a receipt.</SheetDescription>
        </SheetHeader>
        <SheetBody className="gap-fn-4 flex flex-col">
          <div className="gap-fn-1_5 flex flex-col">
            <Label>
              {EXPENSE_COPY.categoryLabel}
              <span className="text-fn-danger ml-fn-1">*</span>
            </Label>
            <Select
              value={category || undefined}
              onValueChange={(v) => setCategory(v as ExpenseClaimCategory)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CLAIM_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {category === 'medical' && (
            <div className="gap-fn-1_5 flex flex-col">
              <Label>
                {EXPENSE_COPY.medicalSubLabel}
                <span className="text-fn-danger ml-fn-1">*</span>
              </Label>
              <Select
                value={medicalSub}
                onValueChange={(v) => setMedicalSub(v as MedicalSubcategory)}
              >
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
          )}

          {category ? (
            <>
              <div className="gap-fn-1_5 flex flex-col">
                <Label htmlFor="expense-month">
                  {EXPENSE_COPY.expenseMonthLabel}
                  <span className="text-fn-danger ml-fn-1">*</span>
                </Label>
                <Input
                  id="expense-month"
                  type="month"
                  min={EXPENSE_MONTH_INPUT_MIN}
                  max={EXPENSE_MONTH_INPUT_MAX}
                  value={expenseMonth}
                  onChange={(e) => setExpenseMonth(sanitizeExpenseMonthInput(e.target.value))}
                />
              </div>

              {needBalances && balances.data ? (
                <ExpenseBenefitBalances
                  balances={balances.data}
                  compact
                  show={category === 'gym' ? 'gym' : 'medical'}
                />
              ) : null}
              {category === 'gym' && expenseMonth && balances.data?.gym.monthLocked ? (
                <p className="text-fn-danger text-[12.5px]">{GYM_MONTH_ALREADY_APPROVED_MESSAGE}</p>
              ) : null}

              <div className="gap-fn-1_5 flex flex-col">
                <Label htmlFor="amount">
                  {EXPENSE_COPY.amountLabel}
                  <span className="text-fn-danger ml-fn-1">*</span>
                </Label>
                <Input
                  id="amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(sanitizePkrInput(e.target.value))}
                />
                {category === 'gym' && balances.data ? (
                  <p className="text-fn-fg-faint text-[12px]">
                    Maximum ₨{balances.data.gym.allocatedPkr.toLocaleString('en-PK')} per claim.
                  </p>
                ) : null}
              </div>

              <div className="gap-fn-1_5 flex flex-col">
                <Label htmlFor="notes">
                  {EXPENSE_COPY.descriptionLabel}
                  <span className="text-fn-danger ml-fn-1">*</span>
                </Label>
                <Textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={EXPENSE_COPY.descriptionPlaceholder}
                />
              </div>

              <div className="gap-fn-1_5 flex flex-col">
                <Label>
                  {EXPENSE_COPY.documentsLabel}
                  <span className="text-fn-danger ml-fn-1">*</span>
                </Label>
                <ExpenseDocumentPicker files={files} onFilesChange={setFiles} disabled={busy} />
              </div>
            </>
          ) : null}
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void submitNew()}
            disabled={
              busy ||
              !category ||
              (category === 'gym' && !!expenseMonth && balances.data?.gym.monthLocked)
            }
          >
            {EXPENSE_COPY.submitToFinance}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
