'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { formatOpdFinanceFeedback, type OpdFinanceReasonCode } from '@futurenostics/types';
import { AppShell } from '@/components/shell/app-shell';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OpdClaimDraftEditor } from '@/components/opd/opd-draft-editor';
import { OpdClaimReadOnlyView } from '@/components/opd/opd-claim-read-only';
import { OpdClaimStatusBadge } from '@/components/opd/opd-claim-status';
import { OpdFinanceReasonFields } from '@/components/opd/opd-finance-reason-fields';
import { useOpdClaim, useReturnOpdClaimForCorrection } from '@/lib/queries/opd';
import { useApproveApproval, useApprovals, useRejectApproval } from '@/lib/queries/approvals';
import { usePermissions } from '@/hooks/use-permissions';
import { useUser } from '@/hooks/use-user';
import { OPD_COPY } from '@/components/opd/opd-copy';
import { opdCategoryLabel } from '@futurenostics/types';

export default function OpdClaimDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? '';
  const perms = usePermissions();
  const { data: user } = useUser();
  const claimQuery = useOpdClaim(id);
  const claim = claimQuery.data;
  const canApprove = perms.has('opd:approve_claim');
  const isOwnReturnedEditable =
    claim?.status === 'returned' &&
    perms.has('opd:submit_own') &&
    user?.employeeId != null &&
    user.employeeId === claim.employeeId;

  const pendingApprovals = useApprovals(
    { status: 'pending', type: 'opd-claim', for: 'me', limit: 100 },
    { enabled: canApprove && claim?.status === 'pending_approval' },
  );
  const approval = (pendingApprovals.data?.items ?? []).find((a) => a.sourceId === id) ?? null;
  const approve = useApproveApproval();
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [returnOpen, setReturnOpen] = React.useState(false);
  const [approveOpen, setApproveOpen] = React.useState(false);

  const breadcrumbLabel = claim?.claimNumber ?? claim?.employee.fullName ?? 'Claim';

  return (
    <AppShell
      breadcrumbs={[
        { label: 'HR Core' },
        { label: OPD_COPY.moduleName, href: '/opd' },
        { label: breadcrumbLabel },
      ]}
    >
      <div className="gap-fn-5 mx-auto flex w-full max-w-3xl flex-col">
        <Button variant="ghost" size="sm" className="self-start" onClick={() => router.back()}>
          <ArrowLeft className="h-fn-3_5 w-fn-3_5" /> Back
        </Button>

        {claimQuery.isPending && <Skeleton className="h-[420px] w-full" />}
        {claimQuery.isError && (
          <Alert tone="danger">
            {(claimQuery.error as Error).message ?? OPD_COPY.claimLoadError}
          </Alert>
        )}

        {claim && (
          <>
            <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-3 px-fn-5 py-fn-4 flex flex-wrap items-start justify-between border">
              <div className="gap-fn-1 flex min-w-0 flex-col">
                <div className="gap-fn-2 flex flex-wrap items-center">
                  <h1 className="text-fn-fg font-fn-semibold tracking-fn-tight font-mono text-[20px]">
                    {claim.claimNumber}
                  </h1>
                  <OpdClaimStatusBadge status={claim.status} />
                </div>
                <p className="text-fn-fg font-fn-medium text-[15px]">{claim.employee.fullName}</p>
                <p className="text-fn-fg-muted text-[13px]">
                  {claim.employee.eid}
                  {claim.employee.departmentName ? ` · ${claim.employee.departmentName}` : ''}
                  {' · '}
                  {opdCategoryLabel(claim.category)}
                </p>
              </div>
            </div>

            {claim.status === 'draft' && (
              <Alert tone="warning" title={OPD_COPY.alertNotSubmittedTitle}>
                <p className="text-fn-base">{OPD_COPY.alertNotSubmittedBody}</p>
              </Alert>
            )}

            {isOwnReturnedEditable ? (
              <OpdClaimDraftEditor claim={claim} />
            ) : (
              <OpdClaimReadOnlyView claim={claim} />
            )}

            {canApprove && claim.status === 'pending_approval' && (
              <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-3 px-fn-5 py-fn-4 flex flex-col border">
                <p className="text-fn-fg font-fn-semibold text-[14px]">Finance review</p>
                <div className="gap-fn-2 flex flex-wrap">
                  <Button variant="outline" onClick={() => setReturnOpen(true)}>
                    {OPD_COPY.returnForCorrection}
                  </Button>
                  <Button variant="outline" onClick={() => setRejectOpen(true)}>
                    {OPD_COPY.rejectClaim}
                  </Button>
                  <Button
                    disabled={!approval || approve.isPending}
                    onClick={() => setApproveOpen(true)}
                  >
                    {OPD_COPY.approveClaim}
                  </Button>
                </div>
                {!approval && pendingApprovals.isFetched && (
                  <p className="text-fn-fg-muted text-[12.5px]">{OPD_COPY.cannotApproveHere}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <ApproveDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        approvalId={approval?.id ?? null}
        approve={approve}
      />
      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        approvalId={approval?.id ?? null}
      />
      <ReturnDialog open={returnOpen} onOpenChange={setReturnOpen} claimId={id} />
    </AppShell>
  );
}

function ApproveDialog({
  open,
  onOpenChange,
  approvalId,
  approve,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approvalId: string | null;
  approve: ReturnType<typeof useApproveApproval>;
}) {
  const [notes, setNotes] = React.useState('');
  React.useEffect(() => {
    if (!open) setNotes('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{OPD_COPY.approveDialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="gap-fn-1_5 flex flex-col">
          <Label htmlFor="approve-notes">{OPD_COPY.approveNoteLabel}</Label>
          <Textarea
            id="approve-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={OPD_COPY.approveNotePlaceholder}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!approvalId || approve.isPending}
            onClick={async () => {
              if (!approvalId) return;
              try {
                await approve.mutateAsync({
                  id: approvalId,
                  input: { notes: notes.trim() || undefined },
                });
                toast.success(OPD_COPY.approveSuccess);
                onOpenChange(false);
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          >
            {OPD_COPY.approveClaim}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({
  open,
  onOpenChange,
  approvalId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approvalId: string | null;
}) {
  const [reasonCode, setReasonCode] = React.useState<OpdFinanceReasonCode | ''>('');
  const [comment, setComment] = React.useState('');
  const reject = useRejectApproval();
  React.useEffect(() => {
    if (!open) {
      setReasonCode('');
      setComment('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{OPD_COPY.rejectDialogTitle}</DialogTitle>
        </DialogHeader>
        <OpdFinanceReasonFields
          reasonCode={reasonCode}
          onReasonCodeChange={setReasonCode}
          comment={comment}
          onCommentChange={setComment}
          reasonLabel={OPD_COPY.rejectReasonLabel}
          commentLabel={OPD_COPY.rejectCommentLabel}
          commentPlaceholder={OPD_COPY.rejectReasonPlaceholder}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!approvalId || reject.isPending || !reasonCode}
            onClick={async () => {
              if (!approvalId || !reasonCode) return;
              const reason = formatOpdFinanceFeedback(reasonCode, comment);
              try {
                await reject.mutateAsync({
                  id: approvalId,
                  reason,
                  reasonCode,
                  comment: comment.trim() || undefined,
                });
                toast.success(OPD_COPY.rejectSuccess);
                onOpenChange(false);
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          >
            {OPD_COPY.rejectClaim}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReturnDialog({
  open,
  onOpenChange,
  claimId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claimId: string;
}) {
  const [reasonCode, setReasonCode] = React.useState<OpdFinanceReasonCode | ''>('');
  const [comment, setComment] = React.useState('');
  const returnMutation = useReturnOpdClaimForCorrection();
  React.useEffect(() => {
    if (!open) {
      setReasonCode('');
      setComment('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{OPD_COPY.returnDialogTitle}</DialogTitle>
        </DialogHeader>
        <p className="text-fn-fg-muted text-[12.5px]">{OPD_COPY.returnDialogHint}</p>
        <OpdFinanceReasonFields
          reasonCode={reasonCode}
          onReasonCodeChange={setReasonCode}
          comment={comment}
          onCommentChange={setComment}
          reasonLabel={OPD_COPY.returnReasonLabel}
          commentLabel={OPD_COPY.returnCommentLabel}
          commentPlaceholder={OPD_COPY.returnCommentPlaceholder}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!claimId || returnMutation.isPending || !reasonCode}
            onClick={async () => {
              if (!reasonCode) return;
              try {
                await returnMutation.mutateAsync({
                  id: claimId,
                  input: {
                    reasonCode,
                    comment: comment.trim() || undefined,
                  },
                });
                toast.success(OPD_COPY.returnSuccess);
                onOpenChange(false);
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          >
            {OPD_COPY.returnForCorrection}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
