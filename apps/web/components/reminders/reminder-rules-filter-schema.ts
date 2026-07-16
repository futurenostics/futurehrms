'use client';

/**
 * Schema builder for the Reminder Rules AdvancedFilters drawer.
 *
 * Mirrors the pattern in employee-filter-schema.ts — declarative section
 * list + a pure filter applier + a counts computer — except all
 * filtering is done client-side against the in-memory rule list. The
 * rule set is small (dozens, not thousands), so the round-trip to a
 * server-side filter-counts endpoint isn't worth the extra surface.
 */

import * as React from 'react';
import {
  Bell,
  CircleDot,
  Building2 as DepartmentIcon,
  Power,
  Users as RecipientsIcon,
  Zap,
} from 'lucide-react';
import type { ReferencesResponse } from '@futurenostics/types';
import type {
  FilterCounts,
  FilterSchema,
  FilterSection,
  FilterState,
} from '@/components/ui/advanced-filters';
import type { RecipientResolver, ReminderRulePublic } from '@/lib/queries/reminders';
import { templateLabel } from './rule-visuals';

interface BuildArgs {
  references: ReferencesResponse | undefined;
  resolvers: RecipientResolver[];
  rules: ReminderRulePublic[];
}

const STATUS_OPTIONS = [
  { id: 'draft', label: 'Draft', tone: 'default' as const },
  { id: 'active', label: 'Active', tone: 'accent' as const },
  { id: 'archived', label: 'Archived', tone: 'danger' as const },
];

const TRIGGER_TYPE_OPTIONS = [
  { id: 'event', label: 'Event' },
  { id: 'cron', label: 'Scheduled' },
];

const ENABLED_OPTIONS = [
  { id: 'enabled', label: 'Enabled', tone: 'success' as const },
  { id: 'disabled', label: 'Disabled', tone: 'default' as const },
];

/** Sentinel id for "rules that apply to every department" (departmentId === null). */
const ALL_DEPTS_ID = '__all__';

/**
 * Deterministic OKLCH hue per department slug — drives the colored dot
 * in the Department checkbox list. Same hue table the rule table chips
 * use so the two stay in sync.
 */
const DEPT_HUES: Record<string, number> = {
  engineering: 280,
  'business-development': 22,
  operations: 145,
  'people-culture': 165,
  hr: 22,
  finance: 220,
  design: 18,
  leadership: 265,
};
function deptHue(slug: string): number {
  if (DEPT_HUES[slug] != null) return DEPT_HUES[slug]!;
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 360;
}

