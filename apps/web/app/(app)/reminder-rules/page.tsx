'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Bell, Plus, Search } from 'lucide-react';
import type { ReferencesResponse } from '@futurenostics/types';
import { AppShell } from '@/components/shell/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  DataTable,
  type DataTableColumn,
  type DataTableRowAction,
} from '@/components/ui/data-table';
import {
  AdvancedFilters,
  AdvancedFiltersRoot,
  AdvancedFiltersTrigger,
  ChipsBar,
  useAdvancedFiltersActiveCount,
  useAdvancedFiltersValue,
  useFilterDispatch,
  type FilterCounts,
  type FilterSchema,
  type FilterState,
} from '@/components/ui/advanced-filters';
import {
  applyReminderRulesFilters,
  buildReminderRulesFilterSchema,
  computeReminderRulesFilterCounts,
} from '@/components/reminders/reminder-rules-filter-schema';
import { SchedulerStatusCard } from '@/components/reminders/scheduler-status-card';
import { ScheduledTimeline } from '@/components/reminders/scheduled-timeline';
import { leadTimeLabel, ruleHue, templateLabel } from '@/components/reminders/rule-visuals';
import { RuleEditorSheet } from '@/components/reminders/rule-editor-sheet';
import { CustomTypesSheet } from '@/components/reminders/custom-types-sheet';
import { countLeaves } from '@/components/reminders/condition-builder';
import {
  useArchiveRule,
  useDraftNewVersion,
  useDuplicateRule,
  useRecipientResolvers,
  useReminderRules,
  useToggleRule,
  useTriggerCounts,
  useTriggerTest,
  type RecipientResolver,
  type ReminderRulePublic,
} from '@/lib/queries/reminders';
import { toast } from 'sonner';
import { useReferences } from '@/lib/queries/employees';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

/**
 * Stable empty-array fallbacks so we don't allocate a new `[]` on
 * every render — keeping the `useMemo` deps stable is what lets the
 * AdvancedFilters store's counts debounce actually settle.
 */
const EMPTY_RULES: ReminderRulePublic[] = [];
const EMPTY_RESOLVERS: RecipientResolver[] = [];

/**
 * Reminder Rules list page — matches PNG 12.
 *
 * Layout (top → bottom):
 *   1. Page header (h1 + subtitle + Duplicate from / + New rule)
 *   2. Dark "Reminder scheduler" status card with Dry run button
 *   3. "Next 30 days · scheduled triggers" timeline strip
 *   4. "Rule library" toolbar — search input + Advanced filters trigger +
 *      chips bar — and the DataTable with the design's 7 columns +
 *      per-row ON/OFF toggle. The AdvancedFilters store owns the filter
 *      state for the drawer, the chips, and the URL; the schema declares
 *      sections (status, trigger type, department, template, recipients,
 *      enabled) and filtering runs client-side against the in-memory rule
 *      list (the rule set is small enough that a server-side
 *      filter-counts endpoint isn't worth the extra surface).
 */
export default function ReminderRulesPage() {
  // Build the schema once we have the references + resolvers + rules.
  // Until those resolve the drawer renders with empty option lists; the
  // store API is happy with that.
  const refs = useReferences();
  const resolversQuery = useRecipientResolvers();
  const rulesQuery = useReminderRules('all');
  // Memoise the empty-fallback so the array identity stays stable
  // across renders before the queries resolve. Without this, every
  // pre-load render returns a fresh `[]` and the dependent `useMemo`s
  // (schema, onCountsRequest) thrash on every render — which in turn
  // forces the AdvancedFilters store to cancel its in-flight counts
  // debounce, so the per-option badges never settle.
  const allRules = rulesQuery.data?.items ?? EMPTY_RULES;
  const resolvers = resolversQuery.data?.items ?? EMPTY_RESOLVERS;

  const schema = React.useMemo(
    () =>
      buildReminderRulesFilterSchema({
        references: refs.data,
        resolvers,
        rules: allRules,
      }),
    [refs.data, resolvers, allRules],
  );

  // Counts handler — runs entirely client-side off the full rule list
  // so the drawer footer total and per-option badges stay accurate as
  // the user toggles selections. Wrapped in a stable callback the store
  // can re-invoke on every dispatch.
  const onCountsRequest = React.useCallback(
    async (state: FilterState): Promise<FilterCounts> =>
      computeReminderRulesFilterCounts(allRules, state, '', schema),
    [allRules, schema],
  );

  return (
    <AdvancedFiltersRoot schema={schema} onCountsRequest={onCountsRequest}>
      <ReminderRulesInner schema={schema} allRules={allRules} rulesQuery={rulesQuery} />
    </AdvancedFiltersRoot>
  );
}

