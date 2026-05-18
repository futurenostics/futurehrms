/**
 * Pure reducer for AdvancedFilters state. The primitive uses
 * `useReducer` so each action mutates exactly one slice of the state
 * tree and the React-Memo'd section components only re-render when
 * their own value reference changes (`prev[key] !== next[key]`).
 *
 * Actions are intentionally narrow — every list/picker/range widget
 * ends up emitting one of these three:
 *   • SET_SECTION(key, value)   — replace one section's value wholesale
 *   • CLEAR_SECTION(key)        — reset to the section's empty value
 *   • CLEAR_ALL                 — reset every section
 *   • SET_ALL(state)            — wholesale replace (URL decode, preset apply)
 */

import {
  emptyValueForSection,
  type FilterSchema,
  type FilterSection,
  type FilterState,
  type FilterValue,
} from './types';

export type FilterAction =
  | { type: 'SET_SECTION'; key: string; value: FilterValue }
  | { type: 'CLEAR_SECTION'; key: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'SET_ALL'; state: FilterState };

export function makeReducer(
  schema: FilterSchema,
  initial: FilterState,
): (state: FilterState, action: FilterAction) => FilterState {
  const bySection = new Map<string, FilterSection>(schema.sections.map((s) => [s.key, s]));

  return function reducer(state, action) {
    switch (action.type) {
      case 'SET_SECTION': {
        const prev = state[action.key];
        if (prev && sameValue(prev, action.value)) return state;
        return { ...state, [action.key]: action.value };
      }
      case 'CLEAR_SECTION': {
        const section = bySection.get(action.key);
        if (!section) return state;
        const emptyValue = emptyValueForSection(section);
        const prev = state[action.key];
        if (prev && sameValue(prev, emptyValue)) return state;
        return { ...state, [action.key]: emptyValue };
      }
      case 'CLEAR_ALL':
        return initial;
      case 'SET_ALL':
        return action.state;
    }
  };
}

/** Structural equality between two filter values. */
export function sameValue(a: FilterValue, b: FilterValue): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'multi':
    case 'flags':
      return sameStringArray(a.ids, (b as { ids: string[] }).ids);
    case 'single':
      return a.id === (b as { id: string | null }).id;
    case 'range': {
      const bb = b as { min: number | null; max: number | null };
      return a.min === bb.min && a.max === bb.max;
    }
    case 'date-range': {
      const bb = b as {
        preset: string | null;
        from: string | null;
        to: string | null;
      };
      return a.preset === bb.preset && a.from === bb.from && a.to === bb.to;
    }
  }
}

function sameStringArray(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
