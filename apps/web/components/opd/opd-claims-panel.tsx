'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { HeartPulse, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import type {
  OpdClaimCategory,
  OpdClaimPublic,
  OpdClaimSortBy,
  OpdClaimSortDir,
  OpdClaimStatus,
} from '@futurenostics/types';
import { OPD_CLAIM_CATEGORIES, opdCategoryLabel } from '@futurenostics/types';
import { OPD_CLAIM_MAX_DOCUMENTS } from '@futurenostics/types';
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
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import {
  TablePagination,
  type TablePageSize,
  TABLE_PAGE_SIZE_OPTIONS,
} from '@/components/ui/table-pagination';
import {
  OPD_CLAIMS_PAGE_SIZE,
  useCreateOpdClaim,
  useOpdClaims,
  useSubmitOpdClaim,
  uploadOpdDocument,
} from '@/lib/queries/opd';
import { usePermissions } from '@/hooks/use-permissions';
import { OPD_COPY } from '@/components/opd/opd-copy';
import {
  validateOpdBillAmountPkr,
  validateOpdClaimForSubmit,
} from '@/components/opd/opd-claim-validation';
import { parsePkrAmount, sanitizePkrInput } from '@/components/opd/opd-pkr-input';
import { OpdClaimStatusBadge, formatPkr, formatVisitDate } from './opd-claim-status';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | OpdClaimStatus;

/** UI sort presets → API `sortBy` + `sortDir`. */
type OpdClaimListSort = 'newest' | 'oldest' | 'bill_high' | 'bill_low';

const LIST_SORT_OPTIONS: { id: OpdClaimListSort; label: string }[] = [
  { id: 'newest', label: OPD_COPY.sortNewest },
  { id: 'oldest', label: OPD_COPY.sortOldest },
  { id: 'bill_high', label: OPD_COPY.sortBillHigh },
  { id: 'bill_low', label: OPD_COPY.sortBillLow },
];

function listSortToQuery(sort: OpdClaimListSort): {
  sortBy: OpdClaimSortBy;
  sortDir: OpdClaimSortDir;
} {
  switch (sort) {
    case 'oldest':
      return { sortBy: 'createdAt', sortDir: 'asc' };
    case 'bill_high':
      return { sortBy: 'billAmount', sortDir: 'desc' };
    case 'bill_low':
      return { sortBy: 'billAmount', sortDir: 'asc' };
    default:
      return { sortBy: 'createdAt', sortDir: 'desc' };
  }
}

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: OPD_COPY.filterStatusAll },
  { id: 'pending_approval', label: OPD_COPY.filterStatusPending },
  { id: 'returned', label: OPD_COPY.filterStatusReturned },
  { id: 'approved', label: OPD_COPY.filterStatusApproved },
  { id: 'rejected', label: OPD_COPY.filterStatusRejected },
];

