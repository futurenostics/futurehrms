'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Briefcase, Download, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { ProjectPublic, ProjectStatus } from '@futurenostics/types';
import { AppShell } from '@/components/shell/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DataTable,
  type DataTableColumn,
  type DataTableRowAction,
} from '@/components/ui/data-table';
import { ProjectFormSheet } from '@/components/projects/project-form-sheet';
import {
  useInfiniteProjects,
  useProjectCategories,
  useDeleteProject,
} from '@/lib/queries/projects';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;

/**
 * Projects list page — matches PNG 07.
 *
 * Layout: page header (h1 + subtitle + Export + New project), three
 * category KPI cards (External / Upwork / B2B with active count +
 * revenue total + commission accrual), filter chip row (All
 * categories + per-top-level chips), search input, DataTable.
 *
 * Per the locked design source for Phase 2 the only authoritative
 * reference for this page is `docs/design/screens/commissions-design/
 * 07 _ Projects _ all categories.png`.
 */
export default function ProjectsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const perms = usePermissions();

  const canCreate = perms.has('projects:create');
  const canDelete = perms.has('projects:delete');

  /* ---------- Filters + search ---------- */
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 200);
    return () => window.clearTimeout(id);
  }, [search]);

  const [categorySlug, setCategorySlug] = React.useState<string>('all');

  /* ---------- Sheet ---------- */
  const sheetMode = searchParams.get('sheet');
  const sheetProjectId = searchParams.get('id') ?? null;
  const sheetOpen = sheetMode === 'create' || sheetMode === 'edit';

  function openCreate() {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sheet', 'create');
    params.delete('id');
    router.push(`/projects?${params.toString()}`);
  }
  function openEdit(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sheet', 'edit');
    params.set('id', id);
    router.push(`/projects?${params.toString()}`);
  }
  function closeSheet() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('sheet');
    params.delete('id');
    const qs = params.toString();
    router.push(qs ? `/projects?${qs}` : '/projects');
  }

  /* ---------- Data ---------- */
  const categoriesQuery = useProjectCategories();
  const categories = categoriesQuery.data ?? [];
  const topLevel = categories.filter((c) => !c.parentId && !c.archived);
  const selectedCategoryId =
    categorySlug === 'all' ? undefined : categories.find((c) => c.slug === categorySlug)?.id;

  const listQuery = useInfiniteProjects(
    {
      search: debouncedSearch || undefined,
      categoryId: selectedCategoryId,
      sortBy: 'createdAt',
      sortDir: 'desc',
    },
    PAGE_SIZE,
  );

  const rows = React.useMemo(
    () => (listQuery.data?.pages ?? []).flatMap((p) => p?.items ?? []),
    [listQuery.data],
  );
  const totalCount = listQuery.data?.pages[0]?.total ?? 0;

  const deleteProject = useDeleteProject(sheetProjectId ?? '');

  /* ---------- Columns ---------- */
  const columns = React.useMemo<DataTableColumn<ProjectPublic>[]>(
    () => [
      {
        id: 'project',
        header: 'Project',
        cell: (row) => (
          <div className="gap-fn-0_5 flex min-w-0 flex-col">
            <span className="text-fn-fg font-fn-semibold truncate text-[13.5px]">{row.name}</span>
            <span className="text-fn-fg-faint text-fn-sm-plus truncate font-mono">
              PRJ-{row.id.slice(-4).toUpperCase()} · {row.clientName}
            </span>
          </div>
        ),
      },
      {
        id: 'category',
        header: 'Category',
        width: 140,
        cell: (row) => <CategoryBadge name={row.category.name} color={row.category.color} />,
      },
      {
        id: 'winner-communicator',
        header: 'Winner / Communicator',
        cell: (row) => <WinnerCommunicatorCell project={row} />,
      },
      {
        id: 'revenue',
        header: 'Revenue',
        width: 110,
        align: 'right',
        cell: (row) => (
          <span className="text-fn-fg font-fn-semibold text-[13.5px] tabular-nums">
            {formatUsd(row.revenueUsd)}
          </span>
        ),
      },
      {
        id: 'commission',
        header: 'Commission',
        width: 110,
        align: 'right',
        cell: (row) => {
          const cr = row.commissionRule;
          const pool =
            cr.poolMode === 'percentage' ? (row.revenueUsd * cr.poolValue) / 100 : cr.poolValue;
          return (
            <span className="text-fn-fg font-fn-semibold text-[13.5px] tabular-nums">
              {formatUsd(pool)}
            </span>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        width: 130,
        cell: (row) => <ProjectStatusPill status={row.status} />,
      },
    ],
    [],
  );

  const rowActions = React.useCallback(
    (project: ProjectPublic): DataTableRowAction[] => {
      const items: DataTableRowAction[] = [
        { label: 'Open project', onClick: () => router.push(`/projects/${project.id}`) },
        { label: 'Edit details', onClick: () => openEdit(project.id) },
      ];
      if (canDelete) {
        items.push({
          label: 'Archive',
          variant: 'destructive',
          onClick: async () => {
            if (!confirm(`Archive project "${project.name}"?`)) return;
            try {
              await deleteProject.mutateAsync();
              toast.success('Project archived.');
            } catch (err) {
              toast.error((err as Error).message);
            }
          },
        });
      }
      return items;
    },
    [router, canDelete, deleteProject],
  );

  /* ---------- KPI strip totals ---------- */
  const kpis = React.useMemo(() => {
    const groups = new Map<
      string,
      { name: string; active: number; revenue: number; commission: number }
    >();
    for (const row of rows) {
      const key = row.category.parentId
        ? (categories.find((c) => c.id === row.category.parentId)?.slug ?? row.category.slug)
        : row.category.slug;
      const cat = categories.find((c) => c.slug === key);
      const g = groups.get(key) ?? {
        name: cat?.name ?? row.category.name,
        active: 0,
        revenue: 0,
        commission: 0,
      };
      const isActive = row.status === 'active' || row.status === 'in_billing';
      if (isActive) g.active += 1;
      g.revenue += row.revenueUsd;
      const cr = row.commissionRule;
      const pool =
        cr.poolMode === 'percentage' ? (row.revenueUsd * cr.poolValue) / 100 : cr.poolValue;
      g.commission += pool;
      groups.set(key, g);
    }
    return ['external', 'upwork', 'b2b'].map((slug) => ({
      slug,
      ...(groups.get(slug) ?? { name: slug, active: 0, revenue: 0, commission: 0 }),
    }));
  }, [rows, categories]);

  return (
    <AppShell breadcrumbs={[{ label: 'Projects' }]}>
      <div className="gap-fn-5 flex h-full flex-col">
        {/* Header */}
        <div className="gap-fn-3 flex shrink-0 flex-wrap items-end justify-between">
          <div className="gap-fn-1_5 flex flex-col">
            <h1
              className="text-fn-fg font-fn-semibold tracking-fn-tight text-[24px]"
              style={{ letterSpacing: '-0.02em' }}
            >
              Projects
            </h1>
            <p className="text-fn-fg-muted max-w-[640px] text-[14px]">
              External, Upwork, and B2B projects across all departments. Commission rules apply on
              approve.
            </p>
          </div>
          <div className="gap-fn-2 flex items-center">
            <Button variant="secondary" size="md" disabled>
              <Download className="h-fn-4 w-fn-4" /> Export
            </Button>
            {canCreate && (
              <Button size="md" onClick={openCreate}>
                <Plus className="h-fn-4 w-fn-4" /> New project
              </Button>
            )}
          </div>
        </div>

        {/* KPI strip — three category cards */}
        <div className="gap-fn-4 grid grid-cols-1 md:grid-cols-3">
          {kpis.map((k) => (
            <CategoryKpiCard key={k.slug} {...k} color={catColorFor(k.slug)} />
          ))}
        </div>

        {/* Table card */}
        <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs flex min-h-0 flex-1 flex-col overflow-hidden border">
          {/* Toolbar */}
          <div className="border-fn-divider gap-fn-2_5 px-fn-5 py-fn-3_5 flex shrink-0 flex-wrap items-center border-b">
            <CategoryFilterChips
              value={categorySlug}
              onChange={setCategorySlug}
              categories={[
                { slug: 'all', name: 'All categories' },
                ...topLevel.map((c) => ({ slug: c.slug, name: c.name })),
              ]}
            />
            <div className="relative ml-auto w-full max-w-[280px]">
              <Search className="text-fn-fg-faint left-fn-2_5 h-fn-3_5 w-fn-3_5 pointer-events-none absolute top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find project…"
                className="pl-fn-8"
              />
            </div>
          </div>

          <DataTable
            chrome="plain"
            columns={columns}
            rows={rows}
            getRowKey={(r) => r.id}
            isLoading={listQuery.isPending}
            isError={listQuery.isError}
            onRetry={() => listQuery.refetch()}
            totalCount={totalCount}
            hasMore={listQuery.hasNextPage ?? false}
            isFetchingMore={listQuery.isFetchingNextPage}
            onLoadMore={() => listQuery.fetchNextPage()}
            onRowClick={(r) => router.push(`/projects/${r.id}`)}
            rowActions={rowActions}
            emptyState={
              <div className="gap-fn-3 py-fn-12 flex flex-col items-center text-center">
                <Briefcase className="text-fn-fg-faint h-fn-8 w-fn-8" />
                <div className="gap-fn-1 flex flex-col">
                  <p className="text-fn-fg font-fn-semibold text-[14px]">No projects yet</p>
                  <p className="text-fn-fg-muted max-w-[340px] text-[12.5px]">
                    {canCreate
                      ? 'Start by creating a project — pick its category to pull in the right commission rule.'
                      : 'No projects to show.'}
                  </p>
                </div>
                {canCreate && (
                  <Button onClick={openCreate}>
                    <Plus className="h-fn-4 w-fn-4" /> New project
                  </Button>
                )}
              </div>
            }
          />
        </div>
      </div>

      {sheetOpen && (
        <ProjectFormSheet
          mode={sheetMode === 'edit' ? 'edit' : 'create'}
          projectId={sheetProjectId}
          open
          onOpenChange={(next) => {
            if (!next) closeSheet();
          }}
        />
      )}
    </AppShell>
  );
}

/* ───────────────────────── Sub-components ───────────────────────── */

function CategoryKpiCard({
  name,
  active,
  revenue,
  commission,
  color,
}: {
  name: string;
  active: number;
  revenue: number;
  commission: number;
  /** OKLCH hue number (0–360). */
  color: number;
}) {
  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel p-fn-4 gap-fn-2_5 flex flex-col border">
      <div className="gap-fn-2 flex items-center">
        <span
          aria-hidden
          className="rounded-fn-full h-fn-2 w-fn-2 inline-block shrink-0"
          style={{ background: `oklch(0.55 0.16 ${color})` }}
        />
        <span className="text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight text-[11px] uppercase">
          {name}
        </span>
        <Badge tone="default" className="ml-auto">
          {active} active
        </Badge>
      </div>
      <div className="gap-fn-1 flex flex-wrap items-baseline">
        <span
          className="text-fn-fg font-fn-semibold leading-fn-unit text-[26px] tabular-nums"
          style={{ letterSpacing: '-0.025em' }}
        >
          {formatUsd(revenue, true)}
        </span>
        <span className="text-fn-fg-faint text-[12px]">revenue (USD)</span>
      </div>
      <div className="text-fn-fg-muted gap-fn-2 flex items-center text-[12px]">
        <span className="font-fn-medium">Commission</span>
        <span className="text-fn-fg font-fn-semibold tabular-nums">{formatUsd(commission)}</span>
      </div>
    </div>
  );
}

