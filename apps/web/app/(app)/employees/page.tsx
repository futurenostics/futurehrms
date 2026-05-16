'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Search,
  Upload,
  Users as UsersIcon,
} from 'lucide-react';
import type { EmployeeListQuery, EmployeePublic } from '@futurenostics/types';
import { AppShell } from '@/components/shell/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusPill } from '@/components/employees/status-pill';
import { EmployeeAvatar } from '@/components/employees/employee-avatar';
import { useEmployeesList, useReferences } from '@/lib/queries/employees';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

const DEFAULT_PAGE_SIZE = 25;

export default function EmployeesListPage() {
  const router = useRouter();
  const perms = usePermissions();
  const referencesQuery = useReferences();

  const canCreate = perms.has('employees:create');
  const canExport = perms.has('employees:export');
  const canImport = perms.has('employees:import');
  const canSeeArchived = perms.has('employees:view_all');

  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [departmentId, setDepartmentId] = React.useState<string>('');
  const [statusId, setStatusId] = React.useState<string>('');
  const [includeArchived, setIncludeArchived] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [sortBy, setSortBy] = React.useState<EmployeeListQuery['sortBy']>('fullName');
  const [sortDir, setSortDir] = React.useState<EmployeeListQuery['sortDir']>('asc');

  // Debounce the search field so we don't fire a request per keystroke.
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(id);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, departmentId, statusId, includeArchived]);

  const query: Partial<EmployeeListQuery> = {
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy,
    sortDir,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(departmentId ? { departmentId } : {}),
    ...(statusId ? { statusId } : {}),
    includeArchived,
  };
  const { data, isLoading, isError, error, refetch, isFetching } = useEmployeesList(query);

  function toggleSort(column: EmployeeListQuery['sortBy']) {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  }

  return (
    <AppShell breadcrumbs={[{ label: 'HR Core' }, { label: 'Employees' }]}>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-fn-fg text-[22px] font-semibold tracking-tight">Employees</h1>
            <p className="text-fn-fg-muted text-[13px]">
              {data?.meta.total !== undefined
                ? `${data.meta.total.toLocaleString()} employee${data.meta.total === 1 ? '' : 's'}`
                : 'Loading…'}
              {includeArchived ? ' · including archived' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canImport && (
              <Button asChild variant="outline" size="md">
                <Link href="/employees/import">
                  <Upload className="h-4 w-4" /> Import
                </Link>
              </Button>
            )}
            {canExport && (
              <Button asChild variant="outline" size="md">
                <a href={buildExportUrl(query)} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4" /> Export CSV
                </a>
              </Button>
            )}
            {canCreate && (
              <Button asChild size="md">
                <Link href="/employees/new">
                  <Plus className="h-4 w-4" /> Add employee
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="rounded-fn-lg border-fn-border bg-fn-bg-panel flex flex-wrap items-center gap-2 border p-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="text-fn-fg-faint pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or EID…"
              className="pl-8"
            />
          </div>
          <Select
            value={departmentId || 'all'}
            onValueChange={(v) => setDepartmentId(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {referencesQuery.data?.departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusId || 'all'}
            onValueChange={(v) => setStatusId(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {referencesQuery.data?.statuses.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canSeeArchived && (
            <label className="text-fn-fg-muted inline-flex cursor-pointer items-center gap-2 text-[12.5px]">
              <Checkbox
                checked={includeArchived}
                onCheckedChange={(v) => setIncludeArchived(v === true)}
              />
              Include archived
            </label>
          )}
          {isFetching && !isLoading && (
            <span className="text-fn-fg-faint ml-auto text-[11.5px]">Refreshing…</span>
          )}
        </div>

        {/* Table */}
        <div className="rounded-fn-lg border-fn-border bg-fn-bg-panel shadow-fn-sm overflow-hidden border">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader
                  label="Employee"
                  column="fullName"
                  current={sortBy}
                  direction={sortDir}
                  onSort={toggleSort}
                />
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Manager</TableHead>
                <SortableHeader
                  label="Joined"
                  column="joinDate"
                  current={sortBy}
                  direction={sortDir}
                  onSort={toggleSort}
                  align="right"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <SkeletonRows />}
              {!isLoading && isError && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="text-fn-fg-muted flex flex-col items-center gap-2 py-10 text-center text-[13px]">
                      <p>Couldn't load employees: {(error as Error)?.message ?? 'unknown error'}</p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Retry
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && data && data.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      hasFilters={Boolean(debouncedSearch || departmentId || statusId)}
                      canCreate={canCreate}
                    />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                data?.data.map((emp) => (
                  <EmployeeRow
                    key={emp.id}
                    employee={emp}
                    onOpen={() => router.push(`/employees/${emp.id}`)}
                  />
                ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {data && data.meta.totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={data.meta.totalPages}
            onChange={setPage}
            total={data.meta.total}
            pageSize={data.meta.pageSize}
          />
        )}
      </div>
    </AppShell>
  );
}

interface SortableHeaderProps {
  label: string;
  column: EmployeeListQuery['sortBy'];
  current: EmployeeListQuery['sortBy'];
  direction: EmployeeListQuery['sortDir'];
  onSort: (column: EmployeeListQuery['sortBy']) => void;
  align?: 'left' | 'right';
}

function SortableHeader({
  label,
  column,
  current,
  direction,
  onSort,
  align = 'left',
}: SortableHeaderProps) {
  const active = current === column;
  const Icon = direction === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead className={cn(align === 'right' ? 'text-right' : '')}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          'hover:text-fn-fg inline-flex cursor-pointer items-center gap-1 transition-colors',
          active && 'text-fn-fg',
        )}
      >
        {label}
        {active && <Icon className="h-3 w-3" />}
      </button>
    </TableHead>
  );
}

function EmployeeRow({ employee, onOpen }: { employee: EmployeePublic; onOpen: () => void }) {
  return (
    <TableRow
      onClick={onOpen}
      className={cn('cursor-pointer', employee.isArchived && 'opacity-60')}
    >
      <TableCell>
        <div className="flex items-center gap-2.5">
          <EmployeeAvatar fullName={employee.fullName} photoUrl={employee.photoUrl} size="sm" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <div
              className={cn(
                'text-fn-fg truncate text-[13px] font-medium',
                employee.isArchived && 'line-through',
              )}
            >
              {employee.fullName}
              {employee.isArchived && (
                <span className="bg-fn-bg-inset text-fn-fg-faint ml-1.5 inline-flex items-center rounded-full px-1.5 py-[1px] text-[10px] font-medium uppercase tracking-wider no-underline">
                  Archived
                </span>
              )}
            </div>
            <div className="font-tabular text-fn-fg-faint text-[11.5px]">{employee.eid}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-fn-fg-muted">{employee.department.name}</TableCell>
      <TableCell className="text-fn-fg-muted">{employee.designation.name}</TableCell>
      <TableCell>
        <StatusPill status={employee.status} />
      </TableCell>
      <TableCell className="text-fn-fg-muted">
        {employee.manager ? (
          <Link
            href={`/employees/${employee.manager.id}`}
            onClick={(e) => e.stopPropagation()}
            className="hover:text-fn-fg hover:underline"
          >
            {employee.manager.fullName}
          </Link>
        ) : (
          <span className="text-fn-fg-faint">—</span>
        )}
      </TableCell>
      <TableCell className="font-tabular text-fn-fg-muted text-right">
        {formatJoinDate(employee.joinDate)}
      </TableCell>
    </TableRow>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-7 w-7 rounded-full" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-3 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-3 w-28" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-16 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-3 w-24" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="ml-auto h-3 w-20" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function EmptyState({ hasFilters, canCreate }: { hasFilters: boolean; canCreate: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div
        className="rounded-fn-lg flex h-12 w-12 items-center justify-center"
        style={{ background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)' }}
      >
        <UsersIcon className="h-5 w-5" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-fn-fg text-[14px] font-medium">No employees match your filters</p>
        <p className="text-fn-fg-muted text-[13px]">
          {hasFilters
            ? 'Try clearing one of the filters or searching for someone else.'
            : 'Your team will appear here once added.'}
        </p>
      </div>
      {canCreate && (
        <Button asChild variant="outline" size="sm">
          <Link href="/employees/new">
            <Plus className="h-3.5 w-3.5" /> Add employee
          </Link>
        </Button>
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
  total,
  pageSize,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  total: number;
  pageSize: number;
}) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="text-fn-fg-muted flex items-center justify-between text-[12.5px]">
      <span className="font-tabular">
        Showing {from}–{to} of {total.toLocaleString()}
      </span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </Button>
        <span className="font-tabular text-[12px]">
          Page {page} of {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function formatJoinDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
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
