'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DataTable,
  type DataTableColumn,
  type DataTableRowAction,
} from '@/components/ui/data-table';
import {
  useCreateHoliday,
  useDeleteHoliday,
  useHolidays,
  type HolidayPublic,
} from '@/lib/queries/attendance';

export interface HolidaysTabProps {
  canManage: boolean;
}

export function HolidaysTab({ canManage }: HolidaysTabProps) {
  const holidaysQuery = useHolidays();
  const create = useCreateHoliday();
  const remove = useDeleteHoliday();

  const [date, setDate] = React.useState('');
  const [name, setName] = React.useState('');

  const rows = [...(holidaysQuery.data?.items ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  async function handleAdd(): Promise<void> {
    if (!date || !name.trim()) return;
    try {
      await create.mutateAsync({ date: new Date(date).toISOString(), name: name.trim() });
      toast.success(`Added "${name.trim()}"`);
      setDate('');
      setName('');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleDelete(holiday: HolidayPublic): Promise<void> {
    if (!confirm(`Remove "${holiday.name}"?`)) return;
    try {
      await remove.mutateAsync(holiday.id);
      toast.success('Holiday removed');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const columns = React.useMemo<DataTableColumn<HolidayPublic>[]>(
    () => [
      {
        id: 'date',
        header: 'Date',
        width: 160,
        cell: (h) => (
          <span className="text-fn-fg font-fn-medium text-[13px] tabular-nums">
            {new Date(h.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        ),
      },
      {
        id: 'name',
        header: 'Holiday',
        cell: (h) => <span className="text-fn-fg-muted text-[13px]">{h.name}</span>,
      },
    ],
    [],
  );

  const rowActions = React.useCallback(
    (h: HolidayPublic): DataTableRowAction[] =>
      canManage
        ? [{ label: 'Remove', variant: 'destructive', onClick: () => void handleDelete(h) }]
        : [],
    [canManage],
  );

  return (
    <div className="gap-fn-4 flex flex-col">
      <p className="text-fn-fg-muted max-w-[560px] text-[13px]">
        Company-wide holidays. The attendance rule engine treats these dates as non-working days.
      </p>

      {canManage && (
        <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs p-fn-3_5 gap-fn-2_5 flex flex-wrap items-end border">
          <div className="gap-fn-1 flex flex-col">
            <label className="text-fn-fg-muted text-[12px]">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="gap-fn-1 flex min-w-[220px] flex-1 flex-col">
            <label className="text-fn-fg-muted text-[12px]">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Independence Day"
            />
          </div>
          <Button
            onClick={() => void handleAdd()}
            disabled={create.isPending || !date || !name.trim()}
          >
            <Plus className="h-fn-4 w-fn-4" /> Add holiday
          </Button>
        </div>
      )}

      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs overflow-hidden border">
        <DataTable<HolidayPublic>
          chrome="plain"
          columns={columns}
          rows={rows}
          getRowKey={(h) => h.id}
          isLoading={holidaysQuery.isPending}
          isError={holidaysQuery.isError}
          onRetry={() => holidaysQuery.refetch()}
          totalCount={rows.length}
          rowActions={rowActions}
          emptyState={
            <div className="gap-fn-2 py-fn-12 flex flex-col items-center text-center">
              <p className="text-fn-fg font-fn-semibold text-[14px]">No holidays recorded</p>
              <p className="text-fn-fg-muted max-w-[360px] text-[12.5px]">
                {canManage
                  ? 'Add the first company holiday above.'
                  : 'Ask HR to set up the holiday calendar.'}
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
}
