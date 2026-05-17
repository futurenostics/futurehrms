'use client';

import * as React from 'react';
import { Pencil, UserPlus } from 'lucide-react';
import type { EmployeePublic } from '@futurenostics/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

/**
 * Employee form sheet — shared shell for Create and Edit.
 *
 * The shell mirrors the Overtime Rules editor sheet
 * (docs/design/screens/overtime-rules.jsx, RuleEditorSheet @ L192):
 *   • 720px panel pinned right, slides in from right
 *   • Sticky header: 36×36 icon tile + title input + subtitle + close
 *   • Scrollable body (sections + live preview panel)
 *   • Sticky footer: Active toggle + Cancel + Save
 *
 * Sections, live preview, and alert banners land in subsequent
 * commits; this commit ships the empty shell so the visual
 * language can be verified independently of form behaviour.
 */
export type EmployeeFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  /** Required when mode === 'edit'. */
  employee?: EmployeePublic;
  onSuccess?: (employee: EmployeePublic) => void;
};

export function EmployeeFormSheet({ open, onOpenChange, mode, employee }: EmployeeFormSheetProps) {
  // Title input — read-only in Create mode (the EID is what identifies the
  // record; the visible "title" stays "New employee"); editable in Edit mode
  // and tied to the employee's fullName field. Local state for now; the
  // form-binding commit will wire it to the react-hook-form field.
  const [titleValue, setTitleValue] = React.useState<string>(employee?.fullName ?? '');
  React.useEffect(() => {
    setTitleValue(employee?.fullName ?? '');
  }, [employee?.id, employee?.fullName]);

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
            {/* The Radix Title is required for a11y but visually it's
                replaced by the editable input. Render it visually
                hidden so the screen reader announcement stays
                semantic. */}
            <SheetTitle className="sr-only">
              {mode === 'create' ? 'Add new employee' : `Edit ${employee?.fullName ?? 'employee'}`}
            </SheetTitle>
            <Input
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              disabled={mode === 'create'}
              placeholder={mode === 'create' ? 'New employee' : 'Full name'}
              aria-label="Employee full name"
              className={cn(
                'font-fn-semibold h-[38px] text-[14px]',
                mode === 'create' && 'disabled:cursor-default disabled:opacity-100',
              )}
            />
            <div className="text-fn-fg-faint mt-fn-1 text-[11.5px]">{subtitle}</div>
          </div>
          {/* The close button is rendered by SheetContent via showClose */}
        </SheetHeader>

        {/* ── Scrollable body ──────────────────────────────────────── */}
        <SheetBody className="pt-fn-1_5 flex flex-col gap-0">
          {/* Sections + live preview panel land in the next commit.
              Render a placeholder so the shell is visually verifiable. */}
          <div className="text-fn-fg-faint py-fn-14 flex flex-col items-center justify-center text-center text-[12.5px]">
            <p>Form sections land in the next commit.</p>
          </div>
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
            <Button size="sm" disabled>
              {mode === 'create' ? 'Create employee' : 'Save changes'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
