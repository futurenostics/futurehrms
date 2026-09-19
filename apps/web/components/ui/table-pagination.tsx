'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export const TABLE_PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const;
export type TablePageSize = (typeof TABLE_PAGE_SIZE_OPTIONS)[number];

export type TablePaginationProps = {
  page: number;
  pageSize: TablePageSize;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: TablePageSize) => void;
  className?: string;
};

/** Numbered pages + rows-per-page selector for offset-paginated lists. */
export function TablePagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  className,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalCount);

  React.useEffect(() => {
    if (page > totalPages && totalPages >= 1) {
      onPageChange(totalPages);
    }
  }, [page, totalPages, onPageChange]);

  return (
    <div
      className={cn(
        'border-fn-divider text-fn-fg-muted gap-fn-3 px-fn-4 py-fn-3 flex flex-wrap items-center justify-between border-t text-[12.5px]',
        className,
      )}
    >
      <div className="gap-fn-2 flex flex-wrap items-center">
        <span className="text-fn-fg-faint tabular-nums">
          {totalCount === 0
            ? '0 items'
            : `${start.toLocaleString()}–${end.toLocaleString()} of ${totalCount.toLocaleString()}`}
        </span>
        <span className="text-fn-fg-faint hidden sm:inline">·</span>
        <div className="gap-fn-1_5 flex items-center">
          <span className="text-fn-fg-faint text-[12px]">Rows</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v) as TablePageSize)}
          >
            <SelectTrigger variant="compact" className="w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABLE_PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="gap-fn-2 flex items-center">
        <span className="text-fn-fg font-fn-medium text-[12.5px] tabular-nums">
          Page {safePage} of {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safePage <= 1}
          aria-label="Previous page"
          onClick={() => onPageChange(safePage - 1)}
        >
          <ChevronLeft className="h-fn-3_5 w-fn-3_5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safePage >= totalPages}
          aria-label="Next page"
          onClick={() => onPageChange(safePage + 1)}
        >
          <ChevronRight className="h-fn-3_5 w-fn-3_5" />
        </Button>
      </div>
    </div>
  );
}
