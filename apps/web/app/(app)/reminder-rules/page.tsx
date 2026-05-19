'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Bell, Plus } from 'lucide-react';
import type { ReferencesResponse } from '@futurenostics/types';
import { AppShell } from '@/components/shell/app-shell';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DataTable,
  type DataTableColumn,
  type DataTableRowAction,
} from '@/components/ui/data-table';
import { SchedulerStatusCard } from '@/components/reminders/scheduler-status-card';
import { ScheduledTimeline } from '@/components/reminders/scheduled-timeline';
import { leadTimeLabel, ruleHue, templateLabel } from '@/components/reminders/rule-visuals';
import { RuleEditorSheet } from '@/components/reminders/rule-editor-sheet';
import { CustomTypesSheet } from '@/components/reminders/custom-types-sheet';
import { countLeaves } from '@/components/reminders/condition-builder';
import {
  useDuplicateRule,
  useRecipientResolvers,
  useReminderRules,
  useToggleRule,
  useTriggerCounts,
  useTriggerTest,
  type ReminderRulePublic,
} from '@/lib/queries/reminders';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { toast } from 'sonner';
import { useReferences } from '@/lib/queries/employees';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

/**
 * Reminder Rules list page — matches PNG 12.
 *
 * Layout (top → bottom):
 *   1. Page header (h1 + subtitle + Duplicate from / + New rule)
 *   2. Dark "Reminder scheduler" status card with Dry run button
 *   3. "Next 30 days · scheduled triggers" timeline strip
 *   4. "Rule library" — All / Active filter chips + DataTable with the
 *      design's 7 columns + per-row ON/OFF toggle
 */
export default function ReminderRulesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const perms = usePermissions();
  const canCreate = perms.has('reminders:create_rule');
  const canManage = perms.has('reminders:publish_rule');

  const [filter, setFilter] = React.useState<'all' | 'active'>('all');

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

  const rulesQuery = useReminderRules('all');
  const allRules = rulesQuery.data?.items ?? [];
  const visibleRules = React.useMemo(
    () => (filter === 'all' ? allRules : allRules.filter((r) => r.status === 'active')),
    [allRules, filter],
  );

  const refs = useReferences();
  const resolversQuery = useRecipientResolvers();
  const countsQuery = useTriggerCounts();
  const toggleRule = useToggleRule();
  const triggerTest = useTriggerTest();
  const duplicateRule = useDuplicateRule();

  const duplicateOptions = React.useMemo<ComboboxOption[]>(
    () =>
      allRules.map((r) => ({
        value: r.id,
        label: r.name,
        description: r.key,
        keywords: [r.key, r.name, r.notificationType],
      })),
    [allRules],
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
  const totalActive = allRules.filter((r) => r.status === 'active').length;
  const totalAll = allRules.length;

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
      return items;
    },
    [openEdit, canManage, triggerTest],
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
              <div className="w-fn-56">
                <Combobox
                  options={duplicateOptions}
                  value=""
                  placeholder="Duplicate from…"
                  searchPlaceholder="Search rules"
                  emptyLabel="rules"
                  disabled={duplicateRule.isPending || duplicateOptions.length === 0}
                  onValueChange={(v) => v && handleDuplicate(v)}
                />
              </div>
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
          <div className="border-fn-divider gap-fn-2_5 px-fn-5 py-fn-3_5 flex shrink-0 flex-wrap items-center border-b">
            <h2 className="text-fn-fg font-fn-semibold text-[14px]">Rule library</h2>
            <div className="gap-fn-1 ml-fn-3 flex items-center">
              <FilterChip
                label={`All [${totalAll}]`}
                active={filter === 'all'}
                onClick={() => setFilter('all')}
              />
              <FilterChip
                label={`Active [${totalActive}]`}
                active={filter === 'active'}
                onClick={() => setFilter('active')}
              />
            </div>
            <span className="text-fn-fg-faint ml-auto text-[12px]">
              {visibleRules.length} {visibleRules.length === 1 ? 'rule' : 'rules'}
            </span>
          </div>

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
              emptyState={<RulesEmptyState canCreate={canCreate} />}
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
    </AppShell>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-fn-xs px-fn-2_5 py-fn-1 font-fn-medium cursor-pointer border text-[12.5px] transition-colors',
        active
          ? 'border-fn-accent/30 bg-fn-accent-soft text-fn-accent-soft-fg'
          : 'border-fn-border bg-fn-bg-panel text-fn-fg-muted hover:border-fn-fg-faint',
      )}
    >
      {label}
    </button>
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

function RulesEmptyState({ canCreate }: { canCreate: boolean }) {
  return (
    <div className="gap-fn-3 py-fn-12 flex flex-col items-center text-center">
      <p className="text-fn-fg font-fn-semibold text-[14px]">No reminder rules yet</p>
      <p className="text-fn-fg-muted max-w-[400px] text-[12.5px]">
        {canCreate
          ? 'Create the first rule to start sending lifecycle reminders. Rules are versioned — editing creates a new version that leaves past schedules intact.'
          : 'Ask HR to set up reminder rules for your team.'}
      </p>
    </div>
  );
}
