import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Textarea primitive.
 *
 * The design doesn't ship a dedicated Textarea spec — by convention
 * textareas inherit Input's visual language (border-strong, fn-bg-panel,
 * rounded-fn-xs, 13px text) and only differ in:
 *   - multi-line height (min-h-fn-20 = 80px default, grows with rows)
 *   - vertical padding (8px top/bottom instead of Input's 0 — single-
 *     line Input centers via h-[34px], textareas need explicit y-pad)
 *   - resize affordance (default: vertical only; pass resize="none"
 *     for chat-style fixed textareas)
 *
 * Like Input, focus-visible flips the border to fn-accent + a 1px ring.
 * aria-invalid flips the border/ring to fn-danger.
 *
 * Used by the parked employee-sheet refactor for:
 *   - Salary-change reason (with character counter)
 *   - Emergency-contact notes
 *   - Any other multi-line form field.
 */
// min-h 80px is the design's "comfortable 3-line textarea" default
// (matches roughly 3 × 22px line + 14px y-pad). 80 isn't on the
// fn-* spacing scale (which tops out at 64), so arbitrary-px.
const TEXTAREA_BASE =
  'rounded-fn-xs border-fn-border-strong bg-fn-bg-panel text-fn-fg shadow-fn-xs flex min-h-[80px] w-full border px-fn-2_5 py-fn-2 text-fn-base leading-fn-normal transition-colors placeholder:text-fn-fg-faint focus-visible:border-fn-accent focus-visible:ring-fn-accent focus-visible:outline-none focus-visible:ring-1 disabled:bg-fn-bg-inset disabled:text-fn-fg-muted disabled:cursor-not-allowed aria-invalid:border-fn-danger aria-invalid:focus-visible:ring-fn-danger';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** none | vertical (default) | both */
  resize?: 'none' | 'vertical' | 'both';
}

const RESIZE_CLASSES = {
  none: 'resize-none',
  vertical: 'resize-y',
  both: 'resize',
} as const;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, resize = 'vertical', ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(TEXTAREA_BASE, RESIZE_CLASSES[resize], className)}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export { Textarea };
