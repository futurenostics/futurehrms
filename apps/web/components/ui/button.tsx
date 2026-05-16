import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'focus-visible:ring-fn-accent focus-visible:ring-offset-fn-bg inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-fn-accent text-fn-accent-fg shadow-fn-xs hover:bg-fn-accent-hover',
        secondary: 'bg-fn-bg-inset text-fn-fg shadow-fn-xs hover:bg-fn-bg-subtle',
        outline:
          'border-fn-border bg-fn-bg-panel text-fn-fg shadow-fn-xs hover:bg-fn-bg-subtle border',
        ghost: 'text-fn-fg hover:bg-fn-bg-inset',
        soft: 'bg-fn-accent-soft text-fn-accent-soft-fg hover:bg-fn-accent-soft/80',
        dark: 'bg-fn-fg text-fn-fg-invert shadow-fn-xs hover:bg-fn-fg/90',
        destructive: 'bg-fn-danger text-fn-accent-fg shadow-fn-xs hover:bg-fn-danger/90',
        success: 'bg-fn-success text-fn-accent-fg shadow-fn-xs hover:bg-fn-success/90',
        link: 'text-fn-accent underline-offset-4 hover:underline',
      },
      size: {
        sm: 'rounded-fn-xs h-8 px-3 text-[13px] [&_svg]:size-3.5',
        md: 'rounded-fn-xs h-9 px-3.5 text-sm [&_svg]:size-4',
        lg: 'rounded-fn-sm h-10 px-4 text-sm [&_svg]:size-4',
        icon: 'rounded-fn-xs h-9 w-9 [&_svg]:size-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
