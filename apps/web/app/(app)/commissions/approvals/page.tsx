import { redirect } from 'next/navigation';

/**
 * Legacy `/commissions/approvals` URL — Phase 3 unified the approval
 * inbox under `/approvals`. Pre-applies the commission-run type filter
 * so the experience for inbound commission deep-links is unchanged.
 */
export default function LegacyCommissionsApprovalsRedirect() {
  redirect('/approvals?type=commission-run');
}
