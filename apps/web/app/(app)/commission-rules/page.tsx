'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, History, Plus, Scale, Search, Sparkles } from 'lucide-react';
import type { CommissionRulePublic, ProjectCategoryPublic } from '@futurenostics/types';
import { AppShell } from '@/components/shell/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  type FilterState,
} from '@/components/ui/advanced-filters';
import {
  buildCommissionRuleFilterSchema,
  toCommissionRuleFilterCounts,
} from '@/components/commission-rules/commission-rule-filter-schema';
import { CommissionRuleEditorSheet } from '@/components/commission-rules/rule-editor-sheet';
import {
  fetchCommissionRuleFilterCounts,
  useCommissionRulesList,
  type CommissionRuleFilterCountsParams,
} from '@/lib/queries/commission-rules';
import { useReferences } from '@/lib/queries/employees';
import { useProjectCategories } from '@/lib/queries/projects';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

/**
 * Translate the AdvancedFilters state into the params both
 * `/commission-rules` and `/commission-rules/filter-counts` accept.
 * Single source of truth — table and counts footer always agree.
 */
function stateToRuleFilterParams(state: FilterState): CommissionRuleFilterCountsParams {
  const params: CommissionRuleFilterCountsParams = {};
  for (const [k, v] of Object.entries(state)) {
    switch (k) {
      case 'department':
        if (v.kind === 'multi') params.departments = v.ids;
        break;
      case 'category':
        if (v.kind === 'multi') params.categoryIds = v.ids;
        break;
      case 'status':
        if (v.kind === 'multi') params.statuses = v.ids;
        break;
      case 'poolMode':
        if (v.kind === 'multi') params.poolModes = v.ids;
        break;
      case 'poolValue':
        if (v.kind === 'range') {
          if (v.min !== null) params.poolValueMin = v.min;
          if (v.max !== null) params.poolValueMax = v.max;
        }
        break;
      case 'effectiveFrom':
        if (v.kind === 'date-range') {
          if (v.from) params.effectiveFromStart = v.from;
          if (v.to) params.effectiveFromEnd = v.to;
        }
        break;
      case 'visibility':
        if (v.kind === 'flags') params.activeOnly = v.ids.includes('activeOnly');
        break;
    }
  }
  return params;
}

/**
 * Commission Rules list page — matches PNG 11.
 *
 * Layout follows the Employees / Projects standard: page header,
 * three KPI cards, table card with toolbar (search · AdvancedFilters
 * trigger · Clear), chips bar, DataTable. The drawer offers Department
 * · Category · Status · Pool mode · Pool value · Effective from ·
 * Visibility sections.
 */
export default function CommissionRulesListPage() {
  const referencesQuery = useReferences();
  const categoriesQuery = useProjectCategories();

  const categories = categoriesQuery.data ?? [];

  const schema = React.useMemo(
    () =>
      buildCommissionRuleFilterSchema({
        references: referencesQuery.data,
        categories,
      }),
    [referencesQuery.data, categories],
  );

  const onCountsRequest = React.useCallback(async (state: FilterState): Promise<FilterCounts> => {
    const response = await fetchCommissionRuleFilterCounts(stateToRuleFilterParams(state));
    return toCommissionRuleFilterCounts(response);
  }, []);

  return (
    <AdvancedFiltersRoot schema={schema} onCountsRequest={onCountsRequest}>
      <CommissionRulesListInner schema={schema} categories={categories} />
    </AdvancedFiltersRoot>
  );
}

