/**
 * AdvancedFilters — generic, schema-driven filter primitive.
 *
 * Consumers describe their filter surface as a `FilterSchema<TState>`:
 * the section keys, what kind of widget each one renders, the title /
 * icon, and the section-specific data (options, bounds, presets, …).
 * The primitive owns the rest — state, URL sync, presets, counts API
 * integration, the drawer chrome, the chips bar, the footer.
 *
 * Why a discriminated union over a generic 'children' prop:
 *   • A page describes its filters declaratively in one place.
 *   • The primitive can deserialize URL params per section type.
 *   • The primitive can memoize each section independently — a click in
 *     the Department list never re-renders the salary histogram.
 *   • Future section types (e.g. async-search-multi) plug in without
 *     pages having to rewire their state plumbing.
 *
 * Value shape mirrors the section type:
 *   checkbox-list      → multi    {kind:'multi', ids:string[]}
 *   pill-toggle        → multi    (single-select uses {ids:[id]})
 *   range-with-histogram → range  {kind:'range', min, max}
 *   date-range         → date-range
 *   combobox           → multi
 *   checkbox-with-subtext → flags (semantically distinct from 'multi'
 *                                  to keep the URL key stable across
 *                                  enum renames; rendered identically)
 */

import type * as React from 'react';

/* ---------- Section value union ---------- */

export type FilterValue =
  | { kind: 'multi'; ids: string[] }
  | { kind: 'single'; id: string | null }
  | { kind: 'range'; min: number | null; max: number | null }
  | { kind: 'date-range'; preset: string | null; from: string | null; to: string | null }
  | { kind: 'flags'; ids: string[] };

export type FilterState = Record<string, FilterValue>;

/* ---------- Section schemas (discriminated by `type`) ---------- */

export interface FilterOption {
  id: string;
  label: string;
  /** Secondary description line ("32 employees · earns commission"). */
  description?: string;
  icon?: React.ReactNode;
  /** Trailing count badge — typically the count for this option under the current filter state. */
  count?: number;
  /** Disable + dim the option (e.g. zero results when other filters are applied). */
  disabled?: boolean;
  /** Semantic colour tone for pill-toggle sections. */
  tone?: 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
  /**
   * Hue (0–360) for an OKLCH-derived colored dot rendered before the
   * label in checkbox-list sections. Used to distinguish departments
   * by colour in the Department filter.
   */
  hue?: number;
}

interface BaseSection {
  /** Unique section key — used in URL params and in `state[key]`. */
  key: string;
  title: string;
  icon?: React.ReactNode;
}

export interface CheckboxListSection extends BaseSection {
  type: 'checkbox-list';
  options: FilterOption[];
  /** Show a search input above the list. */
  searchable?: boolean;
  /** Collapse past N options behind "Show all". */
  showLimit?: number;
}

export interface PillToggleSection extends BaseSection {
  type: 'pill-toggle';
  options: FilterOption[];
  /** Single-pick toggles. Default is multi. */
  single?: boolean;
}

export interface RangeWithHistogramSection extends BaseSection {
  type: 'range-with-histogram';
  bounds: { min: number; max: number };
  /** Raw bucket counts. Length defines the histogram bar count. */
  histogram?: number[];
  /** Step granularity for keyboard arrow keys + manual input. Defaults to 1. */
  step?: number;
  /** Prefix shown next to inputs ("PKR ", "$ "). Optional. */
  unit?: string;
  /** Display formatter for the slider edge labels and footer summary. */
  format?: (n: number) => string;
}

export interface DateRangePreset {
  id: string;
  label: string;
  /** Computed at click time so "last 30 days" stays accurate. */
  range: () => { from: string; to: string };
}

export interface DateRangeSection extends BaseSection {
  type: 'date-range-with-presets';
  presets: DateRangePreset[];
}

export interface ComboboxSection extends BaseSection {
  type: 'combobox';
  options: FilterOption[];
  emptyLabel?: string;
  searchPlaceholder?: string;
}

export interface CheckboxWithSubtextSection extends BaseSection {
  type: 'checkbox-with-subtext';
  options: FilterOption[];
}

export type FilterSection =
  | CheckboxListSection
  | PillToggleSection
  | RangeWithHistogramSection
  | DateRangeSection
  | ComboboxSection
  | CheckboxWithSubtextSection;

/* ---------- Schema ---------- */

export interface FilterSchema {
  /** Entity scope — used for localStorage preset keys and `<entity> match` copy. */
  entity: string;
  /** Pluralised noun used in the footer ("employees", "projects"). */
  entityNoun: string;
  sections: FilterSection[];
}

/* ---------- Saved presets ---------- */

export interface FilterPreset {
  id: string;
  name: string;
  state: FilterState;
  createdAt: string;
}

/* ---------- Counts (response from the `onCountsRequest` callback) ---------- */

export interface FilterCounts {
  /** Matched total under the current filter state. */
  total: number;
  /** Per-section, per-option counts. `counts[sectionKey][optionId] === n`. */
  perOption: Record<string, Record<string, number>>;
  /** Per-section additional payload — histogram buckets, bounds, etc. */
  perSectionMeta?: Record<string, unknown>;
}

/* ---------- Helpers ---------- */

/**
 * Initial state derived from the schema — every section starts cleared.
 * Pure; safe to call inside `useMemo` or as a `useReducer` initializer.
 */
export function initialStateFromSchema(schema: FilterSchema): FilterState {
  const out: FilterState = {};
  for (const section of schema.sections) {
    out[section.key] = emptyValueForSection(section);
  }
  return out;
}

export function emptyValueForSection(section: FilterSection): FilterValue {
  switch (section.type) {
    case 'checkbox-list':
    case 'combobox':
      return { kind: 'multi', ids: [] };
    case 'pill-toggle':
      return section.single ? { kind: 'single', id: null } : { kind: 'multi', ids: [] };
    case 'range-with-histogram':
      return { kind: 'range', min: null, max: null };
    case 'date-range-with-presets':
      return { kind: 'date-range', preset: null, from: null, to: null };
    case 'checkbox-with-subtext':
      return { kind: 'flags', ids: [] };
  }
}

/** Is this section's value the empty (cleared) value? */
export function isValueEmpty(value: FilterValue): boolean {
  switch (value.kind) {
    case 'multi':
    case 'flags':
      return value.ids.length === 0;
    case 'single':
      return value.id === null;
    case 'range':
      return value.min === null && value.max === null;
    case 'date-range':
      return !value.preset && !value.from && !value.to;
  }
}

/** Number of sections with at least one active filter. */
export function activeFilterCount(state: FilterState): number {
  let n = 0;
  for (const v of Object.values(state)) if (!isValueEmpty(v)) n++;
  return n;
}
