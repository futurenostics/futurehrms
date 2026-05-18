'use client';

/**
 * Schema builder for the Employees AdvancedFilters drawer.
 *
 * Returns a `FilterSchema` describing all 11 sections from PNG 199–201
 * (or 9 sections for a viewer without salary / archived access). The
 * options inside each section are populated from the references API +
 * the manager picker query; until those resolve, the section renders
 * with an empty option list and a loading-friendly empty state.
 *
 * Kept out of `page.tsx` because the section list is long and the
 * page already owns the table, KPI strip, toolbar, sheet, etc.
 */

import * as React from 'react';
import {
  Archive,
  Briefcase as BriefcaseIcon,
  CalendarDays,
  CircleDot,
  Clock,
  Building2 as DepartmentIcon,
  FileCheck,
  IdCard,
  UserCog,
  Wallet,
} from 'lucide-react';
import type { EmployeeFilterCountsResponse, ReferencesResponse } from '@futurenostics/types';
import type { FilterSchema, FilterSection, FilterCounts } from '@/components/ui/advanced-filters';

interface BuildArgs {
  references: ReferencesResponse | undefined;
  managers: Array<{ id: string; fullName: string }>;
  canViewSalary: boolean;
  canSeeArchived: boolean;
}

const CONTRACT_OPTIONS = [
  { id: 'FullTime', label: 'Full time' },
  { id: 'PartTime', label: 'Part time' },
  { id: 'Contractor', label: 'Contractor' },
  { id: 'Intern', label: 'Intern' },
];

const COMPENSATION_OPTIONS = [
  {
    id: 'payoneer',
    label: 'Payoneer linked (USD payouts)',
    description: 'Earns commission via Payoneer',
  },
  { id: 'pkrOnly', label: 'PKR salary only', description: 'Monthly payroll only' },
  {
    id: 'processedExternally',
    label: 'Salary processed externally',
    description: 'Outside the in-app payroll loop',
  },
  {
    id: 'eligibleCommissions',
    label: 'Eligible for commissions',
    description: 'Has an active commission rule',
  },
];

const TENURE_OPTIONS = [
  { id: 'lt1', label: 'Less than 1 year' },
  { id: '1to3', label: '1 – 3 years' },
  { id: '3to5', label: '3 – 5 years' },
  { id: '5to10', label: '5 – 10 years' },
  { id: '10plus', label: 'Over 10 years' },
];

const DOCUMENT_OPTIONS = [
  {
    id: 'missingEmergencyContact',
    label: 'Missing emergency contact',
    description: 'No emergency contact on file',
  },
  {
    id: 'missingProbationEndDate',
    label: 'Missing probation end date',
    description: 'Probation duration not set',
  },
  {
    id: 'missingPhoto',
    label: 'Missing profile photo',
    description: 'No avatar uploaded yet',
  },
];

const JOIN_DATE_PRESETS = [
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

export function buildEmployeeFilterSchema({
  references,
  managers,
  canViewSalary,
  canSeeArchived,
}: BuildArgs): FilterSchema {
  const sections: FilterSection[] = [];

  sections.push({
    key: 'department',
    title: 'Department',
    icon: React.createElement(DepartmentIcon, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'checkbox-list',
    searchable: true,
    options: (references?.departments ?? []).map((d) => ({ id: d.id, label: d.name })),
  });

  sections.push({
    key: 'designation',
    title: 'Designation',
    icon: React.createElement(IdCard, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'checkbox-list',
    searchable: true,
    showLimit: 8,
    options: (references?.designations ?? []).map((d) => ({ id: d.id, label: d.name })),
  });

  sections.push({
    key: 'status',
    title: 'Status',
    icon: React.createElement(CircleDot, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'pill-toggle',
    options: (references?.statuses ?? []).map((s) => ({
      id: s.id,
      label: s.name,
      tone: s.slug === 'terminated' ? 'danger' : s.slug === 'on-leave' ? 'warning' : 'accent',
    })),
  });

  sections.push({
    key: 'contract',
    title: 'Contract type',
    icon: React.createElement(BriefcaseIcon, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'pill-toggle',
    options: CONTRACT_OPTIONS,
  });

  if (canViewSalary) {
    sections.push({
      key: 'salary',
      title: 'Monthly salary (PKR)',
      icon: React.createElement(Wallet, { className: 'h-fn-3_5 w-fn-3_5' }),
      type: 'range-with-histogram',
      bounds: { min: 0, max: 2_000_000 },
      step: 5_000,
      unit: 'Rs',
      format: (n) =>
        n >= 1_000_000
          ? `Rs ${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
          : `Rs ${(n / 1_000).toFixed(0)}K`,
    });
  }

  sections.push({
    key: 'joinedAt',
    title: 'Joining date',
    icon: React.createElement(CalendarDays, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'date-range-with-presets',
    presets: JOIN_DATE_PRESETS,
  });

  sections.push({
    key: 'manager',
    title: 'Reports to',
    icon: React.createElement(UserCog, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'combobox',
    options: managers.map((m) => ({ id: m.id, label: m.fullName })),
    searchPlaceholder: 'Search managers…',
    emptyLabel: 'managers',
  });

  if (canViewSalary) {
    sections.push({
      key: 'compensation',
      title: 'Compensation',
      icon: React.createElement(Wallet, { className: 'h-fn-3_5 w-fn-3_5' }),
      type: 'checkbox-with-subtext',
      options: COMPENSATION_OPTIONS,
    });
  }

  sections.push({
    key: 'tenure',
    title: 'Tenure',
    icon: React.createElement(Clock, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'checkbox-list',
    options: TENURE_OPTIONS,
  });

  sections.push({
    key: 'documents',
    title: 'Documents & compliance',
    icon: React.createElement(FileCheck, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'checkbox-with-subtext',
    options: DOCUMENT_OPTIONS,
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
          label: 'Include archived employees',
          description:
            'Archived employees keep their data + history but are hidden from the default list.',
        },
      ],
    });
  }

  return {
    entity: 'employees',
    entityNoun: 'employees',
    sections,
  };
}

/**
 * Translate a filter-counts API response into the `FilterCounts` shape
 * the AdvancedFilters primitive consumes. Mostly identity — we just
 * group per-section keys.
 */
export function toFilterCounts(api: EmployeeFilterCountsResponse): FilterCounts {
  return {
    total: api.total,
    perOption: {
      department: api.byDepartment,
      designation: api.byDesignation,
      status: api.byStatus,
      contract: api.byContract,
      manager: api.byManager,
      tenure: {
        lt1: api.tenure.lt1,
        '1to3': api.tenure.oneToThree,
        '3to5': api.tenure.threeToFive,
        '5to10': api.tenure.fiveToTen,
        '10plus': api.tenure.tenPlus,
      },
      compensation: {
        payoneer: api.compensation.payoneer,
        pkrOnly: api.compensation.pkrOnly,
        processedExternally: api.compensation.processedExternally,
        eligibleCommissions: api.compensation.eligibleCommissions,
      },
      documents: {
        missingEmergencyContact: api.documents.missingEmergencyContact,
        missingProbationEndDate: api.documents.missingProbationEndDate,
        missingPhoto: api.documents.missingPhoto,
      },
    },
    perSectionMeta: {
      salary: api.salary,
    },
  };
}
