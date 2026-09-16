'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Wallet } from 'lucide-react';
import type {
  ClaimListBucket,
  ExpenseClaimCategory,
  ExpenseClaimPublic,
  ExpenseClaimSortBy,
  ExpenseClaimSortDir,
  ExpenseClaimStatus,
} from '@futurenostics/types';
import { expenseCategoryLabel, medicalSubcategoryLabel } from '@futurenostics/types';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import {
  TablePagination,
  type TablePageSize,
  TABLE_PAGE_SIZE_OPTIONS,
} from '@/components/ui/table-pagination';
import { EXPENSE_CLAIMS_PAGE_SIZE, useExpenseClaims } from '@/lib/queries/expenses';
import { usePermissions } from '@/hooks/use-permissions';
import { EXPENSE_COPY } from '@/components/expenses/expense-copy';
import {
  ExpenseClaimStatusBadge,
  formatExpenseDate,
  formatExpenseMonth,
  formatPkr,
} from '@/components/expenses/expense-claim-status';
import { NewExpenseSheet } from '@/components/expenses/expense-new-sheet';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | ExpenseClaimStatus;
type ListSort = 'newest' | 'oldest' | 'amount_high' | 'amount_low';

function listSortToQuery(sort: ListSort): {
  sortBy: ExpenseClaimSortBy;
  sortDir: ExpenseClaimSortDir;
} {
  switch (sort) {
    case 'oldest':
      return { sortBy: 'createdAt', sortDir: 'asc' };
    case 'amount_high':
      return { sortBy: 'amount', sortDir: 'desc' };
    case 'amount_low':
      return { sortBy: 'amount', sortDir: 'asc' };
    default:
      return { sortBy: 'createdAt', sortDir: 'desc' };
  }
}

const ACTIVE_STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: EXPENSE_COPY.filterStatusAll },
  { id: 'pending_approval', label: EXPENSE_COPY.filterStatusPending },
  { id: 'returned', label: EXPENSE_COPY.filterStatusReturned },
];

const RESOLVED_STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: EXPENSE_COPY.filterStatusAll },
  { id: 'approved', label: EXPENSE_COPY.filterStatusApproved },
  { id: 'rejected', label: EXPENSE_COPY.filterStatusRejected },
];

