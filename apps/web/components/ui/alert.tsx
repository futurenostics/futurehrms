import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Alert / Banner primitive.
 *
 * Inline contextual message — appears as a banner inside form
 * bodies, at the top of screens for system messages, or inline as
 * a contextual warning (e.g. employee-sheet's "Changing manager
 * creates a timeline entry…").
 *
 * The design's overlap-warning banner in the Overtime Rules editor
 * is the visual reference. Spec:
 *   bg fn-{semantic}-soft · fg fn-{semantic}-soft-fg
 *   border 1px fn-{semantic} 35%-mix
 *   radius 10 (rounded-fn-md)
 *   padding 14 / 16 (py-fn-3_5 / px-fn-4)
 *   leading icon 16, 8px gap to text
 *
 * Dismissible — pass onDismiss to render an X close button.
 */
const alertVariants = cva(
  'rounded-fn-md gap-fn-3 px-fn-4 py-fn-3_5 text-fn-base leading-fn-normal flex items-start border',
  {
    variants: {
      tone: {
        info: 'bg-fn-info-soft text-fn-info-soft-fg border-fn-info/35',
        success: 'bg-fn-success-soft text-fn-success-soft-fg border-fn-success/35',
        warning: 'bg-fn-warning-soft text-fn-warning-soft-fg border-fn-warning/35',
        danger: 'bg-fn-danger-soft text-fn-danger-soft-fg border-fn-danger/35',
      },
    },
    defaultVariants: { tone: 'info' },
  },
);

const TONE_ICON = {
  info: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  danger: XCircle,
} as const;

export interface AlertProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>, VariantProps<typeof alertVariants> {
  title?: React.ReactNode;
  /** Show the leading semantic icon. Defaults to true. */
  showIcon?: boolean;
  /** Render a dismiss X — invokes onDismiss when clicked. */
  onDismiss?: () => void;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, tone = 'info', title, showIcon = true, onDismiss, children, ...rest }, ref) => {
    const Icon = TONE_ICON[tone ?? 'info'];
    return (
      <div ref={ref} role="alert" className={cn(alertVariants({ tone }), className)} {...rest}>
        {showIcon && <Icon className="h-fn-4 w-fn-4 mt-fn-0_5 shrink-0" strokeWidth={2} />}
        <div className="gap-fn-0_5 flex min-w-0 flex-1 flex-col">
          {title && <div className="font-fn-semibold">{title}</div>}
          {children && <div className="text-fn-base-plus leading-fn-normal">{children}</div>}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="rounded-fn-xs hover:bg-current/10 -mr-fn-1 -mt-fn-1 p-fn-1 shrink-0 cursor-pointer transition-colors"
          >
            <X className="h-fn-3_5 w-fn-3_5" />
          </button>
        )}
      </div>
    );
  },
);
Alert.displayName = 'Alert';
