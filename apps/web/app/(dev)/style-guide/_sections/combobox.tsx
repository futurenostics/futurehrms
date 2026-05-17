/**
 * Style-guide section — Combobox primitive.
 */
'use client';

import * as React from 'react';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { Spec } from './label';

const DEPARTMENTS: ComboboxOption[] = [
  { value: 'eng', label: 'Engineering', description: '24 people · 6 squads' },
  { value: 'design', label: 'Design', description: '7 people' },
  { value: 'hr', label: 'HR & People', description: '4 people' },
  { value: 'ops', label: 'Operations', description: '11 people' },
  { value: 'bd', label: 'Business Dev', description: '9 people' },
  { value: 'fin', label: 'Finance', description: '5 people' },
];

const MANAGERS: ComboboxOption[] = [
  { value: 'eid-0001', label: 'Asma Ali', description: 'HR Admin', group: 'Active' },
  { value: 'eid-0007', label: 'Talha Mansoor', description: 'BD Manager', group: 'Active' },
  { value: 'eid-0012', label: 'Imran Yousaf', description: 'Sr. Engineer', group: 'Active' },
  { value: 'eid-0019', label: 'Sana Lateef', description: 'BD Lead', group: 'Active' },
  { value: 'eid-0033', label: 'Rana Saeed', description: 'Operations Lead', group: 'On leave' },
];

export function ComboboxSection() {
  const [dept, setDept] = React.useState<string>('');
  const [mgr, setMgr] = React.useState<string>('');
  return (
    <div id="primitive-combobox" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Combobox
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          Searchable single-select. Trigger matches Select's chrome exactly. Options support
          descriptions and optional group headings; cmdk powers the type-to-filter.
        </p>
      </div>

      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-6 p-fn-6 grid grid-cols-1 border md:grid-cols-2">
        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-combo-1">Department (with descriptions)</Label>
          <Combobox
            id="sg-combo-1"
            options={DEPARTMENTS}
            value={dept}
            onValueChange={setDept}
            placeholder="Pick a department"
            searchPlaceholder="Search departments…"
          />
          <span className="text-fn-fg-faint text-fn-sm-plus font-mono">value = {dept || '∅'}</span>
        </div>

        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-combo-2">Manager (with groups)</Label>
          <Combobox
            id="sg-combo-2"
            options={MANAGERS}
            value={mgr}
            onValueChange={setMgr}
            placeholder="Reports to"
            searchPlaceholder="Search by name or role…"
          />
        </div>

        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-combo-3">Disabled</Label>
          <Combobox
            id="sg-combo-3"
            options={DEPARTMENTS}
            disabled
            placeholder="Pick department first"
          />
        </div>

        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-combo-4">Error</Label>
          <Combobox
            id="sg-combo-4"
            options={DEPARTMENTS}
            aria-invalid
            placeholder="Required field"
          />
        </div>
      </div>

      <Spec
        items={[
          ['trigger', 'matches SelectTrigger exactly — h-[34px] · px-fn-2_5 · border-strong'],
          ['panel', 'rounded-fn-sm (via Popover) · shadow-fn-popover · w = trigger width'],
          ['input', 'h-[34px] · Search icon left · placeholder fn-fg-faint'],
          ['item', 'rounded-fn-xs · py-fn-1_5 · px-fn-2 · 8px gap to indicator'],
          [
            'selected indicator',
            'Check icon 14×14 (h-fn-3_5) · fn-accent · opacity-0 when not selected (reserves space)',
          ],
          ['option description', '11.5px (text-fn-sm-plus) · fn-fg-faint · sits below label'],
          ['groups', 'optional `group` field on options · heading rendered uppercase fn-sm'],
          ['empty', 'fn-fg-muted body text, 24px padding'],
          [
            'a11y',
            'role="combobox" + aria-expanded + aria-haspopup="listbox"; cmdk handles arrow nav + filter',
          ],
        ]}
      />
    </div>
  );
}
