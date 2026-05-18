/**
 * Advanced Filters primitives.
 *
 * Visual reference: docs/design/screens/advance-filter/ (PNGs 199–202).
 * Locked in CLAUDE.md → § Filters.
 *
 * Usage shape:
 *
 *   const filters = useFilterState({
 *     entity: 'employees',
 *     initial: {
 *       department: { kind: 'multi', ids: [] },
 *       status:     { kind: 'multi', ids: [] },
 *       salary:     { kind: 'range', min: null, max: null },
 *     },
 *   });
 *
 *   <FilterPanelTrigger onClick={() => setOpen(true)} activeCount={filters.activeCount} />
 *
 *   <FilterPanel open={open} onOpenChange={setOpen} ...>
 *     <FilterSection title="Department" icon={<Building />} count={...}>
 *       <FilterMultiSelect options={...} values={...} onValuesChange={...} />
 *     </FilterSection>
 *     ...
 *   </FilterPanel>
 *
 *   <FilterChipsBar state={filters.state} sections={chipSections}
 *                   onClearSection={filters.clearSection}
 *                   onClearAll={filters.clearAll} />
 */
export * from './types';
export * from './filter-panel';
export * from './filter-section';
export * from './filter-multi-select';
export * from './filter-searchable-list';
export * from './filter-pill-group';
export * from './filter-range-slider';
export * from './filter-date-range';
export * from './filter-toggle-list';
export * from './filter-chips-bar';
export * from './filter-presets-bar';
