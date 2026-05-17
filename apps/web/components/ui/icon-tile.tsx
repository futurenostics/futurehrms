import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * IconTile primitive.
 *
 * The soft-fill square holding a stroked icon — appears in:
 *   - SectionHeader (icon + title pattern)
 *   - KPI card (28px tile next to the metric label)
 *   - EmptyState (48px hero tile)
 *   - Sheet header (32-36px tile next to the title)
 *
 * Sizes track the design's --fn-icon-tile-* tokens:
 *   sm  28 × 28  rounded-fn-xs-plus (7)   icon 14   — KPI strip
 *   md  36 × 36  rounded-fn-sm     (8)   icon 16   — section header
 *   lg  40 × 40  rounded-fn-md     (10)  icon 18   — dashboard KPI
 *   xl  48 × 48  rounded-fn-lg     (14)  icon 22   — empty state hero
 *
 * Default tone is the cool-neutral fn-icon-tile pair. Pass `tone`
 * to use the semantic soft+fg pairs (success / warning / danger /
 * info / accent) — handy for status cards in dashboards.
 */
const SIZE_CLASSES = {
  sm: 'h-fn-7 w-fn-7 rounded-fn-xs-plus [&_svg]:h-fn-3_5 [&_svg]:w-fn-3_5',
  md: 'h-fn-9 w-fn-9 rounded-fn-sm [&_svg]:h-fn-4 [&_svg]:w-fn-4',
  lg: 'h-fn-10 w-fn-10 rounded-fn-md [&_svg]:h-[18px] [&_svg]:w-[18px]',
  xl: 'h-fn-12 w-fn-12 rounded-fn-lg [&_svg]:h-fn-5_5 [&_svg]:w-fn-5_5',
} as const;

const TONE_CLASSES = {
  default: 'bg-fn-icon-tile text-fn-icon-tile-fg',
  accent: 'bg-fn-accent-soft text-fn-accent-soft-fg',
  success: 'bg-fn-success-soft text-fn-success-soft-fg',
  warning: 'bg-fn-warning-soft text-fn-warning-soft-fg',
  danger: 'bg-fn-danger-soft text-fn-danger-soft-fg',
  info: 'bg-fn-info-soft text-fn-info-soft-fg',
} as const;

export type IconTileSize = keyof typeof SIZE_CLASSES;
export type IconTileTone = keyof typeof TONE_CLASSES;

export interface IconTileProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: IconTileSize;
  tone?: IconTileTone;
}

export const IconTile = React.forwardRef<HTMLSpanElement, IconTileProps>(
  ({ size = 'md', tone = 'default', className, children, ...rest }, ref) => (
    <span
      ref={ref}
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
        SIZE_CLASSES[size],
        TONE_CLASSES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  ),
);
IconTile.displayName = 'IconTile';
