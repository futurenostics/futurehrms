import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'rounded-fn-xs border-fn-border bg-fn-bg-panel text-fn-fg shadow-fn-xs flex h-9 w-full border px-3 py-1 text-[13px] transition-colors',
          'placeholder:text-fn-fg-faint',
          'focus-visible:border-fn-accent focus-visible:ring-fn-accent focus-visible:outline-none focus-visible:ring-1',
          'disabled:bg-fn-bg-inset disabled:text-fn-fg-muted disabled:cursor-not-allowed',
          'file:text-fn-fg file:border-0 file:bg-transparent file:text-sm file:font-medium',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
