'use client';

/**
 * useFilterStore — sets up the external-store value passed into
 * AdvancedFiltersProvider. Owns:
 *   • the reducer-backed state slice
 *   • URL sync (back-button + copy-paste links)
 *   • localStorage preset persistence
 *   • the debounced counts request and its response cache
 *
 * Sections subscribe via `useSectionValue` / `useSectionCounts` and
 * never read this hook's return value directly — that's how we keep
 * per-section re-renders independent.
 */

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { makeReducer, type FilterAction } from './reducer';
import {
  currentUrlSignature,
  decodeStateFromUrl,
  encodeValue,
  serializeState,
  URL_PREFIX,
} from './url-codec';
import {
  activeFilterCount,
  initialStateFromSchema,
  type FilterCounts,
  type FilterPreset,
  type FilterSchema,
  type FilterState,
  type FilterValue,
} from './types';

const PRESET_KEY = (entity: string) => `fn:filters:${entity}:presets`;
const COUNTS_DEBOUNCE_MS = 250;

export interface UseFilterStoreOptions {
  schema: FilterSchema;
  /** When true, every change writes to the URL. Defaults to true. */
  syncUrl?: boolean;
  /**
   * Async function the primitive calls (debounced) whenever state
   * changes. Returns counts for the footer + per-option dimming.
   * Omit to disable the live count footer.
   */
  onCountsRequest?: (state: FilterState) => Promise<FilterCounts>;
}

export interface FilterStore {
  /* Snapshot access (used by useSyncExternalStore). */
  subscribe(listener: () => void): () => void;
  getSnapshot(): FilterState;
  getCounts(): FilterCounts | null;
  subscribeCounts(listener: () => void): () => void;
  /* Dispatch + presets + meta. */
  dispatch(action: FilterAction): void;
  activeCount: number;
  presets: FilterPreset[];
  savePreset(name: string): FilterPreset;
  applyPreset(id: string): void;
  deletePreset(id: string): void;
}

