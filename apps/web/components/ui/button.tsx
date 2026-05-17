import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/*
 * Button primitive.
 *
 * Design spec (docs/design/shared/primitives.jsx Button function,
 * L60-90):
 *
 *   size sm: h 28 · padX 10 · font 12.5 · gap 6 · icon 14 · radius 6
 *   size md: h 34 · padX 12 · font 13   · gap 7 · icon 15 · radius 6
 *   size lg: h 40 · padX 16 · font 14   · gap 8 · icon 16 · radius 8
 *
 *   common: font-weight 500, letter-spacing -0.005em, 1px border
 *           (transparent for ghost/soft so heights stay equal across
 *           variants — without this, outline variants are 1px taller).
 *
 *   variants (8): primary, secondary, ghost, soft, danger, success,
 *                 outline, dark.
 *
 * Implementation notes
 *   - Size md uses h-[34px] / icon size-[15px] — both off the fn-*
 *     scale (which jumps 32→36 and 14→16). One-off values; not worth
 *     adding tokens for since they're button-internal.
 *   - `text-fn-base-lo-plus` (12.5), `text-fn-base` (13), `text-fn-md`
 *     (14) carry only font-size; line-height stays at the parent —
 *     Buttons are inline-flex single-line so this doesn't matter.
 *   - link variant is added beyond the design's 8 — used for inline
 *     "Forgot password?" / "Clear filters" anchors. Visually flat,
 *     no border, no padding-aware height.
 */
const buttonVariants = cva(
  // Base: layout + interactivity + a11y. The 1px transparent border
  // is intentional — see the doc comment above.
  'font-fn-medium tracking-fn-micro-loose focus-visible:ring-fn-accent focus-visible:ring-offset-fn-bg inline-flex cursor-pointer items-center justify-center whitespace-nowrap border border-transparent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-fn-accent text-fn-accent-fg border-fn-accent shadow-fn-xs hover:bg-fn-accent-hover hover:border-fn-accent-hover',
        secondary:
          'bg-fn-bg-panel text-fn-fg border-fn-border-strong shadow-fn-xs hover:bg-fn-bg-subtle',
        outline:
          'text-fn-fg border-fn-border-strong shadow-fn-xs hover:bg-fn-bg-subtle bg-transparent',
        ghost: 'text-fn-fg hover:bg-fn-bg-inset bg-transparent',
        soft: 'bg-fn-accent-soft text-fn-accent-soft-fg hover:bg-fn-accent-soft/80',
        dark: 'bg-fn-fg text-fn-fg-invert border-fn-fg shadow-fn-xs hover:bg-fn-fg/90',
        destructive:
          'bg-fn-danger text-fn-accent-fg border-fn-danger shadow-fn-xs hover:bg-fn-danger/90',
        success:
          'bg-fn-success text-fn-accent-fg border-fn-success shadow-fn-xs hover:bg-fn-success/90',
        link: 'text-fn-accent underline-offset-4 hover:underline',
      },
      size: {
        sm: 'rounded-fn-xs h-fn-7 gap-fn-1_5 px-fn-2_5 text-fn-base-lo-plus [&_svg]:size-fn-3_5',
        md: 'rounded-fn-xs gap-fn-1_75 px-fn-3 text-fn-base h-[34px] [&_svg]:size-[15px]',
        lg: 'rounded-fn-sm h-fn-10 gap-fn-2 px-fn-4 text-fn-md [&_svg]:size-fn-4',
        icon: 'rounded-fn-xs h-[34px] w-[34px] [&_svg]:size-[15px]',
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
