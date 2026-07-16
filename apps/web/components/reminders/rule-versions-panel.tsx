'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, GitBranchPlus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  useDeleteRule,
  useDraftNewVersion,
  useRuleVersions,
  type ReminderRulePublic,
} from '@/lib/queries/reminders';
import { cn } from '@/lib/utils';

/**
 * Version-history affordance for the rule editor sheet.
 *
 * Renders as a compact "v1.2 · active ▾" pill that opens a popover
 * listing every version in the chain (looked up by `key`). Clicking a
 * row navigates the editor sheet to that version via the `?sheet=edit
 * &id=<id>` URL pattern the page already uses. Each non-active row
 * gets a delete icon — calls the hard-delete endpoint (active rules
 * must be archived first, which is the existing "Archive" flow).
 *
 * When the current rule is `active`, also renders a "Draft new
 * version" button next to the pill — the only way to edit an active
 * rule. The BE rejects a second draft per chain, and we surface that
 * error to the toast layer.
 */
export function RuleVersionsPanel({
  rule,
  canCreate,
  canDelete,
}: {
  rule: ReminderRulePublic;
  canCreate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const versionsQuery = useRuleVersions(rule.key);
  const draftNew = useDraftNewVersion();
  const deleteRule = useDeleteRule();
  const [open, setOpen] = React.useState(false);

  const versions = versionsQuery.data?.items ?? [];
  const hasDraft = versions.some((v) => v.status === 'draft');
  const otherCount = Math.max(0, versions.length - 1);

  const navigateTo = React.useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams);
      params.set('sheet', 'edit');
      params.set('id', id);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
      setOpen(false);
    },
    [router, pathname, searchParams],
  );

  const handleDraftNew = React.useCallback(async () => {
    try {
      const created = await draftNew.mutateAsync(rule.id);
      toast.success(`Drafted v${created.version} — edit and publish to replace v${rule.version}`);
      navigateTo(created.id);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [draftNew, rule.id, rule.version, navigateTo]);

  const handleDelete = React.useCallback(
    async (v: ReminderRulePublic) => {
      if (!confirm(`Permanently delete v${v.version} (${v.status})? This can't be undone.`)) return;
      try {
        await deleteRule.mutateAsync(v.id);
        toast.success(`Deleted v${v.version}`);
        // If the deleted version is the one we're currently viewing,
        // navigate to the next-best version (latest active → latest
        // draft → latest archived). Otherwise stay put — the popover
        // will refresh from the invalidated query.
        if (v.id === rule.id) {
          const next =
            versions.find((x) => x.id !== v.id && x.status === 'active') ??
            versions.find((x) => x.id !== v.id && x.status === 'draft') ??
            versions.find((x) => x.id !== v.id);
          if (next) navigateTo(next.id);
          else {
            const params = new URLSearchParams(searchParams);
            params.delete('sheet');
            params.delete('id');
            const qs = params.toString();
            router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
          }
        }
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
    [deleteRule, rule.id, versions, navigateTo, searchParams, router, pathname],
  );

  return (
    <div className="gap-fn-2 flex flex-wrap items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'rounded-fn-full gap-fn-1_5 border-fn-border bg-fn-bg-panel px-fn-2_5 py-fn-1 hover:border-fn-fg-faint inline-flex cursor-pointer items-center border text-[12px] transition-colors',
            )}
            aria-label="Show version history"
          >
            <span className="text-fn-fg font-fn-semibold tabular-nums">v{rule.version}</span>
            <span aria-hidden className="text-fn-fg-faint">
              ·
            </span>
            <StatusDot status={rule.status} />
            <span className="text-fn-fg-muted">{rule.status}</span>
            {otherCount > 0 && (
              <span className="text-fn-fg-faint ml-fn-1 tabular-nums">
                ({otherCount} {otherCount === 1 ? 'other' : 'others'})
              </span>
            )}
            <ChevronDown className="h-fn-3 w-fn-3 text-fn-fg-faint" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[360px] p-0">
          <div className="px-fn-3 py-fn-2_5 border-fn-divider border-b">
            <p className="text-fn-fg font-fn-semibold text-[12.5px]">Version history</p>
            <p className="text-fn-fg-faint mt-fn-0_5 text-[11px]">
              Key <span className="text-fn-fg-muted font-mono">{rule.key}</span> — drafts and
              archived versions can be deleted; active versions must be archived first.
            </p>
          </div>
          <div className="max-h-[320px] overflow-auto">
            {versionsQuery.isPending && (
              <div className="text-fn-fg-faint gap-fn-2 px-fn-3 py-fn-4 flex items-center text-[12px]">
                <Loader2 className="h-fn-3_5 w-fn-3_5 animate-spin" /> Loading versions…
              </div>
            )}
            {!versionsQuery.isPending && versions.length === 0 && (
              <p className="text-fn-fg-faint px-fn-3 py-fn-4 text-[12px]">No versions found.</p>
            )}
            <ul className="gap-fn-0_5 py-fn-1 flex flex-col">
              {versions.map((v) => (
                <VersionRow
                  key={v.id}
                  version={v}
                  isCurrent={v.id === rule.id}
                  canDelete={canDelete && v.status !== 'active'}
                  deleting={deleteRule.isPending && deleteRule.variables === v.id}
                  onSelect={() => navigateTo(v.id)}
                  onDelete={() => handleDelete(v)}
                />
              ))}
            </ul>
          </div>
        </PopoverContent>
      </Popover>

      {canCreate && rule.status === 'active' && !hasDraft && (
        <Button
          size="sm"
          variant="secondary"
          onClick={handleDraftNew}
          disabled={draftNew.isPending}
        >
          {draftNew.isPending ? (
            <Loader2 className="h-fn-3_5 w-fn-3_5 animate-spin" />
          ) : (
            <GitBranchPlus className="h-fn-3_5 w-fn-3_5" />
          )}
          Draft new version
        </Button>
      )}

      {canCreate && rule.status === 'active' && hasDraft && (
        <button
          type="button"
          onClick={() => {
            const draft = versions.find((v) => v.status === 'draft');
            if (draft) navigateTo(draft.id);
          }}
          className="text-fn-accent hover:text-fn-accent/80 font-fn-semibold cursor-pointer text-[12px] hover:underline"
        >
          Open draft v{versions.find((v) => v.status === 'draft')?.version}
        </button>
      )}
    </div>
  );
}

function VersionRow({
  version,
  isCurrent,
  canDelete,
  deleting,
  onSelect,
  onDelete,
}: {
  version: ReminderRulePublic;
  isCurrent: boolean;
  canDelete: boolean;
  deleting: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <li>
      <div
        className={cn(
          'rounded-fn-xs px-fn-2_5 py-fn-2 gap-fn-2 mx-fn-1 group flex items-center text-[12.5px] transition-colors',
          isCurrent ? 'bg-fn-accent-soft/40' : 'hover:bg-fn-bg-inset',
        )}
      >
        <button
          type="button"
          onClick={onSelect}
          className="gap-fn-2 flex flex-1 cursor-pointer items-center text-left"
          aria-current={isCurrent ? 'true' : undefined}
        >
          <StatusDot status={version.status} />
          <span
            className={cn(
              'font-fn-semibold tabular-nums',
              isCurrent ? 'text-fn-fg' : 'text-fn-fg-muted',
            )}
          >
            v{version.version}
          </span>
          <span className="text-fn-fg-muted">{version.status}</span>
          <span className="text-fn-fg-faint ml-auto text-[11px] tabular-nums">
            {formatRange(version)}
          </span>
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="text-fn-fg-faint hover:text-fn-danger -mr-fn-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Delete v${version.version}`}
            title={`Delete v${version.version}`}
          >
            {deleting ? (
              <Loader2 className="h-fn-3_5 w-fn-3_5 animate-spin" />
            ) : (
              <Trash2 className="h-fn-3_5 w-fn-3_5" />
            )}
          </button>
        )}
      </div>
    </li>
  );
}

function StatusDot({ status }: { status: ReminderRulePublic['status'] }) {
  const color =
    status === 'active'
      ? 'oklch(0.62 0.18 145)' // green
      : status === 'draft'
        ? 'oklch(0.65 0.16 70)' // amber
        : 'oklch(0.55 0.02 240)'; // muted grey
  return (
    <span
      aria-hidden
      className="h-fn-2 w-fn-2 rounded-fn-full inline-block shrink-0"
      style={{ background: color }}
    />
  );
}

function formatRange(v: ReminderRulePublic): string {
  // Show the "live window" for active/archived rules. Drafts have
  // neither so we fall back to the createdAt date so the user can at
  // least see when the draft was started.
  if (v.effectiveFrom) {
    const from = formatDate(v.effectiveFrom);
    const to = v.effectiveTo ? formatDate(v.effectiveTo) : 'now';
    return `${from} → ${to}`;
  }
  return `draft ${formatDate(v.createdAt)}`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getDate()} ${d.toLocaleString('en-GB', { month: 'short' })} ${d.getFullYear() % 100}`;
  } catch {
    return iso.slice(0, 10);
  }
}
