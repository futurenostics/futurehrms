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

type PoolMode = 'percentage' | 'fixed';

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
  const samplePoolUsd = poolMode === 'percentage' ? (SAMPLE_REVENUE * poolValue) / 100 : poolValue;
  const splitsTotal = roles.reduce((s, r) => s + r.pct, 0);
  const splitsValid = Math.abs(splitsTotal - 100) <= 0.01;
  const selectedCategory = categories.find((c) => c.id === categoryId);

  // Guardrails: empty / invalid input => no bound (null).
  const floorNum = parseGuard(perPersonFloor);
  const capNum = parseGuard(perPersonCap);
  const guardrailsValid = floorNum == null || capNum == null || capNum >= floorNum;
  const guardPayload = { perPersonFloorUsd: floorNum, perPersonCapUsd: capNum };

  /* ---------- Mutations ---------- */
  async function saveAsDraft() {
    if (!guardrailsValid) {
      toast.error('Per-person cap must be greater than or equal to the floor.');
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
          poolMode,
          poolValue,
          ...guardPayload,
          rolePercentages: rolesToMap(roles),
          status: 'draft',
        });
        toast.success('Draft updated.');
      } else {
        await createMutation.mutateAsync({
          department,
          categoryId,
          poolMode,
          poolValue,
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
      poolMode,
      poolValue,
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
    try {
      let targetId: string;
      if (mode === 'edit' && existing && existing.status === 'draft') {
        targetId = existing.id;
        await updateMutation.mutateAsync({
          poolMode,
          poolValue,
          ...guardPayload,
          rolePercentages: rolesToMap(roles),
        });
      } else if (mode === 'edit' && existing) {
        const created = await createMutation.mutateAsync({
          department: existing.department,
          categoryId: existing.category.id,
          poolMode,
          poolValue,
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
          poolMode,
          poolValue,
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
      // Use a fresh mutation since publishMutation closure is bound to ruleId.
      const published = await fetch(`/api/commission-rules/${targetId}/publish`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(effectiveFrom ? { effectiveFrom } : {}),
      });
      if (!published.ok) {
        const body = await published.json().catch(() => ({}));
        throw new Error(body.message ?? 'Failed to publish');
      }
      const payload = (await published.json()) as CommissionRulePublic;
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
                    ]}
                  />
                }
              >
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
                sampleRevenue={SAMPLE_REVENUE}
                roles={roles}
              />
              {existing && existing.status === 'active' && (
                <CompareToCurrentPanel
                  current={existing}
                  next={{ poolMode, poolValue, roles: rolesToMap(roles) }}
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
            disabled={isSubmitting || !splitsValid || !department || !categoryId}
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
  sampleRevenue,
  roles,
}: {
  poolMode: PoolMode;
  poolValue: number;
  sampleRevenue: number;
  roles: Array<{ key: string; pct: number }>;
}) {
  const pool = poolMode === 'percentage' ? (sampleRevenue * poolValue) / 100 : poolValue;
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
            {poolMode === 'percentage' ? `${poolValue}%` : 'Fixed'} · split across {roles.length}{' '}
            role {roles.length === 1 ? 'group' : 'groups'} below
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
  next: { poolMode: PoolMode; poolValue: number; roles: Record<string, number> };
}) {
  const samplePool = (n: { poolMode: string; poolValue: number }) =>
    n.poolMode === 'percentage' ? (SAMPLE_REVENUE * n.poolValue) / 100 : n.poolValue;
  const curPool = samplePool(current);
  const nextPool = samplePool(next);

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

/* ───────────────────────── Helpers ───────────────────────── */

/** Parse a guardrail input: blank / non-finite / negative → null (no bound). */
function parseGuard(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
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
