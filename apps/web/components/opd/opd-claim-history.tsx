'use client';

import type { OpdClaimHistoryEntry } from '@futurenostics/types';
import { OPD_COPY } from '@/components/opd/opd-copy';
import { formatVisitDate } from '@/components/opd/opd-claim-status';

export function OpdClaimHistorySection({ history }: { history: OpdClaimHistoryEntry[] }) {
  if (history.length === 0) return null;

  return (
    <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs px-fn-5 py-fn-4 gap-fn-3 flex flex-col border">
      <h2 className="text-fn-fg font-fn-semibold text-[14px]">{OPD_COPY.historyTitle}</h2>
      <ul className="gap-fn-2 flex flex-col">
        {history.map((entry) => (
          <li key={entry.id} className="border-fn-border pb-fn-2 border-b last:border-0 last:pb-0">
            <div className="gap-fn-2 flex flex-wrap items-baseline justify-between">
              <span className="text-fn-fg text-[13px]">{entry.title}</span>
              <time className="text-fn-fg-faint font-mono text-[11px]" dateTime={entry.occurredAt}>
                {formatVisitDate(entry.occurredAt)}
              </time>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
