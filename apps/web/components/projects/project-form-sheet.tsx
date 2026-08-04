'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { AlertTriangle, ArrowRight, Briefcase, Building2, Layers } from 'lucide-react';
import {
  projectCreateSchema,
  type PoolMode,
  type ProjectCategoryPublic,
  type ProjectCreateInput,
  type ProjectPublic,
} from '@futurenostics/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Combobox, MultiCombobox, type ComboboxOption } from '@/components/ui/combobox';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  useCreateProject,
  useProject,
  useProjectCategories,
  useUpdateProject,
} from '@/lib/queries/projects';
import { useEmployeesList, useReferences } from '@/lib/queries/employees';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';

/**
 * Project create / edit side sheet — PNG 08 (New project), PNG 11
 * top right corner pattern.
 *
 * Step 1: pick a category (live preview of which rule will back it).
 * Step 2: project details + role assignments. Right rail shows a
 * live commission preview computed client-side from the rule's
 * pool % + role splits, so the user sees the dollars update as
 * they type.
 *
 * `mode='edit'` skips Step 1 (you can't re-category an existing
 * project per the locked decision) and pre-fills the form from the
 * existing project. Per-row override is honored on edit but the
 * Step-1 picker is hidden.
 */

interface ProjectFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  projectId?: string | null;
}

const ROLES = [
  { key: 'winner', label: 'Winner' },
  { key: 'communicator', label: 'Communicator' },
  { key: 'eligible_team', label: 'Eligible team' },
] as const;

// External-project engagement sub-types (spec §4.3.1).
const SUB_TYPE_OPTIONS: ComboboxOption[] = [
  { value: 'full_time', label: 'Full-Time' },
  { value: 'part_time', label: 'Part-Time' },
  { value: 'partial_short', label: 'Partial · 20–25 hrs/week (≤ 4.5 months)' },
  { value: 'partial_extended', label: 'Partial · 20–25 hrs/week (> 4.5 months)' },
  { value: 'probation_training', label: 'Probation / Training / Internship' },
  { value: 'team_lead_owned', label: 'Team Lead-Owned' },
  { value: 'associates', label: 'Associates (Johnny + Michele)' },
];