function CommissionRulesListInner({
  schema,
  categories,
}: {
  schema: ReturnType<typeof buildCommissionRuleFilterSchema>;
  categories: ProjectCategoryPublic[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const perms = usePermissions();
  const canManage = perms.has('commissions:manage_rules');

  /* ---------- Search ---------- */
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 200);
    return () => window.clearTimeout(id);
  }, [search]);

  /* ---------- Filter state ---------- */
  const filterState = useAdvancedFiltersValue();
  const activeFiltersCount = useAdvancedFiltersActiveCount();
  const dispatch = useFilterDispatch();

  const queryFilters = React.useMemo(() => stateToRuleFilterParams(filterState), [filterState]);
  const totalActiveCount = activeFiltersCount + (debouncedSearch ? 1 : 0);

  function clearFilters() {
    setSearch('');
    setDebouncedSearch('');
    dispatch({ type: 'CLEAR_ALL' });
  }

  const [filterPanelOpen, setFilterPanelOpen] = React.useState(false);

  /* ---------- Sheet (URL-driven so back closes naturally) ---------- */
  const sheetMode = searchParams.get('sheet');
  const sheetRuleId = searchParams.get('id') ?? null;
  const sheetOpen = sheetMode === 'create' || sheetMode === 'edit';

  function openCreate() {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sheet', 'create');
    params.delete('id');
    router.push(`/commission-rules?${params.toString()}`);
  }
  function openEdit(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sheet', 'edit');
    params.set('id', id);
    router.push(`/commission-rules?${params.toString()}`);
  }
  function closeSheet() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('sheet');
    params.delete('id');
    const qs = params.toString();
    router.push(qs ? `/commission-rules?${qs}` : '/commission-rules');
  }

  /* ---------- Data ---------- */
  const listQuery = useCommissionRulesList({
    limit: 500,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...queryFilters,
  });
  const items = listQuery.data?.items ?? [];

  /* ---------- KPI derivations ---------- */
  const kpis = React.useMemo(() => {
    const active = items.filter((r) => r.status === 'active');
    const pending = items.filter((r) => r.status === 'pending');
    const departments = new Set(active.map((r) => r.department));
    const cats = new Set(active.map((r) => r.category.id));
    const latestVersion = active
      .map((r) => parseVersion(r.version))
      .sort((a, b) => (b[0] - a[0] !== 0 ? b[0] - a[0] : b[1] - a[1]))[0];
    return {
      active: active.length,
      activeDepartments: departments.size,
      activeCategories: cats.size,
      pending: pending.length,
      latestVersion: latestVersion ? `v${latestVersion[0]}.${latestVersion[1]}` : '—',
      latestPublishedAt: active.find((r) => r.publishedAt)?.publishedAt?.slice(0, 10) ?? null,
    };
  }, [items]);

  /* ---------- Sorted rows ---------- */
  const rows = React.useMemo(() => {
    // Pending rows float to the bottom; otherwise group by department then category name.
    const sorted = [...items].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return 1;
      if (b.status === 'pending' && a.status !== 'pending') return -1;
      if (a.department !== b.department) return a.department.localeCompare(b.department);
      return a.category.name.localeCompare(b.category.name);
    });
    return sorted;
  }, [items]);

  /* ---------- Columns ---------- */
  const columns = React.useMemo<DataTableColumn<CommissionRulePublic>[]>(
    () => [
      {
        id: 'department',
        header: 'Department',
        cell: (row) => (
          <span className="text-fn-fg font-fn-semibold text-[13px]">
            {departmentLabel(row.department)}
          </span>
        ),
      },
      {
        id: 'category',
        header: 'Category',
        width: 160,
        cell: (row) => <CategoryChip name={row.category.name} color={row.category.color} />,
      },
      {
        id: 'pool',
        header: 'Pool',
        width: 90,
        align: 'right',
        cell: (row) => (
          <span className="text-fn-fg font-fn-semibold text-[13px] tabular-nums">
            {row.status === 'pending'
              ? '—'
              : row.poolMode === 'percentage'
                ? `${row.poolValue}%`
                : `$${row.poolValue.toLocaleString()}`}
          </span>
        ),
      },
      {
        id: 'split',
        header: 'Split',
        cell: (row) => <SplitCell rule={row} />,
      },
      {
        id: 'version',
        header: 'Version',
        width: 90,
        cell: (row) => (
          <span className="text-fn-fg font-fn-semibold font-mono text-[12px] tabular-nums">
            {row.status === 'pending' ? '—' : `v${row.version}`}
          </span>
        ),
      },
      {
        id: 'effective-from',
        header: 'Effective from',
        width: 130,
        cell: (row) =>
          row.status === 'pending' ? (
            <span className="text-fn-fg-faint text-[12.5px]">—</span>
          ) : (
            <span className="text-fn-fg text-[12.5px] tabular-nums">
              {formatDate(row.effectiveFrom)}
            </span>
          ),
      },
      {
        id: 'status',
        header: 'Status',
        width: 110,
        cell: (row) => <RuleStatusPill status={row.status} />,
      },
    ],
    [],
  );

  const rowActions = React.useCallback(
    (rule: CommissionRulePublic): DataTableRowAction[] => {
      const items: DataTableRowAction[] = [
        { label: 'View rule', onClick: () => openEdit(rule.id) },
      ];
      if (canManage) {
        items.push({
          label: rule.status === 'draft' ? 'Continue editing' : 'Draft new version',
          onClick: () => openEdit(rule.id),
        });
      }
      return items;
    },
    // openEdit closes over the current searchParams (which the URL-driven
    // sheet state relies on), so recompute when those change.
    [canManage, searchParams],
  );

  return (
    <AppShell breadcrumbs={[{ label: 'Commission Rules' }]}>
      <div className="gap-fn-5 flex h-full flex-col">
        {/* Header */}
        <div className="gap-fn-3 flex shrink-0 flex-wrap items-end justify-between">
          <div className="gap-fn-1_5 flex flex-col">
            <h1
              className="text-fn-fg font-fn-semibold text-[24px]"
              style={{ letterSpacing: '-0.02em' }}
            >
              Commission rules
            </h1>
            <p className="text-fn-fg-muted max-w-[640px] text-[14px]">
              Versioned per department × category. Editing creates a new version — historical runs
              always use the rule active on their processing date.
            </p>
          </div>
          <div className="gap-fn-2 flex items-center">
            <Button variant="secondary" size="md" disabled>
              <Download className="h-fn-4 w-fn-4" /> Export rule set
            </Button>
            <Button variant="secondary" size="md" disabled>
              <History className="h-fn-4 w-fn-4" /> Version history
            </Button>
            {canManage && (
              <Button size="md" onClick={openCreate}>
                <Plus className="h-fn-4 w-fn-4" /> New rule
              </Button>
            )}
          </div>
        </div>

        {/* KPI strip */}
        <div className="gap-fn-4 grid grid-cols-1 md:grid-cols-3">
          <KpiCard
            tone="success"
            label="Active rules"
            value={String(kpis.active)}
            sub={`across ${kpis.activeDepartments} departments · ${kpis.activeCategories} categories`}
          />
          <KpiCard
            tone="warning"
            label="Pending decision"
            value={String(kpis.pending)}
            sub={kpis.pending === 0 ? 'no slots awaiting numbers' : 'slots awaiting numbers'}
          />
          <KpiCard
            tone="accent"
            label="Effective next run"
            value={kpis.latestVersion}
            sub={kpis.latestPublishedAt ? `published ${formatDate(kpis.latestPublishedAt)}` : '—'}
            icon={<Sparkles className="h-fn-4 w-fn-4" />}
          />
        </div>

        {/* Table card */}
        <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs flex min-h-0 flex-1 flex-col overflow-hidden border">
          {/* Toolbar */}
          <div className="border-fn-divider gap-fn-2_5 px-fn-5 py-fn-3_5 flex shrink-0 flex-wrap items-center border-b">
            <div className="relative w-full max-w-[340px] flex-1">
              <Search className="text-fn-fg-faint left-fn-2_5 h-fn-3_5 w-fn-3_5 pointer-events-none absolute top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find department, category, or reason…"
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
            <div className="gap-fn-2 ml-auto flex items-center">
              {listQuery.isFetching && !listQuery.isPending && (
                <span className="text-fn-fg-faint text-[11.5px]">Refreshing…</span>
              )}
            </div>
          </div>

          {activeFiltersCount > 0 && (
            <div className="px-fn-5 pt-fn-3">
              <ChipsBar schema={schema} />
            </div>
          )}

          {/* DataTable owns its own scroll — wrap in min-h-0 flex-1 so it
              shrinks to fill the remaining vertical space inside the
              overflow-hidden card. Without this the End-of-list footer
              gets clipped. Same wrapper as employees / projects. */}
          <div className="min-h-0 flex-1">
            <DataTable
              chrome="plain"
              columns={columns}
              rows={rows}
              getRowKey={(r) => r.id}
              isLoading={listQuery.isPending}
              isError={listQuery.isError}
              onRetry={() => listQuery.refetch()}
              totalCount={rows.length}
              onRowClick={(r) => (canManage ? openEdit(r.id) : undefined)}
              rowActions={canManage ? rowActions : undefined}
              emptyState={
                <EmptyState
                  hasFilters={totalActiveCount > 0}
                  canManage={canManage}
                  onCreate={openCreate}
                />
              }
            />
          </div>
        </div>

        <p className="text-fn-fg-faint px-fn-1 text-[11.5px]">
          Rules are versioned: editing a row creates v<em>X.Y+1</em> with{' '}
          <code className="bg-fn-bg-inset px-fn-1 rounded-fn-xs font-mono text-[10.5px]">
            effective_from
          </code>{' '}
          = today. Previous versions remain queryable forever.
        </p>
      </div>

      {sheetOpen && (
        <CommissionRuleEditorSheet
          mode={sheetMode === 'edit' ? 'edit' : 'create'}
          ruleId={sheetRuleId}
          categories={categories}
          open
          onOpenChange={(next) => {
            if (!next) closeSheet();
          }}
        />
      )}

      <AdvancedFilters schema={schema} open={filterPanelOpen} onOpenChange={setFilterPanelOpen} />
    </AppShell>
  );
}

