'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  activeFilterCount,
  type FilterPreset,
  type FilterState,
  type FilterValue,
} from '@/components/filters/types';

/**
 * useFilterState — central state manager for the Advanced Filters drawer.
 *
 * Responsibilities:
 *   1. Hold the current FilterState (`Record<sectionKey, FilterValue>`).
 *   2. Sync it into the URL via search params so the back button and
 *      copy-paste links work without a server round-trip.
 *   3. Persist named presets to localStorage, scoped by entity.
 *   4. Expose convenience setters (setSection / clearSection /
 *      clearAll) the primitives can call without knowing about URL or
 *      preset storage.
 *
 * Encoding format in the URL:
 *
 *   ?f.<sectionKey>=<encodedValue>
 *
 * where encodedValue is one of:
 *   multi / toggles → comma-joined id list
 *   single          → raw id
 *   range           → "min..max" (either side may be empty)
 *   date-range      → "preset|from..to"
 *
 * Decoding falls back to leaving the section absent (treated as
 * inactive) so a corrupted param never blocks the page.
 */

const URL_PREFIX = 'f.';
const PRESET_STORAGE_KEY = (entity: string) => `fn:filters:${entity}:presets`;

export interface UseFilterStateOptions {
  /** Entity name — used to scope localStorage presets ('employees', 'projects', etc.). */
  entity: string;
  /** Sections and their initial (typically empty) values. */
  initial: FilterState;
  /**
   * When true, every change writes to the URL (back-button friendly).
   * Set false on transient surfaces (eg. inside a sheet) that don't
   * want to pollute history. Defaults to true.
   */
  syncUrl?: boolean;
}

export interface UseFilterStateResult {
  state: FilterState;
  /** Patch one section's value. Pass `undefined` to remove. */
  setSection(key: string, value: FilterValue | undefined): void;
  /** Clear a single section back to its initial (empty) value. */
  clearSection(key: string): void;
  /** Clear every section. */
  clearAll(): void;
  /** Number of sections with active filters. */
  activeCount: number;
  /* Presets */
  presets: FilterPreset[];
  savePreset(name: string): void;
  applyPreset(id: string): void;
  deletePreset(id: string): void;
}

export function useFilterState(options: UseFilterStateOptions): UseFilterStateResult {
  const { entity, initial, syncUrl = true } = options;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Stabilize `initial` across renders. Callers almost always pass an
  // object literal, so without this ref every render would mint a new
  // reference, deps would treat it as a change, and we'd loop.
  // Treat `initial` as a constant — the shape and default values are
  // a design-time contract, not a runtime input.
  const initialRef = React.useRef(initial);

  // Track the encoded f.* signature we most recently wrote to the URL.
  // The decode effect bails when the URL's params already match this —
  // that's the race window between our router.replace() and Next's
  // searchParams re-bind, during which the decode effect would
  // otherwise read the *pre-write* URL, decode it back to the old
  // state, and overwrite the click we just processed.
  const lastWrittenSignatureRef = React.useRef<string>(
    typeof window === 'undefined' ? '' : currentParamsSig(searchParams),
  );

  // Decode from URL on first mount; thereafter the URL is a side-effect.
  const [state, setState] = React.useState<FilterState>(() => {
    if (!syncUrl || typeof window === 'undefined') return initialRef.current;
    return mergeFromUrl(initialRef.current, searchParams);
  });

  // Re-decode when the URL changes externally (back/forward nav). We
  // bail out in two cases:
  //   1. The encoded state already matches the URL (common — both are
  //      in sync after the round-trip settles).
  //   2. The URL's f.* signature equals the one our own write just
  //      pushed (we're inside the propagation race; the URL hasn't
  //      caught up to state yet, but it will in the next render).
  const urlSignature = serializeForUrl(state);
  const currentParamsSignature = currentParamsSig(searchParams);
  React.useEffect(() => {
    if (!syncUrl) return;
    if (urlSignature === currentParamsSignature) return;
    if (currentParamsSignature === lastWrittenSignatureRef.current) return;
    const next = mergeFromUrl(initialRef.current, searchParams);
    setState((prev) => (sameState(prev, next) ? prev : next));
  }, [currentParamsSignature, urlSignature, syncUrl, searchParams]);

  // Write state → URL.
  React.useEffect(() => {
    if (!syncUrl) return;
    const next = new URLSearchParams(searchParams.toString());
    // Drop every f.* param first; we own this namespace.
    for (const key of Array.from(next.keys())) {
      if (key.startsWith(URL_PREFIX)) next.delete(key);
    }
    for (const [key, value] of Object.entries(state)) {
      const encoded = encodeValue(value);
      if (encoded !== null) next.set(`${URL_PREFIX}${key}`, encoded);
    }
    const qs = next.toString();
    const target = qs ? `${pathname}?${qs}` : pathname;
    // Remember what we're about to write so the decode effect can
    // recognise the in-flight value and not regress us back.
    lastWrittenSignatureRef.current = urlSignature;
    if (
      typeof window !== 'undefined' &&
      `${window.location.pathname}${window.location.search}` !== target
    ) {
      router.replace(target, { scroll: false });
    }
  }, [state, pathname, syncUrl, searchParams, router, urlSignature]);

  /* ---------- Setters ---------- */

  const setSection = React.useCallback((key: string, value: FilterValue | undefined) => {
    setState((prev) => {
      const next = { ...prev };
      if (value === undefined) {
        next[key] = initialRef.current[key] ?? { kind: 'multi', ids: [] };
      } else {
        next[key] = value;
      }
      return next;
    });
  }, []);

  const clearSection = React.useCallback((key: string) => {
    setState((prev) => ({
      ...prev,
      [key]: initialRef.current[key] ?? { kind: 'multi', ids: [] },
    }));
  }, []);

  const clearAll = React.useCallback(() => {
    setState(initialRef.current);
  }, []);

  /* ---------- Presets ---------- */

  const [presets, setPresets] = React.useState<FilterPreset[]>(() => loadPresets(entity));

  const savePreset = React.useCallback(
    (name: string) => {
      const preset: FilterPreset = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        state,
        createdAt: new Date().toISOString(),
      };
      const next = [...presets, preset];
      setPresets(next);
      writePresets(entity, next);
    },
    [entity, presets, state],
  );

  const applyPreset = React.useCallback(
    (id: string) => {
      const preset = presets.find((p) => p.id === id);
      if (!preset) return;
      setState({ ...initialRef.current, ...preset.state });
    },
    [presets],
  );

  const deletePreset = React.useCallback(
    (id: string) => {
      const next = presets.filter((p) => p.id !== id);
      setPresets(next);
      writePresets(entity, next);
    },
    [entity, presets],
  );

  return {
    state,
    setSection,
    clearSection,
    clearAll,
    activeCount: activeFilterCount(state),
    presets,
    savePreset,
    applyPreset,
    deletePreset,
  };
}