export function ProjectFormSheet({ open, onOpenChange, mode, projectId }: ProjectFormSheetProps) {
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject(projectId ?? '');
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const projectQuery = useProject(mode === 'edit' ? projectId : null);
  const project = projectQuery.data;

  const categoriesQuery = useProjectCategories();
  const refsQuery = useReferences();
  const employeesQuery = useEmployeesList({ limit: 500 });

  /* ---------- Step state ---------- */
  const [step, setStep] = React.useState<1 | 2>(mode === 'edit' ? 2 : 1);
  React.useEffect(() => {
    setStep(mode === 'edit' ? 2 : 1);
  }, [mode, open]);

  // "Will the developer handle communication?" — when on, there's no
  // separate communicator (the winner covers comms).
  const [devHandlesComms, setDevHandlesComms] = React.useState(true);

  /* ---------- Form ---------- */
  const form = useForm<ProjectCreateInput>({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: defaultsForMode(mode, project),
    mode: 'onBlur',
  });
  const { register, handleSubmit, watch, setValue, control, reset, formState } = form;

  // Re-seed defaults when switching project or mode.
  React.useEffect(() => {
    reset(defaultsForMode(mode, project));
  }, [mode, project, reset]);

  const categoryId = watch('categoryId');
  const departmentId = watch('departmentId');
  const revenueUsd = Number(watch('revenueUsd') ?? 0);

  /* ---------- Rule resolution preview ---------- */
  const [resolvedRule, setResolvedRule] = React.useState<{
    version: string;
    poolMode: PoolMode;
    poolValue: number;
    rolePercentages: Record<string, number>;
    designationAmounts: Array<{ designation: string; amountUsd: number }> | null;
  } | null>(null);
  const [ruleResolving, setRuleResolving] = React.useState(false);
  const [ruleError, setRuleError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!categoryId || !departmentId) {
      setResolvedRule(null);
      return;
    }
    let cancelled = false;
    setRuleResolving(true);
    setRuleError(null);
    apiFetch<{
      items: Array<{
        id: string;
        version: string;
        department: string;
        categoryId: string;
        poolMode: PoolMode;
        poolValue: number;
        rolePercentages: Record<string, number>;
        designationAmounts: Array<{ designation: string; amountUsd: number }> | null;
        status: string;
      }>;
    }>(`/api/commission-rules?activeOnly=true&categoryId=${categoryId}&limit=50`)
      .then((res) => {
        if (cancelled) return;
        const dept = refsQuery.data?.departments.find((d) => d.id === departmentId);
        if (!dept) {
          setResolvedRule(null);
          return;
        }
        const exact = res.items.find((r) => r.department === dept.slug);
        const fallback = res.items.find((r) => r.department === '*');
        const rule = exact ?? fallback;
        if (!rule) {
          setResolvedRule(null);
          setRuleError(
            `No active commission rule for ${dept.name} × selected category. Publish one before creating projects here.`,
          );
          return;
        }
        setResolvedRule({
          version: rule.version,
          poolMode: rule.poolMode,
          poolValue: rule.poolValue,
          rolePercentages: rule.rolePercentages,
          designationAmounts: rule.designationAmounts ?? null,
        });
      })
      .catch((err) => {
        if (!cancelled) setRuleError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setRuleResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId, departmentId, refsQuery.data]);

  // When the rule resolves, seed assignment percentages to match its defaults.
  // (Edit mode keeps the project's existing assignments.)
  React.useEffect(() => {
    if (mode === 'edit' || !resolvedRule) return;
    const currentAssignments = form.getValues('assignments');
    if (currentAssignments.length > 0) return;
    // No-op until user picks people — handled in onRolePeopleChange below.
  }, [resolvedRule, mode, form]);

  /* ---------- Role pickers ---------- */
  const employees = employeesQuery.data?.items ?? [];
  const employeeOptions: ComboboxOption[] = React.useMemo(
    () =>
      employees.map((e) => ({
        value: e.id,
        label: e.fullName,
        description: `${e.designation.name} · ${e.department.name}`,
      })),
    [employees],
  );

  const assignments = watch('assignments');

  function setRoleSingle(roleKey: 'winner' | 'communicator', employeeId: string) {
    const pct = resolvedRule?.rolePercentages[roleKey] ?? 0;
    const others = assignments.filter((a) => a.roleName !== roleKey);
    setValue('assignments', [...others, { employeeId, roleName: roleKey, percentage: pct }]);
  }

  function setEligibleTeam(employeeIds: string[]) {
    const totalShare = resolvedRule?.rolePercentages.eligible_team ?? 0;
    const perPerson =
      employeeIds.length > 0 ? Number((totalShare / employeeIds.length).toFixed(2)) : 0;
    const others = assignments.filter((a) => a.roleName !== 'eligible_team');
    const team = employeeIds.map((id) => ({
      employeeId: id,
      roleName: 'eligible_team',
      percentage: perPerson,
    }));
    setValue('assignments', [...others, ...team]);
  }

  const winnerId = assignments.find((a) => a.roleName === 'winner')?.employeeId;
  const communicatorId = assignments.find((a) => a.roleName === 'communicator')?.employeeId;
  const eligibleIds = assignments
    .filter((a) => a.roleName === 'eligible_team')
    .map((a) => a.employeeId);

  /* ---------- Submit ---------- */
  async function onSubmit(values: ProjectCreateInput) {
    try {
      if (mode === 'edit' && projectId) {
        await updateMutation.mutateAsync({
          name: values.name,
          clientName: values.clientName,
          revenueUsd: values.revenueUsd,
          startDate: values.startDate,
          expectedCompletionDate: values.expectedCompletionDate,
          notes: values.notes,
          status: values.status,
        });
        toast.success('Project updated.');
      } else {
        await createMutation.mutateAsync(values);
        toast.success('Project created.');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function saveAsDraft() {
    setValue('status', 'draft');
    await handleSubmit(onSubmit)();
  }

  /* ---------- Render ---------- */
  const categories = categoriesQuery.data ?? [];
  const departments = refsQuery.data?.departments ?? [];

  const departmentOptions: ComboboxOption[] = departments.map((d) => ({
    value: d.id,
    label: d.name,
  }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="xl">
        <SheetHeader>
          <div className="gap-fn-2 flex items-center">
            <span className="rounded-fn-xs bg-fn-icon-tile text-fn-icon-tile-fg h-fn-7 w-fn-7 inline-flex items-center justify-center">
              <Briefcase className="h-fn-3_5 w-fn-3_5" />
            </span>
            <div>
              <SheetTitle>{mode === 'edit' ? 'Edit project' : 'New project'}</SheetTitle>
              <p className="text-fn-fg-faint mt-fn-0_5 text-[12px]">
                Step {step} of 2 · {step === 1 ? 'Pick category' : 'Project details'}
              </p>
            </div>
            {resolvedRule && step === 2 && (
              <Badge tone="info" className="ml-auto">
                Rule v{resolvedRule.version} · active
              </Badge>
            )}
          </div>
        </SheetHeader>

        <SheetBody>
          {/* Step 1: category */}
          {step === 1 && mode === 'create' && (
            <div className="gap-fn-4 p-fn-5 flex flex-col">
              <div>
                <h3 className="text-fn-fg font-fn-semibold text-[15px]">
                  Which category does this project belong to?
                </h3>
                <p className="text-fn-fg-muted mt-fn-1_5 max-w-[500px] text-[13px]">
                  The category drives which commission rule applies. You can change role percentages
                  on the next step if you need to override the defaults.
                </p>
              </div>
              <div className="gap-fn-3 grid grid-cols-1 sm:grid-cols-3">
                {categories
                  .filter((c) => !c.archived && !c.parentId)
                  .map((c) => (
                    <CategoryPickerCard
                      key={c.id}
                      cat={c}
                      selected={categoryId === c.id}
                      onClick={() => {
                        setValue('categoryId', c.id);
                      }}
                    />
                  ))}
              </div>
              <div className="gap-fn-3 grid grid-cols-1 sm:grid-cols-2">
                <Field label="Department scope" required>
                  <Controller
                    name="departmentId"
                    control={control}
                    render={({ field }) => (
                      <Combobox
                        options={departmentOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Pick a department"
                      />
                    )}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Step 2: details + preview */}
          {step === 2 && (
            <div className="gap-fn-0 p-fn-0 flex">
              <div className="gap-fn-4 px-fn-5 py-fn-5 border-fn-divider flex flex-1 flex-col border-r">
                {/* Category recap when create + step 2 */}
                {mode === 'create' && (
                  <div className="rounded-fn-sm border-fn-border bg-fn-bg-inset px-fn-3 py-fn-2_5 gap-fn-2_5 flex items-start border">
                    <Layers className="text-fn-fg-muted mt-fn-0_5 h-fn-4 w-fn-4 shrink-0" />
                    <div className="flex-1 text-[12.5px]">
                      <div className="text-fn-fg font-fn-medium">
                        {categories.find((c) => c.id === categoryId)?.name ?? '—'} ·{' '}
                        {departments.find((d) => d.id === departmentId)?.name ?? '—'}
                      </div>
                      <div className="text-fn-fg-faint mt-fn-0_5">
                        {resolvedRule
                          ? `Commission pool = ${formatPool(resolvedRule)} of revenue`
                          : ruleResolving
                            ? 'Resolving rule…'
                            : (ruleError ?? 'No matching rule found.')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-fn-accent-soft-fg font-fn-medium cursor-pointer text-[12px] hover:underline"
                    >
                      Change category
                    </button>
                  </div>
                )}

                {/* Basics */}
                <Field label="Project name" required error={formState.errors.name?.message}>
                  <Input placeholder="Acme Web Refresh" {...register('name')} />
                </Field>

                <Field label="Client" required error={formState.errors.clientName?.message}>
                  <Input placeholder="Acme Inc." {...register('clientName')} />
                </Field>

                <Field
                  label="Engagement sub-type"
                  hint="For External projects — full-time, part-time, partial, etc. (optional)"
                >
                  <Combobox
                    options={SUB_TYPE_OPTIONS}
                    value={watch('subType') ?? ''}
                    onValueChange={(v) =>
                      setValue('subType', (v || null) as ProjectCreateInput['subType'])
                    }
                    placeholder="Select a sub-type"
                    searchPlaceholder="Search sub-types…"
                  />
                </Field>

                <div className="gap-fn-3 grid grid-cols-1 sm:grid-cols-2">
                  <Field
                    label="Revenue (USD)"
                    required
                    error={formState.errors.revenueUsd?.message}
                  >
                    <Input
                      type="number"
                      placeholder="12000.00"
                      step="0.01"
                      {...register('revenueUsd')}
                    />
                  </Field>
                  <Field label="Start date" required error={formState.errors.startDate?.message}>
                    <Input type="date" {...register('startDate')} />
                  </Field>
                </div>

                {resolvedRule?.poolMode === 'net_revenue_share' && (
                  <Field
                    label="Developer salary (PKR / month)"
                    hint="Subtracted from revenue (converted to USD at run time) to form the net commission pool."
                    error={formState.errors.developerSalaryPkr?.message}
                  >
                    <Input
                      type="number"
                      placeholder="250000"
                      step="1000"
                      {...register('developerSalaryPkr')}
                    />
                  </Field>
                )}

                <Field
                  label="Expected completion (optional)"
                  hint="Drives the time-proportional disbursement. If unset, the pool pays out in the start month."
                >
                  <Input type="date" {...register('expectedCompletionDate')} />
                </Field>

                {/* Role assignments */}
                <div className="gap-fn-3 flex flex-col">
                  <div className="text-fn-fg font-fn-semibold text-[13.5px]">Role assignments</div>

                  <Field label="Developer who won the project" required>
                    <Controller
                      name="assignments"
                      control={control}
                      render={() => (
                        <Combobox
                          options={employeeOptions}
                          value={winnerId}
                          onValueChange={(id) => setRoleSingle('winner', id)}
                          placeholder="Pick who won the deal"
                          searchPlaceholder="Search employees…"
                        />
                      )}
                    />
                  </Field>

                  <div className="border-fn-border rounded-fn-sm px-fn-3 py-fn-2_5 gap-fn-3 flex items-center justify-between border">
                    <div className="gap-fn-0_5 flex flex-col">
                      <span className="text-fn-fg font-fn-medium text-[13px]">
                        Will the developer handle communication?
                      </span>
                      <span className="text-fn-fg-faint text-[11.5px]">
                        Turn off to assign a separate communicator.
                      </span>
                    </div>
                    <Switch
                      checked={devHandlesComms}
                      onCheckedChange={(v) => {
                        setDevHandlesComms(v);
                        if (v) {
                          setValue(
                            'assignments',
                            assignments.filter((a) => a.roleName !== 'communicator'),
                          );
                        }
                      }}
                    />
                  </div>

                  {!devHandlesComms && (
                    <Field label="Communicator" hint="The day-to-day client point of contact.">
                      <Controller
                        name="assignments"
                        control={control}
                        render={() => (
                          <Combobox
                            options={employeeOptions}
                            value={communicatorId}
                            onValueChange={(id) => setRoleSingle('communicator', id)}
                            placeholder="Pick the comms lead"
                          />
                        )}
                      />
                    </Field>
                  )}

                  <Field
                    label="Eligible team"
                    hint="100% of the team's share is split evenly across selected members."
                  >
                    <Controller
                      name="assignments"
                      control={control}
                      render={() => (
                        <MultiCombobox
                          options={employeeOptions}
                          values={eligibleIds}
                          onValuesChange={setEligibleTeam}
                          placeholder="+ Add people"
                          searchPlaceholder="Search employees…"
                        />
                      )}
                    />
                  </Field>
                </div>

                <Field label="Notes (optional)">
                  <Textarea
                    rows={3}
                    placeholder="Anything HR or finance should know…"
                    {...register('notes')}
                  />
                </Field>
              </div>

              {/* Right rail: live preview */}
              <aside className="bg-fn-bg-inset px-fn-4 py-fn-5 w-[320px] shrink-0">
                <CommissionPreview
                  ruleVersion={resolvedRule?.version ?? null}
                  poolMode={resolvedRule?.poolMode}
                  poolValue={resolvedRule?.poolValue ?? 0}
                  revenueUsd={revenueUsd}
                  developerSalaryPkr={Number(watch('developerSalaryPkr') ?? 0)}
                  designationAmounts={resolvedRule?.designationAmounts ?? null}
                  rolePercentages={resolvedRule?.rolePercentages ?? {}}
                  assignments={assignments}
                  employees={employees}
                />
              </aside>
            </div>
          )}
        </SheetBody>

        <SheetFooter>
          {step === 1 ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!categoryId || !departmentId || !resolvedRule}
              >
                Continue <ArrowRight className="h-fn-4 w-fn-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              {mode === 'create' && (
                <Button variant="secondary" onClick={saveAsDraft} disabled={isSubmitting}>
                  Save as draft
                </Button>
              )}
              <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
                {mode === 'edit' ? 'Save changes' : 'Create & assign'}
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ───────────────────────── Sub-components ───────────────────────── */

function CategoryPickerCard({
  cat,
  selected,
  onClick,
}: {
  cat: ProjectCategoryPublic;
  selected: boolean;
  onClick: () => void;
}) {
  const hue = colorToHue(cat.color);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-fn-sm p-fn-4 gap-fn-2_5 flex cursor-pointer flex-col items-start border text-left transition-colors',
        selected
          ? 'border-fn-accent bg-fn-accent-soft/30'
          : 'border-fn-border bg-fn-bg-panel hover:border-fn-fg-faint',
      )}
    >
      <span
        aria-hidden
        className="rounded-fn-xs h-fn-7 w-fn-7 inline-flex items-center justify-center"
        style={{
          background: `oklch(0.92 0.07 ${hue})`,
          color: `oklch(0.38 0.16 ${hue})`,
        }}
      >
        <Building2 className="h-fn-4 w-fn-4" />
      </span>
      <div>
        <div className="text-fn-fg font-fn-semibold text-[13.5px]">{cat.name}</div>
        {cat.description && (
          <div className="text-fn-fg-muted mt-fn-0_5 text-[11.5px]">{cat.description}</div>
        )}
      </div>
      <div className="text-fn-fg-faint gap-fn-1_5 flex items-center text-[11px]">
        <Briefcase className="h-fn-3 w-fn-3" /> {cat.projectCount} projects
      </div>
    </button>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="gap-fn-1_5 flex flex-col">
      <label className="text-fn-fg gap-fn-1 font-fn-medium flex items-center text-[12.5px]">
        {label}
        {required && <span className="text-fn-danger">*</span>}
      </label>
      {children}
      {hint && !error && <span className="text-fn-fg-faint text-[11.5px]">{hint}</span>}
      {error && (
        <span className="text-fn-danger gap-fn-1 flex items-center text-[11.5px]">
          <AlertTriangle className="h-fn-3 w-fn-3" /> {error}
        </span>
      )}
    </div>
  );
}

// Display-only FX for the live net-share preview; the real conversion
// happens at run time using the run's pinned rate.
const APPROX_PKR_TO_USD = 0.0035;

function CommissionPreview({
  ruleVersion,
  poolMode,
  poolValue,
  revenueUsd,
  developerSalaryPkr,
  designationAmounts,
  rolePercentages,
  assignments,
  employees,
}: {
  ruleVersion: string | null;
  poolMode?: PoolMode;
  poolValue: number;
  revenueUsd: number;
  developerSalaryPkr: number;
  designationAmounts: Array<{ designation: string; amountUsd: number }> | null;
  rolePercentages: Record<string, number>;
  assignments: Array<{ employeeId: string; roleName: string; percentage: number }>;
  employees: Array<{ id: string; fullName: string }>;
}) {
  const devSalaryUsd = developerSalaryPkr * APPROX_PKR_TO_USD;
  const totalPool = !poolMode
    ? 0
    : poolMode === 'percentage'
      ? (revenueUsd * poolValue) / 100
      : poolMode === 'net_revenue_share'
        ? Math.max(0, revenueUsd - devSalaryUsd)
        : poolMode === 'designation_fixed'
          ? (designationAmounts ?? []).reduce((s, d) => s + d.amountUsd, 0)
          : poolMode === 'fixed'
            ? poolValue
            : 0;

  return (
    <div className="gap-fn-4 flex flex-col">
      <div className="gap-fn-1 font-fn-semibold tracking-fn-uppercase-tight flex items-center text-[11px] uppercase">
        <span className="text-fn-accent-soft-fg">●</span>
        <span className="text-fn-fg-muted">Live commission preview</span>
      </div>

      <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel p-fn-4 gap-fn-2 flex flex-col border">
        <div className="text-fn-fg-faint tracking-fn-uppercase-tight text-[11px] uppercase">
          Revenue
        </div>
        <div
          className="text-fn-fg font-fn-semibold text-[20px] tabular-nums"
          style={{ letterSpacing: '-0.02em' }}
        >
          {formatUsd(revenueUsd)}
        </div>
      </div>

      <div className="rounded-fn-sm border-fn-accent/30 bg-fn-accent-soft/20 p-fn-4 gap-fn-2 flex flex-col border">
        <div className="gap-fn-1_5 flex items-center justify-between text-[11px]">
          <span className="text-fn-fg-muted tracking-fn-uppercase-tight uppercase">
            Commission pool
          </span>
          {poolMode === 'percentage' && <Badge tone="accent">{poolValue}% of revenue</Badge>}
          {poolMode === 'net_revenue_share' && <Badge tone="accent">Net of dev salary</Badge>}
          {poolMode === 'designation_fixed' && <Badge tone="accent">By designation</Badge>}
        </div>
        <div
          className="text-fn-fg font-fn-semibold text-[28px] tabular-nums"
          style={{ letterSpacing: '-0.025em' }}
        >
          {formatUsd(totalPool)}
        </div>
        {poolMode === 'net_revenue_share' && (
          <div className="text-fn-fg-faint text-[10.5px]">
            {formatUsd(revenueUsd)} − {formatUsd(devSalaryUsd)} dev salary (approx; final at run FX)
          </div>
        )}
        {poolMode === 'designation_fixed' && (designationAmounts?.length ?? 0) > 0 && (
          <div className="gap-fn-0_5 mt-fn-1 flex flex-col">
            {(designationAmounts ?? []).map((d) => (
              <div
                key={d.designation}
                className="text-fn-fg-faint flex items-center justify-between text-[10.5px]"
              >
                <span>{d.designation}</span>
                <span className="tabular-nums">{formatUsd(d.amountUsd)}/mo</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pool bar viz */}
      <div className="gap-fn-2 flex flex-col">
        <div className="text-fn-fg-faint tracking-fn-uppercase-tight text-[11px] uppercase">
          Pool split
        </div>
        <PoolBar rolePercentages={rolePercentages} />
      </div>

      {/* Per-role rows */}
      <div className="gap-fn-1_5 flex flex-col">
        {ROLES.map((role) => {
          const sharePct = rolePercentages[role.key] ?? 0;
          const assignedRows = assignments.filter((a) => a.roleName === role.key);
          const shareUsd = (totalPool * sharePct) / 100;
          if (assignedRows.length === 0 && sharePct === 0) return null;
          return (
            <div
              key={role.key}
              className="rounded-fn-xs border-fn-border bg-fn-bg-panel px-fn-3 py-fn-2 gap-fn-1 flex flex-col border"
            >
              <div className="gap-fn-1_5 flex items-center justify-between">
                <span className="text-fn-fg font-fn-medium text-[12.5px]">{role.label}</span>
                <span className="text-fn-fg-faint text-[11.5px] tabular-nums">{sharePct}%</span>
              </div>
              {assignedRows.length === 0 ? (
                <span className="text-fn-fg-faint text-[11.5px]">No one assigned</span>
              ) : (
                <div className="gap-fn-0_5 flex flex-col">
                  {assignedRows.map((a) => {
                    const emp = employees.find((e) => e.id === a.employeeId);
                    const usd = shareUsd * (a.percentage / Math.max(1, sharePct));
                    return (
                      <div
                        key={`${a.employeeId}-${a.roleName}`}
                        className="gap-fn-2 flex items-center justify-between text-[12px]"
                      >
                        <span className="text-fn-fg truncate">{emp?.fullName ?? '—'}</span>
                        <span className="text-fn-fg-muted font-fn-semibold tabular-nums">
                          {formatUsd(usd)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-fn-xs border-fn-border bg-fn-bg-panel px-fn-3 py-fn-2 flex items-center justify-between border">
        <span className="text-fn-fg-muted font-fn-medium text-[11.5px]">Sum of payouts</span>
        <span className="text-fn-fg font-fn-semibold text-[14px] tabular-nums">
          {formatUsd(totalPool)}
        </span>
      </div>

      <p className="text-fn-fg-faint leading-fn-normal text-[11px]">
        Preview only — final amounts are computed at month-end using rules active on the processing
        date{ruleVersion ? ` (currently v${ruleVersion}).` : '.'}
      </p>
    </div>
  );
}

function PoolBar({ rolePercentages }: { rolePercentages: Record<string, number> }) {
  const total = Object.values(rolePercentages).reduce((s, n) => s + n, 0);
  if (total === 0) {
    return <div className="bg-fn-bg-inset rounded-fn-full h-fn-2 w-full" aria-hidden />;
  }
  const segments = ROLES.map((r) => ({
    key: r.key,
    label: r.label,
    pct: rolePercentages[r.key] ?? 0,
  })).filter((s) => s.pct > 0);
  const hueByRole: Record<string, number> = { winner: 280, communicator: 175, eligible_team: 65 };
  return (
    <div className="bg-fn-bg-inset rounded-fn-full h-fn-2 flex w-full overflow-hidden" aria-hidden>
      {segments.map((s) => (
        <span
          key={s.key}
          style={{
            width: `${(s.pct / total) * 100}%`,
            background: `oklch(0.55 0.16 ${hueByRole[s.key] ?? 245})`,
          }}
        />
      ))}
    </div>
  );
}

/* ───────────────────────── Helpers ───────────────────────── */

function defaultsForMode(
  mode: 'create' | 'edit',
  project: ProjectPublic | undefined,
): ProjectCreateInput {
  if (mode === 'edit' && project) {
    return {
      name: project.name,
      clientName: project.clientName,
      categoryId: project.category.id,
      departmentId: project.department.id,
      revenueUsd: project.revenueUsd,
      status: project.status,
      startDate: project.startDate.slice(0, 10),
      expectedCompletionDate: project.expectedCompletionDate?.slice(0, 10) ?? null,
      notes: project.notes ?? undefined,
      hasOverride: project.hasOverride,
      overrideReason: project.overrideReason ?? undefined,
      assignments: project.assignments.map((a) => ({
        employeeId: a.employeeId,
        roleName: a.roleName,
        percentage: a.percentage,
      })),
    };
  }
  return {
    name: '',
    clientName: '',
    categoryId: '',
    departmentId: '',
    revenueUsd: 0,
    status: 'draft',
    startDate: new Date().toISOString().slice(0, 10),
    expectedCompletionDate: null,
    notes: undefined,
    hasOverride: false,
    overrideReason: undefined,
    assignments: [],
  };
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatPool(rule: { poolMode: PoolMode; poolValue: number }): string {
  switch (rule.poolMode) {
    case 'percentage':
      return `${rule.poolValue}%`;
    case 'tiered':
      return 'a tiered %';
    case 'net_revenue_share':
      return 'net of developer salary';
    case 'designation_fixed':
      return 'a per-designation amount';
    default:
      return formatUsd(rule.poolValue);
  }
}

function colorToHue(color: string): number {
  switch (color) {
    case 'violet':
      return 280;
    case 'amber':
      return 65;
    case 'orange':
      return 35;
    case 'red':
      return 22;
    case 'teal':
      return 175;
    case 'slate':
      return 245;
    default: {
      let h = 0;
      for (const c of color) h = (h * 31 + c.charCodeAt(0)) | 0;
      return Math.abs(h) % 360;
    }
  }
}
