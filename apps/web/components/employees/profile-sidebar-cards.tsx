'use client';

import * as React from 'react';
import { ArrowUp, Download, Plus, Upload } from 'lucide-react';
import type { EmployeePublic, SalaryHistoryEntry } from '@futurenostics/types';
import { useSalaryHistory } from '@/lib/queries/employees';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Compensation card — matches
 * docs/design/screens/employee-profile-compensation.jsx, the right
 * column's top card on the profile page.
 *
 * Anatomy:
 *   • Card header: "Compensation" title + "Monthly base salary"
 *     subline on the left, "Increment" secondary button on the right.
 *   • Big number row: 34px tabular salary + "/ mo" suffix; below it
 *     a success delta badge + alt-currency equivalent + "effective"
 *     date sub-line.
 *   • "RECENT CHANGES" uppercase eyebrow + list of salary-history
 *     rows: small percent badge (success / neutral on "Hire"), the
 *     formatted "From → To" mono number, reason + actor, date right.
 */
export interface CompensationCardProps {
  employee: EmployeePublic;
  /** PKR ↔ USD toggle from the topbar. Defaults to PKR. */
  currency?: 'PKR' | 'USD';
  onIncrement?: () => void;
}

const USD_RATE = 278.5;

export function CompensationCard({
  employee,
  currency = 'PKR',
  onIncrement,
}: CompensationCardProps) {
  const history = useSalaryHistory(employee.id);

  const salary = employee.salaryPkr ?? null;
  const fmtPkr = (n: number) => `₨${n.toLocaleString('en-PK')}`;
  const fmtUsd = (n: number) => `$${Math.round(n / USD_RATE).toLocaleString()}`;
  const fmt = currency === 'USD' ? fmtUsd : fmtPkr;
  const altFmt = currency === 'USD' ? fmtPkr : fmtUsd;

  const entries = history.data ?? [];
  const newest = entries[0];
  const deltaPct =
    newest && newest.oldSalaryPkr
      ? ((newest.newSalaryPkr - newest.oldSalaryPkr) / newest.oldSalaryPkr) * 100
      : null;

  return (
    <Card>
      <div className="px-fn-5 py-fn-4 border-fn-divider border-b">
        <div className="gap-fn-3 flex items-start justify-between">
          <div>
            <h3 className="text-fn-fg font-fn-semibold text-[15px]">Compensation</h3>
            <p className="text-fn-fg-muted mt-fn-0_5 text-[12px]">Monthly base salary</p>
          </div>
          {onIncrement && (
            <Button variant="secondary" size="sm" onClick={onIncrement}>
              <Plus className="h-fn-3_5 w-fn-3_5" /> Increment
            </Button>
          )}
        </div>

        <div className="mt-fn-4">
          <div className="gap-fn-2 flex items-baseline">
            <span
              className="text-fn-fg font-fn-semibold leading-fn-unit text-[34px] tabular-nums"
              style={{ letterSpacing: '-0.03em' }}
            >
              {salary != null ? fmt(salary) : '—'}
            </span>
            <span className="text-fn-fg-faint font-fn-medium text-[13px]">/ mo</span>
          </div>
          {salary != null && (
            <div className="mt-fn-2_5 gap-fn-2_5 flex items-center">
              {deltaPct != null && (
                <span
                  className={cn(
                    'rounded-fn-full gap-fn-1 px-fn-2 py-fn-0_5 font-fn-semibold inline-flex items-center border text-[11px]',
                    deltaPct >= 0
                      ? 'bg-fn-success-soft text-fn-success-soft-fg border-fn-success/30'
                      : 'bg-fn-danger-soft text-fn-danger-soft-fg border-fn-danger/30',
                  )}
                >
                  <ArrowUp
                    className={cn('h-fn-3 w-fn-3', deltaPct < 0 && 'rotate-180')}
                    strokeWidth={2.5}
                  />
                  {Math.abs(deltaPct).toFixed(1)}%
                </span>
              )}
              <span className="text-fn-fg-muted text-[12px]">
                ≈ {altFmt(salary)}
                {newest ? ` · effective ${formatShortDate(newest.effectiveDate)}` : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="px-fn-5 pt-fn-3 pb-fn-4">
        <div className="text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight pb-fn-1_5 pt-fn-2 text-[10.5px] uppercase">
          Recent changes
        </div>
        {history.isLoading && <SalaryHistorySkeleton />}
        {!history.isLoading && entries.length === 0 && (
          <div className="text-fn-fg-faint py-fn-3 text-[12px]">
            No salary history yet — increments will appear here.
          </div>
        )}
        {!history.isLoading &&
          entries.map((entry, i) => <SalaryRow key={entry.id} entry={entry} bordered={i > 0} />)}
      </div>
    </Card>
  );
}

function SalaryRow({ entry, bordered }: { entry: SalaryHistoryEntry; bordered: boolean }) {
  const pct =
    entry.oldSalaryPkr != null
      ? ((entry.newSalaryPkr - entry.oldSalaryPkr) / entry.oldSalaryPkr) * 100
      : null;
  const label = pct == null ? 'Hire' : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  return (
    <div
      className={cn(
        'gap-fn-3 py-fn-2_5 flex items-center',
        bordered && 'border-fn-divider border-t',
      )}
    >
      <span
        className={cn(
          'rounded-fn-full px-fn-2 py-fn-0_5 font-fn-semibold inline-flex min-w-[52px] items-center justify-center border text-[11px]',
          pct == null
            ? 'bg-fn-bg-inset text-fn-fg-muted border-fn-border'
            : 'bg-fn-success-soft text-fn-success-soft-fg border-fn-success/30',
        )}
      >
        {label}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-fn-fg font-fn-semibold font-mono text-[13px] tabular-nums">
          {entry.oldSalaryPkr != null
            ? `₨${Math.round(entry.oldSalaryPkr / 1000)}k → ₨${Math.round(entry.newSalaryPkr / 1000)}k`
            : `₨${Math.round(entry.newSalaryPkr / 1000)}k`}
        </div>
        <div className="text-fn-fg-faint mt-fn-0_5 text-[11.5px]">
          {entry.remarks ?? 'Recorded change'}
          {entry.changedByName ? ` · ${entry.changedByName}` : ''}
        </div>
      </div>
      <div className="text-fn-fg-faint font-mono text-[11.5px]">
        {formatShortDate(entry.effectiveDate)}
      </div>
    </div>
  );
}

function SalaryHistorySkeleton() {
  return (
    <div className="gap-fn-2 flex flex-col">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="gap-fn-3 py-fn-2_5 flex items-center">
          <Skeleton className="rounded-fn-full h-fn-5 w-fn-12" />
          <div className="gap-fn-1 flex flex-1 flex-col">
            <Skeleton className="h-fn-3 w-fn-32" />
            <Skeleton className="h-fn-3 w-fn-48" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────── Documents card ─────────────── */

/**
 * Documents card — 2-column tile grid of attached files.
 *
 * Real document storage isn't shipped yet; we render an empty state
 * with the design's "Upload" CTA so the visual slot is present. The
 * tile grid will fill in as `useDocuments` / S3 attachment plumbing
 * lands in a future commit.
 */
export interface DocumentsCardProps {
  employee: EmployeePublic;
  onUpload?: () => void;
}

export function DocumentsCard({ employee: _employee, onUpload }: DocumentsCardProps) {
  const documents: Array<{ name: string; file: string; kind: string; date: string; size: string }> =
    [];
  return (
    <Card>
      <div className="border-fn-divider px-fn-5 py-fn-4 flex items-center justify-between border-b">
        <div>
          <h3 className="text-fn-fg font-fn-semibold text-[15px]">Documents</h3>
          <p className="text-fn-fg-muted mt-fn-0_5 text-[12px]">
            {documents.length} {documents.length === 1 ? 'file' : 'files'}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onUpload}>
          <Upload className="h-fn-3_5 w-fn-3_5" /> Upload
        </Button>
      </div>
      <div className="p-fn-4">
        {documents.length === 0 ? (
          <div className="text-fn-fg-faint py-fn-6 text-center text-[12px]">
            No documents uploaded yet.
            <br />
            <span className="text-fn-fg-faint text-[11.5px]">
              Offer letters, contracts, ID copies, and bank details land here.
            </span>
          </div>
        ) : (
          <div className="gap-fn-2_5 grid grid-cols-1 sm:grid-cols-2">
            {documents.map((d) => (
              <DocumentTile key={d.file} doc={d} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function DocumentTile({
  doc,
}: {
  doc: { name: string; file: string; kind: string; date: string; size: string };
}) {
  const ext = doc.file.split('.').pop()?.toUpperCase() ?? 'FILE';
  return (
    <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs p-fn-3 gap-fn-2_5 flex items-start border">
      <div
        className="rounded-fn-xs font-fn-semibold text-fn-fg-muted bg-fn-bg-subtle border-fn-border inline-flex shrink-0 items-center justify-center border text-[9px]"
        style={{ width: 36, height: 44 }}
      >
        {ext}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-fn-fg font-fn-semibold truncate text-[12.5px]">{doc.name}</div>
        <div className="text-fn-fg-faint mt-fn-0_5 font-mono text-[10.5px]">
          {doc.kind} · {doc.size}
        </div>
        <div className="text-fn-fg-faint mt-fn-2 text-[10.5px]">{doc.date}</div>
      </div>
      <Download className="text-fn-fg-faint h-fn-3_5 w-fn-3_5 shrink-0 cursor-pointer" />
    </div>
  );
}

/* ─────────────── Shared ─────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-fn-border bg-fn-bg-panel rounded-fn-sm overflow-hidden border">
      {children}
    </div>
  );
}

function formatShortDate(value: string): string {
  try {
    const d = new Date(value);
    return `${d.getDate()} ${d.toLocaleString('en-GB', { month: 'short' })} ${d.getFullYear()}`;
  } catch {
    return value.slice(0, 10);
  }
}
