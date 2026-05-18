'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Archive,
  Briefcase as BriefcaseIcon,
  CalendarDays,
  CircleDot,
  Clock,
  Download,
  Building2 as DepartmentIcon,
  FileCheck,
  IdCard,
  LayoutGrid,
  List,
  Plus,
  Search,
  Upload,
  UserCog,
  Users as UsersIcon,
  Wallet,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  ContractType,
  EmployeeListQuery,
  EmployeePublic,
  EmployeeSortBy,
} from '@futurenostics/types';
import { AppShell } from '@/components/shell/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  FilterChipsBar,
  FilterDateRange,
  FilterMultiSelect,
  FilterPanel,
  FilterPanelTrigger,
  FilterPillGroup,
  FilterPresetsBar,
  FilterRangeSlider,
  FilterSearchableList,
  FilterSection,
  FilterToggleList,
  type SectionDescriptor,
} from '@/components/filters';
import { useFilterState } from '@/hooks/use-filter-state';
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
const CONTRACT_OPTIONS: ContractType[] = ['FullTime', 'PartTime', 'Contractor', 'Intern'];

type ViewMode = 'list' | 'grid';

/* ---------- Filter section option lists ---------- */

const COMPENSATION_OPTIONS = [
  {
    id: 'payoneer',
    label: 'Payoneer linked (USD payouts)',
    description: 'Earns commission via Payoneer',
  },
  { id: 'pkr-only', label: 'PKR salary only', description: 'Monthly payroll only' },
  {
    id: 'has-bonus',
    label: 'Has active bonus / advance',
    description: 'In-progress bonus or advance',
  },
  { id: 'has-loan', label: 'Has active loan', description: 'Outstanding loan balance' },
] as const;
const COMPENSATION_LABEL: Record<string, string> = Object.fromEntries(
  COMPENSATION_OPTIONS.map((o) => [o.id, o.label]),
);

const TENURE_OPTIONS = [
  { id: 'under-6m', label: 'Less than 6 months' },
  { id: '6m-1y', label: '6 months – 1 year' },
  { id: '1y-3y', label: '1 – 3 years' },
  { id: '3y-5y', label: '3 – 5 years' },
  { id: 'over-5y', label: 'Over 5 years' },
] as const;
const TENURE_LABEL: Record<string, string> = Object.fromEntries(
  TENURE_OPTIONS.map((o) => [o.id, o.label]),
);

const DOCUMENT_OPTIONS = [
  {
    id: 'cnic-expiring',
    label: 'CNIC expiring within 90 days',
    description: 'National ID needs renewal soon',
  },
  {
    id: 'missing-emergency',
    label: 'Missing emergency contact',
    description: 'No emergency contact on file',
  },
  {
    id: 'pending-policy',
    label: 'Pending policy acknowledgments',
    description: 'Unsigned employee handbook updates',
  },
] as const;
const DOCUMENTS_LABEL: Record<string, string> = Object.fromEntries(
  DOCUMENT_OPTIONS.map((o) => [o.id, o.label]),
);

const JOIN_DATE_PRESET_LABEL: Record<string, string> = {
  'last-30d': 'Last 30 days',
  'last-90d': 'Last 90 days',
  'this-year': 'This year',
  'last-year': 'Last year',
};

/** Deterministic OKLCH hue for a department slug, used by the
 *  filter-row colored dot. Falls back to a hashed hue for unknown
 *  slugs so every department gets a stable colour. */
const DEPT_HUES: Record<string, number> = {
  engineering: 280,
  'business-development': 175,
  operations: 145,
  hr: 22,
  finance: 220,
  design: 320,
  leadership: 295,
};
function deptHue(slug: string): number {
  if (DEPT_HUES[slug] != null) return DEPT_HUES[slug]!;
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 360;
}

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

