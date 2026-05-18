'use client';

/**
 * Schema builder for the Projects AdvancedFilters drawer — mirror of
 * `employee-filter-schema.ts`. Returns a `FilterSchema` describing the
 * project filter surface so the same generic primitive drives both
 * pages.
 *
 * Sections:
 *   1. Category           — pill toggle (multi)
 *   2. Department         — checkbox list (multi, searchable)
 *   3. Status             — pill toggle (multi, semantic colour)
 *   4. Revenue (USD)      — range with histogram
 *   5. Start date         — date range with presets
 *   6. Assigned to        — combobox (multi)
 *   7. Project flags      — checkbox with subtext (override / locked / notes)
 *   8. Visibility         — checkbox with subtext (include archived)
 */

import * as React from 'react';
import {
  Archive,
  Building2,
  Calendar,
  CircleDot,
  DollarSign,
  Flag,
  Folder,
  UserCog,
} from 'lucide-react';
import type {
  ProjectCategoryPublic,
  ProjectFilterCountsResponse,
  ProjectStatus,
  ReferencesResponse,
} from '@futurenostics/types';
import type { FilterCounts, FilterSchema, FilterSection } from '@/components/ui/advanced-filters';

interface BuildArgs {
  categories: ProjectCategoryPublic[];
  references: ReferencesResponse | undefined;
  assignees: Array<{ id: string; fullName: string }>;
  canSeeArchived: boolean;
}

const STATUS_OPTIONS: Array<{
  id: ProjectStatus;
  label: string;
  tone: 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
}> = [
  { id: 'draft', label: 'Draft', tone: 'default' },
  { id: 'active', label: 'Active', tone: 'info' },
  { id: 'in_billing', label: 'In billing', tone: 'success' },
  { id: 'on_hold', label: 'Payment hold', tone: 'warning' },
  { id: 'completed', label: 'Complete', tone: 'success' },
  { id: 'cancelled', label: 'Cancelled', tone: 'danger' },
  { id: 'refunded', label: 'Refunded', tone: 'danger' },
];

const PROJECT_FLAGS = [
  {
    id: 'hasOverride',
    label: 'Custom commission split',
    description: 'Project overrides the rule defaults',
  },
  {
    id: 'lockedFromCommissions',
    label: 'Locked from commissions',
    description: 'Cancelled or refunded — excluded from runs',
  },
  {
    id: 'hasNotes',
    label: 'Has reviewer notes',
    description: 'Project has a non-empty notes field',
  },
];

const START_DATE_PRESETS = [
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

export function buildProjectFilterSchema({
  categories,
  references,
  assignees,
  canSeeArchived,
}: BuildArgs): FilterSchema {
  const topLevel = categories.filter((c) => !c.parentId && !c.archived);

  const sections: FilterSection[] = [];

  sections.push({
    key: 'category',
    title: 'Category',
    icon: React.createElement(Folder, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'pill-toggle',
    options: topLevel.map((c) => ({
      id: c.id,
      label: c.name,
      tone: 'accent',
    })),
  });

  sections.push({
    key: 'department',
    title: 'Department',
    icon: React.createElement(Building2, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'checkbox-list',
    searchable: true,
    options: (references?.departments ?? []).map((d) => ({
      id: d.id,
      label: d.name,
    })),
  });

  sections.push({
    key: 'status',
    title: 'Status',
    icon: React.createElement(CircleDot, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'pill-toggle',
    options: STATUS_OPTIONS,
  });

  sections.push({
    key: 'revenue',
    title: 'Revenue (USD)',
    icon: React.createElement(DollarSign, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'range-with-histogram',
    bounds: { min: 0, max: 500_000 },
    step: 500,
    unit: '$',
    format: (n) =>
      n >= 1_000_000
        ? `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
        : n >= 1_000
          ? `$${(n / 1_000).toFixed(0)}K`
          : `$${n}`,
  });

  sections.push({
    key: 'startDate',
    title: 'Start date',
    icon: React.createElement(Calendar, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'date-range-with-presets',
    presets: START_DATE_PRESETS,
  });

  sections.push({
    key: 'assignedEmployee',
    title: 'Assigned to',
    icon: React.createElement(UserCog, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'combobox',
    options: assignees.map((a) => ({ id: a.id, label: a.fullName })),
    searchPlaceholder: 'Search employees…',
    emptyLabel: 'employees',
  });

  sections.push({
    key: 'flags',
    title: 'Project flags',
    icon: React.createElement(Flag, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'checkbox-with-subtext',
    options: PROJECT_FLAGS,
  });

  if (canSeeArchived) {
    sections.push({
      key: 'archived',
      title: 'Visibility',
      icon: React.createElement(Archive, { className: 'h-fn-3_5 w-fn-3_5' }),
      type: 'checkbox-with-subtext',
      options: [
        {
          id: 'archived',
          label: 'Include archived projects',
          description: 'Archived projects keep their data + history but are hidden by default.',
        },
      ],
    });
  }

  return {
    entity: 'projects',
    entityNoun: 'projects',
    sections,
  };
}

/** Translate filter-counts API response to the shape AdvancedFilters consumes. */
export function toProjectFilterCounts(api: ProjectFilterCountsResponse): FilterCounts {
  return {
    total: api.total,
    perOption: {
      category: api.byCategory,
      department: api.byDepartment,
      status: api.byStatus,
      flags: {
        hasOverride: api.flags.hasOverride,
        lockedFromCommissions: api.flags.lockedFromCommissions,
        hasNotes: api.flags.hasNotes,
      },
    },
    perSectionMeta: {
      revenue: api.revenue,
    },
  };
}
