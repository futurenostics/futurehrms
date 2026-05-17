/**
 * Style-guide section — RadioGroup primitives.
 *
 * Two variants — classic 18px-circle stack and full-width card style
 * for high-prominence picks.
 */
'use client';

import * as React from 'react';
import { Briefcase, Clock, GraduationCap, UserCheck } from 'lucide-react';
import { RadioGroup, RadioGroupItem, RadioCard, RadioCardGroup } from '@/components/ui/radio-group';
import { Spec } from './label';

export function RadioGroupSection() {
  const [classic, setClassic] = React.useState('weekly');
  const [card, setCard] = React.useState('FullTime');
  return (
    <div id="primitive-radio-group" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          RadioGroup
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          Two variants — classic 18px-circle stack and a card-style picker for the contract-type
          /tier-choice patterns the employee-sheet uses.
        </p>
      </div>

      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-6 p-fn-6 grid grid-cols-1 border md:grid-cols-2">
        <div className="gap-fn-2 flex flex-col">
          <div className="text-fn-fg-faint text-fn-sm font-fn-semibold tracking-fn-uppercase uppercase">
            Classic stack
          </div>
          <RadioGroup value={classic} onValueChange={setClassic}>
            {[
              { v: 'weekly', l: 'Weekly' },
              { v: 'biweekly', l: 'Bi-weekly' },
              { v: 'monthly', l: 'Monthly' },
            ].map((opt) => (
              <label
                key={opt.v}
                htmlFor={`sg-radio-${opt.v}`}
                className="text-fn-fg gap-fn-2 text-fn-base flex cursor-pointer items-center"
              >
                <RadioGroupItem id={`sg-radio-${opt.v}`} value={opt.v} />
                {opt.l}
              </label>
            ))}
          </RadioGroup>
          <div className="text-fn-fg-faint text-fn-sm-plus font-mono">value = {classic}</div>
        </div>

        <div className="gap-fn-2 flex flex-col">
          <div className="text-fn-fg-faint text-fn-sm font-fn-semibold tracking-fn-uppercase uppercase">
            Card picker
          </div>
          <RadioCardGroup value={card} onValueChange={setCard}>
            <RadioCard
              value="FullTime"
              title="Full-time"
              description="40+ hrs/wk, full benefits"
              icon={<Briefcase className="h-fn-4 w-fn-4" />}
            />
            <RadioCard
              value="PartTime"
              title="Part-time"
              description="20-39 hrs/wk, pro-rated"
              icon={<Clock className="h-fn-4 w-fn-4" />}
            />
            <RadioCard
              value="Contractor"
              title="Contractor"
              description="Fixed-term engagement"
              icon={<UserCheck className="h-fn-4 w-fn-4" />}
            />
            <RadioCard
              value="Intern"
              title="Intern"
              description="Time-bounded internship"
              icon={<GraduationCap className="h-fn-4 w-fn-4" />}
            />
          </RadioCardGroup>
          <div className="text-fn-fg-faint text-fn-sm-plus font-mono">value = {card}</div>
        </div>
      </div>

      <Spec
        items={[
          ['classic item size', '18×18 circle · 1.5px border'],
          ['classic indicator', '6×6 filled circle (h-fn-1_5 w-fn-1_5 fill-current)'],
          ['classic gap', '8px between items (gap-fn-2)'],
          ['card surface', 'rounded-fn-xs · 12px padding · 12px gap · 2-col grid on ≥sm'],
          ['card selected', 'border fn-accent · bg fn-accent-soft/40'],
          ['card icon', 'fn-fg-faint → fn-accent-soft-fg when selected'],
          ['a11y', 'Radix RadioGroup — arrow nav + space select + correct ARIA'],
        ]}
      />
    </div>
  );
}
