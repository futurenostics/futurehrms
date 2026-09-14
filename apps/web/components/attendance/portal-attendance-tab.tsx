'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { useAttendanceRecords, type AttendanceRecordPublic } from '@/lib/queries/attendance';
import {
  ATTENDANCE_STATUS_LABEL,
  ATTENDANCE_STATUS_TONE,
  attendanceTimeLabel,
} from '@/components/attendance/status';

export interface PortalAttendanceTabProps {
  employeeId: string;
}

/** YYYY-MM for the current calendar month, in the viewer's local time. */
function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(Date.UTC(y!, (m ?? 1) - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Whole calendar month, as UTC boundaries — matches how AttendanceRecord.date is stored (UTC midnight per local calendar day). */
function monthRange(monthKey: string): { from: string; to: string } {
  const [y, m] = monthKey.split('-').map(Number);
  const from = new Date(Date.UTC(y!, (m ?? 1) - 1, 1));
  const to = new Date(Date.UTC(y!, m ?? 1, 0, 23, 59, 59, 999));
  return { from: from.toISOString(), to: to.toISOString() };
}

const TALLY_ORDER: Array<AttendanceRecordPublic['status']> = [
  'present',
  'late',
  'half_day',
  'absent',
  'on_leave',
];

export function PortalAttendanceTab({ employeeId }: PortalAttendanceTabProps) {
  const [monthKey, setMonthKey] = React.useState(currentMonthKey());
  const { from, to } = monthRange(monthKey);
  const query = useAttendanceRecords({ from, to, employeeId });

  const rows = query.data?.items ?? [];
  const tallies = query.data?.tallies ?? {};

  const columns = React.useMemo<DataTableColumn<AttendanceRecordPublic>[]>(
    () => [
      {
        id: 'date',
        header: 'Date',
        width: 160,
        cell: (r) => (
          <span className="text-fn-fg font-fn-medium text-[13px] tabular-nums">
            {new Date(r.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              timeZone: 'UTC',
            })}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        width: 120,
        cell: (r) => (
          <Badge tone={ATTENDANCE_STATUS_TONE[r.status]}>
            {ATTENDANCE_STATUS_LABEL[r.status] ?? r.status}
          </Badge>
        ),
      },
      {
        id: 'checkin',
        header: 'Check-in',
        width: 110,
        cell: (r) => (
          <span className="text-fn-fg-muted text-[12.5px] tabular-nums">
            {attendanceTimeLabel(r.checkIn)}
          </span>
        ),
      },
      {
        id: 'checkout',
        header: 'Check-out',
        width: 110,
        cell: (r) => (
          <span className="text-fn-fg-muted text-[12.5px] tabular-nums">
            {attendanceTimeLabel(r.checkOut)}
          </span>
        ),
      },
      {
        id: 'hours',
        header: 'Working hours',
        width: 120,
        align: 'right',
        cell: (r) => (
          <span className="text-fn-fg-muted text-[12.5px] tabular-nums">
            {r.workingHours > 0 ? `${r.workingHours}h` : '—'}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="gap-fn-4 flex flex-col">
      {/* Month nav */}
      <div className="gap-fn-3 flex items-center justify-between">
        <div className="gap-fn-1 flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMonthKey((k) => shiftMonthKey(k, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-fn-4 w-fn-4" />
          </Button>
          <span className="text-fn-fg font-fn-semibold min-w-[140px] text-center text-[14px]">
            {monthLabel(monthKey)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMonthKey((k) => shiftMonthKey(k, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-fn-4 w-fn-4" />
          </Button>
        </div>
        {monthKey !== currentMonthKey() && (
          <button
            type="button"
            onClick={() => setMonthKey(currentMonthKey())}
            className="text-fn-accent-soft-fg font-fn-semibold cursor-pointer text-[12.5px] hover:underline"
          >
            Back to this month
          </button>
        )}
      </div>

      {/* Status tallies */}
      {!query.isPending && !query.isError && rows.length > 0 && (
        <div className="gap-fn-3 grid grid-cols-2 md:grid-cols-5">
          {TALLY_ORDER.filter((s) => tallies[s]).map((s) => (
            <div
              key={s}
              className="border-fn-border rounded-fn-xs px-fn-3 py-fn-2_5 gap-fn-1 flex flex-col border"
            >
              <span className="text-fn-fg-faint text-[10.5px] uppercase tracking-[0.06em]">
                {ATTENDANCE_STATUS_LABEL[s]}
              </span>
              <span className="text-fn-fg font-fn-semibold text-[16px] tabular-nums">
                {tallies[s]}
              </span>
            </div>
          ))}
        </div>
      )}

      <DataTable<AttendanceRecordPublic>
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        isLoading={query.isPending}
        isError={query.isError}
        onRetry={() => query.refetch()}
        totalCount={rows.length}
        emptyState={
          <div className="gap-fn-2 py-fn-12 flex flex-col items-center text-center">
            <p className="text-fn-fg font-fn-semibold text-[14px]">No records this month</p>
            <p className="text-fn-fg-muted max-w-[360px] text-[12.5px]">
              Nothing punched for {monthLabel(monthKey)} yet.
            </p>
          </div>
        }
      />
    </div>
  );
}
