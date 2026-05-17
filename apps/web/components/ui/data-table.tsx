'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * DataTable — canonical table primitive for the app.
 *
 * Owns: column widths via colgroup, sticky header, infinite-scroll
 *   sentinel, loading / empty / error / next-page-error states, and the
 *   "Showing N of M · End of list" footer.
 *
 * Pages own: column definitions, row data, and the callbacks that wire
 *   data loading (typically `useInfiniteQuery`) into the primitive's
 *   `onLoadMore` / `hasMore` / `isFetchingMore` props.
 *
 * Headless on the data side — the primitive does not fetch, paginate,
 * sort, or filter. The parent does all of that and hands the primitive
 * the already-flattened rows.
 *
 * Selection and per-row actions live in a sibling commit. This file is
 * the core that the rest layer onto.
 */

export type DataTableColumn<T> = {
  /** Stable id used as the React key and as the sort key when sortable. */
  id: string;
  /** Header content. Plain string is the common case but ReactNode is allowed. */
  header: React.ReactNode;
  /** px width, or 'auto' for a flex column (recommend exactly one flex col). */
  width?: number | 'auto';
  /** Horizontal alignment of both header and body cells in this column. */
  align?: 'left' | 'right' | 'center';
  /** When true, the header becomes a sort toggle. Parent owns sort state. */
  sortable?: boolean;
  /** Renders the body cell for the given row. Receives the row, returns ReactNode. */
  cell: (row: T) => React.ReactNode;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;

  /** Initial-load state — shows a column-shape skeleton, suppresses footer. */
  isLoading?: boolean;
  /** Initial-load error — shows full empty-card error with retry. */
  isError?: boolean;
  /** Retry callback for the initial-load error state. */
  onRetry?: () => void;

  /** Total matching rows across all pages — used for the "Showing N of M" footer. */
  totalCount?: number;

  /** True when more rows are available — used to render the sentinel and end-of-list state. */
  hasMore?: boolean;
  /** True while a next-page fetch is in flight — drives the bottom skeleton. */
  isFetchingMore?: boolean;
  /** Trigger to fetch the next page. Called by the IntersectionObserver. */
  onLoadMore?: () => void;
  /** True when the most recent next-page fetch failed — shows the inline retry row. */
  hasFetchMoreError?: boolean;
  /** Retry callback for the inline next-page error row. */
  onRetryFetchMore?: () => void;

  /** Whole-row click — typically navigates to a detail page. */
  onRowClick?: (row: T) => void;

  /** Controlled sort state. */
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (key: string, direction: 'asc' | 'desc') => void;

  /** Replaces the default "no results" content; pages supply their own messaging. */
  emptyState?: React.ReactNode;

  /** Minimum table width in px — horizontal scroll kicks in below this. */
  minWidth?: number;
  /** Optional className for the outermost wrapper (rare; usually unused). */
  className?: string;
};

