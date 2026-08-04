'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CircleDashed,
  CircleDot,
  CircleUserRound,
  Gauge,
  Layers,
  Megaphone,
  Plus,
  Sparkles,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';
import type { CommissionRulePublic, ProjectCategoryPublic } from '@futurenostics/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  useCommissionRule,
  useCreateCommissionRule,
  usePublishCommissionRule,
  useUpdateCommissionRule,
} from '@/lib/queries/commission-rules';
import { useReferences } from '@/lib/queries/employees';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';

/**
 * Commission Rule editor sheet — matches PNG 12.
 *
 * Wide sheet. Left column is a form with four sections (Scope,
 * Commission pool, Pool split, When does it apply). Right column is
 * a Live Preview rail showing the dollars under a $10,000 sample
 * project + a "Compare to current rule" diff when the user is
 * drafting a new version of an existing rule.
 *
 * Versioning policy lives on the server: editing a published rule
 * actually creates a draft of the next version (the server bumps
 * '3.2' → '3.3' on create); publishing archives the prior active
 * row for the same (department, categoryId) slot.
 *
 * For Phase 2 Session 4 the editor supports the percentage pool
 * mode + 3-role split that the design shows. Fixed-amount mode and
 * "add another role" share the UI surface but the math wiring is
 * a single-line branch — both already pass through the API.
 */

const SAMPLE_REVENUE = 10_000;

type EditorMode = 'create' | 'edit';

type PoolMode =
  | 'percentage'
  | 'fixed'
  | 'tiered'
  | 'net_revenue_share'
  | 'designation_fixed'
  | 'role_fixed'
  | 'duration_matrix';

// External-project sub-types (mirror the project form).
const SUB_TYPE_CHOICES: Array<{ value: string; label: string }> = [
  { value: 'full_time', label: 'Full-Time' },
  { value: 'part_time', label: 'Part-Time' },
  { value: 'partial_short', label: 'Partial (≤ 4.5 mo)' },
  { value: 'partial_extended', label: 'Partial (> 4.5 mo)' },
  { value: 'probation_training', label: 'Probation / Training' },
  { value: 'team_lead_owned', label: 'Team Lead-Owned' },
  { value: 'associates', label: 'Associates' },
];

interface BracketRow {
  minUsd: number;
  maxUsd: number | null;
  poolPct: number;
}

const DEFAULT_BRACKETS: BracketRow[] = [
  { minUsd: 0, maxUsd: 10_000, poolPct: 5 },
  { minUsd: 10_000, maxUsd: 50_000, poolPct: 8 },
  { minUsd: 50_000, maxUsd: null, poolPct: 12 },
];

interface DesignationRow {
  designation: string;
  amountUsd: number;
}

// Seeded from the spec's B2B example (ATL $500, SSE $300, …).
const DEFAULT_DESIGNATIONS: DesignationRow[] = [
  { designation: 'ATL', amountUsd: 500 },
  { designation: 'SSE', amountUsd: 300 },
  { designation: 'SE', amountUsd: 200 },
];

interface RoleAmountRow {
  role: string;
  amountUsd: number;
}

// Seeded from the spec's Engineering External example.
const DEFAULT_ROLE_AMOUNTS: RoleAmountRow[] = [
  { role: 'winner', amountUsd: 500 },
  { role: 'communicator', amountUsd: 300 },
  { role: 'team_lead', amountUsd: 100 },
];

interface MatrixRow {
  subType: string;
  role: string;
  amountUsd: number;
  durationMonths: number;
}

// Seeded from the spec's BD External matrix (§5.2.1).
const DEFAULT_MATRIX: MatrixRow[] = [
  { subType: 'full_time', role: 'associate', amountUsd: 50, durationMonths: 6 },
  { subType: 'full_time', role: 'team_lead', amountUsd: 50, durationMonths: 6 },
  { subType: 'full_time', role: 'manager', amountUsd: 30, durationMonths: 6 },
  { subType: 'part_time', role: 'associate', amountUsd: 50, durationMonths: 2 },
  { subType: 'part_time', role: 'team_lead', amountUsd: 50, durationMonths: 2 },
  { subType: 'part_time', role: 'manager', amountUsd: 30, durationMonths: 3 },
  { subType: 'team_lead_owned', role: 'team_lead', amountUsd: 75, durationMonths: 6 },
  { subType: 'team_lead_owned', role: 'manager', amountUsd: 30, durationMonths: 6 },
];

interface RoleSlot {
  key: string;
  label: string;
  icon: React.ReactNode;
}

const DEFAULT_ROLES: RoleSlot[] = [
  { key: 'winner', label: 'Winner', icon: <Trophy className="h-fn-3_5 w-fn-3_5" /> },
  {
    key: 'communicator',
    label: 'Communicator',
    icon: <Megaphone className="h-fn-3_5 w-fn-3_5" />,
  },
  {
    key: 'eligible_team',
    label: 'Eligible team',
    icon: <Users className="h-fn-3_5 w-fn-3_5" />,
  },
];

export interface CommissionRuleEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: EditorMode;
  ruleId?: string | null;
  categories: ProjectCategoryPublic[];
}

