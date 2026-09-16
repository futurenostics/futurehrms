'use client';

import { EXPENSE_FINANCE_REASON_CODES, type ExpenseFinanceReasonCode } from '@futurenostics/types';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ExpenseFinanceReasonFields({
  reasonCode,
  onReasonCodeChange,
  comment,
  onCommentChange,
  reasonLabel,
  commentLabel,
  commentPlaceholder,
}: {
  reasonCode: ExpenseFinanceReasonCode | '';
  onReasonCodeChange: (code: ExpenseFinanceReasonCode) => void;
  comment: string;
  onCommentChange: (value: string) => void;
  reasonLabel: string;
  commentLabel: string;
  commentPlaceholder?: string;
}) {
  return (
    <div className="gap-fn-3 flex flex-col">
      <div className="gap-fn-1_5 flex flex-col">
        <Label>
          {reasonLabel}
          <span className="text-fn-danger ml-fn-1">*</span>
        </Label>
        <Select
          value={reasonCode || undefined}
          onValueChange={(v) => onReasonCodeChange(v as ExpenseFinanceReasonCode)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a reason" />
          </SelectTrigger>
          <SelectContent>
            {EXPENSE_FINANCE_REASON_CODES.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="gap-fn-1_5 flex flex-col">
        <Label htmlFor="expense-finance-comment">{commentLabel}</Label>
        <Textarea
          id="expense-finance-comment"
          rows={3}
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder={commentPlaceholder}
        />
      </div>
    </div>
  );
}