function ReminderRulesInner({
  schema,
  allRules,
  rulesQuery,
}: {
  schema: FilterSchema;
  allRules: ReminderRulePublic[];
  rulesQuery: ReturnType<typeof useReminderRules>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const perms = usePermissions();
  const canCreate = perms.has('reminders:create_rule');
  const canManage = perms.has('reminders:publish_rule');

  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(id);
  }, [search]);

  const filterState = useAdvancedFiltersValue();
  const activeFiltersCount = useAdvancedFiltersActiveCount();
  const dispatch = useFilterDispatch();
  const [filterPanelOpen, setFilterPanelOpen] = React.useState(false);

  const visibleRules = React.useMemo(
    () => applyReminderRulesFilters(allRules, filterState, debouncedSearch),
    [allRules, filterState, debouncedSearch],
  );

  // Editor-sheet state lives in the URL so deep-links (`?sheet=create`,
  // `?sheet=edit&id=...`) work, the browser back button closes the
  // sheet, and the list page stays mounted underneath. Mirrors the
  // Employees pattern in apps/web/app/(app)/employees/page.tsx.
  const [typesSheetOpen, setTypesSheetOpen] = React.useState(false);
  const canManageTypes = perms.has('notifications:manage_types');

  const sheetParam = searchParams.get('sheet');
  const sheetEditId = sheetParam === 'edit' ? searchParams.get('id') : null;
  const sheetMode: 'create' | 'edit' | null =
    sheetParam === 'create' ? 'create' : sheetParam === 'edit' && sheetEditId ? 'edit' : null;

  const openCreate = React.useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.set('sheet', 'create');
    params.delete('id');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  const openEdit = React.useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams);
      params.set('sheet', 'edit');
      params.set('id', id);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const closeSheet = React.useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete('sheet');
    params.delete('id');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  const refs = useReferences();
  const resolversQuery = useRecipientResolvers();
  const countsQuery = useTriggerCounts();
  const toggleRule = useToggleRule();
  const triggerTest = useTriggerTest();
  const duplicateRule = useDuplicateRule();
  const draftNewVersion = useDraftNewVersion();
  // Shared mutation reused across every row's Delete action — the
  // hook's id is passed at mutate() time, not at hook-bind time.
  const archiveRule = useArchiveRule();
  const canDelete = perms.has('reminders:publish_rule');

  const handleDraftNewVersion = React.useCallback(
    async (rule: ReminderRulePublic) => {
      try {
        const created = await draftNewVersion.mutateAsync(rule.id);
        toast.success(`Drafted v${created.version} from v${rule.version}`);
        openEdit(created.id);
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
    [draftNewVersion, openEdit],
  );

  const handleArchive = React.useCallback(
    async (rule: ReminderRulePublic) => {
      const label = rule.status === 'active' ? 'archive this rule' : 'delete this rule';
      if (!confirm(`Are you sure you want to ${label}? It will stop firing immediately.`)) return;
      try {
        await archiveRule.mutateAsync(rule.id);
        toast.success(rule.status === 'active' ? 'Rule archived' : 'Rule deleted');
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
    [archiveRule],
  );

  const handleDuplicate = React.useCallback(
    async (sourceId: string) => {
      try {
        const created = await duplicateRule.mutateAsync(sourceId);
        toast.success(`Duplicated to "${created.key}"`);
        openEdit(created.id);
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
    [duplicateRule, openEdit],
  );

  const departmentsById = React.useMemo(() => {
    const map = new Map<string, ReferencesResponse['departments'][number]>();
    for (const d of refs.data?.departments ?? []) map.set(d.id, d);
    return map;
  }, [refs.data]);

  const resolverLabel = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const r of resolversQuery.data?.items ?? []) m.set(r.key, r.label);
    return m;
  }, [resolversQuery.data]);

  const counts = countsQuery.data ?? {};
  const totalActiveCount = activeFiltersCount + (debouncedSearch ? 1 : 0);

  function clearFilters() {
    setSearch('');
    setDebouncedSearch('');
    dispatch({ type: 'CLEAR_ALL' });
  }

  const columns = React.useMemo<DataTableColumn<ReminderRulePublic>[]>(
    () => [
      {
        id: 'event',
        header: 'Event',
        cell: (rule) => {
          const conditionCount = countLeaves(rule.triggerSpec.conditions ?? null);
          return (
            <div className="gap-fn-2 flex min-w-0 items-center">
              <span
                aria-hidden
                className="h-fn-2 w-fn-2 rounded-fn-full inline-block shrink-0"
                style={{ background: `oklch(0.60 0.16 ${ruleHue(rule.key)})` }}
              />
              <div className="gap-fn-0_5 flex min-w-0 flex-col">
                <span className="gap-fn-1_5 flex min-w-0 items-center">
                  <span className="text-fn-fg font-fn-semibold truncate text-[13px]">
                    {rule.name}
                  </span>
                  {conditionCount > 0 && (
                    <span
                      className="rounded-fn-xs border-fn-accent/30 bg-fn-accent-soft text-fn-accent-soft-fg px-fn-1_5 py-fn-0_5 font-fn-medium inline-flex shrink-0 items-center border text-[10px] uppercase tabular-nums tracking-[0.04em]"
                      title={`${conditionCount} condition${conditionCount === 1 ? '' : 's'}`}
                    >
                      +{conditionCount} cond.
                    </span>
                  )}
                </span>
                <span className="text-fn-fg-faint truncate text-[11px]">
                  {rule.description ?? `v${rule.version}`}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'department',
        header: 'Dept',
        width: 140,
        cell: (rule) => {
          if (!rule.departmentId) {
            return <span className="text-fn-fg-muted text-[12.5px]">All</span>;
          }
          const dept = departmentsById.get(rule.departmentId);
          if (!dept) return <span className="text-fn-fg-muted font-mono text-[11px]">—</span>;
          return <DeptChip name={dept.name} slug={dept.slug} />;
        },
      },
      {
        id: 'lead-time',
        header: 'Lead time',
        width: 110,
        cell: (rule) => {
          const lead = leadTimeLabel({ kind: rule.triggerType });
          return (
            <span
              className={cn(
                'text-[12.5px] tabular-nums',
                lead.direction === 'same' ? 'text-fn-fg-muted' : 'text-fn-fg',
              )}
            >
              {lead.text}
            </span>
          );
        },
      },
      {
        id: 'recipients',
        header: 'Recipients',
        cell: (rule) => {
          // Prefer the new multi-source array. Falls back to the
          // legacy single resolver for older rows.
          const entries =
            rule.recipientResolvers && rule.recipientResolvers.length > 0
              ? rule.recipientResolvers
              : [{ kind: rule.recipientResolver }];
          const first = entries[0];
          const firstLabel = (first && resolverLabel.get(first.kind)) ?? first?.kind ?? '—';
          const extra = entries.length - 1;
          return (
            <span className="text-fn-fg-muted text-[12.5px]">
              {firstLabel}
              {extra > 0 && <span className="text-fn-fg-faint ml-fn-1">+ {extra} more</span>}
            </span>
          );
        },
      },
      {
        id: 'template',
        header: 'Email template',
        width: 200,
        cell: (rule) => (
          <span className="text-fn-fg-faint font-mono text-[11.5px]">
            {templateLabel(rule.notificationType)}
          </span>
        ),
      },
      {
        id: 'triggers',
        header: 'Triggers (30d)',
        width: 110,
        align: 'right',
        cell: (rule) => {
          const n = counts[rule.id] ?? 0;
          return (
            <span
              className={cn(
                'text-[12.5px] tabular-nums',
                n > 0 ? 'text-fn-fg font-fn-semibold' : 'text-fn-fg-faint',
              )}
            >
              {n}
            </span>
          );
        },
      },
      {
        id: 'state',
        header: 'State',
        width: 100,
        cell: (rule) => (
          // Stop the Switch's click from bubbling to the <tr>
          // onRowClick — otherwise toggling state also opens the
          // editor sheet.
          <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
            <Switch
              checked={rule.isEnabled && rule.status === 'active'}
              disabled={rule.status !== 'active' || !canManage || toggleRule.isPending}
              onCheckedChange={(next) => toggleRule.mutate({ id: rule.id, isEnabled: next })}
              aria-label={`${rule.isEnabled ? 'Disable' : 'Enable'} ${rule.name}`}
            />
          </div>
        ),
      },
    ],
    [departmentsById, resolverLabel, counts, canManage, toggleRule],
  );

  const rowActions = React.useCallback(
    (rule: ReminderRulePublic): DataTableRowAction[] => {
      const items: DataTableRowAction[] = [
        { label: 'View rule', onClick: () => openEdit(rule.id) },
      ];
      if (canManage) {
        items.push({
          label: 'Test rule (sends to me)',
          onClick: () => triggerTest.mutate(rule.id),
        });
        items.push({
          label: 'Edit details',
          onClick: () => openEdit(rule.id),
        });
      }
      if (canCreate && rule.status === 'active') {
        items.push({
          label: 'Draft new version',
          onClick: () => handleDraftNewVersion(rule),
        });
      }
      if (canCreate) {
        items.push({
          label: 'Duplicate',
          onClick: () => handleDuplicate(rule.id),
        });
      }
      if (canDelete && rule.status !== 'archived') {
        items.push({
          label: rule.status === 'active' ? 'Archive' : 'Delete',
          variant: 'destructive',
          onClick: () => handleArchive(rule),
        });
      }
      return items;
    },
    [
      openEdit,
      canManage,
      canCreate,
      canDelete,
      triggerTest,
      handleDuplicate,
      handleDraftNewVersion,
      handleArchive,
    ],
  );

  return (
    <AppShell breadcrumbs={[{ label: 'Reminders' }, { label: 'Rules' }]}>
      <div className="gap-fn-5 flex h-full flex-col">
        {/* Header */}
        <div className="gap-fn-3 flex shrink-0 flex-wrap items-end justify-between">
          <div className="gap-fn-1_5 flex flex-col">
            <h1
              className="text-fn-fg font-fn-semibold text-[24px]"
              style={{ letterSpacing: '-0.02em' }}
            >
              Reminder rules
            </h1>
            <p className="text-fn-fg-muted max-w-[640px] text-[14px]">
              Per-department lifecycle reminders. Scheduler runs hourly at the top of the hour in
              Asia/Karachi and dispatches emails through the notifications service.
            </p>
          </div>
          <div className="gap-fn-2 flex items-center">
            {canManageTypes && (
              <Button variant="ghost" size="md" onClick={() => setTypesSheetOpen(true)}>
                <Bell className="h-fn-4 w-fn-4" /> Manage notification types
              </Button>
            )}
            {canCreate && (
              <Button size="md" onClick={openCreate}>
                <Plus className="h-fn-4 w-fn-4" /> New rule
              </Button>
            )}
          </div>
        </div>

        {/* Scheduler status */}
        <SchedulerStatusCard />

        {/* Timeline strip */}
        <ScheduledTimeline />

        {/* Rule library */}
        <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs flex min-h-0 flex-1 flex-col overflow-hidden border">
          {/* Toolbar — search + advanced filters trigger + clear,
              mirrors the Employees toolbar. */}
          <div className="border-fn-divider gap-fn-2_5 px-fn-5 py-fn-3_5 flex shrink-0 flex-wrap items-center border-b">
            <div className="relative w-full max-w-[320px] flex-1">
              <Search className="text-fn-fg-faint left-fn-2_5 h-fn-3_5 w-fn-3_5 pointer-events-none absolute top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search rules by name, key, or template…"
                className="pl-fn-8"
              />
            </div>
            <AdvancedFiltersTrigger onClick={() => setFilterPanelOpen(true)} />
            {(activeFiltersCount > 0 || debouncedSearch) && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-fn-accent-soft-fg font-fn-semibold cursor-pointer text-[12.5px] hover:underline"
              >
                Clear ({totalActiveCount})
              </button>
            )}
            <span className="text-fn-fg-faint ml-auto text-[12px]">
              {visibleRules.length} {visibleRules.length === 1 ? 'rule' : 'rules'}
            </span>
          </div>

          {/* Active-filter chips bar — same primitive employees uses;
              self-hides when no filters are active. */}
          {activeFiltersCount > 0 && (
            <div className="px-fn-5 pt-fn-3">
              <ChipsBar schema={schema} />
            </div>
          )}

          <div className="min-h-0 flex-1">
            <DataTable<ReminderRulePublic>
              chrome="plain"
              columns={columns}
              rows={visibleRules}
              getRowKey={(r) => r.id}
              isLoading={rulesQuery.isPending}
              isError={rulesQuery.isError}
              onRetry={() => rulesQuery.refetch()}
              totalCount={visibleRules.length}
              onRowClick={(r) => openEdit(r.id)}
              rowActions={rowActions}
              emptyState={
                <RulesEmptyState canCreate={canCreate} hasFilters={totalActiveCount > 0} />
              }
            />
          </div>
        </div>
      </div>

      {sheetMode && (
        <RuleEditorSheet
          open
          mode={sheetMode}
          ruleId={sheetMode === 'edit' ? sheetEditId : null}
          onOpenChange={(next) => {
            if (!next) closeSheet();
          }}
        />
      )}

      <CustomTypesSheet open={typesSheetOpen} onOpenChange={setTypesSheetOpen} />

      {/* Advanced Filters drawer — lives at the page level so its open
          state survives toolbar re-renders. */}
      <AdvancedFilters schema={schema} open={filterPanelOpen} onOpenChange={setFilterPanelOpen} />
    </AppShell>
  );
}

function DeptChip({ name, slug }: { name: string; slug: string }) {
  const hue = deptHue(slug);
  return (
    <span
      className="rounded-fn-xs gap-fn-1_5 px-fn-1_5 py-fn-0_5 font-fn-medium inline-flex items-center border text-[11.5px]"
      style={{
        background: `oklch(0.96 0.04 ${hue})`,
        color: `oklch(0.38 0.16 ${hue})`,
        borderColor: `oklch(0.55 0.16 ${hue} / 0.25)`,
      }}
    >
      <span
        aria-hidden
        className="rounded-fn-full h-fn-1_5 w-fn-1_5 inline-block"
        style={{ background: `oklch(0.55 0.16 ${hue})` }}
      />
      {name}
    </span>
  );
}

function deptHue(slug: string): number {
  const known: Record<string, number> = {
    engineering: 280,
    'business-development': 22,
    operations: 145,
    hr: 22,
    finance: 220,
    design: 18,
    leadership: 265,
  };
  if (known[slug] != null) return known[slug]!;
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 360;
}

function RulesEmptyState({ canCreate, hasFilters }: { canCreate: boolean; hasFilters: boolean }) {
  return (
    <div className="gap-fn-3 py-fn-12 flex flex-col items-center text-center">
      <p className="text-fn-fg font-fn-semibold text-[14px]">
        {hasFilters ? 'No rules match your filters' : 'No reminder rules yet'}
      </p>
      <p className="text-fn-fg-muted max-w-[400px] text-[12.5px]">
        {hasFilters
          ? 'Try clearing a filter or adjusting your search.'
          : canCreate
            ? 'Create the first rule to start sending lifecycle reminders. Rules are versioned — editing creates a new version that leaves past schedules intact.'
            : 'Ask HR to set up reminder rules for your team.'}
      </p>
    </div>
  );
}
