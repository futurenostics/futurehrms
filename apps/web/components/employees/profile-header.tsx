'use client';

import * as React from 'react';
import Link from 'next/link';
import { Camera, MoreHorizontal } from 'lucide-react';
import type { EmployeePublic } from '@futurenostics/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { EmployeeAvatar } from './employee-avatar';
import { StatusPill } from './status-pill';
import { useUploadPhoto } from '@/lib/queries/employees';
import { usePermissions } from '@/hooks/use-permissions';

export interface ProfileHeaderProps {
  employee: EmployeePublic;
  onChangeStatus: () => void;
  onChangeManager: () => void;
  onChangeSalary: () => void;
  onArchive: () => void;
}

export function ProfileHeader({
  employee,
  onChangeStatus,
  onChangeManager,
  onChangeSalary,
  onArchive,
}: ProfileHeaderProps) {
  const perms = usePermissions();
  const uploadMutation = useUploadPhoto(employee.id);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const canEdit = perms.has('employees:update');
  const canChangeStatus = perms.has('employees:change_status');
  const canChangeManager = perms.has('employees:change_manager');
  const canChangeSalary = perms.has('employees:change_salary');
  const canArchive = perms.has('employees:delete');
  const canUploadPhoto = canEdit;

  const tenure = computeTenure(employee.joinDate);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate(file, {
      onSuccess: () => toast.success('Photo updated.'),
      onError: (err) => toast.error((err as Error).message),
    });
    e.target.value = '';
  }

  return (
    <div className="rounded-fn-xs border-fn-border bg-fn-bg-panel shadow-fn-sm p-fn-6 border">
      <div className="gap-fn-5 flex flex-wrap items-start">
        <div className="relative">
          <EmployeeAvatar fullName={employee.fullName} photoUrl={employee.photoUrl} size="xl" />
          {canUploadPhoto && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="border-fn-border-strong bg-fn-bg-panel text-fn-fg-muted shadow-fn-sm hover:bg-fn-bg-subtle hover:text-fn-fg -bottom-fn-1 -right-fn-1 h-fn-7 w-fn-7 rounded-fn-full absolute inline-flex cursor-pointer items-center justify-center border transition-colors disabled:opacity-60"
                aria-label="Upload photo"
              >
                <Camera className="h-fn-3_5 w-fn-3_5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFile}
                className="hidden"
              />
            </>
          )}
        </div>

        <div className="gap-fn-2 flex min-w-0 flex-1 flex-col">
          <div className="gap-fn-3 flex flex-wrap items-center">
            <h1 className="text-fn-fg font-fn-semibold tracking-fn-tight text-[22px]">
              {employee.fullName}
            </h1>
            <StatusPill status={employee.status} />
            {employee.isArchived && (
              <span className="bg-fn-bg-inset text-fn-fg-faint rounded-fn-full px-fn-2 py-fn-0_5 font-fn-semibold tracking-fn-uppercase-tight inline-flex items-center text-[10.5px] uppercase">
                Archived
              </span>
            )}
          </div>
          <div className="text-fn-fg-muted text-[13.5px]">
            {employee.designation.name} · {employee.department.name} ·{' '}
            <span className="tabular-nums">{employee.eid}</span>
          </div>

          <dl className="mt-fn-2 gap-x-fn-6 gap-y-fn-1_5 grid grid-cols-2 text-[12.5px] sm:grid-cols-4">
            <Fact label="Joined" value={formatDate(employee.joinDate)} />
            <Fact label="Tenure" value={tenure} />
            <Fact
              label="Manager"
              value={
                employee.manager ? (
                  <Link
                    href={`/employees/${employee.manager.id}`}
                    className="text-fn-fg font-fn-medium hover:underline"
                  >
                    {employee.manager.fullName}
                  </Link>
                ) : (
                  <span className="text-fn-fg-faint">—</span>
                )
              }
            />
            <Fact label="Direct reports" value={employee.reportsCount.toString()} />
          </dl>
        </div>

        <div className="gap-fn-2 flex flex-wrap items-center">
          {canEdit && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/employees/${employee.id}/edit`}>Edit</Link>
            </Button>
          )}
          {(canChangeStatus || canChangeManager || canChangeSalary || canArchive) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Actions <MoreHorizontal className="h-fn-3_5 w-fn-3_5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-fn-52">
                {canChangeStatus && (
                  <DropdownMenuItem onClick={onChangeStatus}>Change status…</DropdownMenuItem>
                )}
                {canChangeManager && (
                  <DropdownMenuItem onClick={onChangeManager}>Change manager…</DropdownMenuItem>
                )}
                {canChangeSalary && (
                  <DropdownMenuItem onClick={onChangeSalary}>
                    Record salary change…
                  </DropdownMenuItem>
                )}
                {canArchive && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onArchive}
                      className="text-fn-danger focus:text-fn-danger"
                    >
                      Archive employee
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="gap-fn-0_5 flex flex-col">
      <dt className="text-fn-fg-faint font-fn-semibold tracking-fn-uppercase-tight text-[11px] uppercase">
        {label}
      </dt>
      <dd className="text-fn-fg">{value}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function computeTenure(joinDate: string): string {
  const start = new Date(joinDate);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months <= 0)
    return `${Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86_400_000))}d`;
  const years = Math.floor(months / 12);
  const monthsRem = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years}y`);
  if (monthsRem > 0 || years === 0) parts.push(`${monthsRem}m`);
  return parts.join(' ');
}
