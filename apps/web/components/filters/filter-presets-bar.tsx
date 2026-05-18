'use client';

import * as React from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type FilterPreset } from './types';

/**
 * Saved-preset chips row — matches PNG 199 + PNG 200 top of the
 * drawer. Sits between the header and the section stack.
 *
 *   SAVED FILTERS                                     + Save current
 *   ● New hires · 90 days   8       On probation   6
 *   ● Payoneer earners     32       Engineering · seniors  12
 *
 * Active preset gets the dark fill from PNG 200. Clicking a preset
 * applies it; the X removes it from saved presets.
 */

export interface FilterPresetsBarProps {
  presets: FilterPreset[];
  activeId: string | null;
  onApply: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveCurrent: () => void;
  emptyMessage?: string;
}

export function FilterPresetsBar({
  presets,
  activeId,
  onApply,
  onDelete,
  onSaveCurrent,
  emptyMessage = 'No saved filters yet. Save your current selection to reuse it later.',
}: FilterPresetsBarProps) {
  return (
    <div className="gap-fn-2 flex flex-col">
      <div className="gap-fn-2 flex items-center justify-between">
        <span className="text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight text-[11px] uppercase">
          Saved filters
        </span>
        <button
          type="button"
          onClick={onSaveCurrent}
          className="text-fn-accent-soft-fg gap-fn-1 font-fn-semibold inline-flex cursor-pointer items-center text-[11.5px] hover:underline"
        >
          <Plus className="h-fn-3 w-fn-3" /> Save current
        </button>
      </div>

      {presets.length === 0 ? (
        <p className="text-fn-fg-faint text-[11.5px]">{emptyMessage}</p>
      ) : (
        <div className="gap-fn-1_5 flex flex-wrap">
          {presets.map((preset) => {
            const active = activeId === preset.id;
            return (
              <span
                key={preset.id}
                className={cn(
                  'rounded-fn-xs gap-fn-1 px-fn-2 py-fn-1 font-fn-medium inline-flex items-center border text-[11.5px] transition-colors',
                  active
                    ? 'border-fn-fg bg-fn-fg text-fn-bg-panel'
                    : 'border-fn-border bg-fn-bg-panel text-fn-fg-muted hover:border-fn-fg-faint',
                )}
              >
                <button type="button" onClick={() => onApply(preset.id)} className="cursor-pointer">
                  {preset.name}
                </button>
                {!active && (
                  <button
                    type="button"
                    onClick={() => onDelete(preset.id)}
                    aria-label={`Delete ${preset.name}`}
                    className="text-fn-fg-faint hover:text-fn-danger ml-fn-0_5 cursor-pointer"
                  >
                    <X className="h-fn-2_5 w-fn-2_5" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
