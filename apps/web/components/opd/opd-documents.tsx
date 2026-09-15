'use client';

import * as React from 'react';
import { FileText, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { OpdClaimPublic } from '@futurenostics/types';
import { OPD_CLAIM_MAX_DOCUMENTS } from '@futurenostics/types';
import { Button } from '@/components/ui/button';
import { OPD_COPY } from '@/components/opd/opd-copy';
import { useRemoveOpdDocument, useUploadOpdDocument } from '@/lib/queries/opd';

export function OpdDocumentsSection({
  claim,
  editable,
}: {
  claim: OpdClaimPublic;
  editable: boolean;
}) {
  const upload = useUploadOpdDocument(claim.id);
  const remove = useRemoveOpdDocument(claim.id);
  const atLimit = claim.documentCount >= OPD_CLAIM_MAX_DOCUMENTS;

  return (
    <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs overflow-hidden border">
      <div className="border-fn-divider px-fn-5 py-fn-3 border-b">
        <h2 className="text-fn-fg font-fn-semibold text-[14px]">
          {OPD_COPY.documentsSectionTitle}
        </h2>
        <p className="text-fn-fg-muted mt-fn-0_5 text-[12px]">
          {OPD_COPY.documentsHint(OPD_CLAIM_MAX_DOCUMENTS)}
        </p>
      </div>
      <div className="gap-fn-3 px-fn-5 py-fn-4 flex flex-col">
        {claim.documents.length === 0 && (
          <p className="text-fn-fg-faint text-[13px]">{OPD_COPY.documentsEmpty}</p>
        )}
        {claim.documents.map((doc) => (
          <DocumentRow
            key={doc.id}
            fileName={doc.fileName}
            url={doc.url}
            editable={editable}
            removing={remove.isPending}
            onRemove={() =>
              remove.mutate(doc.id, {
                onSuccess: () => toast.success(OPD_COPY.documentsRemoveSuccess),
                onError: (err) => toast.error((err as Error).message),
              })
            }
          />
        ))}
        {editable && (
          <div className="gap-fn-2 flex flex-wrap items-center">
            <Button variant="secondary" size="sm" disabled={atLimit || upload.isPending} asChild>
              <label className={atLimit ? 'pointer-events-none opacity-50' : 'cursor-pointer'}>
                <Upload className="h-fn-3_5 w-fn-3_5" /> {OPD_COPY.addDocument}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  disabled={atLimit}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (!f) return;
                    upload.mutate(f, {
                      onSuccess: () => toast.success(OPD_COPY.documentsUploadSuccess),
                      onError: (err) => toast.error((err as Error).message),
                    });
                  }}
                />
              </label>
            </Button>
            <span className="text-fn-fg-faint text-[12px]">
              {OPD_COPY.documentsCount(claim.documentCount, OPD_CLAIM_MAX_DOCUMENTS)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentRow({
  fileName,
  url,
  editable,
  removing,
  onRemove,
}: {
  fileName: string;
  url: string | null;
  editable: boolean;
  removing: boolean;
  onRemove: () => void;
}) {
  const isPdf = fileName.toLowerCase().endsWith('.pdf');
  return (
    <div className="border-fn-divider gap-fn-2 py-fn-2 flex items-start justify-between border-b last:border-b-0">
      <div className="min-w-0 flex-1">
        {url && isPdf && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-fn-accent gap-fn-2 font-fn-medium inline-flex items-center text-[13px] underline"
          >
            <FileText className="h-fn-4 w-fn-4 shrink-0" /> {fileName}
          </a>
        )}
        {url && !isPdf && (
          <div className="gap-fn-2 flex flex-col">
            <span className="text-fn-fg text-[13px]">{fileName}</span>
            <img
              src={url}
              alt={fileName}
              className="border-fn-border rounded-fn-sm max-h-[320px] w-auto max-w-full border"
            />
          </div>
        )}
        {!url && <span className="text-fn-fg text-[13px]">{fileName}</span>}
      </div>
      {editable && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={removing}
          onClick={onRemove}
          aria-label={`Remove ${fileName}`}
        >
          <Trash2 className="h-fn-3_5 w-fn-3_5" />
        </Button>
      )}
    </div>
  );
}
