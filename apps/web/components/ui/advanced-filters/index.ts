/**
 * AdvancedFilters — generic, schema-driven filter primitive.
 *
 * Composition:
 *
 *   <AdvancedFiltersRoot schema onCountsRequest>
 *     <AdvancedFiltersTrigger onClick={() => setOpen(true)} />
 *     <ChipsBar schema />
 *     <YourPageContent />   // uses useAdvancedFiltersValue() to know what to fetch
 *     <AdvancedFilters open onOpenChange onApply />
 *   </AdvancedFiltersRoot>
 */

export {
  AdvancedFilters,
  AdvancedFiltersRoot,
  AdvancedFiltersTrigger,
  useAdvancedFiltersValue,
  useAdvancedFiltersActiveCount,
} from './advanced-filters';
export { ChipsBar } from './chips-bar';
export {
  useSectionValue,
  useSectionCounts,
  useTotalCount,
  useSectionMeta,
  useFilterDispatch,
} from './context';
export type {
  FilterSchema,
  FilterSection,
  FilterState,
  FilterValue,
  FilterOption,
  FilterPreset,
  FilterCounts,
  CheckboxListSection,
  PillToggleSection,
  RangeWithHistogramSection,
  DateRangeSection,
  DateRangePreset,
  ComboboxSection,
  CheckboxWithSubtextSection,
} from './types';
export { initialStateFromSchema, activeFilterCount, isValueEmpty } from './types';
export { encodeValue, decodeValue, URL_PREFIX } from './url-codec';
