'use client';

import * as React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

/**
 * The Advanced Filters drawer chrome — matches PNG 199.
 *
 * Layout:
 *   [Header]   icon + "Advanced filters" + "<N> filters active"   X close
 *   [Saved Presets row]  (rendered by consumer via `presetsSlot`)
 *   [Body]     scrollable section stack
 *   [Footer]   matched-of-total · clear all · save as preset · Apply (N)
 *
 * Consumers compose the sections + presets bar themselves; this
 * component owns the chrome + close mechanics + footer wiring.
 */

export interface FilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Active-section count for the header subtitle + Apply button badge. */
  activeCount: number;
  /** "22 of 84 employees match" — left side of the footer. */
  matchedCount?: number;
  totalCount?: number;
  /** Entity noun for the footer ("employees", "projects", "rules"). */
  entityNoun?: string;
  /** Sticky preset chips row rendered between header and body. */
  presetsSlot?: React.ReactNode;
  /** Section stack. */
  children: React.ReactNode;
  /** Triggered by Clear all in the footer. */
  onClearAll(): void;
  /** Triggered by Save as preset in the footer. Opens whatever dialog the consumer prefers. */
  onSavePreset?(): void;
  /** Triggered by the primary Apply button. Defaults to closing the panel. */
  onApply?(): void;
}

export function FilterPanel({
  open,
  onOpenChange,
  activeCount,
  matchedCount,
  totalCount,
  entityNoun = 'rows',
  presetsSlot,
  children,
  onClearAll,
  onSavePreset,
  onApply,
}: FilterPanelProps) {
  function handleApply() {
    onApply?.();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="md">
        <SheetHeader>
          <div className="gap-fn-2 flex items-center">
            <span
              aria-hidden
              className="rounded-fn-xs bg-fn-icon-tile text-fn-icon-tile-fg h-fn-7 w-fn-7 inline-flex items-center justify-center"
            >
              <SlidersHorizontal className="h-fn-3_5 w-fn-3_5" />
            </span>
            <div className="flex-1">
              <SheetTitle>Advanced filters</SheetTitle>
              <p className="text-fn-fg-faint mt-fn-0_5 text-[12px]">
                {activeCount === 0
                  ? 'No filters active'
                  : `${activeCount} ${activeCount === 1 ? 'filter' : 'filters'} active`}
              </p>
            </div>
            {/* Close button comes from the Sheet primitive — no custom X here. */}
          </div>
        </SheetHeader>

        {presetsSlot && (
          <div className="border-fn-divider bg-fn-bg-panel px-fn-5 py-fn-3 border-b">
            {presetsSlot}
          </div>
        )}

        <SheetBody>
          <div className="gap-fn-3 px-fn-5 py-fn-4 flex flex-col">{children}</div>
        </SheetBody>

        <SheetFooter className="flex-col items-stretch">
          {typeof matchedCount === 'number' && typeof totalCount === 'number' && (
            <div className="rounded-fn-sm border-fn-border bg-fn-bg-inset/60 px-fn-3 py-fn-2_5 mb-fn-2 gap-fn-3 flex items-center border">
              <span
                aria-hidden
                className="rounded-fn-xs bg-fn-bg-panel text-fn-fg h-fn-7 w-fn-7 inline-flex items-center justify-center"
              >
                <SlidersHorizontal className="h-fn-3_5 w-fn-3_5" />
              </span>
              <div className="flex-1">
                <div className="text-fn-fg font-fn-semibold text-[13px] tabular-nums">
                  {matchedCount.toLocaleString()} of {totalCount.toLocaleString()} {entityNoun}{' '}
                  match
                </div>
                <div className="text-fn-fg-faint text-[11.5px]">
                  {activeCount === 0
                    ? 'No filters applied — full list visible.'
                    : `${activeCount} ${activeCount === 1 ? 'filter' : 'filters'} · updates live as you change them`}
                </div>
              </div>
              {matchedCount < totalCount && (
                <Badge tone="warning" className="tabular-nums">
                  −{(totalCount - matchedCount).toLocaleString()}
                </Badge>
              )}
            </div>
          )}
          <div className="gap-fn-2 flex items-center">
            <Button variant="ghost" onClick={onClearAll}>
              <X className="h-fn-3_5 w-fn-3_5" /> Clear all
            </Button>
            {onSavePreset && (
              <Button variant="secondary" onClick={onSavePreset}>
                Save as preset
              </Button>
            )}
            <Button onClick={handleApply} className="ml-auto">
              Apply{activeCount > 0 && ` (${activeCount})`}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Trigger button that opens the panel — convenience export. */
export function FilterPanelTrigger({
  onClick,
  activeCount,
  className,
}: {
  onClick: () => void;
  activeCount: number;
  className?: string;
}) {
  return (
    <Button variant="secondary" onClick={onClick} className={cn(className)}>
      <SlidersHorizontal className="h-fn-3_5 w-fn-3_5" /> Filters
      {activeCount > 0 && (
        <Badge tone="accent" className="ml-fn-1 tabular-nums">
          {activeCount}
        </Badge>
      )}
    </Button>
  );
}
