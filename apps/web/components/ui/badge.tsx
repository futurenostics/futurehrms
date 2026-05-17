import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/*
 * Badge primitive.
 *
 * Design spec (docs/design/shared/primitives.jsx Badge, L92-130):
 *   font-size 12 (text-fn-base-lo) · weight 600 (font-fn-semibold)
 *   leading 1.55 (leading-fn-normal-plus) · tracking -0.005em
 *   padding 2px / 8px (py-fn-0_5 / px-fn-2)
 *   tabular-nums for any numeric badges
 *   radius 6 (rounded-fn-xs)
 *
 * Variants
 *   default       neutral muted on bg-inset
 *   accent        indigo-violet
 *   success       mint
 *   warning       amber
 *   danger        coral
 *   info          sky
 *   outline       transparent + 1px border
 */
const badgeVariants = cva(
  'rounded-fn-xs px-fn-2 py-fn-0_5 text-fn-base-lo font-fn-semibold leading-fn-normal-plus tracking-fn-micro-loose inline-flex items-center tabular-nums transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-fn-bg-inset text-fn-fg-muted',
        accent: 'bg-fn-accent-soft text-fn-accent-soft-fg',
        success: 'bg-fn-success-soft text-fn-success-soft-fg',
        warning: 'bg-fn-warning-soft text-fn-warning-soft-fg',
        danger: 'bg-fn-danger-soft text-fn-danger-soft-fg',
        info: 'bg-fn-info-soft text-fn-info-soft-fg',
        outline: 'border-fn-border text-fn-fg border',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
