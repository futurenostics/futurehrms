/**
 * URL encoding/decoding for AdvancedFilters state.
 *
 * Every active section lives under a `f.<key>` query param. The
 * encoding is symmetric with the value union:
 *
 *   multi / flags  → comma-joined id list
 *   single         → raw id
 *   range          → "min..max" (either side may be empty)
 *   date-range     → "preset|from..to"
 *
 * Decoding falls back to the section's empty value when a param is
 * malformed so a copy-pasted bad URL never blocks the page.
 */

import {
  emptyValueForSection,
  type FilterSchema,
  type FilterState,
  type FilterValue,
} from './types';

export const URL_PREFIX = 'f.';

export function encodeValue(value: FilterValue): string | null {
  switch (value.kind) {
    case 'multi':
    case 'flags':
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

export function decodeValue(raw: string, fallback: FilterValue): FilterValue {
  try {
    switch (fallback.kind) {
      case 'multi':
      case 'flags':
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

/** Merge URL params into the schema's initial state. */
export function decodeStateFromUrl(
  schema: FilterSchema,
  initial: FilterState,
  params: URLSearchParams,
): FilterState {
  const next: FilterState = { ...initial };
  for (const [key, value] of Array.from(params.entries())) {
    if (!key.startsWith(URL_PREFIX)) continue;
    const sectionKey = key.slice(URL_PREFIX.length);
    const section = schema.sections.find((s) => s.key === sectionKey);
    if (!section) continue;
    next[sectionKey] = decodeValue(value, emptyValueForSection(section));
  }
  return next;
}

/** Canonical encoded signature of the state — used for equality checks. */
export function serializeState(state: FilterState): string {
  const out: string[] = [];
  for (const [k, v] of Object.entries(state)) {
    const encoded = encodeValue(v);
    if (encoded !== null) out.push(`${URL_PREFIX}${k}=${encoded}`);
  }
  return out.sort().join('&');
}

/** Canonical signature of just the `f.*` params currently in the URL. */
export function currentUrlSignature(params: URLSearchParams): string {
  const out: string[] = [];
  for (const [k, v] of Array.from(params.entries())) {
    if (k.startsWith(URL_PREFIX)) out.push(`${k}=${v}`);
  }
  return out.sort().join('&');
}

/**
 * Convert the state into a flat query-params object suitable for the
 * filter-counts endpoint. We use the canonical names declared by the
 * consumer's `toCountsParams` mapping (see `AdvancedFiltersProps`).
 * This codec only owns the `f.*` URL encoding — the counts param
 * names are an API contract owned by the page.
 */
