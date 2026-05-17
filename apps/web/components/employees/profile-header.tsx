'use client';

import * as React from 'react';
import Link from 'next/link';
import { Briefcase, Camera, Mail, MapPin, MoreHorizontal, Phone, User } from 'lucide-react';
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
import { useUploadPhoto } from '@/lib/queries/employees';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

/**
 * Profile header — matches docs/design/screens/employee-profile-header.jsx.
 *
 * Anatomy:
 *   • 84×84 rounded avatar with a gradient ring + initials + a
 *     green status dot at the bottom-right.
 *   • Top-right action cluster: Message · Assign project · Edit
 *     profile (primary) · kebab (more actions).
 *   • Name (26px h1) + status badge + contract badge + mono EID
 *     pill on one row.
 *   • "{designation} · {department}" muted secondary line.
 *   • Meta row with four items: email, phone, "Reports to …",
 *     location — each prefixed with a 13px icon.
 *
 * The design intentionally promotes the avatar and name pair so the
 * profile reads "person first, attributes second."
 */
export interface ProfileHeaderProps {
  employee: EmployeePublic;
  onEdit: () => void;
  onChangeStatus: () => void;
  onChangeManager: () => void;
  onChangeSalary: () => void;
  onArchive: () => void;
  onMessage?: () => void;
  onAssignProject?: () => void;
}