export function ExpenseClaimsPanel({
  mine = true,
  hideCreateButton = false,
  hideListHeader = false,
  bucket = 'active',
}: {
  mine?: boolean;
  hideCreateButton?: boolean;
  hideListHeader?: boolean;
  bucket?: ClaimListBucket;
}) {
  const router = useRouter();
  const perms = usePermissions();
  const canSubmit = perms.has('expenses:submit_own');
  const statusFilters = bucket === 'resolved' ? RESOLVED_STATUS_FILTERS : ACTIVE_STATUS_FILTERS;
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = React.useState<ExpenseClaimCategory | 'all'>('all');
  const [listSort, setListSort] = React.useState<ListSort>('newest');
  const { sortBy, sortDir } = listSortToQuery(listSort);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState<TablePageSize>(EXPENSE_CLAIMS_PAGE_SIZE);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  React.useEffect(() => {
    setPage(1);
  }, [statusFilter, categoryFilter, listSort, pageSize]);

  const offset = (page - 1) * pageSize;
  const listQuery = useExpenseClaims({
    status: statusFilter === 'all' ? undefined : statusFilter,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    sortBy,
    sortDir,
    offset,
    limit: pageSize,
    scope: mine ? 'mine' : 'org',
    bucket,
  });

  const rows = listQuery.data?.items ?? [];
  const totalCount = listQuery.data?.total ?? 0;

  const columns = React.useMemo<DataTableColumn<ExpenseClaimPublic>[]>(() => {
    const cols: DataTableColumn<ExpenseClaimPublic>[] = [];
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
        header: EXPENSE_COPY.colClaimNumber,
        width: 130,
        cell: (row) => <span className="text-fn-fg font-mono text-[12px]">{row.claimNumber}</span>,
      },
      {
        id: 'category',
        header: EXPENSE_COPY.colCategory,
        width: 160,
        cell: (row) => {
          const extra =
            row.category === 'medical' &&
            row.details &&
            typeof row.details === 'object' &&
            'subCategory' in row.details
              ? medicalSubcategoryLabel(
                  String((row.details as { subCategory: string }).subCategory),
                )
              : null;
          return (
            <span className="text-fn-fg-muted text-[12.5px]">
              {expenseCategoryLabel(row.category)}
              {extra ? ` · ${extra}` : ''}
            </span>
          );
        },
      },
      {
        id: 'expenseDate',
        header: EXPENSE_COPY.expenseMonthLabel,
        width: 140,
        cell: (row) => (
          <span className="text-fn-fg text-[13px]">{formatExpenseMonth(row.expenseDate)}</span>
        ),
      },
      {
        id: 'amount',
        header: EXPENSE_COPY.colAmount,
        width: 120,
        align: 'right',
        sortable: true,
        cell: (row) => (
          <span className="text-fn-fg font-fn-medium text-[13px] tabular-nums">
            {formatPkr(row.amountPkr)} {row.currency}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        width: 150,
        cell: (row) => <ExpenseClaimStatusBadge status={row.status} />,
      },
      {
        id: 'createdAt',
        header: EXPENSE_COPY.colCreated,
        width: 120,
        sortable: true,
        cell: (row) => (
          <span className="text-fn-fg-faint font-mono text-[11.5px]">
            {formatExpenseDate(row.createdAt)}
          </span>
        ),
      },
    );
    return cols;
  }, [mine]);

  const emptyState =
    statusFilter === 'all' && categoryFilter === 'all' ? (
      <div className="gap-fn-2 px-fn-5 py-fn-10 flex flex-col items-center text-center">
        <Wallet className="text-fn-fg-faint h-fn-8 w-fn-8" />
        <p className="text-fn-fg font-fn-medium text-[14px]">
          {bucket === 'resolved' ? EXPENSE_COPY.listEmptyHistoryTitle : EXPENSE_COPY.listEmptyTitle}
        </p>
        <p className="text-fn-fg-muted text-[12.5px]">
          {bucket === 'resolved' ? EXPENSE_COPY.listEmptyHistoryHint : EXPENSE_COPY.listEmptyHint}
        </p>
      </div>
    ) : (
      <p className="text-fn-fg-muted px-fn-5 py-fn-10 text-center text-[13px]">
        {EXPENSE_COPY.listEmptyFiltered}
      </p>
    );

  return (
    <div className="gap-fn-4 flex flex-col">
      {!hideListHeader && (
        <div className="gap-fn-3 flex flex-wrap items-start justify-between">
          <div className="min-w-0">
            <h2 className="text-fn-fg font-fn-semibold text-[15px]">
              {mine ? EXPENSE_COPY.listMineTitle : EXPENSE_COPY.listAllTitle}
            </h2>
            <p className="text-fn-fg-muted mt-fn-0_5 text-[12.5px]">{EXPENSE_COPY.pageIntroOwn}</p>
          </div>
          {canSubmit && !hideCreateButton && (
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              <Plus className="h-fn-3_5 w-fn-3_5" /> {EXPENSE_COPY.newExpense}
            </Button>
          )}
        </div>
      )}
      {hideListHeader && canSubmit && !hideCreateButton && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <Plus className="h-fn-3_5 w-fn-3_5" /> {EXPENSE_COPY.newExpense}
          </Button>
        </div>
      )}

      <div className="gap-fn-3 flex flex-wrap items-center justify-between">
        <div className="gap-fn-1_5 flex flex-wrap">
          {statusFilters.map((f) => (
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
        <div className="gap-fn-2 flex flex-wrap">
          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v as ExpenseClaimCategory | 'all')}
          >
            <SelectTrigger className="w-[220px]" aria-label={EXPENSE_COPY.categoryLabel}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="medical">Medical</SelectItem>
              <SelectItem value="gym">Gym</SelectItem>
              <SelectItem value="travel">Travel</SelectItem>
              <SelectItem value="business_development">Business development</SelectItem>
            </SelectContent>
          </Select>
          <Select value={listSort} onValueChange={(v) => setListSort(v as ListSort)}>
            <SelectTrigger className="w-[180px]" aria-label={EXPENSE_COPY.sortLabel}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{EXPENSE_COPY.sortNewest}</SelectItem>
              <SelectItem value="oldest">{EXPENSE_COPY.sortOldest}</SelectItem>
              <SelectItem value="amount_high">{EXPENSE_COPY.sortAmountHigh}</SelectItem>
              <SelectItem value="amount_low">{EXPENSE_COPY.sortAmountLow}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs overflow-hidden border">
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          isLoading={listQuery.isPending}
          isError={listQuery.isError}
          onRetry={() => void listQuery.refetch()}
          onRowClick={(row) => router.push(`/expenses/claims/${row.id}`)}
          sortKey={sortBy === 'amount' ? 'amount' : 'createdAt'}
          sortDirection={sortDir}
          onSortChange={(_key, direction) => {
            if (_key === 'amount') {
              setListSort(direction === 'desc' ? 'amount_high' : 'amount_low');
            } else {
              setListSort(direction === 'desc' ? 'newest' : 'oldest');
            }
            setPage(1);
          }}
          emptyState={emptyState}
          minWidth={mine ? 720 : 920}
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

      <NewExpenseSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
