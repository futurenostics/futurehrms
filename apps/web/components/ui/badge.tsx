import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'rounded-fn-xs inline-flex items-center px-2 py-0.5 text-[12px] font-semibold tabular-nums leading-[1.55] tracking-[-0.005em] transition-colors',
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
