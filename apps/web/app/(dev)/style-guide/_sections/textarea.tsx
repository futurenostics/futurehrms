/**
 * Style-guide section — Textarea primitive.
 */
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spec } from './label';

export function TextareaSection() {
  return (
    <div id="primitive-textarea" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Textarea
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          Inherits Input's visual language (border-strong, fn-bg-panel, rounded-fn-xs, 13px). Adds
          multi-line height + vertical padding + an optional resize affordance.
        </p>
      </div>

      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-6 p-fn-6 grid grid-cols-1 border md:grid-cols-2">
        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-ta-1">Default (resize vertical)</Label>
          <Textarea id="sg-ta-1" placeholder="Reason for change…" />
        </div>
        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-ta-2">No resize</Label>
          <Textarea id="sg-ta-2" placeholder="Fixed height" resize="none" />
        </div>
        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-ta-3">Disabled</Label>
          <Textarea
            id="sg-ta-3"
            disabled
            defaultValue="Disabled textareas mute the bg + fg to match Input."
          />
        </div>
        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-ta-4">Error</Label>
          <Textarea id="sg-ta-4" aria-invalid placeholder="Required" />
        </div>
      </div>

      <Spec
        items={[
          ['min-height', '80px (arbitrary)'],
          ['padding', 'px 10 (px-fn-2_5) · py 8 (py-fn-2)'],
          ['border / radius / bg', 'inherits Input — border-strong / rounded-fn-xs / bg-panel'],
          ['font / leading', 'text-fn-base (13) · leading-fn-normal (1.5)'],
          ['focus', 'border → fn-accent, 1px ring fn-accent'],
          ['error', 'aria-invalid → border + focus-ring fn-danger'],
          ['resize', 'none | vertical (default) | both'],
        ]}
      />
    </div>
  );
}
