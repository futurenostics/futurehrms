import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Badge — the *only* label primitive in the app.
 *
 * Per CLAUDE.md ("Labels"), every status pill, trend chip, count
 * indicator, EID stamp, "Latest" marker, module tag, contract /
 * employment-record tag, etc. uses this component. No bespoke
 * `<span className="rounded-… bg-fn-… text-fn-…">` pills allowed.
 *
 * Anatomy (locked to the "+5.6% ↗" KPI badge the design ships):
 *   • radius   `rounded-fn-xs` (6px)
 *   • padding  9px horizontal / 2px vertical
 *   • text     12px / fw-600 / tabular-nums / tight leading
 *   • visual   soft-tinted bg + matching `*-soft-fg` text + a
 *              35%-mix tinted border so the badge reads even on
 *              coloured surfaces
 *   • optional leading icon via the `icon` prop (any ReactNode;
 *     usually a lucide-react icon at 12px)
 *
 * Tones: default (neutral muted) · accent · success · warning ·
 * danger · info · outline (transparent + border, for the few
 * places where there's no semantic colour).
 *
 * The `dot` prop swaps the leading icon for a 6px filled circle —
 * use it for status indicators like "● Permanent".
 */
const badgeVariants = cva(
  'rounded-fn-xs gap-fn-1 font-fn-semibold inline-flex items-center border px-[9px] py-[2px] text-[12px] tabular-nums leading-[1.55] tracking-[-0.005em] transition-colors',
  {
    variants: {
      tone: {
        default: 'bg-fn-bg-inset text-fn-fg-muted border-fn-border',
        accent: 'bg-fn-accent-soft text-fn-accent-soft-fg border-fn-accent/35',
        success: 'bg-fn-success-soft text-fn-success-soft-fg border-fn-success/35',
        warning: 'bg-fn-warning-soft text-fn-warning-soft-fg border-fn-warning/35',
        danger: 'bg-fn-danger-soft text-fn-danger-soft-fg border-fn-danger/35',
        info: 'bg-fn-info-soft text-fn-info-soft-fg border-fn-info/35',
        outline: 'border-fn-border-strong text-fn-fg bg-transparent',
      },
    },
    defaultVariants: {
      tone: 'default',
    },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>;

export interface BadgeProps
  extends
    Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>,
    VariantProps<typeof badgeVariants> {
  /** Leading icon (12px lucide-react icon, or any ReactNode). */
  icon?: React.ReactNode;
  /**
   * Show a 6px filled circle in the tone's colour as the leading
   * mark. Overrides `icon`. Use for status-shaped badges
   * ("● Permanent").
   */
  dot?: boolean;
  children?: React.ReactNode;
}

const DOT_TONE: Record<BadgeTone, string> = {
  default: 'bg-fn-fg-faint',
  accent: 'bg-fn-accent',
  success: 'bg-fn-success',
  warning: 'bg-fn-warning',
  danger: 'bg-fn-danger',
  info: 'bg-fn-info',
  outline: 'bg-fn-fg-faint',
};

function Badge({ className, tone = 'default', icon, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot ? (
        <span
          aria-hidden
          className={cn(
            'rounded-fn-full h-fn-1_5 w-fn-1_5 inline-block',
            DOT_TONE[tone ?? 'default'],
          )}
        />
      ) : icon ? (
        <span aria-hidden className="inline-flex shrink-0 items-center">
          {icon}
        </span>
      ) : null}
      {children != null && <span>{children}</span>}
    </span>
  );
}

export { Badge, badgeVariants };
