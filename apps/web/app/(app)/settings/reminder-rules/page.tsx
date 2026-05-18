'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Plus } from 'lucide-react';
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
import {
  useRecipientResolvers,
  useReminderRules,
  useToggleRule,
  useTriggerCounts,
  useTriggerTest,
  type ReminderRulePublic,
} from '@/lib/queries/reminders';
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
  const perms = usePermissions();
  const canCreate = perms.has('reminders:create_rule');
  const canManage = perms.has('reminders:publish_rule');

  const [filter, setFilter] = React.useState<'all' | 'active'>('active');

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
        cell: (rule) => (
          <div className="gap-fn-2 flex min-w-0 items-center">
            <span
              aria-hidden
              className="h-fn-2 w-fn-2 shrink-0 rounded-fn-full inline-block"
              style={{ background: `oklch(0.60 0.16 ${ruleHue(rule.key)})` }}
            />
            <div className="gap-fn-0_5 flex min-w-0 flex-col">
              <span className="text-fn-fg font-fn-semibold truncate text-[13px]">
                {rule.name}
              </span>
              <span className="text-fn-fg-faint truncate text-[11px]">
                {rule.description ?? `v${rule.version}`}
              </span>
            </div>
          </div>
        ),
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
          const lead = leadTimeLabel(
            rule.triggerType === 'event'
              ? { kind: 'event', offset: rule.triggerSpec.kind === 'event' ? rule.triggerSpec.offset : undefined }
              : { kind: 'cron' },
          );
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
        cell: (rule) => (
          <span className="text-fn-fg-muted text-[12.5px]">
            {resolverLabel.get(rule.recipientResolver) ?? rule.recipientResolver}
          </span>
        ),
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
                'tabular-nums text-[12.5px]',
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
          <Switch
            checked={rule.isEnabled && rule.status === 'active'}
            disabled={rule.status !== 'active' || !canManage || toggleRule.isPending}
            onCheckedChange={(next) => toggleRule.mutate({ id: rule.id, isEnabled: next })}
            aria-label={`${rule.isEnabled ? 'Disable' : 'Enable'} ${rule.name}`}
          />
        ),
      },
    ],
    [departmentsById, resolverLabel, counts, canManage, toggleRule],
  );

  const rowActions = React.useCallback(
    (rule: ReminderRulePublic): DataTableRowAction[] => {
      const items: DataTableRowAction[] = [
        { label: 'View rule', onClick: () => router.push(`/settings/reminder-rules/${rule.id}`) },
      ];
      if (canManage) {
        items.push({
          label: 'Test rule (sends to me)',
          onClick: () => triggerTest.mutate(rule.id),
        });
        items.push({
          label: 'Edit details',
          onClick: () => router.push(`/settings/reminder-rules/${rule.id}/edit`),
        });
      }
      return items;
    },
    [router, canManage, triggerTest],
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
              Per-department lifecycle reminders. Scheduler runs hourly at the top of the
              hour in Asia/Karachi and dispatches emails through the notifications service.
            </p>
          </div>
          <div className="gap-fn-2 flex items-center">
            <Button variant="secondary" size="md" disabled>
              <Copy className="h-fn-4 w-fn-4" /> Duplicate from…
            </Button>
            {canCreate && (
              <Button
                size="md"
                onClick={() => router.push('/settings/reminder-rules/new')}
              >
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
              onRowClick={(r) => router.push(`/settings/reminder-rules/${r.id}`)}
              rowActions={rowActions}
              emptyState={<RulesEmptyState canCreate={canCreate} />}
            />
          </div>
        </div>
      </div>
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
