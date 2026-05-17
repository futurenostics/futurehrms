import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Input primitive.
 *
 * Design spec (docs/design/shared/primitives.jsx Input, L159-175):
 *   height:       34px
 *   padding-x:    10px
 *   background:   --fn-bg-panel
 *   border:       1px --fn-border-strong, radius 6
 *   font:         13px / --fn-fg (placeholder --fn-fg-faint)
 *   focus:        --fn-accent border with subtle ring
 *   gap to icon:  8px (handled by InputGroup, not bare Input)
 *
 * Off-scale notes
 *   - h-[34px] kept as arbitrary value (the fn-* spacing scale jumps
 *     32→36 at fn-8→fn-9). Used everywhere the design specs a 34px
 *     control — same rationale as Button md height.
 *   - px-fn-2_5 (10px) matches design padding exactly.
 *
 * Composition
 *   - <Input /> is a bare input.
 *   - <InputGroup leading=… suffix=…><Input /></InputGroup> wraps the
 *     bare input with a leading icon and/or trailing suffix slot,
 *     making the wrapper carry the visible chrome (border, bg) and
 *     the inner <input> render borderless and transparent. This
 *     matches the design's pattern where the chrome is one container
 *     and the input itself has no visible edges.
 *
 * Why a wrapper component rather than props on Input
 *   - Keeps the bare `<Input />` ref clean (forwards to the <input>).
 *   - Lets `<InputGroup>` carry extra ARIA / focus-within / error
 *     styling without polluting the bare-input API.
 *   - The wrapper is opt-in — most form fields don't need an icon.
 */
const INPUT_BASE =
  'rounded-fn-xs border-fn-border-strong bg-fn-bg-panel text-fn-fg shadow-fn-xs flex h-[34px] w-full border px-fn-2_5 text-fn-base transition-colors placeholder:text-fn-fg-faint focus-visible:border-fn-accent focus-visible:ring-fn-accent focus-visible:outline-none focus-visible:ring-1 disabled:bg-fn-bg-inset disabled:text-fn-fg-muted disabled:cursor-not-allowed aria-invalid:border-fn-danger aria-invalid:focus-visible:ring-fn-danger file:text-fn-fg file:border-0 file:bg-transparent file:text-fn-base file:font-fn-medium';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input type={type} className={cn(INPUT_BASE, className)} ref={ref} {...props} />
  ),
);
Input.displayName = 'Input';

/**
 * InputGroup — wrapper that renders leading icon + bare input + suffix.
 *
 * The wrapper carries the visible chrome; the inner <input> uses
 * `inputClassName` for any caller overrides (rare). Forwards ref to
 * the <input>, not the wrapper, so RHF / focus management work.
 *
 * Leading icon: 14px, --fn-fg-faint, sits left of the input with 8px
 * gap. Suffix: any node (text, icon button), sits right with 8px gap.
 *
 * Error state: pass `aria-invalid` on InputGroup; the wrapper border
 * flips to --fn-danger and the focus ring becomes danger-tinted.
 */
const GROUP_BASE =
  'rounded-fn-xs border-fn-border-strong bg-fn-bg-panel text-fn-fg shadow-fn-xs gap-fn-2 px-fn-2_5 inline-flex h-[34px] w-full items-center border text-fn-base transition-colors focus-within:border-fn-accent focus-within:ring-fn-accent focus-within:ring-1 aria-invalid:border-fn-danger aria-invalid:focus-within:ring-fn-danger';

const GROUP_INPUT =
  'flex-1 min-w-0 bg-transparent border-0 outline-none text-fn-fg text-fn-base placeholder:text-fn-fg-faint disabled:text-fn-fg-muted disabled:cursor-not-allowed file:text-fn-fg file:border-0 file:bg-transparent';

export interface InputGroupProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leading?: React.ReactNode;
  suffix?: React.ReactNode;
  inputClassName?: string;
}

const InputGroup = React.forwardRef<HTMLInputElement, InputGroupProps>(
  ({ className, inputClassName, leading, suffix, disabled, ...rest }, ref) => {
    return (
      <div className={cn(GROUP_BASE, disabled && 'bg-fn-bg-inset cursor-not-allowed', className)}>
        {leading && (
          <span aria-hidden className="text-fn-fg-faint flex shrink-0 items-center">
            {leading}
          </span>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={cn(GROUP_INPUT, inputClassName)}
          {...rest}
        />
        {suffix && (
          <span className="text-fn-fg-faint text-fn-base-lo flex shrink-0 items-center">
            {suffix}
          </span>
        )}
      </div>
    );
  },
);
InputGroup.displayName = 'InputGroup';

export { Input, InputGroup };
