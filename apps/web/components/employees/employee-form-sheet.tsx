'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowDown,
  Briefcase,
  BadgeAlert,
  IdCard,
  Info,
  Landmark,
  LifeBuoy,
  Mail,
  ShieldCheck,
  UserCircle2,
  Users,
  Wallet,
} from 'lucide-react';
import {
  contractTypeSchema,
  employeeCreateSchema,
  employmentRecordSchema,
  systemRoleSchema,
  terminateEmployeeSchema,
  type EmployeeCreateInput,
  type EmployeePublic,
  type EmploymentRecord,
  type Gender,
  type SystemRole,
  type TerminateEmployeeInput,
} from '@futurenostics/types';
import { Alert } from '@/components/ui/alert';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Combobox } from '@/components/ui/combobox';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmployeeAvatar } from '@/components/employees/employee-avatar';
import { apiFetch } from '@/lib/api-client';
import { useCreateEmployee, useReferences, useUpdateEmployee } from '@/lib/queries/employees';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

/**
 * Employee form sheet — Add new + Edit modes.
 *
 * Visual reference: docs/design/screens/employees-form/189–193.png.
 * Sections are anchored top-to-bottom: Identity, Contact, Employment,
 * Compensation, Bank, Emergency, Access & Role; edit mode adds a
 * Danger Zone (Move to notice + Terminate) at the bottom plus a tab
 * bar in the header that scrolls to each section.
 */

const CONTRACT_OPTIONS = contractTypeSchema.options;
const EMPLOYMENT_RECORD_OPTIONS = employmentRecordSchema.options;
const SYSTEM_ROLE_OPTIONS = systemRoleSchema.options;

const GENDER_OPTIONS: Array<{ value: '' | Gender; label: string }> = [
  { value: '', label: 'Not specified' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

// Fixed list of Pakistani banks used by the Bank section's dropdown.
// Free-form means HR can override via API; the picker just gives the
// common cases without needing a Bank lookup table.
const BANK_OPTIONS = [
  'HBL',
  'UBL',
  'MCB',
  'Allied Bank',
  'Bank Alfalah',
  'Meezan Bank',
  'Standard Chartered',
  'Faysal Bank',
  'Askari Bank',
  'Habib Metropolitan',
  'JS Bank',
  'NBP',
  'Bank Al Habib',
].map((name) => ({ value: name, label: name }));

const COMMISSION_RATE_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'per_project_category', label: 'Per project category' },
  { value: 'flat_5', label: 'Flat 5%' },
  { value: 'flat_10', label: 'Flat 10%' },
];

// Curated IANA zones for the reminder-delivery timezone picker. Empty
// value = fall back to the org default (Asia/Karachi).
const TIMEZONE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Org default (Asia/Karachi)' },
  { value: 'Asia/Karachi', label: 'Asia/Karachi (PKT)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET)' },
  { value: 'America/New_York', label: 'America/New York (ET)' },
  { value: 'America/Chicago', label: 'America/Chicago (CT)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (PT)' },
  { value: 'UTC', label: 'UTC' },
];

const EMPLOYMENT_RECORD_LABELS: Record<EmploymentRecord, string> = {
  on_roll: 'On-roll (statutory benefits)',
  off_roll: 'Off-roll',
  intern_stipend: 'Intern stipend',
  consultant_invoice: 'Consultant — invoiced',
};

const SYSTEM_ROLE_LABELS: Record<SystemRole, { title: string; description: string }> = {
  employee: {
    title: 'Employee (default)',
    description: 'Sees own data only · request leave, submit OT, view payslips.',
  },
  team_lead: {
    title: 'Team Lead',
    description: 'Approves leave / OT for direct reports.',
  },
  manager: {
    title: 'Manager',
    description: 'Approves for the whole org branch under them.',
  },
  hr: {
    title: 'HR',
    description: 'Full read/write across employees + payroll.',
  },
  finance: {
    title: 'Finance',
    description: 'Read employees, full write on payouts.',
  },
  super_admin: {
    title: 'Super Admin',
    description: 'Unrestricted access including destructive actions.',
  },
};

// Sections render their content inside a scrollable body; the edit-mode
// tab bar scrolls to these anchors. Keep ids stable.
type SectionKey =
  | 'identity'
  | 'contact'
  | 'employment'
  | 'compensation'
  | 'bank'
  | 'emergency'
  | 'access';
const TABS: Array<{ key: SectionKey; label: string }> = [
  { key: 'identity', label: 'Identity' },
  { key: 'employment', label: 'Employment' },
  { key: 'compensation', label: 'Compensation' },
  { key: 'bank', label: 'Bank' },
  { key: 'emergency', label: 'Emergency' },
  { key: 'access', label: 'Access' },
];

export type EmployeeFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  employee?: EmployeePublic;
  onSuccess?: (employee: EmployeePublic) => void;
};

