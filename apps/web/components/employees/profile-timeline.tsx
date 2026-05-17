'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp, Briefcase, Check, Clock, CreditCard, Flag, Star } from 'lucide-react';
import type { TimelineEntryPublic } from '@futurenostics/types';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { useTimeline } from '@/lib/queries/employees';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Profile / Activity timeline — matches
 * docs/design/screens/employee-profile-timeline.jsx.
 *
 * Anatomy:
 *   • Section header: clock icon + "Activity timeline" + count badge
 *     + module-filter chip group ("All / HR / Commissions / Projects")
 *   • Continuous left rail (2px line) running the height of the list
 *   • Per-event row: icon bubble centred on the rail + body card
 *   • Body card: title + module badge + ("Latest" pill when newest)
 *     + detail + optional amount/tag on the right, then a
 *     dashed-divider footer with the date + actor
 *   • Month-group dividers ("MAY 2026" uppercase) every time the
 *     month changes top-to-bottom
 *   • "Show N earlier events" loader at the bottom (we render
 *     everything for now; the button still appears when total > 6)
 *
 * The card padding uses the existing fn-* tokens; the rail's
 * absolute position lives at left:39 (the bubble centre) per the
 * design spec.
 */
export interface ProfileTimelineProps {
  employeeId: string;
}

type ModuleFilter = 'all' | 'hr' | 'commissions' | 'projects';

