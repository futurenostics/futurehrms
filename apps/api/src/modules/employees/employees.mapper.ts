/**
 * Projection helpers — turn Prisma rows into the public response
 * shape declared in `packages/types/schemas/employee.ts`.
 *
 * Sensitive fields (salary, full CNIC) are conditionally included
 * based on the viewer's permissions. The same `toPublic` is used by
 * the list endpoint and the get-one endpoint, so the masking rules
 * live in one place.
 */
import type { EmployeePublic, EmployeeRef } from '@futurenostics/types';
import type { AuthenticatedUser } from '../../core/auth/types';
import { canViewPii, canViewSalary } from '../../core/rbac/scope';

export interface EmployeeRowForMapping {
  id: string;
  eid: string;
  fullName: string;
  email: string;
  phone: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  cnic: string | null;
  joinDate: Date;
  department: { id: string; name: string; slug: string };
  designation: { id: string; name: string };
  status: { id: string; name: string; slug: string };
  contractType: string;
  manager:
    | (Omit<EmployeeRowForMapping, 'manager' | 'reports'> & {
        eid: string;
        fullName: string;
        id: string;
      })
    | null;
  salaryPkr: { toString: () => string } | number | null;
  salaryProcessedExternally: boolean;
  hasPayoneer: boolean;
  payoneerAccountId: string | null;
  internshipEndDate: Date | null;
  probationEndDate: Date | null;
  lastIncrementDate: Date | null;
  emergencyContact: unknown;
  documents: Array<{ kind: string; fileUrl: string; uploadedAt: Date }>;
  _count?: { reports: number };
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export function maskCnic(cnic: string | null, viewer: AuthenticatedUser): string | null {
  if (!cnic) return null;
  if (canViewPii(viewer)) return cnic;
  // 12345-1234567-1 → *****-*****67-*
  if (cnic.length < 4) return cnic.replace(/\d/g, '*');
  return cnic.replace(/\d(?=\d{4})/g, '*');
}

export function extractPhotoStorageKey(
  documents: Array<{ kind: string; fileUrl: string }>,
): string | null {
  const photo = documents.find((d) => d.kind === 'photo');
  return photo?.fileUrl ?? null;
}

export function diffInDays(later: Date, earlier: Date): number {
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / (24 * 60 * 60 * 1000)));
}

function toIsoOrNull(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

function decimalToNumber(value: { toString: () => string } | number | null): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const n = Number(value.toString());
  return Number.isFinite(n) ? n : null;
}

export function toEmployeeRef(row: {
  id: string;
  fullName: string;
  eid: string;
  photoUrl?: string | null;
}): EmployeeRef {
  return {
    id: row.id,
    fullName: row.fullName,
    eid: row.eid,
    photoUrl: row.photoUrl ?? null,
  };
}

export function toEmployeePublic(
  row: EmployeeRowForMapping,
  viewer: AuthenticatedUser,
  photoUrl: string | null,
): EmployeePublic {
  const showSalary = canViewSalary(viewer);

  const base: EmployeePublic = {
    id: row.id,
    eid: row.eid,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    dateOfBirth: toIsoOrNull(row.dateOfBirth),
    gender: (row.gender as EmployeePublic['gender']) ?? null,
    cnicMasked: maskCnic(row.cnic, viewer),
    joinDate: row.joinDate.toISOString(),
    joinedDaysAgo: diffInDays(new Date(), row.joinDate),
    department: row.department,
    designation: { id: row.designation.id, name: row.designation.name },
    status: row.status,
    contractType: row.contractType as EmployeePublic['contractType'],
    manager: row.manager
      ? {
          id: row.manager.id,
          fullName: row.manager.fullName,
          eid: row.manager.eid,
          photoUrl: null,
        }
      : null,
    reportsCount: row._count?.reports ?? 0,
    photoUrl,
    hasPayoneer: row.hasPayoneer,
    internshipEndDate: toIsoOrNull(row.internshipEndDate),
    probationEndDate: toIsoOrNull(row.probationEndDate),
    emergencyContact: (row.emergencyContact as EmployeePublic['emergencyContact']) ?? null,
    isArchived: row.deletedAt !== null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };

  if (showSalary) {
    base.salaryPkr = decimalToNumber(row.salaryPkr);
    base.salaryProcessedExternally = row.salaryProcessedExternally;
    base.payoneerAccountId = row.payoneerAccountId ?? null;
    base.lastIncrementDate = toIsoOrNull(row.lastIncrementDate);
  }

  return base;
}

/** Field selection passed to Prisma findMany/findUnique to populate toEmployeePublic. */
export const EMPLOYEE_PUBLIC_INCLUDE = {
  department: { select: { id: true, name: true, slug: true } },
  designation: { select: { id: true, name: true } },
  status: { select: { id: true, name: true, slug: true } },
  manager: { select: { id: true, fullName: true, eid: true } },
  documents: { where: { kind: 'photo' }, orderBy: { uploadedAt: 'desc' as const }, take: 1 },
  _count: { select: { reports: { where: { deletedAt: null } } } },
} as const;
