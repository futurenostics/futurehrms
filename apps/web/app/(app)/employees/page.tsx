'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  LayoutGrid,
  List,
  MoreHorizontal,
  Plus,
  Search,
  Upload,
  Users as UsersIcon,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ContractType, EmployeeListQuery, EmployeePublic } from '@futurenostics/types';
import { AppShell } from '@/components/shell/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { StatusPill } from '@/components/employees/status-pill';
import { EmployeeAvatar } from '@/components/employees/employee-avatar';
import { KpiStrip } from '@/components/employees/kpi-strip';
import { useEmployeesList, useEmployeeStats, useReferences } from '@/lib/queries/employees';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

const DEFAULT_PAGE_SIZE = 25;
const CONTRACT_OPTIONS: ContractType[] = ['FullTime', 'PartTime', 'Contractor', 'Intern'];

type ViewMode = 'list' | 'grid';

export default function EmployeesListPage() {
  const router = useRouter();
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
  const [departmentId, setDepartmentId] = React.useState<string>('');
  const [statusId, setStatusId] = React.useState<string>('');
  const [contractType, setContractType] = React.useState<ContractType | ''>('');
  const [includeArchived, setIncludeArchived] = React.useState(false);

  const [page, setPage] = React.useState(1);
  const [sortBy, setSortBy] = React.useState<EmployeeListQuery['sortBy']>('joinDate');
  const [sortDir, setSortDir] = React.useState<EmployeeListQuery['sortDir']>('desc');

  const [view, setView] = React.useState<ViewMode>('list');
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(id);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [debouncedSearch, departmentId, statusId, contractType, includeArchived]);

  const query: Partial<EmployeeListQuery> = {
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy,
    sortDir,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(departmentId ? { departmentId } : {}),
    ...(statusId ? { statusId } : {}),
    ...(contractType ? { contractType } : {}),
    includeArchived,
  };
  const { data, isLoading, isError, error, refetch, isFetching } = useEmployeesList(query);

  const activeFilterCount =
    (debouncedSearch ? 1 : 0) +
    (departmentId ? 1 : 0) +
    (statusId ? 1 : 0) +
    (contractType ? 1 : 0) +
    (includeArchived ? 1 : 0);

  function clearFilters() {
    setSearch('');
    setDebouncedSearch('');
    setDepartmentId('');
    setStatusId('');
    setContractType('');
    setIncludeArchived(false);
  }

  function toggleSort(column: EmployeeListQuery['sortBy']) {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir(column === 'joinDate' ? 'desc' : 'asc');
    }
  }

  const departments = referencesQuery.data?.departments ?? [];
  const statuses = referencesQuery.data?.statuses ?? [];
  const selectedDepartment = departments.find((d) => d.id === departmentId);
  const selectedStatus = statuses.find((s) => s.id === statusId);

  const rows = data?.data ?? [];
  const pageIds = rows.map((r) => r.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPageSelected = pageIds.some((id) => selected.has(id));

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <AppShell breadcrumbs={[{ label: 'HR Core' }, { label: 'Employees' }]}>
        <div className="gap-fn-5 flex flex-col">
          {/* Page header */}
          <div className="gap-fn-3 flex flex-wrap items-end justify-between">
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
                <Button asChild variant="outline" size="md">
                  <Link href="/employees/import">
                    <Upload className="h-fn-4 w-fn-4" /> Import CSV
                  </Link>
                </Button>
              )}
              {canExport && (
                <Button asChild variant="outline" size="md">
                  <a href={buildExportUrl(query)} target="_blank" rel="noreferrer">
                    <Download className="h-fn-4 w-fn-4" /> Export
                  </a>
                </Button>
              )}
              {canCreate && (
                <Button asChild size="md">
                  <Link href="/employees/new">
                    <Plus className="h-fn-4 w-fn-4" /> New employee
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* KPI strip */}
          <KpiStrip />

          {/* Table card */}
          <div className="rounded-fn-xs border-fn-border bg-fn-bg-panel shadow-fn-sm overflow-hidden border">
            {/* Toolbar */}
            <div className="border-fn-divider gap-fn-2_5 px-fn-5 py-fn-3_5 flex flex-wrap items-center border-b">
              <div className="relative w-full max-w-[340px] flex-1">
                <Search className="text-fn-fg-faint left-fn-2_5 h-fn-3_5 w-fn-3_5 pointer-events-none absolute top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or EID…"
                  className="pl-fn-8"
                />
              </div>
              <div className="border-fn-divider mx-fn-1 h-fn-6 border-l" aria-hidden />

              <FilterPill
                label="Department"
                value={selectedDepartment?.name ?? 'All'}
                active={Boolean(departmentId)}
              >
                <PillSelect
                  options={[
                    { id: '', label: 'All departments' },
                    ...departments.map((d) => ({ id: d.id, label: d.name })),
                  ]}
                  current={departmentId}
                  onPick={setDepartmentId}
                />
              </FilterPill>

              <FilterPill
                label="Status"
                value={selectedStatus?.name ?? 'All'}
                active={Boolean(statusId)}
              >
                <PillSelect
                  options={[
                    { id: '', label: 'All statuses' },
                    ...statuses.map((s) => ({ id: s.id, label: s.name })),
                  ]}
                  current={statusId}
                  onPick={setStatusId}
                />
              </FilterPill>

              <FilterPill
                label="Contract"
                value={contractType || 'All'}
                active={Boolean(contractType)}
              >
                <PillSelect
                  options={[
                    { id: '', label: 'All contracts' },
                    ...CONTRACT_OPTIONS.map((c) => ({ id: c, label: c })),
                  ]}
                  current={contractType}
                  onPick={(v) => setContractType(v as ContractType | '')}
                />
              </FilterPill>

              {activeFilterCount > 0 && (
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
                {canSeeArchived && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Filter className="h-fn-3_5 w-fn-3_5" /> More filters
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-fn-64">
                      <div className="gap-fn-3 flex flex-col">
                        <div className="text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight text-[11px] uppercase">
                          Visibility
                        </div>
                        <label className="text-fn-fg gap-fn-2_5 inline-flex cursor-pointer items-center text-[13px]">
                          <Checkbox
                            checked={includeArchived}
                            onCheckedChange={(v) => setIncludeArchived(v === true)}
                          />
                          Include archived employees
                        </label>
                        <p className="text-fn-fg-muted leading-fn-relaxed text-[11.5px]">
                          Archived employees keep their data and history but are hidden from the
                          default list.
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                <ViewToggle current={view} onChange={setView} />
              </div>
            </div>

            {/* Table */}
            <div className="p-fn-3_5">
              <table className="w-full table-fixed border-collapse text-[13px]">
                <colgroup>
                  <col style={{ width: 48 }} />
                  <col />
                  <col style={{ width: 130 }} />
                  <col style={{ width: 140 }} />
                  <col style={{ width: 160 }} />
                  <col style={{ width: 130 }} />
                  <col style={{ width: 140 }} />
                  {canViewSalary && <col style={{ width: 160 }} />}
                  <col style={{ width: 44 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th colSpan={canViewSalary ? 9 : 8} className="p-0">
                      <div className="rounded-fn-sm bg-fn-bg-subtle mt-fn-1">
                        <table className="w-full table-fixed border-collapse">
                          <colgroup>
                            <col style={{ width: 48 }} />
                            <col />
                            <col style={{ width: 130 }} />
                            <col style={{ width: 140 }} />
                            <col style={{ width: 160 }} />
                            <col style={{ width: 130 }} />
                            <col style={{ width: 140 }} />
                            {canViewSalary && <col style={{ width: 160 }} />}
                            <col style={{ width: 44 }} />
                          </colgroup>
                          <tbody>
                            <tr>
                              <td className="py-fn-3 pl-[18px] pr-0 align-middle">
                                <Checkbox
                                  checked={
                                    allOnPageSelected
                                      ? true
                                      : someOnPageSelected
                                        ? 'indeterminate'
                                        : false
                                  }
                                  onCheckedChange={() => toggleSelectAll()}
                                  aria-label={allOnPageSelected ? 'Deselect all' : 'Select all'}
                                />
                              </td>
                              <Th
                                sortable
                                active={sortBy === 'fullName'}
                                dir={sortDir}
                                onSort={() => toggleSort('fullName')}
                              >
                                Employee
                              </Th>
                              <Th
                                sortable
                                active={sortBy === 'eid'}
                                dir={sortDir}
                                onSort={() => toggleSort('eid')}
                              >
                                EID
                              </Th>
                              <Th>Department</Th>
                              <Th>Designation</Th>
                              <Th>Status</Th>
                              <Th
                                sortable
                                active={sortBy === 'joinDate'}
                                dir={sortDir}
                                onSort={() => toggleSort('joinDate')}
                              >
                                Join date
                              </Th>
                              {canViewSalary && (
                                <Th
                                  align="right"
                                  sortable
                                  active={sortBy === 'salaryPkr'}
                                  dir={sortDir}
                                  onSort={() => toggleSort('salaryPkr')}
                                >
                                  Salary / mo
                                </Th>
                              )}
                              <td />
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && <SkeletonRows columns={canViewSalary ? 9 : 8} />}
                  {!isLoading && isError && (
                    <tr>
                      <td colSpan={canViewSalary ? 9 : 8}>
                        <div className="text-fn-fg-muted gap-fn-2 py-fn-10 flex flex-col items-center text-center text-[13px]">
                          <p>
                            Couldn't load employees: {(error as Error)?.message ?? 'unknown error'}
                          </p>
                          <Button variant="outline" size="sm" onClick={() => refetch()}>
                            Retry
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {!isLoading && !isError && data && data.data.length === 0 && (
                    <tr>
                      <td colSpan={canViewSalary ? 9 : 8}>
                        <EmptyState hasFilters={activeFilterCount > 0} canCreate={canCreate} />
                      </td>
                    </tr>
                  )}
                  {!isLoading &&
                    rows.map((emp, idx) => (
                      <EmployeeRow
                        key={emp.id}
                        employee={emp}
                        canViewSalary={canViewSalary}
                        canArchive={canArchive}
                        isSelected={selected.has(emp.id)}
                        bordered={idx < rows.length - 1}
                        onToggle={() => toggleRow(emp.id)}
                        onOpen={() => router.push(`/employees/${emp.id}`)}
                      />
                    ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.meta.total > 0 && (
              <Pagination
                page={page}
                totalPages={data.meta.totalPages}
                total={data.meta.total}
                pageSize={data.meta.pageSize}
                onChange={setPage}
              />
            )}
          </div>
        </div>

        <BulkActionBar
          count={selected.size}
          canArchive={canArchive}
          onClear={() => setSelected(new Set())}
          onExport={() => toast.info('Bulk export will land with the reports module.')}
          onArchive={() => toast.info('Bulk archive will land alongside the per-row workflow.')}
        />
      </AppShell>
    </TooltipProvider>
  );
}

/* ---------- Header cells ---------- */

interface ThProps {
  children: React.ReactNode;
  align?: 'left' | 'right';
  sortable?: boolean;
  active?: boolean;
  dir?: 'asc' | 'desc';
  onSort?: () => void;
}

function Th({ children, align = 'left', sortable, active, dir, onSort }: ThProps) {
  // Header spec from docs/design/shared/primitives.jsx InsetTable +
  // screens/employees.jsx ThCol: 11px / weight 500 / uppercase /
  // tracking 0.08em / muted color / 12px x 12px padding. First and
  // last header cells get edge-inset 18px / 14px padding via row-level
  // overrides; standard cells use 12px both sides.
  return (
    <td
      className={cn(
        'text-fn-fg-muted px-fn-3 py-fn-3 font-fn-medium text-[11px] uppercase tracking-[0.08em]',
        align === 'right' ? 'text-right' : 'text-left',
      )}
    >
      <button
        type="button"
        onClick={sortable ? onSort : undefined}
        disabled={!sortable}
        className={cn(
          'inline-flex items-center gap-[5px] transition-colors',
          align === 'right' && 'flex-row-reverse',
          sortable && 'hover:text-fn-fg cursor-pointer',
          active && 'text-fn-fg',
        )}
      >
        <span>{children}</span>
        {sortable &&
          active &&
          (dir === 'asc' ? (
            <ArrowUp className="h-fn-3 w-fn-3 opacity-60" />
          ) : (
            <ArrowDown className="h-fn-3 w-fn-3 opacity-60" />
          ))}
      </button>
    </td>
  );
}

/* ---------- Body row ---------- */

interface EmployeeRowProps {
  employee: EmployeePublic;
  canViewSalary: boolean;
  canArchive: boolean;
  isSelected: boolean;
  bordered: boolean;
  onToggle: () => void;
  onOpen: () => void;
}

function EmployeeRow({
  employee,
  canViewSalary,
  canArchive,
  isSelected,
  bordered,
  onToggle,
  onOpen,
}: EmployeeRowProps) {
  // Cell padding spec (docs/design/screens/employees.jsx Td function):
  //   first cell  → 12px 0 12px 18px
  //   last cell   → 12px 14px 12px 4px
  //   default     → 12px 12px (px-fn-3 py-fn-3)
  //
  // The Employee cell additionally renders the 36px avatar + name +
  // email block which pushes the row to ~70px tall — that's the row
  // rhythm the design intends. Other cells inherit that height
  // automatically through align-middle.
  const cellBorder = bordered ? 'border-b border-fn-divider' : '';
  return (
    <tr
      onClick={onOpen}
      data-state={isSelected ? 'selected' : undefined}
      className={cn(
        'hover:bg-fn-bg-subtle cursor-pointer transition-colors',
        isSelected && 'bg-fn-accent-soft/30',
        employee.isArchived && 'opacity-60',
      )}
    >
      <td
        className={cn('py-fn-3 pl-[18px] pr-0 align-middle', cellBorder)}
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          aria-label={`Select ${employee.fullName}`}
        />
      </td>
      <td className={cn('px-fn-3 align-middle', cellBorder)}>
        {/* Inner wrapper holds the row-rhythm pad (12px top/bottom) so
            the cell border tracks the row, not the avatar block. */}
        <div className="gap-fn-3 py-fn-3 flex items-center">
          <EmployeeAvatar fullName={employee.fullName} photoUrl={employee.photoUrl} size="md" />
          <div className="min-w-0">
            <div
              className={cn(
                'text-fn-fg font-fn-semibold leading-fn-tight truncate text-[14px]',
                employee.isArchived && 'line-through',
              )}
            >
              {employee.fullName}
            </div>
            <div className="text-fn-fg-faint mt-fn-0_5 leading-fn-tight truncate font-mono text-[11.5px]">
              {employee.email}
            </div>
          </div>
        </div>
      </td>
      <td className={cn('px-fn-3 py-fn-3 align-middle', cellBorder)}>
        <span className="text-fn-fg-muted font-mono text-[12px] tabular-nums">{employee.eid}</span>
      </td>
      <td className={cn('text-fn-fg-muted px-fn-3 py-fn-3 align-middle text-[13px]', cellBorder)}>
        {employee.department.name}
      </td>
      <td className={cn('text-fn-fg-muted px-fn-3 py-fn-3 align-middle text-[13px]', cellBorder)}>
        {employee.designation.name}
      </td>
      <td className={cn('px-fn-3 py-fn-3 align-middle', cellBorder)}>
        <StatusPill status={employee.status} dot />
      </td>
      <td
        className={cn(
          'text-fn-fg-muted px-fn-3 py-fn-3 align-middle text-[13px] tabular-nums',
          cellBorder,
        )}
      >
        {formatJoinDate(employee.joinDate)}
      </td>
      {canViewSalary && (
        <td className={cn('px-fn-3 py-fn-3 text-right align-middle', cellBorder)}>
          {employee.salaryPkr != null ? (
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
          )}
        </td>
      )}
      <td
        className={cn('py-fn-3 pl-fn-1 pr-[14px] text-right align-middle', cellBorder)}
        onClick={(e) => e.stopPropagation()}
      >
        <RowKebabMenu employee={employee} canArchive={canArchive} />
      </td>
    </tr>
  );
}

function RowKebabMenu({ employee, canArchive }: { employee: EmployeePublic; canArchive: boolean }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${employee.fullName}`}
          className="rounded-fn-xs text-fn-fg-faint hover:bg-fn-bg-inset hover:text-fn-fg-muted focus-visible:ring-fn-accent h-fn-7 w-fn-7 inline-flex cursor-pointer items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2"
        >
          <MoreHorizontal className="h-fn-4 w-fn-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-fn-52">
        <DropdownMenuItem onClick={() => router.push(`/employees/${employee.id}`)}>
          View profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/employees/${employee.id}/edit`)}>
          Edit details
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push(`/employees/${employee.id}?action=change-status`)}
        >
          Change status
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push(`/employees/${employee.id}?action=change-manager`)}
        >
          Change manager
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push(`/employees/${employee.id}?action=change-salary`)}
        >
          Change salary
        </DropdownMenuItem>
        {canArchive && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push(`/employees/${employee.id}?action=archive`)}
              className="text-fn-danger focus:text-fn-danger"
            >
              Archive
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------- Filter pill ---------- */

function FilterPill({
  label,
  value,
  active,
  children,
}: {
  label: string;
  value: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'rounded-fn-xs gap-fn-1_5 px-fn-3 font-fn-medium inline-flex h-[34px] cursor-pointer items-center border text-[13px] transition-colors',
            active
              ? 'border-fn-accent/30 bg-fn-accent-soft text-fn-accent-soft-fg'
              : 'border-fn-border-strong bg-fn-bg-panel text-fn-fg-muted hover:border-fn-fg-faint',
          )}
        >
          <span
            className={cn('font-fn-medium', active ? 'text-fn-accent-soft-fg' : 'text-fn-fg-faint')}
          >
            {label}
          </span>
          <span>{value}</span>
          <ChevronDown className="h-fn-3 w-fn-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-fn-56 p-fn-1">
        {children}
      </PopoverContent>
    </Popover>
  );
}

function PillSelect({
  options,
  current,
  onPick,
}: {
  options: Array<{ id: string; label: string }>;
  current: string;
  onPick: (value: string) => void;
}) {
  return (
    <div className="flex max-h-[280px] flex-col overflow-y-auto">
      {options.map((opt) => {
        const active = opt.id === current;
        return (
          <button
            key={opt.id || '__all__'}
            type="button"
            onClick={() => onPick(opt.id)}
            className={cn(
              'rounded-fn-xs px-fn-2 py-fn-1_5 flex cursor-pointer items-center justify-between text-left text-[13px] transition-colors',
              active
                ? 'bg-fn-accent-soft text-fn-accent-soft-fg font-fn-medium'
                : 'text-fn-fg hover:bg-fn-bg-inset',
            )}
          >
            <span>{opt.label}</span>
            {active && (
              <span className="tracking-fn-uppercase-tight text-[10.5px] uppercase">Active</span>
            )}
          </button>
        );
      })}
    </div>
  );
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

/* ---------- Pagination ---------- */

function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (next: number) => void;
}) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = visiblePages(page, totalPages);
  return (
    <div className="border-fn-divider text-fn-fg-muted px-fn-5 py-fn-3_5 flex items-center justify-between border-t text-[13px]">
      <div className="tabular-nums">
        Showing{' '}
        <strong className="text-fn-fg font-fn-semibold">
          {from}–{to}
        </strong>{' '}
        of {total.toLocaleString()}
      </div>
      <div className="gap-fn-1 flex items-center">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-fn-xs text-fn-fg-muted hover:bg-fn-bg-inset gap-fn-1 px-fn-2_5 font-fn-medium inline-flex h-[30px] cursor-pointer items-center text-[12.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="h-fn-3 w-fn-3" /> Prev
        </button>
        {pages.map((p, i) =>
          typeof p === 'number' ? (
            <button
              key={i}
              type="button"
              onClick={() => onChange(p)}
              className={cn(
                'rounded-fn-xs inline-flex h-[30px] w-[30px] cursor-pointer items-center justify-center text-[12.5px] transition-colors',
                p === page
                  ? 'bg-fn-accent text-fn-accent-fg font-fn-semibold'
                  : 'text-fn-fg-muted hover:bg-fn-bg-inset',
              )}
            >
              {p}
            </button>
          ) : (
            <span
              key={i}
              className="text-fn-fg-faint inline-flex h-[30px] w-[30px] items-center justify-center"
            >
              …
            </span>
          ),
        )}
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-fn-xs text-fn-fg-muted hover:bg-fn-bg-inset gap-fn-1 px-fn-2_5 font-fn-medium inline-flex h-[30px] cursor-pointer items-center text-[12.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next <ChevronRight className="h-fn-3 w-fn-3" />
        </button>
      </div>
    </div>
  );
}

function visiblePages(page: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set<number>([1, total, page, page - 1, page + 1]);
  const sorted = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: Array<number | '…'> = [];
  for (let i = 0; i < sorted.length; i += 1) {
    out.push(sorted[i]!);
    if (i < sorted.length - 1 && sorted[i + 1]! - sorted[i]! > 1) {
      out.push('…');
    }
  }
  return out;
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

/* ---------- Skeleton + empty ---------- */

function SkeletonRows({ columns }: { columns: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-fn-divider border-b last:border-b-0">
          <td className="py-fn-4 pl-[18px] pr-0">
            <Skeleton className="h-fn-4 w-fn-4 rounded-[4px]" />
          </td>
          <td className="px-fn-3 py-fn-4">
            <div className="gap-fn-3 flex items-center">
              <Skeleton className="h-fn-9 w-fn-9 rounded-[8px]" />
              <div className="gap-fn-1_5 flex flex-col">
                <Skeleton className="h-fn-3 w-fn-36" />
                <Skeleton className="h-fn-2_5 w-fn-24" />
              </div>
            </div>
          </td>
          {Array.from({ length: columns - 2 }).map((__, j) => (
            <td key={j} className="px-fn-3 py-fn-4">
              <Skeleton className="h-fn-3 w-fn-20" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

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
        <p className="text-fn-fg font-fn-medium text-[14px]">No employees match your filters</p>
        <p className="text-fn-fg-muted text-[13px]">
          {hasFilters
            ? 'Try clearing one of the filters or searching for someone else.'
            : 'Your team will appear here once added.'}
        </p>
      </div>
      {canCreate && (
        <Button asChild variant="outline" size="sm">
          <Link href="/employees/new">
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
    if (k === 'page' || k === 'pageSize') continue;
    params.set(k, String(v));
  }
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  return `${base}/api/employees/export?${params.toString()}`;
}
