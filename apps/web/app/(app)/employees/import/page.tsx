'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Download, Upload, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { CsvImportPreview, CsvImportCommitResult } from '@futurenostics/types';
import { AppShell } from '@/components/shell/app-shell';
import { Button } from '@/components/ui/button';
import { useImportCommit, useImportPreview } from '@/lib/queries/employees';
import { cn } from '@/lib/utils';

type Step = 'upload' | 'preview' | 'result';

export default function ImportPage() {
  const router = useRouter();
  const previewMutation = useImportPreview();
  const commitMutation = useImportCommit();

  const [step, setStep] = React.useState<Step>('upload');
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<CsvImportPreview | null>(null);
  const [result, setResult] = React.useState<CsvImportCommitResult | null>(null);

  async function handleFile(files: FileList | null) {
    if (!files || files.length === 0) return;
    const next = files[0]!;
    if (!next.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a .csv file.');
      return;
    }
    if (next.size > 5 * 1024 * 1024) {
      toast.error('Max file size is 5MB.');
      return;
    }
    setFile(next);
    try {
      const data = await previewMutation.mutateAsync(next);
      setPreview(data);
      setStep('preview');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function commit() {
    if (!file) return;
    try {
      const data = await commitMutation.mutateAsync(file);
      setResult(data);
      setStep('result');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setStep('upload');
  }

  return (
    <AppShell breadcrumbs={[{ label: 'HR Core' }, { label: 'Employees' }, { label: 'Import' }]}>
      <div className="gap-fn-5 mx-auto flex w-full max-w-4xl flex-col">
        <div className="gap-fn-1 flex flex-col">
          <h1 className="text-fn-fg font-fn-semibold tracking-fn-tight text-[22px]">
            Import employees
          </h1>
          <p className="text-fn-fg-muted text-[13px]">
            Upload a CSV with one employee per row. Headers must match{' '}
            <code className="rounded-fn-xs bg-fn-bg-inset px-fn-1 py-fn-0_5 font-mono text-[12px]">
              fullName, email, departmentName, designationName, joinDate
            </code>{' '}
            (required). Optional headers:{' '}
            <code className="font-mono text-[12px]">
              phone, cnic, statusName, contractType, managerEmail, salaryPkr, dateOfBirth, gender,
              probationEndDate, internshipEndDate
            </code>
            .
          </p>
        </div>

        <Stepper current={step} />

        {step === 'upload' && (
          <UploadStep onFile={handleFile} loading={previewMutation.isPending} file={file} />
        )}
        {step === 'preview' && preview && (
          <PreviewStep
            preview={preview}
            onCommit={commit}
            committing={commitMutation.isPending}
            onBack={reset}
          />
        )}
        {step === 'result' && result && (
          <ResultStep result={result} onNew={reset} onView={() => router.push('/employees')} />
        )}
      </div>
    </AppShell>
  );
}

/* ---------- Steps ---------- */

function Stepper({ current }: { current: Step }) {
  const steps: Array<{ key: Step; label: string }> = [
    { key: 'upload', label: 'Upload' },
    { key: 'preview', label: 'Preview & validate' },
    { key: 'result', label: 'Result' },
  ];
  return (
    <ol className="gap-fn-3 flex items-center text-[13px]">
      {steps.map((s, idx) => {
        const active = s.key === current;
        const done = steps.findIndex((x) => x.key === current) > idx;
        return (
          <li key={s.key} className="gap-fn-3 flex items-center">
            <span
              className={cn(
                'h-fn-6 w-fn-6 rounded-fn-full font-fn-semibold flex items-center justify-center text-[11px]',
                active && 'bg-fn-accent text-fn-accent-fg',
                done && 'bg-fn-accent-soft text-fn-accent-soft-fg',
                !active && !done && 'border-fn-border bg-fn-bg-panel text-fn-fg-muted border',
              )}
            >
              {done ? <CheckCircle2 className="h-fn-3_5 w-fn-3_5" /> : idx + 1}
            </span>
            <span
              className={cn('font-fn-medium', active || done ? 'text-fn-fg' : 'text-fn-fg-muted')}
            >
              {s.label}
            </span>
            {idx < steps.length - 1 && <span className="bg-fn-divider w-fn-8 h-px" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

function UploadStep({
  onFile,
  loading,
  file,
}: {
  onFile: (files: FileList | null) => void;
  loading: boolean;
  file: File | null;
}) {
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div
      className={cn(
        'rounded-fn-lg bg-fn-bg-panel gap-fn-3 p-fn-12 flex flex-col items-center justify-center border-[2px] border-dashed text-center transition-colors',
        dragOver ? 'border-fn-accent bg-fn-accent-soft/30' : 'border-fn-border',
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onFile(e.dataTransfer.files);
      }}
    >
      <div
        className="rounded-fn-lg h-fn-12 w-fn-12 flex items-center justify-center"
        style={{ background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)' }}
      >
        <Upload className="h-fn-5 w-fn-5" />
      </div>
      <div className="gap-fn-1 flex flex-col">
        <p className="text-fn-fg font-fn-medium text-[14px]">
          {loading ? 'Validating…' : 'Drop your CSV here'}
        </p>
        <p className="text-fn-fg-muted text-[12.5px]">
          {file ? file.name : '5 MB max · .csv only'}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => onFile(e.target.files)}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={loading}>
        {file ? 'Replace file' : 'Choose file'}
      </Button>
    </div>
  );
}

function PreviewStep({
  preview,
  onCommit,
  committing,
  onBack,
}: {
  preview: CsvImportPreview;
  onCommit: () => void;
  committing: boolean;
  onBack: () => void;
}) {
  return (
    <div className="gap-fn-4 flex flex-col">
      <div className="gap-fn-3 grid grid-cols-2 sm:grid-cols-4">
        <Summary label="Total rows" value={preview.total} tone="default" />
        <Summary label="Valid" value={preview.valid} tone="success" />
        <Summary label="Warnings" value={preview.warnings} tone="warning" />
        <Summary label="Errors" value={preview.errors} tone="danger" />
      </div>

      <div className="rounded-fn-xs border-fn-border bg-fn-bg-panel shadow-fn-sm overflow-hidden border">
        <table className="w-full text-[12.5px]">
          <thead className="bg-fn-bg-subtle text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight text-[11px] uppercase">
            <tr>
              <th className="w-fn-12 px-fn-3 py-fn-2 text-left">Row</th>
              <th className="w-fn-20 px-fn-3 py-fn-2 text-left">Status</th>
              <th className="px-fn-3 py-fn-2 text-left">Full name</th>
              <th className="px-fn-3 py-fn-2 text-left">Email</th>
              <th className="px-fn-3 py-fn-2 text-left">Department</th>
              <th className="px-fn-3 py-fn-2 text-left">Issues</th>
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row) => (
              <tr key={row.rowNumber} className="border-fn-divider border-t align-top">
                <td className="text-fn-fg-muted px-fn-3 py-fn-2 tabular-nums">{row.rowNumber}</td>
                <td className="px-fn-3 py-fn-2">
                  <StatusChip status={row.status} />
                </td>
                <td className="text-fn-fg px-fn-3 py-fn-2">{row.raw.fullName ?? '—'}</td>
                <td className="text-fn-fg-muted px-fn-3 py-fn-2">{row.raw.email ?? '—'}</td>
                <td className="text-fn-fg-muted px-fn-3 py-fn-2">
                  {row.raw.departmentName ?? '—'}
                </td>
                <td className="px-fn-3 py-fn-2">
                  {row.errors.length === 0 && row.warnings.length === 0 ? (
                    <span className="text-fn-fg-faint">—</span>
                  ) : (
                    <ul className="gap-fn-1 flex flex-col">
                      {row.errors.map((e, i) => (
                        <li key={`e${i}`} className="text-fn-danger-soft-fg">
                          {e}
                        </li>
                      ))}
                      {row.warnings.map((w, i) => (
                        <li key={`w${i}`} className="text-fn-warning-soft-fg">
                          {w}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="gap-fn-3 flex items-center justify-between">
        <Button variant="secondary" onClick={onBack} disabled={committing}>
          ← Back
        </Button>
        <div className="gap-fn-2 flex items-center">
          {preview.errors > 0 && (
            <a
              href={buildErrorReportUrl(preview)}
              download="employee-import-errors.csv"
              className="text-fn-accent gap-fn-1_5 font-fn-medium inline-flex items-center text-[12.5px] hover:underline"
            >
              <Download className="h-fn-3_5 w-fn-3_5" /> Download error report
            </a>
          )}
          <Button onClick={onCommit} disabled={committing || preview.valid === 0}>
            {committing
              ? 'Importing…'
              : preview.valid === 0
                ? 'No valid rows to import'
                : `Import ${preview.valid} ${preview.valid === 1 ? 'employee' : 'employees'}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ResultStep({
  result,
  onNew,
  onView,
}: {
  result: CsvImportCommitResult;
  onNew: () => void;
  onView: () => void;
}) {
  return (
    <div className="rounded-fn-xs border-fn-border bg-fn-bg-panel shadow-fn-sm gap-fn-4 p-fn-10 flex flex-col items-center border text-center">
      <div
        className="rounded-fn-lg h-fn-12 w-fn-12 flex items-center justify-center"
        style={{ background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)' }}
      >
        <CheckCircle2 className="h-fn-5 w-fn-5" />
      </div>
      <div className="gap-fn-1 flex flex-col">
        <h2 className="text-fn-fg font-fn-semibold text-[16px]">Import complete</h2>
        <p className="text-fn-fg-muted text-[13px]">
          {result.created} created · {result.skipped} skipped
        </p>
      </div>
      <div className="gap-fn-2 flex items-center">
        <Button variant="outline" onClick={onNew}>
          Import another file
        </Button>
        <Button onClick={onView}>View employees</Button>
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'default' | 'success' | 'warning' | 'danger';
}) {
  const toneClasses = {
    default: 'text-fn-fg',
    success: 'text-fn-success-soft-fg',
    warning: 'text-fn-warning-soft-fg',
    danger: 'text-fn-danger-soft-fg',
  }[tone];
  return (
    <div className="rounded-fn-md border-fn-border bg-fn-bg-panel p-fn-4 border">
      <div className="text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight text-[11px] uppercase">
        {label}
      </div>
      <div className={cn('mt-fn-1 font-fn-semibold text-[22px] tabular-nums', toneClasses)}>
        {value}
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: 'valid' | 'warning' | 'error' }) {
  if (status === 'valid')
    return (
      <span className="bg-fn-success-soft text-fn-success-soft-fg gap-fn-1 rounded-fn-full px-fn-2 py-fn-0_5 font-fn-semibold inline-flex items-center text-[10.5px]">
        <CheckCircle2 className="h-fn-3 w-fn-3" /> Valid
      </span>
    );
  if (status === 'warning')
    return (
      <span className="bg-fn-warning-soft text-fn-warning-soft-fg gap-fn-1 rounded-fn-full px-fn-2 py-fn-0_5 font-fn-semibold inline-flex items-center text-[10.5px]">
        <AlertCircle className="h-fn-3 w-fn-3" /> Warning
      </span>
    );
  return (
    <span className="bg-fn-danger-soft text-fn-danger-soft-fg gap-fn-1 rounded-fn-full px-fn-2 py-fn-0_5 font-fn-semibold inline-flex items-center text-[10.5px]">
      <XCircle className="h-fn-3 w-fn-3" /> Error
    </span>
  );
}

function buildErrorReportUrl(preview: CsvImportPreview): string {
  const lines: string[] = ['rowNumber,errors'];
  for (const row of preview.rows) {
    if (row.errors.length === 0) continue;
    lines.push(`${row.rowNumber},"${row.errors.join('; ').replace(/"/g, '""')}"`);
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  return URL.createObjectURL(blob);
}
