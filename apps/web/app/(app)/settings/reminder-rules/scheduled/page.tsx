'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, X } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/shell/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DataTable,
  type DataTableColumn,
  type DataTableRowAction,
} from '@/components/ui/data-table';
import {
  useCancelScheduled,
  useScheduledReminders,
  type ReminderPublic,
} from '@/lib/queries/reminders';
import { ruleHue } from '@/components/reminders/rule-visuals';
import { cn } from '@/lib/utils';

/**
 * /settings/reminder-rules/scheduled — HR-admin debug view of every
 * scheduled, fired, or cancelled Reminder row.
 *
 * Use case: "why didn't <person> get the reminder?" — admin opens
 * this page filtered by status=scheduled, finds the row, sees the
 * scheduledFor + recipient + ruleKey, and can cancel if needed.
 */
type StatusFilter = 'scheduled' | 'fired' | 'cancelled' | 'all';

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'fired', label: 'Fired' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All' },
];

export default function ScheduledRemindersPage() {
  const router = useRouter();
  const [status, setStatus] = React.useState<StatusFilter>('scheduled');
  const list = useScheduledReminders(status);
  const cancel = useCancelScheduled();

  const columns = React.useMemo<DataTableColumn<ReminderPublic>[]>(
    () => [
      {
        id: 'rule',
        header: 'Rule',
        cell: (r) => (
          <div className="gap-fn-2 flex min-w-0 items-center">
            <span
              aria-hidden
              className="h-fn-2 w-fn-2 shrink-0 rounded-fn-full"
              style={{ background: `oklch(0.60 0.16 ${ruleHue(r.ruleKey)})` }}
            />
            <div className="gap-fn-0_5 flex min-w-0 flex-col">
              <span className="text-fn-fg font-fn-semibold truncate text-[13px]">
                {r.ruleName}
              </span>
              <span className="text-fn-fg-faint font-mono truncate text-[10.5px]">
                {r.ruleKey}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: 'recipient',
        header: 'Recipient',
        cell: (r) => (
          <div className="gap-fn-0_5 flex min-w-0 flex-col">
            <span className="text-fn-fg font-fn-medium truncate text-[12.5px]">
              {r.recipientName ?? r.recipientEmail}
            </span>
            {r.recipientName && (
              <span className="text-fn-fg-faint font-mono truncate text-[10.5px]">
                {r.recipientEmail}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'scheduled',
        header: 'Scheduled for',
        width: 180,
        cell: (r) => (
          <span className="text-fn-fg text-[12.5px] tabular-nums">
            {formatDateTime(r.scheduledFor)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        width: 120,
        cell: (r) => <StatusPill status={r.status} />,
      },
      {
        id: 'fired',
        header: 'Fired at',
        width: 160,
        cell: (r) => (
          <span
            className={cn(
              'text-[12px] tabular-nums',
              r.firedAt ? 'text-fn-fg' : 'text-fn-fg-faint',
            )}
          >
            {r.firedAt ? formatDateTime(r.firedAt) : '—'}
          </span>
        ),
      },
    ],
    [],
  );

  const rowActions = React.useCallback(
    (r: ReminderPublic): DataTableRowAction[] => {
      if (r.status !== 'scheduled') return [];
      return [
        {
          label: 'Cancel reminder',
          variant: 'destructive',
          onClick: async () => {
            const reason = prompt('Cancellation reason?', 'manual cancel');
            if (!reason) return;
            try {
              await cancel.mutateAsync({ id: r.id, reason });
              toast.success('Reminder cancelled');
            } catch (e) {
              toast.error((e as Error).message);
            }
          },
        },
      ];
    },
    [cancel],
  );

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Reminders' },
        { label: 'Rules' },
        { label: 'Scheduled' },
      ]}
    >
      <div className="gap-fn-5 flex h-full flex-col">
        <div className="gap-fn-3 flex flex-wrap items-end justify-between">
          <div className="gap-fn-1_5 flex flex-col">
            <div className="gap-fn-1_5 flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/settings/reminder-rules')}
              >
                <ArrowLeft className="h-fn-3_5 w-fn-3_5" /> Back to rules
              </Button>
            </div>
            <h1
              className="text-fn-fg font-fn-semibold text-[24px]"
              style={{ letterSpacing: '-0.02em' }}
            >
              Scheduled reminders
            </h1>
            <p className="text-fn-fg-muted max-w-[640px] text-[14px]">
              Inbox view of every Reminder row produced by event triggers + cron evaluations.
              Cancel a scheduled row if a rule mis-fired or the source entity changed.
            </p>
          </div>
        </div>

        <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs flex min-h-0 flex-1 flex-col overflow-hidden border">
          <div className="border-fn-divider gap-fn-1_5 px-fn-5 py-fn-3_5 flex shrink-0 flex-wrap items-center border-b">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatus(f.value)}
                className={cn(
                  'rounded-fn-xs px-fn-2_5 py-fn-1 font-fn-medium cursor-pointer border text-[12.5px] transition-colors',
                  status === f.value
                    ? 'border-fn-accent/30 bg-fn-accent-soft text-fn-accent-soft-fg'
                    : 'border-fn-border bg-fn-bg-panel text-fn-fg-muted hover:border-fn-fg-faint',
                )}
              >
                {f.label}
              </button>
            ))}
            <span className="text-fn-fg-faint ml-auto text-[12px]">
              {list.data?.total ?? 0} {(list.data?.total ?? 0) === 1 ? 'row' : 'rows'}
            </span>
          </div>

          <div className="min-h-0 flex-1">
            <DataTable<ReminderPublic>
              chrome="plain"
              columns={columns}
              rows={list.data?.items ?? []}
              getRowKey={(r) => r.id}
              isLoading={list.isPending}
              isError={list.isError}
              onRetry={() => list.refetch()}
              totalCount={list.data?.total ?? 0}
              rowActions={rowActions}
              emptyState={
                <div className="gap-fn-2 py-fn-12 flex flex-col items-center text-center">
                  <X className="text-fn-fg-faint h-fn-6 w-fn-6" />
                  <p className="text-fn-fg font-fn-semibold text-[13.5px]">
                    Nothing {status === 'all' ? 'recorded' : status}
                  </p>
                  <p className="text-fn-fg-muted max-w-[360px] text-[12px]">
                    {status === 'scheduled'
                      ? 'No reminders are queued. The trigger evaluator hasn’t inserted any rows for active rules yet.'
                      : 'Switch filter to see other states.'}
                  </p>
                </div>
              }
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StatusPill({ status }: { status: ReminderPublic['status'] }) {
  const tone =
    status === 'scheduled' ? 'info' : status === 'fired' ? 'success' : 'default';
  const label = status[0]!.toUpperCase() + status.slice(1);
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'Asia/Karachi',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
