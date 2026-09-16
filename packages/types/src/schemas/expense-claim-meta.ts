/** Expense claims — categories, medical sub-types, Finance reason codes. */

export const EXPENSE_CLAIM_MAX_DOCUMENTS = 3;
export const EXPENSE_CLAIM_MIN_PKR = 1;
export const EXPENSE_CLAIM_MAX_PKR = 10_000_000;
export const GYM_CLAIM_MAX_PKR = 2000;

export const EXPENSE_CURRENCIES = [{ id: 'PKR', label: 'PKR' }] as const;
export type ExpenseCurrency = (typeof EXPENSE_CURRENCIES)[number]['id'];

export const EXPENSE_CLAIM_CATEGORIES = [
  {
    id: 'business_development',
    label: 'Business development & project expense',
    shortLabel: 'Business development',
  },
  {
    id: 'travel',
    label: 'Travel & transportation reimbursement',
    shortLabel: 'Travel',
  },
  { id: 'medical', label: 'Medical', shortLabel: 'Medical' },
  { id: 'gym', label: 'Gym', shortLabel: 'Gym' },
] as const;

export const MEDICAL_SUBCATEGORIES = [
  { id: 'dental', label: 'Dental' },
  { id: 'diagnostics_laboratory', label: 'Diagnostics & Laboratory' },
  { id: 'doctor_consultation', label: 'Doctor Consultation' },
  { id: 'ipd', label: 'IPD' },
  { id: 'medicines_supplies', label: 'Medicines & Medical Supplies' },
  { id: 'optical', label: 'Optical / Eye Care' },
  { id: 'prescription_controlled', label: 'Prescription-Controlled Expenses' },
] as const;

const LEGACY_MEDICAL_LABELS: Record<string, string> = {
  opd: 'Doctor Consultation',
  medicine: 'Medicines & Medical Supplies',
  medicines: 'Medicines & Medical Supplies',
  optics: 'Optical / Eye Care',
};

/** Map pre-unification OPD category slugs onto current medical sub-types. */
export const LEGACY_MEDICAL_SUBCATEGORY_IDS: Record<string, string> = {
  opd: 'doctor_consultation',
  medicine: 'medicines_supplies',
  medicines: 'medicines_supplies',
  optics: 'optical',
};

export const TRAVEL_MODES = [
  { id: 'taxi', label: 'Taxi' },
  { id: 'ride_hail', label: 'Ride-hailing' },
  { id: 'fuel', label: 'Fuel / mileage' },
  { id: 'public_transport', label: 'Public transport' },
  { id: 'other', label: 'Other' },
] as const;

export const BD_PURPOSES = [
  { id: 'client_visit', label: 'Client visit' },
  { id: 'bid_proposal', label: 'Bid / proposal' },
  { id: 'client_entertainment', label: 'Client entertainment' },
  { id: 'tools_software', label: 'Tools / software' },
  { id: 'other', label: 'Other' },
] as const;

export const EXPENSE_FINANCE_REASON_CODES = [
  { id: 'missing_document', label: 'Missing document' },
  { id: 'invalid_bill', label: 'Invalid bill / receipt' },
  { id: 'duplicate_claim', label: 'Duplicate claim' },
  { id: 'outside_policy', label: 'Outside policy' },
  { id: 'incorrect_amount', label: 'Incorrect amount' },
  { id: 'other', label: 'Other' },
] as const;

export function expenseCategoryLabel(id: string | null | undefined): string {
  if (!id) return '—';
  return EXPENSE_CLAIM_CATEGORIES.find((c) => c.id === id)?.shortLabel ?? id;
}

export function medicalSubcategoryLabel(id: string | null | undefined): string {
  if (!id) return '—';
  const current = MEDICAL_SUBCATEGORIES.find((c) => c.id === id);
  if (current) return current.label;
  const remapped = LEGACY_MEDICAL_SUBCATEGORY_IDS[id];
  if (remapped) {
    return MEDICAL_SUBCATEGORIES.find((c) => c.id === remapped)?.label ?? remapped;
  }
  return LEGACY_MEDICAL_LABELS[id] ?? id;
}

export function travelModeLabel(id: string | null | undefined): string {
  if (!id) return '—';
  return TRAVEL_MODES.find((m) => m.id === id)?.label ?? id;
}

export function bdPurposeLabel(id: string | null | undefined): string {
  if (!id) return '—';
  return BD_PURPOSES.find((p) => p.id === id)?.label ?? id;
}

export function expenseFinanceReasonLabel(code: string | null | undefined): string {
  if (!code) return '';
  return EXPENSE_FINANCE_REASON_CODES.find((r) => r.id === code)?.label ?? code;
}

export function formatExpenseFinanceFeedback(code: string, comment?: string | null): string {
  const label = expenseFinanceReasonLabel(code) || code;
  const extra = comment?.trim();
  return extra ? `${label} — ${extra}` : label;
}
