/**
 * Style-guide section — Switch primitive.
 */
'use client';

import * as React from 'react';
import { Switch } from '@/components/ui/switch';
import { Spec } from './label';

export function SwitchSection() {
  const [active, setActive] = React.useState(true);
  const [payoneer, setPayoneer] = React.useState(false);
  return (
    <div id="primitive-switch" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Switch
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          36×20 pill, 16×16 thumb that slides 18px on toggle. Used for binary controls where the
          state carries meaning (Active / Has-Payoneer) rather than a list selection (which is
          Checkbox's job).
        </p>
      </div>

      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-5 p-fn-6 flex flex-col border">
        <div className="gap-fn-5 flex flex-wrap items-center">
          <SwitchRow label="Off" checked={false} />
          <SwitchRow label="On" checked={true} />
          <SwitchRow label="Disabled off" checked={false} disabled />
          <SwitchRow label="Disabled on" checked={true} disabled />
        </div>

        <div className="border-fn-divider pt-fn-4 gap-fn-3 flex items-center border-t">
          <Switch id="sg-switch-active" checked={active} onCheckedChange={setActive} />
          <label htmlFor="sg-switch-active" className="text-fn-fg text-fn-base cursor-pointer">
            Active — {active ? 'on' : 'off'}
          </label>
        </div>
        <div className="gap-fn-3 flex items-center">
          <Switch id="sg-switch-payoneer" checked={payoneer} onCheckedChange={setPayoneer} />
          <label htmlFor="sg-switch-payoneer" className="text-fn-fg text-fn-base cursor-pointer">
            Has Payoneer — {payoneer ? 'yes' : 'no'}
          </label>
        </div>
      </div>

      <Spec
        items={[
          ['track', '36×20 (h-fn-5 w-fn-9) · rounded-fn-full'],
          ['track off', 'bg-fn-bg-inset'],
          ['track on', 'bg-fn-accent'],
          ['thumb', '16×16 (h-fn-4 w-fn-4) · bg-fn-bg-panel · shadow-fn-xs'],
          ['translate', 'off → translateX 1px · on → translateX 18px'],
          ['focus ring', '2px fn-accent · 2px fn-bg offset'],
          ['disabled', '60% opacity · cursor-not-allowed'],
        ]}
      />
    </div>
  );
}

function SwitchRow({ label, ...props }: { label: string } & React.ComponentProps<typeof Switch>) {
  return (
    <div className="gap-fn-2 flex items-center">
      <Switch {...props} />
      <span className="text-fn-fg-muted text-fn-base">{label}</span>
    </div>
  );
}
