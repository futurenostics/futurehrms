'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { validateCronExpression } from '@/lib/cron-validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Structured cron expression builder.
 *
 *   Frequency
 *     ├─ Hourly       → fires at the top of every Nth hour
 *     ├─ Daily        → fires at a given hour
 *     ├─ Weekly       → fires on selected weekdays at a given hour
 *     ├─ Monthly      → fires on the Nth of every month at a given hour
 *     ├─ Yearly       → fires on the Nth of a chosen month at a given hour
 *     └─ Custom       → freeform 5-field cron, no UI helpers
 *
 * Composes the standard 5-field cron string `m h dom mon dow`. The
 * scheduler ticks hourly, so the minute field is always 0 in the
 * built-in modes — the Custom mode lets power users set anything
 * (the tick still only runs at the top of the hour, so non-zero
 * minutes won't fire on the minute, but the schedule is recorded
 * faithfully for future per-minute tick support).
 *
 * Renders a short human summary under the picker
 * ("Every Monday at 09:00 PKT") + a faint cron echo so the user
 * sees the exact expression they're storing.
 */

type Freq = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

const FREQ_OPTIONS: Array<{ value: Freq; label: string }> = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom expression' },
];

const WEEKDAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const MONTHS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' },
];

export interface CronPickerProps {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}

