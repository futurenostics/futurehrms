'use client';

import * as React from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { EXPENSE_CLAIM_MAX_DOCUMENTS } from '@futurenostics/types';
import { Button } from '@/components/ui/button';
import { EXPENSE_COPY } from '@/components/expenses/expense-copy';
import { cn } from '@/lib/utils';

const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export function ExpenseDocumentDropzone({
  onSelectFiles,
  disabled = false,
  multiple = true,
  className,
}: {
  onSelectFiles: (files: File[]) => void;
  disabled?: boolean;
  multiple?: boolean;
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  function ingest(incoming: FileList | null) {
    if (!incoming?.length || disabled) return;
    onSelectFiles(Array.from(incoming));
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        accept={ACCEPT}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          ingest(e.target.files);
          e.target.value = '';
        }}
      />
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        className={cn(
          'rounded-fn-xs border-fn-border bg-fn-bg-subtle/40 px-fn-4 py-fn-5 gap-fn-2 flex flex-col items-center border border-dashed text-center transition-colors',
          dragOver && !disabled && 'border-fn-accent bg-fn-accent-soft/30',
          !disabled && 'hover:border-fn-border-strong cursor-pointer',
          disabled && 'cursor-not-allowed opacity-60',
          className,
        )}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (disabled) return;
          ingest(e.dataTransfer.files);
        }}
      >
        <span className="bg-fn-bg-panel border-fn-border text-fn-fg-muted rounded-fn-full h-fn-10 w-fn-10 flex items-center justify-center border">
          <Upload className="h-fn-4 w-fn-4" aria-hidden />
        </span>
        <div className="gap-fn-0_5 flex flex-col">
          <p className="text-fn-fg text-[13px]">
            <span className="font-fn-medium">Choose files</span>
            <span className="text-fn-fg-muted"> or drag and drop</span>
          </p>
          <p className="text-fn-fg-faint text-[11.5px]">{EXPENSE_COPY.filePickerHint}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          className="mt-fn-1"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) inputRef.current?.click();
          }}
        >
          Browse
        </Button>
      </div>
    </>
  );
}

export function ExpenseDocumentPicker({
  files,
  onFilesChange,
  maxFiles = EXPENSE_CLAIM_MAX_DOCUMENTS,
  disabled = false,
}: {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}) {
  const atMax = files.length >= maxFiles;

  function addIncoming(incoming: File[]) {
    if (disabled || incoming.length === 0) return;
    onFilesChange([...files, ...incoming].slice(0, maxFiles));
  }

  function removeAt(index: number) {
    if (disabled) return;
    onFilesChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="gap-fn-3 flex flex-col">
      <p className="text-fn-fg-faint text-[12px]">
        {EXPENSE_COPY.documentsCount(files.length, maxFiles)}
      </p>
      {!atMax && (
        <ExpenseDocumentDropzone onSelectFiles={addIncoming} disabled={disabled} multiple />
      )}
      {files.length > 0 ? (
        <ul className="gap-fn-2 flex flex-col">
          {files.map((file, index) => (
            <li
              key={fileKey(file)}
              className="border-fn-border bg-fn-bg-panel rounded-fn-xs px-fn-3 py-fn-2 gap-fn-2 flex items-center border"
            >
              <span className="bg-fn-bg-inset text-fn-fg-muted rounded-fn-xs h-fn-8 w-fn-8 flex shrink-0 items-center justify-center">
                <FileText className="h-fn-3_5 w-fn-3_5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-fn-fg truncate text-[13px]">{file.name}</p>
                <p className="text-fn-fg-faint text-[11.5px]">{formatFileSize(file.size)}</p>
              </div>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-fn-fg-muted shrink-0"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => removeAt(index)}
                >
                  <X className="h-fn-3_5 w-fn-3_5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
