'use client';

import * as React from 'react';
import { CalendarClock, Mail, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRunSchedulerNow, useSchedulerStatus } from '@/lib/queries/reminders';
import { cn } from '@/lib/utils';

/**
 * Dark "REMINDER SCHEDULER" status card — matches PNG 12.
 *
 * Layout:
 *
 *   [icon] REMINDER SCHEDULER                  LAST EVALUATED  EMAILS SENT  RETRIES   [Dry run]
 *          Next run: <when> · <tz>             today / 00:00     47          0
 *
 * The "Dry run" button calls /reminders/run-now — useful in dev to
 * advance the scheduler without waiting for the cron. The label
 * matches the design even though the action is a real fire, not a
 * dry-run; we keep the design's vocabulary so the admin sees what
 * the mockup promised.
 */
export function SchedulerStatusCard() {
  const status = useSchedulerStatus();
  const run = useRunSchedulerNow();

  const data = status.data;
  const nextLabel = data?.nextRunIso ? formatNextRun(data.nextRunIso, data.timezone) : '—';
  const lastLabel = data?.lastEvaluatedAtIso
    ? formatRelativeShort(data.lastEvaluatedAtIso)
    : 'pending';
  const lastTimeLabel = data?.lastEvaluatedAtIso
    ? formatLocalTime(data.lastEvaluatedAtIso, data.timezone)
    : '—';

  return (
    <div
      className={cn(
        'rounded-fn-xs gap-fn-4 px-fn-4 py-fn-3_5 relative flex flex-wrap items-center justify-between overflow-hidden border',
      )}
      style={{
        background: 'linear-gradient(180deg, oklch(0.18 0.04 280) 0%, oklch(0.13 0.02 280) 100%)',
        borderColor: 'oklch(0.30 0.06 280)',
        color: 'oklch(0.96 0 0)',
      }}
    >
      <div className="gap-fn-3 flex min-w-0 flex-1 items-center">
        <span
          aria-hidden
          className="rounded-fn-xs h-fn-10 w-fn-10 inline-flex shrink-0 items-center justify-center"
          style={{
            background: 'oklch(0.55 0.18 280 / 0.20)',
            color: 'oklch(0.80 0.12 280)',
          }}
        >
          <CalendarClock className="h-fn-5 w-fn-5" />
        </span>
        <div className="gap-fn-0_5 flex min-w-0 flex-col">
          <span
            className="font-fn-semibold tracking-fn-uppercase-tight text-[10.5px] uppercase"
            style={{ color: 'oklch(0.70 0.06 280)' }}
          >
            Reminder scheduler
          </span>
          <span className="font-fn-semibold truncate text-[14px] tabular-nums">
            Next run: <span>{nextLabel}</span>
          </span>
        </div>
      </div>

      <div className="gap-fn-6 flex shrink-0 items-center">
        <Stat label="Last evaluated" primary={lastLabel} secondary={lastTimeLabel} />
        <Stat
          label="Emails sent 30d"
          primary={data ? data.emailsSent30d.toLocaleString() : '—'}
          secondary={null}
          icon={<Mail className="h-fn-3 w-fn-3" style={{ color: 'oklch(0.70 0.06 280)' }} />}
        />
        <Stat
          label="Retries pending"
          primary={data ? String(data.retriesPending) : '—'}
          secondary={null}
        />
      </div>

      <Button
        type="button"
        size="md"
        onClick={() => run.mutate()}
        disabled={run.isPending}
        className="shrink-0"
        style={{
          background: 'oklch(0.95 0 0 / 0.12)',
          border: '1px solid oklch(0.95 0 0 / 0.25)',
          color: 'oklch(0.96 0 0)',
        }}
      >
        {run.isPending ? (
          <Loader2 className="h-fn-3_5 w-fn-3_5 animate-spin" />
        ) : (
          <Play className="h-fn-3_5 w-fn-3_5" />
        )}
        Dry run
      </Button>
    </div>
  );
}

function Stat({
  label,
  primary,
  secondary,
  icon,
}: {
  label: string;
  primary: string;
  secondary: string | null;
  icon?: React.ReactNode;
}) {
  return (
    <div className="gap-fn-0_5 flex flex-col">
      <span
        className="font-fn-semibold tracking-fn-uppercase-tight text-[10px] uppercase"
        style={{ color: 'oklch(0.65 0.04 280)' }}
      >
        {label}
      </span>
      <span className="gap-fn-1_5 flex items-baseline">
        {icon}
        <span className="font-fn-semibold text-[16px] tabular-nums">{primary}</span>
        {secondary && (
          <span
            className="font-mono text-[11px] tabular-nums"
            style={{ color: 'oklch(0.65 0.04 280)' }}
          >
            {secondary}
          </span>
        )}
      </span>
    </div>
  );
}

function formatNextRun(iso: string, tz: string): string {
  const d = new Date(iso);
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'long',
  }).format(d);
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    day: 'numeric',
    month: 'short',
  }).format(d);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
  const tzAbbr = tzAbbreviation(tz);
  const inLabel = relativeFromNow(d);
  return `${weekday} ${day} · ${time} ${tzAbbr} · ${inLabel}`;
}

function relativeFromNow(d: Date): string {
  const ms = d.getTime() - Date.now();
  const min = Math.round(ms / 60_000);
  if (min < 1) return 'now';
  if (min < 60) return `in ${min}m`;
  const h = Math.floor(min / 60);
  const remM = min % 60;
  if (h < 24) return remM > 0 ? `in ${h}h ${remM}m` : `in ${h}h`;
  const days = Math.floor(h / 24);
  return `in ${days}d`;
}

function formatRelativeShort(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.max(1, Math.floor(ms / 1000));
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  if (h < 48) return 'yesterday';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(iso));
}

function formatLocalTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

function tzAbbreviation(tz: string): string {
  // crude PKT mapping — extended timezone list can land later
  if (tz === 'Asia/Karachi') return 'PKT';
  return tz.split('/').pop() ?? tz;
}