function CategoryFilterChips({
  value,
  onChange,
  categories,
}: {
  value: string;
  onChange: (slug: string) => void;
  categories: Array<{ slug: string; name: string }>;
}) {
  return (
    <div className="gap-fn-1_5 flex flex-wrap items-center">
      {categories.map((cat) => {
        const active = value === cat.slug;
        return (
          <button
            key={cat.slug}
            type="button"
            onClick={() => onChange(cat.slug)}
            className={cn(
              'rounded-fn-xs px-fn-2_5 py-fn-1 font-fn-medium cursor-pointer border text-[12.5px] transition-colors',
              active
                ? 'border-fn-accent/30 bg-fn-accent-soft text-fn-accent-soft-fg'
                : 'border-fn-border bg-fn-bg-panel text-fn-fg-muted hover:border-fn-fg-faint',
            )}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}

function CategoryBadge({ name, color }: { name: string; color: string }) {
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

function WinnerCommunicatorCell({ project }: { project: ProjectPublic }) {
  const winner = project.assignments.find((a) => a.roleName === 'winner');
  const communicator = project.assignments.find((a) => a.roleName === 'communicator');
  return (
    <div className="gap-fn-1 flex flex-col">
      {winner && <PersonRow label="W" name={winner.employee.fullName} />}
      {communicator && <PersonRow label="C" name={communicator.employee.fullName} />}
      {!winner && !communicator && <span className="text-fn-fg-faint text-[12px]">—</span>}
    </div>
  );
}

function PersonRow({ label, name }: { label: string; name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
  return (
    <span className="gap-fn-1_5 flex items-center text-[12.5px]">
      <span
        aria-hidden
        className="rounded-fn-xs bg-fn-bg-inset text-fn-fg-muted font-fn-semibold h-fn-5 w-fn-5 inline-flex items-center justify-center text-[9.5px]"
      >
        {initials}
      </span>
      <span className="text-fn-fg font-fn-medium truncate">{name}</span>
      <span className="text-fn-fg-faint shrink-0 text-[10px]">{label}</span>
    </span>
  );
}

const STATUS_TO_TONE: Record<ProjectStatus, React.ComponentProps<typeof Badge>['tone']> = {
  draft: 'default',
  active: 'info',
  in_billing: 'success',
  on_hold: 'warning',
  completed: 'success',
  cancelled: 'danger',
  refunded: 'danger',
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  in_billing: 'In billing',
  on_hold: 'Payment hold',
  completed: 'Complete',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

function ProjectStatusPill({ status }: { status: ProjectStatus }) {
  return (
    <Badge tone={STATUS_TO_TONE[status]} dot>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

/* ───────────────────────── Helpers ───────────────────────── */

function formatUsd(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
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
    case 'sky':
      return 200;
    case 'lime':
      return 95;
    case 'rose':
      return 350;
    default: {
      // hash unknown to a stable hue
      let h = 0;
      for (const c of color) h = (h * 31 + c.charCodeAt(0)) | 0;
      return Math.abs(h) % 360;
    }
  }
}

function catColorFor(slug: string): number {
  if (slug === 'external') return 280;
  if (slug === 'upwork') return 65;
  if (slug === 'b2b') return 175;
  return 245;
}
