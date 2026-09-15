'use client';

import type { OpdClaimStatus } from '@futurenostics/types';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { OPD_STATUS_LABEL } from '@/components/opd/opd-copy';

const TONE: Record<OpdClaimStatus, BadgeTone> = {
  draft: 'default',
  pending_approval: 'warning',
  returned: 'info',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'default',
};

export function OpdClaimStatusBadge({ status }: { status: OpdClaimStatus }) {
  return (
    <Badge tone={TONE[status]} dot>
      {OPD_STATUS_LABEL[status]}
    </Badge>
  );
}

export function formatPkr(n: number): string {
  return `₨${n.toLocaleString('en-PK')}`;
}

export function formatVisitDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return `${d.getDate()} ${d.toLocaleString('en-GB', { month: 'short' })} ${d.getFullYear()}`;
  } catch {
    return iso.slice(0, 10);
  }
}
