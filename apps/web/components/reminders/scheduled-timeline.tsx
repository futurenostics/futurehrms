'use client';

import * as React from 'react';
import { useReminderTimeline } from '@/lib/queries/reminders';
import { ruleHue } from './rule-visuals';

/**
 * "Next 30 days · scheduled triggers" strip — matches PNG 12.
 *
 * Renders one column per day for the next 30 days, with department-
 * colored dots stacked under each day showing scheduled fires. Days
 * with no scheduled triggers show only the date label.
 *
 * Color: rules grouped by `ruleKey` get a deterministic hue from the
 * shared `ruleHue` helper so the colors line up with the legend chips
 * and the dept badges in the rules table.
 */
export function ScheduledTimeline() {
  const timeline = useReminderTimeline();

  const days = React.useMemo(() => nextNDays(30), []);
  const buckets = timeline.data?.buckets ?? [];
  const byDay = new Map(buckets.map((b) => [b.date, b]));
  const total = timeline.data?.total ?? 0;
  const monthLabel = monthLabelFor(days);

  // Build legend from the rule keys present in the buckets — chips
  // adopt the same color as their dots in the strip.
  const ruleKeys = React.useMemo(() => {
    const s = new Set<string>();
    for (const b of buckets) for (const r of b.byRule) s.add(r.ruleKey);
    return Array.from(s).sort();
  }, [buckets]);

  return (
    <section className="rounded-fn-sm border-fn-border bg-fn-bg-panel px-fn-4 py-fn-3_5 gap-fn-3 flex flex-col border">
      <div className="gap-fn-3 flex flex-wrap items-baseline justify-between">
        <div className="gap-fn-1 flex flex-col">
          <h2 className="text-fn-fg font-fn-semibold text-[13.5px]">
            Next 30 days · scheduled triggers
          </h2>
          <p className="text-fn-fg-faint text-[11.5px]">
            {total} {total === 1 ? 'event' : 'events'} queued · {monthLabel}
          </p>
        </div>
        {ruleKeys.length > 0 && (
          <ul className="gap-fn-1_5 flex flex-wrap items-center">
            {ruleKeys.slice(0, 6).map((k) => (
              <li key={k} className="gap-fn-1 flex items-center">
                <span
                  aria-hidden
                  className="h-fn-1_5 w-fn-1_5 rounded-fn-full inline-block"
                  style={{ background: `oklch(0.62 0.16 ${ruleHue(k)})` }}
                />
                <span className="text-fn-fg-faint text-[11px]">{prettyKey(k)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="gap-fn-0_5 flex min-w-full items-end">
          {days.map((d) => {
            const bucket = byDay.get(d.iso);
            return (
              <div
                key={d.iso}
                className="gap-fn-0_5 flex min-w-fn-7 flex-1 flex-col items-center"
              >
                <span
                  className={[
                    'tabular-nums text-[10.5px]',
                    d.isToday
                      ? 'text-fn-accent font-fn-semibold'
                      : d.isWeekend
                        ? 'text-fn-fg-faint'
                        : 'text-fn-fg-muted',
                  ].join(' ')}
                >
                  {d.dayOfMonth}
                </span>
                <span
                  className="bg-fn-divider w-px"
                  aria-hidden
                  style={{ height: 6 }}
                />
                <div className="gap-fn-0_5 flex flex-col items-center">
                  {bucket?.byRule.flatMap((r) =>
                    Array.from({ length: Math.min(r.count, 5) }).map((_, i) => (
                      <span
                        key={`${r.ruleId}-${i}`}
                        aria-hidden
                        className="h-fn-1_5 w-fn-1_5 rounded-fn-full inline-block"
                        style={{ background: `oklch(0.62 0.16 ${ruleHue(r.ruleKey)})` }}
                      />
                    )),
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function nextNDays(n: number): Array<{
  iso: string;
  dayOfMonth: number;
  isToday: boolean;
  isWeekend: boolean;
}> {
  const tz = 'Asia/Karachi';
  const out: Array<{ iso: string; dayOfMonth: number; isToday: boolean; isWeekend: boolean }> = [];
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
    out.push({
      iso,
      dayOfMonth,
      isToday: iso === todayIso,
      isWeekend: dow === 'Sat' || dow === 'Sun',
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
  return key
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
