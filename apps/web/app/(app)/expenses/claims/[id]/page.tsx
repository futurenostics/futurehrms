'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { formatExpenseFinanceFeedback, type ExpenseFinanceReasonCode } from '@futurenostics/types';
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
import { ExpenseClaimReturnedEditor } from '@/components/expenses/expense-claim-returned-editor';
import { ExpenseClaimReadOnlyView } from '@/components/expenses/expense-claim-read-only';
import { ExpenseClaimOutcomeBanner } from '@/components/expenses/expense-claim-outcome';
import { ExpenseClaimStatusBadge } from '@/components/expenses/expense-claim-status';
import { ExpenseFinanceReasonFields } from '@/components/expenses/expense-finance-reason-fields';
import {
  useExpenseClaim,
  useReturnExpenseClaimForCorrection,
  useSubmitExpenseClaim,
} from '@/lib/queries/expenses';
import { useApproveApproval, useApprovals, useRejectApproval } from '@/lib/queries/approvals';
import { usePermissions } from '@/hooks/use-permissions';
import { useUser } from '@/hooks/use-user';
import { EXPENSE_COPY } from '@/components/expenses/expense-copy';
import { expenseCategoryLabel } from '@futurenostics/types';

export default function ExpenseClaimDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? '';
  const perms = usePermissions();
  const { data: user } = useUser();
  const claimQuery = useExpenseClaim(id);
  const claim = claimQuery.data;
  const canApprove = perms.has('expenses:approve_claim');
  const isOwnEditableClaim =
    claim?.status === 'returned' &&
    perms.has('expenses:submit_own') &&
    user?.employeeId != null &&
    user.employeeId === claim.employeeId;

  const pendingApprovals = useApprovals(
    { status: 'pending', type: 'expense-claim', for: 'me', limit: 100 },
    { enabled: canApprove && claim?.status === 'pending_approval' },
  );
  const approval = (pendingApprovals.data?.items ?? []).find((a) => a.sourceId === id) ?? null;
  const approve = useApproveApproval();
  const reject = useRejectApproval();
  const ret = useReturnExpenseClaimForCorrection();
  const resubmit = useSubmitExpenseClaim();
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [returnOpen, setReturnOpen] = React.useState(false);
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [reasonCode, setReasonCode] = React.useState<ExpenseFinanceReasonCode | ''>('');
  const [comment, setComment] = React.useState('');
  const [approveNote, setApproveNote] = React.useState('');

  const breadcrumbLabel = claim?.claimNumber ?? 'Claim';

  return (
    <AppShell breadcrumbs={[{ label: 'Expenses', href: '/expenses' }, { label: breadcrumbLabel }]}>
      <div className="gap-fn-6 mx-auto flex w-full max-w-3xl flex-col">
        <Button variant="ghost" size="sm" className="self-start" onClick={() => router.back()}>
          <ArrowLeft className="h-fn-3_5 w-fn-3_5" /> Back
        </Button>

        {claimQuery.isPending && <Skeleton className="h-[420px] w-full" />}
        {claimQuery.isError && (
          <Alert tone="danger">
            {(claimQuery.error as Error).message ?? EXPENSE_COPY.claimLoadError}
          </Alert>
        )}

        {claim && (
          <>
            <div className="gap-fn-2 flex flex-col">
              <div className="gap-fn-2 flex flex-wrap items-center">
                <h1 className="text-fn-fg font-fn-semibold tracking-fn-tight font-mono text-[22px]">
                  {claim.claimNumber}
                </h1>
                <ExpenseClaimStatusBadge status={claim.status} />
              </div>
              <p className="text-fn-fg-muted text-[13px]">
                {claim.employee.fullName}
                <span className="text-fn-fg-faint">
                  {' · '}
                  {claim.employee.eid}
                  {claim.employee.departmentName ? ` · ${claim.employee.departmentName}` : ''}
                  {' · '}
                  {expenseCategoryLabel(claim.category)}
                </span>
              </p>
            </div>

            <ExpenseClaimOutcomeBanner claim={claim} />

            {isOwnEditableClaim ? (
              <div className="gap-fn-5 flex flex-col">
                <ExpenseClaimReturnedEditor claim={claim} />
                <ExpenseClaimReadOnlyView claim={claim} documentsEditable hideSummary />
                <div>
                  <Button
                    onClick={async () => {
                      try {
                        await resubmit.mutateAsync(claim.id);
                        toast.success(EXPENSE_COPY.submitSuccess);
                      } catch (err) {
                        toast.error((err as Error).message);
                      }
                    }}
                  >
                    {EXPENSE_COPY.submitToFinance}
                  </Button>
                </div>
              </div>
            ) : (
              <ExpenseClaimReadOnlyView claim={claim} />
            )}

            {canApprove && claim.status === 'pending_approval' && (
              <div className="gap-fn-2 flex flex-wrap">
                <Button variant="ghost" onClick={() => setReturnOpen(true)}>
                  {EXPENSE_COPY.returnForCorrection}
                </Button>
                <Button variant="outline" onClick={() => setRejectOpen(true)}>
                  {EXPENSE_COPY.rejectClaim}
                </Button>
                <Button disabled={!approval} onClick={() => setApproveOpen(true)}>
                  {EXPENSE_COPY.approveClaim}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{EXPENSE_COPY.rejectClaim}</DialogTitle>
          </DialogHeader>
          <ExpenseFinanceReasonFields
            reasonCode={reasonCode}
            onReasonCodeChange={setReasonCode}
            comment={comment}
            onCommentChange={setComment}
            reasonLabel="Reason"
            commentLabel="Comment (optional)"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!approval || !reasonCode || reject.isPending}
              onClick={async () => {
                if (!approval || !reasonCode) return;
                try {
                  await reject.mutateAsync({
                    id: approval.id,
                    reason: formatExpenseFinanceFeedback(reasonCode, comment),
                    reasonCode,
                    comment: comment.trim() || undefined,
                  });
                  toast.success('Claim rejected.');
                  setRejectOpen(false);
                } catch (err) {
                  toast.error((err as Error).message);
                }
              }}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{EXPENSE_COPY.returnForCorrection}</DialogTitle>
          </DialogHeader>
          <ExpenseFinanceReasonFields
            reasonCode={reasonCode}
            onReasonCodeChange={setReasonCode}
            comment={comment}
            onCommentChange={setComment}
            reasonLabel="Reason"
            commentLabel="Comment (optional)"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReturnOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!reasonCode || ret.isPending}
              onClick={async () => {
                if (!reasonCode) return;
                try {
                  await ret.mutateAsync({
                    id,
                    input: { reasonCode, comment: comment.trim() || undefined },
                  });
                  toast.success('Returned for correction.');
                  setReturnOpen(false);
                } catch (err) {
                  toast.error((err as Error).message);
                }
              }}
            >
              Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{EXPENSE_COPY.approveDialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="gap-fn-1_5 flex flex-col">
            <Label htmlFor="approve-note">Note (optional)</Label>
            <Textarea
              id="approve-note"
              rows={3}
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!approval || approve.isPending}
              onClick={async () => {
                if (!approval) return;
                try {
                  await approve.mutateAsync({
                    id: approval.id,
                    input: {
                      confirmationData: approveNote.trim()
                        ? { notes: approveNote.trim() }
                        : undefined,
                    },
                  });
                  toast.success('Claim approved.');
                  setApproveOpen(false);
                } catch (err) {
                  toast.error((err as Error).message);
                }
              }}
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