export function CommissionRuleEditorSheet({
  open,
  onOpenChange,
  mode,
  ruleId,
  categories,
}: CommissionRuleEditorSheetProps) {
  const ruleQuery = useCommissionRule(mode === 'edit' ? ruleId : null);
  const existing = ruleQuery.data;
  const refs = useReferences();
  const departments = refs.data?.departments ?? [];

  const createMutation = useCreateCommissionRule();
  const updateMutation = useUpdateCommissionRule(ruleId ?? '');
  const publishMutation = usePublishCommissionRule(ruleId ?? '');
  const isSubmitting =
    createMutation.isPending || updateMutation.isPending || publishMutation.isPending;

  /* ---------- Local form state ---------- */
  const [department, setDepartment] = React.useState<string>('');
  const [categoryId, setCategoryId] = React.useState<string>('');
  const [poolMode, setPoolMode] = React.useState<PoolMode>('percentage');
  const [poolValue, setPoolValue] = React.useState<number>(24);
  // Per-person payout guardrails. Empty string = no bound (null).
  const [perPersonFloor, setPerPersonFloor] = React.useState<string>('');
  const [perPersonCap, setPerPersonCap] = React.useState<string>('');
  const [brackets, setBrackets] = React.useState<BracketRow[]>(DEFAULT_BRACKETS);
  const [designations, setDesignations] = React.useState<DesignationRow[]>(DEFAULT_DESIGNATIONS);
  const [roleAmounts, setRoleAmounts] = React.useState<RoleAmountRow[]>(DEFAULT_ROLE_AMOUNTS);
  const [matrix, setMatrix] = React.useState<MatrixRow[]>(DEFAULT_MATRIX);
  const [roles, setRoles] = React.useState<Array<{ key: string; pct: number }>>([
    { key: 'winner', pct: 50 },
    { key: 'communicator', pct: 30 },
    { key: 'eligible_team', pct: 20 },
  ]);
  const [applyMode, setApplyMode] = React.useState<'next-run' | 'specific-date'>('next-run');
  const [specificDate, setSpecificDate] = React.useState<string>('');

  // Re-seed from server data when editing.
  React.useEffect(() => {
    if (mode === 'edit' && existing) {
      setDepartment(existing.department);
      setCategoryId(existing.category.id);
      setPoolMode(existing.poolMode as PoolMode);
      setPoolValue(Number(existing.poolValue));
      setPerPersonFloor(
        existing.perPersonFloorUsd != null ? String(existing.perPersonFloorUsd) : '',
      );
      setPerPersonCap(existing.perPersonCapUsd != null ? String(existing.perPersonCapUsd) : '');
      if (existing.revenueBrackets && existing.revenueBrackets.length > 0) {
        setBrackets(
          existing.revenueBrackets.map((b) => ({
            minUsd: Number(b.minUsd),
            maxUsd: b.maxUsd === null ? null : Number(b.maxUsd),
            poolPct: Number(b.poolPct),
          })),
        );
      }
      if (existing.designationAmounts && existing.designationAmounts.length > 0) {
        setDesignations(
          existing.designationAmounts.map((d) => ({
            designation: d.designation,
            amountUsd: Number(d.amountUsd),
          })),
        );
      }
      if (existing.roleAmounts && existing.roleAmounts.length > 0) {
        setRoleAmounts(
          existing.roleAmounts.map((r) => ({ role: r.role, amountUsd: Number(r.amountUsd) })),
        );
      }
      if (existing.durationMatrix && existing.durationMatrix.length > 0) {
        setMatrix(
          existing.durationMatrix.map((m) => ({
            subType: m.subType,
            role: m.role,
            amountUsd: Number(m.amountUsd),
            durationMonths: Number(m.durationMonths),
          })),
        );
      }
      const next = Object.entries(existing.rolePercentages).map(([key, pct]) => ({
        key,
        pct: Number(pct),
      }));
      if (next.length > 0) setRoles(next);
      if (existing.effectiveFrom) {
        const future = new Date(existing.effectiveFrom) > new Date();
        setApplyMode(future ? 'specific-date' : 'next-run');
        setSpecificDate(existing.effectiveFrom.slice(0, 10));
      }
    }
  }, [mode, existing]);

  /* ---------- Derived ---------- */
  const samplePoolUsd = poolForSample(poolMode, poolValue, brackets, SAMPLE_REVENUE);
  const splitsTotal = roles.reduce((s, r) => s + r.pct, 0);
  // Upwork (net_revenue_share) pays only the assigned winner's %; the
  // remainder is the company's and stays unpaid, so splits need only
  // NOT exceed 100 (not sum to it). Other modes still require 100.
  const splitsValid =
    poolMode === 'net_revenue_share'
      ? splitsTotal <= 100.01 && splitsTotal > 0
      : Math.abs(splitsTotal - 100) <= 0.01;
  const selectedCategory = categories.find((c) => c.id === categoryId);

  // Guardrails: empty / invalid input => no bound (null).
  const floorNum = parseGuard(perPersonFloor);
  const capNum = parseGuard(perPersonCap);
  const guardrailsValid = floorNum == null || capNum == null || capNum >= floorNum;
  const guardPayload = { perPersonFloorUsd: floorNum, perPersonCapUsd: capNum };

  // Tiered validity mirrors the server: contiguous, ascending, one
  // open-ended tail. Only enforced when tiered mode is active.
  const bracketsError = poolMode === 'tiered' ? validateBrackets(brackets) : null;
  const bracketsValid = bracketsError === null;

  // Designation-fixed validity: at least one row, every row named +
  // non-negative, no duplicate designations.
  const designationsError =
    poolMode === 'designation_fixed' ? validateDesignations(designations) : null;
  const designationsValid = designationsError === null;

  // Role-fixed validity: at least one row, every row named + non-negative,
  // no duplicate roles.
  const roleAmountsError = poolMode === 'role_fixed' ? validateRoleAmounts(roleAmounts) : null;
  const roleAmountsValid = roleAmountsError === null;

  // Duration-matrix validity: at least one row, each with a sub-type +
  // role + non-negative amount + duration ≥ 1, no duplicate (type, role).
  const matrixError = poolMode === 'duration_matrix' ? validateMatrix(matrix) : null;
  const matrixValid = matrixError === null;

  // Pool-shape fields for every payload. Only the active mode's ladder
  // is populated; the others are nulled so a mode switch can't leave
  // stale JSON behind. percentage/fixed keep their poolValue; the
  // ladder modes zero it.
  const poolPayload = {
    poolMode,
    poolValue: poolMode === 'percentage' || poolMode === 'fixed' ? poolValue : 0,
    revenueBrackets: poolMode === 'tiered' ? brackets : null,
    designationAmounts: poolMode === 'designation_fixed' ? designations : null,
    roleAmounts: poolMode === 'role_fixed' ? roleAmounts : null,
    durationMatrix: poolMode === 'duration_matrix' ? matrix : null,
  };

  /* ---------- Mutations ---------- */
  async function saveAsDraft() {
    if (!guardrailsValid) {
      toast.error('Per-person cap must be greater than or equal to the floor.');
      return;
    }
    if (poolMode === 'tiered' && !bracketsValid) {
      toast.error(bracketsError ?? 'Fix the revenue brackets first.');
      return;
    }
    if (poolMode === 'designation_fixed' && !designationsValid) {
      toast.error(designationsError ?? 'Fix the designation amounts first.');
      return;
    }
    if (poolMode === 'role_fixed' && !roleAmountsValid) {
      toast.error(roleAmountsError ?? 'Fix the role amounts first.');
      return;
    }
    if (poolMode === 'duration_matrix' && !matrixValid) {
      toast.error(matrixError ?? 'Fix the duration matrix first.');
      return;
    }
    try {
      if (mode === 'edit' && existing) {
        if (existing.status !== 'draft') {
          // Published rules are immutable — create a new draft instead.
          await createNewDraftFromCurrent();
          return;
        }
        await updateMutation.mutateAsync({
          ...poolPayload,
          ...guardPayload,
          rolePercentages: rolesToMap(roles),
          status: 'draft',
        });
        toast.success('Draft updated.');
      } else {
        await createMutation.mutateAsync({
          department,
          categoryId,
          ...poolPayload,
          minProjectRevenueUsd: 0,
          ...guardPayload,
          rolePercentages: rolesToMap(roles),
          status: 'draft',
        });
        toast.success('Draft saved.');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function createNewDraftFromCurrent() {
    if (!existing) return;
    const created = await createMutation.mutateAsync({
      department: existing.department,
      categoryId: existing.category.id,
      ...poolPayload,
      minProjectRevenueUsd: existing.minProjectRevenueUsd,
      ...guardPayload,
      rolePercentages: rolesToMap(roles),
      status: 'draft',
    });
    toast.success(`Draft v${created.version} saved — publish when ready.`);
    onOpenChange(false);
  }

  async function publish() {
    if (!splitsValid) {
      toast.error(`Role percentages must sum to 100 (currently ${splitsTotal.toFixed(2)}).`);
      return;
    }
    if (!guardrailsValid) {
      toast.error('Per-person cap must be greater than or equal to the floor.');
      return;
    }
    if (poolMode === 'tiered' && !bracketsValid) {
      toast.error(bracketsError ?? 'Fix the revenue brackets first.');
      return;
    }
    if (poolMode === 'designation_fixed' && !designationsValid) {
      toast.error(designationsError ?? 'Fix the designation amounts first.');
      return;
    }
    if (poolMode === 'role_fixed' && !roleAmountsValid) {
      toast.error(roleAmountsError ?? 'Fix the role amounts first.');
      return;
    }
    if (poolMode === 'duration_matrix' && !matrixValid) {
      toast.error(matrixError ?? 'Fix the duration matrix first.');
      return;
    }
    try {
      let targetId: string;
      if (mode === 'edit' && existing && existing.status === 'draft') {
        targetId = existing.id;
        await updateMutation.mutateAsync({
          ...poolPayload,
          ...guardPayload,
          rolePercentages: rolesToMap(roles),
        });
      } else if (mode === 'edit' && existing) {
        const created = await createMutation.mutateAsync({
          department: existing.department,
          categoryId: existing.category.id,
          ...poolPayload,
          minProjectRevenueUsd: existing.minProjectRevenueUsd,
          ...guardPayload,
          rolePercentages: rolesToMap(roles),
          status: 'draft',
        });
        targetId = created.id;
      } else {
        const created = await createMutation.mutateAsync({
          department,
          categoryId,
          ...poolPayload,
          minProjectRevenueUsd: 0,
          ...guardPayload,
          rolePercentages: rolesToMap(roles),
          status: 'draft',
        });
        targetId = created.id;
      }
      const effectiveFrom =
        applyMode === 'specific-date' && specificDate
          ? new Date(specificDate).toISOString()
          : undefined;
      // Publish via apiFetch (not the pre-bound publish hook, whose
      // ruleId closure is empty for a freshly-created draft, and not a
      // raw fetch, which would omit the in-memory bearer token → 401).
      const payload = await apiFetch<CommissionRulePublic>(
        `/api/commission-rules/${targetId}/publish`,
        {
          method: 'POST',
          body: JSON.stringify(effectiveFrom ? { effectiveFrom } : {}),
        },
      );
      toast.success(`Published v${payload.version}.`);
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const isPublishedEdit = mode === 'edit' && existing?.status === 'active';
  const headerEyebrow = isPublishedEdit
    ? `Draft new version of v${existing?.version}`
    : mode === 'edit'
      ? `Continue editing v${existing?.version ?? '—'}`
      : 'New commission rule';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="xl">
        <SheetHeader>
          <div className="gap-fn-2 flex items-center">
            <span className="rounded-fn-xs bg-fn-icon-tile text-fn-icon-tile-fg h-fn-7 w-fn-7 inline-flex items-center justify-center">
              <Layers className="h-fn-3_5 w-fn-3_5" />
            </span>
            <div className="flex-1">
              <SheetTitle>{headerEyebrow}</SheetTitle>
              <p className="text-fn-fg-faint mt-fn-0_5 text-[12px]">
                Define how commissions split for one department × category. The live preview shows
                the dollars under a $10,000 project.
              </p>
            </div>
            {isPublishedEdit && (
              <Badge tone="info">Will be saved as v{bumpVersion(existing!.version)}</Badge>
            )}
          </div>
        </SheetHeader>

        <SheetBody className="p-fn-0">
          <div className="flex">
            {/* Left form column */}
            <div className="border-fn-divider gap-fn-4 px-fn-5 py-fn-5 flex flex-1 flex-col border-r">
              {/* Scope */}
              <Section
                icon={<CircleUserRound className="h-fn-4 w-fn-4" />}
                title="Scope"
                hint="Department + category combination this rule applies to."
              >
                <div className="gap-fn-3 grid grid-cols-1 sm:grid-cols-2">
                  <Field label="Department" required>
                    <Select
                      value={department}
                      onValueChange={setDepartment}
                      disabled={mode === 'edit'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pick a department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="*">Org-wide fallback</SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.slug}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Project category" required>
                    <Select
                      value={categoryId}
                      onValueChange={setCategoryId}
                      disabled={mode === 'edit'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pick a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories
                          .filter((c) => !c.archived)
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                              <span className="text-fn-fg-faint ml-fn-2 text-[11px]">
                                {c.projectCount} projects
                              </span>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                {department && selectedCategory && (
                  <p className="text-fn-fg-faint text-[11.5px]">
                    {departmentLabel(department)} × {selectedCategory.name} — rules elsewhere
                    average mid-range.
                  </p>
                )}
              </Section>

              {/* Commission pool */}
              <Section
                icon={<CircleDot className="h-fn-4 w-fn-4" />}
                title="Commission pool"
                hint="What % of project revenue flows into the commission pool? Or set a fixed USD amount that applies regardless of revenue."
                right={
                  <ModeToggle
                    value={poolMode}
                    onChange={setPoolMode}
                    options={[
                      { value: 'percentage', label: 'Percentage' },
                      { value: 'fixed', label: 'Fixed amount' },
                      { value: 'tiered', label: 'Tiered' },
                      { value: 'net_revenue_share', label: 'Net share (Upwork)' },
                      { value: 'designation_fixed', label: 'By designation (B2B)' },
                      { value: 'role_fixed', label: 'By role (Eng External)' },
                      { value: 'duration_matrix', label: 'Duration matrix (BD External)' },
                    ]}
                  />
                }
              >
                {poolMode === 'tiered' ? (
                  <BracketEditor
                    brackets={brackets}
                    onChange={setBrackets}
                    error={bracketsError}
                    samplePoolUsd={samplePoolUsd}
                  />
                ) : poolMode === 'designation_fixed' ? (
                  <DesignationEditor
                    rows={designations}
                    onChange={setDesignations}
                    error={designationsError}
                  />
                ) : poolMode === 'role_fixed' ? (
                  <RoleAmountEditor
                    rows={roleAmounts}
                    onChange={setRoleAmounts}
                    error={roleAmountsError}
                  />
                ) : poolMode === 'duration_matrix' ? (
                  <MatrixEditor rows={matrix} onChange={setMatrix} error={matrixError} />
                ) : poolMode === 'net_revenue_share' ? (
                  <div className="gap-fn-2 rounded-fn-sm border-fn-border bg-fn-bg-inset/40 p-fn-4 flex flex-col border">
                    <p className="text-fn-fg text-[13px]">
                      Pool ={' '}
                      <span className="font-fn-semibold">project revenue − developer salary</span>{' '}
                      (salary converted from PKR at the run&rsquo;s FX rate). The winner earns their
                      role % of that net; the remainder is the company&rsquo;s and isn&rsquo;t paid
                      out.
                    </p>
                    <p className="text-fn-fg-faint text-[11.5px]">
                      Set the winner&rsquo;s share below (e.g. 20%). Enter each project&rsquo;s
                      developer salary on the project form.
                    </p>
                  </div>
                ) : (
                  <div className="gap-fn-3 flex flex-col">
                    <div className="gap-fn-3 flex items-center">
                      <span
                        className="text-fn-fg font-fn-semibold leading-fn-unit text-[44px] tabular-nums"
                        style={{ letterSpacing: '-0.03em' }}
                      >
                        {poolMode === 'percentage'
                          ? `${poolValue}%`
                          : `$${Number(poolValue).toLocaleString()}`}
                      </span>
                      {poolMode === 'percentage' && (
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={poolValue}
                          onChange={(e) => setPoolValue(Number(e.target.value))}
                          className="accent-fn-accent flex-1"
                        />
                      )}
                      {poolMode === 'fixed' && (
                        <Input
                          type="number"
                          min={0}
                          step={50}
                          value={poolValue}
                          onChange={(e) => setPoolValue(Number(e.target.value))}
                          className="max-w-[200px]"
                        />
                      )}
                    </div>
                    <p className="text-fn-fg-faint text-[11.5px]">
                      {poolMode === 'percentage'
                        ? `On a $10,000 project that's ${formatUsd(samplePoolUsd)} flowing into the pool before role splits.`
                        : `Each project under this rule pays out exactly ${formatUsd(samplePoolUsd)} into the commission pool.`}
                    </p>
                  </div>
                )}
              </Section>

              {/* Payout guardrails */}
              <Section
                icon={<Gauge className="h-fn-4 w-fn-4" />}
                title="Payout guardrails"
                hint="Optional per-person limits applied to each monthly commission share before manual adjustments. Leave blank for no limit."
              >
                <div className="gap-fn-3 grid grid-cols-1 sm:grid-cols-2">
                  <Field label="Minimum per person (USD)">
                    <Input
                      type="number"
                      min={0}
                      step={50}
                      inputMode="decimal"
                      placeholder="No minimum"
                      value={perPersonFloor}
                      onChange={(e) => setPerPersonFloor(e.target.value)}
                    />
                  </Field>
                  <Field label="Maximum per person (USD)">
                    <Input
                      type="number"
                      min={0}
                      step={50}
                      inputMode="decimal"
                      placeholder="No cap"
                      value={perPersonCap}
                      onChange={(e) => setPerPersonCap(e.target.value)}
                    />
                  </Field>
                </div>
                {!guardrailsValid && (
                  <div className="rounded-fn-xs border-fn-warning/30 bg-fn-warning-soft/40 text-fn-warning-soft-fg px-fn-3 py-fn-2 gap-fn-2 flex items-center border text-[12px]">
                    <AlertCircle className="h-fn-3_5 w-fn-3_5" />
                    <span className="font-fn-medium">
                      The cap must be greater than or equal to the floor.
                    </span>
                  </div>
                )}
                <p className="text-fn-fg-faint text-[11.5px]">
                  The floor only lifts shares that already earned something this month; it never
                  pays a non-participant. The cap trims any share above the ceiling.
                </p>
              </Section>

              {/* Pool split */}
              <Section
                icon={<Users className="h-fn-4 w-fn-4" />}
                title="Pool split"
                hint="How is the pool divided across the people credited on a project?"
              >
                <div className="gap-fn-3 flex flex-col">
                  {roles.map((row, idx) => {
                    const slot = DEFAULT_ROLES.find((r) => r.key === row.key) ?? {
                      key: row.key,
                      label: humanizeKey(row.key),
                      icon: <CircleDot className="h-fn-3_5 w-fn-3_5" />,
                    };
                    return (
                      <div
                        key={row.key}
                        className="border-fn-border rounded-fn-xs px-fn-3 py-fn-2_5 gap-fn-3 flex items-center border"
                      >
                        <span
                          aria-hidden
                          className="rounded-fn-xs bg-fn-icon-tile text-fn-icon-tile-fg h-fn-7 w-fn-7 inline-flex items-center justify-center"
                        >
                          {slot.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-fn-fg font-fn-medium text-[13px]">{slot.label}</div>
                          <div className="text-fn-fg-faint text-[11px]">
                            {slot.key === 'eligible_team'
                              ? 'Sub-divides equally across the project’s eligible team members.'
                              : 'One person per project per rule.'}
                          </div>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={row.pct}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setRoles((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, pct: v } : r)),
                            );
                          }}
                          className="accent-fn-accent w-[140px]"
                        />
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={row.pct}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setRoles((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, pct: v } : r)),
                            );
                          }}
                          className="w-[64px] text-right tabular-nums"
                        />
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      const newKey = `role_${roles.length + 1}`;
                      setRoles((prev) => [...prev, { key: newKey, pct: 0 }]);
                    }}
                    className="border-fn-border-strong text-fn-fg-muted hover:bg-fn-bg-inset rounded-fn-xs px-fn-3 py-fn-2 gap-fn-1 inline-flex cursor-pointer items-center justify-center border border-dashed text-[12.5px]"
                  >
                    <Plus className="h-fn-3_5 w-fn-3_5" /> Add another role
                  </button>

                  {/* Sum validation strip */}
                  <div
                    className={cn(
                      'rounded-fn-xs px-fn-3 py-fn-2 gap-fn-2 flex items-center border text-[12px]',
                      splitsValid
                        ? 'border-fn-success/30 bg-fn-success-soft/40 text-fn-success-soft-fg'
                        : 'border-fn-warning/30 bg-fn-warning-soft/40 text-fn-warning-soft-fg',
                    )}
                  >
                    {splitsValid ? (
                      <Sparkles className="h-fn-3_5 w-fn-3_5" />
                    ) : (
                      <AlertCircle className="h-fn-3_5 w-fn-3_5" />
                    )}
                    <span className="font-fn-medium">
                      Splits {splitsValid ? 'add up to 100%' : `currently sum to ${splitsTotal}%`}
                    </span>
                    <span className="text-fn-fg-faint ml-auto tabular-nums">
                      {roles.map((r) => r.pct).join(' + ')} = {splitsTotal}
                    </span>
                  </div>
                </div>
              </Section>

              {/* When does it apply */}
              <Section
                icon={<CalendarDays className="h-fn-4 w-fn-4" />}
                title="When does it apply?"
                hint="Historical runs always use the rule that was active on their processing date — old months won't change."
              >
                <div className="gap-fn-3 grid grid-cols-1 sm:grid-cols-2">
                  <RadioCard
                    icon={<CircleDashed className="h-fn-4 w-fn-4" />}
                    label="Next processing run"
                    sub="First day of next month"
                    checked={applyMode === 'next-run'}
                    onSelect={() => setApplyMode('next-run')}
                  />
                  <RadioCard
                    icon={<CalendarDays className="h-fn-4 w-fn-4" />}
                    label="Specific date"
                    sub="Pick a future date"
                    checked={applyMode === 'specific-date'}
                    onSelect={() => setApplyMode('specific-date')}
                  >
                    {applyMode === 'specific-date' && (
                      <Input
                        type="date"
                        value={specificDate}
                        onChange={(e) => setSpecificDate(e.target.value)}
                        className="mt-fn-2 w-full"
                      />
                    )}
                  </RadioCard>
                </div>
              </Section>
            </div>

            {/* Right preview rail */}
            <aside className="bg-fn-bg-inset px-fn-4 py-fn-5 gap-fn-4 flex w-[340px] shrink-0 flex-col">
              <PreviewPanel
                poolMode={poolMode}
                poolValue={poolValue}
                brackets={brackets}
                sampleRevenue={SAMPLE_REVENUE}
                roles={roles}
              />
              {existing && existing.status === 'active' && (
                <CompareToCurrentPanel
                  current={existing}
                  next={{ poolMode, poolValue, brackets, roles: rolesToMap(roles) }}
                />
              )}
            </aside>
          </div>
        </SheetBody>

        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={saveAsDraft} disabled={isSubmitting}>
            Save as draft
          </Button>
          <Button
            onClick={publish}
            disabled={
              isSubmitting ||
              !splitsValid ||
              !department ||
              !categoryId ||
              (poolMode === 'tiered' && !bracketsValid)
            }
          >
            {isPublishedEdit
              ? `Publish as v${bumpVersion(existing!.version)}`
              : mode === 'edit'
                ? `Publish v${existing?.version ?? '—'}`
                : 'Publish v1.0'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ───────────────────────── Sub-components ───────────────────────── */

function Section({
  icon,
  title,
  hint,
  right,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel overflow-hidden border">
      <div className="border-fn-divider gap-fn-2 px-fn-4 py-fn-3 flex items-center justify-between border-b">
        <div className="gap-fn-2 flex items-center">
          <span
            aria-hidden
            className="rounded-fn-xs bg-fn-icon-tile text-fn-icon-tile-fg h-fn-6 w-fn-6 inline-flex items-center justify-center"
          >
            {icon}
          </span>
          <h3 className="text-fn-fg font-fn-semibold text-[13.5px]">{title}</h3>
        </div>
        {right}
      </div>
      <div className="px-fn-4 py-fn-4 gap-fn-3 flex flex-col">
        {hint && <p className="text-fn-fg-muted text-[12px]">{hint}</p>}
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="gap-fn-1_5 flex flex-col">
      <label className="text-fn-fg gap-fn-1 font-fn-medium flex items-center text-[12.5px]">
        {label}
        {required && <span className="text-fn-danger">*</span>}
      </label>
      {children}
    </div>
  );
}

function ModeToggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="border-fn-border-strong bg-fn-bg-subtle rounded-fn-xs p-fn-0_5 inline-flex border">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-fn-xs px-fn-2_5 py-fn-1 font-fn-semibold cursor-pointer text-[11.5px] transition-colors',
              active
                ? 'bg-fn-bg-panel text-fn-fg shadow-fn-xs'
                : 'text-fn-fg-muted hover:text-fn-fg',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function RadioCard({
  icon,
  label,
  sub,
  checked,
  onSelect,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  checked: boolean;
  onSelect: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'rounded-fn-sm px-fn-3 py-fn-3 gap-fn-2 flex cursor-pointer flex-col items-start border text-left transition-colors',
        checked
          ? 'border-fn-accent bg-fn-accent-soft/30'
          : 'border-fn-border bg-fn-bg-panel hover:border-fn-fg-faint',
      )}
    >
      <div className="gap-fn-2 flex items-center">
        <span
          aria-hidden
          className={cn(
            'rounded-fn-full h-fn-3 w-fn-3 inline-flex items-center justify-center border',
            checked ? 'border-fn-accent bg-fn-accent' : 'border-fn-border-strong',
          )}
        >
          {checked && <span className="rounded-fn-full bg-fn-bg-panel h-fn-1 w-fn-1" />}
        </span>
        <span className="text-fn-fg-muted">{icon}</span>
        <span className="text-fn-fg font-fn-semibold text-[13px]">{label}</span>
      </div>
      {sub && <span className="text-fn-fg-faint text-[11.5px]">{sub}</span>}
      {children}
    </button>
  );
}

function PreviewPanel({
  poolMode,
  poolValue,
  brackets,
  sampleRevenue,
  roles,
}: {
  poolMode: PoolMode;
  poolValue: number;
  brackets: BracketRow[];
  sampleRevenue: number;
  roles: Array<{ key: string; pct: number }>;
}) {
  const pool = poolForSample(poolMode, poolValue, brackets, sampleRevenue);
  const poolModeLabel =
    poolMode === 'percentage'
      ? `${poolValue}%`
      : poolMode === 'tiered'
        ? 'Tiered'
        : poolMode === 'net_revenue_share'
          ? 'Net share'
          : poolMode === 'designation_fixed'
            ? 'By designation'
            : poolMode === 'role_fixed'
              ? 'By role'
              : poolMode === 'duration_matrix'
                ? 'Duration matrix'
                : 'Fixed';
  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel overflow-hidden border">
      <div className="border-fn-divider px-fn-4 py-fn-3 gap-fn-2 flex items-center justify-between border-b">
        <div className="gap-fn-1 font-fn-semibold tracking-fn-uppercase-tight flex items-center text-[11px] uppercase">
          <span className="text-fn-accent-soft-fg">●</span>
          <span className="text-fn-fg-muted">Live preview</span>
        </div>
        <Badge tone="info">Auto-update</Badge>
      </div>
      <div className="px-fn-4 py-fn-4 gap-fn-3 flex flex-col">
        <p className="text-fn-fg-faint leading-fn-normal text-[11px]">
          How a sample <span className="text-fn-fg font-fn-medium">$10,000</span> project would pay
          out under this rule.
        </p>

        <div className="rounded-fn-xs border-fn-accent/30 bg-fn-accent-soft/30 p-fn-3 gap-fn-1 flex flex-col border">
          <span className="text-fn-fg-faint tracking-fn-uppercase-tight text-[10.5px] uppercase">
            Commission pool
          </span>
          <span
            className="text-fn-fg font-fn-semibold leading-fn-unit text-[28px] tabular-nums"
            style={{ letterSpacing: '-0.025em' }}
          >
            {formatUsd(pool)}
          </span>
          <span className="text-fn-fg-faint text-[11px]">
            {poolModeLabel} · split across {roles.length} role{' '}
            {roles.length === 1 ? 'group' : 'groups'} below
          </span>
        </div>

        <div className="gap-fn-1_5 flex flex-col">
          {roles.map((r) => {
            const shareUsd = (pool * r.pct) / 100;
            return (
              <div
                key={r.key}
                className="border-fn-divider rounded-fn-xs bg-fn-bg-subtle/50 px-fn-3 py-fn-2 gap-fn-2 flex items-center border"
              >
                <span className="text-fn-fg font-fn-medium flex-1 text-[12.5px]">
                  {humanizeKey(r.key)}
                </span>
                <Badge tone="default">{r.pct}%</Badge>
                <span className="text-fn-fg font-fn-semibold text-[13px] tabular-nums">
                  {formatUsd(shareUsd)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="border-fn-divider pt-fn-2 flex items-center justify-between border-t">
          <span className="text-fn-fg-muted font-fn-medium text-[11.5px]">Sum of payouts</span>
          <span className="text-fn-fg font-fn-semibold text-[14px] tabular-nums">
            {formatUsd(pool)}
          </span>
        </div>
      </div>
    </div>
  );
}

function CompareToCurrentPanel({
  current,
  next,
}: {
  current: CommissionRulePublic;
  next: {
    poolMode: PoolMode;
    poolValue: number;
    brackets: BracketRow[];
    roles: Record<string, number>;
  };
}) {
  const curBrackets = (current.revenueBrackets ?? []).map((b) => ({
    minUsd: Number(b.minUsd),
    maxUsd: b.maxUsd === null ? null : Number(b.maxUsd),
    poolPct: Number(b.poolPct),
  }));
  const curPool = poolForSample(
    current.poolMode as PoolMode,
    Number(current.poolValue),
    curBrackets,
    SAMPLE_REVENUE,
  );
  const nextPool = poolForSample(next.poolMode, next.poolValue, next.brackets, SAMPLE_REVENUE);

  const allRoles = new Set([...Object.keys(current.rolePercentages), ...Object.keys(next.roles)]);

  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel overflow-hidden border">
      <div className="border-fn-divider px-fn-4 py-fn-3 border-b">
        <h3 className="text-fn-fg font-fn-semibold text-[13px]">Compare to current rule</h3>
        <p className="text-fn-fg-faint mt-fn-0_5 text-[11px]">v{current.version} → next version</p>
      </div>
      <div className="px-fn-4 py-fn-3 gap-fn-2 flex flex-col text-[12px]">
        <CompareRow
          label="Pool"
          left={formatUsd(curPool)}
          right={formatUsd(nextPool)}
          delta={nextPool - curPool}
        />
        {[...allRoles].map((role) => {
          const curPct = Number(current.rolePercentages[role] ?? 0);
          const nextPct = Number(next.roles[role] ?? 0);
          return (
            <CompareRow
              key={role}
              label={humanizeKey(role)}
              left={`${curPct}%`}
              right={`${nextPct}%`}
              delta={nextPct - curPct}
              formatDelta={(d) => `${d > 0 ? '+' : ''}${d}pp`}
            />
          );
        })}
      </div>
    </div>
  );
}

function CompareRow({
  label,
  left,
  right,
  delta,
  formatDelta,
}: {
  label: string;
  left: string;
  right: string;
  delta: number;
  formatDelta?: (delta: number) => string;
}) {
  const positive = delta > 0;
  const neutral = Math.abs(delta) < 0.005;
  return (
    <div className="gap-fn-2 flex items-center">
      <span className="text-fn-fg-muted flex-1 text-[11.5px]">{label}</span>
      <span className="text-fn-fg-faint text-[11.5px] tabular-nums">{left}</span>
      <span className="text-fn-fg-faint">→</span>
      <span className="text-fn-fg font-fn-semibold text-[12px] tabular-nums">{right}</span>
      <span
        className={cn(
          'rounded-fn-xs px-fn-1 gap-fn-0_5 font-fn-semibold inline-flex items-center text-[10.5px]',
          neutral
            ? 'text-fn-fg-faint'
            : positive
              ? 'text-fn-success-soft-fg bg-fn-success-soft/50'
              : 'text-fn-danger-soft-fg bg-fn-danger-soft/50',
        )}
      >
        {!neutral &&
          (positive ? (
            <ArrowUpRight className="h-fn-2_5 w-fn-2_5" />
          ) : (
            <ArrowDownRight className="h-fn-2_5 w-fn-2_5" />
          ))}
        {formatDelta ? formatDelta(delta) : `${delta > 0 ? '+' : ''}${formatUsd(delta)}`}
      </span>
    </div>
  );
}

function BracketEditor({
  brackets,
  onChange,
  error,
  samplePoolUsd,
}: {
  brackets: BracketRow[];
  onChange: (next: BracketRow[]) => void;
  error: string | null;
  samplePoolUsd: number;
}) {
  function commit(rows: BracketRow[]) {
    onChange(normalizeBrackets(rows));
  }
  function setMax(idx: number, value: number) {
    commit(brackets.map((b, i) => (i === idx ? { ...b, maxUsd: value } : b)));
  }
  function setPct(idx: number, value: number) {
    commit(brackets.map((b, i) => (i === idx ? { ...b, poolPct: value } : b)));
  }
  function addBracket() {
    const tail = brackets[brackets.length - 1]!;
    // Turn the open tail into a bounded row and append a fresh open tail.
    const boundary = tail.minUsd + 10_000;
    const bounded: BracketRow = { minUsd: tail.minUsd, maxUsd: boundary, poolPct: tail.poolPct };
    const newTail: BracketRow = { minUsd: boundary, maxUsd: null, poolPct: tail.poolPct };
    commit([...brackets.slice(0, -1), bounded, newTail]);
  }
  function removeBracket(idx: number) {
    if (brackets.length <= 1) return;
    commit(brackets.filter((_, i) => i !== idx));
  }

  return (
    <div className="gap-fn-3 flex flex-col">
      <p className="text-fn-fg-muted text-[12px]">
        The pool percentage scales with project revenue. Brackets are contiguous — each starts where
        the previous ends; the last is open-ended.
      </p>
      <div className="gap-fn-2 flex flex-col">
        {brackets.map((b, idx) => {
          const isLast = idx === brackets.length - 1;
          return (
            <div
              key={idx}
              className="border-fn-border rounded-fn-xs px-fn-3 py-fn-2_5 gap-fn-2 flex items-center border"
            >
              <span className="text-fn-fg-faint w-[72px] shrink-0 text-[11.5px] tabular-nums">
                {formatUsd(b.minUsd)}
              </span>
              <span className="text-fn-fg-faint text-[11px]">to</span>
              {isLast ? (
                <span className="text-fn-fg-muted font-fn-medium flex-1 text-[12px]">and up</span>
              ) : (
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  value={b.maxUsd ?? 0}
                  onChange={(e) => setMax(idx, Number(e.target.value))}
                  className="h-fn-7 w-[110px] text-right tabular-nums"
                />
              )}
              <div className="gap-fn-1 flex items-center">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={b.poolPct}
                  onChange={(e) => setPct(idx, Number(e.target.value))}
                  className="h-fn-7 w-[64px] text-right tabular-nums"
                />
                <span className="text-fn-fg-faint text-[12px]">%</span>
              </div>
              <button
                type="button"
                onClick={() => removeBracket(idx)}
                disabled={brackets.length <= 1}
                aria-label="Remove bracket"
                className="text-fn-fg-faint hover:text-fn-danger ml-auto inline-flex cursor-pointer items-center disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-fn-3_5 w-fn-3_5" />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addBracket}
        className="border-fn-border-strong text-fn-fg-muted hover:bg-fn-bg-inset rounded-fn-xs px-fn-3 py-fn-2 gap-fn-1 inline-flex cursor-pointer items-center justify-center border border-dashed text-[12.5px]"
      >
        <Plus className="h-fn-3_5 w-fn-3_5" /> Add a bracket
      </button>

      {error ? (
        <div className="rounded-fn-xs border-fn-warning/30 bg-fn-warning-soft/40 text-fn-warning-soft-fg px-fn-3 py-fn-2 gap-fn-2 flex items-center border text-[12px]">
          <AlertCircle className="h-fn-3_5 w-fn-3_5" />
          <span className="font-fn-medium">{error}</span>
        </div>
      ) : (
        <p className="text-fn-fg-faint text-[11.5px]">
          A $10,000 project lands in the{' '}
          <span className="text-fn-fg font-fn-medium">{formatUsd(samplePoolUsd)}</span> pool before
          role splits.
        </p>
      )}
    </div>
  );
}

/* ───────────────────────── Helpers ───────────────────────── */

/** Parse a guardrail input: blank / non-finite / negative → null (no bound). */
function parseGuard(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Rebuild contiguous mins (0, then previous max) and force an open tail. */
function normalizeBrackets(rows: BracketRow[]): BracketRow[] {
  return rows.map((r, i) => ({
    minUsd: i === 0 ? 0 : (rows[i - 1]!.maxUsd ?? 0),
    maxUsd: i === rows.length - 1 ? null : r.maxUsd,
    poolPct: r.poolPct,
  }));
}

/** Mirror of the server bracket validation. Returns an error string or null. */
function validateBrackets(rows: BracketRow[]): string | null {
  if (rows.length === 0) return 'Add at least one bracket.';
  for (let i = 0; i < rows.length; i += 1) {
    const b = rows[i]!;
    const isLast = i === rows.length - 1;
    if (b.poolPct < 0 || b.poolPct > 100)
      return 'Each bracket percentage must be between 0 and 100.';
    if (isLast) {
      if (b.maxUsd !== null) return 'The final bracket must be open-ended.';
    } else {
      if (b.maxUsd === null) return 'Only the final bracket may be open-ended.';
      if (b.maxUsd <= b.minUsd) return 'Each bracket max must exceed its min.';
    }
  }
  return null;
}

/** Mirror of the server designation-amount validation. */
function validateDesignations(rows: DesignationRow[]): string | null {
  if (rows.length === 0) return 'Add at least one designation.';
  const seen = new Set<string>();
  for (const r of rows) {
    const name = r.designation.trim();
    if (name === '') return 'Every row needs a designation name.';
    if (r.amountUsd < 0) return 'Amounts must be zero or more.';
    if (seen.has(name)) return `Duplicate designation: ${name}`;
    seen.add(name);
  }
  return null;
}

/** Mirror of the server role-amount validation. */
function validateRoleAmounts(rows: RoleAmountRow[]): string | null {
  if (rows.length === 0) return 'Add at least one role.';
  const seen = new Set<string>();
  for (const r of rows) {
    const name = r.role.trim();
    if (name === '') return 'Every row needs a role name.';
    if (r.amountUsd < 0) return 'Amounts must be zero or more.';
    if (seen.has(name)) return `Duplicate role: ${name}`;
    seen.add(name);
  }
  return null;
}

/** Mirror of the server duration-matrix validation. */
function validateMatrix(rows: MatrixRow[]): string | null {
  if (rows.length === 0) return 'Add at least one matrix row.';
  const seen = new Set<string>();
  for (const r of rows) {
    const role = r.role.trim();
    if (!r.subType) return 'Every row needs a sub-type.';
    if (role === '') return 'Every row needs a role name.';
    if (r.amountUsd < 0) return 'Amounts must be zero or more.';
    if (!Number.isInteger(r.durationMonths) || r.durationMonths < 1)
      return 'Duration must be a whole number of months (≥ 1).';
    const key = `${r.subType}|${role}`;
    if (seen.has(key)) return `Duplicate row: ${r.subType} × ${role}`;
    seen.add(key);
  }
  return null;
}

/** Sample-pool helper shared by the pool section, preview, and compare panels. */
function poolForSample(
  poolMode: PoolMode,
  poolValue: number,
  brackets: BracketRow[],
  revenue: number,
): number {
  if (poolMode === 'fixed') return poolValue;
  if (poolMode === 'tiered') {
    for (const b of brackets) {
      const underMax = b.maxUsd === null || revenue < b.maxUsd;
      if (revenue >= b.minUsd && underMax) return (revenue * b.poolPct) / 100;
    }
    return 0;
  }
  // net_revenue_share depends on per-project developer salary and
  // designation_fixed has no shared pool — neither has a meaningful
  // revenue-only sample here (0 keeps the shared preview harmless).
  if (
    poolMode === 'net_revenue_share' ||
    poolMode === 'designation_fixed' ||
    poolMode === 'role_fixed' ||
    poolMode === 'duration_matrix'
  )
    return 0;
  return (revenue * poolValue) / 100;
}

function DesignationEditor({
  rows,
  onChange,
  error,
}: {
  rows: DesignationRow[];
  onChange: (next: DesignationRow[]) => void;
  error: string | null;
}) {
  function setName(idx: number, value: string) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, designation: value } : r)));
  }
  function setAmount(idx: number, value: number) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, amountUsd: value } : r)));
  }
  function addRow() {
    onChange([...rows, { designation: '', amountUsd: 0 }]);
  }
  function removeRow(idx: number) {
    if (rows.length <= 1) return;
    onChange(rows.filter((_, i) => i !== idx));
  }

  return (
    <div className="gap-fn-3 flex flex-col">
      <p className="text-fn-fg-muted text-[12px]">
        Each assignee earns the fixed monthly amount matching their designation, prorated by how
        much of the month they were active.
      </p>
      <div className="gap-fn-2 flex flex-col">
        {rows.map((r, idx) => (
          <div
            key={idx}
            className="border-fn-border rounded-fn-xs px-fn-3 py-fn-2_5 gap-fn-2 flex items-center border"
          >
            <Input
              value={r.designation}
              placeholder="Designation (e.g. ATL)"
              onChange={(e) => setName(idx, e.target.value)}
              className="h-fn-7 flex-1"
            />
            <span className="text-fn-fg-faint text-[12px]">$</span>
            <Input
              type="number"
              min={0}
              step={50}
              value={r.amountUsd}
              onChange={(e) => setAmount(idx, Number(e.target.value))}
              className="h-fn-7 w-[110px] text-right tabular-nums"
            />
            <span className="text-fn-fg-faint text-[11px]">/mo</span>
            <button
              type="button"
              onClick={() => removeRow(idx)}
              disabled={rows.length <= 1}
              aria-label="Remove designation"
              className="text-fn-fg-faint hover:text-fn-danger inline-flex cursor-pointer items-center disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-fn-3_5 w-fn-3_5" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="border-fn-border-strong text-fn-fg-muted hover:bg-fn-bg-inset rounded-fn-xs px-fn-3 py-fn-2 gap-fn-1 inline-flex cursor-pointer items-center justify-center border border-dashed text-[12.5px]"
      >
        <Plus className="h-fn-3_5 w-fn-3_5" /> Add a designation
      </button>

      {error && (
        <div className="rounded-fn-xs border-fn-warning/30 bg-fn-warning-soft/40 text-fn-warning-soft-fg px-fn-3 py-fn-2 gap-fn-2 flex items-center border text-[12px]">
          <AlertCircle className="h-fn-3_5 w-fn-3_5" />
          <span className="font-fn-medium">{error}</span>
        </div>
      )}
    </div>
  );
}

function RoleAmountEditor({
  rows,
  onChange,
  error,
}: {
  rows: RoleAmountRow[];
  onChange: (next: RoleAmountRow[]) => void;
  error: string | null;
}) {
  function setName(idx: number, value: string) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, role: value } : r)));
  }
  function setAmount(idx: number, value: number) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, amountUsd: value } : r)));
  }
  function addRow() {
    onChange([...rows, { role: '', amountUsd: 0 }]);
  }
  function removeRow(idx: number) {
    if (rows.length <= 1) return;
    onChange(rows.filter((_, i) => i !== idx));
  }

  return (
    <div className="gap-fn-3 flex flex-col">
      <p className="text-fn-fg-muted text-[12px]">
        Each assignee earns the fixed monthly amount matching their role (e.g. winner $500 /
        communicator $300 / team_lead $100), prorated by month overlap.
      </p>
      <div className="gap-fn-2 flex flex-col">
        {rows.map((r, idx) => (
          <div
            key={idx}
            className="border-fn-border rounded-fn-xs px-fn-3 py-fn-2_5 gap-fn-2 flex items-center border"
          >
            <Input
              value={r.role}
              placeholder="Role (e.g. winner)"
              onChange={(e) => setName(idx, e.target.value)}
              className="h-fn-7 flex-1"
            />
            <span className="text-fn-fg-faint text-[12px]">$</span>
            <Input
              type="number"
              min={0}
              step={50}
              value={r.amountUsd}
              onChange={(e) => setAmount(idx, Number(e.target.value))}
              className="h-fn-7 w-[110px] text-right tabular-nums"
            />
            <span className="text-fn-fg-faint text-[11px]">/mo</span>
            <button
              type="button"
              onClick={() => removeRow(idx)}
              disabled={rows.length <= 1}
              aria-label="Remove role"
              className="text-fn-fg-faint hover:text-fn-danger inline-flex cursor-pointer items-center disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-fn-3_5 w-fn-3_5" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="border-fn-border-strong text-fn-fg-muted hover:bg-fn-bg-inset rounded-fn-xs px-fn-3 py-fn-2 gap-fn-1 inline-flex cursor-pointer items-center justify-center border border-dashed text-[12.5px]"
      >
        <Plus className="h-fn-3_5 w-fn-3_5" /> Add a role
      </button>

      {error && (
        <div className="rounded-fn-xs border-fn-warning/30 bg-fn-warning-soft/40 text-fn-warning-soft-fg px-fn-3 py-fn-2 gap-fn-2 flex items-center border text-[12px]">
          <AlertCircle className="h-fn-3_5 w-fn-3_5" />
          <span className="font-fn-medium">{error}</span>
        </div>
      )}
    </div>
  );
}

function MatrixEditor({
  rows,
  onChange,
  error,
}: {
  rows: MatrixRow[];
  onChange: (next: MatrixRow[]) => void;
  error: string | null;
}) {
  function patch(idx: number, patch: Partial<MatrixRow>) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function addRow() {
    onChange([...rows, { subType: 'full_time', role: '', amountUsd: 0, durationMonths: 6 }]);
  }
  function removeRow(idx: number) {
    if (rows.length <= 1) return;
    onChange(rows.filter((_, i) => i !== idx));
  }

  return (
    <div className="gap-fn-3 flex flex-col">
      <p className="text-fn-fg-muted text-[12px]">
        Each row pays the amount per month to assignees of that role on projects of that sub-type,
        for the first N months from the project start, then auto-stops.
      </p>
      <div className="gap-fn-2 flex flex-col">
        {rows.map((r, idx) => (
          <div
            key={idx}
            className="border-fn-border rounded-fn-xs px-fn-3 py-fn-2_5 gap-fn-2 flex items-center border"
          >
            <Select value={r.subType} onValueChange={(v) => patch(idx, { subType: v })}>
              <SelectTrigger className="h-fn-7 w-[150px]">
                <SelectValue placeholder="Sub-type" />
              </SelectTrigger>
              <SelectContent>
                {SUB_TYPE_CHOICES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={r.role}
              placeholder="Role (e.g. associate)"
              onChange={(e) => patch(idx, { role: e.target.value })}
              className="h-fn-7 flex-1"
            />
            <span className="text-fn-fg-faint text-[12px]">$</span>
            <Input
              type="number"
              min={0}
              step={10}
              value={r.amountUsd}
              onChange={(e) => patch(idx, { amountUsd: Number(e.target.value) })}
              className="h-fn-7 w-[84px] text-right tabular-nums"
            />
            <Input
              type="number"
              min={1}
              step={1}
              value={r.durationMonths}
              onChange={(e) => patch(idx, { durationMonths: Number(e.target.value) })}
              className="h-fn-7 w-[56px] text-right tabular-nums"
            />
            <span className="text-fn-fg-faint text-[11px]">mo</span>
            <button
              type="button"
              onClick={() => removeRow(idx)}
              disabled={rows.length <= 1}
              aria-label="Remove row"
              className="text-fn-fg-faint hover:text-fn-danger inline-flex cursor-pointer items-center disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-fn-3_5 w-fn-3_5" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="border-fn-border-strong text-fn-fg-muted hover:bg-fn-bg-inset rounded-fn-xs px-fn-3 py-fn-2 gap-fn-1 inline-flex cursor-pointer items-center justify-center border border-dashed text-[12.5px]"
      >
        <Plus className="h-fn-3_5 w-fn-3_5" /> Add a matrix row
      </button>

      {error && (
        <div className="rounded-fn-xs border-fn-warning/30 bg-fn-warning-soft/40 text-fn-warning-soft-fg px-fn-3 py-fn-2 gap-fn-2 flex items-center border text-[12px]">
          <AlertCircle className="h-fn-3_5 w-fn-3_5" />
          <span className="font-fn-medium">{error}</span>
        </div>
      )}
    </div>
  );
}

function rolesToMap(roles: Array<{ key: string; pct: number }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of roles) out[r.key] = r.pct;
  return out;
}

function bumpVersion(version: string): string {
  const parts = version.split('.').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 2) return '1.0';
  return `${parts[0]}.${parts[1] + 1}`;
}

function humanizeKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

const DEPT_LABELS: Record<string, string> = {
  engineering: 'Engineering',
  'business-development': 'Business Dev',
  operations: 'Operations',
  hr: 'HR',
  '*': 'Org-wide',
};
function departmentLabel(slug: string): string {
  return DEPT_LABELS[slug] ?? slug;
}
