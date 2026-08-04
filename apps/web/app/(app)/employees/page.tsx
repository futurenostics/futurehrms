'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Download,
  LayoutGrid,
  List,
  Plus,
  Search,
  Upload,
  Users as UsersIcon,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { EmployeeListQuery, EmployeePublic, EmployeeSortBy } from '@futurenostics/types';
import { AppShell } from '@/components/shell/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  buildEmployeeFilterSchema,
  toFilterCounts,
} from '@/components/employees/employee-filter-schema';
import {
  fetchEmployeeFilterCounts,
  type EmployeeFilterCountsParams,
} from '@/lib/queries/employees';
import {
  DataTable,
  type DataTableColumn,
  type DataTableRowAction,
} from '@/components/ui/data-table';
import { StatusPill } from '@/components/employees/status-pill';
import { EmployeeAvatar } from '@/components/employees/employee-avatar';
import { EmployeeFormSheet } from '@/components/employees/employee-form-sheet';
import { KpiStrip } from '@/components/employees/kpi-strip';
import {
  useEmployee,
  useEmployeesList,
  useEmployeeStats,
  useInfiniteEmployees,
  useReferences,
} from '@/lib/queries/employees';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;

type ViewMode = 'list' | 'grid';

/**
 * Maps DataTable column ids (which double as sort keys) to the API's
 * EmployeeSortBy union. Keys not present in this map are not sortable
 * on the server side — the DataTable header click is a no-op for them.
 */
const SORT_KEY_TO_API: Record<string, EmployeeSortBy> = {
  employee: 'fullName',
  eid: 'eid',
  joinDate: 'joinDate',
  salary: 'salaryPkr',
};
const API_TO_SORT_KEY: Record<EmployeeSortBy, string> = {
  fullName: 'employee',
  eid: 'eid',
  joinDate: 'joinDate',
  salaryPkr: 'salary',
  createdAt: 'createdAt',
};

/**
 * Translate the AdvancedFilters state into the params the
 * /employees/filter-counts endpoint expects. Lives at module scope so
 * the callback identity stays stable across renders.
 */
function stateToFilterCountsParams(state: FilterState): EmployeeFilterCountsParams {
  const params: EmployeeFilterCountsParams = {};
  for (const [k, v] of Object.entries(state)) {
    switch (k) {
      case 'department':
        if (v.kind === 'multi') params.departmentIds = v.ids;
        break;
      case 'designation':
        if (v.kind === 'multi') params.designationIds = v.ids;
        break;
      case 'status':
        if (v.kind === 'multi') params.statusIds = v.ids;
        break;
      case 'contract':
        if (v.kind === 'multi') params.contractTypes = v.ids;
        break;
      case 'manager':
        if (v.kind === 'multi') params.managerIds = v.ids;
        break;
      case 'tenure':
        if (v.kind === 'multi') params.tenureBuckets = v.ids;
        break;
      case 'compensation':
        if (v.kind === 'flags') params.compensationFlags = v.ids;
        break;
      case 'documents':
        if (v.kind === 'flags') params.documentFlags = v.ids;
        break;
      case 'salary':
        if (v.kind === 'range') {
          if (v.min !== null) params.salaryMin = v.min;
          if (v.max !== null) params.salaryMax = v.max;
        }
        break;
      case 'joinedAt':
        if (v.kind === 'date-range') {
          if (v.from) params.joinDateFrom = v.from;
          if (v.to) params.joinDateTo = v.to;
        }
        break;
      case 'archived':
        if (v.kind === 'flags') params.includeArchived = v.ids.includes('archived');
        break;
    }
  }
  return params;
}

