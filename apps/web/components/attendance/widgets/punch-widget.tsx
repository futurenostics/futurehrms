'use client';

import * as React from 'react';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePunch, usePunchToday, type PunchStatus } from '@/lib/queries/attendance';

/**
 * Dashboard widget — Check In / Check Out. Registered via the
 * attendance manifest's `dashboardWidgets` (key
 * 'attendance.punch_widget'); gated by `attendance:punch`.
 */

const STATUS_TONE: Record<PunchStatus, BadgeTone> = {
  present: 'success',
  late: 'warning',
  half_day: 'warning',
  absent: 'danger',
  on_leave: 'info',
  holiday: 'default',
  weekend: 'default',
  remote: 'accent',
};

const STATUS_LABEL: Record<PunchStatus, string> = {
  present: 'Present',
  late: 'Late',
  half_day: 'Half day',
  absent: 'Absent',
  on_leave: 'On leave',
  holiday: 'Holiday',
  weekend: 'Weekend',
  remote: 'Remote',
};

function timeLabel(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function PunchWidget() {
  const { data, isLoading, isError } = usePunchToday();
  const record = data?.record ?? null;
  const punch = usePunch();

  const checkedIn = !!record?.checkIn;
  const checkedOut = !!record?.checkOut;

  async function handlePunch(): Promise<void> {
    try {
      await punch.mutateAsync({ punchType: checkedIn ? 'out' : 'in' });
      toast.success(checkedIn ? 'Checked out' : 'Checked in');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Card className="p-fn-6">
      <div className="gap-fn-3 flex items-start">
        <div
          className="rounded-fn-md h-fn-10 w-fn-10 flex shrink-0 items-center justify-center"
          style={{ background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)' }}
        >
          <Clock className="h-fn-4 w-fn-4" />
        </div>
        <div className="gap-fn-2 flex min-w-0 flex-1 flex-col">
          <div className="gap-fn-2 flex items-center justify-between">
            <span className="text-fn-fg-muted font-fn-medium text-[14px]">
              Today&rsquo;s attendance
            </span>
            {!isLoading && !isError && (
              <Badge tone={record ? STATUS_TONE[record.status] : 'default'}>
                {record ? (STATUS_LABEL[record.status] ?? record.status) : 'Not checked in'}
              </Badge>
            )}
          </div>

          {isLoading ? (
            <Skeleton className="h-fn-4 w-fn-32" />
          ) : isError ? (
            <div className="text-fn-fg-faint text-[12.5px]">
              Could not load today&rsquo;s status.
            </div>
          ) : (
            <div className="text-fn-fg-muted text-[12.5px] tabular-nums">
              In {timeLabel(record?.checkIn ?? null)} · Out {timeLabel(record?.checkOut ?? null)}
            </div>
          )}

          <Button
            size="sm"
            onClick={() => void handlePunch()}
            disabled={isLoading || isError || punch.isPending || checkedOut}
            className="w-fit"
          >
            {checkedOut ? (
              'Done for today'
            ) : checkedIn ? (
              <>
                <LogOut className="h-fn-3_5 w-fn-3_5" /> Check Out
              </>
            ) : (
              <>
                <LogIn className="h-fn-3_5 w-fn-3_5" /> Check In
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
