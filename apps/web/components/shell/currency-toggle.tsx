'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const currencies = ['USD', 'PKR'] as const;
type Currency = (typeof currencies)[number];

export function CurrencyToggle() {
  const [active, setActive] = useState<Currency>('USD');
  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-subtle p-fn-0_5 flex border">
      {currencies.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => setActive(c)}
          className={cn(
            'rounded-fn-xs px-fn-2_5 py-fn-1 font-fn-semibold tracking-fn-uppercase-tight font-mono text-[11.5px] transition-colors',
            c === active
              ? 'bg-fn-bg-panel text-fn-fg shadow-fn-xs'
              : 'text-fn-fg-faint hover:text-fn-fg-muted',
          )}
          aria-pressed={c === active}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
