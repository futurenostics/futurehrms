/**
 * Style-guide section — Combobox + MultiCombobox primitives.
 */
'use client';

import * as React from 'react';
import { Combobox, MultiCombobox, type ComboboxOption } from '@/components/ui/combobox';
import { Badge } from '@/components/ui/badge';
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

function AvatarTile({ initials, hue }: { initials: string; hue: number }) {
  return (
    <span
      aria-hidden
      className="rounded-fn-xs font-fn-semibold h-fn-6 w-fn-6 inline-flex items-center justify-center text-[10px]"
      style={{
        background: `oklch(0.92 0.07 ${hue})`,
        color: `oklch(0.38 0.16 ${hue})`,
        letterSpacing: '-0.02em',
      }}
    >
      {initials}
    </span>
  );
}

const RICH_PEOPLE: ComboboxOption[] = [
  {
    value: 'rida',
    label: 'Rida Hashmi',
    description: 'rida@futurenostics.com',
    icon: <AvatarTile initials="RH" hue={22} />,
    meta: <Badge tone="warning">Engineering</Badge>,
  },
  {
    value: 'talha',
    label: 'Talha Mansoor',
    description: 'talha@futurenostics.com',
    icon: <AvatarTile initials="TM" hue={175} />,
    meta: <Badge tone="info">Business Dev</Badge>,
  },
  {
    value: 'maira',
    label: 'Maira Khan',
    description: 'maira@futurenostics.com',
    icon: <AvatarTile initials="MK" hue={145} />,
    meta: <Badge tone="danger">Operations</Badge>,
  },
  {
    value: 'asma',
    label: 'Asma Ali',
    description: 'asma@futurenostics.com',
    icon: <AvatarTile initials="AA" hue={280} />,
    meta: <Badge tone="accent">Engineering</Badge>,
  },
];

export function ComboboxSection() {
  const [dept, setDept] = React.useState<string>('');
  const [mgr, setMgr] = React.useState<string>('');
  const [person, setPerson] = React.useState<string>('rida');
  const [tags, setTags] = React.useState<string[]>(['eng', 'design']);
  const [loadingDemo, setLoadingDemo] = React.useState(true);

  // Flip the loading demo every 4s so the skeleton is always visible.
  React.useEffect(() => {
    const id = window.setInterval(() => setLoadingDemo((v) => !v), 4000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div id="primitive-combobox" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Combobox
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          Searchable picker. Trigger matches Select's chrome exactly. Options support descriptions,
          group headings, leading icons/avatars, and trailing meta. Comes in single- and multi-
          select variants; both share loading + no-results states.
        </p>
      </div>

      {/* Basic single-select */}
      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-6 p-fn-6 grid grid-cols-1 border md:grid-cols-2">
        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-combo-1">Department (descriptions)</Label>
          <Combobox
            id="sg-combo-1"
            options={DEPARTMENTS}
            value={dept}
            onValueChange={setDept}
            placeholder="Pick a department"
            searchPlaceholder="Search departments…"
            emptyLabel="departments"
          />
          <span className="text-fn-fg-faint text-fn-sm-plus font-mono">value = {dept || '∅'}</span>
        </div>

        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-combo-2">Manager (groups)</Label>
          <Combobox
            id="sg-combo-2"
            options={MANAGERS}
            value={mgr}
            onValueChange={setMgr}
            placeholder="Reports to"
            searchPlaceholder="Search by name or role…"
            emptyLabel="managers"
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

      {/* Rich rows */}
      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-6 p-fn-6 grid grid-cols-1 border md:grid-cols-2">
        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-combo-rich">Rich rows — avatar + dept badge</Label>
          <Combobox
            id="sg-combo-rich"
            options={RICH_PEOPLE}
            value={person}
            onValueChange={setPerson}
            placeholder="Pick a teammate"
            searchPlaceholder="Search employees…"
            emptyLabel="employees"
          />
        </div>

        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-combo-loading">Loading state (auto-cycles every 4s for demo)</Label>
          <Combobox
            id="sg-combo-loading"
            options={RICH_PEOPLE}
            loading={loadingDemo}
            placeholder="Loading…"
            searchPlaceholder="Search…"
          />
        </div>
      </div>

      {/* Multi-select */}
      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-6 p-fn-6 grid grid-cols-1 border md:grid-cols-2">
        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-multi-1">Multi-select — departments</Label>
          <MultiCombobox
            id="sg-multi-1"
            options={DEPARTMENTS}
            values={tags}
            onValuesChange={setTags}
            placeholder="Select departments…"
            searchPlaceholder="Search…"
            emptyLabel="departments"
          />
          <span className="text-fn-fg-faint text-fn-sm-plus font-mono">
            values = [{tags.join(', ') || '∅'}]
          </span>
        </div>

        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-multi-2">Multi-select — people</Label>
          <MultiCombobox
            id="sg-multi-2"
            options={RICH_PEOPLE}
            values={[]}
            onValuesChange={() => {}}
            placeholder="Assign reviewers…"
            searchPlaceholder="Search people…"
            emptyLabel="people"
          />
        </div>
      </div>

      <Spec
        items={[
          ['trigger', 'matches SelectTrigger — h-[34px] · px-fn-2_5 · border-strong'],
          ['multi trigger', 'auto height · chip rail (Badge accent-soft, X to remove)'],
          ['chips overflow', 'past `maxChips` (default 3) collapses to `+N more`'],
          ['multi clear', 'X button right of chips clears all; footer Clear all mirrors it'],
          ['panel', 'rounded-fn-sm (via Popover) · shadow-fn-popover · trigger-width'],
          [
            'rich row',
            'leading icon/avatar slot, two-line label + description, trailing meta slot',
          ],
          ['loading', '4 skeleton rows (icon-circle + line) — shown when `loading` is true'],
          ['no-results', 'SearchX tile + "No <label> match" + quoted query'],
          ['multi indicator', 'rounded-fn-xs square checkbox left, fills with fn-accent when on'],
          [
            'a11y',
            'role="combobox" + aria-expanded + aria-haspopup="listbox"; cmdk handles arrow nav + filter',
          ],
        ]}
      />
    </div>
  );
}
