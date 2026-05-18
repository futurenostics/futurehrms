'use client';

import * as React from 'react';
import { SlidersHorizontal, X, Bookmark, Trash2 } from 'lucide-react';
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
import { AdvancedFiltersProvider, useFiltersContext, useTotalCount } from './context';
import { CheckboxListSection as CheckboxListSectionView } from './sections/checkbox-list-section';
import { PillToggleSection as PillToggleSectionView } from './sections/pill-toggle-section';
import { RangeHistogramSection as RangeHistogramSectionView } from './sections/range-histogram-section';
import { DateRangeSection as DateRangeSectionView } from './sections/date-range-section';
import { ComboboxFilterSection as ComboboxFilterSectionView } from './sections/combobox-section';
import { CheckboxSubtextSection as CheckboxSubtextSectionView } from './sections/checkbox-subtext-section';
import { SavePresetDialog } from './save-preset-dialog';
import { useFilterStore, type FilterStore } from './use-filter-store';
import type { FilterCounts, FilterPreset, FilterSchema, FilterState } from './types';

/**
 * <AdvancedFiltersRoot> — wraps a page section so the filter drawer,
 * the chips bar, and the host's table all see the same store.
 *
 *   <AdvancedFiltersRoot schema={schema} onCountsRequest={fetchCounts}>
 *     <Header>
 *       <AdvancedFiltersTrigger />
 *       <ChipsBar />
 *     </Header>
 *     <Table />
 *     <AdvancedFilters open={open} onOpenChange={setOpen} />
 *   </AdvancedFiltersRoot>
 *
 * The Root owns the reducer + URL sync + presets. Consumers use the
 * `useAdvancedFiltersValue()` hook to read the current state when
 * building their data-fetch queries.
 */

export interface AdvancedFiltersRootProps {
  schema: FilterSchema;
  onCountsRequest?: (state: FilterState) => Promise<FilterCounts>;
  syncUrl?: boolean;
  children: React.ReactNode;
}

const StoreContext = React.createContext<FilterStore | null>(null);

export function AdvancedFiltersRoot({
  schema,
  onCountsRequest,
  syncUrl = true,
  children,
}: AdvancedFiltersRootProps) {
  const store = useFilterStore({ schema, onCountsRequest, syncUrl });

  const ctxValue = React.useMemo(
    () => ({
      subscribe: store.subscribe,
      getSnapshot: store.getSnapshot,
      getCounts: store.getCounts,
      subscribeCounts: store.subscribeCounts,
      dispatch: store.dispatch,
    }),
    [store],
  );

  return (
    <StoreContext.Provider value={store}>
      <AdvancedFiltersProvider value={ctxValue}>{children}</AdvancedFiltersProvider>
    </StoreContext.Provider>
  );
}

function useStore(): FilterStore {
  const store = React.useContext(StoreContext);
  if (!store) throw new Error('AdvancedFilters component used outside AdvancedFiltersRoot');
  return store;
}

/** Reactive snapshot of the current filter state — use this in your TanStack-Query keys. */
export function useAdvancedFiltersValue(): FilterState {
  const ctx = useFiltersContext();
  return React.useSyncExternalStore(ctx.subscribe, ctx.getSnapshot, ctx.getSnapshot);
}

/** Active-section count — handy for trigger button badges. */
export function useAdvancedFiltersActiveCount(): number {
  const state = useAdvancedFiltersValue();
  let n = 0;
  for (const v of Object.values(state)) {
    switch (v.kind) {
      case 'multi':
      case 'flags':
        if (v.ids.length > 0) n++;
        break;
      case 'single':
        if (v.id !== null) n++;
        break;
      case 'range':
        if (v.min !== null || v.max !== null) n++;
        break;
      case 'date-range':
        if (v.preset || v.from || v.to) n++;
        break;
    }
  }
  return n;
}

/* ────────────────────────── Drawer ────────────────────────── */

export interface AdvancedFiltersProps {
  schema: FilterSchema;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the user clicks Apply. Receives the final state. */
  onApply?: (state: FilterState) => void;
}

