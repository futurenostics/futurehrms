'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import { EXPENSE_CLAIM_MAX_DOCUMENTS } from '@futurenostics/types';
import type { ExpenseClaimDocumentPublic } from '@futurenostics/types';
import { Button } from '@/components/ui/button';
import { EXPENSE_COPY } from '@/components/expenses/expense-copy';
import { ExpenseDocumentDropzone } from '@/components/expenses/expense-document-picker';
import { useRemoveExpenseDocument, useUploadExpenseDocument } from '@/lib/queries/expenses';

export function ExpenseDocumentsSection({
  claimId,
  documents,
  editable,
}: {
  claimId: string;
  documents: ExpenseClaimDocumentPublic[];
  editable: boolean;
}) {
  const upload = useUploadExpenseDocument(claimId);
  const remove = useRemoveExpenseDocument(claimId);
  const atMax = documents.length >= EXPENSE_CLAIM_MAX_DOCUMENTS;

  async function handleSelect(files: File[]) {
    const file = files[0];
    if (!file) return;
    try {
      await upload.mutateAsync(file);
      toast.success(EXPENSE_COPY.documentsUploadSuccess);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="gap-fn-3 flex flex-col">
      <div>
        <p className="text-fn-fg-muted text-[12px]">{EXPENSE_COPY.documentsSectionTitle}</p>
        <p className="text-fn-fg-faint mt-fn-0_5 text-[12px]">
          {EXPENSE_COPY.documentsCount(documents.length, EXPENSE_CLAIM_MAX_DOCUMENTS)}
        </p>
      </div>
      {documents.length === 0 && !editable ? (
        <p className="text-fn-fg-muted text-[13px]">{EXPENSE_COPY.documentsEmpty}</p>
      ) : (
        <ul className="gap-fn-2 flex flex-col">
          {documents.map((doc) => (
            <li key={doc.id} className="rounded-fn-xs px-fn-3 py-fn-2 gap-fn-2 flex items-center">
              <span className="bg-fn-bg-inset text-fn-fg-muted rounded-fn-xs h-fn-8 w-fn-8 flex shrink-0 items-center justify-center">
                <FileText className="h-fn-3_5 w-fn-3_5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                {doc.url ? (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-fn-fg hover:text-fn-accent block truncate text-[13px] transition-colors"
                  >
                    {doc.fileName}
                  </a>
                ) : (
                  <span className="text-fn-fg block truncate text-[13px]">{doc.fileName}</span>
                )}
              </div>
              {editable && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={async () => {
                    try {
                      await remove.mutateAsync(doc.id);
                      toast.success(EXPENSE_COPY.documentsRemoveSuccess);
                    } catch (err) {
                      toast.error((err as Error).message);
                    }
                  }}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && !atMax && (
        <ExpenseDocumentDropzone
          onSelectFiles={(files) => void handleSelect(files)}
          disabled={upload.isPending}
          multiple={false}
        />
      )}
      {editable && atMax ? (
        <p className="text-fn-fg-faint text-[12px]">
          Maximum {EXPENSE_CLAIM_MAX_DOCUMENTS} files attached.
        </p>
      ) : null}
    </div>
  );
}
