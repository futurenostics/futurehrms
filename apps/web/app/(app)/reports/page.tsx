'use client';

import * as React from 'react';
import { Download, FileSpreadsheet, FileText, FileType2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import type { ReportCatalogItem, ReportFormat, ReportGroup } from '@futurenostics/types';
import { AppShell } from '@/components/shell/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiCombobox } from '@/components/ui/combobox';
import { downloadReport, useReportCatalog, type ReportDownloadParams } from '@/lib/queries/reports';
import { useEmployeesList } from '@/lib/queries/employees';

const GROUP_LABEL: Record<ReportGroup, string> = {
  financial: 'Financial',
  people: 'People',
  projects: 'Projects',
  audit: 'Audit & Compliance',
};
const GROUP_ORDER: ReportGroup[] = ['financial', 'projects', 'people', 'audit'];

const PROJECT_STATUSES = [
  'draft',
  'active',
  'in_billing',
  'on_hold',
  'completed',
  'cancelled',
  'refunded',
];

const CATEGORY_OPTIONS = [
  { slug: 'external', name: 'External' },
  { slug: 'upwork', name: 'Upwork' },
  { slug: 'b2b', name: 'B2B' },
];

const FORMAT_META: Record<ReportFormat, { label: string; icon: typeof FileText }> = {
  csv: { label: 'CSV', icon: FileText },
  xlsx: { label: 'Excel', icon: FileSpreadsheet },
  pdf: { label: 'PDF', icon: FileType2 },
};

interface FilterState {
  monthKey: string;
  year: string;
  dateFrom: string;
  dateTo: string;
  employeeIds: string[];
  department: string;
  category: string;
  projectStatus: string;
}

const INITIAL: FilterState = {
  monthKey: '',
  year: '',
  dateFrom: '',
  dateTo: '',
  employeeIds: [],
  department: 'all',
  category: 'all',
  projectStatus: 'all',
};

export default function ReportsPage() {
  const catalog = useReportCatalog();
  const [filters, setFilters] = React.useState<FilterState>(INITIAL);
  const [busyKey, setBusyKey] = React.useState<string | null>(null);

  // Employees (+ derived departments) power the shared filter controls.
  const employeesQuery = useEmployeesList({ limit: 1000 });
  const employees = employeesQuery.data?.items ?? [];
  const employeeOptions = React.useMemo(
    () => employees.map((e) => ({ value: e.id, label: e.fullName, description: e.eid })),
    [employees],
  );
  const departments = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const e of employees) map.set(e.department.slug, e.department.name);
    return [...map.entries()].map(([slug, name]) => ({ slug, name }));
  }, [employees]);

  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  function buildParams(format: ReportFormat): ReportDownloadParams {
    return {
      format,
      monthKey: filters.monthKey || undefined,
      year: filters.year ? Number(filters.year) : undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      employeeIds: filters.employeeIds.length ? filters.employeeIds : undefined,
      department: filters.department,
      category: filters.category,
      projectStatus: filters.projectStatus,
    };
  }

  function missingRequired(item: ReportCatalogItem): string[] {
    const labels: Record<string, string> = { monthKey: 'Month', year: 'Year' };
    return item.requiredFilters
      .filter((k) => {
        if (k === 'monthKey') return !filters.monthKey;
        if (k === 'year') return !filters.year;
        return false;
      })
      .map((k) => labels[k] ?? k);
  }

  async function run(item: ReportCatalogItem, format: ReportFormat) {
    setBusyKey(`${item.key}:${format}`);
    try {
      await downloadReport(item.key, buildParams(format), `${item.key}.${format}`);
      toast.success(`${item.name} downloaded`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyKey(null);
    }
  }

  const items = catalog.data?.items ?? [];
  const grouped = GROUP_ORDER.map((g) => ({
    group: g,
    reports: items.filter((r) => r.group === g),
  })).filter((s) => s.reports.length > 0);

  return (
    <AppShell breadcrumbs={[{ label: 'Reports' }]}>
      <div className="gap-fn-6 mx-auto flex w-full max-w-[1280px] flex-col">
        {/* Header */}
        <div className="gap-fn-2 flex flex-col">
          <h1
            className="text-fn-fg font-fn-semibold text-[24px]"
            style={{ letterSpacing: '-0.02em' }}
          >
            Reports &amp; Exports
          </h1>
          <p className="text-fn-fg-muted max-w-[720px] text-[13px]">
            Downloadable, filterable summaries of financial and operational activity for audit,
            compliance, and management review. Set the filters, then export any report to its
            supported formats.
          </p>
        </div>

        {/* Shared filter bar (§7.2) */}
        <FilterBar
          filters={filters}
          set={set}
          departments={departments}
          employeeOptions={employeeOptions}
          employeesLoading={employeesQuery.isPending}
          onReset={() => setFilters(INITIAL)}
        />

        {/* Catalog */}
        {catalog.isPending ? (
          <div className="gap-fn-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[180px] w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-fn-16 gap-fn-2 flex flex-col items-center text-center">
              <BarChart3 className="text-fn-fg-faint h-fn-8 w-fn-8" />
              <p className="text-fn-fg font-fn-semibold">No reports available</p>
              <p className="text-fn-fg-muted text-[13px]">
                You don&apos;t have permission to run any reports yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="gap-fn-8 flex flex-col">
            {grouped.map((section) => (
              <section key={section.group} className="gap-fn-4 flex flex-col">
                <h2 className="text-fn-fg-faint tracking-fn-uppercase-tight font-fn-semibold text-[11px] uppercase">
                  {GROUP_LABEL[section.group]}
                </h2>
                <div className="gap-fn-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                  {section.reports.map((item) => (
                    <ReportCard
                      key={item.key}
                      item={item}
                      missing={missingRequired(item)}
                      busyKey={busyKey}
                      onRun={run}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

/* ───────────────────────── Filter bar ───────────────────────── */

function FilterBar({
  filters,
  set,
  departments,
  employeeOptions,
  employeesLoading,
  onReset,
}: {
  filters: FilterState;
  set: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  departments: Array<{ slug: string; name: string }>;
  employeeOptions: Array<{ value: string; label: string; description: string }>;
  employeesLoading: boolean;
  onReset: () => void;
}) {
  return (
    <Card>
      <CardHeader className="gap-fn-1 flex-row items-center justify-between">
        <CardTitle className="text-fn-sm">Filters</CardTitle>
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset
        </Button>
      </CardHeader>
      <CardContent className="gap-fn-4 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4">
        <Field label="Month">
          <Input
            type="month"
            value={filters.monthKey}
            onChange={(e) => set('monthKey', e.target.value)}
          />
        </Field>
        <Field label="Year">
          <Input
            type="number"
            min={2000}
            max={2100}
            placeholder="e.g. 2026"
            value={filters.year}
            onChange={(e) => set('year', e.target.value)}
          />
        </Field>
        <Field label="Date from">
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => set('dateFrom', e.target.value)}
          />
        </Field>
        <Field label="Date to">
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => set('dateTo', e.target.value)}
          />
        </Field>
        <Field label="Department">
          <Select value={filters.department} onValueChange={(v) => set('department', v)}>
            <SelectTrigger>
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.slug} value={d.slug}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Project category">
          <Select value={filters.category} onValueChange={(v) => set('category', v)}>
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORY_OPTIONS.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Project status">
          <Select value={filters.projectStatus} onValueChange={(v) => set('projectStatus', v)}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {PROJECT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Employees">
          <MultiCombobox
            options={employeeOptions}
            values={filters.employeeIds}
            onValuesChange={(v) => set('employeeIds', v)}
            placeholder="All employees"
            searchPlaceholder="Search employees…"
            emptyLabel="employees"
            loading={employeesLoading}
          />
        </Field>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="gap-fn-1_5 flex flex-col">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

/* ───────────────────────── Report card ───────────────────────── */

function ReportCard({
  item,
  missing,
  busyKey,
  onRun,
}: {
  item: ReportCatalogItem;
  missing: string[];
  busyKey: string | null;
  onRun: (item: ReportCatalogItem, format: ReportFormat) => void;
}) {
  const blocked = missing.length > 0;
  return (
    <Card className="flex flex-col">
      <CardHeader className="gap-fn-1_5">
        <CardTitle className="text-fn-sm">{item.name}</CardTitle>
        <CardDescription>{item.description}</CardDescription>
      </CardHeader>
      <CardContent className="gap-fn-3 mt-auto flex flex-col">
        {blocked && (
          <Badge tone="warning" className="self-start">
            Set {missing.join(' + ')} to run
          </Badge>
        )}
        <div className="gap-fn-2 flex flex-wrap items-center">
          {item.formats.map((fmt) => {
            const meta = FORMAT_META[fmt];
            const Icon = meta.icon;
            const busy = busyKey === `${item.key}:${fmt}`;
            return (
              <Button
                key={fmt}
                variant="secondary"
                size="sm"
                disabled={blocked || busy}
                onClick={() => onRun(item, fmt)}
              >
                {busy ? (
                  <Download className="h-fn-4 w-fn-4 animate-pulse" />
                ) : (
                  <Icon className="h-fn-4 w-fn-4" />
                )}
                {meta.label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
