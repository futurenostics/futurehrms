'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type { OpdClaimCategory, OpdClaimPublic } from '@futurenostics/types';
import { OPD_CLAIM_CATEGORIES } from '@futurenostics/types';
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
import { OpdFinanceOutcomeBanner } from '@/components/opd/opd-finance-outcome';
import { OPD_COPY } from '@/components/opd/opd-copy';
import {
  validateOpdBillAmountPkr,
  validateOpdClaimForSubmit,
} from '@/components/opd/opd-claim-validation';
import { parsePkrAmount, sanitizePkrInput } from '@/components/opd/opd-pkr-input';
import { useSubmitOpdClaim, useUpdateOpdClaim } from '@/lib/queries/opd';
import { OpdDocumentsSection } from '@/components/opd/opd-documents';

function visitDateInputValue(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

/** Returned claims: edit fields, manage documents, resubmit. */
export function OpdClaimDraftEditor({ claim }: { claim: OpdClaimPublic }) {
  const update = useUpdateOpdClaim(claim.id);
  const submit = useSubmitOpdClaim();

  const [category, setCategory] = React.useState<OpdClaimCategory>(claim.category);
  const [medicine, setMedicine] = React.useState(String(claim.medicineCostPkr));
  const [visitDate, setVisitDate] = React.useState(visitDateInputValue(claim.visitDate));
  const [description, setDescription] = React.useState(claim.notes ?? '');

  React.useEffect(() => {
    setCategory(claim.category);
    setMedicine(String(claim.medicineCostPkr));
    setVisitDate(visitDateInputValue(claim.visitDate));
    setDescription(claim.notes ?? '');
  }, [claim.id, claim.category, claim.medicineCostPkr, claim.visitDate, claim.notes]);

  async function saveFields() {
    const medicineCostPkr = parsePkrAmount(medicine);
    const billErr = validateOpdBillAmountPkr(medicineCostPkr);
    if (billErr) {
      toast.error(billErr);
      return;
    }
    try {
      await update.mutateAsync({
        category,
        medicineCostPkr,
        visitDate: visitDate || null,
        notes: description.trim() || null,
      });
      toast.success(OPD_COPY.saveChangesSuccess);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="gap-fn-4 flex flex-col">
      <OpdFinanceOutcomeBanner claim={claim} />

      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-4 px-fn-5 py-fn-4 border">
        <div>
          <h2 className="text-fn-fg font-fn-semibold text-[14px]">{OPD_COPY.editReturnedTitle}</h2>
          <p className="text-fn-fg-muted mt-fn-0_5 text-[12px]">{OPD_COPY.editReturnedHint}</p>
        </div>
        <div className="gap-fn-4 flex flex-col">
          <Field label={OPD_COPY.categoryLabel} required>
            <Select value={category} onValueChange={(v) => setCategory(v as OpdClaimCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPD_CLAIM_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={OPD_COPY.billAmountLabel} required>
            <Input
              inputMode="decimal"
              value={medicine}
              onChange={(e) => setMedicine(sanitizePkrInput(e.target.value))}
              placeholder="e.g. 4500"
            />
          </Field>
          <Field label={OPD_COPY.visitDateLabel} required>
            <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          </Field>
          <Field label={OPD_COPY.descriptionLabel} required>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={OPD_COPY.descriptionPlaceholder}
            />
          </Field>
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            disabled={update.isPending}
            onClick={() => void saveFields()}
          >
            {OPD_COPY.saveChanges}
          </Button>
        </div>
      </div>

      <OpdDocumentsSection claim={claim} editable />

      <div className="gap-fn-2 flex flex-wrap">
        <Button
          size="sm"
          disabled={submit.isPending}
          onClick={async () => {
            const err = validateOpdClaimForSubmit({
              visitDate,
              description,
              documentCount: claim.documentCount,
            });
            if (err) {
              toast.error(err);
              return;
            }
            const medicineCostPkr = parsePkrAmount(medicine);
            const billErrSubmit = validateOpdBillAmountPkr(medicineCostPkr);
            if (billErrSubmit) {
              toast.error(billErrSubmit);
              return;
            }
            try {
              await update.mutateAsync({
                category,
                medicineCostPkr,
                visitDate: visitDate.trim(),
                notes: description.trim(),
              });
              await submit.mutateAsync(claim.id);
              toast.success(OPD_COPY.submitSuccess);
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        >
          {OPD_COPY.submitToFinance}
        </Button>
        <p className="text-fn-fg-muted w-full text-[12px]">{OPD_COPY.submitRequirements}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="gap-fn-1_5 flex flex-col">
      <Label>
        {label}
        {required && <span className="text-fn-danger ml-fn-1">*</span>}
      </Label>
      {children}
    </div>
  );
}
