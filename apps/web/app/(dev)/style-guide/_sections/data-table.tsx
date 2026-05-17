/**
 * Style-guide section for the DataTable primitive.
 *
 * Demonstrates each meaningful state the primitive exposes:
 *   - Default with selection + row actions
 *   - Initial loading
 *   - Empty
 *   - Initial error with retry
 *   - Next-page error
 *   - Infinite scroll (live, with a mocked load delay)
 *
 * The sample data is intentionally generic ("Item A" / "Item B" …) so
 * the section reads as a primitive demo, not as a clone of the
 * Employees screen.
 */
'use client';

import * as React from 'react';
import {
  DataTable,
  type DataTableColumn,
  type DataTableRowAction,
} from '@/components/ui/data-table';
import { StatusPill } from '@/components/employees/status-pill';
import { Spec } from './label';

type DemoRow = {
  id: string;
  name: string;
  category: string;
  status: { slug: 'permanent' | 'probation' | 'intern'; name: string };
  amount: number;
};

const STATUSES = [
  { slug: 'permanent', name: 'Active' },
  { slug: 'probation', name: 'Pending' },
  { slug: 'intern', name: 'Draft' },
] as const;

function makeRow(i: number): DemoRow {
  return {
    id: `row-${i}`,
    name: `Item ${String.fromCharCode(64 + (i % 26 || 26))}${i}`,
    category: ['Standard', 'Premium', 'Enterprise', 'Trial'][i % 4]!,
    status: STATUSES[i % 3]!,
    amount: 10_000 + i * 1_234,
  };
}

const SAMPLE_ROWS: DemoRow[] = Array.from({ length: 5 }, (_, i) => makeRow(i + 1));

const COLUMNS: DataTableColumn<DemoRow>[] = [
  {
    id: 'name',
    header: 'Name',
    width: 'auto',
    sortable: true,
    cell: (row) => <span className="text-fn-fg font-fn-semibold text-[13px]">{row.name}</span>,
  },
  {
    id: 'category',
    header: 'Category',
    width: 160,
    cell: (row) => <span className="text-fn-fg-muted">{row.category}</span>,
  },
  {
    id: 'status',
    header: 'Status',
    width: 140,
    cell: (row) => <StatusPill status={row.status} dot />,
  },
  {
    id: 'amount',
    header: 'Amount',
    width: 130,
    sortable: true,
    cell: (row) => (
      <span className="text-fn-fg font-fn-semibold text-[13px] tabular-nums">
        {row.amount.toLocaleString()}
      </span>
    ),
  },
];

const ROW_ACTIONS = (row: DemoRow): DataTableRowAction[] => [
  { label: 'View', onClick: () => alert(`View ${row.name}`) },
  { label: 'Edit', onClick: () => alert(`Edit ${row.name}`) },
  { label: 'Archive', onClick: () => alert(`Archive ${row.name}`), variant: 'destructive' },
];

