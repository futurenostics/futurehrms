/**
 * Shared types for the Advanced Filters system.
 *
 * Visual reference: docs/design/screens/advance-filter/ (PNGs 199–202).
 *
 * Architecture: the filter primitives are compositional + presentation-only.
 * The page picks the sections it needs, supplies option lists, and wires
 * them to a single FilterState record managed by `useFilterState`.
 *
 * Encoding: each FilterValue is a discriminated union so the URL writer
 * + preset persistence can serialize/deserialize without per-section
 * special-casing. Adding a new value kind = add a variant + an encoder
 * branch in `use-filter-state.ts`.
 */

export type FilterValue =
  | { kind: 'multi'; ids: string[] }
  | { kind: 'single'; id: string | null }
  | { kind: 'range'; min: number | null; max: number | null }
  | {
      kind: 'date-range';
      /** Preset key (e.g. 'last-30d', 'this-year'); `null` when custom. */
      preset: string | null;
      /** ISO date string YYYY-MM-DD. */
      from: string | null;
      to: string | null;
    }
  | { kind: 'toggles'; ids: string[] };

export type FilterState = Record<string, FilterValue>;

/** A single saved preset. Persisted to localStorage per (entity, user). */
export interface FilterPreset {
  id: string;
  name: string;
  state: FilterState;
  createdAt: string;
}

/* ---------- Helpers ---------- */

export function isFilterActive(value: FilterValue | undefined): boolean {
  if (!value) return false;
  switch (value.kind) {
    case 'multi':
      return value.ids.length > 0;
    case 'single':
      return value.id !== null && value.id !== '';
    case 'range':
      return value.min !== null || value.max !== null;
    case 'date-range':
      return value.preset !== null || value.from !== null || value.to !== null;
    case 'toggles':
      return value.ids.length > 0;
  }
}

export function activeFilterCount(state: FilterState): number {
  let n = 0;
  for (const v of Object.values(state)) {
    if (isFilterActive(v)) n += 1;
  }
  return n;
}

/** Returns the number of selected items inside a section, for the badge. */
export function sectionItemCount(value: FilterValue | undefined): number {
  if (!value) return 0;
  switch (value.kind) {
    case 'multi':
    case 'toggles':
      return value.ids.length;
    case 'single':
      return value.id ? 1 : 0;
    case 'range':
      return (value.min !== null ? 1 : 0) + (value.max !== null ? 1 : 0);
    case 'date-range':
      return value.preset || value.from || value.to ? 1 : 0;
  }
}

/* ---------- Section descriptors (used by FilterChipsBar) ---------- */

export interface SectionDescriptor {
  key: string;
  label: string;
  /**
   * Render the active state of this section into a single chip text.
   * Returns null when not active (chips bar skips it).
   */
  renderChip(value: FilterValue | undefined): string | null;
}
