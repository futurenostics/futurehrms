'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Check, Clock, Inbox, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/shell/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { usePermissions } from '@/hooks/use-permissions';
import {
  type ApprovalListQuery,
  type ApprovalPublic,
  useApprovals,
  useApprovalTypes,
  useRejectApproval,
} from '@/lib/queries/approvals';
import { cn } from '@/lib/utils';

/**
 * Unified approval inbox (Brief 11 in docs/design/screens/approval-inbox.jsx).
 *
 * Items from every approval-bearing module — commission runs today,
 * payroll/OT/leave/etc. as those modules register their ApprovalTypes —
 * flow through the same /api/approvals endpoint. Page reads:
 *
 *   ?type=<kind>   pre-applies a kind chip filter (e.g. commission-run)
 *
 * Rows are rendered per the design brief: kind chip tinted by the
 * type's hue, requester avatar, title + sub + meta, overdue badge when
 * present. `complex` items (commission run, payroll run) get a single
 * "Review & approve" CTA that deep-links to the source's review screen
 * — the typed-phrase confirmation lives there. Simple items get
 * inline Approve + Reject buttons.
 */
export default function ApprovalsInboxPage() {
  const router = useRouter();
  const params = useSearchParams();
  const perms = usePermissions();
  const canView = perms.has('approvals:view_own_inbox') || perms.has('approvals:view_all_inbox');

  const [activeType, setActiveType] = React.useState<string | null>(params.get('type') ?? null);

  const query: ApprovalListQuery = React.useMemo(
    () => ({ status: 'pending', for: 'me', type: activeType ?? undefined, limit: 100 }),
    [activeType],
  );
  const { data, isPending } = useApprovals(canView ? query : { ...query, limit: 0 });
  const { data: typesData } = useApprovalTypes();
  const types = typesData?.items ?? [];
  const items = data?.items ?? [];
  const counts = data?.counts ?? {};

  const [rejecting, setRejecting] = React.useState<ApprovalPublic | null>(null);

  if (!canView) {
    return (
      <AppShell breadcrumbs={[{ label: 'Approvals' }]}>
        <div className="gap-fn-3 py-fn-16 flex flex-col items-center text-center">
          <ShieldCheck className="text-fn-fg-faint h-fn-8 w-fn-8" />
          <p className="text-fn-fg font-fn-semibold">No approver permissions</p>
          <p className="text-fn-fg-muted max-w-[420px] text-[13px]">
            The Approvals inbox is reserved for users with the{' '}
            <code className="font-mono">approvals:view_own_inbox</code> permission. HR Admin,
            Finance Manager, and Super Admin roles get this by default.
          </p>
        </div>
      </AppShell>
    );
  }

  const simpleCount = items.filter((i) => !i.metadata.complex).length;
  const complexCount = items.length - simpleCount;

  return (
    <AppShell breadcrumbs={[{ label: 'Approvals' }]}>
      <div className="gap-fn-5 mx-auto flex w-full max-w-[1280px] flex-col">
        {/* Header */}
        <div className="gap-fn-1 flex flex-col">
          <h1
            className="text-fn-fg font-fn-semibold text-[26px]"
            style={{ letterSpacing: '-0.025em' }}
          >
            Approvals
          </h1>
          <p className="text-fn-fg-muted text-[13.5px]">
            Items waiting on your decision. Complex kinds require individual review — simple ones
            can be approved in bulk.
          </p>
        </div>

        {/* Filter chip rail */}
        <FilterChipRail
          counts={counts}
          activeType={activeType}
          types={types}
          onChange={(t) => {
            setActiveType(t);
            const next = new URLSearchParams(params.toString());
            if (t) next.set('type', t);
            else next.delete('type');
            router.replace(`/approvals${next.size ? `?${next.toString()}` : ''}`);
          }}
        />

        {/* Toolbar */}
        <div className="gap-fn-3 text-fn-fg-muted flex items-center text-[12.5px]">
          <span className="text-fn-fg-faint">·</span>
          <span>
            {items.length === 0
              ? 'Inbox zero'
              : `${simpleCount} simple item${simpleCount === 1 ? '' : 's'} can be bulk-approved · ${complexCount} complex item${complexCount === 1 ? '' : 's'} need individual review`}
          </span>
        </div>

        {/* Rows */}
        {isPending ? (
          <RowsSkeleton />
        ) : items.length === 0 ? (
          <EmptyState filtered={activeType != null} />
        ) : (
          <div className="rounded-fn-md border-fn-border bg-fn-bg-panel overflow-hidden border">
            {items.map((item, i) => (
              <InboxRow
                key={item.id}
                item={item}
                kindLabel={kindLabelFor(item, types)}
                isLast={i === items.length - 1}
                onOpen={() => {
                  const link = item.metadata.link;
                  if (link) router.push(link);
                }}
                onReject={() => setRejecting(item)}
              />
            ))}
          </div>
        )}
      </div>

      <RejectReasonDialog approval={rejecting} onClose={() => setRejecting(null)} />
    </AppShell>
  );
}