export function EmployeeFormSheet({
  open,
  onOpenChange,
  mode,
  employee,
  onSuccess,
}: EmployeeFormSheetProps) {
  const router = useRouter();
  const perms = usePermissions();
  const refs = useReferences();

  const canViewSalary = perms.has('employees:view_salary');
  const canTerminate = perms.has('employees:delete');

  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee(employee?.id ?? '');
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const defaults = React.useMemo<EmployeeCreateInput>(
    () => (mode === 'edit' && employee ? toDefaults(employee) : emptyDefaults()),
    [mode, employee],
  );

  const form = useForm<EmployeeCreateInput>({
    resolver: zodResolver(employeeCreateSchema),
    defaultValues: defaults,
    mode: 'onBlur',
  });

  React.useEffect(() => {
    if (open) form.reset(defaults);
  }, [open, defaults, form]);

  // Unsaved-changes close guard — preserved from prior implementation.
  const formDirtyRef = React.useRef(false);
  React.useEffect(() => {
    formDirtyRef.current = form.formState.isDirty;
  }, [form.formState.isDirty]);
  const requestClose = React.useCallback(() => {
    if (!formDirtyRef.current || window.confirm('Discard your unsaved changes?')) {
      onOpenChange(false);
    }
  }, [onOpenChange]);

  // Validation banner — fires on a failed submit, clears once valid.
  const [showValidationBanner, setShowValidationBanner] = React.useState(false);
  React.useEffect(() => {
    if (form.formState.isValid) setShowValidationBanner(false);
  }, [form.formState.isValid]);
  React.useEffect(() => {
    if (open) setShowValidationBanner(false);
  }, [open]);

  const watch = form.watch();
  const firstName = watch.firstName ?? '';
  const lastName = watch.lastName ?? '';
  const computedFullName =
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    (mode === 'edit' ? (employee?.fullName ?? '') : '');

  // Filter designations / status / manager option lists.
  const filteredDesignations = React.useMemo(() => {
    if (!refs.data || !watch.departmentId) return [];
    return refs.data.designations.filter((d) => d.departmentId === watch.departmentId);
  }, [refs.data, watch.departmentId]);

  const departmentOptions = React.useMemo(
    () => (refs.data?.departments ?? []).map((d) => ({ value: d.id, label: d.name })),
    [refs.data?.departments],
  );
  const designationOptions = React.useMemo(
    () => filteredDesignations.map((d) => ({ value: d.id, label: d.name })),
    [filteredDesignations],
  );
  // Status as pill toggles instead of a dropdown — matches the design.
  const statusPills = React.useMemo(
    () =>
      (refs.data?.statuses ?? [])
        .filter((s) => ['intern', 'probation', 'permanent', 'contractor'].includes(s.slug))
        .sort((a, b) => {
          const order = ['intern', 'probation', 'permanent', 'contractor'];
          return order.indexOf(a.slug) - order.indexOf(b.slug);
        }),
    [refs.data?.statuses],
  );

  const statusSlug = React.useMemo(
    () => refs.data?.statuses.find((s) => s.id === watch.statusId)?.slug,
    [refs.data?.statuses, watch.statusId],
  );
  const showProbationEnd = statusSlug === 'probation';
  const showInternshipEnd = watch.contractType === 'Intern';

  // Submit + close paths.
  async function onSubmit(values: EmployeeCreateInput) {
    try {
      const result =
        mode === 'create'
          ? await createMutation.mutateAsync(values)
          : await updateMutation.mutateAsync(values);
      toast.success(mode === 'create' ? 'Employee created.' : 'Employee updated.');
      onSuccess?.(result);
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
  function handleSubmitClick() {
    void form.handleSubmit(onSubmit, () => setShowValidationBanner(true))();
  }

  // Tab-anchor scroll — clicking a tab smooth-scrolls to the section.
  const bodyRef = React.useRef<HTMLDivElement | null>(null);
  function jumpTo(key: SectionKey) {
    const el = bodyRef.current?.querySelector<HTMLElement>(`[data-section="${key}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function jumpToFirstError() {
    const firstErrorKey = Object.keys(form.formState.errors)[0];
    if (!firstErrorKey) return;
    const el = bodyRef.current?.querySelector<HTMLElement>(`[data-field="${firstErrorKey}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (el?.querySelector('input, textarea, button, select') as HTMLElement | null)?.focus();
  }

  // Terminate modal state — edit only, exists alongside the sheet.
  const [terminateOpen, setTerminateOpen] = React.useState(false);

  const eyebrow = mode === 'create' ? 'ADD NEW EMPLOYEE' : `EDIT · ${employee?.eid ?? '—'}`;
  const subtitle =
    mode === 'create' ? 'EID will be assigned automatically · default access: Employee' : null;

  const erroredFieldCount = Object.keys(form.formState.errors).length;

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (next) onOpenChange(true);
          else requestClose();
        }}
      >
        <SheetContent
          side="right"
          width="lg"
          className="flex flex-col p-0"
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            requestClose();
          }}
          onPointerDownOutside={(e) => {
            if (formDirtyRef.current) e.preventDefault();
            requestClose();
          }}
        >
          {/* ── Sticky header ───────────────────────────────────────── */}
          <SheetHeader className="gap-fn-2_5 flex-col items-stretch">
            {/* Eyebrow */}
            <div className="text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight text-[11px] uppercase">
              {eyebrow}
            </div>

            {/* Identity row — photo tile / avatar on left, name block on right */}
            <div className="gap-fn-3 flex items-center">
              {mode === 'create' ? (
                <PhotoUploadTile />
              ) : (
                <EmployeeAvatar
                  fullName={employee?.fullName ?? ''}
                  photoUrl={employee?.photoUrl ?? null}
                  size="lg"
                />
              )}
              <div className="min-w-0 flex-1">
                <SheetTitle className="sr-only">
                  {mode === 'create'
                    ? 'Add new employee'
                    : `Edit ${employee?.fullName ?? 'employee'}`}
                </SheetTitle>
                {mode === 'create' ? (
                  <div className="text-fn-fg font-fn-semibold leading-fn-tight text-[18px]">
                    {computedFullName || 'Full name (e.g. Aliya Saeed)'}
                  </div>
                ) : (
                  <div className="text-fn-fg font-fn-semibold leading-fn-tight text-[18px]">
                    {employee?.fullName ?? '—'}
                  </div>
                )}
                {subtitle ? (
                  <div className="text-fn-fg-faint mt-fn-1 text-[11.5px]">{subtitle}</div>
                ) : employee ? (
                  <div className="gap-fn-2 mt-fn-1 text-fn-fg-faint flex items-center text-[11.5px]">
                    <span className="font-mono">{employee.eid}</span>
                    <span aria-hidden>·</span>
                    <span>{employee.designation.name}</span>
                    <StatusBadge slug={employee.status.slug} name={employee.status.name} />
                    <span aria-hidden>·</span>
                    <span>joined {formatShortDate(employee.joinDate)}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Tab anchors — edit mode only */}
            {mode === 'edit' && (
              <nav
                aria-label="Form sections"
                className="border-fn-divider -mb-fn-2 gap-fn-3 pt-fn-1 flex items-center border-b"
              >
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => jumpTo(t.key)}
                    className="text-fn-fg-muted hover:text-fn-fg font-fn-medium pb-fn-2 -mb-px cursor-pointer border-b border-transparent text-[12.5px] transition-colors"
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
            )}
          </SheetHeader>

          {/* ── Scrollable body ──────────────────────────────────────── */}
          <SheetBody ref={bodyRef} className="pt-fn-2 pb-fn-6 flex flex-col">
            {/* Validation summary */}
            {showValidationBanner && erroredFieldCount > 0 && (
              <Alert tone="danger" className="mb-fn-3 items-center" showIcon={false}>
                <div className="gap-fn-3 flex w-full items-center">
                  <AlertTriangle className="h-fn-4 w-fn-4 shrink-0" strokeWidth={2} />
                  <div className="flex-1">
                    <strong className="font-fn-semibold">
                      {erroredFieldCount} {erroredFieldCount === 1 ? 'field needs' : 'fields need'}{' '}
                      attention
                    </strong>{' '}
                    · scroll to find them or fix them below.
                  </div>
                  <button
                    type="button"
                    onClick={jumpToFirstError}
                    className="text-fn-danger gap-fn-1 font-fn-semibold inline-flex cursor-pointer items-center text-[12px] hover:underline"
                  >
                    Jump to first <ArrowDown className="h-fn-3 w-fn-3" />
                  </button>
                </div>
              </Alert>
            )}

            {/* IDENTITY */}
            <Section
              icon={<IdCard className="h-fn-3_5 w-fn-3_5" />}
              title="Identity"
              description="Used in the system and on official documents."
              anchor="identity"
              first
            >
              <Field
                label="First name"
                required
                error={form.formState.errors.firstName?.message}
                fieldKey="firstName"
              >
                <Input
                  {...form.register('firstName')}
                  placeholder="e.g. Aliya"
                  autoComplete="given-name"
                />
              </Field>
              <Field
                label="Last name"
                required
                error={form.formState.errors.lastName?.message}
                fieldKey="lastName"
              >
                <Input
                  {...form.register('lastName')}
                  placeholder="e.g. Saeed"
                  autoComplete="family-name"
                />
              </Field>
              <Field label="Pronouns" hint="Optional" fieldKey="pronouns">
                <Input
                  value={watch.pronouns ?? ''}
                  onChange={(e) =>
                    form.setValue('pronouns', e.target.value || null, { shouldDirty: true })
                  }
                  placeholder="he / him · she / her · they / them"
                />
              </Field>
              <Field label="Date of birth" fieldKey="dateOfBirth">
                <Input
                  type="date"
                  value={dateValue(watch.dateOfBirth)}
                  onChange={(e) =>
                    form.setValue('dateOfBirth', e.target.value ? new Date(e.target.value) : null, {
                      shouldDirty: true,
                    })
                  }
                />
              </Field>
              <Field label="Gender" fieldKey="gender">
                <Combobox
                  options={GENDER_OPTIONS.map((g) => ({
                    value: g.value || '__none__',
                    label: g.label,
                  }))}
                  value={watch.gender ?? '__none__'}
                  onValueChange={(v) =>
                    form.setValue('gender', v === '__none__' ? null : (v as Gender), {
                      shouldDirty: true,
                    })
                  }
                  placeholder="Not specified"
                />
              </Field>
              <Field
                label="CNIC"
                hint="Pakistani national ID · 13 digits"
                error={form.formState.errors.cnic?.message}
                fieldKey="cnic"
              >
                <Input
                  value={watch.cnic ?? ''}
                  onChange={(e) =>
                    form.setValue('cnic', e.target.value || null, { shouldDirty: true })
                  }
                  placeholder="XXXXX-XXXXXXX-X"
                  className="tabular-nums"
                />
              </Field>
            </Section>

            {/* CONTACT */}
            <Section
              icon={<Mail className="h-fn-3_5 w-fn-3_5" />}
              title="Contact"
              description="Login email is locked after onboarding · contact HR to change."
              anchor="contact"
            >
              <Field
                label="Work email"
                required
                hint="For login fallback only"
                error={form.formState.errors.email?.message}
                fieldKey="email"
              >
                <Input
                  type="email"
                  {...form.register('email')}
                  placeholder="e.g. aliya@futurenostics.com"
                  autoComplete="email"
                  disabled={mode === 'edit'}
                />
              </Field>
              <Field
                label="Personal email"
                hint="Optional"
                error={form.formState.errors.personalEmail?.message}
                fieldKey="personalEmail"
              >
                <Input
                  type="email"
                  value={watch.personalEmail ?? ''}
                  onChange={(e) =>
                    form.setValue('personalEmail', e.target.value || null, { shouldDirty: true })
                  }
                  placeholder="aliya@gmail.com"
                  autoComplete="email"
                />
              </Field>
              <Field
                label="Phone (work)"
                error={form.formState.errors.phone?.message}
                fieldKey="phone"
              >
                <Input
                  value={watch.phone ?? ''}
                  onChange={(e) =>
                    form.setValue('phone', e.target.value || null, { shouldDirty: true })
                  }
                  placeholder="+92 …"
                  autoComplete="tel"
                />
              </Field>
              <Field
                label="Phone (personal)"
                hint="Optional"
                error={form.formState.errors.personalPhone?.message}
                fieldKey="personalPhone"
              >
                <Input
                  value={watch.personalPhone ?? ''}
                  onChange={(e) =>
                    form.setValue('personalPhone', e.target.value || null, { shouldDirty: true })
                  }
                  placeholder="+92 …"
                />
              </Field>
              <Field label="Address" hint="Area, city" fullWidth fieldKey="address">
                <Textarea
                  rows={3}
                  value={watch.address ?? ''}
                  onChange={(e) =>
                    form.setValue('address', e.target.value || null, { shouldDirty: true })
                  }
                  placeholder="House #, Street, Area, City"
                />
              </Field>
            </Section>

            {/* EMPLOYMENT */}
            <Section
              icon={<Briefcase className="h-fn-3_5 w-fn-3_5" />}
              title="Employment"
              description="Where they sit in the org and how they're employed."
              anchor="employment"
            >
              <Field
                label="Department"
                required
                error={form.formState.errors.departmentId?.message}
                fieldKey="departmentId"
              >
                <Combobox
                  options={departmentOptions}
                  value={watch.departmentId}
                  onValueChange={(v) => {
                    form.setValue('departmentId', v, { shouldDirty: true, shouldValidate: true });
                    form.setValue('designationId', '', { shouldDirty: true });
                  }}
                  placeholder="Select department"
                />
              </Field>
              <Field
                label="Designation"
                required
                hint={watch.departmentId ? undefined : 'Pick a department first'}
                error={form.formState.errors.designationId?.message}
                fieldKey="designationId"
              >
                <Combobox
                  options={designationOptions}
                  value={watch.designationId}
                  onValueChange={(v) =>
                    form.setValue('designationId', v, { shouldDirty: true, shouldValidate: true })
                  }
                  placeholder="Select designation"
                  disabled={!watch.departmentId}
                />
              </Field>

              <Field label="Reports to (manager)" fullWidth fieldKey="managerId">
                <ManagerPicker
                  value={watch.managerId ?? null}
                  selfId={employee?.id}
                  onChange={(v) => form.setValue('managerId', v ?? null, { shouldDirty: true })}
                />
              </Field>

              <Field label="Status" required hint="Lifecycle stage" fullWidth fieldKey="statusId">
                <StatusPillBar
                  options={statusPills.map((s) => ({ id: s.id, slug: s.slug, name: s.name }))}
                  value={watch.statusId}
                  onChange={(id) =>
                    form.setValue('statusId', id, { shouldDirty: true, shouldValidate: true })
                  }
                />
              </Field>

              <Field label="Joining date" required fieldKey="joinDate">
                <Input
                  type="date"
                  value={dateValue(watch.joinDate)}
                  onChange={(e) =>
                    form.setValue('joinDate', new Date(e.target.value), {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
              </Field>
              {showProbationEnd && (
                <Field
                  label="Probation ends"
                  hint="Auto-set 90d from joining"
                  fieldKey="probationEndDate"
                >
                  <Input
                    type="date"
                    value={dateValue(watch.probationEndDate)}
                    onChange={(e) =>
                      form.setValue(
                        'probationEndDate',
                        e.target.value ? new Date(e.target.value) : null,
                        { shouldDirty: true },
                      )
                    }
                  />
                </Field>
              )}
              {showInternshipEnd && (
                <Field label="Internship ends" fieldKey="internshipEndDate">
                  <Input
                    type="date"
                    value={dateValue(watch.internshipEndDate)}
                    onChange={(e) =>
                      form.setValue(
                        'internshipEndDate',
                        e.target.value ? new Date(e.target.value) : null,
                        { shouldDirty: true },
                      )
                    }
                  />
                </Field>
              )}

              <Field label="Contract type" fieldKey="contractType">
                <Combobox
                  options={CONTRACT_OPTIONS.map((c) => ({
                    value: c,
                    label: c.replace(/([A-Z])/g, ' $1').trim(),
                  }))}
                  value={watch.contractType}
                  onValueChange={(v) =>
                    form.setValue('contractType', v as EmployeeCreateInput['contractType'], {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
              </Field>
              <Field
                label="Employment record"
                hint="On-roll · Off-roll · Intern"
                fieldKey="employmentRecord"
              >
                <Combobox
                  options={EMPLOYMENT_RECORD_OPTIONS.map((er) => ({
                    value: er,
                    label: EMPLOYMENT_RECORD_LABELS[er],
                  }))}
                  value={watch.employmentRecord ?? ''}
                  onValueChange={(v) =>
                    form.setValue('employmentRecord', (v as EmploymentRecord) || null, {
                      shouldDirty: true,
                    })
                  }
                  placeholder="Select record type"
                />
              </Field>

              <Field label="Timezone" hint="Reminders + quiet hours use this" fieldKey="timezone">
                <Combobox
                  options={TIMEZONE_OPTIONS}
                  value={watch.timezone ?? ''}
                  onValueChange={(v) => form.setValue('timezone', v || null, { shouldDirty: true })}
                  placeholder="Org default (Asia/Karachi)"
                />
              </Field>
              <Field
                label="Quiet hours start"
                hint="Reminders in this window defer"
                fieldKey="quietHoursStart"
              >
                <Input
                  type="time"
                  value={watch.quietHoursStart ?? ''}
                  onChange={(e) =>
                    form.setValue('quietHoursStart', e.target.value || null, { shouldDirty: true })
                  }
                />
              </Field>
              <Field label="Quiet hours end" fieldKey="quietHoursEnd">
                <Input
                  type="time"
                  value={watch.quietHoursEnd ?? ''}
                  onChange={(e) =>
                    form.setValue('quietHoursEnd', e.target.value || null, { shouldDirty: true })
                  }
                />
              </Field>
            </Section>

            {/* COMPENSATION (gated) */}
            {canViewSalary && (
              <Section
                icon={<Wallet className="h-fn-3_5 w-fn-3_5" />}
                title="Compensation"
                description="Salary and commission setup · Salary changes are audit-logged."
                anchor="compensation"
              >
                <Field
                  label="Monthly salary (PKR)"
                  required={mode === 'create'}
                  error={form.formState.errors.salaryPkr?.message}
                  fieldKey="salaryPkr"
                >
                  <Input
                    inputMode="numeric"
                    value={watch.salaryPkr ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[,\s]/g, '');
                      form.setValue('salaryPkr', raw === '' ? null : Number(raw), {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    placeholder="e.g. 200,000"
                    className="tabular-nums"
                  />
                </Field>
                <Field label="Effective from" fieldKey="salaryEffectiveDate">
                  <Input
                    type="date"
                    value={dateValue(watch.salaryEffectiveDate)}
                    onChange={(e) =>
                      form.setValue(
                        'salaryEffectiveDate',
                        e.target.value ? new Date(e.target.value) : null,
                        { shouldDirty: true },
                      )
                    }
                  />
                </Field>
                <Field label="Eligible for commissions" fullWidth>
                  <label className="bg-fn-bg-subtle border-fn-border-strong rounded-fn-xs gap-fn-3 px-fn-3 py-fn-2_5 flex cursor-pointer items-center border">
                    <Switch
                      checked={watch.eligibleForCommissions ?? false}
                      onCheckedChange={(v) =>
                        form.setValue('eligibleForCommissions', v === true, { shouldDirty: true })
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-fn-fg font-fn-medium text-[13px]">
                        Eligible for commissions
                      </div>
                      <div className="text-fn-fg-faint mt-fn-0_5 text-[11.5px]">
                        Will appear in monthly commission processing for projects they're tagged on.
                      </div>
                    </div>
                  </label>
                </Field>
                {watch.eligibleForCommissions && (
                  <>
                    <Field label="Payoneer email" fieldKey="payoneerEmail">
                      <Input
                        type="email"
                        value={watch.payoneerEmail ?? ''}
                        onChange={(e) =>
                          form.setValue('payoneerEmail', e.target.value || null, {
                            shouldDirty: true,
                          })
                        }
                        placeholder="aliya@futurenostics.com"
                      />
                    </Field>
                    <Field label="Commission rate" fieldKey="commissionRate">
                      <Combobox
                        options={COMMISSION_RATE_OPTIONS}
                        value={watch.commissionRate ?? ''}
                        onValueChange={(v) =>
                          form.setValue('commissionRate', v || null, { shouldDirty: true })
                        }
                        placeholder="Standard"
                      />
                    </Field>
                  </>
                )}
              </Section>
            )}

            {/* BANK (gated; required for salary deposits) */}
            {canViewSalary && (
              <Section
                icon={<Landmark className="h-fn-3_5 w-fn-3_5" />}
                title="Bank account (PKR payroll)"
                description="Required for salary deposits."
                anchor="bank"
              >
                <Field label="Bank" fieldKey="bankName">
                  <Combobox
                    options={BANK_OPTIONS}
                    value={watch.bankName ?? ''}
                    onValueChange={(v) =>
                      form.setValue('bankName', v || null, { shouldDirty: true })
                    }
                    placeholder="Select bank"
                  />
                </Field>
                <Field label="Branch" fieldKey="bankBranch">
                  <Input
                    value={watch.bankBranch ?? ''}
                    onChange={(e) =>
                      form.setValue('bankBranch', e.target.value || null, { shouldDirty: true })
                    }
                    placeholder="e.g. DHA Karachi"
                  />
                </Field>
                <Field label="IBAN / Account number" fullWidth fieldKey="iban">
                  <Input
                    value={watch.iban ?? ''}
                    onChange={(e) =>
                      form.setValue('iban', e.target.value || null, { shouldDirty: true })
                    }
                    placeholder="PK00 BANK 0000 0000 0000 0000"
                    className="font-mono tabular-nums"
                  />
                </Field>
              </Section>
            )}

            {/* EMERGENCY */}
            <Section
              icon={<LifeBuoy className="h-fn-3_5 w-fn-3_5" />}
              title="Emergency contact"
              description="Required by HR · only used in emergencies."
              anchor="emergency"
            >
              <Field label="Full name">
                <Input
                  value={watch.emergencyContact?.name ?? ''}
                  onChange={(e) =>
                    form.setValue(
                      'emergencyContact',
                      { ...(watch.emergencyContact ?? {}), name: e.target.value || undefined },
                      { shouldDirty: true },
                    )
                  }
                  placeholder="e.g. Ayesha Saeed"
                />
              </Field>
              <Field label="Relationship">
                <Combobox
                  options={[
                    { value: 'spouse', label: 'Spouse' },
                    { value: 'parent', label: 'Parent' },
                    { value: 'sibling', label: 'Sibling' },
                    { value: 'child', label: 'Child' },
                    { value: 'friend', label: 'Friend' },
                  ]}
                  value={watch.emergencyContact?.relationship ?? ''}
                  onValueChange={(v) =>
                    form.setValue(
                      'emergencyContact',
                      { ...(watch.emergencyContact ?? {}), relationship: v || undefined },
                      { shouldDirty: true },
                    )
                  }
                  placeholder="Spouse · Parent · …"
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={watch.emergencyContact?.phone ?? ''}
                  onChange={(e) =>
                    form.setValue(
                      'emergencyContact',
                      { ...(watch.emergencyContact ?? {}), phone: e.target.value || undefined },
                      { shouldDirty: true },
                    )
                  }
                  placeholder="+92 …"
                />
              </Field>
            </Section>

            {/* ACCESS & ROLE */}
            <Section
              icon={<ShieldCheck className="h-fn-3_5 w-fn-3_5" />}
              title="Access & role"
              description="System role decides what they see in the app."
              anchor="access"
            >
              <Field label="System role" fullWidth fieldKey="systemRole">
                <SystemRoleCard
                  value={(watch.systemRole as SystemRole | undefined) ?? 'employee'}
                  onChange={(v) => form.setValue('systemRole', v, { shouldDirty: true })}
                />
              </Field>
              {mode === 'edit' && employee && (employee.reportsCount ?? 0) > 0 && (
                <div className="col-span-full">
                  <Alert tone="info" showIcon={false}>
                    <div className="gap-fn-2 flex items-start">
                      <Info className="h-fn-4 w-fn-4 mt-fn-0_5 shrink-0" strokeWidth={2} />
                      <div className="leading-fn-normal text-[12.5px]">
                        <strong className="font-fn-semibold">
                          {employee.firstName ?? employee.fullName.split(' ')[0]}
                        </strong>{' '}
                        also belongs to the{' '}
                        <strong className="font-fn-semibold">
                          {employee.department.name} managers
                        </strong>{' '}
                        role group (auto-derived from their direct reports).
                      </div>
                    </div>
                  </Alert>
                </div>
              )}
            </Section>

            {/* DANGER ZONE — edit only */}
            {mode === 'edit' && employee && canTerminate && (
              <DangerZone
                employee={employee}
                onMoveToNotice={async () => {
                  try {
                    await apiFetch(`/api/employees/${employee.id}/move-to-notice`, {
                      method: 'POST',
                      body: JSON.stringify({}),
                    });
                    toast.success('Employee moved to notice period.');
                    onSuccess?.(employee);
                    router.refresh();
                  } catch (err) {
                    toast.error((err as Error).message);
                  }
                }}
                onTerminate={() => setTerminateOpen(true)}
              />
            )}
          </SheetBody>

          {/* ── Sticky footer ──────────────────────────────────────── */}
          <SheetFooter className="bg-fn-bg-subtle">
            <div className="gap-fn-2_5 flex items-center">
              <Switch defaultChecked disabled={mode === 'create'} aria-label="Active on save" />
              <span className="text-fn-fg text-[12.5px]">
                {mode === 'create' ? 'Active on create' : 'Active'}
              </span>
            </div>
            <div className="gap-fn-2 ml-auto flex items-center">
              <Button variant="ghost" size="sm" onClick={requestClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitClick}
                disabled={isSubmitting || (mode === 'edit' && !form.formState.isDirty)}
              >
                {isSubmitting ? 'Saving…' : mode === 'create' ? 'Create employee' : 'Save changes'}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {mode === 'edit' && employee && (
        <TerminateModal
          open={terminateOpen}
          onOpenChange={setTerminateOpen}
          employee={employee}
          onConfirmed={() => {
            onSuccess?.(employee);
            onOpenChange(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

/* ────────────── Section + Field helpers ────────────── */

function Section({
  icon,
  title,
  description,
  anchor,
  first,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  anchor: SectionKey | 'danger';
  first?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      data-section={anchor}
      className={cn(
        'pt-fn-5 mt-fn-5 gap-fn-4 scroll-mt-fn-6 grid grid-cols-1 sm:grid-cols-2',
        !first && 'border-fn-divider border-t',
      )}
    >
      <header className="gap-fn-2_5 col-span-full flex items-center">
        <span
          aria-hidden
          className="rounded-fn-xs h-fn-6 w-fn-6 inline-flex shrink-0 items-center justify-center"
          style={{ background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)' }}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-fn-fg font-fn-semibold tracking-fn-uppercase-tight text-[12px] uppercase">
            {title}
          </h3>
          {description && <p className="text-fn-fg-faint mt-fn-0_5 text-[11.5px]">{description}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  required,
  fullWidth,
  fieldKey,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  fullWidth?: boolean;
  fieldKey?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-field={fieldKey}
      className={cn('scroll-mt-fn-6 flex flex-col', fullWidth && 'sm:col-span-2')}
    >
      <label className="text-fn-fg font-fn-semibold mb-fn-1 text-[12.5px]">
        {label}
        {required && <span className="text-fn-danger ml-fn-0_5">*</span>}
        {hint && !error && (
          <span className="text-fn-fg-faint font-fn-medium ml-fn-2 text-[11px]">{hint}</span>
        )}
      </label>
      {children}
      {error && <div className="text-fn-danger mt-fn-1 text-[11px]">{error}</div>}
    </div>
  );
}

/* ────────────── Status pill bar (Employment) ────────────── */

function StatusPillBar({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: string; slug: string; name: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  const SLUG_STYLE: Record<string, string> = {
    intern:
      'data-[on=true]:bg-fn-info-soft data-[on=true]:text-fn-info-soft-fg data-[on=true]:border-fn-info/30',
    probation:
      'data-[on=true]:bg-fn-warning-soft data-[on=true]:text-fn-warning-soft-fg data-[on=true]:border-fn-warning/30',
    permanent:
      'data-[on=true]:bg-fn-success-soft data-[on=true]:text-fn-success-soft-fg data-[on=true]:border-fn-success/30',
    contractor:
      'data-[on=true]:bg-fn-accent-soft data-[on=true]:text-fn-accent-soft-fg data-[on=true]:border-fn-accent/30',
  };
  return (
    <div className="gap-fn-2 grid grid-cols-2 sm:grid-cols-4">
      {options.map((opt) => {
        const on = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            data-on={on}
            onClick={() => onChange(opt.id)}
            className={cn(
              'rounded-fn-xs border-fn-border bg-fn-bg-panel text-fn-fg-muted hover:border-fn-border-strong px-fn-3 py-fn-2 font-fn-medium cursor-pointer border text-center text-[12.5px] transition-colors',
              SLUG_STYLE[opt.slug] ?? '',
            )}
          >
            {opt.name}
          </button>
        );
      })}
    </div>
  );
}

/* ────────────── Manager picker (Employment) ────────────── */

function ManagerPicker({
  value,
  selfId,
  onChange,
}: {
  value: string | null;
  selfId?: string;
  onChange: (id: string | null) => void;
}) {
  // For now wire through a simple Combobox; the design's manager card
  // with avatar + role is rendered when a manager is selected. Full
  // employee-typeahead picker can come later as a Tier 2 enhancement.
  const [search, setSearch] = React.useState('');
  // Lazy import to keep this section light — use the existing list query.
  // We rely on the Combobox's free text — labels stay simple.
  const [candidates, setCandidates] = React.useState<
    Array<{ id: string; name: string; subtitle: string }>
  >([]);
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const qs = new URLSearchParams({ limit: '50', sortBy: 'fullName', sortDir: 'asc' });
        if (search) qs.set('search', search);
        const res = await apiFetch<{ items: EmployeePublic[] }>(`/api/employees?${qs.toString()}`);
        if (cancelled) return;
        setCandidates(
          res.items
            .filter((e) => e.id !== selfId && !e.isArchived)
            .map((e) => ({
              id: e.id,
              name: e.fullName,
              subtitle: `${e.designation.name} · ${e.department.name}`,
            })),
        );
      } catch {
        // ignore — combobox just shows previously loaded
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [search, selfId]);

  const selected = candidates.find((c) => c.id === value);
  const options = candidates.map((c) => ({ value: c.id, label: c.name, description: c.subtitle }));

  if (selected) {
    return (
      <div className="rounded-fn-xs border-fn-border bg-fn-bg-panel p-fn-2_5 gap-fn-3 flex items-center border">
        <EmployeeAvatar fullName={selected.name} photoUrl={null} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="text-fn-fg font-fn-semibold text-[13px]">{selected.name}</div>
          <div className="text-fn-fg-faint text-[11.5px]">{selected.subtitle}</div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-fn-fg-faint hover:text-fn-fg cursor-pointer text-[12px]"
        >
          Change
        </button>
      </div>
    );
  }
  return (
    <Combobox
      options={options}
      value={value ?? ''}
      onValueChange={(v) => onChange(v || null)}
      placeholder="Search employee…"
      searchPlaceholder="Search employee…"
    />
  );
  // search state is reserved for future server-side filter; reference
  // it to keep the hook dependencies honest.
  void setSearch;
}

/* ────────────── System role card (Access) ────────────── */

function SystemRoleCard({
  value,
  onChange,
}: {
  value: SystemRole;
  onChange: (next: SystemRole) => void;
}) {
  const info = SYSTEM_ROLE_LABELS[value];
  const [picking, setPicking] = React.useState(false);
  return (
    <div className="rounded-fn-xs border-fn-border bg-fn-bg-panel p-fn-3 gap-fn-3 flex items-start border">
      <span
        aria-hidden
        className="rounded-fn-xs h-fn-7 w-fn-7 bg-fn-accent-soft text-fn-accent-soft-fg inline-flex shrink-0 items-center justify-center"
      >
        <Users className="h-fn-3_5 w-fn-3_5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-fn-fg font-fn-semibold text-[13px]">{info.title}</div>
        <div className="text-fn-fg-faint mt-fn-0_5 text-[11.5px]">{info.description}</div>
        {picking && (
          <div className="mt-fn-2">
            <Combobox
              options={SYSTEM_ROLE_OPTIONS.map((r) => ({
                value: r,
                label: SYSTEM_ROLE_LABELS[r].title,
                description: SYSTEM_ROLE_LABELS[r].description,
              }))}
              value={value}
              onValueChange={(v) => {
                onChange(v as SystemRole);
                setPicking(false);
              }}
            />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => setPicking((p) => !p)}
        className="text-fn-fg-muted hover:text-fn-fg font-fn-medium cursor-pointer text-[12px]"
      >
        Change
      </button>
    </div>
  );
}

/* ────────────── Danger Zone (edit only) ────────────── */

function DangerZone({
  employee,
  onMoveToNotice,
  onTerminate,
}: {
  employee: EmployeePublic;
  onMoveToNotice: () => Promise<void>;
  onTerminate: () => void;
}) {
  const [movingToNotice, setMovingToNotice] = React.useState(false);
  const isOnNotice = Boolean(employee.noticePeriodStart);
  return (
    <section
      data-section="danger"
      className="border-fn-danger/30 pt-fn-5 mt-fn-7 gap-fn-3 grid grid-cols-1 border-t"
    >
      <header className="gap-fn-2_5 col-span-full flex items-center">
        <span
          aria-hidden
          className="rounded-fn-xs h-fn-6 w-fn-6 bg-fn-danger-soft text-fn-danger-soft-fg inline-flex shrink-0 items-center justify-center"
        >
          <BadgeAlert className="h-fn-3_5 w-fn-3_5" />
        </span>
        <h3 className="text-fn-danger font-fn-semibold tracking-fn-uppercase-tight text-[12px] uppercase">
          Danger zone
        </h3>
      </header>

      <DangerRow
        title={isOnNotice ? 'On notice period' : "Move to 'Notice' status"}
        description={
          isOnNotice
            ? `Notice period started ${employee.noticePeriodStart ? formatShortDate(employee.noticePeriodStart) : '—'}.`
            : 'Begin offboarding · notice period 30 days · final pay calculation kicks in.'
        }
        actionLabel={isOnNotice ? 'Started' : 'Start offboarding'}
        disabled={isOnNotice || movingToNotice}
        onClick={async () => {
          setMovingToNotice(true);
          try {
            await onMoveToNotice();
          } finally {
            setMovingToNotice(false);
          }
        }}
      />
      <DangerRow
        title="Terminate employment"
        description="Hard termination · revokes access immediately · cannot be undone except by Super Admin."
        actionLabel="Terminate"
        actionVariant="destructive"
        onClick={onTerminate}
        disabled={Boolean(employee.terminatedAt)}
      />
    </section>
  );
}

function DangerRow({
  title,
  description,
  actionLabel,
  actionVariant = 'outline',
  disabled,
  onClick,
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionVariant?: 'outline' | 'destructive';
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="border-fn-danger/30 bg-fn-danger-soft/40 rounded-fn-xs gap-fn-3 p-fn-3 flex items-center border">
      <div className="min-w-0 flex-1">
        <div className="text-fn-fg font-fn-semibold text-[13px]">{title}</div>
        <div className="text-fn-fg-muted mt-fn-0_5 leading-fn-normal text-[11.5px]">
          {description}
        </div>
      </div>
      <Button
        size="sm"
        variant={actionVariant}
        onClick={onClick}
        disabled={disabled}
        className="shrink-0"
      >
        {actionLabel}
      </Button>
    </div>
  );
}

/* ────────────── Terminate confirmation modal ────────────── */

const TERMINATE_REASONS = [
  { value: 'resignation', label: 'Resignation' },
  { value: 'contract_end', label: 'Contract end' },
  { value: 'performance', label: 'Performance' },
  { value: 'misconduct', label: 'Misconduct' },
  { value: 'redundancy', label: 'Redundancy' },
  { value: 'other', label: 'Other' },
];

function TerminateModal({
  open,
  onOpenChange,
  employee,
  onConfirmed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeePublic;
  onConfirmed: () => void;
}) {
  const form = useForm<TerminateEmployeeInput>({
    resolver: zodResolver(terminateEmployeeSchema),
    defaultValues: { reason: '', lastWorkingDay: new Date(), notes: '' },
  });
  const [submitting, setSubmitting] = React.useState(false);

  async function onConfirm(values: TerminateEmployeeInput) {
    setSubmitting(true);
    try {
      await apiFetch(`/api/employees/${employee.id}/terminate`, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      toast.success(`${employee.fullName}'s employment has been terminated.`);
      onOpenChange(false);
      onConfirmed();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="gap-fn-3 mb-fn-1 flex items-start">
            <span
              aria-hidden
              className="rounded-fn-xs h-fn-8 w-fn-8 bg-fn-danger-soft text-fn-danger-soft-fg inline-flex shrink-0 items-center justify-center"
            >
              <BadgeAlert className="h-fn-4 w-fn-4" />
            </span>
            <div>
              <DialogTitle>Terminate {employee.fullName}'s employment?</DialogTitle>
              <DialogDescription className="mt-fn-1">
                This revokes login immediately, freezes payroll for the current month, and marks the
                profile read-only.{' '}
                <strong className="font-fn-semibold">Only a Super Admin can reverse this.</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          className="gap-fn-3 flex flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit(onConfirm)();
          }}
        >
          <Field label="Reason" required error={form.formState.errors.reason?.message}>
            <Combobox
              options={TERMINATE_REASONS}
              value={form.watch('reason')}
              onValueChange={(v) =>
                form.setValue('reason', v, { shouldDirty: true, shouldValidate: true })
              }
              placeholder="Resignation · contract end · …"
            />
          </Field>
          <Field
            label="Last working day"
            required
            error={form.formState.errors.lastWorkingDay?.message}
          >
            <Input
              type="date"
              value={dateValue(form.watch('lastWorkingDay'))}
              onChange={(e) =>
                form.setValue('lastWorkingDay', new Date(e.target.value), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
          </Field>
          <Field label="Notes (internal)" hint="Optional">
            <Textarea
              rows={3}
              value={form.watch('notes') ?? ''}
              onChange={(e) => form.setValue('notes', e.target.value, { shouldDirty: true })}
              placeholder="Anything HR + Finance should know…"
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" size="sm" disabled={submitting}>
              {submitting ? 'Terminating…' : 'Terminate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────── Misc helpers ────────────── */

function PhotoUploadTile() {
  return (
    <span
      aria-hidden
      className="rounded-fn-sm h-fn-10 w-fn-10 bg-fn-bg-subtle text-fn-fg-faint border-fn-border inline-flex shrink-0 items-center justify-center border border-dashed"
    >
      <UserCircle2 className="h-fn-5 w-fn-5" />
    </span>
  );
}

function StatusBadge({ slug, name }: { slug: string; name: string }) {
  // Same status-slug -> tone map used by the profile header; the
  // Badge primitive owns the shape.
  const tone: Record<string, BadgeTone> = {
    intern: 'info',
    probation: 'warning',
    permanent: 'success',
    contractor: 'accent',
  };
  return <Badge tone={tone[slug] ?? 'default'}>{name}</Badge>;
}

function emptyDefaults(): EmployeeCreateInput {
  return {
    fullName: '',
    firstName: '',
    lastName: '',
    pronouns: null,
    email: '',
    personalEmail: null,
    phone: null,
    personalPhone: null,
    address: null,
    dateOfBirth: null,
    gender: null,
    cnic: null,
    joinDate: new Date(),
    departmentId: '',
    designationId: '',
    statusId: '',
    contractType: 'FullTime',
    employmentRecord: null,
    managerId: null,
    salaryPkr: null,
    salaryEffectiveDate: null,
    salaryProcessedExternally: false,
    hasPayoneer: false,
    payoneerAccountId: null,
    payoneerEmail: null,
    eligibleForCommissions: false,
    commissionRate: null,
    bankName: null,
    bankBranch: null,
    iban: null,
    internshipEndDate: null,
    probationEndDate: null,
    biannualReviewEnabled: false,
    annualReviewEnabled: true,
    timezone: null,
    quietHoursStart: null,
    quietHoursEnd: null,
    emergencyContact: null,
    systemRole: 'employee',
  };
}

function toDefaults(employee: EmployeePublic): EmployeeCreateInput {
  return {
    fullName: employee.fullName,
    firstName: employee.firstName ?? '',
    lastName: employee.lastName ?? '',
    pronouns: employee.pronouns ?? null,
    email: employee.email,
    personalEmail: employee.personalEmail ?? null,
    phone: employee.phone,
    personalPhone: employee.personalPhone ?? null,
    address: employee.address ?? null,
    dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth) : null,
    gender: employee.gender,
    cnic: null,
    joinDate: new Date(employee.joinDate),
    departmentId: employee.department.id,
    designationId: employee.designation.id,
    statusId: employee.status.id,
    contractType: employee.contractType,
    employmentRecord: employee.employmentRecord ?? null,
    managerId: employee.manager?.id ?? null,
    salaryPkr: employee.salaryPkr ?? null,
    salaryEffectiveDate: employee.salaryEffectiveDate
      ? new Date(employee.salaryEffectiveDate)
      : null,
    salaryProcessedExternally: employee.salaryProcessedExternally ?? false,
    hasPayoneer: employee.hasPayoneer,
    payoneerAccountId: employee.payoneerAccountId ?? null,
    payoneerEmail: employee.payoneerEmail ?? null,
    eligibleForCommissions: employee.eligibleForCommissions ?? false,
    commissionRate: employee.commissionRate ?? null,
    bankName: employee.bankName ?? null,
    bankBranch: employee.bankBranch ?? null,
    iban: employee.iban ?? null,
    internshipEndDate: employee.internshipEndDate ? new Date(employee.internshipEndDate) : null,
    probationEndDate: employee.probationEndDate ? new Date(employee.probationEndDate) : null,
    biannualReviewEnabled: false,
    annualReviewEnabled: true,
    timezone: employee.timezone ?? null,
    quietHoursStart: employee.quietHoursStart ?? null,
    quietHoursEnd: employee.quietHoursEnd ?? null,
    emergencyContact: employee.emergencyContact ?? null,
    systemRole: employee.systemRole ?? 'employee',
  };
}

function dateValue(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function formatShortDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${d.toLocaleString('en-GB', { month: 'short' })} ${d.getFullYear()}`;
}
