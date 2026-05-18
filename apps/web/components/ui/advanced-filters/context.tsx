'use client';

/**
 * AdvancedFiltersContext + selector hooks.
 *
 * The primitive keeps state in a `useReducer` and exposes it via a
 * context. Section components subscribe to **only their slice** of the
 * state through `useSectionValue(key)` — backed by `useSyncExternalStore`
 * so a click on one section never schedules a re-render of any other.
 *
 * This is the heart of the "no panel-wide re-renders" promise: a
 * 20-bar salary histogram, a 200-option manager combobox, and a 12-
 * option contract pill row coexist without each one repainting when
 * the user toggles a status checkbox.
 */

import * as React from 'react';
import type { FilterAction } from './reducer';
import type { FilterCounts, FilterState, FilterValue } from './types';

interface AdvancedFiltersContextValue {
  /** Subscribe to changes; returns an unsubscribe. */
  subscribe(listener: () => void): () => void;
  /** Read the current state snapshot. */
  getSnapshot(): FilterState;
  /** Read the current counts snapshot (or null while pending / not requested). */
  getCounts(): FilterCounts | null;
  /** Subscribe to count snapshot changes. */
  subscribeCounts(listener: () => void): () => void;
  /** Issue an action. */
  dispatch(action: FilterAction): void;
}

const Ctx = React.createContext<AdvancedFiltersContextValue | null>(null);

export interface ProviderProps {
  value: AdvancedFiltersContextValue;
  children: React.ReactNode;
}

export function AdvancedFiltersProvider({ value, children }: ProviderProps) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFiltersContext(): AdvancedFiltersContextValue {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('AdvancedFilters section used outside provider');
  return ctx;
}

/** Subscribe to just one section's value — re-renders only when that slice changes. */
export function useSectionValue(key: string): FilterValue | undefined {
  const ctx = useFiltersContext();
  return React.useSyncExternalStore(
    ctx.subscribe,
    () => ctx.getSnapshot()[key],
    () => ctx.getSnapshot()[key],
  );
}

/** Per-option counts for a specific section, or `null` if not loaded yet. */
export function useSectionCounts(key: string): Record<string, number> | null {
  const ctx = useFiltersContext();
  return React.useSyncExternalStore(
    ctx.subscribeCounts,
    () => ctx.getCounts()?.perOption[key] ?? null,
    () => null,
  );
}

/** The total matched count from the counts API; `null` while pending. */
export function useTotalCount(): number | null {
  const ctx = useFiltersContext();
  return React.useSyncExternalStore(
    ctx.subscribeCounts,
    () => ctx.getCounts()?.total ?? null,
    () => null,
  );
}

/** Per-section metadata (e.g. salary histogram buckets). */
export function useSectionMeta<T = unknown>(key: string): T | null {
  const ctx = useFiltersContext();
  return React.useSyncExternalStore(
    ctx.subscribeCounts,
    () => (ctx.getCounts()?.perSectionMeta?.[key] as T | undefined) ?? null,
    () => null,
  );
}

/** Dispatch handle for sections — stable across renders. */
export function useFilterDispatch(): (action: FilterAction) => void {
  const ctx = useFiltersContext();
  return ctx.dispatch;
}