/** Default skeleton row count for initial load. */
const INITIAL_SKELETON_ROWS = 8;
/** Skeleton row count appended at the bottom while loading the next page. */
const NEXT_PAGE_SKELETON_ROWS = 3;
/** Distance from the bottom at which the next-page fetch fires. */
const SENTINEL_ROOT_MARGIN = '400px';

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  isLoading = false,
  isError = false,
  onRetry,
  totalCount,
  hasMore = false,
  isFetchingMore = false,
  onLoadMore,
  hasFetchMoreError = false,
  onRetryFetchMore,
  onRowClick,
  sortKey,
  sortDirection,
  onSortChange,
  emptyState,
  minWidth,
  className,
}: DataTableProps<T>) {
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  // Compute a sensible minimum table width so the auto column doesn't
  // collapse and content doesn't overlap into adjacent cells. Fixed
  // columns contribute their literal width; each auto column reserves
  // 240px as a readable floor.
  const computedMinWidth =
    minWidth ??
    columns.reduce<number>(
      (sum, c) => sum + (c.width === 'auto' || c.width == null ? 240 : c.width),
      0,
    );

  // IntersectionObserver wires onLoadMore. The observer is recreated
  // whenever the (hasMore, isFetchingMore, onLoadMore) tuple changes —
  // this avoids stale closures on fetchNextPage and ensures it stops
  // observing once the list is exhausted.
  React.useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || isFetchingMore || !onLoadMore || hasFetchMoreError) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: SENTINEL_ROOT_MARGIN },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, hasFetchMoreError, onLoadMore]);

  function handleHeaderClick(col: DataTableColumn<T>) {
    if (!col.sortable || !onSortChange) return;
    if (sortKey === col.id) {
      onSortChange(col.id, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Date-like columns default to descending; everything else ascending.
      onSortChange(col.id, 'asc');
    }
  }

  const isEmpty = !isLoading && !isError && rows.length === 0;

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Scroll container — holds the table plus the footer area.
          overflow-auto enables both the horizontal scroll (when viewport
          < minWidth) and the vertical scroll that drives infinite
          loading. */}
      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs h-full overflow-auto border">
        <table
          className="w-full table-fixed border-collapse text-[13px]"
          style={{ minWidth: `${computedMinWidth}px` }}
        >
          <colgroup>
            {columns.map((c) => (
              <col
                key={c.id}
                style={c.width === 'auto' || c.width == null ? undefined : { width: c.width }}
              />
            ))}
          </colgroup>
          <DataTableHeader
            columns={columns}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onClickHeader={handleHeaderClick}
          />
          <tbody>
            {isLoading && (
              <SkeletonRows columns={columns} count={INITIAL_SKELETON_ROWS} variant="initial" />
            )}
            {!isLoading &&
              !isError &&
              rows.map((row, idx) => (
                <DataTableRow
                  key={getRowKey(row)}
                  row={row}
                  columns={columns}
                  bordered={idx < rows.length - 1 || isFetchingMore || hasMore}
                  onRowClick={onRowClick}
                />
              ))}
            {!isLoading && !isError && isFetchingMore && (
              <SkeletonRows columns={columns} count={NEXT_PAGE_SKELETON_ROWS} variant="next" />
            )}
          </tbody>
        </table>

        {/* States that live below the table inside the same scroll
            container so they ride along with the rows as the user
            scrolls and don't interfere with the table's column geometry. */}
        {isError && <InitialErrorState onRetry={onRetry} />}
        {isEmpty && (emptyState ?? <DefaultEmptyState />)}
        {!isLoading && !isError && rows.length > 0 && hasFetchMoreError && (
          <NextPageErrorRow onRetry={onRetryFetchMore} />
        )}

        {/* Sentinel — picked up by the IntersectionObserver above. Sits
            below the rendered rows and the next-page skeleton; as the
            user scrolls near it, the next page loads, more rows render
            above it, the sentinel moves further down, and the cycle
            repeats until hasMore is false. */}
        {hasMore && !isLoading && !isError && !hasFetchMoreError && (
          <div ref={sentinelRef} aria-hidden className="h-px" />
        )}

        {!isLoading && !isError && rows.length > 0 && (
          <DataTableFooter
            loadedCount={rows.length}
            totalCount={totalCount}
            isFetchingMore={isFetchingMore}
            hasMore={hasMore}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- Header ---------- */

function DataTableHeader<T>({
  columns,
  sortKey,
  sortDirection,
  onClickHeader,
}: {
  columns: DataTableColumn<T>[];
  sortKey: string | undefined;
  sortDirection: 'asc' | 'desc' | undefined;
  onClickHeader: (col: DataTableColumn<T>) => void;
}) {
  return (
    <thead className="bg-fn-bg-subtle sticky top-0 z-[1]">
      <tr className="[&>td]:bg-fn-bg-subtle [&>td:first-child]:rounded-l-fn-sm [&>td:last-child]:rounded-r-fn-sm">
        {columns.map((col) => (
          <td
            key={col.id}
            className={cn(
              'text-fn-fg-muted px-fn-3 py-fn-4 font-fn-medium align-middle text-[11px] uppercase tracking-[0.1em]',
              col.align === 'right' && 'text-right',
              col.align === 'center' && 'text-center',
            )}
          >
            {col.sortable ? (
              <button
                type="button"
                onClick={() => onClickHeader(col)}
                className={cn(
                  // text-transform on the inner <button> is duplicated
                  // from the parent <td> because the browser UA stylesheet
                  // resets `text-transform: none` on buttons, which would
                  // otherwise win and leave the header sentence-case.
                  'font-fn-medium inline-flex cursor-pointer items-center gap-[5px] text-[11px] uppercase tracking-[0.1em] transition-colors',
                  col.align === 'right' && 'flex-row-reverse',
                  'hover:text-fn-fg',
                  sortKey === col.id && 'text-fn-fg',
                )}
              >
                <span>{col.header}</span>
                {sortKey === col.id &&
                  (sortDirection === 'asc' ? (
                    <ArrowUp className="h-fn-3 w-fn-3 opacity-60" />
                  ) : (
                    <ArrowDown className="h-fn-3 w-fn-3 opacity-60" />
                  ))}
              </button>
            ) : (
              <span>{col.header}</span>
            )}
          </td>
        ))}
      </tr>
    </thead>
  );
}

/* ---------- Body row ---------- */

function DataTableRow<T>({
  row,
  columns,
  bordered,
  onRowClick,
}: {
  row: T;
  columns: DataTableColumn<T>[];
  bordered: boolean;
  onRowClick: ((row: T) => void) | undefined;
}) {
  return (
    <tr
      onClick={onRowClick ? () => onRowClick(row) : undefined}
      className={cn('transition-colors', onRowClick && 'hover:bg-fn-bg-subtle cursor-pointer')}
    >
      {columns.map((col) => (
        <td
          key={col.id}
          className={cn(
            'px-fn-3 py-fn-4_5 align-middle',
            bordered && 'border-fn-divider border-b',
            col.align === 'right' && 'text-right',
            col.align === 'center' && 'text-center',
          )}
        >
          {col.cell(row)}
        </td>
      ))}
    </tr>
  );
}

/* ---------- Skeleton rows ---------- */

function SkeletonRows<T>({
  columns,
  count,
  variant,
}: {
  columns: DataTableColumn<T>[];
  count: number;
  variant: 'initial' | 'next';
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <tr key={`skeleton-${variant}-${i}`} className="border-fn-divider border-b last:border-0">
          {columns.map((col) => (
            <td key={col.id} className="px-fn-3 py-fn-4_5 align-middle">
              <Skeleton className="h-fn-3_5 w-full max-w-[120px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ---------- Footer ---------- */

function DataTableFooter({
  loadedCount,
  totalCount,
  isFetchingMore,
  hasMore,
}: {
  loadedCount: number;
  totalCount: number | undefined;
  isFetchingMore: boolean;
  hasMore: boolean;
}) {
  const showing =
    totalCount != null && totalCount !== loadedCount
      ? `Showing ${loadedCount.toLocaleString()} of ${totalCount.toLocaleString()}`
      : `Showing ${loadedCount.toLocaleString()} of ${loadedCount.toLocaleString()}`;
  const tail = isFetchingMore ? ' · Loading more…' : !hasMore ? ' · End of list' : '';
  return (
    <div
      role="status"
      aria-live="polite"
      className="text-fn-fg-faint border-fn-divider px-fn-4 py-fn-3 border-t text-[12px] tabular-nums"
    >
      {showing}
      {tail && <span className={cn(!hasMore && 'text-fn-fg-faint')}>{tail}</span>}
    </div>
  );
}

/* ---------- Initial error ---------- */

function InitialErrorState({ onRetry }: { onRetry: (() => void) | undefined }) {
  return (
    <div className="text-fn-fg-muted gap-fn-3 py-fn-12 flex flex-col items-center justify-center text-center text-[13px]">
      <p>Couldn't load this list. Check your connection and try again.</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

/* ---------- Default empty ---------- */

function DefaultEmptyState() {
  return (
    <div className="text-fn-fg-muted py-fn-12 flex flex-col items-center justify-center text-center text-[13px]">
      <p>No results to display.</p>
    </div>
  );
}

/* ---------- Next-page error row ---------- */

function NextPageErrorRow({ onRetry }: { onRetry: (() => void) | undefined }) {
  return (
    <div className="text-fn-fg-muted gap-fn-3 border-fn-divider px-fn-4 py-fn-4 flex items-center justify-center border-t text-[12.5px]">
      <span>Couldn't load more.</span>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