export default function EmployeesListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const perms = usePermissions();
  const referencesQuery = useReferences();
  const statsQuery = useEmployeeStats();

  const canCreate = perms.has('employees:create');
  const canExport = perms.has('employees:export');
  const canImport = perms.has('employees:import');
  const canViewSalary = perms.has('employees:view_salary');
  const canSeeArchived = perms.has('employees:view_all');
  const canArchive = perms.has('employees:delete');

  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');

  // Advanced filters — every section from PNG 199–201:
  //   department / designation / status / contract     → multi
  //   salary (PKR)                                     → range
  //   joinedAt                                         → date-range
  //   manager (Reports to)                             → single
  //   compensation / tenure-bucket / documents         → toggles
  //   archived                                         → toggles (single)
  //
  // The Employees API still takes singular `departmentId / statusId /
  // contractType / managerId` query params today; until it grows
  // array support we send the FIRST selected id from each
  // multi-select. The UI honours the design's multi-select semantics
  // (chips accumulate, all chips show in the bar) and the URL +
  // presets round-trip correctly; only the API call is single-id.
  const filterUi = useFilterState({
    entity: 'employees',
    initial: {
      department: { kind: 'multi', ids: [] },
      designation: { kind: 'multi', ids: [] },
      status: { kind: 'multi', ids: [] },
      contract: { kind: 'multi', ids: [] },
      salary: { kind: 'range', min: null, max: null },
      joinedAt: { kind: 'date-range', preset: null, from: null, to: null },
      manager: { kind: 'single', id: null },
      compensation: { kind: 'toggles', ids: [] },
      tenure: { kind: 'toggles', ids: [] },
      documents: { kind: 'toggles', ids: [] },
      archived: { kind: 'toggles', ids: [] },
    },
  });

  const departmentIds =
    filterUi.state.department?.kind === 'multi' ? filterUi.state.department.ids : [];
  const designationIds =
    filterUi.state.designation?.kind === 'multi' ? filterUi.state.designation.ids : [];
  const statusIds = filterUi.state.status?.kind === 'multi' ? filterUi.state.status.ids : [];
  const contractTypes =
    filterUi.state.contract?.kind === 'multi'
      ? (filterUi.state.contract.ids as ContractType[])
      : [];
  const salaryRange =
    filterUi.state.salary?.kind === 'range'
      ? { min: filterUi.state.salary.min, max: filterUi.state.salary.max }
      : { min: null, max: null };
  const joinedAt =
    filterUi.state.joinedAt?.kind === 'date-range'
      ? filterUi.state.joinedAt
      : { kind: 'date-range' as const, preset: null, from: null, to: null };
  const managerId =
    filterUi.state.manager?.kind === 'single' ? (filterUi.state.manager.id ?? '') : '';
  const compensationToggles =
    filterUi.state.compensation?.kind === 'toggles' ? filterUi.state.compensation.ids : [];
  const tenureToggles = filterUi.state.tenure?.kind === 'toggles' ? filterUi.state.tenure.ids : [];
  const documentToggles =
    filterUi.state.documents?.kind === 'toggles' ? filterUi.state.documents.ids : [];
  const includeArchived =
    filterUi.state.archived?.kind === 'toggles'
      ? filterUi.state.archived.ids.includes('archived')
      : false;

  // API call uses the first id from each multi-select (single-id API).
  const departmentId = departmentIds[0] ?? '';
  const statusId = statusIds[0] ?? '';
  const contractType = contractTypes[0] ?? '';

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
  }, [debouncedSearch, departmentId, statusId, contractType, includeArchived]);

  const filters = React.useMemo(
    () => ({
      sortBy,
      sortDir,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(departmentId ? { departmentId } : {}),
      ...(statusId ? { statusId } : {}),
      ...(contractType ? { contractType } : {}),
      ...(managerId ? { managerId } : {}),
      includeArchived,
    }),
    [
      sortBy,
      sortDir,
      debouncedSearch,
      departmentId,
      statusId,
      contractType,
      managerId,
      includeArchived,
    ],
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

  const activeFilterCount =
    (debouncedSearch ? 1 : 0) +
    (departmentId ? 1 : 0) +
    (statusId ? 1 : 0) +
    (contractType ? 1 : 0) +
    (includeArchived ? 1 : 0);

  function clearFilters() {
    setSearch('');
    setDebouncedSearch('');
    filterUi.clearAll();
  }

  // Manager picker — single-page list (cap 200); the picker's own
  // search input narrows it down further. Declared here (before
  // `chipSections` below) because chipSections's renderChip for
  // 'manager' closes over it.
  const managerListQuery = useEmployeesList({ limit: 200 });
  const managerOptions = React.useMemo(
    () => managerListQuery.data?.items.map((e) => ({ id: e.id, fullName: e.fullName })) ?? [],
    [managerListQuery.data],
  );

  /* ---------- Advanced-filter chip descriptors ----------
   * One per section. Each knows how to render its active value as a
   * single chip text (used by FilterChipsBar above the table).
   */
  const chipSections: SectionDescriptor[] = React.useMemo(() => {
    return [
      {
        key: 'department',
        label: 'Department',
        renderChip: (v) => {
          if (!v || v.kind !== 'multi' || v.ids.length === 0) return null;
          const names = v.ids.map(
            (id) => referencesQuery.data?.departments.find((d) => d.id === id)?.name ?? id,
          );
          return names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`;
        },
      },
      {
        key: 'designation',
        label: 'Designation',
        renderChip: (v) => {
          if (!v || v.kind !== 'multi' || v.ids.length === 0) return null;
          const names = v.ids.map(
            (id) => referencesQuery.data?.designations.find((d) => d.id === id)?.name ?? id,
          );
          return names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`;
        },
      },
      {
        key: 'status',
        label: 'Status',
        renderChip: (v) => {
          if (!v || v.kind !== 'multi' || v.ids.length === 0) return null;
          const names = v.ids.map(
            (id) => referencesQuery.data?.statuses.find((s) => s.id === id)?.name ?? id,
          );
          return names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`;
        },
      },
      {
        key: 'contract',
        label: 'Contract',
        renderChip: (v) => {
          if (!v || v.kind !== 'multi' || v.ids.length === 0) return null;
          return v.ids.length === 1 ? v.ids[0] : `${v.ids[0]} +${v.ids.length - 1}`;
        },
      },
      {
        key: 'salary',
        label: 'Salary',
        renderChip: (v) => {
          if (!v || v.kind !== 'range') return null;
          if (v.min === null && v.max === null) return null;
          const fmt = (n: number) => `${Math.round(n / 1000)}k`;
          return `${v.min !== null ? fmt(v.min) : '0'}–${v.max !== null ? fmt(v.max) : 'max'} PKR`;
        },
      },
      {
        key: 'joinedAt',
        label: 'Joined',
        renderChip: (v) => {
          if (!v || v.kind !== 'date-range') return null;
          if (v.preset && v.preset !== 'custom') {
            return JOIN_DATE_PRESET_LABEL[v.preset] ?? v.preset;
          }
          if (!v.from && !v.to) return null;
          return `${v.from ?? '…'} → ${v.to ?? '…'}`;
        },
      },
      {
        key: 'manager',
        label: 'Reports to',
        renderChip: (v) => {
          if (!v || v.kind !== 'single' || !v.id) return null;
          return managerOptions.find((m) => m.id === v.id)?.fullName ?? v.id;
        },
      },
      {
        key: 'compensation',
        label: 'Compensation',
        renderChip: (v) => {
          if (!v || v.kind !== 'toggles' || v.ids.length === 0) return null;
          const labels = v.ids.map((id) => COMPENSATION_LABEL[id] ?? id);
          return labels.length === 1 ? labels[0] : `${labels[0]} +${labels.length - 1}`;
        },
      },
      {
        key: 'tenure',
        label: 'Tenure',
        renderChip: (v) => {
          if (!v || v.kind !== 'toggles' || v.ids.length === 0) return null;
          const labels = v.ids.map((id) => TENURE_LABEL[id] ?? id);
          return labels.length === 1 ? labels[0] : `${labels[0]} +${labels.length - 1}`;
        },
      },
      {
        key: 'documents',
        label: 'Documents',
        renderChip: (v) => {
          if (!v || v.kind !== 'toggles' || v.ids.length === 0) return null;
          const labels = v.ids.map((id) => DOCUMENTS_LABEL[id] ?? id);
          return labels.length === 1 ? labels[0] : `${labels[0]} +${labels.length - 1}`;
        },
      },
      {
        key: 'archived',
        label: 'Visibility',
        renderChip: (v) => {
          if (!v || v.kind !== 'toggles' || v.ids.length === 0) return null;
          return 'Include archived';
        },
      },
    ];
    // managerOptions referenced via the closure below; the chip text
    // it resolves is stable for the same id, so leaving it out of
    // deps is safe.
  }, [referencesQuery.data, managerOptions]);

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
              <FilterPanelTrigger
                onClick={() => setFilterPanelOpen(true)}
                activeCount={filterUi.activeCount}
              />

              {(filterUi.activeCount > 0 || debouncedSearch) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-fn-accent-soft-fg font-fn-semibold cursor-pointer text-[12.5px] hover:underline"
                >
                  Clear ({activeFilterCount})
                </button>
              )}

              <div className="gap-fn-2 ml-auto flex items-center">
                {isFetching && !isLoading && (
                  <span className="text-fn-fg-faint text-[11.5px]">Refreshing…</span>
                )}
                <ViewToggle current={view} onChange={setView} />
              </div>
            </div>

            {/* Active-filter chips — sit above the DataTable as soon as
                anything is applied. Clicking a chip's X clears that
                section. */}
            {filterUi.activeCount > 0 && (
              <div className="px-fn-5 pt-fn-3">
                <FilterChipsBar
                  state={filterUi.state}
                  sections={chipSections}
                  matchedCount={totalCount}
                  totalCount={totalCount}
                  onClearSection={filterUi.clearSection}
                  onClearAll={filterUi.clearAll}
                  onOpenPanel={() => setFilterPanelOpen(true)}
                />
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
                emptyState={<EmptyState hasFilters={activeFilterCount > 0} canCreate={canCreate} />}
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
        <FilterPanel
          open={filterPanelOpen}
          onOpenChange={setFilterPanelOpen}
          activeCount={filterUi.activeCount}
          matchedCount={totalCount}
          totalCount={statsQuery.data?.totalHeadcount ?? totalCount}
          entityNoun="employees"
          onClearAll={filterUi.clearAll}
          onSavePreset={() => {
            const name = window.prompt('Name this preset');
            if (name && name.trim()) filterUi.savePreset(name.trim());
          }}
          presetsSlot={
            <FilterPresetsBar
              presets={filterUi.presets}
              activeId={null}
              onApply={filterUi.applyPreset}
              onDelete={filterUi.deletePreset}
              onSaveCurrent={() => {
                const name = window.prompt('Name this preset');
                if (name && name.trim()) filterUi.savePreset(name.trim());
              }}
            />
          }
        >
          {/* 1. Department — multi-select with colored dots, matches PNG 199 */}
          <FilterSection
            icon={<DepartmentIcon className="h-fn-3_5 w-fn-3_5" />}
            title="Department"
            count={departmentIds.length}
            onClear={() => filterUi.clearSection('department')}
          >
            <FilterMultiSelect
              values={departmentIds}
              onValuesChange={(ids) => filterUi.setSection('department', { kind: 'multi', ids })}
              options={(referencesQuery.data?.departments ?? []).map((d) => ({
                id: d.id,
                label: d.name,
                hue: deptHue(d.slug),
              }))}
            />
          </FilterSection>

          {/* 2. Designation — searchable list, matches PNG 199 */}
          <FilterSection
            icon={<IdCard className="h-fn-3_5 w-fn-3_5" />}
            title="Designation"
            count={designationIds.length}
            onClear={() => filterUi.clearSection('designation')}
          >
            <FilterSearchableList
              placeholder="Search designations…"
              values={designationIds}
              onValuesChange={(ids) => filterUi.setSection('designation', { kind: 'multi', ids })}
              options={(referencesQuery.data?.designations ?? []).map((d) => ({
                id: d.id,
                label: d.name,
              }))}
            />
          </FilterSection>

          {/* 3. Status — multi pill chips with warning tone, matches PNG 199 */}
          <FilterSection
            icon={<CircleDot className="h-fn-3_5 w-fn-3_5" />}
            title="Status"
            count={statusIds.length}
            onClear={() => filterUi.clearSection('status')}
          >
            <FilterPillGroup
              mode="multi"
              activeTone="warning"
              values={statusIds}
              onValuesChange={(ids) => filterUi.setSection('status', { kind: 'multi', ids })}
              options={(referencesQuery.data?.statuses ?? []).map((s) => ({
                id: s.id,
                label: s.name,
              }))}
            />
          </FilterSection>

          {/* 4. Contract type — multi pill chips */}
          <FilterSection
            icon={<BriefcaseIcon className="h-fn-3_5 w-fn-3_5" />}
            title="Contract type"
            count={contractTypes.length}
            onClear={() => filterUi.clearSection('contract')}
          >
            <FilterPillGroup
              mode="multi"
              values={contractTypes}
              onValuesChange={(ids) => filterUi.setSection('contract', { kind: 'multi', ids })}
              options={CONTRACT_OPTIONS.map((c) => ({ id: c, label: c }))}
            />
          </FilterSection>

          {/* 5. Monthly Salary (PKR) — range slider, matches PNG 199 */}
          {canViewSalary && (
            <FilterSection
              icon={<Wallet className="h-fn-3_5 w-fn-3_5" />}
              title="Monthly salary (PKR)"
              count={salaryRange.min !== null || salaryRange.max !== null ? 1 : 0}
              onClear={() => filterUi.clearSection('salary')}
            >
              <FilterRangeSlider
                min={0}
                max={2_000_000}
                step={5_000}
                value={salaryRange}
                onValueChange={(next) => filterUi.setSection('salary', { kind: 'range', ...next })}
                formatValue={(n) => `Rs ${n.toLocaleString()}`}
                unitNote="monthly"
                inputSuffix="MIN"
              />
            </FilterSection>
          )}

          {/* 6. Joining Date — preset chips + date inputs, matches PNG 199 + PNG 201 */}
          <FilterSection
            icon={<CalendarDays className="h-fn-3_5 w-fn-3_5" />}
            title="Joining date"
            count={joinedAt.preset || joinedAt.from || joinedAt.to ? 1 : 0}
            onClear={() => filterUi.clearSection('joinedAt')}
          >
            <FilterDateRange
              value={{ preset: joinedAt.preset, from: joinedAt.from, to: joinedAt.to }}
              onValueChange={(next) =>
                filterUi.setSection('joinedAt', { kind: 'date-range', ...next })
              }
            />
          </FilterSection>

          {/* 7. Reports To — searchable picker, matches PNG 199 (collapsed) */}
          <FilterSection
            icon={<UserCog className="h-fn-3_5 w-fn-3_5" />}
            title="Reports to"
            count={managerId ? 1 : 0}
            onClear={() => filterUi.clearSection('manager')}
          >
            <FilterSearchableList
              placeholder="Search managers…"
              values={managerId ? [managerId] : []}
              onValuesChange={(ids) =>
                filterUi.setSection('manager', { kind: 'single', id: ids[0] ?? null })
              }
              options={managerOptions.map((m) => ({ id: m.id, label: m.fullName }))}
            />
          </FilterSection>

          {/* 8. Compensation — toggle list, matches PNG 199 */}
          {canViewSalary && (
            <FilterSection
              icon={<Wallet className="h-fn-3_5 w-fn-3_5" />}
              title="Compensation"
              count={compensationToggles.length}
              onClear={() => filterUi.clearSection('compensation')}
            >
              <FilterToggleList
                options={[...COMPENSATION_OPTIONS]}
                values={compensationToggles}
                onValuesChange={(ids) =>
                  filterUi.setSection('compensation', { kind: 'toggles', ids })
                }
              />
            </FilterSection>
          )}

          {/* 9. Tenure — toggle list, matches PNG 200 (collapsed by default) */}
          <FilterSection
            icon={<Clock className="h-fn-3_5 w-fn-3_5" />}
            title="Tenure"
            count={tenureToggles.length}
            onClear={() => filterUi.clearSection('tenure')}
          >
            <FilterToggleList
              options={[...TENURE_OPTIONS]}
              values={tenureToggles}
              onValuesChange={(ids) => filterUi.setSection('tenure', { kind: 'toggles', ids })}
            />
          </FilterSection>

          {/* 10. Documents & Compliance — toggle list, matches PNG 200 */}
          <FilterSection
            icon={<FileCheck className="h-fn-3_5 w-fn-3_5" />}
            title="Documents & compliance"
            count={documentToggles.length}
            onClear={() => filterUi.clearSection('documents')}
          >
            <FilterToggleList
              options={[...DOCUMENT_OPTIONS]}
              values={documentToggles}
              onValuesChange={(ids) => filterUi.setSection('documents', { kind: 'toggles', ids })}
            />
          </FilterSection>

          {/* 11. Visibility — archived toggle (HR / Super Admin only) */}
          {canSeeArchived && (
            <FilterSection
              icon={<Archive className="h-fn-3_5 w-fn-3_5" />}
              title="Visibility"
              count={includeArchived ? 1 : 0}
              onClear={() => filterUi.clearSection('archived')}
            >
              <FilterToggleList
                options={[
                  {
                    id: 'archived',
                    label: 'Include archived employees',
                    description:
                      'Archived employees keep their data + history but are hidden from the default list.',
                  },
                ]}
                values={includeArchived ? ['archived'] : []}
                onValuesChange={(ids) => filterUi.setSection('archived', { kind: 'toggles', ids })}
              />
            </FilterSection>
          )}
        </FilterPanel>
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