/* ---------- Encoding / decoding ---------- */

function encodeValue(value: FilterValue): string | null {
  switch (value.kind) {
    case 'multi':
    case 'toggles':
      return value.ids.length === 0 ? null : value.ids.join(',');
    case 'single':
      return value.id ? value.id : null;
    case 'range': {
      if (value.min === null && value.max === null) return null;
      return `${value.min ?? ''}..${value.max ?? ''}`;
    }
    case 'date-range': {
      if (!value.preset && !value.from && !value.to) return null;
      return `${value.preset ?? ''}|${value.from ?? ''}..${value.to ?? ''}`;
    }
  }
}

function decodeValue(raw: string, fallback: FilterValue): FilterValue {
  try {
    switch (fallback.kind) {
      case 'multi':
      case 'toggles':
        return { kind: fallback.kind, ids: raw.split(',').filter(Boolean) };
      case 'single':
        return { kind: 'single', id: raw || null };
      case 'range': {
        const [minRaw, maxRaw] = raw.split('..');
        return {
          kind: 'range',
          min: minRaw ? Number(minRaw) : null,
          max: maxRaw ? Number(maxRaw) : null,
        };
      }
      case 'date-range': {
        const [presetPart, rangePart = ''] = raw.split('|');
        const [from, to] = rangePart.split('..');
        return {
          kind: 'date-range',
          preset: presetPart || null,
          from: from || null,
          to: to || null,
        };
      }
    }
  } catch {
    return fallback;
  }
}

function mergeFromUrl(initial: FilterState, params: URLSearchParams): FilterState {
  const next: FilterState = { ...initial };
  for (const [key, value] of Array.from(params.entries())) {
    if (!key.startsWith(URL_PREFIX)) continue;
    const sectionKey = key.slice(URL_PREFIX.length);
    const fallback = initial[sectionKey];
    if (!fallback) continue;
    next[sectionKey] = decodeValue(value, fallback);
  }
  return next;
}

function serializeForUrl(state: FilterState): string {
  const out: string[] = [];
  for (const [k, v] of Object.entries(state)) {
    const encoded = encodeValue(v);
    if (encoded !== null) out.push(`${URL_PREFIX}${k}=${encoded}`);
  }
  return out.sort().join('&');
}

function currentParamsSig(params: URLSearchParams): string {
  const out: string[] = [];
  for (const [k, v] of Array.from(params.entries())) {
    if (k.startsWith(URL_PREFIX)) out.push(`${k}=${v}`);
  }
  return out.sort().join('&');
}

/**
 * Cheap state equality — compares the canonical encoded form of two
 * states. Used to prevent the URL-decode effect from triggering
 * needless setState calls when the decoded state matches what we
 * already hold (the common path after our own URL write).
 */
function sameState(a: FilterState, b: FilterState): boolean {
  return serializeForUrl(a) === serializeForUrl(b);
}

/* ---------- localStorage presets ---------- */

function loadPresets(entity: string): FilterPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PRESET_STORAGE_KEY(entity));
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
    window.localStorage.setItem(PRESET_STORAGE_KEY(entity), JSON.stringify(presets));
  } catch {
    /* localStorage may be unavailable (private window etc.) — silently drop. */
  }
}
