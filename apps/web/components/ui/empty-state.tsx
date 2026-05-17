import * as React from 'react';
import { cn } from '@/lib/utils';
import { IconTile } from './icon-tile';

/**
 * EmptyState primitive.
 *
 * Centered illustration + title + description + (optional) actions.
 * Used wherever a list/table/page has no data to show.
 *
 * Spec
 *   Centered column, 48px IconTile (xl, accent tone by default).
 *   Title 16px / weight 600.
 *   Description 13px / muted / max-width 420 / centered.
 *   Actions row sits 16px below description.
 *   40px vertical breathing room top + bottom.
 */
export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  tone?: 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, actions, tone = 'accent', ...rest }, ref) => (
    <div
      ref={ref}
      className={cn('gap-fn-3 py-fn-10 px-fn-4 flex flex-col items-center text-center', className)}
      {...rest}
    >
      {icon && (
        <IconTile size="xl" tone={tone}>
          {icon}
        </IconTile>
      )}
      <div className="gap-fn-1 flex flex-col items-center">
        <h3 className="text-fn-fg text-fn-lg-plus font-fn-semibold">{title}</h3>
        {description && (
          <p className="text-fn-fg-muted text-fn-base leading-fn-normal max-w-[420px]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="gap-fn-2 mt-fn-1 flex items-center">{actions}</div>}
    </div>
  ),
);
EmptyState.displayName = 'EmptyState';
