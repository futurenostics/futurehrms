/**
 * Style-guide section — Input + InputGroup primitives.
 *
 * Reference: docs/design/shared/primitives.jsx Input (L159-175).
 */
import { Mail, Search } from 'lucide-react';
import { Input, InputGroup } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spec } from './label';

export function InputSection() {
  return (
    <div id="primitive-input" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Input
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          Two exports: bare <code className="text-fn-fg font-mono">Input</code> and{' '}
          <code className="text-fn-fg font-mono">InputGroup</code> which wraps Input with an
          optional leading icon and/or trailing suffix slot.
        </p>
      </div>

      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-6 p-fn-6 grid grid-cols-1 border md:grid-cols-2">
        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-input-1">Bare input</Label>
          <Input id="sg-input-1" placeholder="Type something" />
        </div>
        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-input-2">Disabled</Label>
          <Input id="sg-input-2" disabled placeholder="Cannot edit" />
        </div>
        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-input-3">Error</Label>
          <Input id="sg-input-3" aria-invalid placeholder="Required" defaultValue="bad@" />
        </div>
        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-input-4">With leading icon (InputGroup)</Label>
          <InputGroup
            id="sg-input-4"
            type="email"
            leading={<Mail className="h-fn-3_5 w-fn-3_5" />}
            placeholder="email@example.com"
          />
        </div>
        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-input-5">With suffix</Label>
          <InputGroup id="sg-input-5" placeholder="0" suffix="PKR" />
        </div>
        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-input-6">With both</Label>
          <InputGroup
            id="sg-input-6"
            leading={<Search className="h-fn-3_5 w-fn-3_5" />}
            placeholder="Search"
            suffix={<kbd className="text-fn-fg-faint text-fn-sm-plus font-mono">⌘K</kbd>}
          />
        </div>
      </div>

      <Spec
        items={[
          ['height', '34px (h-[34px])'],
          ['padding-x', '10px (px-fn-2_5)'],
          ['background', 'var(--fn-bg-panel) — fn-bg-inset when disabled'],
          ['border', '1px var(--fn-border-strong), rounded-fn-xs (6)'],
          ['focus', 'border → fn-accent, 1px ring fn-accent'],
          ['error', 'aria-invalid → border + focus-ring fn-danger'],
          ['font', '13px (text-fn-base); placeholder fn-fg-faint'],
          ['leading icon', '14px stroke, fn-fg-faint, 8px gap to input (InputGroup)'],
          ['suffix', '12px (text-fn-base-lo), fn-fg-faint, 8px gap from input'],
        ]}
      />
    </div>
  );
}