/* ---------------------------------------------------------------- */
/* Filter chip rail — "All / Commission / Payroll / Overtime / …"    */
/* ---------------------------------------------------------------- */

function FilterChipRail({
  counts,
  activeType,
  types,
  onChange,
}: {
  counts: Record<string, number>;
  activeType: string | null;
  types: Array<{ kind: string; label: string }>;
  onChange: (type: string | null) => void;
}) {
  // Show registered types that have non-zero pending counts AND types
  // that match the active filter (even if zero, so the chip remains
  // visible while filtered to it). Plus an always-present "All" chip.
  const chips: Array<{ kind: string | null; label: string; count: number; hue?: number }> = [
    { kind: null, label: 'All', count: counts.all ?? 0 },
  ];
  for (const t of types) {
    const c = counts[t.kind] ?? 0;
    if (c === 0 && activeType !== t.kind) continue;
    chips.push({ kind: t.kind, label: t.label, count: c, hue: KIND_HUE[t.kind] ?? 280 });
  }

  return (
    <div className="gap-fn-1_5 rounded-fn-md border-fn-border bg-fn-bg-panel px-fn-3_5 py-fn-2_5 flex flex-wrap items-center border">
      <span className="text-fn-fg-faint mr-fn-1 font-fn-semibold text-[10.5px] uppercase tracking-[0.08em]">
        Filter by:
      </span>
      {chips.map((c) => {
        const active = activeType === c.kind;
        return (
          <button
            key={c.kind ?? '__all'}
            type="button"
            onClick={() => onChange(c.kind)}
            className={cn(
              'gap-fn-1_5 rounded-fn-full font-fn-medium inline-flex cursor-pointer items-center border px-[11px] py-[5px] text-[12px] transition-colors',
              active
                ? 'bg-fn-accent-soft text-fn-accent-soft-fg border-fn-accent/28'
                : 'bg-fn-bg-subtle text-fn-fg-muted border-fn-border hover:border-fn-border-strong',
            )}
          >
            {c.hue != null && (
              <span
                aria-hidden
                className="rounded-fn-full inline-block h-[8px] w-[8px]"
                style={{ background: `oklch(0.55 0.16 ${c.hue})` }}
              />
            )}
            {c.label}
            <span className="text-fn-fg-faint font-mono text-[11px]">{c.count}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Row                                                               */
/* ---------------------------------------------------------------- */

function InboxRow({
  item,
  kindLabel,
  isLast,
  onOpen,
  onReject,
}: {
  item: ApprovalPublic;
  kindLabel: string;
  isLast: boolean;
  onOpen: () => void;
  onReject: () => void;
}) {
  const m = item.metadata;
  const requesterHue = m.requester?.hue ?? 280;
  const kindHue = m.hue ?? 280;
  const complex = !!m.complex;
  const overdue = !!m.overdueBy;

  return (
    <div
      className={cn(
        'gap-fn-3_5 px-fn-5 py-fn-4 hover:bg-fn-bg-subtle flex items-center transition-colors',
        !isLast && 'border-fn-divider border-b',
      )}
    >
      {/* Bulk-select checkbox (disabled on complex per design) */}
      <span
        title={complex ? 'This approval requires individual review' : undefined}
        className={cn(
          'border-fn-border-strong bg-fn-bg-panel inline-block h-[18px] w-[18px] shrink-0 rounded border-[1.5px]',
          complex ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
        )}
      />

      {/* Requester avatar */}
      <span
        aria-hidden
        className="rounded-fn-sm font-fn-semibold inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center text-[12.5px]"
        style={{
          background: `oklch(0.92 0.07 ${requesterHue})`,
          color: `oklch(0.38 0.16 ${requesterHue})`,
        }}
      >
        {(m.requester?.initials ?? m.requester?.name?.[0] ?? '?').toUpperCase()}
      </span>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="gap-fn-2 flex flex-wrap items-center">
          <span className="text-fn-fg font-fn-semibold text-[13.5px]">{m.title}</span>
          <KindTag hue={kindHue} label={kindLabel} />
          {overdue && (
            <Badge tone="danger" icon={<Clock className="h-[9px] w-[9px]" />}>
              Overdue · {m.overdueBy}
            </Badge>
          )}
        </div>
        <div className="text-fn-fg-muted gap-fn-1 mt-[3px] flex flex-wrap items-center text-[12px]">
          <span className="font-fn-medium">{m.requester?.name ?? item.submittedByEmail}</span>
          {m.requester?.role && <span className="text-fn-fg-faint"> · {m.requester.role}</span>}
          {m.sub && (
            <>
              <span className="text-fn-fg-faint">·</span>
              <span>{m.sub}</span>
            </>
          )}
        </div>
        {m.meta && <div className="text-fn-fg-faint mt-[3px] text-[11.5px]">{m.meta}</div>}
        {item.stages.length > 1 && (
          <div className="gap-fn-1_5 mt-fn-1 flex flex-wrap items-center">
            <Badge tone="info">
              Step {Math.min(item.currentStage + 1, item.stages.length)} of {item.stages.length}
            </Badge>
            <span className="text-fn-fg-faint text-[11px]">
              {item.status === 'pending'
                ? `Awaiting ${item.stages[item.currentStage]?.label ?? 'approval'}`
                : item.stages.map((s) => s.label).join(' → ')}
            </span>
          </div>
        )}
      </div>

      {/* Submitted time */}
      <div className="text-fn-fg-faint w-[88px] shrink-0 text-right font-mono text-[11px]">
        Requested
        <br />
        <span className="text-fn-fg-muted">{formatRelative(item.submittedAt)}</span>
      </div>

      {/* Actions */}
      <div className="gap-fn-1_5 flex shrink-0">
        {complex ? (
          <Button size="sm" onClick={onOpen}>
            Review &amp; approve <ArrowRight className="h-fn-3_5 w-fn-3_5" />
          </Button>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={onReject}>
              Reject
            </Button>
            <Button size="sm" onClick={onOpen}>
              <Check className="h-fn-3_5 w-fn-3_5" /> Approve
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function KindTag({ hue, label }: { hue: number; label: string }) {
  return (
    <span
      className="rounded-fn-xs font-fn-semibold inline-flex items-center border px-[8px] py-[1px] text-[10.5px]"
      style={{
        background: `oklch(0.94 0.04 ${hue})`,
        color: `oklch(0.38 0.13 ${hue})`,
        borderColor: `color-mix(in oklch, oklch(0.55 0.16 ${hue}) 22%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}

/* ---------------------------------------------------------------- */
/* Reject reason dialog                                              */
/* ---------------------------------------------------------------- */

function RejectReasonDialog({
  approval,
  onClose,
}: {
  approval: ApprovalPublic | null;
  onClose: () => void;
}) {
  const [reason, setReason] = React.useState('');
  const reject = useRejectApproval();
  React.useEffect(() => {
    if (!approval) setReason('');
  }, [approval]);

  return (
    <Dialog open={!!approval} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject this request</DialogTitle>
        </DialogHeader>
        <div className="gap-fn-1 flex flex-col">
          <div className="text-fn-fg-muted text-[12.5px]">
            {approval?.metadata.requester?.name ?? approval?.submittedByEmail} ·{' '}
            {approval?.metadata.title}
          </div>
          <label className="text-fn-fg font-fn-medium mt-fn-2 text-[12.5px]">
            Reason <span className="text-fn-danger">*</span>
            <span className="text-fn-fg-faint font-fn-regular ml-fn-1">
              The requester will see this. Be specific.
            </span>
          </label>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. The Saturday work wasn't pre-approved and the project lead has no record of the emergency."
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!approval || reject.isPending || reason.trim().length === 0}
            onClick={async () => {
              if (!approval) return;
              try {
                await reject.mutateAsync({ id: approval.id, reason: reason.trim() });
                toast.success('Request rejected.');
                onClose();
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          >
            Reject request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- */
/* Empty + skeleton                                                  */
/* ---------------------------------------------------------------- */

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="rounded-fn-md border-fn-border bg-fn-bg-panel py-fn-16 flex flex-col items-center border text-center">
      <Inbox className="text-fn-fg-faint h-fn-8 w-fn-8" />
      <p className="text-fn-fg mt-fn-3 font-fn-semibold text-[14px]">
        {filtered ? 'No matching items' : 'Inbox zero'}
      </p>
      <p className="text-fn-fg-muted mt-fn-1 max-w-[440px] text-[12.5px]">
        {filtered
          ? 'No items match this filter right now. Switch back to All or pick another kind.'
          : 'Nothing is waiting on you. When teammates submit something for approval — commission runs, OT, leave, etc. — it shows up here.'}
      </p>
    </div>
  );
}

function RowsSkeleton() {
  return (
    <div className="gap-fn-2 flex flex-col">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-[88px] w-full" />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Helpers                                                           */
/* ---------------------------------------------------------------- */

/**
 * Per-kind hue. The metadata blob also carries `hue` from the
 * ApprovalType (so kinds-not-yet-listed-here still render in some
 * colour), but the chip rail itself needs a hue for kinds that
 * have zero items (so the dot stays consistent across renders).
 *
 * Hues mirror docs/design/screens/approval-inbox.jsx KIND_META.
 */
const KIND_HUE: Record<string, number> = {
  'commission-run': 280,
  'payroll-run': 280,
  'overtime-request': 65,
  'leave-request': 245,
  'leave-eligibility-event': 320,
  'attendance-correction': 175,
};

function kindLabelFor(item: ApprovalPublic, types: Array<{ kind: string; label: string }>): string {
  return types.find((t) => t.kind === item.type)?.label ?? item.type;
}

function formatRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}
