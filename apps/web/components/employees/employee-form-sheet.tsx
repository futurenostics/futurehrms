'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Briefcase, Eye, Pencil, Phone, User, UserPlus, Wallet, ChevronDown } from 'lucide-react';
import {
  contractTypeSchema,
  employeeCreateSchema,
  type EmployeeCreateInput,
  type EmployeePublic,
  type Gender,
} from '@futurenostics/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Combobox } from '@/components/ui/combobox';
import { RadioCardGroup, RadioCard } from '@/components/ui/radio-group';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useCreateEmployee, useReferences, useUpdateEmployee } from '@/lib/queries/employees';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

/**
 * Employee form sheet — shared between Create and Edit modes.
 *
 * Visual + interaction model is locked to the Overtime Rules editor
 * sheet (docs/design/screens/overtime-rules.jsx → RuleEditorSheet
 * @ L192). Sections, fields, live preview panel, and footer match.
 *
 * Headless on URL state — the parent page reads any ?sheet= query
 * param and passes `open` accordingly, then handles browser-back
 * close by clearing the param.
 */

const CONTRACT_OPTIONS = contractTypeSchema.options;

const GENDER_OPTIONS: Array<{ value: '' | Gender; label: string }> = [
  { value: '', label: 'Not specified' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
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

  // Reset whenever the sheet reopens or the editing employee changes so
  // re-opening the sheet doesn't show stale field state from a previous
  // edit session.
  React.useEffect(() => {
    if (open) form.reset(defaults);
  }, [open, defaults, form]);

  const watch = form.watch();
  const departmentId = watch.departmentId;
  const contractType = watch.contractType;
  const statusId = watch.statusId;
  const hasPayoneer = watch.hasPayoneer ?? false;

  const filteredDesignations = React.useMemo(() => {
    if (!refs.data || !departmentId) return [];
    return refs.data.designations.filter((d) => d.departmentId === departmentId);
  }, [refs.data, departmentId]);

  const departmentOptions = React.useMemo(
    () => (refs.data?.departments ?? []).map((d) => ({ value: d.id, label: d.name })),
    [refs.data?.departments],
  );
  const designationOptions = React.useMemo(
    () => filteredDesignations.map((d) => ({ value: d.id, label: d.name })),
    [filteredDesignations],
  );
  const statusOptions = React.useMemo(
    () =>
      (refs.data?.statuses ?? [])
        .filter((s) => s.slug !== 'terminated')
        .map((s) => ({ value: s.id, label: s.name })),
    [refs.data?.statuses],
  );

  const statusSlug = React.useMemo(
    () => refs.data?.statuses.find((s) => s.id === statusId)?.slug,
    [refs.data?.statuses, statusId],
  );
  const showProbationEnd = statusSlug === 'probation';
  const showInternshipEnd = contractType === 'Intern';

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
    void form.handleSubmit(onSubmit)();
  }

  // Reset designation when department changes — the options are filtered
  // by department so the prior value will be invalid.
  const setDepartment = (id: string) => {
    form.setValue('departmentId', id, { shouldDirty: true, shouldValidate: true });
    form.setValue('designationId', '', { shouldDirty: true });
  };

  // Title input — wired to the fullName field. In Create mode the title
  // input is disabled (the input row reads "New employee" as a static
  // label); the actual fullName field lives in the Basics section.
  const titleValue = mode === 'create' ? '' : (watch.fullName ?? '');
  const subtitle =
    mode === 'create'
      ? 'New employee · will be assigned EID on save'
      : `Editing ${employee?.eid ?? '—'} · changes are audit-logged`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="lg" className="flex flex-col p-0">
        {/* ── Sticky header ────────────────────────────────────────── */}
        <SheetHeader className="gap-fn-3 flex-row items-center">
          <span
            aria-hidden
            className="rounded-fn-sm h-fn-9 w-fn-9 inline-flex shrink-0 items-center justify-center"
            style={{
              background: 'var(--fn-icon-tile)',
              color: 'var(--fn-icon-tile-fg)',
            }}
          >
            {mode === 'create' ? (
              <UserPlus className="h-fn-4 w-fn-4" />
            ) : (
              <Pencil className="h-fn-4 w-fn-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <SheetTitle className="sr-only">
              {mode === 'create' ? 'Add new employee' : `Edit ${employee?.fullName ?? 'employee'}`}
            </SheetTitle>
            <Input
              value={mode === 'create' ? 'New employee' : titleValue}
              onChange={(e) =>
                mode === 'edit' &&
                form.setValue('fullName', e.target.value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              disabled={mode === 'create'}
              placeholder="Full name"
              aria-label="Employee full name"
              className={cn(
                'font-fn-semibold h-[38px] text-[14px]',
                mode === 'create' && 'disabled:cursor-default disabled:opacity-100',
              )}
            />
            <div className="text-fn-fg-faint mt-fn-1 text-[11.5px]">{subtitle}</div>
          </div>
        </SheetHeader>

        {/* ── Scrollable body ──────────────────────────────────────── */}
        <SheetBody className="pt-fn-1_5 pb-fn-6 flex flex-col">
          {/* Section 1 — Basics */}
          <SheetSection
            icon={<User className="h-fn-3_5 w-fn-3_5" />}
            title="Basics"
            description="Identity and contact information."
            first
          >
            <SheetField
              label="Full name"
              required
              error={form.formState.errors.fullName?.message}
              fullWidth
            >
              <Input {...form.register('fullName')} autoComplete="name" placeholder="Asma Ali" />
            </SheetField>
            <SheetField
              label="Email"
              required
              error={form.formState.errors.email?.message}
              fullWidth
            >
              <Input
                type="email"
                {...form.register('email')}
                autoComplete="email"
                placeholder="asma.ali@futurenostics.com"
              />
            </SheetField>
            <SheetField label="Phone" error={form.formState.errors.phone?.message}>
              <Input
                value={watch.phone ?? ''}
                onChange={(e) =>
                  form.setValue('phone', e.target.value || null, { shouldDirty: true })
                }
                placeholder="+92 300 1234567"
                autoComplete="tel"
              />
            </SheetField>
            <SheetField label="Date of birth">
              <Input
                type="date"
                value={dateValue(watch.dateOfBirth)}
                onChange={(e) =>
                  form.setValue('dateOfBirth', e.target.value ? new Date(e.target.value) : null, {
                    shouldDirty: true,
                  })
                }
              />
            </SheetField>
            <SheetField label="Gender">
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
            </SheetField>
            <SheetField
              label="CNIC"
              hint="Format: 12345-1234567-1"
              error={form.formState.errors.cnic?.message}
            >
              <Input
                value={watch.cnic ?? ''}
                onChange={(e) =>
                  form.setValue('cnic', e.target.value || null, { shouldDirty: true })
                }
                placeholder="12345-1234567-1"
                className="tabular-nums"
              />
            </SheetField>
          </SheetSection>

          {/* Section 2 — Employment */}
          <SheetSection
            icon={<Briefcase className="h-fn-3_5 w-fn-3_5" />}
            title="Employment"
            description="Role, department, and employment terms."
          >
            <SheetField
              label="Department"
              required
              error={form.formState.errors.departmentId?.message}
            >
              <Combobox
                options={departmentOptions}
                value={watch.departmentId}
                onValueChange={setDepartment}
                placeholder="Select department…"
              />
            </SheetField>
            <SheetField
              label="Designation"
              required
              hint={departmentId ? undefined : 'Select department first'}
              error={form.formState.errors.designationId?.message}
            >
              <Combobox
                options={designationOptions}
                value={watch.designationId}
                onValueChange={(v) =>
                  form.setValue('designationId', v, { shouldDirty: true, shouldValidate: true })
                }
                placeholder="Select designation…"
                disabled={!departmentId}
              />
            </SheetField>

            <SheetField label="Contract type" required fullWidth>
              <RadioCardGroup
                value={watch.contractType}
                onValueChange={(v) =>
                  form.setValue('contractType', v as EmployeeCreateInput['contractType'], {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                className="gap-fn-2 grid grid-cols-2 sm:grid-cols-4"
              >
                {CONTRACT_OPTIONS.map((c) => (
                  <RadioCard key={c} value={c} title={c} />
                ))}
              </RadioCardGroup>
            </SheetField>

            <SheetField label="Status" required error={form.formState.errors.statusId?.message}>
              <Combobox
                options={statusOptions}
                value={watch.statusId}
                onValueChange={(v) =>
                  form.setValue('statusId', v, { shouldDirty: true, shouldValidate: true })
                }
                placeholder="Select status…"
              />
            </SheetField>
            <SheetField label="Join date" required>
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
            </SheetField>

            {showInternshipEnd && (
              <SheetField label="Internship end date">
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
              </SheetField>
            )}
            {showProbationEnd && (
              <SheetField label="Probation end date" hint="Defaults to join date + 90 days">
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
              </SheetField>
            )}
          </SheetSection>

          {/* Section 3 — Compensation (permission-gated) */}
          {canViewSalary && (
            <SheetSection
              icon={<Wallet className="h-fn-3_5 w-fn-3_5" />}
              title="Compensation"
              description="Salary and payment routing. Changes are audit-logged."
            >
              <SheetField
                label="Monthly salary (PKR)"
                error={form.formState.errors.salaryPkr?.message}
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
                  placeholder="e.g. 150000"
                  className="tabular-nums"
                />
              </SheetField>
              <SheetField label="Has Payoneer account">
                <label className="gap-fn-2_5 inline-flex h-[38px] cursor-pointer items-center text-[13px]">
                  <Switch
                    checked={hasPayoneer}
                    onCheckedChange={(v) =>
                      form.setValue('hasPayoneer', v === true, { shouldDirty: true })
                    }
                  />
                  <span className="text-fn-fg">{hasPayoneer ? 'Yes' : 'No'}</span>
                </label>
              </SheetField>
              {hasPayoneer && (
                <SheetField
                  label="Payoneer account id"
                  hint="Optional · used to route USD payouts"
                  fullWidth
                >
                  <Input
                    value={watch.payoneerAccountId ?? ''}
                    onChange={(e) =>
                      form.setValue('payoneerAccountId', e.target.value || null, {
                        shouldDirty: true,
                      })
                    }
                    placeholder="e.g. PAY-1234567"
                  />
                </SheetField>
              )}
            </SheetSection>
          )}

          {/* Section 4 — Emergency contact (collapsed) */}
          <CollapsibleSection
            icon={<Phone className="h-fn-3_5 w-fn-3_5" />}
            title="Emergency contact"
            description="Optional · used only in genuine emergencies."
          >
            <SheetField label="Contact name">
              <Input
                value={watch.emergencyContact?.name ?? ''}
                onChange={(e) =>
                  form.setValue(
                    'emergencyContact',
                    { ...(watch.emergencyContact ?? {}), name: e.target.value || undefined },
                    { shouldDirty: true },
                  )
                }
              />
            </SheetField>
            <SheetField label="Relationship">
              <Input
                value={watch.emergencyContact?.relationship ?? ''}
                onChange={(e) =>
                  form.setValue(
                    'emergencyContact',
                    {
                      ...(watch.emergencyContact ?? {}),
                      relationship: e.target.value || undefined,
                    },
                    { shouldDirty: true },
                  )
                }
              />
            </SheetField>
            <SheetField label="Phone" fullWidth>
              <Input
                value={watch.emergencyContact?.phone ?? ''}
                onChange={(e) =>
                  form.setValue(
                    'emergencyContact',
                    { ...(watch.emergencyContact ?? {}), phone: e.target.value || undefined },
                    { shouldDirty: true },
                  )
                }
                placeholder="+92 300 1234567"
              />
            </SheetField>
          </CollapsibleSection>

          {/* Live preview / changes panel */}
          <LivePreviewPanel
            mode={mode}
            values={watch}
            employee={employee}
            dirtyFields={form.formState.dirtyFields}
            refs={refs.data}
          />
        </SheetBody>

        {/* ── Sticky footer ────────────────────────────────────────── */}
        <SheetFooter className="bg-fn-bg-subtle">
          <div className="gap-fn-2_5 flex items-center">
            <Switch defaultChecked disabled={mode === 'create'} aria-label="Active on save" />
            <span className="text-fn-fg text-[12.5px]">
              {mode === 'create' ? 'Active on create' : 'Active'}
            </span>
          </div>
          <div className="gap-fn-2 ml-auto flex items-center">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitClick}
              disabled={
                isSubmitting ||
                !form.formState.isValid ||
                (mode === 'edit' && !form.formState.isDirty)
              }
            >
              {isSubmitting ? 'Saving…' : mode === 'create' ? 'Create employee' : 'Save changes'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ────────────── Section + Field helpers ────────────── */

function SheetSection({
  icon,
  title,
  description,
  first,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  /** First section has no top border (the sheet header already provides one). */
  first?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        'pt-fn-5 mt-fn-5 gap-fn-4 grid grid-cols-1 sm:grid-cols-2',
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
          <h3 className="text-fn-fg font-fn-semibold tracking-fn-tight text-[14px]">{title}</h3>
          {description && <p className="text-fn-fg-faint mt-fn-0_5 text-[11.5px]">{description}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function CollapsibleSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <section className="border-fn-divider mt-fn-5 pt-fn-5 border-t">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="gap-fn-2_5 hover:text-fn-fg flex w-full cursor-pointer items-center text-left"
      >
        <span
          aria-hidden
          className="rounded-fn-xs h-fn-6 w-fn-6 inline-flex shrink-0 items-center justify-center"
          style={{ background: 'var(--fn-icon-tile)', color: 'var(--fn-icon-tile-fg)' }}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-fn-fg font-fn-semibold tracking-fn-tight text-[14px]">{title}</h3>
          {description && <p className="text-fn-fg-faint mt-fn-0_5 text-[11.5px]">{description}</p>}
        </div>
        <ChevronDown
          className={cn(
            'text-fn-fg-faint h-fn-4 w-fn-4 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && <div className="gap-fn-4 mt-fn-4 grid grid-cols-1 sm:grid-cols-2">{children}</div>}
    </section>
  );
}

function SheetField({
  label,
  hint,
  error,
  required,
  fullWidth,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex flex-col', fullWidth && 'sm:col-span-2')}>
      <label className="text-fn-fg font-fn-semibold mb-fn-1 text-[12.5px]">
        {label}
        {required && <span className="text-fn-danger ml-fn-0_5">*</span>}
      </label>
      {children}
      {error ? (
        <div className="text-fn-danger mt-fn-1 text-[11px]">{error}</div>
      ) : hint ? (
        <div className="text-fn-fg-faint mt-fn-1 text-[11px]">{hint}</div>
      ) : null}
    </div>
  );
}

/* ────────────── Live preview / changes panel ────────────── */

type ReferencesData = NonNullable<ReturnType<typeof useReferences>['data']>;

function LivePreviewPanel({
  mode,
  values,
  employee,
  dirtyFields,
  refs,
}: {
  mode: 'create' | 'edit';
  values: EmployeeCreateInput;
  employee: EmployeePublic | undefined;
  dirtyFields: Partial<Record<FieldPath<EmployeeCreateInput>, unknown>>;
  refs: ReferencesData | undefined;
}) {
  if (mode === 'create') {
    const status = refs?.statuses.find((s) => s.id === values.statusId);
    const dept = refs?.departments.find((d) => d.id === values.departmentId);
    const desg = refs?.designations.find((d) => d.id === values.designationId);
    const probationEnds = dateValue(values.probationEndDate);
    return (
      <PreviewFrame label="Summary" intent="info">
        <p className="text-fn-fg text-[13.5px]">On save, this employee will be created with:</p>
        <ul className="mt-fn-1_5 text-fn-fg-muted gap-fn-1 flex flex-col text-[12.5px]">
          <li>EID will be auto-assigned</li>
          {dept && (
            <li>
              Department: <strong className="text-fn-fg font-fn-semibold">{dept.name}</strong>
            </li>
          )}
          {desg && (
            <li>
              Designation: <strong className="text-fn-fg font-fn-semibold">{desg.name}</strong>
            </li>
          )}
          {status && (
            <li>
              Status: <strong className="text-fn-fg font-fn-semibold">{status.name}</strong>
              {probationEnds && status.slug === 'probation' && (
                <> · probation ends {probationEnds}</>
              )}
            </li>
          )}
          {values.salaryPkr != null && (
            <li>
              Salary:{' '}
              <strong className="text-fn-fg font-fn-semibold tabular-nums">
                PKR {values.salaryPkr.toLocaleString()}
              </strong>
            </li>
          )}
        </ul>
      </PreviewFrame>
    );
  }

  // Edit mode — compute a diff of dirty fields
  const dirty = Object.keys(dirtyFields).filter((k) =>
    Boolean((dirtyFields as Record<string, unknown>)[k]),
  );
  if (dirty.length === 0 || !employee) {
    return (
      <PreviewFrame label="Changes" intent="muted">
        <p className="text-fn-fg-muted text-[12.5px]">
          No changes yet. Edit a field above to see a summary here.
        </p>
      </PreviewFrame>
    );
  }
  return (
    <PreviewFrame label="Changes" intent="info">
      <p className="text-fn-fg text-[13.5px]">
        You're changing <strong className="font-fn-semibold">{dirty.length}</strong>{' '}
        {dirty.length === 1 ? 'field' : 'fields'}:
      </p>
      <ul className="mt-fn-1_5 text-fn-fg-muted gap-fn-1 flex flex-col text-[12.5px]">
        {dirty.slice(0, 6).map((field) => (
          <li key={field}>
            <span className="text-fn-fg-faint font-fn-medium">{labelForField(field)}:</span>{' '}
            <span className="tabular-nums">{describeChange(field, employee, values, refs)}</span>
          </li>
        ))}
        {dirty.length > 6 && <li className="text-fn-fg-faint">… and {dirty.length - 6} more</li>}
      </ul>
    </PreviewFrame>
  );
}

function PreviewFrame({
  label,
  intent,
  children,
}: {
  label: string;
  intent: 'info' | 'muted';
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-fn-sm mt-fn-6 gap-fn-3 p-fn-4 flex border',
        intent === 'info'
          ? 'border-fn-accent/25 bg-fn-accent-soft/40'
          : 'border-fn-border bg-fn-bg-subtle',
      )}
    >
      <span
        aria-hidden
        className="rounded-fn-xs h-fn-7 w-fn-7 bg-fn-bg-panel/60 text-fn-accent-soft-fg inline-flex shrink-0 items-center justify-center"
      >
        <Eye className="h-fn-3_5 w-fn-3_5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-fn-accent-soft-fg font-fn-semibold tracking-fn-uppercase-tight text-[11px] uppercase">
          {label}
        </div>
        <div className="mt-fn-1">{children}</div>
      </div>
    </div>
  );
}

/* ────────────── Helpers ────────────── */

function emptyDefaults(): EmployeeCreateInput {
  return {
    fullName: '',
    email: '',
    phone: null,
    dateOfBirth: null,
    gender: null,
    cnic: null,
    joinDate: new Date(),
    departmentId: '',
    designationId: '',
    statusId: '',
    contractType: 'FullTime',
    managerId: null,
    salaryPkr: null,
    salaryProcessedExternally: false,
    hasPayoneer: false,
    payoneerAccountId: null,
    internshipEndDate: null,
    probationEndDate: null,
    biannualReviewEnabled: false,
    annualReviewEnabled: true,
    emergencyContact: null,
  };
}

function toDefaults(employee: EmployeePublic): EmployeeCreateInput {
  return {
    fullName: employee.fullName,
    email: employee.email,
    phone: employee.phone,
    dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth) : null,
    gender: employee.gender,
    cnic: null, // masked CNIC is never round-tripped; blank preserves existing
    joinDate: new Date(employee.joinDate),
    departmentId: employee.department.id,
    designationId: employee.designation.id,
    statusId: employee.status.id,
    contractType: employee.contractType,
    managerId: employee.manager?.id ?? null,
    salaryPkr: employee.salaryPkr ?? null,
    salaryProcessedExternally: employee.salaryProcessedExternally ?? false,
    hasPayoneer: employee.hasPayoneer,
    payoneerAccountId: employee.payoneerAccountId ?? null,
    internshipEndDate: employee.internshipEndDate ? new Date(employee.internshipEndDate) : null,
    probationEndDate: employee.probationEndDate ? new Date(employee.probationEndDate) : null,
    biannualReviewEnabled: false,
    annualReviewEnabled: true,
    emergencyContact: employee.emergencyContact ?? null,
  };
}

function dateValue(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

const FIELD_LABELS: Record<string, string> = {
  fullName: 'Full name',
  email: 'Email',
  phone: 'Phone',
  dateOfBirth: 'Date of birth',
  gender: 'Gender',
  cnic: 'CNIC',
  joinDate: 'Join date',
  departmentId: 'Department',
  designationId: 'Designation',
  statusId: 'Status',
  contractType: 'Contract type',
  managerId: 'Manager',
  salaryPkr: 'Salary',
  hasPayoneer: 'Payoneer',
  payoneerAccountId: 'Payoneer account',
  internshipEndDate: 'Internship end',
  probationEndDate: 'Probation end',
  emergencyContact: 'Emergency contact',
};
function labelForField(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

function describeChange(
  field: string,
  employee: EmployeePublic,
  values: EmployeeCreateInput,
  refs: ReferencesData | undefined,
): string {
  switch (field) {
    case 'departmentId': {
      const next = refs?.departments.find((d) => d.id === values.departmentId)?.name ?? '—';
      return `${employee.department.name} → ${next}`;
    }
    case 'designationId': {
      const next = refs?.designations.find((d) => d.id === values.designationId)?.name ?? '—';
      return `${employee.designation.name} → ${next}`;
    }
    case 'statusId': {
      const next = refs?.statuses.find((s) => s.id === values.statusId)?.name ?? '—';
      return `${employee.status.name} → ${next}`;
    }
    case 'salaryPkr': {
      const before =
        employee.salaryPkr != null ? `PKR ${employee.salaryPkr.toLocaleString()}` : '—';
      const after = values.salaryPkr != null ? `PKR ${values.salaryPkr.toLocaleString()}` : '—';
      return `${before} → ${after}`;
    }
    case 'managerId': {
      return `${employee.manager?.fullName ?? '—'} → ${values.managerId ?? '—'}`;
    }
    case 'fullName':
      return `${employee.fullName} → ${values.fullName}`;
    case 'email':
      return `${employee.email} → ${values.email}`;
    default:
      return 'updated';
  }
}