export function DataTableSection() {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [sortKey, setSortKey] = React.useState<string>('name');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc');

  return (
    <div id="primitive-data-table" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          DataTable
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          Canonical table primitive. Owns column structure, sticky header, infinite-scroll
          mechanics, loading / empty / error states, selection, and row actions. Pages own column
          definitions and data.
        </p>
      </div>

      {/* Default — selection + row actions + sortable headers */}
      <DemoFrame label="Default · selection + actions + sortable">
        <div className="h-[420px]">
          <DataTable<DemoRow>
            columns={COLUMNS}
            rows={SAMPLE_ROWS}
            getRowKey={(r) => r.id}
            totalCount={SAMPLE_ROWS.length}
            selectedRowKeys={selected}
            onSelectionChange={setSelected}
            rowActions={ROW_ACTIONS}
            sortKey={sortKey}
            sortDirection={sortDir}
            onSortChange={(k, d) => {
              setSortKey(k);
              setSortDir(d);
            }}
            onRowClick={(r) => console.info('row clicked', r.id)}
          />
        </div>
      </DemoFrame>

      {/* Initial loading — column-shape skeleton */}
      <DemoFrame label="Initial loading">
        <div className="h-[320px]">
          <DataTable<DemoRow>
            columns={COLUMNS}
            rows={[]}
            getRowKey={(r) => r.id}
            isLoading
            rowActions={ROW_ACTIONS}
            onSelectionChange={() => {}}
          />
        </div>
      </DemoFrame>

      {/* Empty — no rows, no filters */}
      <DemoFrame label="Empty">
        <div className="h-[260px]">
          <DataTable<DemoRow>
            columns={COLUMNS}
            rows={[]}
            getRowKey={(r) => r.id}
            emptyState={
              <div className="text-fn-fg-muted py-fn-12 flex flex-col items-center text-center text-[13px]">
                <p>No items match the current filters.</p>
              </div>
            }
          />
        </div>
      </DemoFrame>

      {/* Initial error with retry */}
      <DemoFrame label="Initial error">
        <div className="h-[260px]">
          <DataTable<DemoRow>
            columns={COLUMNS}
            rows={[]}
            getRowKey={(r) => r.id}
            isError
            onRetry={() => alert('retry')}
          />
        </div>
      </DemoFrame>

      {/* Next-page error — rows visible, inline retry */}
      <DemoFrame label="Next-page error">
        <div className="h-[420px]">
          <DataTable<DemoRow>
            columns={COLUMNS}
            rows={SAMPLE_ROWS}
            getRowKey={(r) => r.id}
            totalCount={50}
            hasMore
            hasFetchMoreError
            onRetryFetchMore={() => alert('retry next page')}
          />
        </div>
      </DemoFrame>

      {/* Live infinite scroll — mocked pagination over 200 rows */}
      <InfiniteDemo />

      <Spec
        items={[
          ['columns', 'array of { id · header · width · align · sortable · cell(row) }'],
          ['rows', 'already-flattened across pages — parent owns useInfiniteQuery'],
          ['getRowKey', 'stable id used as React key and selection key'],
          ['hasMore / isFetchingMore / onLoadMore', 'wires the IntersectionObserver sentinel'],
          ['hasFetchMoreError / onRetryFetchMore', 'inline retry row above the footer'],
          ['selectedRowKeys / onSelectionChange', 'controlled — prepends a 48px checkbox column'],
          [
            'rowActions(row)',
            'returns the kebab items for this row · destructive variant supported',
          ],
          ['emptyState', 'replaces the default "No results to display." copy'],
          ['minWidth', 'override the auto-computed min — horizontal scroll below it'],
        ]}
      />
    </div>
  );
}

function DemoFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="gap-fn-2 flex flex-col">
      <span className="text-fn-fg-muted font-fn-medium tracking-fn-uppercase-tight text-[11.5px] uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

/* ---------- Live infinite scroll demo ---------- */

const TOTAL_DEMO_ROWS = 200;
const DEMO_PAGE_SIZE = 25;
const DEMO_LATENCY_MS = 600;

function InfiniteDemo() {
  const [pages, setPages] = React.useState<DemoRow[][]>([
    Array.from({ length: DEMO_PAGE_SIZE }, (_, i) => makeRow(i + 1)),
  ]);
  const [isFetchingMore, setIsFetchingMore] = React.useState(false);
  const allRows = React.useMemo(() => pages.flat(), [pages]);
  const hasMore = allRows.length < TOTAL_DEMO_ROWS;

  const loadMore = React.useCallback(() => {
    if (isFetchingMore || !hasMore) return;
    setIsFetchingMore(true);
    const start = allRows.length;
    window.setTimeout(() => {
      const nextPage = Array.from(
        { length: Math.min(DEMO_PAGE_SIZE, TOTAL_DEMO_ROWS - start) },
        (_, i) => makeRow(start + i + 1),
      );
      setPages((p) => [...p, nextPage]);
      setIsFetchingMore(false);
    }, DEMO_LATENCY_MS);
  }, [allRows.length, hasMore, isFetchingMore]);

  return (
    <DemoFrame label="Infinite scroll · 200 rows · 600ms simulated latency">
      <div className="h-[480px]">
        <DataTable<DemoRow>
          columns={COLUMNS}
          rows={allRows}
          getRowKey={(r) => r.id}
          totalCount={TOTAL_DEMO_ROWS}
          hasMore={hasMore}
          isFetchingMore={isFetchingMore}
          onLoadMore={loadMore}
          rowActions={ROW_ACTIONS}
        />
      </div>
    </DemoFrame>
  );
}