export function ProfileHeader({
  employee,
  onEdit,
  onChangeStatus,
  onChangeManager,
  onChangeSalary,
  onArchive,
  onMessage,
  onAssignProject,
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

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate(file, {
      onSuccess: () => toast.success('Photo updated.'),
      onError: (err) => toast.error((err as Error).message),
    });
    e.target.value = '';
  }

  const initials = employee.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  // Status dot colour — the design's avatar dot is green for any
  // active employee and grey for archived. Status-specific tints
  // (warning for probation, etc.) stay in the StatusPill alongside
  // the name; the dot only telegraphs "in the company / not".
  const dotTone = employee.isArchived ? 'bg-fn-fg-faint' : 'bg-fn-success';

  return (
    <div className="rounded-fn-sm border-fn-border bg-fn-bg-panel p-fn-6 relative border">
      {/* Action cluster — pinned to the top-right corner of the card. */}
      <div className="gap-fn-2 right-fn-5 top-fn-5 absolute flex flex-wrap items-center">
        {onMessage && (
          <Button variant="secondary" size="sm" onClick={onMessage}>
            <Mail className="h-fn-3_5 w-fn-3_5" /> Message
          </Button>
        )}
        {onAssignProject && (
          <Button variant="secondary" size="sm" onClick={onAssignProject}>
            <Briefcase className="h-fn-3_5 w-fn-3_5" /> Assign project
          </Button>
        )}
        {canEdit && (
          <Button size="sm" onClick={onEdit}>
            Edit profile
          </Button>
        )}
        {(canChangeStatus || canChangeManager || canChangeSalary || canArchive) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" aria-label="More actions" className="px-fn-2">
                <MoreHorizontal className="h-fn-3_5 w-fn-3_5" />
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
                <DropdownMenuItem onClick={onChangeSalary}>Record salary change…</DropdownMenuItem>
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

      <div className="gap-fn-5_5 flex items-center pr-[180px]">
        {/* Avatar — gradient ring + initials inside + status dot. */}
        <div className="relative shrink-0">
          <div
            className="rounded-fn-sm p-[3px]"
            style={{
              width: 84,
              height: 84,
              background: 'linear-gradient(135deg, var(--fn-accent) 0%, oklch(0.70 0.14 175) 100%)',
            }}
          >
            <div
              className="rounded-fn-sm font-fn-semibold flex h-full w-full items-center justify-center text-[30px]"
              style={{
                background: 'oklch(0.94 0.06 280)',
                color: 'oklch(0.35 0.16 280)',
                letterSpacing: '-0.03em',
              }}
            >
              {initials}
            </div>
          </div>
          <span
            aria-hidden
            className={cn(
              'rounded-fn-full border-fn-bg-panel absolute h-[18px] w-[18px] border-[3px]',
              dotTone,
            )}
            style={{ bottom: -2, right: -2 }}
          />
          {canUploadPhoto && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="border-fn-border-strong bg-fn-bg-panel text-fn-fg-muted shadow-fn-sm hover:bg-fn-bg-subtle hover:text-fn-fg -bottom-fn-2 -left-fn-1 h-fn-6 w-fn-6 rounded-fn-full absolute inline-flex cursor-pointer items-center justify-center border transition-colors disabled:opacity-60"
                aria-label="Upload photo"
              >
                <Camera className="h-fn-3 w-fn-3" />
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

        {/* Identity column */}
        <div className="min-w-0 flex-1">
          <div className="gap-fn-2_5 flex flex-wrap items-center">
            <h1
              className="text-fn-fg font-fn-semibold m-0 truncate text-[26px]"
              style={{ letterSpacing: '-0.03em' }}
            >
              {employee.fullName}
            </h1>
            <StatusBadge slug={employee.status.slug} name={employee.status.name} />
            <ContractBadge contractType={employee.contractType} />
            <span className="bg-fn-bg-inset text-fn-fg-faint rounded-fn-xs px-fn-1_5 py-fn-0_5 inline-flex items-center font-mono text-[11.5px]">
              {employee.eid}
            </span>
            {employee.isArchived && (
              <span className="bg-fn-bg-inset text-fn-fg-faint rounded-fn-full px-fn-2 py-fn-0_5 font-fn-semibold tracking-fn-uppercase-tight inline-flex items-center text-[10.5px] uppercase">
                Archived
              </span>
            )}
          </div>
          <div className="text-fn-fg-muted font-fn-medium mt-fn-1_5 text-[14px]">
            {employee.designation.name} · {employee.department.name}
          </div>

          {/* Meta row — 4 icon+value pairs */}
          <div className="gap-x-fn-6 gap-y-fn-2 mt-fn-4 flex flex-wrap items-center text-[12.5px]">
            <Meta icon={<Mail className="h-fn-3 w-fn-3" />} value={employee.email} mono />
            {employee.phone && (
              <Meta icon={<Phone className="h-fn-3 w-fn-3" />} value={employee.phone} mono />
            )}
            <Meta
              icon={<User className="h-fn-3 w-fn-3" />}
              value={
                employee.manager ? (
                  <>
                    Reports to{' '}
                    <Link
                      href={`/employees/${employee.manager.id}`}
                      className="text-fn-fg font-fn-medium hover:underline"
                    >
                      {employee.manager.fullName}
                    </Link>
                  </>
                ) : (
                  <span className="text-fn-fg-faint">No manager</span>
                )
              }
            />
            {employee.address && (
              <Meta icon={<MapPin className="h-fn-3 w-fn-3" />} value={employee.address} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Sub-components ─────────────── */

function Meta({
  icon,
  value,
  mono,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <span className="gap-fn-1_5 text-fn-fg-muted inline-flex items-center">
      <span aria-hidden className="text-fn-fg-faint inline-flex shrink-0 items-center">
        {icon}
      </span>
      <span
        className={cn(
          'text-fn-fg font-fn-medium',
          mono ? 'font-mono text-[12.5px]' : 'text-[13px]',
        )}
      >
        {value}
      </span>
    </span>
  );
}

function StatusBadge({ slug, name }: { slug: string; name: string }) {
  // Permanent → success dot. Probation → warning dot. Intern → info
  // dot. Contractor → accent dot. Anything else → neutral.
  const tone: Record<string, string> = {
    permanent: 'bg-fn-success-soft text-fn-success-soft-fg border-fn-success/30',
    probation: 'bg-fn-warning-soft text-fn-warning-soft-fg border-fn-warning/30',
    intern: 'bg-fn-info-soft text-fn-info-soft-fg border-fn-info/30',
    contractor: 'bg-fn-accent-soft text-fn-accent-soft-fg border-fn-accent/30',
  };
  const dotTone: Record<string, string> = {
    permanent: 'bg-fn-success',
    probation: 'bg-fn-warning',
    intern: 'bg-fn-info',
    contractor: 'bg-fn-accent',
  };
  return (
    <span
      className={cn(
        'rounded-fn-full gap-fn-1_5 px-fn-2 py-fn-0_5 font-fn-medium inline-flex items-center border text-[11.5px]',
        tone[slug] ?? 'bg-fn-bg-subtle text-fn-fg-muted border-fn-border',
      )}
    >
      <span
        aria-hidden
        className={cn('rounded-fn-full h-fn-1_5 w-fn-1_5', dotTone[slug] ?? 'bg-fn-fg-faint')}
      />
      {name}
    </span>
  );
}

function ContractBadge({ contractType }: { contractType: string }) {
  const label = contractType.replace(/([A-Z])/g, ' $1').trim();
  return (
    <span className="bg-fn-bg-inset text-fn-fg-muted rounded-fn-full px-fn-2 py-fn-0_5 font-fn-medium inline-flex items-center text-[11.5px]">
      {label}
    </span>
  );
}
