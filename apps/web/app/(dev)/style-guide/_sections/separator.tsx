/**
 * Style-guide section — Separator primitive.
 *
 * Reference: docs/design/shared/primitives.jsx + every screen using
 * `borderBottom: '1px solid var(--fn-divider)'`.
 *   1px line in --fn-divider color, full-width horizontal or
 *   full-height vertical, decorative (aria-orientation handled by
 *   Radix primitive).
 */
import { Separator } from '@/components/ui/separator';
import { Spec } from './label';

export function SeparatorSection() {
  return (
    <div id="primitive-separator" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Separator
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          1px decorative divider in --fn-divider. Horizontal (default) or vertical. Used between
          form sections, toolbar groups, dropdown items.
        </p>
      </div>

      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-6 p-fn-6 flex flex-col border">
        <div>
          <div className="text-fn-fg text-fn-base mb-fn-3">Horizontal</div>
          <div className="flex flex-col">
            <div className="text-fn-fg-muted text-fn-base py-fn-2">Section A</div>
            <Separator />
            <div className="text-fn-fg-muted text-fn-base py-fn-2">Section B</div>
            <Separator />
            <div className="text-fn-fg-muted text-fn-base py-fn-2">Section C</div>
          </div>
        </div>

        <div>
          <div className="text-fn-fg text-fn-base mb-fn-3">Vertical (inline)</div>
          <div className="text-fn-fg-muted text-fn-base h-fn-9 gap-fn-3 flex items-center">
            <span>Item 1</span>
            <Separator orientation="vertical" />
            <span>Item 2</span>
            <Separator orientation="vertical" />
            <span>Item 3</span>
          </div>
        </div>
      </div>

      <Spec
        items={[
          ['thickness', '1px (h-px / w-px)'],
          ['color', 'var(--fn-divider)'],
          ['horizontal', 'h-px · w-full'],
          ['vertical', 'h-full · w-px'],
          ['decorative', 'aria-hidden by default (Radix decorative=true)'],
        ]}
      />
    </div>
  );
}
