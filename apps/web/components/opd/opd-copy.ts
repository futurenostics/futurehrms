import type { OpdClaimStatus } from '@futurenostics/types';

/** User-facing copy for medical claims — status labels match commission / approvals wording. */

export const OPD_STATUS_LABEL: Record<OpdClaimStatus, string> = {
  draft: 'Not submitted',
  pending_approval: 'Pending approval',
  returned: 'Returned for correction',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const OPD_COPY = {
  moduleName: 'Medical claims',
  moduleNameShort: 'Medical claim',
  navLabel: 'Medical claims',
  portalTab: 'Medical claims',

  billAmountLabel: 'Bill amount (PKR)',
  billAmountHint: 'Total shown on your pharmacy or clinic bill.',
  billAmountStat: 'Bill amount',
  billAmountInvalid: 'Enter a valid bill amount.',
  billAmountMin: 'Bill amount must be at least ₨1,000.',
  billAmountExceeds: 'The amount cannot be more than the bill total.',

  visitDateLabel: 'Date of visit',
  visitDateHint: 'The date on your prescription or bill.',
  visitDateRequired: 'Add the date of visit.',

  descriptionLabel: 'What was this for?',
  descriptionHint: 'A short note for Finance (required when you submit).',
  descriptionRequired: 'Add a short description.',
  descriptionPlaceholder: 'e.g. Medicines from pharmacy after doctor visit',

  documentsLabel: 'Documents',
  documentsHint: (max: number) =>
    `Prescription and itemised bill — up to ${max} files (JPEG, PNG, WebP, or PDF, 5 MB each).`,
  documentsRequired: 'Add at least one document (prescription and itemised bill).',
  documentsEmpty: 'No documents yet.',
  documentsSectionTitle: 'Documents',
  documentsUploadSuccess: 'Document added.',
  documentsRemoveSuccess: 'Document removed.',
  addDocument: 'Add document',
  addAnotherDocument: 'Add another file',
  filePickerHint: 'JPEG, PNG, WebP, or PDF · 5 MB each',
  documentsCount: (n: number, max: number) => `${n} of ${max} files`,

  submitToFinance: 'Submit for approval',
  submitSuccess: 'Submitted for approval.',
  saveChanges: 'Save changes',
  saveChangesSuccess: 'Changes saved.',
  newClaim: 'New claim',
  submitRequirements: 'To submit: date of visit, description, and at least one document.',

  listMineTitle: 'My medical claims',
  listAllTitle: 'Medical claims',
  listIntroMine:
    'Submit your prescription and pharmacy bill for reimbursement. Finance approves or rejects each claim.',
  listIntroAll:
    'All employee medical claims. Open a pending claim to review documents before you approve or reject.',
  listLoadError: 'Could not load medical claims.',
  listEmptyTitle: 'No claims yet',
  listEmptyHint: (max: number) =>
    `Start a claim with your prescription and itemised bill (up to ${max} files).`,
  listEmptyFiltered: 'No claims match this filter.',
  colCreated: 'Created',
  colClaimNumber: 'Claim #',
  colCategory: 'Category',

  categoryLabel: 'Category',
  categoryHint: 'What type of expense is this?',

  filterStatusAll: 'All',
  filterStatusPending: OPD_STATUS_LABEL.pending_approval,
  filterStatusReturned: OPD_STATUS_LABEL.returned,
  filterStatusApproved: OPD_STATUS_LABEL.approved,
  filterStatusRejected: OPD_STATUS_LABEL.rejected,
  sortLabel: 'Sort by',
  sortNewest: 'Newest',
  sortOldest: 'Oldest',
  sortBillHigh: 'High to Low',
  sortBillLow: 'Low to High',

  alertApprovedTitle: 'Approved',
  alertApprovedBody: 'This claim was approved.',
  alertRejectedTitle: 'Rejected',
  alertRejectedNoReason: 'No rejection reason was provided.',
  alertPendingTitle: 'Pending approval',
  alertPendingBody: 'Finance has not decided on this claim yet.',
  alertReturnedTitle: 'Returned for correction',
  alertReturnedBody:
    'Finance asked you to update this claim and submit again. Your previous submission is not approved yet.',
  alertNotSubmittedTitle: 'Not submitted',
  alertNotSubmittedBody:
    'This claim was never submitted for approval. Submit a new claim from Medical claims.',

  historyTitle: 'History',

  approveClaim: 'Approve',
  approveDialogTitle: 'Approve claim',
  approveNoteLabel: 'Notes (optional)',
  approveNotePlaceholder: 'e.g. Approved for the full bill amount.',
  approveSuccess: 'Claim approved.',

  rejectClaim: 'Reject',
  rejectDialogTitle: 'Reject claim',
  rejectReasonLabel: 'Reason',
  rejectCommentLabel: 'Comment (optional)',
  rejectReasonPlaceholder: 'Add any detail Finance should see.',
  rejectSuccess: 'Claim rejected.',

  returnForCorrection: 'Return for correction',
  returnDialogTitle: 'Return for correction',
  returnDialogHint:
    'The employee can edit and resubmit. Use reject if the claim should not be paid.',
  returnReasonLabel: 'Reason',
  returnCommentLabel: 'Comment (optional)',
  returnCommentPlaceholder: 'Tell the employee what to fix.',
  returnSuccess: 'Claim returned to the employee.',

  editReturnedTitle: 'Update and resubmit',
  editReturnedHint:
    'Finance returned this claim. Fix the issues below, then submit for approval again.',

  cannotApproveHere:
    'This claim is pending approval, but it is not in your inbox. Contact your administrator if you need access.',

  claimLoadError: 'Could not load this claim.',
  noAccessTitle: 'No access',
  noAccessBody:
    'You cannot view medical claims here. Employees can use My Portal → Medical claims.',

  pageIntroOwn: 'Your outpatient medical reimbursement claims.',
} as const;