/* ───────────────────────── Sub-components ───────────────────────── */

function KpiCard({
  tone,
  label,
  value,
  sub,
  icon,
}: {
  tone: 'success' | 'warning' | 'accent';
  label: string;
  value: string;
  sub: string;
  icon?: React.ReactNode;
}) {
  const toneClasses: Record<typeof tone, string> = {
    success: 'border-fn-success/30 bg-fn-success-soft/40',
    warning: 'border-fn-warning/30 bg-fn-warning-soft/40',
    accent: 'border-fn-accent/30 bg-fn-accent-soft/40',
  };
  const dotTone: Record<typeof tone, string> = {
    success: 'bg-fn-success',
    warning: 'bg-fn-warning',
    accent: 'bg-fn-accent',
  };
  return (
    <div className={cn('rounded-fn-sm p-fn-4 gap-fn-2_5 flex flex-col border', toneClasses[tone])}>
      <div className="gap-fn-2 flex items-center">
        {icon ?? (
          <span
            aria-hidden
            className={cn('rounded-fn-full h-fn-2 w-fn-2 inline-block', dotTone[tone])}
          />
        )}
        <span className="text-fn-fg-muted font-fn-semibold tracking-fn-uppercase-tight text-[11px] uppercase">
          {label}
        </span>
      </div>
      <span
        className="text-fn-fg font-fn-semibold leading-fn-unit text-[34px] tabular-nums"
        style={{ letterSpacing: '-0.03em' }}
      >
        {value}
      </span>
      <span className="text-fn-fg-faint text-[11.5px]">{sub}</span>
    </div>
  );
}