export function ProfileTimeline({ employeeId }: ProfileTimelineProps) {
  const query = useTimeline(employeeId);
  const [filter, setFilter] = React.useState<ModuleFilter>('all');
  const [showAll, setShowAll] = React.useState(false);

  if (query.isLoading) return <TimelineSkeleton />;
  if (query.isError) {
    return (
      <Card>
        <div className="text-fn-fg-muted gap-fn-2 py-fn-12 flex flex-col items-center text-center text-[13px]">
          <p>Couldn't load the timeline.</p>
        </div>
      </Card>
    );
  }

  const all = query.data ?? [];
  const filtered = all.filter((e) => matchesFilter(e, filter));
  const visible = showAll ? filtered : filtered.slice(0, 6);
  const hidden = filtered.length - visible.length;

  if (visible.length === 0) {
    return (
      <Card>
        <TimelineHeader count={0} filter={filter} onFilterChange={setFilter} />
        <div className="text-fn-fg-muted py-fn-12 flex flex-col items-center text-center text-[13px]">
          <p>No timeline events yet.</p>
        </div>
      </Card>
    );
  }

  // Group consecutive entries by their YYYY-MM month so the renderer
  // can drop a divider whenever the month changes top-to-bottom.
  const groups: Array<
    | { type: 'header'; label: string }
    | { type: 'item'; entry: TimelineEntryPublic; latest: boolean }
  > = [];
  let lastMonth = '';
  visible.forEach((entry, idx) => {
    const d = new Date(entry.occurredAt);
    const monthLabel = `${d.toLocaleString('en-GB', { month: 'long' })} ${d.getFullYear()}`;
    if (monthLabel !== lastMonth) {
      groups.push({ type: 'header', label: monthLabel });
      lastMonth = monthLabel;
    }
    groups.push({ type: 'item', entry, latest: idx === 0 });
  });

  return (
    <Card>
      <TimelineHeader count={filtered.length} filter={filter} onFilterChange={setFilter} />
      <div className="px-fn-5 pb-fn-5 relative">
        {/* Continuous left rail */}
        <div
          aria-hidden
          className="bg-fn-border rounded-fn-full absolute"
          style={{ top: 4, bottom: 22, left: 39, width: 2 }}
        />

        {groups.map((g, gi) => {
          if (g.type === 'header') {
            return (
              <div
                key={`h-${gi}`}
                className={cn(
                  'text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight pl-fn-15 pb-fn-2_5 relative text-[11px] uppercase',
                  gi === 0 ? 'pt-fn-1_5' : 'pt-fn-4',
                )}
              >
                {g.label}
              </div>
            );
          }
          const entry = g.entry;
          const tone = toneForModule(entry.module);
          return (
            <div
              key={`i-${entry.id}`}
              className="pb-fn-3_5 gap-fn-4 pt-fn-0_5 relative flex items-stretch"
            >
              <TimelineBubble icon={iconForEvent(entry)} tone={tone} />
              <TimelineCard entry={entry} tone={tone} highlight={g.latest} />
            </div>
          );
        })}

        {!showAll && hidden > 0 && (
          <div className="pl-fn-15 mt-fn-1">
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="border-fn-border-strong text-fn-fg-muted hover:bg-fn-bg-subtle rounded-fn-xs gap-fn-1_5 px-fn-3_5 py-fn-2 font-fn-medium inline-flex cursor-pointer items-center border text-[12.5px] transition-colors"
            >
              <ArrowDown className="h-fn-3 w-fn-3" />
              Show {hidden} earlier {hidden === 1 ? 'event' : 'events'}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ─────────────── Sub-components ─────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-fn-border bg-fn-bg-panel rounded-fn-sm overflow-hidden border">
      {children}
    </div>
  );
}

function TimelineHeader({
  count,
  filter,
  onFilterChange,
}: {
  count: number;
  filter: ModuleFilter;
  onFilterChange: (f: ModuleFilter) => void;
}) {
  const chips: Array<{ value: ModuleFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'hr', label: 'HR' },
    { value: 'commissions', label: 'Commissions' },
    { value: 'projects', label: 'Projects' },
  ];
  return (
    <div className="border-fn-divider gap-fn-3 px-fn-5 py-fn-4 flex items-center border-b">
      <span
        aria-hidden
        className="rounded-fn-xs h-fn-7 w-fn-7 bg-fn-icon-tile text-fn-icon-tile-fg inline-flex shrink-0 items-center justify-center"
      >
        <Clock className="h-fn-3_5 w-fn-3_5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="gap-fn-2 flex items-center">
          <h2 className="text-fn-fg font-fn-semibold tracking-fn-tight text-[15px]">
            Activity timeline
          </h2>
          <span className="bg-fn-bg-inset text-fn-fg-muted rounded-fn-full px-fn-2 py-fn-0_5 font-fn-medium inline-flex items-center text-[11px]">
            {count}
          </span>
        </div>
      </div>
      <div className="border-fn-border-strong bg-fn-bg-subtle rounded-fn-xs p-fn-0_5 inline-flex border">
        {chips.map((c) => {
          const on = c.value === filter;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => onFilterChange(c.value)}
              className={cn(
                'rounded-fn-xs px-fn-2_5 py-fn-1 font-fn-semibold cursor-pointer text-[11.5px] transition-colors',
                on ? 'bg-fn-bg-panel text-fn-fg shadow-fn-xs' : 'text-fn-fg-muted hover:text-fn-fg',
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimelineBubble({ icon, tone }: { icon: React.ReactNode; tone: Tone }) {
  return (
    <span
      aria-hidden
      className={cn(
        'rounded-fn-xs border-fn-bg-panel mt-fn-1 ml-fn-1_5 h-fn-8 w-fn-8 relative z-10 inline-flex shrink-0 items-center justify-center border-[3px] outline outline-1 -outline-offset-[3px]',
        TONE_BG[tone],
        TONE_FG[tone],
        TONE_OUTLINE[tone],
      )}
    >
      {icon}
    </span>
  );
}

function TimelineCard({
  entry,
  tone,
  highlight,
}: {
  entry: TimelineEntryPublic;
  tone: Tone;
  highlight: boolean;
}) {
  const date = new Date(entry.occurredAt);
  const dateLabel = `${date.getDate()} ${date.toLocaleString('en-GB', { month: 'short' })} ${date.getFullYear()}`;
  return (
    <div
      className={cn(
        'rounded-fn-sm px-fn-3_5 py-fn-3 min-w-0 flex-1 border',
        highlight ? 'bg-fn-accent-soft/60 border-fn-accent/25' : 'bg-fn-bg-subtle border-fn-border',
      )}
    >
      <div className="gap-fn-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="gap-fn-2 flex flex-wrap items-center">
            <span
              className="text-fn-fg font-fn-semibold text-[13.5px]"
              style={{ letterSpacing: '-0.005em' }}
            >
              {entry.title}
            </span>
            <Badge tone={toneToBadge(tone)}>{prettyModule(entry.module)}</Badge>
            {highlight && (
              <Badge tone="accent" dot>
                Latest
              </Badge>
            )}
          </div>
          <div className="text-fn-fg-muted mt-fn-1 text-[12.5px]">{describeDetails(entry)}</div>
        </div>
        {/* Right slot — amount or tag are pulled from details when present */}
        {extractAmount(entry) && (
          <Badge tone="success" className="font-mono">
            {extractAmount(entry)}
          </Badge>
        )}
      </div>
      <div className="gap-fn-2 mt-fn-2_5 pt-fn-2_5 border-fn-border text-fn-fg-faint flex items-center border-t border-dashed text-[11.5px]">
        <Clock className="h-fn-3 w-fn-3" />
        <span className="font-mono">{dateLabel}</span>
        <span aria-hidden className="bg-fn-fg-faint rounded-fn-full h-[3px] w-[3px]" />
        <span>
          by{' '}
          <strong className="text-fn-fg-muted font-fn-semibold">
            {extractActor(entry) ?? 'System'}
          </strong>
        </span>
      </div>
    </div>
  );
}

// Map the local Tone scale (used by the icon bubble's outline + bg)
// onto the BadgeTone union. The bubble keeps its bespoke tone scheme
// because it's a *visual ornament* on the rail, not a label.
function toneToBadge(tone: Tone): BadgeTone {
  if (tone === 'neutral') return 'default';
  return tone;
}

function TimelineSkeleton() {
  return (
    <Card>
      <div className="px-fn-5 py-fn-4 border-fn-divider border-b">
        <Skeleton className="h-fn-4 w-fn-32" />
      </div>
      <div className="px-fn-5 py-fn-5 gap-fn-4 flex flex-col">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="gap-fn-4 flex">
            <Skeleton className="h-fn-8 w-fn-8 rounded-fn-xs shrink-0" />
            <div className="gap-fn-2 flex flex-1 flex-col">
              <Skeleton className="h-fn-3 w-fn-40" />
              <Skeleton className="h-fn-3 w-fn-56" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─────────────── Tone + module helpers ─────────────── */

type Tone = 'success' | 'warning' | 'info' | 'accent' | 'neutral';

const TONE_BG: Record<Tone, string> = {
  success: 'bg-fn-success-soft',
  warning: 'bg-fn-warning-soft',
  info: 'bg-fn-info-soft',
  accent: 'bg-fn-accent-soft',
  neutral: 'bg-fn-bg-subtle',
};
const TONE_FG: Record<Tone, string> = {
  success: 'text-fn-success-soft-fg',
  warning: 'text-fn-warning-soft-fg',
  info: 'text-fn-info-soft-fg',
  accent: 'text-fn-accent-soft-fg',
  neutral: 'text-fn-fg-muted',
};
const TONE_OUTLINE: Record<Tone, string> = {
  success: 'outline-fn-success/30',
  warning: 'outline-fn-warning/30',
  info: 'outline-fn-info/30',
  accent: 'outline-fn-accent/30',
  neutral: 'outline-fn-border',
};
function toneForModule(mod: string): Tone {
  const m = mod.toLowerCase();
  if (m.includes('commission') || m.includes('payroll')) return 'success';
  if (m.includes('project')) return 'info';
  if (m.includes('hr') || m.includes('employee')) return 'accent';
  return 'neutral';
}

function iconForEvent(entry: TimelineEntryPublic): React.ReactNode {
  const e = entry.eventType.toLowerCase();
  if (e.includes('commission') || e.includes('payroll'))
    return <CreditCard className="h-fn-3_5 w-fn-3_5" />;
  if (e.includes('review') || e.includes('evaluation'))
    return <Star className="h-fn-3_5 w-fn-3_5" />;
  if (e.includes('project') || e.includes('assign'))
    return <Briefcase className="h-fn-3_5 w-fn-3_5" />;
  if (e.includes('salary') || e.includes('increment'))
    return <ArrowUp className="h-fn-3_5 w-fn-3_5" />;
  if (e.includes('status') || e.includes('probation') || e.includes('permanent'))
    return <Check className="h-fn-3_5 w-fn-3_5" />;
  if (e.includes('created') || e.includes('hire') || e.includes('joined'))
    return <Flag className="h-fn-3_5 w-fn-3_5" />;
  return <Clock className="h-fn-3_5 w-fn-3_5" />;
}

function prettyModule(mod: string): string {
  return mod
    .replace(/[._-]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(' ');
}

function describeDetails(entry: TimelineEntryPublic): string {
  // The TimelineEntryPublic `details` field is intentionally unknown
  // so we coerce to a friendly summary for the common shapes (object
  // with a `note` or `from`/`to`/`reason`, or plain string).
  const d = entry.details;
  if (d == null) return entry.eventType.replace(/\./g, ' ');
  if (typeof d === 'string') return d;
  if (typeof d === 'object') {
    const o = d as Record<string, unknown>;
    if (typeof o.note === 'string') return o.note;
    if (typeof o.reason === 'string') return o.reason;
    if ('from' in o && 'to' in o) return `${stringify(o.from)} → ${stringify(o.to)}`;
    if (typeof o.title === 'string') return o.title;
  }
  return entry.eventType.replace(/\./g, ' ');
}

function extractAmount(entry: TimelineEntryPublic): string | null {
  const d = entry.details as Record<string, unknown> | null;
  if (!d || typeof d !== 'object') return null;
  if (typeof d.amount === 'string') return d.amount;
  if (typeof d.amount === 'number')
    return `${d.amount >= 0 ? '+' : ''}${d.amount.toLocaleString()}`;
  if (typeof d.delta === 'string') return d.delta;
  return null;
}

function extractActor(entry: TimelineEntryPublic): string | null {
  const d = entry.details as Record<string, unknown> | null;
  if (d && typeof d === 'object' && typeof d.actor === 'string') return d.actor;
  return null;
}

function stringify(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return JSON.stringify(value);
}

function matchesFilter(entry: TimelineEntryPublic, filter: ModuleFilter): boolean {
  if (filter === 'all') return true;
  const m = entry.module.toLowerCase();
  if (filter === 'hr') return m.includes('hr') || m.includes('employee');
  if (filter === 'commissions') return m.includes('commission') || m.includes('payroll');
  if (filter === 'projects') return m.includes('project');
  return true;
}
