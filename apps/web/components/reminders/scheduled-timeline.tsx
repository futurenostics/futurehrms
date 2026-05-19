'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useReminderTimeline } from '@/lib/queries/reminders';
import { ruleHue } from './rule-visuals';
import { cn } from '@/lib/utils';

/**
 * "Next 30 days · scheduled triggers" strip — matches PNG 12.
 *
 * Layout:
 *   1. Heading "Next 30 days · scheduled triggers" + sub line
 *   2. Legend chips on the right — one chip per ruleKey present in
 *      the next 30 days, dot color matches the bars below
 *   3. 30-day strip: each column is a day; day-number on top; for
 *      days with scheduled fires, a vertical stack of category-tinted
 *      bars sits below, one bar per (rule × queued event)
 *   4. Hover a column with events → Popover with the day's breakdown
 *      (rule label + count). Click → jumps to the scheduled-reminders
 *      page filtered to that date.
 */
export function ScheduledTimeline() {
  const router = useRouter();
  const timeline = useReminderTimeline();

  const days = React.useMemo(() => nextNDays(30), []);
  const buckets = timeline.data?.buckets ?? [];
  const byDay = new Map(buckets.map((b) => [b.date, b]));
  const total = timeline.data?.total ?? 0;
  const monthLabel = monthLabelFor(days);

  // Build legend from the rule keys present in the buckets.
  const ruleKeys = React.useMemo(() => {
    const s = new Set<string>();
    for (const b of buckets) for (const r of b.byRule) s.add(r.ruleKey);
    return Array.from(s).sort();
  }, [buckets]);

  return (
    <section className="rounded-fn-xs border-fn-border bg-fn-bg-panel px-fn-4 py-fn-3_5 gap-fn-3_5 flex flex-col border">
      <div className="gap-fn-3 flex flex-wrap items-start justify-between">
        <div className="gap-fn-1 flex flex-col">
          <h2 className="text-fn-fg font-fn-semibold text-[13.5px]">
            Next 30 days · scheduled triggers
          </h2>
          <p className="text-fn-fg-faint text-[11.5px]">
            {total} {total === 1 ? 'event' : 'events'} queued · {monthLabel}
          </p>
        </div>
        {ruleKeys.length > 0 && (
          <ul className="gap-fn-3 flex flex-wrap items-center">
            {ruleKeys.slice(0, 6).map((k) => (
              <li key={k} className="gap-fn-1_5 flex items-center">
                <span
                  aria-hidden
                  className="h-fn-1_5 w-fn-1_5 rounded-fn-full inline-block"
                  style={{ background: `oklch(0.60 0.18 ${ruleHue(k)})` }}
                />
                <span className="text-fn-fg-muted text-[11px]">{prettyKey(k)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-full items-stretch">
          {days.map((d) => {
            const bucket = byDay.get(d.iso);
            const eventCount = bucket?.total ?? 0;
            const hasEvents = eventCount > 0;
            return (
              <DayColumn
                key={d.iso}
                day={d}
                bucket={bucket}
                hasEvents={hasEvents}
                onOpenScheduled={() =>
                  router.push(`/reminder-rules/scheduled?date=${encodeURIComponent(d.iso)}`)
                }
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */

interface DayColumnProps {
  day: { iso: string; dayOfMonth: number; isToday: boolean; isWeekend: boolean; label: string };
  bucket:
    | { byRule: Array<{ ruleId: string; ruleKey: string; count: number }>; total: number }
    | undefined;
  hasEvents: boolean;
  onOpenScheduled: () => void;
}

function DayColumn({ day, bucket, hasEvents, onOpenScheduled }: DayColumnProps) {
  // Flatten "byRule" into the underlying bars (one bar per queued
  // event, up to a cap so a single busy day doesn't dominate). Order
  // is the same as the legend to keep colour stacking predictable.
  const bars = React.useMemo(() => {
    if (!bucket) return [] as Array<{ key: string; hue: number }>;
    const out: Array<{ key: string; hue: number }> = [];
    const sorted = [...bucket.byRule].sort((a, b) => a.ruleKey.localeCompare(b.ruleKey));
    for (const r of sorted) {
      for (let i = 0; i < Math.min(r.count, 6); i++) {
        out.push({ key: `${r.ruleId}-${i}`, hue: ruleHue(r.ruleKey) });
      }
    }
    return out;
  }, [bucket]);

  const dayNumber = (
    <span
      className={cn(
        'leading-fn-none text-[11px] tabular-nums',
        day.isToday
          ? 'rounded-fn-full bg-fn-accent text-fn-accent-fg font-fn-semibold px-fn-1_5 py-fn-1'
          : day.isWeekend
            ? 'text-fn-fg-faint'
            : 'text-fn-fg-muted',
      )}
    >
      {day.dayOfMonth}
    </span>
  );

  const barStack = (
    <div className="flex w-full flex-col items-stretch gap-[2px]" style={{ minHeight: 24 }}>
      {bars.map((b) => (
        <span
          key={b.key}
          aria-hidden
          className="rounded-fn-px h-[3px] w-full"
          style={{ background: `oklch(0.60 0.18 ${b.hue})` }}
        />
      ))}
    </div>
  );

  // Days with no events: render a non-interactive column.
  if (!hasEvents) {
    return (
      <div
        className="gap-fn-2 min-w-fn-7 flex flex-1 flex-col items-center px-[2px]"
        aria-label={`${day.label} — no scheduled triggers`}
      >
        {dayNumber}
        <span aria-hidden className="bg-fn-divider h-[3px] w-full opacity-60" />
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={onOpenScheduled}
          className={cn(
            'gap-fn-2 hover:bg-fn-bg-subtle rounded-fn-xs min-w-fn-7 flex flex-1 cursor-pointer flex-col items-center px-[2px] py-[2px] transition-colors',
          )}
          aria-label={`${day.label} — ${bucket?.total ?? 0} scheduled triggers; click to open`}
        >
          {dayNumber}
          {barStack}
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" sideOffset={6} className="gap-fn-2 flex w-[260px] flex-col">
        <div className="gap-fn-0_5 flex flex-col">
          <span className="text-fn-fg font-fn-semibold text-[13px]">{day.label}</span>
          <span className="text-fn-fg-faint text-[11.5px]">
            {bucket?.total ?? 0} {bucket?.total === 1 ? 'event' : 'events'} scheduled
          </span>
        </div>
        <ul className="gap-fn-1_5 flex flex-col">
          {bucket?.byRule.map((r) => (
            <li key={r.ruleId} className="gap-fn-2 flex items-center justify-between">
              <span className="gap-fn-1_5 flex min-w-0 items-center">
                <span
                  aria-hidden
                  className="rounded-fn-full h-fn-2 w-fn-2 inline-block shrink-0"
                  style={{ background: `oklch(0.60 0.18 ${ruleHue(r.ruleKey)})` }}
                />
                <span className="text-fn-fg truncate text-[12px]">{prettyKey(r.ruleKey)}</span>
              </span>
              <span className="text-fn-fg-muted text-[12px] tabular-nums">{r.count}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onOpenScheduled}
          className="text-fn-accent text-left text-[11.5px] hover:underline"
        >
          Open scheduled-triggers viewer →
        </button>
      </PopoverContent>
    </Popover>
  );
}

/* ---------------------------------------------------------------- */

function nextNDays(n: number): Array<{
  iso: string;
  dayOfMonth: number;
  isToday: boolean;
  isWeekend: boolean;
  label: string;
}> {
  const tz = 'Asia/Karachi';
  const out: Array<{
    iso: string;
    dayOfMonth: number;
    isToday: boolean;
    isWeekend: boolean;
    label: string;
  }> = [];
  const todayIso = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
    const dayOfMonth = Number(
      new Intl.DateTimeFormat('en-GB', { timeZone: tz, day: 'numeric' }).format(d),
    );
    const dow = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(d);
    const label = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(d);
    out.push({
      iso,
      dayOfMonth,
      isToday: iso === todayIso,
      isWeekend: dow === 'Sat' || dow === 'Sun',
      label,
    });
  }
  return out;
}

function monthLabelFor(days: Array<{ iso: string }>): string {
  const first = days[0]?.iso;
  if (!first) return '';
  const d = new Date(`${first}T12:00:00Z`);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(d);
}

function prettyKey(key: string): string {
  return key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