function CategoryChip({ name, color }: { name: string; color: string }) {
  const hue = colorToHue(color);
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

function SplitCell({ rule }: { rule: CommissionRulePublic }) {
  if (rule.status === 'pending') {
    return (
      <span className="text-fn-warning-soft-fg text-[12px]">
        {rule.pendingReason ?? 'Awaiting decision'}
      </span>
    );
  }
  const order = ['winner', 'communicator', 'eligible_team'];
  const initials: Record<string, string> = {
    winner: 'W',
    communicator: 'C',
    eligible_team: 'ET',
  };
  const entries = Object.entries(rule.rolePercentages).sort(
    (a, b) => order.indexOf(a[0]) + 99 - (order.indexOf(b[0]) + 99) || a[0].localeCompare(b[0]),
  );
  return (
    <span className="text-fn-fg-muted gap-fn-1_5 flex flex-wrap items-center font-mono text-[12px]">
      {entries.map(([role, pct], i) => (
        <React.Fragment key={role}>
          {i > 0 && <span className="text-fn-fg-faint">·</span>}
          <span>
            {initials[role] ?? role[0]?.toUpperCase()} {pct}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
}

function RuleStatusPill({ status }: { status: CommissionRulePublic['status'] }) {
  const tones: Record<CommissionRulePublic['status'], React.ComponentProps<typeof Badge>['tone']> =
    {
      draft: 'default',
      active: 'success',
      pending: 'warning',
      archived: 'default',
    };
  const labels: Record<CommissionRulePublic['status'], string> = {
    draft: 'Draft',
    active: 'Active',
    pending: 'Pending',
    archived: 'Archived',
  };
  return (
    <Badge tone={tones[status]} dot>
      {labels[status]}
    </Badge>
  );
}

function EmptyState({
  hasFilters,
  canManage,
  onCreate,
}: {
  hasFilters: boolean;
  canManage: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="gap-fn-3 py-fn-12 flex flex-col items-center text-center">
      <Scale className="text-fn-fg-faint h-fn-8 w-fn-8" />
      <div className="gap-fn-1 flex flex-col">
        <p className="text-fn-fg font-fn-semibold text-[14px]">
          {hasFilters ? 'No rules match your filters' : 'No commission rules yet'}
        </p>
        <p className="text-fn-fg-muted max-w-[340px] text-[12.5px]">
          {hasFilters
            ? 'Try clearing one of the filters or searching for a different department or category.'
            : canManage
              ? 'Create the first rule to start backing projects. Each rule is versioned per (department, category).'
              : 'No rules to show.'}
        </p>
      </div>
      {canManage && !hasFilters && (
        <Button onClick={onCreate}>
          <Plus className="h-fn-4 w-fn-4" /> New rule
        </Button>
      )}
    </div>
  );
}

/* ───────────────────────── Helpers ───────────────────────── */

function parseVersion(version: string): [number, number] {
  const parts = version.split('.').map((p) => Number.parseInt(p, 10));
  return [parts[0] ?? 1, parts[1] ?? 0];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const DEPT_LABELS: Record<string, string> = {
  engineering: 'Engineering',
  'business-development': 'Business Dev',
  operations: 'Operations',
  hr: 'HR',
  '*': 'Org-wide',
};
function departmentLabel(slug: string): string {
  return DEPT_LABELS[slug] ?? slug;
}

function colorToHue(color: string): number {
  switch (color) {
    case 'violet':
      return 280;
    case 'amber':
      return 65;
    case 'orange':
      return 35;
    case 'red':
      return 22;
    case 'teal':
      return 175;
    case 'slate':
      return 245;
    default: {
      let h = 0;
      for (const c of color) h = (h * 31 + c.charCodeAt(0)) | 0;
      return Math.abs(h) % 360;
    }
  }
}
