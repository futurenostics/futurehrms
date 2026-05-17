/**
 * Style-guide section — Select primitive.
 */
'use client';

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Spec } from './label';

export function SelectSection() {
  const [val, setVal] = React.useState<string>('');
  return (
    <div id="primitive-select" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Select
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          Form-field dropdown. Trigger matches Input dimensions exactly so a Select sitting next to
          an Input in a form-row reads as the same field-rhythm. Backed by Radix Select so keyboard
          nav (arrows + enter + type-to-search) and ARIA are correct.
        </p>
      </div>

      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-6 p-fn-6 grid grid-cols-1 border md:grid-cols-2">
        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-select-1">Default</Label>
          <Select value={val} onValueChange={setVal}>
            <SelectTrigger id="sg-select-1">
              <SelectValue placeholder="Pick one" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="probation">Probation</SelectItem>
              <SelectItem value="permanent">Permanent</SelectItem>
              <SelectItem value="intern">Intern</SelectItem>
              <SelectItem value="contractor">Contractor</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-fn-fg-faint text-fn-sm-plus font-mono">value = {val || '∅'}</span>
        </div>

        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-select-2">With groups + separator</Label>
          <Select>
            <SelectTrigger id="sg-select-2">
              <SelectValue placeholder="Pick a department" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Technical</SelectLabel>
                <SelectItem value="eng">Engineering</SelectItem>
                <SelectItem value="design">Design</SelectItem>
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Operations</SelectLabel>
                <SelectItem value="hr">HR &amp; People</SelectItem>
                <SelectItem value="ops">Operations</SelectItem>
                <SelectItem value="bd">Business Dev</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-select-3">Disabled</Label>
          <Select disabled>
            <SelectTrigger id="sg-select-3">
              <SelectValue placeholder="Cannot edit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a">A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-select-4">Error (aria-invalid)</Label>
          <Select>
            <SelectTrigger id="sg-select-4" aria-invalid>
              <SelectValue placeholder="Pick something" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a">Option A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Spec
        items={[
          [
            'trigger',
            'matches Input — h-[34px] · px-fn-2_5 · border-fn-border-strong · text-fn-base',
          ],
          ['trigger icon', 'ChevronDown 14×14 (h-fn-3_5) · fn-fg-faint'],
          ['content panel', 'rounded-fn-sm (8) · shadow-fn-popover · bg-fn-bg-panel'],
          ['item', 'rounded-fn-xs · py-fn-1_5 · pl-fn-8 (32 for indicator) · pr-fn-2'],
          ['item focus', 'bg-fn-bg-inset'],
          ['item checked', 'font-fn-medium · Check indicator in fn-accent (h-fn-3_5)'],
          ['label', '11px uppercase tracking-fn-uppercase-tight (0.06em) · fn-fg-faint'],
          ['separator', '1px fn-divider, inset -fn-1 horizontal'],
          ['a11y', 'Radix Select — arrow nav, type-to-search, escape closes'],
        ]}
      />
    </div>
  );
}
