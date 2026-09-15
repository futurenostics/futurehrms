import { OPD_CLAIM_MIN_BILL_PKR } from '@futurenostics/types';
import { OPD_COPY } from '@/components/opd/opd-copy';

/** Bill total validation (mirrors `opdClaimCreateSchema` money field). */
export function validateOpdBillAmountPkr(amount: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) {
    return OPD_COPY.billAmountInvalid;
  }
  if (amount < OPD_CLAIM_MIN_BILL_PKR) {
    return OPD_COPY.billAmountMin;
  }
  return null;
}

/** Client-side checks before submit (server enforces the same on POST …/submit). */
export function validateOpdClaimForSubmit(input: {
  visitDate: string;
  description: string;
  documentCount: number;
}): string | null {
  if (!input.visitDate.trim()) {
    return OPD_COPY.visitDateRequired;
  }
  if (!input.description.trim()) {
    return OPD_COPY.descriptionRequired;
  }
  if (input.documentCount < 1) {
    return OPD_COPY.documentsRequired;
  }
  return null;
}