export function CronPicker({ value, onChange, disabled }: CronPickerProps) {
  // Decode whatever expression we were given into structured state.
  // If parsing fails or the expression doesn't fit one of the
  // built-in modes, we fall back to 'custom'.
  const decoded = React.useMemo(() => decode(value), [value]);

  const [freq, setFreq] = React.useState<Freq>(decoded.freq);
  const [hour, setHour] = React.useState<number>(decoded.hour);
  const [step, setStep] = React.useState<number>(decoded.step);
  const [weekdays, setWeekdays] = React.useState<Set<number>>(decoded.weekdays);
  const [dayOfMonth, setDayOfMonth] = React.useState<number>(decoded.dayOfMonth);
  const [month, setMonth] = React.useState<number>(decoded.month);
  const [customExpr, setCustomExpr] = React.useState<string>(decoded.customExpr ?? value);

  // Re-hydrate when an external value lands (edit mode loads a rule).
  React.useEffect(() => {
    const next = decode(value);
    setFreq(next.freq);
    setHour(next.hour);
    setStep(next.step);
    setWeekdays(next.weekdays);
    setDayOfMonth(next.dayOfMonth);
    setMonth(next.month);
    setCustomExpr(next.customExpr ?? value);
  }, [value]);

  // Emit a fresh cron whenever any structured field changes.
  React.useEffect(() => {
    const next = encode({ freq, hour, step, weekdays, dayOfMonth, month, customExpr });
    if (next !== value) onChange(next);
  }, [freq, hour, step, weekdays, dayOfMonth, month, customExpr]);

  const summary = describe({ freq, hour, step, weekdays, dayOfMonth, month, customExpr });

  return (
    <div className="gap-fn-2_5 flex flex-col">
      <div className="gap-fn-3 grid grid-cols-2">
        <FieldRow label="Frequency">
          <Select value={freq} onValueChange={(v) => setFreq(v as Freq)} disabled={disabled}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQ_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        {freq === 'hourly' && (
          <FieldRow label="Every N hours" hint="Fires at minute 0 of each match (1 = every hour).">
            <Input
              type="number"
              min={1}
              max={23}
              value={step}
              onChange={(e) => setStep(clamp(Number(e.target.value), 1, 23))}
              disabled={disabled}
            />
          </FieldRow>
        )}

        {(freq === 'daily' || freq === 'weekly' || freq === 'monthly' || freq === 'yearly') && (
          <FieldRow
            label="Hour of day"
            hint="0–23 in Asia/Karachi. Minute is always 0 (scheduler ticks hourly)."
          >
            <Input
              type="number"
              min={0}
              max={23}
              value={hour}
              onChange={(e) => setHour(clamp(Number(e.target.value), 0, 23))}
              disabled={disabled}
            />
          </FieldRow>
        )}
      </div>

      {freq === 'weekly' && (
        <FieldRow
          label="Days of week"
          hint="Pick one or more — the rule fires on any selected day."
        >
          <div className="gap-fn-1_5 flex flex-wrap">
            {WEEKDAYS.map((d) => {
              const active = weekdays.has(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const next = new Set(weekdays);
                    if (next.has(d.value)) next.delete(d.value);
                    else next.add(d.value);
                    // Disallow empty selection — fall back to Mon.
                    if (next.size === 0) next.add(1);
                    setWeekdays(next);
                  }}
                  className={cn(
                    'rounded-fn-xs px-fn-2_5 py-fn-1 font-fn-medium border text-[12.5px] transition-colors',
                    disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                    active
                      ? 'bg-fn-accent-soft text-fn-accent-soft-fg border-fn-accent/30'
                      : 'bg-fn-bg-panel text-fn-fg-muted border-fn-border hover:border-fn-fg-faint',
                  )}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </FieldRow>
      )}

      {(freq === 'monthly' || freq === 'yearly') && (
        <FieldRow label="Day of month" hint="1–31. Months without that day skip silently.">
          <Input
            type="number"
            min={1}
            max={31}
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(clamp(Number(e.target.value), 1, 31))}
            disabled={disabled}
          />
        </FieldRow>
      )}

      {freq === 'yearly' && (
        <FieldRow label="Month">
          <Select
            value={String(month)}
            onValueChange={(v) => setMonth(Number(v))}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>
      )}

      {freq === 'custom' && (
        <CustomExpressionField value={customExpr} onChange={setCustomExpr} disabled={disabled} />
      )}

      <div className="rounded-fn-xs border-fn-border bg-fn-bg-subtle/40 px-fn-3 py-fn-2 gap-fn-0_5 flex flex-col border">
        <span className="text-fn-fg text-[12.5px]">{summary}</span>
        <span className="text-fn-fg-faint font-mono text-[11px]">
          {encode({ freq, hour, step, weekdays, dayOfMonth, month, customExpr })}
        </span>
      </div>

      {freq !== 'custom' && !disabled && (
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setCustomExpr(encode({ freq, hour, step, weekdays, dayOfMonth, month, customExpr }));
              setFreq('custom');
            }}
          >
            Switch to custom expression
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */

function CustomExpressionField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const error = React.useMemo(() => validateCronExpression(value), [value]);
  return (
    <div className="gap-fn-1 flex flex-col">
      <label className="text-fn-fg-muted text-[12px]">Cron expression</label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="0 9 * * 1-5"
        className={cn('font-mono', error && 'border-fn-danger focus-visible:ring-fn-danger/40')}
        aria-invalid={!!error}
      />
      {error ? (
        <p className="text-fn-danger text-[11px]">{error}</p>
      ) : (
        <p className="text-fn-fg-faint text-[11px]">
          Standard 5-field cron: &lsquo;m h dom mon dow&rsquo;. Asia/Karachi. The scheduler ticks at
          the top of every hour, so the minute field acts like 0 in practice.
        </p>
      )}
    </div>
  );
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="gap-fn-1 flex flex-col">
      <label className="text-fn-fg-muted text-[12px]">{label}</label>
      {children}
      {hint && <p className="text-fn-fg-faint text-[11px]">{hint}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Encode / decode                                                  */
/* ---------------------------------------------------------------- */

interface DecodedCron {
  freq: Freq;
  hour: number;
  step: number;
  weekdays: Set<number>;
  dayOfMonth: number;
  month: number;
  customExpr: string | null;
}

function decode(expr: string): DecodedCron {
  const fallback: DecodedCron = {
    freq: 'daily',
    hour: 9,
    step: 1,
    weekdays: new Set([1, 2, 3, 4, 5]),
    dayOfMonth: 1,
    month: 1,
    customExpr: null,
  };

  const tokens = (expr ?? '').trim().split(/\s+/);
  if (tokens.length !== 5) return fallback;
  const [m, h, dom, mon, dow] = tokens as [string, string, string, string, string];

  // Hourly: m=0, h=*/N or *, dom=*, mon=*, dow=*.
  if (m === '0' && dom === '*' && mon === '*' && dow === '*') {
    if (h === '*') return { ...fallback, freq: 'hourly', step: 1 };
    if (/^\*\/\d+$/.test(h)) {
      const n = Number(h.slice(2));
      if (Number.isFinite(n) && n >= 1 && n <= 23) {
        return { ...fallback, freq: 'hourly', step: n };
      }
    }
  }

  // Daily: m=0, h=N, everything else *.
  if (m === '0' && /^\d+$/.test(h) && dom === '*' && mon === '*' && dow === '*') {
    return { ...fallback, freq: 'daily', hour: Number(h) };
  }

  // Weekly: m=0, h=N, dom=*, mon=*, dow=list-of-digits.
  if (m === '0' && /^\d+$/.test(h) && dom === '*' && mon === '*' && /^[0-9,-]+$/.test(dow)) {
    const days = expandDowList(dow);
    if (days.size > 0) {
      return { ...fallback, freq: 'weekly', hour: Number(h), weekdays: days };
    }
  }

  // Monthly: m=0, h=N, dom=N, mon=*, dow=*.
  if (m === '0' && /^\d+$/.test(h) && /^\d+$/.test(dom) && mon === '*' && dow === '*') {
    return {
      ...fallback,
      freq: 'monthly',
      hour: Number(h),
      dayOfMonth: Number(dom),
    };
  }

  // Yearly: m=0, h=N, dom=N, mon=N, dow=*.
  if (m === '0' && /^\d+$/.test(h) && /^\d+$/.test(dom) && /^\d+$/.test(mon) && dow === '*') {
    return {
      ...fallback,
      freq: 'yearly',
      hour: Number(h),
      dayOfMonth: Number(dom),
      month: Number(mon),
    };
  }

  return { ...fallback, freq: 'custom', customExpr: expr };
}

function encode(d: {
  freq: Freq;
  hour: number;
  step: number;
  weekdays: Set<number>;
  dayOfMonth: number;
  month: number;
  customExpr: string;
}): string {
  switch (d.freq) {
    case 'hourly':
      return `0 ${d.step <= 1 ? '*' : `*/${d.step}`} * * *`;
    case 'daily':
      return `0 ${d.hour} * * *`;
    case 'weekly': {
      const days = [...d.weekdays].sort((a, b) => a - b).join(',') || '1';
      return `0 ${d.hour} * * ${days}`;
    }
    case 'monthly':
      return `0 ${d.hour} ${d.dayOfMonth} * *`;
    case 'yearly':
      return `0 ${d.hour} ${d.dayOfMonth} ${d.month} *`;
    case 'custom':
      return d.customExpr.trim() || '0 9 * * *';
  }
}

function describe(d: {
  freq: Freq;
  hour: number;
  step: number;
  weekdays: Set<number>;
  dayOfMonth: number;
  month: number;
  customExpr: string;
}): string {
  switch (d.freq) {
    case 'hourly':
      return d.step <= 1 ? 'Every hour' : `Every ${d.step} hours`;
    case 'daily':
      return `Every day at ${hh(d.hour)} PKT`;
    case 'weekly': {
      const names = [...d.weekdays]
        .sort((a, b) => a - b)
        .map((v) => WEEKDAYS.find((w) => w.value === v)?.label)
        .filter(Boolean);
      return `Every ${names.join(', ')} at ${hh(d.hour)} PKT`;
    }
    case 'monthly':
      return `On the ${ordinal(d.dayOfMonth)} of every month at ${hh(d.hour)} PKT`;
    case 'yearly': {
      const month = MONTHS.find((m) => m.value === d.month)?.label ?? '';
      return `Every year on ${month} ${ordinal(d.dayOfMonth)} at ${hh(d.hour)} PKT`;
    }
    case 'custom':
      return 'Custom expression — see preview below';
  }
}

function hh(h: number): string {
  return `${String(clamp(h, 0, 23)).padStart(2, '0')}:00`;
}

function ordinal(n: number): string {
  const rem10 = n % 10;
  const rem100 = n % 100;
  if (rem10 === 1 && rem100 !== 11) return `${n}st`;
  if (rem10 === 2 && rem100 !== 12) return `${n}nd`;
  if (rem10 === 3 && rem100 !== 13) return `${n}rd`;
  return `${n}th`;
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

function expandDowList(token: string): Set<number> {
  const out = new Set<number>();
  for (const part of token.split(',')) {
    if (part.includes('-')) {
      const [aStr, bStr] = part.split('-');
      const a = Number(aStr);
      const b = Number(bStr);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        for (let v = a; v <= b; v++) {
          if (v >= 0 && v <= 6) out.add(v);
        }
      }
    } else {
      const v = Number(part);
      if (Number.isFinite(v) && v >= 0 && v <= 6) out.add(v);
    }
  }
  return out;
}
