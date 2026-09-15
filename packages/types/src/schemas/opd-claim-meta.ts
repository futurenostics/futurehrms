/** Shared medical-claim categories and Finance reason codes (FE + BE). */

/** Sorted A→Z by label (dropdown display order). */
export const OPD_CLAIM_CATEGORIES = [
  { id: 'dental', label: 'Dental' },
  { id: 'diagnostics_laboratory', label: 'Diagnostics & Laboratory' },
  { id: 'doctor_consultation', label: 'Doctor Consultation' },
  { id: 'ipd', label: 'IPD' },
  { id: 'medicines_supplies', label: 'Medicines & Medical Supplies' },
  { id: 'optical', label: 'Optical / Eye Care' },
  { id: 'prescription_controlled', label: 'Prescription-Controlled Expenses' },
] as const;

/** Display labels for legacy category slugs (pre–category refresh). */
const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  opd: 'Doctor Consultation',
  medicine: 'Medicines & Medical Supplies',
  medicines: 'Medicines & Medical Supplies',
  optics: 'Optical / Eye Care',
};

export const OPD_FINANCE_REASON_CODES = [
  { id: 'missing_document', label: 'Missing document' },
  { id: 'invalid_bill', label: 'Invalid bill' },
  { id: 'duplicate_claim', label: 'Duplicate claim' },
  { id: 'outside_policy', label: 'Outside policy' },
  { id: 'incorrect_amount', label: 'Incorrect amount' },
  { id: 'other', label: 'Other' },
] as const;

export function opdFinanceReasonLabel(code: string | null | undefined): string {
  if (!code) return '';
  return OPD_FINANCE_REASON_CODES.find((r) => r.id === code)?.label ?? code;
}

export function opdCategoryLabel(category: string | null | undefined): string {
  if (!category) return '—';
  const current = OPD_CLAIM_CATEGORIES.find((c) => c.id === category);
  if (current) return current.label;
  return LEGACY_CATEGORY_LABELS[category] ?? category;
}

export function formatOpdFinanceFeedback(code: string, comment?: string | null): string {
  const label = opdFinanceReasonLabel(code) || code;
  const extra = comment?.trim();
  return extra ? `${label} — ${extra}` : label;
}
