'use client';

import type { ExpenseClaimStatus } from '@futurenostics/types';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { EXPENSE_STATUS_LABEL } from '@/components/expenses/expense-copy';

const TONE: Record<ExpenseClaimStatus, BadgeTone> = {
  draft: 'default',
  pending_approval: 'warning',
  returned: 'info',
  approved: 'success',
  rejected: 'danger',
};

export function ExpenseClaimStatusBadge({ status }: { status: ExpenseClaimStatus }) {
  return (
    <Badge tone={TONE[status]} dot>
      {EXPENSE_STATUS_LABEL[status]}
    </Badge>
  );
}

export function formatPkr(n: number): string {
  return `₨${n.toLocaleString('en-PK')}`;
}

export function formatExpenseDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return `${d.getDate()} ${d.toLocaleString('en-GB', { month: 'short' })} ${d.getFullYear()}`;
  } catch {
    return iso.slice(0, 10);
  }
}

export function formatExpenseMonth(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
  } catch {
    const m = iso.slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(m)) {
      const [y, mo] = m.split('-');
      const d = new Date(Number(y), Number(mo) - 1, 1);
      return d.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
    }
    return iso.slice(0, 10);
  }
}

export function sanitizePkrInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const dot = cleaned.indexOf('.');
  if (dot === -1) return cleaned;
  const before = cleaned.slice(0, dot + 1);
  const after = cleaned.slice(dot + 1).replace(/\./g, '');
  return before + after;
}

export function parsePkrAmount(raw: string): number {
  return Number(sanitizePkrInput(raw).replace(/,/g, ''));
}