export function AdvancedFilters({ schema, open, onOpenChange, onApply }: AdvancedFiltersProps) {
  const store = useStore();
  const activeCount = useAdvancedFiltersActiveCount();
  const [presetDialogOpen, setPresetDialogOpen] = React.useState(false);

  function handleApply() {
    onApply?.(store.getSnapshot());
    onOpenChange(false);
  }

  return (
    <>
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
            </div>
          </SheetHeader>

          {store.presets.length > 0 && (
            <div className="border-fn-divider bg-fn-bg-panel px-fn-5 py-fn-3 border-b">
              <PresetsRow store={store} />
            </div>
          )}

          <SheetBody>
            <div className="gap-fn-3 px-fn-5 py-fn-4 flex flex-col">
              {schema.sections.map((section) => {
                switch (section.type) {
                  case 'checkbox-list':
                    return <CheckboxListSectionView key={section.key} section={section} />;
                  case 'pill-toggle':
                    return <PillToggleSectionView key={section.key} section={section} />;
                  case 'range-with-histogram':
                    return <RangeHistogramSectionView key={section.key} section={section} />;
                  case 'date-range-with-presets':
                    return <DateRangeSectionView key={section.key} section={section} />;
                  case 'combobox':
                    return <ComboboxFilterSectionView key={section.key} section={section} />;
                  case 'checkbox-with-subtext':
                    return <CheckboxSubtextSectionView key={section.key} section={section} />;
                }
              })}
            </div>
          </SheetBody>

          <SheetFooter className="flex-col items-stretch">
            <ResultCountSummary schema={schema} activeCount={activeCount} />
            <div className="gap-fn-2 mt-fn-2 flex items-center">
              <Button variant="ghost" onClick={() => store.dispatch({ type: 'CLEAR_ALL' })}>
                <X className="h-fn-3_5 w-fn-3_5" /> Clear all
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPresetDialogOpen(true)}
                disabled={activeCount === 0}
              >
                <Bookmark className="h-fn-3_5 w-fn-3_5" /> Save as preset
              </Button>
              <Button onClick={handleApply} className="ml-auto">
                Apply{activeCount > 0 && ` (${activeCount})`}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <SavePresetDialog
        open={presetDialogOpen}
        onOpenChange={setPresetDialogOpen}
        onConfirm={(name) => store.savePreset(name)}
      />
    </>
  );
}

function PresetsRow({ store }: { store: FilterStore }) {
  return (
    <div>
      <p className="text-fn-fg-faint font-fn-semibold mb-fn-1_5 tracking-fn-uppercase-tight text-[11px] uppercase">
        Saved presets
      </p>
      <div className="gap-fn-1_5 flex flex-wrap">
        {store.presets.map((p) => (
          <PresetChip
            key={p.id}
            preset={p}
            onApply={() => store.applyPreset(p.id)}
            onDelete={() => store.deletePreset(p.id)}
          />
        ))}
      </div>
    </div>
  );
}

function PresetChip({
  preset,
  onApply,
  onDelete,
}: {
  preset: FilterPreset;
  onApply: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="border-fn-border bg-fn-bg-inset rounded-fn-xs gap-fn-1 inline-flex items-center border text-[12px]">
      <button
        type="button"
        onClick={onApply}
        className="hover:text-fn-accent text-fn-fg font-fn-medium px-fn-2 py-fn-1 cursor-pointer"
      >
        <Bookmark className="h-fn-3 w-fn-3 mr-fn-1 inline" />
        {preset.name}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="text-fn-fg-faint hover:text-fn-danger pr-fn-1_5 py-fn-1 cursor-pointer"
        aria-label={`Delete preset ${preset.name}`}
      >
        <Trash2 className="h-fn-3 w-fn-3" />
      </button>
    </div>
  );
}

function ResultCountSummary({
  schema,
  activeCount,
}: {
  schema: FilterSchema;
  activeCount: number;
}) {
  const total = useTotalCount();
  if (total === null) return null;
  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-inset/60 px-fn-3 py-fn-2_5 gap-fn-3 flex items-center border">
      <span
        aria-hidden
        className="rounded-fn-xs bg-fn-bg-panel text-fn-fg h-fn-7 w-fn-7 inline-flex items-center justify-center"
      >
        <SlidersHorizontal className="h-fn-3_5 w-fn-3_5" />
      </span>
      <div className="flex-1">
        <div className="text-fn-fg font-fn-semibold text-[13px] tabular-nums">
          {total.toLocaleString()} {schema.entityNoun} match
        </div>
        <div className="text-fn-fg-faint text-[11.5px]">
          {activeCount === 0
            ? 'No filters applied — full list visible.'
            : `${activeCount} ${activeCount === 1 ? 'filter' : 'filters'} · updates live as you change them`}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── Trigger ────────────────────────── */

export function AdvancedFiltersTrigger({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  const activeCount = useAdvancedFiltersActiveCount();
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
