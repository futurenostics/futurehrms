/**
 * Style-guide section — Label primitive.
 *
 * Reference: docs/design/screens/commission-rule-form.jsx:541
 *   <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600,
 *     color: 'var(--fn-fg)', marginBottom: 5 }}>{label}</label>
 *
 * Verification: open the design reference at the same zoom and
 * compare a form like Commission Rule editor — the Label's px
 * height, weight, and color should be indistinguishable.
 */
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export function LabelSection() {
  return (
    <div id="primitive-label" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Label
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          Form field label. 12.5px / weight 600 / fn-fg. Always pairs with an input via Radix
          association (htmlFor / id). No margin baked in — form composition decides the gap.
        </p>
      </div>

      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-6 p-fn-6 grid grid-cols-1 border sm:grid-cols-2">
        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-label-input-1">Field label</Label>
          <Input id="sg-label-input-1" placeholder="Type here" />
        </div>
        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-label-input-2" className="peer-disabled:opacity-70">
            Disabled field
          </Label>
          <Input id="sg-label-input-2" disabled placeholder="Cannot edit" className="peer" />
        </div>
      </div>

      <Spec
        items={[
          ['font-size', '12.5px · text-fn-base-lo-plus'],
          ['font-weight', '600 · font-fn-semibold'],
          ['color', 'var(--fn-fg)'],
          ['line-height', '1 · leading-fn-unit'],
          ['gap to input', '6px (controlled by form composition, not the label)'],
        ]}
      />
    </div>
  );
}

export function Spec({ items }: { items: ReadonlyArray<readonly [string, string]> }) {
  return (
    <div className="bg-fn-bg-subtle border-fn-border rounded-fn-xs border">
      <div className="text-fn-fg-faint text-fn-sm font-fn-semibold tracking-fn-uppercase px-fn-4 pt-fn-3 pb-fn-2 uppercase">
        Spec
      </div>
      <div className="divide-fn-divider divide-y">
        {items.map(([k, v]) => (
          <div
            key={k}
            className="gap-fn-4 px-fn-4 py-fn-2_5 grid grid-cols-[160px_1fr] items-baseline"
          >
            <span className="text-fn-fg-faint text-fn-sm-plus font-mono">{k}</span>
            <span className="text-fn-fg text-fn-base font-mono">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
