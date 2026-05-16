'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const currencies = ['USD', 'PKR'] as const;
type Currency = (typeof currencies)[number];

export function CurrencyToggle() {
  const [active, setActive] = useState<Currency>('USD');
  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-subtle flex border p-0.5">
      {currencies.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => setActive(c)}
          className={cn(
            'rounded-fn-xs px-2.5 py-1 font-mono text-[11.5px] font-semibold tracking-wider transition-colors',
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
