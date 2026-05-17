'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Sheet primitive.
 *
 * Side-drawer modal — the design's editor pattern (Overtime Rules,
 * Commission Rule, the parked Employee Form sheet). All four sides
 * supported; the canonical use is `side="right"` with the `lg`
 * width (720px) for form editors.
 *
 * Width variants
 *   sm  400px  — single-column quick edit (status change, manager
 *                change, salary change — currently those are Dialogs
 *                but could migrate)
 *   md  520px  — two-column form, mid-density
 *   lg  720px  — the design's editor-sheet width (Overtime Rules,
 *                Commission Rules, Employee Form)
 *   xl  880px  — wide multi-section editors
 *   full        full viewport width (only useful on mobile fallback,
 *                where every variant collapses to full anyway)
 *
 * Composition slots
 *   <SheetContent side="right" width="lg">
 *     <SheetHeader>            sticky top, border-b, 18/22 padding
 *       <SheetTitle />
 *       <SheetDescription />
 *     </SheetHeader>
 *     <SheetBody>              scrollable, 22 padding-x default
 *       …                       content
 *     </SheetBody>
 *     <SheetFooter>            sticky bottom, border-t, 14/22 padding
 *       <Button variant="ghost">Cancel</Button>
 *       <Button>Save</Button>
 *     </SheetFooter>
 *   </SheetContent>
 *
 * The Header and Footer use sticky positioning inside the
 * flex-column SheetContent so they stay pinned while SheetBody
 * scrolls.
 */

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

const sheetVariants = cva(
  // Common base — flex-col so the SheetHeader/Body/Footer composition
  // can sticky inside. transition timings match the design (200ms
  // close, 300ms open per the addendum).
  'bg-fn-bg-panel data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col transition ease-in-out data-[state=closed]:duration-200 data-[state=open]:duration-300',
  {
    variants: {
      side: {
        top: 'border-fn-border data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 max-h-[80vh] border-b',
        bottom:
          'border-fn-border data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 max-h-[80vh] border-t',
        left: 'border-fn-border data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left shadow-fn-drawer-left inset-y-0 left-0 h-full border-r',
        right:
          'border-fn-border data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right shadow-fn-drawer-right inset-y-0 right-0 h-full border-l',
      },
      width: {
        sm: 'w-full sm:max-w-[400px]',
        md: 'w-full sm:max-w-[520px]',
        lg: 'w-full sm:max-w-[720px]',
        xl: 'w-full sm:max-w-[880px]',
        full: 'w-full',
      },
    },
    defaultVariants: { side: 'right', width: 'md' },
  },
);

export interface SheetContentProps
  extends
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  /** Show the default close (X) button in the top-right. Defaults to true. */
  showClose?: boolean;
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = 'right', width = 'md', showClose = true, className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side, width }), className)}
      {...props}
    >
      {children}
      {showClose && (
        <DialogPrimitive.Close className="rounded-fn-xs text-fn-fg-muted hover:bg-fn-bg-inset hover:text-fn-fg focus-visible:ring-fn-accent right-fn-3_5 top-fn-3_5 p-fn-1 absolute z-10 transition-colors focus-visible:outline-none focus-visible:ring-2">
          <X className="h-fn-4 w-fn-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = DialogPrimitive.Content.displayName;

/**
 * SheetHeader — sticky top of the sheet. 22px x / 18px y padding,
 * 1px bottom divider. Matches the design's editor-sheet header.
 *
 * Usage: place at top of <SheetContent>. <SheetTitle> and
 * <SheetDescription> sit inside.
 */
const SheetHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'border-fn-divider bg-fn-bg-panel gap-fn-1 px-fn-sheet-x py-fn-sheet-y sticky top-0 z-10 flex flex-col border-b',
        className,
      )}
      {...props}
    />
  ),
);
SheetHeader.displayName = 'SheetHeader';

/**
 * SheetBody — scrollable middle region. 22px x / 22px y padding
 * by default; content composes its own sections inside.
 *
 * Wraps in flex-1 + overflow-y-auto so it takes all remaining
 * vertical space between the sticky Header and sticky Footer.
 */
const SheetBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-fn-sheet-x py-fn-sheet-x flex-1 overflow-y-auto', className)}
      {...props}
    />
  ),
);
SheetBody.displayName = 'SheetBody';

/**
 * SheetFooter — sticky bottom. 22px x / 14px y padding, 1px top
 * divider, content flows left-to-right with auto-margin on the
 * last button group so the primary action sits flush right.
 */
const SheetFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'border-fn-divider bg-fn-bg-panel gap-fn-2 px-fn-sheet-x py-fn-3_5 sticky bottom-0 z-10 flex items-center border-t',
        className,
      )}
      {...props}
    />
  ),
);
SheetFooter.displayName = 'SheetFooter';

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight',
      className,
    )}
    {...props}
  />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-fn-fg-muted text-fn-base-plus leading-fn-normal', className)}
    {...props}
  />
));
SheetDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