export function buildReminderRulesFilterSchema({
  references,
  resolvers,
  rules,
}: BuildArgs): FilterSchema {
  const sections: FilterSection[] = [];

  sections.push({
    key: 'status',
    title: 'Status',
    icon: React.createElement(CircleDot, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'pill-toggle',
    options: STATUS_OPTIONS,
  });

  sections.push({
    key: 'triggerType',
    title: 'Trigger',
    icon: React.createElement(Zap, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'pill-toggle',
    options: TRIGGER_TYPE_OPTIONS,
  });

  const departmentOptions = [
    { id: ALL_DEPTS_ID, label: 'All departments (no scope)' },
    ...(references?.departments ?? []).map((d) => ({
      id: d.id,
      label: d.name,
      hue: deptHue(d.slug),
    })),
  ];
  sections.push({
    key: 'department',
    title: 'Department scope',
    icon: React.createElement(DepartmentIcon, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'checkbox-list',
    searchable: false,
    options: departmentOptions,
  });

  // Notification types are derived from the rules themselves — there's
  // no separate "all types" endpoint, and custom types added by HR
  // appear here as soon as the first rule uses them.
  const typeSet = new Set<string>();
  for (const r of rules) typeSet.add(r.notificationType);
  const notificationTypeOptions = Array.from(typeSet)
    .sort()
    .map((t) => ({ id: t, label: templateLabel(t) }));
  sections.push({
    key: 'notificationType',
    title: 'Email template',
    icon: React.createElement(Bell, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'checkbox-list',
    searchable: true,
    showLimit: 8,
    options: notificationTypeOptions,
  });

  sections.push({
    key: 'resolver',
    title: 'Recipients',
    icon: React.createElement(RecipientsIcon, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'checkbox-list',
    searchable: true,
    showLimit: 8,
    options: resolvers.map((r) => ({ id: r.key, label: r.label })),
  });

  sections.push({
    key: 'enabled',
    title: 'Enabled',
    icon: React.createElement(Power, { className: 'h-fn-3_5 w-fn-3_5' }),
    type: 'pill-toggle',
    options: ENABLED_OPTIONS,
  });

  return {
    entity: 'reminder-rules',
    entityNoun: 'rules',
    sections,
  };
}

/* ----------------------------- Predicates ----------------------------- */
/**
 * Per-section predicates. Each returns `true` when the rule matches
 * that section's current selection (or no selection is active). Kept
 * as separate functions so the counts computer can apply "all other
 * sections" while excluding one — i.e. proper facet counts.
 */

type SectionPredicate = (rule: ReminderRulePublic) => boolean;

function buildPredicates(state: FilterState): Record<string, SectionPredicate> {
  return {
    status: (rule) => {
      const v = state.status;
      if (!v || v.kind !== 'multi' || v.ids.length === 0) return true;
      return v.ids.includes(rule.status);
    },
    triggerType: (rule) => {
      const v = state.triggerType;
      if (!v || v.kind !== 'multi' || v.ids.length === 0) return true;
      return v.ids.includes(rule.triggerType);
    },
    department: (rule) => {
      const v = state.department;
      if (!v || v.kind !== 'multi' || v.ids.length === 0) return true;
      if (rule.departmentId === null) return v.ids.includes(ALL_DEPTS_ID);
      return v.ids.includes(rule.departmentId);
    },
    notificationType: (rule) => {
      const v = state.notificationType;
      if (!v || v.kind !== 'multi' || v.ids.length === 0) return true;
      return v.ids.includes(rule.notificationType);
    },
    resolver: (rule) => {
      const v = state.resolver;
      if (!v || v.kind !== 'multi' || v.ids.length === 0) return true;
      const entries =
        rule.recipientResolvers && rule.recipientResolvers.length > 0
          ? rule.recipientResolvers.map((e) => e.kind)
          : [rule.recipientResolver];
      return entries.some((k) => v.ids.includes(k));
    },
    enabled: (rule) => {
      const v = state.enabled;
      if (!v || v.kind !== 'multi' || v.ids.length === 0) return true;
      const isOn = rule.isEnabled && rule.status === 'active';
      if (v.ids.includes('enabled') && isOn) return true;
      if (v.ids.includes('disabled') && !isOn) return true;
      return false;
    },
  };
}

/** Match a rule's free-text search across name, key, description, and template. */
function matchesSearch(rule: ReminderRulePublic, search: string): boolean {
  if (!search) return true;
  const q = search.toLowerCase();
  return (
    rule.name.toLowerCase().includes(q) ||
    rule.key.toLowerCase().includes(q) ||
    (rule.description ?? '').toLowerCase().includes(q) ||
    rule.notificationType.toLowerCase().includes(q)
  );
}

/**
 * Apply the current AdvancedFilters state + free-text search to the
 * full rule list. Pure — safe to call inside `useMemo`.
 */
export function applyReminderRulesFilters(
  rules: ReminderRulePublic[],
  state: FilterState,
  search: string,
): ReminderRulePublic[] {
  const preds = buildPredicates(state);
  return rules.filter(
    (r) =>
      matchesSearch(r, search) &&
      preds.status(r) &&
      preds.triggerType(r) &&
      preds.department(r) &&
      preds.notificationType(r) &&
      preds.resolver(r) &&
      preds.enabled(r),
  );
}

/**
 * Compute facet counts for the AdvancedFilters drawer footer + per-option
 * badges. For each section, the count under option X = the number of
 * rules that match every OTHER section's filter plus X — the standard
 * facet pattern that lets the drawer dim impossible combinations
 * without removing them.
 */
export function computeReminderRulesFilterCounts(
  rules: ReminderRulePublic[],
  state: FilterState,
  search: string,
  schema: FilterSchema,
): FilterCounts {
  const preds = buildPredicates(state);
  const searched = rules.filter((r) => matchesSearch(r, search));

  const perOption: Record<string, Record<string, number>> = {};

  for (const section of schema.sections) {
    const others = Object.entries(preds)
      .filter(([k]) => k !== section.key)
      .map(([, fn]) => fn);
    const passingOthers = searched.filter((r) => others.every((fn) => fn(r)));

    const counts: Record<string, number> = {};
    if (section.type !== 'pill-toggle' && section.type !== 'checkbox-list') {
      perOption[section.key] = counts;
      continue;
    }
    for (const opt of section.options) {
      counts[opt.id] = passingOthers.filter((rule) =>
        ruleMatchesOption(rule, section.key, opt.id),
      ).length;
    }
    perOption[section.key] = counts;
  }

  const total = applyReminderRulesFilters(rules, state, search).length;
  return { total, perOption };
}

function ruleMatchesOption(
  rule: ReminderRulePublic,
  sectionKey: string,
  optionId: string,
): boolean {
  switch (sectionKey) {
    case 'status':
      return rule.status === optionId;
    case 'triggerType':
      return rule.triggerType === optionId;
    case 'department':
      if (optionId === ALL_DEPTS_ID) return rule.departmentId === null;
      return rule.departmentId === optionId;
    case 'notificationType':
      return rule.notificationType === optionId;
    case 'resolver': {
      const entries =
        rule.recipientResolvers && rule.recipientResolvers.length > 0
          ? rule.recipientResolvers.map((e) => e.kind)
          : [rule.recipientResolver];
      return entries.includes(optionId);
    }
    case 'enabled': {
      const isOn = rule.isEnabled && rule.status === 'active';
      return (optionId === 'enabled' && isOn) || (optionId === 'disabled' && !isOn);
    }
    default:
      return false;
  }
}
