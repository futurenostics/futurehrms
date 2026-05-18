'use client';

/**
 * Schema builder for the Commission Rules AdvancedFilters drawer —
 * mirror of `employee-filter-schema.ts` + `project-filter-schema.ts`.
 *
 * Sections:
 *   1. Department         — checkbox list (multi)
 *   2. Category           — checkbox list (multi, searchable)
 *   3. Status             — pill toggle (multi, semantic colour)
 *   4. Pool mode          — pill toggle (multi)
 *   5. Pool value         — range with histogram
 *   6. Effective from     — date range with presets
 *   7. Visibility flags   — checkbox with subtext (Active rules only)
 */

import * as React from 'react';
import { Building2, CalendarRange, CircleDot, Eye, Folder, Percent, Scale } from 'lucide-react';
import type {
  CommissionRuleFilterCountsResponse,
  ProjectCategoryPublic,
  ReferencesResponse,
} from '@futurenostics/types';
import type { FilterCounts, FilterSchema, FilterSection } from '@/components/ui/advanced-filters';

interface BuildArgs {
  references: ReferencesResponse | undefined;
  categories: ProjectCategoryPublic[];
}

const STATUS_OPTIONS = [
  { id: 'active', label: 'Active', tone: 'success' as const },
  { id: 'draft', label: 'Draft', tone: 'default' as const },
  { id: 'pending', label: 'Pending', tone: 'warning' as const },
  { id: 'archived', label: 'Archived', tone: 'default' as const },
];

const POOL_MODE_OPTIONS = [
  { id: 'percentage', label: 'Percentage', tone: 'accent' as const },
  { id: 'fixed', label: 'Fixed amount', tone: 'info' as const },
];

const EFFECTIVE_FROM_PRESETS = [
  {
    id: 'last30',
    label: 'Last 30 days',
    range: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - 30);
      return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
    },
  },
  {
    id: 'last90',
    label: 'Last 90 days',
    range: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - 90);
      return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
    },
  },
  {
    id: 'thisYear',
    label: 'This year',
    range: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), 0, 1);
      return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
    },
  },
  {
    id: 'lastYear',
    label: 'Last year',
    range: () => {
      const now = new Date();
      const from = new Date(now.getFullYear() - 1, 0, 1);
      const to = new Date(now.getFullYear() - 1, 11, 31);
      return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
    },
  },
];

export function buildCommissionRuleFilterSchema({
  references,
  categories,
}: BuildArgs): FilterSchema {
  const sections: FilterSection[] = [];

  // Department list: real departments from references, plus the
  // synthetic '*' "Org-wide" entry that the API treats as a fallback
  // rule (see docs/DECISIONS.md § Phase 2).
  const departmentOptions = [
    { id: '*', label: 'Org-wide (fallback)' },
    ...(references?.departments ?? []).map((d) => ({ id: d.slug, label: d.name })),
  ];

  sections.push({
    key: 'department',
    title: 'Department',
    icon: React.createElement(Building2, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'checkbox-list',
    options: departmentOptions,
  });

  sections.push({
    key: 'category',
    title: 'Category',
    icon: React.createElement(Folder, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'checkbox-list',
    searchable: true,
    showLimit: 8,
    options: categories.filter((c) => !c.archived).map((c) => ({ id: c.id, label: c.name })),
  });

  sections.push({
    key: 'status',
    title: 'Status',
    icon: React.createElement(CircleDot, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'pill-toggle',
    options: STATUS_OPTIONS,
  });

  sections.push({
    key: 'poolMode',
    title: 'Pool mode',
    icon: React.createElement(Scale, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'pill-toggle',
    options: POOL_MODE_OPTIONS,
  });

  sections.push({
    key: 'poolValue',
    title: 'Pool value',
    icon: React.createElement(Percent, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'range-with-histogram',
    // Both 0–100 (percentage) and 0–500,000 (fixed) live in the same
    // column. We bound to a sensible default; the histogram from the
    // counts endpoint refines the visible range live.
    bounds: { min: 0, max: 100 },
    step: 1,
    unit: '',
    format: (n) => (n >= 1000 ? n.toLocaleString() : String(n)),
  });

  sections.push({
    key: 'effectiveFrom',
    title: 'Effective from',
    icon: React.createElement(CalendarRange, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'date-range-with-presets',
    presets: EFFECTIVE_FROM_PRESETS,
  });

  sections.push({
    key: 'visibility',
    title: 'Visibility',
    icon: React.createElement(Eye, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'checkbox-with-subtext',
    options: [
      {
        id: 'activeOnly',
        label: 'Currently active only',
        description: 'Hide draft / pending / archived versions',
      },
    ],
  });

  return {
    entity: 'commission-rules',
    entityNoun: 'rules',
    sections,
  };
}

/** Translate filter-counts API response to the AdvancedFilters shape. */
export function toCommissionRuleFilterCounts(
  api: CommissionRuleFilterCountsResponse,
): FilterCounts {
  return {
    total: api.total,
    perOption: {
      department: api.byDepartment,
      category: api.byCategory,
      status: api.byStatus,
      poolMode: api.byPoolMode,
    },
    perSectionMeta: {
      poolValue: api.poolValue,
    },
  };
}
