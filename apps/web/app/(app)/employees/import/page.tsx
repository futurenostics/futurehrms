'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  Eye,
  FileText,
  Shield,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { CsvImportCommitResult, CsvImportPreview, CsvImportRow } from '@futurenostics/types';
import { AppShell } from '@/components/shell/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { EmployeeAvatar } from '@/components/employees/employee-avatar';
import { useImportCommit, useImportPreview } from '@/lib/queries/employees';
import { cn } from '@/lib/utils';

/**
 * Bulk CSV import — matches docs/design/screens/employees.jsx
 * `CSVImport` (L281-595) and the design canvas's "06 · Bulk CSV
 * import" artboard.
 *
 * Four-step flow:
 *   1. Upload  — drop / pick a .csv (max 5MB)
 *   2. Map columns  — confirm or override how each CSV column maps
 *      to a system field. Smart defaults via header-name heuristics;
 *      the backend's existing flexible header parser is the ultimate
 *      consumer, so the mapping is a confirmation surface today.
 *   3. Review  — file summary card + status strip + error rows with
 *      field-level fixes + ready-rows preview table + sticky action
 *      bar. The visual fidelity reference is the design's screen 06.
 *   4. Confirm  — final summary, single Confirm button, success state.
 */

type Step = 'upload' | 'map' | 'review' | 'confirm';
const STEP_ORDER: Step[] = ['upload', 'map', 'review', 'confirm'];

