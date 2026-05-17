/**
 * Style-guide section — Checkbox primitive.
 *
 * Includes the indeterminate state (3rd value beyond unchecked /
 * checked) — used by the Employees-list master checkbox in the
 * table header to indicate "some rows on this page selected".
 */
'use client';

import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Spec } from './label';

export function CheckboxSection() {
  const [demo, setDemo] = React.useState<boolean | 'indeterminate'>(false);
  return (
    <div id="primitive-checkbox" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Checkbox
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          18×18 box. Tri-state — unchecked / checked (Check icon) / indeterminate (Minus icon).
          Indeterminate is used by the Employees-list master checkbox to indicate &quot;some rows
          selected&quot;.
        </p>
      </div>

      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-5 p-fn-6 flex flex-col border">
        <div className="gap-fn-6 flex flex-wrap items-center">
          <CheckboxRow label="Unchecked" checked={false} />
          <CheckboxRow label="Checked" checked={true} />
          <CheckboxRow label="Indeterminate" checked="indeterminate" />
          <CheckboxRow label="Disabled" checked={false} disabled />
          <CheckboxRow label="Disabled + checked" checked={true} disabled />
        </div>

        <div className="border-fn-divider gap-fn-3 pt-fn-4 flex items-center border-t">
          <Checkbox
            id="sg-cb-live"
            checked={demo}
            onCheckedChange={(v) => setDemo(v as boolean | 'indeterminate')}
          />
          <label htmlFor="sg-cb-live" className="text-fn-fg text-fn-base cursor-pointer">
            Live — click to cycle (state:{' '}
            {demo === 'indeterminate' ? 'indeterminate' : demo ? 'checked' : 'unchecked'})
          </label>
          <button
            type="button"
            onClick={() => setDemo('indeterminate')}
            className="text-fn-accent text-fn-sm-plus hover:underline"
          >
            Set indeterminate
          </button>
        </div>
      </div>

      <Spec
        items={[
          ['size', '18 × 18'],
          ['radius', '4px (arbitrary)'],
          ['border', '1.5px (arbitrary) · fn-border-strong → fn-accent on hover / checked'],
          ['indicator', '12 × 12 (h-fn-3 w-fn-3) · stroke-3 · text-fn-accent-fg'],
          ['states', 'unchecked · checked · indeterminate · disabled (60% opacity)'],
          ['focus ring', '2px fn-accent · 2px offset on fn-bg'],
        ]}
      />
    </div>
  );
}

function CheckboxRow({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof Checkbox>) {
  return (
    <div className="gap-fn-2 flex items-center">
      <Checkbox {...props} />
      <span className="text-fn-fg-muted text-fn-base">{label}</span>
    </div>
  );
}
