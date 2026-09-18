'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type { EmployeePublic } from '@futurenostics/types';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { EmployeeAvatar } from '@/components/employees/employee-avatar';
import {
  hiddenDepartmentId,
  useCreateDepartment,
  useUpdateDepartment,
  type DepartmentHeadRef,
  type DepartmentPublic,
} from '@/lib/queries/departments';

export interface DepartmentEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create mode. */
  department: DepartmentPublic | null;
  /**
   * Called instead of a generic error toast when the entered name
   * clashes with a hidden department — the parent page routes this into
   * a restore-confirm dialog.
   */
  onHiddenNameClash?: (hiddenId: string, name: string) => void;
}

export function DepartmentEditorSheet({
  open,
  onOpenChange,
  department,
  onHiddenNameClash,
}: DepartmentEditorSheetProps) {
  const isNew = department === null;
  const create = useCreateDepartment();
  const update = useUpdateDepartment();
  const busy = create.isPending || update.isPending;

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [head, setHead] = React.useState<DepartmentHeadRef | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(department?.name ?? '');
    setDescription(department?.description ?? '');
    setHead(department?.head ?? null);
  }, [open, department]);

  const trimmed = name.trim();
  const trimmedDescription = description.trim();
  const headChanged = (head?.id ?? null) !== (department?.head?.id ?? null);
  const descriptionChanged = trimmedDescription !== (department?.description ?? '');
  const canSave =
    !busy &&
    trimmed.length > 0 &&
    (isNew || trimmed !== department.name || headChanged || descriptionChanged);

  async function handleSave(): Promise<void> {
    try {
      const input = {
        name: trimmed,
        description: trimmedDescription || null,
        headEmployeeId: head?.id ?? null,
      };
      if (isNew) {
        await create.mutateAsync(input);
        toast.success(`Created "${trimmed}"`);
      } else {
        await update.mutateAsync({ id: department.id, ...input });
        toast.success('Department updated');
      }
      onOpenChange(false);
    } catch (e) {
      const hiddenId = hiddenDepartmentId(e);
      if (hiddenId) {
        onOpenChange(false);
        onHiddenNameClash?.(hiddenId, trimmed);
        return;
      }
      toast.error((e as Error).message);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="sm">
        <SheetHeader>
          <SheetTitle>{isNew ? 'New department' : `Renaming ${department.name}`}</SheetTitle>
        </SheetHeader>

        <SheetBody>
          <div className="gap-fn-4 flex flex-col">
            <div className="gap-fn-1 flex flex-col">
              <Label className="text-fn-fg-muted text-[12px]">Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
                placeholder="Engineering"
                maxLength={80}
                autoFocus
              />
            </div>

            <div className="gap-fn-1 flex flex-col">
              <Label className="text-fn-fg-muted text-[12px]">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={busy}
                placeholder="What this department does"
                maxLength={500}
                rows={3}
              />
            </div>

            <div className="gap-fn-1 flex flex-col">
              <Label className="text-fn-fg-muted text-[12px]">Department head</Label>
              <DepartmentHeadPicker value={head} onChange={setHead} disabled={busy} />
            </div>
          </div>
        </SheetBody>

        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={!canSave} className="ml-auto">
            {isNew ? 'Create department' : 'Save changes'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Searchable employee picker for the department-head field. Not
 * restricted to members of this department — a head is often assigned
 * before (or independently of) who else is in the department, and a
 * brand-new department has no members yet to pick from.
 */
function DepartmentHeadPicker({
  value,
  onChange,
  disabled,
}: {
  value: DepartmentHeadRef | null;
  onChange: (head: DepartmentHeadRef | null) => void;
  disabled?: boolean;
}) {
  const [candidates, setCandidates] = React.useState<EmployeePublic[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const qs = new URLSearchParams({ limit: '200', sortBy: 'fullName', sortDir: 'asc' });
        const res = await apiFetch<{ items: EmployeePublic[] }>(`/api/employees?${qs.toString()}`);
        if (!cancelled) setCandidates(res.items.filter((e) => !e.isArchived));
      } catch {
        // ignore — the picker just shows no options until retried
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (value) {
    return (
      <div className="rounded-fn-xs border-fn-border bg-fn-bg-panel p-fn-2_5 gap-fn-3 flex items-center border">
        <EmployeeAvatar fullName={value.fullName} photoUrl={null} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="text-fn-fg font-fn-semibold text-[13px]">{value.fullName}</div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          className="text-fn-fg-faint hover:text-fn-fg cursor-pointer text-[12px] disabled:cursor-not-allowed"
        >
          Change
        </button>
      </div>
    );
  }

  const options = candidates.map((c) => ({
    value: c.id,
    label: c.fullName,
    description: `${c.designation.name} · ${c.department.name}`,
  }));

  return (
    <Combobox
      options={options}
      value=""
      onValueChange={(id) => {
        const chosen = candidates.find((c) => c.id === id);
        if (chosen) onChange({ id: chosen.id, fullName: chosen.fullName });
      }}
      placeholder="Search employee…"
      searchPlaceholder="Search employee…"
      emptyLabel="employees"
      disabled={disabled}
    />
  );
}