export function useFilterStore(options: UseFilterStoreOptions): FilterStore {
  const { schema, syncUrl = true, onCountsRequest } = options;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /* --- Reducer + state slice (subscribable via store API) ------- */

  const initialState = React.useMemo(() => initialStateFromSchema(schema), [schema]);
  const reducer = React.useMemo(() => makeReducer(schema, initialState), [schema, initialState]);

  const stateRef = React.useRef<FilterState>(initialState);
  const listenersRef = React.useRef<Set<() => void>>(new Set());

  const notify = React.useCallback(() => {
    for (const l of listenersRef.current) l();
  }, []);

  const subscribe = React.useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const getSnapshot = React.useCallback(() => stateRef.current, []);

  /** Decode the initial URL once on mount. */
  const initialDecodeDoneRef = React.useRef(false);
  React.useEffect(() => {
    if (initialDecodeDoneRef.current) return;
    initialDecodeDoneRef.current = true;
    if (!syncUrl || typeof window === 'undefined') return;
    const fromUrl = decodeStateFromUrl(schema, initialState, searchParams);
    if (serializeState(fromUrl) !== serializeState(stateRef.current)) {
      stateRef.current = fromUrl;
      notify();
    }
  }, [syncUrl, schema, initialState, searchParams, notify]);

  /* --- Action dispatch ------------------------------------------ */

  const dispatch = React.useCallback(
    (action: FilterAction) => {
      const next = reducer(stateRef.current, action);
      if (next === stateRef.current) return;
      stateRef.current = next;
      notify();
    },
    [reducer, notify],
  );

  /* --- URL sync ------------------------------------------------- */

  const lastWrittenSigRef = React.useRef<string>(
    typeof window === 'undefined' ? '' : currentUrlSignature(searchParams),
  );

  // Re-decode when external nav changes the URL. Bails out when we
  // recognise the URL signature as the one we just wrote.
  const currentSig = currentUrlSignature(searchParams);
  React.useEffect(() => {
    if (!syncUrl) return;
    if (currentSig === lastWrittenSigRef.current) return;
    const decoded = decodeStateFromUrl(schema, initialState, searchParams);
    if (serializeState(decoded) === serializeState(stateRef.current)) return;
    stateRef.current = decoded;
    notify();
  }, [currentSig, syncUrl, schema, initialState, searchParams, notify]);

  // After every state change, project the canonical form back to URL.
  // Subscribe to our own store via a tick effect.
  const [stateTick, setStateTick] = React.useState(0);
  React.useEffect(() => {
    const unsubscribe = subscribe(() => setStateTick((n) => n + 1));
    return unsubscribe;
  }, [subscribe]);

  React.useEffect(() => {
    if (!syncUrl) return;
    const state = stateRef.current;
    const next = new URLSearchParams(searchParams.toString());
    for (const key of Array.from(next.keys())) {
      if (key.startsWith(URL_PREFIX)) next.delete(key);
    }
    for (const [key, value] of Object.entries(state)) {
      const encoded = encodeValue(value);
      if (encoded !== null) next.set(`${URL_PREFIX}${key}`, encoded);
    }
    const qs = next.toString();
    const target = qs ? `${pathname}?${qs}` : pathname;
    lastWrittenSigRef.current = serializeState(state);
    if (
      typeof window !== 'undefined' &&
      `${window.location.pathname}${window.location.search}` !== target
    ) {
      router.replace(target, { scroll: false });
    }
  }, [stateTick, syncUrl, pathname, router, searchParams]);

  /* --- Counts (debounced) --------------------------------------- */

  const countsRef = React.useRef<FilterCounts | null>(null);
  const countsListenersRef = React.useRef<Set<() => void>>(new Set());
  const subscribeCounts = React.useCallback((listener: () => void) => {
    countsListenersRef.current.add(listener);
    return () => {
      countsListenersRef.current.delete(listener);
    };
  }, []);
  const getCounts = React.useCallback(() => countsRef.current, []);
  const notifyCounts = React.useCallback(() => {
    for (const l of countsListenersRef.current) l();
  }, []);

  React.useEffect(() => {
    if (!onCountsRequest) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      const snap = stateRef.current;
      onCountsRequest(snap)
        .then((counts) => {
          if (cancelled) return;
          countsRef.current = counts;
          notifyCounts();
        })
        .catch(() => {
          /* swallow — the UI degrades gracefully when counts are absent. */
        });
    }, COUNTS_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [stateTick, onCountsRequest, notifyCounts]);

  /* --- Presets -------------------------------------------------- */

  const [presets, setPresets] = React.useState<FilterPreset[]>(() => loadPresets(schema.entity));

  const savePreset = React.useCallback(
    (name: string): FilterPreset => {
      const preset: FilterPreset = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        state: stateRef.current,
        createdAt: new Date().toISOString(),
      };
      const next = [...presets, preset];
      setPresets(next);
      writePresets(schema.entity, next);
      return preset;
    },
    [presets, schema.entity],
  );

  const applyPreset = React.useCallback(
    (id: string) => {
      const preset = presets.find((p) => p.id === id);
      if (!preset) return;
      dispatch({ type: 'SET_ALL', state: { ...initialState, ...preset.state } });
    },
    [presets, dispatch, initialState],
  );

  const deletePreset = React.useCallback(
    (id: string) => {
      const next = presets.filter((p) => p.id !== id);
      setPresets(next);
      writePresets(schema.entity, next);
    },
    [presets, schema.entity],
  );

  /* --- Public store --------------------------------------------- */

  return {
    subscribe,
    getSnapshot,
    getCounts,
    subscribeCounts,
    dispatch,
    activeCount: activeFilterCount(stateRef.current),
    presets,
    savePreset,
    applyPreset,
    deletePreset,
  };
}

function loadPresets(entity: string): FilterPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PRESET_KEY(entity));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as FilterPreset[];
  } catch {
    return [];
  }
}

function writePresets(entity: string, presets: FilterPreset[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PRESET_KEY(entity), JSON.stringify(presets));
  } catch {
    /* localStorage may be unavailable in private windows — silently drop. */
  }
}

/** Public type — re-exported for consumers wiring `onCountsRequest`. */
export type { FilterValue };