export default function EmployeesListPage() {
  const perms = usePermissions();
  const referencesQuery = useReferences();
  const managerListQuery = useEmployeesList({ limit: 200 });

  const canViewSalary = perms.has('employees:view_salary');
  const canSeeArchived = perms.has('employees:view_all');

  const managers = React.useMemo(
    () => managerListQuery.data?.items.map((e) => ({ id: e.id, fullName: e.fullName })) ?? [],
    [managerListQuery.data],
  );

  const schema = React.useMemo(
    () =>
      buildEmployeeFilterSchema({
        references: referencesQuery.data,
        managers,
        canViewSalary,
        canSeeArchived,
      }),
    [referencesQuery.data, managers, canViewSalary, canSeeArchived],
  );

  const onCountsRequest = React.useCallback(async (state: FilterState): Promise<FilterCounts> => {
    const response = await fetchEmployeeFilterCounts(stateToFilterCountsParams(state));
    return toFilterCounts(response);
  }, []);

  return (
    <AdvancedFiltersRoot schema={schema} onCountsRequest={onCountsRequest}>
      <EmployeesListInner schema={schema} />
    </AdvancedFiltersRoot>
  );
}

function EmployeesListInner({ schema }: { schema: ReturnType<typeof buildEmployeeFilterSchema> }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const perms = usePermissions();
  const statsQuery = useEmployeeStats();

  const canCreate = perms.has('employees:create');
  const canExport = perms.has('employees:export');
  const canImport = perms.has('employees:import');
  const canViewSalary = perms.has('employees:view_salary');
  const canArchive = perms.has('employees:delete');

  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');

  // Filter state lives in the AdvancedFilters store — single source of
  // truth for the drawer, the chips bar, the URL, the list query, and
  // the filter-counts query. The list endpoint and the filter-counts
  // endpoint share the same filter shape (array ids, ranges, flags),
  // so every selection in the drawer is honoured by the table.
  const filterState = useAdvancedFiltersValue();
  const activeFiltersCount = useAdvancedFiltersActiveCount();
  const dispatch = useFilterDispatch();

  // Stable derivation of the list-query filter params from the
  // primitive's state. `stateToFilterCountsParams` already produces the
  // exact shape both endpoints want; reusing it keeps the table and the
  // filter-counts panel perfectly aligned.
  const queryFilters = React.useMemo(() => stateToFilterCountsParams(filterState), [filterState]);

  const [filterPanelOpen, setFilterPanelOpen] = React.useState(false);

  const [sortBy, setSortBy] = React.useState<EmployeeSortBy>('joinDate');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');

  const [view, setView] = React.useState<ViewMode>('list');
  const [selected, setSelected] = React.useState<string[]>([]);

  // EmployeeFormSheet state — derived from the URL so the browser back
  // button closes the sheet, deep links work, and the open state is
  // shareable. ?sheet=create opens the create mode; ?sheet=edit&id=…
  // opens edit mode and fetches the employee by id (the row data isn't
  // available on hard reload).
  const sheetParam = searchParams.get('sheet');
  const sheetEditId = sheetParam === 'edit' ? searchParams.get('id') : null;
  const sheetEditEmployeeQuery = useEmployee(sheetEditId);

  // Local "intent" state lets us hand the already-loaded row to the
  // sheet immediately when the user opens edit from a kebab — avoids a
  // round-trip via useEmployee for the common case.
  const [pendingEditEmployee, setPendingEditEmployee] = React.useState<EmployeePublic | null>(null);

  const sheetState: { mode: 'create' } | { mode: 'edit'; employee: EmployeePublic } | null =
    React.useMemo(() => {
      if (sheetParam === 'create') return { mode: 'create' };
      if (sheetParam === 'edit') {
        const employee =
          pendingEditEmployee && pendingEditEmployee.id === sheetEditId
            ? pendingEditEmployee
            : (sheetEditEmployeeQuery.data ?? null);
        return employee ? { mode: 'edit', employee } : null;
      }
      return null;
    }, [sheetParam, sheetEditId, pendingEditEmployee, sheetEditEmployeeQuery.data]);

  function openSheet(next: 'create' | { id: string; employee?: EmployeePublic }) {
    const params = new URLSearchParams(searchParams);
    if (next === 'create') {
      params.set('sheet', 'create');
      params.delete('id');
      setPendingEditEmployee(null);
    } else {
      params.set('sheet', 'edit');
      params.set('id', next.id);
      setPendingEditEmployee(next.employee ?? null);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function closeSheet() {
    const params = new URLSearchParams(searchParams);
    params.delete('sheet');
    params.delete('id');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    setPendingEditEmployee(null);
  }

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(id);
  }, [search]);

  // Reset selection whenever filters change — the previous selection
  // may now reference rows the user can't see.
  React.useEffect(() => {
    setSelected([]);
  }, [debouncedSearch, queryFilters]);

  const filters = React.useMemo(
    () => ({
      sortBy,
      sortDir,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...queryFilters,
    }),
    [sortBy, sortDir, debouncedSearch, queryFilters],
  );

  const {
    data,
    isLoading,
    isError,
    isFetching,
    isFetchingNextPage,
    isRefetchError: nextPageError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteEmployees(filters, PAGE_SIZE);

  // Defensive flatten: if a page object is missing `items` (e.g. the
  // API server is still running the pre-migration shape that returned
  // `{ data, meta }`), `p.items` is undefined and a naive flatMap
  // would yield `[undefined, undefined, …]` — which would then crash
  // every downstream getRowKey lookup. Coercing to [] keeps the table
  // empty rather than crashing the page.
  const rows: EmployeePublic[] = React.useMemo(
    () => (data?.pages ?? []).flatMap((p) => p?.items ?? []),
    [data?.pages],
  );
  const totalCount = data?.pages[0]?.total ?? 0;

  const totalActiveCount = activeFiltersCount + (debouncedSearch ? 1 : 0);

  function clearFilters() {
    setSearch('');
    setDebouncedSearch('');
    dispatch({ type: 'CLEAR_ALL' });
  }

  function handleSortChange(key: string, direction: 'asc' | 'desc') {
    const apiKey = SORT_KEY_TO_API[key];
    if (!apiKey) return;
    setSortBy(apiKey);
    setSortDir(direction);
  }

  const columns = React.useMemo<DataTableColumn<EmployeePublic>[]>(
    () => buildColumns({ canViewSalary }),
    [canViewSalary],
  );

  const rowActions = React.useCallback(
    (employee: EmployeePublic): DataTableRowAction[] => {
      const items: DataTableRowAction[] = [
        { label: 'View profile', onClick: () => router.push(`/employees/${employee.id}`) },
        {
          label: 'View portal',
          onClick: () => router.push(`/employees/${employee.id}/portal`),
        },
        {
          label: 'Edit details',
          onClick: () => openSheet({ id: employee.id, employee }),
        },
        {
          label: 'Change status',
          onClick: () => router.push(`/employees/${employee.id}?action=change-status`),
        },
        {
          label: 'Change manager',
          onClick: () => router.push(`/employees/${employee.id}?action=change-manager`),
        },
        {
          label: 'Change salary',
          onClick: () => router.push(`/employees/${employee.id}?action=change-salary`),
        },
      ];
      if (canArchive) {
        items.push({
          label: 'Archive',
          variant: 'destructive',
          onClick: () => router.push(`/employees/${employee.id}?action=archive`),
        });
      }
      return items;
    },
    [router, canArchive],
  );

  const exportUrl = React.useMemo(() => buildExportUrl(filters), [filters]);

  return (
    <TooltipProvider delayDuration={200}>
      <AppShell breadcrumbs={[{ label: 'HR Core' }, { label: 'Employees' }]}>
        <div className="gap-fn-5 flex h-full flex-col">
          {/* Page header */}
          <div className="gap-fn-3 flex shrink-0 flex-wrap items-end justify-between">
            <div className="gap-fn-1_5 flex flex-col">
              <h1 className="text-fn-fg font-fn-semibold tracking-fn-tight text-[24px]">
                Employees
              </h1>
              <p className="text-fn-fg-muted text-[14px]">
                {statsQuery.data
                  ? `${statsQuery.data.totalHeadcount.toLocaleString()} ${statsQuery.data.totalHeadcount === 1 ? 'person' : 'people'} across ${statsQuery.data.distinctDepartments} ${statsQuery.data.distinctDepartments === 1 ? 'department' : 'departments'}. Manage profiles, salaries, and lifecycle.`
                  : ' '}
              </p>
            </div>
            <div className="gap-fn-2 flex items-center">
              {canImport && (
                <Button asChild variant="secondary" size="md">
                  <Link href="/employees/import">
                    <Upload className="h-fn-4 w-fn-4" /> Import CSV
                  </Link>
                </Button>
              )}
              {canExport && (
                <Button asChild variant="secondary" size="md">
                  <a href={exportUrl} target="_blank" rel="noreferrer">
                    <Download className="h-fn-4 w-fn-4" /> Export
                  </a>
                </Button>
              )}
              {canCreate && (
                <Button size="md" onClick={() => openSheet('create')}>
                  <Plus className="h-fn-4 w-fn-4" /> New employee
                </Button>
              )}
            </div>
          </div>

          {/* KPI strip */}
          <KpiStrip />

          {/* Table card — takes remaining vertical space; the DataTable
              inside it owns the scroll. `min-h-0` lets the flex child
              shrink below its content's natural size so the internal
              scroll actually engages instead of pushing main to scroll.
              The outer div owns the card chrome (border + rounded + bg)
              so the toolbar and the table share one continuous frame;
              the DataTable is rendered with chrome="plain" inside. */}
          <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs flex min-h-0 flex-1 flex-col overflow-hidden border">
            {/* Toolbar */}
            <div className="border-fn-divider gap-fn-2_5 px-fn-5 py-fn-3_5 flex shrink-0 flex-wrap items-center border-b">
              <div className="relative w-full max-w-[340px] flex-1">
                <Search className="text-fn-fg-faint left-fn-2_5 h-fn-3_5 w-fn-3_5 pointer-events-none absolute top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or EID…"
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
                {isFetching && !isLoading && (
                  <span className="text-fn-fg-faint text-[11.5px]">Refreshing…</span>
                )}
                <ViewToggle current={view} onChange={setView} />
              </div>
            </div>

            {/* Active-filter chips — owned by the AdvancedFilters store,
                so chips, drawer, URL, and presets all share one source
                of truth. ChipsBar self-hides when no filters are active. */}
            {activeFiltersCount > 0 && (
              <div className="px-fn-5 pt-fn-3">
                <ChipsBar schema={schema} />
              </div>
            )}

            {/* DataTable — owns the actual scroll, sticky header, infinite
                load mechanics, and all loading/empty/error states. */}
            <div className="min-h-0 flex-1">
              <DataTable<EmployeePublic>
                columns={columns}
                rows={rows}
                getRowKey={(r) => r.id}
                isLoading={isLoading}
                isError={isError && rows.length === 0}
                onRetry={() => refetch()}
                totalCount={totalCount}
                hasMore={hasNextPage}
                isFetchingMore={isFetchingNextPage}
                onLoadMore={() => fetchNextPage()}
                hasFetchMoreError={Boolean(nextPageError && rows.length > 0)}
                onRetryFetchMore={() => fetchNextPage()}
                onRowClick={(r) => router.push(`/employees/${r.id}`)}
                sortKey={API_TO_SORT_KEY[sortBy]}
                sortDirection={sortDir}
                onSortChange={handleSortChange}
                selectedRowKeys={selected}
                onSelectionChange={setSelected}
                rowActions={rowActions}
                emptyState={<EmptyState hasFilters={totalActiveCount > 0} canCreate={canCreate} />}
                chrome="plain"
              />
            </div>
          </div>
        </div>

        <BulkActionBar
          count={selected.length}
          canArchive={canArchive}
          onClear={() => setSelected([])}
          onExport={() => toast.info('Bulk export will land with the reports module.')}
          onArchive={() => toast.info('Bulk archive will land alongside the per-row workflow.')}
        />

        {/* The Create / Edit sheet lives at the page level so its open
            state survives DataTable re-renders and scroll resets. The
            list query auto-refreshes on save via onSuccess + the mutation's
            invalidation. */}
        <EmployeeFormSheet
          open={sheetState !== null}
          onOpenChange={(next) => {
            if (!next) closeSheet();
          }}
          mode={sheetState?.mode ?? 'create'}
          employee={sheetState?.mode === 'edit' ? sheetState.employee : undefined}
        />

        {/* Advanced Filters drawer — the entry point is the Filters
            button on the toolbar; the drawer itself lives here so its
            open state survives toolbar re-renders. */}
        <AdvancedFilters schema={schema} open={filterPanelOpen} onOpenChange={setFilterPanelOpen} />
      </AppShell>
    </TooltipProvider>
  );
}

/* ---------- Column definitions ---------- */

function buildColumns({
  canViewSalary,
}: {
  canViewSalary: boolean;
}): DataTableColumn<EmployeePublic>[] {
  const cols: DataTableColumn<EmployeePublic>[] = [
    {
      id: 'employee',
      header: 'Employee',
      width: 'auto',
      sortable: true,
      cell: (employee) => (
        <div className="gap-fn-3 flex items-center">
          <EmployeeAvatar fullName={employee.fullName} photoUrl={employee.photoUrl} size="md" />
          <div className="min-w-0">
            <div
              className={cn(
                'text-fn-fg font-fn-semibold leading-fn-tight truncate text-[14px]',
                employee.isArchived && 'line-through opacity-60',
              )}
            >
              {employee.fullName}
            </div>
            <div className="text-fn-fg-faint mt-fn-0_5 leading-fn-tight truncate font-mono text-[11.5px]">
              {employee.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'eid',
      header: 'EID',
      width: 130,
      sortable: true,
      cell: (employee) => (
        <span className="text-fn-fg-muted font-mono text-[12px] tabular-nums">{employee.eid}</span>
      ),
    },
    {
      id: 'department',
      header: 'Department',
      width: 130,
      cell: (employee) => (
        <span className="text-fn-fg-muted text-[13px]">{employee.department.name}</span>
      ),
    },
    {
      id: 'designation',
      header: 'Designation',
      width: 130,
      cell: (employee) => (
        <span className="text-fn-fg-muted text-[13px]">{employee.designation.name}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 130,
      cell: (employee) => <StatusPill status={employee.status} dot />,
    },
    {
      id: 'joinDate',
      header: 'Join date',
      width: 130,
      sortable: true,
      cell: (employee) => (
        <span className="text-fn-fg-muted text-[13px] tabular-nums">
          {formatJoinDate(employee.joinDate)}
        </span>
      ),
    },
  ];
  if (canViewSalary) {
    cols.push({
      id: 'salary',
      header: 'Salary / mo',
      width: 110,
      sortable: true,
      cell: (employee) =>
        employee.salaryPkr != null ? (
          <>
            <div className="text-fn-fg font-fn-semibold text-[13px] tabular-nums">
              {formatSalary(employee.salaryPkr)}
            </div>
            {employee.hasPayoneer && (
              <div className="text-fn-success-soft-fg mt-fn-0_5 font-fn-medium text-[10.5px]">
                Payoneer linked
              </div>
            )}
          </>
        ) : (
          <span className="text-fn-fg-faint">—</span>
        ),
    });
  }
  return cols;
}

/* ---------- View toggle ---------- */

function ViewToggle({ current, onChange }: { current: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="rounded-fn-xs border-fn-border-strong bg-fn-bg-subtle p-fn-0_5 flex border">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => onChange('list')}
            aria-label="List view"
            aria-pressed={current === 'list'}
            className={cn(
              'h-fn-7 w-fn-9 inline-flex cursor-pointer items-center justify-center rounded-[4px] transition-colors',
              current === 'list'
                ? 'bg-fn-bg-panel text-fn-fg shadow-fn-xs'
                : 'text-fn-fg-faint hover:text-fn-fg-muted',
            )}
          >
            <List className="h-fn-3_5 w-fn-3_5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          List view
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => onChange('grid')}
            aria-label="Grid view"
            aria-pressed={current === 'grid'}
            className={cn(
              'h-fn-7 w-fn-9 inline-flex cursor-pointer items-center justify-center rounded-[4px] transition-colors',
              current === 'grid'
                ? 'bg-fn-bg-panel text-fn-fg shadow-fn-xs'
                : 'text-fn-fg-faint hover:text-fn-fg-muted',
            )}
          >
            <LayoutGrid className="h-fn-3_5 w-fn-3_5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          Card view (coming soon)
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

/* ---------- Bulk action bar ---------- */

function BulkActionBar({
  count,
  canArchive,
  onClear,
  onExport,
  onArchive,
}: {
  count: number;
  canArchive: boolean;
  onClear: () => void;
  onExport: () => void;
  onArchive: () => void;
}) {
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label={`${count} employees selected`}
      className="rounded-fn-md border-fn-accent/30 bg-fn-bg-panel shadow-fn-lg animate-in fade-in-0 slide-in-from-bottom-fn-2 bottom-fn-6 gap-fn-3 px-fn-4 py-fn-2_5 fixed left-1/2 z-30 flex -translate-x-1/2 items-center border"
      style={{ background: 'color-mix(in oklch, var(--fn-accent-soft) 60%, var(--fn-bg-panel))' }}
    >
      <span className="text-fn-fg font-fn-semibold text-[13px]">
        {count.toLocaleString()} selected
      </span>
      <div className="bg-fn-divider h-fn-5 w-px" aria-hidden />
      <Button size="sm" variant="outline" onClick={onExport}>
        <Download className="h-fn-3_5 w-fn-3_5" /> Export selected
      </Button>
      {canArchive && (
        <Button size="sm" variant="outline" onClick={onArchive}>
          Archive selected
        </Button>
      )}
      <button
        type="button"
        onClick={onClear}
        className="text-fn-fg-muted hover:text-fn-fg ml-fn-1 gap-fn-1 font-fn-medium inline-flex cursor-pointer items-center text-[12.5px]"
      >
        <X className="h-fn-3 w-fn-3" /> Clear selection
      </button>
    </div>
  );
}

/* ---------- Empty state ---------- */

function EmptyState({ hasFilters, canCreate }: { hasFilters: boolean; canCreate: boolean }) {
  return (
    <div className="gap-fn-3 py-fn-14 flex flex-col items-center text-center">
      <div
        className="rounded-fn-lg h-fn-12 w-fn-12 flex items-center justify-center"
        style={{ background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)' }}
      >
        <UsersIcon className="h-fn-5 w-fn-5" />
      </div>
      <div className="gap-fn-1 flex flex-col">
        <p className="text-fn-fg font-fn-medium text-[14px]">
          {hasFilters ? 'No employees match your filters' : 'No employees yet'}
        </p>
        <p className="text-fn-fg-muted text-[13px]">
          {hasFilters
            ? 'Try clearing one of the filters or searching for someone else.'
            : 'Your team will appear here once added.'}
        </p>
      </div>
      {canCreate && (
        <Button asChild variant="outline" size="sm">
          <Link href="/employees?sheet=create">
            <Plus className="h-fn-3_5 w-fn-3_5" /> Add employee
          </Link>
        </Button>
      )}
    </div>
  );
}

/* ---------- Formatters ---------- */

function formatJoinDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getDate()} ${d.toLocaleString('en-GB', { month: 'short' })} ${d.getFullYear()}`;
  } catch {
    return iso.slice(0, 10);
  }
}

function formatSalary(value: number): string {
  return new Intl.NumberFormat('en-PK').format(Math.round(value));
}

function buildExportUrl(query: Partial<EmployeeListQuery>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    if (k === 'offset' || k === 'limit') continue;
    params.set(k, String(v));
  }
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  return `${base}/api/employees/export?${params.toString()}`;
}