export function OpdClaimsPanel({ mine = true }: { mine?: boolean }) {
  const router = useRouter();
  const perms = usePermissions();
  const canSubmit = perms.has('opd:submit_own');

  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [listSort, setListSort] = React.useState<OpdClaimListSort>('newest');
  const { sortBy, sortDir } = listSortToQuery(listSort);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState<TablePageSize>(OPD_CLAIMS_PAGE_SIZE);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  React.useEffect(() => {
    setPage(1);
  }, [statusFilter, listSort, pageSize]);

  const offset = (page - 1) * pageSize;
  const listQuery = useOpdClaims({
    status: statusFilter === 'all' ? undefined : statusFilter,
    sortBy,
    sortDir,
    offset,
    limit: pageSize,
  });

  const rows = listQuery.data?.items ?? [];
  const totalCount = listQuery.data?.total ?? 0;

  function openClaim(claimId: string) {
    router.push(`/opd/claims/${claimId}`);
  }

  const columns = React.useMemo<DataTableColumn<OpdClaimPublic>[]>(() => {
    const cols: DataTableColumn<OpdClaimPublic>[] = [];
    if (!mine) {
      cols.push({
        id: 'employee',
        header: 'Employee',
        width: 200,
        cell: (row) => (
          <div className="min-w-0">
            <span className="text-fn-fg font-fn-medium block truncate text-[13px]">
              {row.employee.fullName}
            </span>
            <span className="text-fn-fg-faint font-mono text-[11px]">{row.employee.eid}</span>
          </div>
        ),
      });
    }
    cols.push(
      {
        id: 'claimNumber',
        header: OPD_COPY.colClaimNumber,
        width: 130,
        cell: (row) => <span className="text-fn-fg font-mono text-[12px]">{row.claimNumber}</span>,
      },
      {
        id: 'category',
        header: OPD_COPY.colCategory,
        width: 120,
        cell: (row) => (
          <span className="text-fn-fg-muted text-[12.5px]">{opdCategoryLabel(row.category)}</span>
        ),
      },
      {
        id: 'visitDate',
        header: OPD_COPY.visitDateLabel,
        width: 140,
        cell: (row) => (
          <div>
            <span className="text-fn-fg text-[13px]">{formatVisitDate(row.visitDate)}</span>
          </div>
        ),
      },
      {
        id: 'billAmount',
        header: OPD_COPY.billAmountStat,
        width: 120,
        align: 'right',
        sortable: true,
        cell: (row) => (
          <span className="text-fn-fg font-fn-medium text-[13px] tabular-nums">
            {formatPkr(row.medicineCostPkr)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        width: 150,
        cell: (row) => <OpdClaimStatusBadge status={row.status} />,
      },
      {
        id: 'createdAt',
        header: OPD_COPY.colCreated,
        width: 120,
        sortable: true,
        cell: (row) => (
          <span className="text-fn-fg-faint font-mono text-[11.5px]">
            {formatVisitDate(row.createdAt)}
          </span>
        ),
      },
    );
    return cols;
  }, [mine]);

  const emptyState =
    statusFilter === 'all' ? (
      <div className="gap-fn-2 px-fn-5 py-fn-10 flex flex-col items-center text-center">
        <HeartPulse className="text-fn-fg-faint h-fn-8 w-fn-8" />
        <p className="text-fn-fg font-fn-medium text-[14px]">{OPD_COPY.listEmptyTitle}</p>
        <p className="text-fn-fg-muted text-[12.5px]">
          {OPD_COPY.listEmptyHint(OPD_CLAIM_MAX_DOCUMENTS)}
        </p>
      </div>
    ) : (
      <p className="text-fn-fg-muted px-fn-5 py-fn-10 text-center text-[13px]">
        {OPD_COPY.listEmptyFiltered}
      </p>
    );

  return (
    <div className="gap-fn-4 flex flex-col">
      <div className="gap-fn-3 flex flex-wrap items-start justify-between">
        <div className="min-w-0">
          <h2 className="text-fn-fg font-fn-semibold text-[15px]">
            {mine ? OPD_COPY.listMineTitle : OPD_COPY.listAllTitle}
          </h2>
          <p className="text-fn-fg-muted mt-fn-0_5 text-[12.5px]">
            {mine ? OPD_COPY.listIntroMine : OPD_COPY.listIntroAll}
          </p>
        </div>
        {canSubmit && (
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <Plus className="h-fn-3_5 w-fn-3_5" /> {OPD_COPY.newClaim}
          </Button>
        )}
      </div>

      <div className="gap-fn-3 flex flex-wrap items-center justify-between">
        <div className="gap-fn-1_5 flex flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={cn(
                'rounded-fn-xs px-fn-3 py-fn-1_5 border text-[12.5px] transition-colors',
                statusFilter === f.id
                  ? 'border-fn-accent bg-fn-accent-soft text-fn-accent-soft-fg font-fn-semibold'
                  : 'border-fn-border bg-fn-bg-panel text-fn-fg-muted hover:bg-fn-bg-inset',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Select value={listSort} onValueChange={(v) => setListSort(v as OpdClaimListSort)}>
          <SelectTrigger className="w-[240px]" aria-label={OPD_COPY.sortLabel}>
            <SelectValue placeholder={OPD_COPY.sortLabel} />
          </SelectTrigger>
          <SelectContent>
            {LIST_SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs overflow-hidden border">
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          isLoading={listQuery.isPending}
          isError={listQuery.isError}
          onRetry={() => void listQuery.refetch()}
          onRowClick={(row) => openClaim(row.id)}
          sortKey={sortBy === 'billAmount' ? 'billAmount' : 'createdAt'}
          sortDirection={sortDir}
          onSortChange={(_key, direction) => {
            if (_key === 'billAmount') {
              setListSort(direction === 'desc' ? 'bill_high' : 'bill_low');
            } else {
              setListSort(direction === 'desc' ? 'newest' : 'oldest');
            }
            setPage(1);
          }}
          emptyState={emptyState}
          minWidth={mine ? 640 : 880}
          chrome="plain"
          hideFooter
        />
        {!listQuery.isPending && !listQuery.isError && totalCount > 0 && (
          <TablePagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              if ((TABLE_PAGE_SIZE_OPTIONS as readonly number[]).includes(size)) {
                setPageSize(size);
              }
            }}
          />
        )}
      </div>

      <NewOpdClaimSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}

function NewOpdClaimSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateOpdClaim();
  const submit = useSubmitOpdClaim();
  const [category, setCategory] = React.useState<OpdClaimCategory>('doctor_consultation');
  const [medicine, setMedicine] = React.useState('');
  const [visitDate, setVisitDate] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [files, setFiles] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setCategory('doctor_consultation');
      setMedicine('');
      setVisitDate('');
      setDescription('');
      setFiles([]);
    }
  }, [open]);

  function addFiles(incoming: FileList | null) {
    if (!incoming?.length) return;
    setFiles((prev) => {
      const next = [...prev];
      for (const f of Array.from(incoming)) {
        if (next.length >= OPD_CLAIM_MAX_DOCUMENTS) break;
        next.push(f);
      }
      return next;
    });
  }

  async function submitNewClaim() {
    const medicineCostPkr = parsePkrAmount(medicine);
    const billErr = validateOpdBillAmountPkr(medicineCostPkr);
    if (billErr) {
      toast.error(billErr);
      return;
    }
    const submitErr = validateOpdClaimForSubmit({
      visitDate,
      description,
      documentCount: files.length,
    });
    if (submitErr) {
      toast.error(submitErr);
      return;
    }

    setBusy(true);
    try {
      const created = await create.mutateAsync({
        category,
        medicineCostPkr,
        claimedAmountPkr: medicineCostPkr,
        visitDate: visitDate || null,
        notes: description.trim() || null,
      });
      for (const f of files) {
        await uploadOpdDocument(created.id, f);
      }
      await submit.mutateAsync(created.id);
      toast.success(OPD_COPY.submitSuccess);
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="md">
        <SheetHeader>
          <SheetTitle>{OPD_COPY.newClaim}</SheetTitle>
          <SheetDescription>
            {OPD_COPY.listEmptyHint(OPD_CLAIM_MAX_DOCUMENTS)} You will be reimbursed for the full
            bill amount you enter.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="gap-fn-4 flex flex-col">
          <Field label={OPD_COPY.categoryLabel} required hint={OPD_COPY.categoryHint}>
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
          <Field label={OPD_COPY.billAmountLabel} required hint={OPD_COPY.billAmountHint}>
            <Input
              inputMode="decimal"
              value={medicine}
              onChange={(e) => setMedicine(sanitizePkrInput(e.target.value))}
              placeholder="e.g. 4500"
            />
          </Field>
          <Field label={OPD_COPY.visitDateLabel} required hint={OPD_COPY.visitDateHint}>
            <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          </Field>
          <Field label={OPD_COPY.descriptionLabel} required hint={OPD_COPY.descriptionHint}>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={OPD_COPY.descriptionPlaceholder}
            />
          </Field>
          <Field
            label={OPD_COPY.documentsLabel}
            required
            hint={OPD_COPY.documentsHint(OPD_CLAIM_MAX_DOCUMENTS)}
          >
            <div className="gap-fn-2 flex flex-col">
              {files.map((f, i) => (
                <div
                  key={`${f.name}-${i}`}
                  className="border-fn-border bg-fn-bg-subtle rounded-fn-xs px-fn-3 py-fn-2 flex items-center justify-between border"
                >
                  <span className="text-fn-fg truncate text-[13px]">{f.name}</span>
                  <button
                    type="button"
                    className="text-fn-fg-muted hover:text-fn-fg p-fn-1"
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    aria-label="Remove file"
                  >
                    <X className="h-fn-3_5 w-fn-3_5" />
                  </button>
                </div>
              ))}
              {files.length < OPD_CLAIM_MAX_DOCUMENTS && (
                <label className="border-fn-border-strong bg-fn-bg-subtle hover:bg-fn-bg-inset rounded-fn-xs px-fn-3 py-fn-3 flex cursor-pointer items-center border">
                  <span className="text-fn-fg text-[13px]">
                    {files.length === 0 ? OPD_COPY.filePickerHint : OPD_COPY.addAnotherDocument}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    multiple
                    onChange={(e) => addFiles(e.target.files)}
                  />
                </label>
              )}
            </div>
          </Field>
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submitNewClaim()} disabled={busy}>
            {OPD_COPY.submitToFinance}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="gap-fn-1_5 flex flex-col">
      <Label>
        {label}
        {required && <span className="text-fn-danger ml-fn-1">*</span>}
      </Label>
      {hint && <p className="text-fn-fg-faint text-[11.5px]">{hint}</p>}
      {children}
    </div>
  );
}
