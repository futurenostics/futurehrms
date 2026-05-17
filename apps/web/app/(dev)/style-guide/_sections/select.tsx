/**
 * Style-guide section — Select primitive.
 */
'use client';

import * as React from 'react';
import { Circle, ShieldCheck, ShieldOff, UserCog } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
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

      {/* Variants */}
      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-6 p-fn-6 grid grid-cols-1 border md:grid-cols-3">
        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-select-compact">Compact (h-28)</Label>
          <Select>
            <SelectTrigger id="sg-select-compact" variant="compact">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most recent</SelectItem>
              <SelectItem value="name">Name A → Z</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-select-label">Inline label</Label>
          <Select defaultValue="eng">
            <SelectTrigger id="sg-select-label" variant="label" label="Department">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="eng">Engineering</SelectItem>
              <SelectItem value="ops">Operations</SelectItem>
              <SelectItem value="hr">HR &amp; People</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-select-ghost">Ghost (inline edit)</Label>
          <Select defaultValue="recent">
            <SelectTrigger id="sg-select-ghost" variant="ghost">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most recent</SelectItem>
              <SelectItem value="name">Name A → Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Rich option types */}
      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-6 p-fn-6 grid grid-cols-1 border md:grid-cols-2">
        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="sg-select-rich">Rich rows — icon + trailing meta</Label>
          <Select defaultValue="probation">
            <SelectTrigger id="sg-select-rich">
              <SelectValue placeholder="Pick status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                value="all"
                icon={<Circle className="h-fn-3 w-fn-3 fill-fn-fg-faint text-fn-fg-faint" />}
                meta={<Badge tone="default">84</Badge>}
              >
                All statuses
              </SelectItem>
              <SelectItem
                value="probation"
                icon={<ShieldCheck className="h-fn-3_5 w-fn-3_5 text-fn-warning" />}
                meta={<Badge tone="warning">12</Badge>}
              >
                Probation
              </SelectItem>
              <SelectItem
                value="permanent"
                icon={<ShieldCheck className="h-fn-3_5 w-fn-3_5 text-fn-success" />}
                meta={<Badge tone="success">58</Badge>}
              >
                Permanent
              </SelectItem>
              <SelectItem
                value="contractor"
                icon={<UserCog className="h-fn-3_5 w-fn-3_5 text-fn-info" />}
                meta={<Badge tone="info">8</Badge>}
              >
                Contractor
              </SelectItem>
              <SelectItem
                value="off"
                icon={<ShieldOff className="h-fn-3_5 w-fn-3_5 text-fn-danger" />}
                meta={<Badge tone="danger">6</Badge>}
              >
                On leave
              </SelectItem>
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