export default function ImportPage() {
  const router = useRouter();
  const previewMutation = useImportPreview();
  const commitMutation = useImportCommit();

  const [step, setStep] = React.useState<Step>('upload');
  const [file, setFile] = React.useState<File | null>(null);
  const [uploadedAt, setUploadedAt] = React.useState<Date | null>(null);
  const [preview, setPreview] = React.useState<CsvImportPreview | null>(null);
  const [result, setResult] = React.useState<CsvImportCommitResult | null>(null);
  const [mapping, setMapping] = React.useState<Record<string, SystemField | ''>>({});

  async function onPickFile(picked: File) {
    if (!picked.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a .csv file.');
      return;
    }
    if (picked.size > 5 * 1024 * 1024) {
      toast.error('Max file size is 5MB.');
      return;
    }
    setFile(picked);
    setUploadedAt(new Date());
    try {
      const data = await previewMutation.mutateAsync(picked);
      setPreview(data);
      // Seed the mapping with smart guesses from the first row's headers.
      const headers = Object.keys(data.rows[0]?.raw ?? {});
      const seeded: Record<string, SystemField | ''> = {};
      for (const h of headers) seeded[h] = guessField(h);
      setMapping(seeded);
      setStep('map');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function confirmImport() {
    if (!file) return;
    try {
      const data = await commitMutation.mutateAsync(file);
      setResult(data);
      setStep('confirm');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function reset() {
    setFile(null);
    setUploadedAt(null);
    setPreview(null);
    setResult(null);
    setMapping({});
    setStep('upload');
  }

  // Step indices for the stepper visual + back/forward nav.
  const stepIndex = STEP_ORDER.indexOf(step);
  const headers = preview ? Object.keys(preview.rows[0]?.raw ?? {}) : [];

  return (
    <AppShell breadcrumbs={[{ label: 'HR Core' }, { label: 'Employees' }, { label: 'Import' }]}>
      <div className="gap-fn-5 mx-auto flex w-full max-w-[1080px] flex-col">
        {/* Header — back link · step indicator · title · description */}
        <div className="gap-fn-3 flex flex-wrap items-end justify-between">
          <div>
            <div className="gap-fn-2 mb-fn-2 flex items-center text-[13px]">
              <Link
                href="/employees"
                className="text-fn-accent-soft-fg font-fn-semibold gap-fn-1 inline-flex cursor-pointer items-center hover:underline"
              >
                <ChevronLeft className="h-fn-3_5 w-fn-3_5" />
                Back to employees
              </Link>
              <span aria-hidden className="text-fn-fg-faint">
                ·
              </span>
              <span className="text-fn-fg-muted">
                Step {stepIndex + 1} of {STEP_ORDER.length}
              </span>
            </div>
            <h1
              className="text-fn-fg font-fn-semibold m-0 text-[26px]"
              style={{ letterSpacing: '-0.025em' }}
            >
              {step === 'upload' && 'Upload your employee CSV'}
              {step === 'map' && 'Map columns to system fields'}
              {step === 'review' && 'Review before importing'}
              {step === 'confirm' && (result ? 'Import complete' : 'Confirm import')}
            </h1>
            <p className="text-fn-fg-muted mt-fn-1_5 max-w-[560px] text-[14px]">
              {step === 'upload' &&
                'One employee per row. Headers map to system fields in the next step.'}
              {step === 'map' &&
                `We've guessed the mapping from your headers. Adjust any column to match the correct field, then continue to review.`}
              {step === 'review' &&
                preview &&
                `We parsed ${preview.total} ${preview.total === 1 ? 'employee' : 'employees'} from your file. ${preview.valid} ${preview.valid === 1 ? 'is' : 'are'} good to go${preview.errors > 0 ? ` — fix or skip the ${preview.errors} ${preview.errors === 1 ? 'row' : 'rows'} below to continue.` : '.'}`}
              {step === 'confirm' &&
                (result
                  ? `${result.created} ${result.created === 1 ? 'employee' : 'employees'} created${result.skipped > 0 ? `, ${result.skipped} skipped` : ''}.`
                  : 'Last chance to review counts before the import runs.')}
            </p>
          </div>
        </div>

        <Stepper current={step} />

        {step === 'upload' && (
          <UploadStep onFile={onPickFile} loading={previewMutation.isPending} file={file} />
        )}

        {step === 'map' && preview && (
          <MapStep
            file={file}
            uploadedAt={uploadedAt}
            preview={preview}
            headers={headers}
            mapping={mapping}
            onChangeMapping={(header, field) =>
              setMapping((prev) => ({ ...prev, [header]: field }))
            }
            onBack={reset}
            onNext={() => setStep('review')}
          />
        )}

        {step === 'review' && preview && file && (
          <ReviewStep
            file={file}
            uploadedAt={uploadedAt}
            preview={preview}
            onReupload={reset}
            onBack={() => setStep('map')}
            onConfirm={() => setStep('confirm')}
          />
        )}

        {step === 'confirm' && (
          <ConfirmStep
            preview={preview}
            result={result}
            committing={commitMutation.isPending}
            onBack={() => setStep('review')}
            onConfirm={confirmImport}
            onNew={reset}
            onViewList={() => router.push('/employees')}
          />
        )}
      </div>
    </AppShell>
  );
}

/* ─────────────── Stepper ─────────────── */

function Stepper({ current }: { current: Step }) {
  const items: Array<{ key: Step; label: string }> = [
    { key: 'upload', label: 'Upload' },
    { key: 'map', label: 'Map columns' },
    { key: 'review', label: 'Review' },
    { key: 'confirm', label: 'Confirm' },
  ];
  const curIdx = STEP_ORDER.indexOf(current);
  return (
    <ol className="gap-fn-1 flex items-center" aria-label="Import progress">
      {items.map((s, idx) => {
        const done = idx < curIdx;
        const active = idx === curIdx;
        return (
          <React.Fragment key={s.key}>
            <li
              className={cn(
                'gap-fn-2 rounded-fn-full pl-fn-1 pr-fn-3 py-fn-1 inline-flex items-center',
                active && 'bg-fn-accent-soft',
              )}
            >
              <span
                className={cn(
                  'rounded-fn-full font-fn-semibold h-fn-5 w-fn-5 inline-flex items-center justify-center text-[10.5px]',
                  done && 'bg-fn-success text-fn-accent-fg',
                  active && 'bg-fn-accent text-fn-accent-fg',
                  !done && !active && 'border-fn-border-strong text-fn-fg-faint border-[1.5px]',
                )}
              >
                {done ? <Check className="h-fn-3 w-fn-3" strokeWidth={3} /> : idx + 1}
              </span>
              <span
                className={cn(
                  'text-[13px]',
                  active && 'text-fn-accent-soft-fg font-fn-semibold',
                  done && 'text-fn-fg font-fn-medium',
                  !done && !active && 'text-fn-fg-faint font-fn-medium',
                )}
              >
                {s.label}
              </span>
            </li>
            {idx < items.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  'rounded-fn-full w-fn-6 h-px',
                  idx < curIdx ? 'bg-fn-success' : 'bg-fn-border',
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </ol>
  );
}

/* ─────────────── Step 1: Upload ─────────────── */

function UploadStep({
  onFile,
  loading,
  file,
}: {
  onFile: (file: File) => void;
  loading: boolean;
  file: File | null;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onFile(f);
    e.target.value = '';
  }

  return (
    <div className="gap-fn-5 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
      <div
        className={cn(
          'rounded-fn-sm border-fn-border bg-fn-bg-panel gap-fn-3 px-fn-6 py-fn-12 flex flex-col items-center justify-center border border-dashed text-center transition-colors',
          dragging && 'border-fn-accent bg-fn-accent-soft/30',
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
      >
        <span
          aria-hidden
          className="rounded-fn-sm h-fn-12 w-fn-12 bg-fn-accent-soft text-fn-accent-soft-fg inline-flex items-center justify-center"
        >
          <Upload className="h-fn-6 w-fn-6" strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="text-fn-fg font-fn-semibold text-[16px]">
            {loading ? 'Parsing…' : file ? file.name : 'Drop your CSV here'}
          </h2>
          <p className="text-fn-fg-muted mt-fn-1 text-[13px]">
            or click to browse · .csv up to 5 MB
          </p>
        </div>
        <Button
          variant="secondary"
          size="md"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
        >
          <Upload className="h-fn-4 w-fn-4" /> Choose file
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleSelect}
          className="hidden"
        />
      </div>

      <aside className="rounded-fn-sm border-fn-border bg-fn-bg-panel p-fn-5 gap-fn-3 flex flex-col border">
        <h3 className="text-fn-fg font-fn-semibold text-[14px]">CSV expectations</h3>
        <ul className="gap-fn-2 text-fn-fg-muted flex flex-col text-[12.5px]">
          <li>One employee per row, UTF-8 encoded.</li>
          <li>First row is the column headers.</li>
          <li>
            Headers map to system fields in the next step — common variants (Full Name, Email,
            Department, …) auto-match.
          </li>
          <li>Up to 5 MB / ~10,000 rows per upload.</li>
        </ul>
        <div className="border-fn-divider pt-fn-3 mt-fn-2 border-t">
          <a
            href="/templates/employees-import.csv"
            className="text-fn-accent-soft-fg gap-fn-1_5 font-fn-semibold inline-flex items-center text-[12.5px] hover:underline"
            download
          >
            <FileText className="h-fn-3_5 w-fn-3_5" /> Download CSV template
          </a>
        </div>
      </aside>
    </div>
  );
}

/* ─────────────── Step 2: Map columns ─────────────── */

type SystemField =
  | 'firstName'
  | 'lastName'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'joinDate'
  | 'departmentName'
  | 'designationName'
  | 'statusName'
  | 'contractType'
  | 'managerEmail'
  | 'salaryPkr'
  | 'dateOfBirth'
  | 'gender'
  | 'cnic'
  | 'probationEndDate'
  | 'internshipEndDate'
  | 'skip';

const SYSTEM_FIELDS: Array<{ value: SystemField; label: string; required?: boolean }> = [
  { value: 'firstName', label: 'First name' },
  { value: 'lastName', label: 'Last name' },
  { value: 'fullName', label: 'Full name', required: true },
  { value: 'email', label: 'Work email', required: true },
  { value: 'phone', label: 'Phone' },
  { value: 'joinDate', label: 'Join date', required: true },
  { value: 'departmentName', label: 'Department', required: true },
  { value: 'designationName', label: 'Designation', required: true },
  { value: 'statusName', label: 'Status' },
  { value: 'contractType', label: 'Contract type' },
  { value: 'managerEmail', label: 'Manager email' },
  { value: 'salaryPkr', label: 'Salary (PKR)' },
  { value: 'dateOfBirth', label: 'Date of birth' },
  { value: 'gender', label: 'Gender' },
  { value: 'cnic', label: 'CNIC' },
  { value: 'probationEndDate', label: 'Probation end date' },
  { value: 'internshipEndDate', label: 'Internship end date' },
  { value: 'skip', label: '— Skip this column —' },
];

const FIELD_GUESS_PATTERNS: Array<[RegExp, SystemField]> = [
  [/^first[\s_]*name$/i, 'firstName'],
  [/^last[\s_]*name$/i, 'lastName'],
  [/^full[\s_]*name$|^name$/i, 'fullName'],
  [/(work[\s_]*)?email/i, 'email'],
  [/phone|mobile|cell/i, 'phone'],
  [/join|start|hire/i, 'joinDate'],
  [/depart/i, 'departmentName'],
  [/desig|title|role/i, 'designationName'],
  [/status/i, 'statusName'],
  [/contract/i, 'contractType'],
  [/manager/i, 'managerEmail'],
  [/salary|pay|wage|comp/i, 'salaryPkr'],
  [/dob|birth/i, 'dateOfBirth'],
  [/gender/i, 'gender'],
  [/cnic|nic|ssn/i, 'cnic'],
  [/probation/i, 'probationEndDate'],
  [/intern.*end|intern.*until/i, 'internshipEndDate'],
];

function guessField(header: string): SystemField | '' {
  for (const [re, field] of FIELD_GUESS_PATTERNS) {
    if (re.test(header)) return field;
  }
  return '';
}

function MapStep({
  file,
  uploadedAt,
  preview,
  headers,
  mapping,
  onChangeMapping,
  onBack,
  onNext,
}: {
  file: File | null;
  uploadedAt: Date | null;
  preview: CsvImportPreview;
  headers: string[];
  mapping: Record<string, SystemField | ''>;
  onChangeMapping: (header: string, field: SystemField | '') => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const requiredFields = SYSTEM_FIELDS.filter((f) => f.required).map((f) => f.value);
  const mappedSet = new Set(Object.values(mapping));
  const missingRequired = requiredFields.filter((f) => !mappedSet.has(f));
  const canContinue =
    missingRequired.length === 0 ||
    mappedSet.has('fullName') ||
    (mappedSet.has('firstName') && mappedSet.has('lastName'));

  return (
    <>
      <FileCard file={file} uploadedAt={uploadedAt} rowCount={preview.total} onReupload={onBack} />

      <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel overflow-hidden border">
        <div className="border-fn-divider gap-fn-3 px-fn-5 py-fn-4 flex items-center justify-between border-b">
          <div>
            <h2 className="text-fn-fg font-fn-semibold text-[15px]">Column mapping</h2>
            <p className="text-fn-fg-muted mt-fn-0_5 text-[12.5px]">
              {headers.length} {headers.length === 1 ? 'column' : 'columns'} detected · pick a
              system field for each.
            </p>
          </div>
          {missingRequired.length > 0 && !canContinue && (
            <Badge tone="warning" icon={<AlertTriangle className="h-fn-3 w-fn-3" />}>
              {missingRequired.length} required {missingRequired.length === 1 ? 'field' : 'fields'}{' '}
              unmapped
            </Badge>
          )}
        </div>

        <div className="gap-fn-3 p-fn-5 grid grid-cols-1 sm:grid-cols-2">
          {headers.map((header) => {
            const sample = preview.rows[0]?.raw[header] ?? '';
            const current = mapping[header] ?? '';
            return (
              <div
                key={header}
                className="rounded-fn-xs border-fn-border bg-fn-bg-subtle p-fn-3 gap-fn-2 flex flex-col border"
              >
                <div className="gap-fn-2 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-fn-fg font-fn-semibold truncate text-[13px]">{header}</div>
                    {sample && (
                      <div className="text-fn-fg-faint mt-fn-0_5 truncate font-mono text-[11.5px]">
                        sample: {sample}
                      </div>
                    )}
                  </div>
                  <ArrowRight className="text-fn-fg-faint h-fn-3_5 w-fn-3_5 shrink-0" />
                </div>
                <Combobox
                  options={SYSTEM_FIELDS.map((f) => ({
                    value: f.value,
                    label: f.label + (f.required ? ' *' : ''),
                  }))}
                  value={current}
                  onValueChange={(v) => onChangeMapping(header, (v as SystemField) || '')}
                  placeholder="Choose a field…"
                />
              </div>
            );
          })}
        </div>
      </div>

      <ActionBar
        message={
          canContinue
            ? `Mapped ${headers.length - Object.values(mapping).filter((m) => m === 'skip' || m === '').length} of ${headers.length} columns.`
            : `Map at least Full name (or First + Last), Email, Department, Designation, and Join date to continue.`
        }
        onBack={onBack}
        backLabel="Re-upload"
        primary={
          <Button onClick={onNext} disabled={!canContinue}>
            Continue to review <ArrowRight className="h-fn-3_5 w-fn-3_5" />
          </Button>
        }
      />
    </>
  );
}

/* ─────────────── Step 3: Review ─────────────── */

function ReviewStep({
  file,
  uploadedAt,
  preview,
  onReupload,
  onBack,
  onConfirm,
}: {
  file: File;
  uploadedAt: Date | null;
  preview: CsvImportPreview;
  onReupload: () => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const errorRows = preview.rows.filter((r) => r.status === 'error');
  const readyRows = preview.rows.filter((r) => r.status !== 'error');
  return (
    <>
      <FileCardWithStatusStrip
        file={file}
        uploadedAt={uploadedAt}
        preview={preview}
        onReupload={onReupload}
      />

      {errorRows.length > 0 && (
        <section className="gap-fn-3 flex flex-col">
          <header className="gap-fn-2 flex items-baseline justify-between">
            <div>
              <h2 className="text-fn-fg font-fn-semibold text-[15px]">Fix these to continue</h2>
              <p className="text-fn-fg-muted mt-fn-0_5 text-[12.5px]">
                {errorRows.length} {errorRows.length === 1 ? 'row has issues' : 'rows have issues'}.
                Skip rows you don't want to import.
              </p>
            </div>
          </header>
          <div className="gap-fn-2_5 flex flex-col">
            {errorRows.map((row) => (
              <ErrorRowCard key={row.rowNumber} row={row} />
            ))}
          </div>
        </section>
      )}

      <ReadyRowsCard rows={readyRows} />

      <ActionBar
        message={
          <>
            <Shield className="h-fn-3_5 w-fn-3_5 text-fn-fg-muted" />
            Continuing imports{' '}
            <strong className="text-fn-fg font-fn-semibold">{preview.valid} employees</strong>.
            {errorRows.length > 0 && ' Errored rows will be skipped unless fixed above.'}
          </>
        }
        onBack={onBack}
        backLabel="Back"
        primary={
          <Button onClick={onConfirm} disabled={preview.valid === 0}>
            Continue with {preview.valid} {preview.valid === 1 ? 'row' : 'rows'}{' '}
            <ArrowRight className="h-fn-3_5 w-fn-3_5" />
          </Button>
        }
      />
    </>
  );
}

function ErrorRowCard({ row }: { row: CsvImportRow }) {
  const name =
    row.raw['fullName'] || row.raw['Full Name'] || row.raw['name'] || row.raw['Name'] || '—';
  const email = row.raw['email'] || row.raw['Email'] || row.raw['workEmail'] || '';
  return (
    <div className="rounded-fn-sm border-fn-danger/25 bg-fn-danger-soft/40 overflow-hidden border">
      <div className="gap-fn-3_5 px-fn-4_5 py-fn-3 flex items-center">
        <Badge tone="danger" className="font-mono">
          {String(row.rowNumber).padStart(2, '0')}
        </Badge>
        <div className="min-w-0 flex-1">
          <div className="gap-fn-2 flex items-center">
            <span className="text-fn-fg font-fn-semibold text-[13.5px]">{name}</span>
            {email && (
              <span className="text-fn-fg-muted truncate font-mono text-[11.5px]">· {email}</span>
            )}
          </div>
          <div className="text-fn-fg-faint mt-fn-0_5 text-[11.5px]">
            {row.errors.length} {row.errors.length === 1 ? 'issue' : 'issues'} to resolve
          </div>
        </div>
        <Button size="sm" variant="ghost">
          <X className="h-fn-3_5 w-fn-3_5" /> Skip
        </Button>
      </div>
      <ul className="border-fn-danger/15 border-t">
        {row.errors.map((err, i) => (
          <li
            key={i}
            className={cn(
              'gap-fn-3 px-fn-4_5 py-fn-3 flex items-center text-[12.5px]',
              i > 0 && 'border-fn-danger/10 border-t',
            )}
          >
            <XCircle className="text-fn-danger h-fn-3_5 w-fn-3_5 shrink-0" />
            <span className="text-fn-fg-muted flex-1">{err}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReadyRowsCard({ rows }: { rows: CsvImportRow[] }) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel overflow-hidden border">
      <div className="border-fn-divider gap-fn-2_5 px-fn-5 py-fn-3_5 flex items-center justify-between border-b">
        <div className="gap-fn-2_5 flex items-center">
          <span
            aria-hidden
            className="rounded-fn-xs h-fn-7 w-fn-7 bg-fn-success-soft text-fn-success-soft-fg inline-flex items-center justify-center"
          >
            <Check className="h-fn-3_5 w-fn-3_5" strokeWidth={2.5} />
          </span>
          <div>
            <h2 className="text-fn-fg font-fn-semibold text-[14px]">Ready to import</h2>
            <p className="text-fn-fg-muted text-[12px]">
              {rows.length} {rows.length === 1 ? 'row passed' : 'rows passed'} validation
            </p>
          </div>
        </div>
      </div>
      <div className="p-fn-3_5 overflow-x-auto">
        <table className="w-full min-w-[800px] table-fixed border-collapse text-[13px]">
          <colgroup>
            <col style={{ width: 64 }} />
            <col />
            <col style={{ width: 160 }} />
            <col style={{ width: 160 }} />
            <col style={{ width: 140 }} />
          </colgroup>
          <thead>
            <tr className="bg-fn-bg-subtle [&>td:first-child]:rounded-l-fn-sm [&>td:last-child]:rounded-r-fn-sm">
              <td className="text-fn-fg-muted font-fn-medium py-fn-3 pl-fn-4_5 text-[11px] uppercase tracking-[0.1em]">
                Row
              </td>
              <td className="text-fn-fg-muted font-fn-medium py-fn-3 px-fn-3 text-[11px] uppercase tracking-[0.1em]">
                Name &amp; email
              </td>
              <td className="text-fn-fg-muted font-fn-medium py-fn-3 px-fn-3 text-[11px] uppercase tracking-[0.1em]">
                Department
              </td>
              <td className="text-fn-fg-muted font-fn-medium py-fn-3 px-fn-3 text-[11px] uppercase tracking-[0.1em]">
                Designation
              </td>
              <td className="text-fn-fg-muted font-fn-medium py-fn-3 px-fn-3 text-right text-[11px] uppercase tracking-[0.1em]">
                Salary / mo
              </td>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const r = row.raw;
              const name = r['fullName'] || r['Full Name'] || r['name'] || r['Name'] || '—';
              const email = r['email'] || r['Email'] || '';
              const dept = r['departmentName'] || r['Department'] || r['department'] || '—';
              const desig = r['designationName'] || r['Designation'] || r['designation'] || '—';
              const sal = r['salaryPkr'] || r['Salary'] || r['salary'] || '—';
              const bordered = i < rows.length - 1;
              const cellBorder = bordered ? 'border-b border-fn-divider' : '';
              return (
                <tr key={row.rowNumber}>
                  <td className={cn('py-fn-4 pl-fn-4_5 align-middle', cellBorder)}>
                    <span className="text-fn-fg-faint font-mono text-[11.5px]">
                      {String(row.rowNumber).padStart(2, '0')}
                    </span>
                  </td>
                  <td className={cn('px-fn-3 py-fn-4 align-middle', cellBorder)}>
                    <div className="gap-fn-3 flex items-center">
                      <EmployeeAvatar fullName={name} photoUrl={null} size="sm" />
                      <div className="min-w-0">
                        <div className="text-fn-fg font-fn-semibold truncate text-[13px]">
                          {name}
                        </div>
                        <div className="text-fn-fg-faint truncate font-mono text-[11.5px]">
                          {email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={cn('px-fn-3 py-fn-4 text-fn-fg-muted align-middle', cellBorder)}>
                    {dept}
                  </td>
                  <td className={cn('px-fn-3 py-fn-4 text-fn-fg-muted align-middle', cellBorder)}>
                    {desig}
                  </td>
                  <td
                    className={cn(
                      'px-fn-3 py-fn-4 text-fn-fg font-fn-semibold text-right align-middle font-mono tabular-nums',
                      cellBorder,
                    )}
                  >
                    {sal === '—' ? sal : `₨${formatNum(sal)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────── Step 4: Confirm ─────────────── */

function ConfirmStep({
  preview,
  result,
  committing,
  onBack,
  onConfirm,
  onNew,
  onViewList,
}: {
  preview: CsvImportPreview | null;
  result: CsvImportCommitResult | null;
  committing: boolean;
  onBack: () => void;
  onConfirm: () => void;
  onNew: () => void;
  onViewList: () => void;
}) {
  if (result) {
    return (
      <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel p-fn-8 gap-fn-4 flex flex-col items-center border text-center">
        <span
          aria-hidden
          className="rounded-fn-full bg-fn-success-soft text-fn-success-soft-fg h-fn-14 w-fn-14 inline-flex items-center justify-center"
        >
          <CheckCircle2 className="h-fn-7 w-fn-7" strokeWidth={1.75} />
        </span>
        <div>
          <h2
            className="text-fn-fg font-fn-semibold text-[20px]"
            style={{ letterSpacing: '-0.02em' }}
          >
            Import complete
          </h2>
          <p className="text-fn-fg-muted mt-fn-1 text-[13.5px]">
            <strong className="text-fn-fg font-fn-semibold">{result.created}</strong>{' '}
            {result.created === 1 ? 'employee' : 'employees'} created
            {result.skipped > 0 && ` · ${result.skipped} skipped`}
            {result.errors > 0 && ` · ${result.errors} errored`}.
          </p>
        </div>
        <div className="gap-fn-2 mt-fn-2 flex">
          <Button variant="secondary" onClick={onNew}>
            Import another file
          </Button>
          <Button onClick={onViewList}>View employees</Button>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel p-fn-6 gap-fn-4 flex flex-col border">
        <div className="gap-fn-3 flex items-start">
          <span
            aria-hidden
            className="rounded-fn-sm h-fn-9 w-fn-9 bg-fn-accent-soft text-fn-accent-soft-fg inline-flex shrink-0 items-center justify-center"
          >
            <Eye className="h-fn-4_5 w-fn-4_5" />
          </span>
          <div>
            <h2 className="text-fn-fg font-fn-semibold text-[16px]">You're about to import</h2>
            <p className="text-fn-fg-muted mt-fn-1 text-[13px]">
              <strong className="text-fn-fg font-fn-semibold">{preview?.valid ?? 0}</strong>{' '}
              employees will be created.{' '}
              {preview && preview.errors > 0 && (
                <>The {preview.errors} errored rows will be skipped.</>
              )}{' '}
              This action is all-or-nothing — if any row fails server-side validation, the whole
              batch rolls back.
            </p>
          </div>
        </div>
      </div>

      <ActionBar
        message="Once you click Confirm, the rows are committed to the database in a single transaction."
        onBack={onBack}
        backLabel="Back"
        primary={
          <Button onClick={onConfirm} disabled={committing}>
            {committing ? 'Importing…' : 'Confirm import'}
            {!committing && <ArrowRight className="h-fn-3_5 w-fn-3_5" />}
          </Button>
        }
      />
    </>
  );
}

/* ─────────────── Shared sub-components ─────────────── */

function FileCard({
  file,
  uploadedAt,
  rowCount,
  onReupload,
}: {
  file: File | null;
  uploadedAt: Date | null;
  rowCount: number;
  onReupload: () => void;
}) {
  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel p-fn-5 gap-fn-4 flex items-center border">
      <CsvTile />
      <div className="min-w-0 flex-1">
        <div className="text-fn-fg font-fn-semibold truncate text-[15px]">{file?.name ?? '—'}</div>
        <div className="text-fn-fg-muted gap-fn-3 mt-fn-1 flex flex-wrap text-[12.5px]">
          <span>{file ? formatBytes(file.size) : '—'}</span>
          <span aria-hidden>·</span>
          <span>
            {rowCount} {rowCount === 1 ? 'row' : 'rows'} parsed
          </span>
          {uploadedAt && (
            <>
              <span aria-hidden>·</span>
              <span>Uploaded {relativeTime(uploadedAt)}</span>
            </>
          )}
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={onReupload}>
        <Upload className="h-fn-3_5 w-fn-3_5" /> Re-upload
      </Button>
    </div>
  );
}

function FileCardWithStatusStrip({
  file,
  uploadedAt,
  preview,
  onReupload,
}: {
  file: File;
  uploadedAt: Date | null;
  preview: CsvImportPreview;
  onReupload: () => void;
}) {
  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel overflow-hidden border">
      <div className="gap-fn-4 p-fn-5 flex items-center">
        <CsvTile />
        <div className="min-w-0 flex-1">
          <div className="text-fn-fg font-fn-semibold truncate text-[15px]">{file.name}</div>
          <div className="text-fn-fg-muted gap-fn-3 mt-fn-1 flex flex-wrap text-[12.5px]">
            <span>{formatBytes(file.size)}</span>
            <span aria-hidden>·</span>
            <span>
              {preview.total} {preview.total === 1 ? 'row' : 'rows'} parsed
            </span>
            {uploadedAt && (
              <>
                <span aria-hidden>·</span>
                <span>Uploaded {relativeTime(uploadedAt)}</span>
              </>
            )}
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={onReupload}>
          <Upload className="h-fn-3_5 w-fn-3_5" /> Re-upload
        </Button>
      </div>
      <div className="border-fn-divider grid grid-cols-1 border-t sm:grid-cols-3">
        <StatusCell
          tone="success"
          icon={<Check className="h-fn-4 w-fn-4" strokeWidth={2.5} />}
          value={preview.valid}
          valueLabel={`${preview.valid === 1 ? 'is' : 'are'} ready`}
          sub="Will be created on confirm"
        />
        <StatusCell
          tone="danger"
          icon={<AlertTriangle className="h-fn-4 w-fn-4" strokeWidth={2} />}
          value={preview.errors}
          valueLabel="need attention"
          sub="Fix below, or skip them"
          bordered
        />
        <StatusCell
          icon={<Shield className="h-fn-4 w-fn-4" />}
          text="All-or-nothing import"
          sub="Rolls back if any row fails"
          bordered
        />
      </div>
    </div>
  );
}

function StatusCell({
  tone,
  icon,
  value,
  valueLabel,
  text,
  sub,
  bordered,
}: {
  tone?: 'success' | 'danger';
  icon: React.ReactNode;
  value?: number;
  valueLabel?: string;
  text?: string;
  sub: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={cn(
        'gap-fn-3 px-fn-5 py-fn-4 flex items-center',
        bordered && 'sm:border-fn-divider sm:border-l',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'rounded-fn-xs h-fn-9 w-fn-9 inline-flex shrink-0 items-center justify-center',
          tone === 'success' && 'bg-fn-success-soft text-fn-success-soft-fg',
          tone === 'danger' && 'bg-fn-danger-soft text-fn-danger-soft-fg',
          !tone && 'bg-fn-icon-tile text-fn-icon-tile-fg',
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        {value != null ? (
          <>
            <div
              className="text-fn-fg font-fn-semibold leading-fn-unit text-[22px] tabular-nums"
              style={{ letterSpacing: '-0.02em' }}
            >
              {value} {valueLabel}
            </div>
            <div className="text-fn-fg-faint mt-fn-1 text-[12px]">{sub}</div>
          </>
        ) : (
          <>
            <div className="text-fn-fg font-fn-semibold text-[13.5px]">{text}</div>
            <div className="text-fn-fg-faint mt-fn-1 text-[12px]">{sub}</div>
          </>
        )}
      </div>
    </div>
  );
}

function CsvTile() {
  return (
    <div
      aria-hidden
      className="border-fn-border relative inline-flex shrink-0 items-center justify-center border"
      style={{
        width: 56,
        height: 64,
        borderRadius: 8,
        background: 'linear-gradient(140deg, oklch(0.94 0.04 175) 0%, oklch(0.92 0.06 280) 100%)',
      }}
    >
      <FileText
        className="h-fn-7 w-fn-7"
        style={{ color: 'oklch(0.45 0.16 280)', marginTop: -6 }}
      />
      <span
        className="font-fn-semibold left-fn-1 right-fn-1 absolute text-center text-[9px]"
        style={{
          bottom: 6,
          padding: '2px 0',
          borderRadius: 3,
          color: '#fff',
          background: 'oklch(0.55 0.18 280)',
          letterSpacing: '0.06em',
        }}
      >
        CSV
      </span>
    </div>
  );
}

function ActionBar({
  message,
  backLabel,
  onBack,
  primary,
}: {
  message: React.ReactNode;
  backLabel: string;
  onBack: () => void;
  primary: React.ReactNode;
}) {
  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel shadow-fn-sm gap-fn-3_5 px-fn-5 py-fn-3_5 flex items-center border">
      <div className="text-fn-fg-muted gap-fn-2 flex flex-1 items-center text-[13px]">
        {message}
      </div>
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="h-fn-3_5 w-fn-3_5" /> {backLabel}
      </Button>
      {primary}
    </div>
  );
}

/* ─────────────── Utilities ─────────────── */

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function relativeTime(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} h ago`;
  return date.toLocaleDateString();
}

function formatNum(value: string): string {
  const n = Number(value.replace(/[,\s]/g, ''));
  if (!Number.isFinite(n)) return value;
  return new Intl.NumberFormat('en-PK').format(Math.round(n));
}
