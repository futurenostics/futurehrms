/**
 * CSV import + export for employees.
 *
 * Import is two-phase: `previewCsv` parses and validates without
 * writing anything, returning a per-row status + error list so the
 * wizard's preview step can show which rows are good. `commitCsv`
 * takes the same buffer, runs validation again (defence against TOCTOU
 * — the reference data could have changed since the preview), then
 * creates every valid row in a single transaction.
 *
 * Reference resolution: department / designation / status / manager
 * are matched by name (case-insensitive). Unknown references fail the
 * row with a specific error — see ADR-equivalent reasoning in the
 * Phase 1 prompt: auto-creating canonical records via CSV typo risk.
 */
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { prisma } from '@futurenostics/db';
import type { ReportColumn, ReportData } from '../../core/reports/report-formats';
import {
  type CsvImportPreview,
  type CsvImportRow,
  type CsvImportCommitResult,
  contractTypeSchema,
} from '@futurenostics/types';
import type { Prisma } from '@prisma/client';

const REQUIRED_HEADERS = [
  'fullName',
  'email',
  'departmentName',
  'designationName',
  'joinDate',
] as const;

const OPTIONAL_HEADERS = [
  'phone',
  'cnic',
  'statusName',
  'contractType',
  'managerEmail',
  'salaryPkr',
  'dateOfBirth',
  'gender',
  'probationEndDate',
  'internshipEndDate',
] as const;

const ALL_KNOWN_HEADERS = new Set<string>([...REQUIRED_HEADERS, ...OPTIONAL_HEADERS]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CNIC_PATTERN = /^\d{5}-\d{7}-\d{1}$/;

export interface PreparedRow {
  rowNumber: number;
  data: Prisma.EmployeeCreateInput;
}

interface References {
  departments: Map<string, { id: string; slug: string }>;
  designations: Map<string, { id: string; departmentId: string }>;
  statuses: Map<string, { id: string; slug: string }>;
  managers: Map<string, { id: string }>;
  defaultStatusId: string;
}

async function loadReferences(): Promise<References> {
  const [departments, designations, statuses, managers] = await Promise.all([
    prisma.department.findMany({ select: { id: true, name: true, slug: true } }),
    prisma.designation.findMany({ select: { id: true, name: true, departmentId: true } }),
    prisma.employeeStatus.findMany({ select: { id: true, name: true, slug: true } }),
    prisma.employee.findMany({
      where: { deletedAt: null },
      select: { id: true, email: true },
    }),
  ]);

  const defaultStatus = statuses.find((s) => s.slug === 'probation') ?? statuses[0];
  if (!defaultStatus) {
    throw new Error('Cannot import employees: no EmployeeStatus rows exist in the database');
  }

  return {
    departments: new Map(
      departments.map((d) => [d.name.toLowerCase().trim(), { id: d.id, slug: d.slug }]),
    ),
    // Designations are keyed by `name|departmentName` because the same
    // designation can live under multiple departments.
    designations: new Map(
      designations.map((d) => [
        `${d.name.toLowerCase().trim()}|${d.departmentId}`,
        { id: d.id, departmentId: d.departmentId },
      ]),
    ),
    statuses: new Map(
      statuses.map((s) => [s.name.toLowerCase().trim(), { id: s.id, slug: s.slug }]),
    ),
    managers: new Map(managers.map((m) => [m.email.toLowerCase().trim(), { id: m.id }])),
    defaultStatusId: defaultStatus.id,
  };
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  // Accept YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const slash = trimmed.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (slash) {
    const [, dd, mm, yyyy] = slash;
    const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

interface ValidationResult {
  preview: CsvImportPreview;
  prepared: PreparedRow[];
}

export async function validateCsv(buffer: Buffer): Promise<ValidationResult> {
  let parsedRecords: Array<Record<string, string>>;
  try {
    parsedRecords = parse(buffer, {
      columns: (header: string[]) => header.map((h) => h.trim()),
      skip_empty_lines: true,
      relax_quotes: true,
      trim: true,
    }) as Array<Record<string, string>>;
  } catch (err) {
    throw new Error(`Could not parse CSV: ${(err as Error).message}`);
  }

  if (parsedRecords.length === 0) {
    return {
      preview: { total: 0, valid: 0, warnings: 0, errors: 0, rows: [] },
      prepared: [],
    };
  }

  const headersPresent = new Set(Object.keys(parsedRecords[0] ?? {}));
  for (const required of REQUIRED_HEADERS) {
    if (!headersPresent.has(required)) {
      throw new Error(
        `CSV is missing required header "${required}". Expected headers: ${[...REQUIRED_HEADERS, ...OPTIONAL_HEADERS].join(', ')}`,
      );
    }
  }
  // Surface unknown headers as a warning on every row so the user
  // notices mappings they didn't intend (e.g. `salary` instead of `salaryPkr`).
  const unknownHeaders = [...headersPresent].filter((h) => !ALL_KNOWN_HEADERS.has(h));

  const refs = await loadReferences();

  // Track in-file email collisions — two rows can't both create the same email.
  const emailsInFile = new Map<string, number>();
  const dbEmails = new Set(
    (
      await prisma.employee.findMany({
        where: { deletedAt: null },
        select: { email: true },
      })
    ).map((e) => e.email.toLowerCase()),
  );

  const rows: CsvImportRow[] = [];
  const prepared: PreparedRow[] = [];

  parsedRecords.forEach((raw, idx) => {
    const rowNumber = idx + 2; // 1 is the header row
    const errors: string[] = [];
    const warnings: string[] = [
      ...(unknownHeaders.length > 0
        ? [
            `Ignoring unknown column${unknownHeaders.length > 1 ? 's' : ''}: ${unknownHeaders.join(', ')}`,
          ]
        : []),
    ];

    // Required scalars
    const fullName = (raw.fullName ?? '').trim();
    if (fullName.length < 2) errors.push('fullName is required');

    const email = (raw.email ?? '').trim().toLowerCase();
    if (!email) errors.push('email is required');
    else if (!EMAIL_PATTERN.test(email)) errors.push('email is not a valid address');

    if (email) {
      if (dbEmails.has(email)) errors.push(`email "${email}" is already in use`);
      const firstSeen = emailsInFile.get(email);
      if (firstSeen) errors.push(`duplicate email in CSV (row ${firstSeen})`);
      else emailsInFile.set(email, rowNumber);
    }

    const departmentName = (raw.departmentName ?? '').trim();
    if (!departmentName) errors.push('departmentName is required');
    const dept = departmentName ? refs.departments.get(departmentName.toLowerCase()) : null;
    if (departmentName && !dept) errors.push(`unknown department "${departmentName}"`);

    const designationName = (raw.designationName ?? '').trim();
    if (!designationName) errors.push('designationName is required');
    let designationId: string | null = null;
    if (designationName && dept) {
      const key = `${designationName.toLowerCase()}|${dept.id}`;
      const designation = refs.designations.get(key);
      if (!designation) {
        errors.push(
          `unknown designation "${designationName}" under department "${departmentName}"`,
        );
      } else {
        designationId = designation.id;
      }
    }

    const joinDateRaw = (raw.joinDate ?? '').trim();
    if (!joinDateRaw) errors.push('joinDate is required');
    const joinDate = joinDateRaw ? parseDate(joinDateRaw) : null;
    if (joinDateRaw && !joinDate) {
      errors.push(`joinDate "${joinDateRaw}" is not a valid date (use YYYY-MM-DD)`);
    }

    // Optional with defaults
    const statusNameRaw = (raw.statusName ?? '').trim();
    let statusId = refs.defaultStatusId;
    if (statusNameRaw) {
      const status = refs.statuses.get(statusNameRaw.toLowerCase());
      if (!status) errors.push(`unknown status "${statusNameRaw}"`);
      else statusId = status.id;
    }

    const contractTypeRaw = (raw.contractType ?? 'FullTime').trim();
    const contractType = contractTypeSchema.safeParse(contractTypeRaw);
    if (!contractType.success) {
      errors.push(`contractType must be one of FullTime, PartTime, Contractor, Intern`);
    }

    let managerId: string | null = null;
    const managerEmail = (raw.managerEmail ?? '').trim().toLowerCase();
    if (managerEmail) {
      const mgr = refs.managers.get(managerEmail);
      if (!mgr) errors.push(`unknown manager email "${managerEmail}"`);
      else managerId = mgr.id;
    }

    const salaryRaw = (raw.salaryPkr ?? '').trim();
    let salaryPkr: number | null = null;
    if (salaryRaw) {
      const parsed = Number(salaryRaw.replace(/[,\s]/g, ''));
      if (!Number.isFinite(parsed) || parsed < 0) {
        errors.push(`salaryPkr "${salaryRaw}" is not a non-negative number`);
      } else {
        salaryPkr = parsed;
      }
    } else {
      warnings.push('salaryPkr not set — employee will need a salary recorded separately');
    }

    const cnicRaw = (raw.cnic ?? '').trim();
    if (cnicRaw && !CNIC_PATTERN.test(cnicRaw)) {
      errors.push('cnic must match 12345-1234567-1');
    }

    const dobRaw = (raw.dateOfBirth ?? '').trim();
    const dob = dobRaw ? parseDate(dobRaw) : null;
    if (dobRaw && !dob) errors.push(`dateOfBirth "${dobRaw}" is not a valid date`);

    const probationRaw = (raw.probationEndDate ?? '').trim();
    const probationEnd = probationRaw ? parseDate(probationRaw) : null;
    if (probationRaw && !probationEnd)
      errors.push(`probationEndDate "${probationRaw}" is not valid`);

    const internshipRaw = (raw.internshipEndDate ?? '').trim();
    const internshipEnd = internshipRaw ? parseDate(internshipRaw) : null;
    if (internshipRaw && !internshipEnd)
      errors.push(`internshipEndDate "${internshipRaw}" is not valid`);

    const status: CsvImportRow['status'] =
      errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid';

    rows.push({
      rowNumber,
      status,
      raw,
      errors,
      warnings,
    });

    if (status !== 'error' && dept && designationId && joinDate && contractType.success) {
      prepared.push({
        rowNumber,
        data: {
          eid: '', // assigned at commit time so we don't burn EIDs on a previewed-but-not-committed row
          fullName,
          email,
          phone: (raw.phone ?? '').trim() || null,
          dateOfBirth: dob,
          gender: (raw.gender ?? '').trim() || null,
          cnic: cnicRaw || null,
          joinDate,
          departmentId: dept.id,
          designationId,
          statusId,
          contractType: contractType.data,
          managerId,
          salaryPkr,
          probationEndDate: probationEnd,
          internshipEndDate: internshipEnd,
        } as unknown as Prisma.EmployeeCreateInput,
      });
    }
  });

  return {
    preview: {
      total: rows.length,
      valid: rows.filter((r) => r.status === 'valid').length,
      warnings: rows.filter((r) => r.status === 'warning').length,
      errors: rows.filter((r) => r.status === 'error').length,
      rows,
    },
    prepared,
  };
}

export async function commitCsv(buffer: Buffer): Promise<CsvImportCommitResult> {
  const { preview, prepared } = await validateCsv(buffer);

  if (prepared.length === 0) {
    return {
      total: preview.total,
      created: 0,
      skipped: preview.errors,
      errors: preview.errors,
      errorDetails: preview.rows
        .filter((r) => r.status === 'error')
        .map((r) => ({ rowNumber: r.rowNumber, errors: r.errors })),
    };
  }

  // Generate EIDs sequentially within the transaction so we don't
  // race when two imports run in parallel.
  const created = await prisma.$transaction(async (tx) => {
    let createdCount = 0;
    for (const row of prepared) {
      const eid = await (async () => {
        const latest = await tx.employee.findFirst({
          where: { eid: { startsWith: 'EMP-' } },
          orderBy: { eid: 'desc' },
          select: { eid: true },
        });
        const lastNumber = latest ? Number.parseInt(latest.eid.slice(4), 10) || 0 : 0;
        return `EMP-${String(lastNumber + 1).padStart(4, '0')}`;
      })();

      await tx.employee.create({
        data: {
          ...row.data,
          eid,
        },
      });
      createdCount += 1;
    }
    return createdCount;
  });

  return {
    total: preview.total,
    created,
    skipped: preview.errors,
    errors: preview.errors,
    errorDetails: preview.rows
      .filter((r) => r.status === 'error')
      .map((r) => ({ rowNumber: r.rowNumber, errors: r.errors })),
  };
}

/* ---------- Export ---------- */

export interface ExportRowInput {
  eid: string;
  fullName: string;
  email: string;
  phone: string | null;
  department: string;
  designation: string;
  status: string;
  contractType: string;
  joinDate: Date;
  manager: string | null;
  /** Only populated when the exporter has view_salary. */
  salaryPkr: number | null;
}

export function buildCsv(rows: ExportRowInput[], includeSalary: boolean): string {
  const header = [
    'eid',
    'fullName',
    'email',
    'phone',
    'department',
    'designation',
    'status',
    'contractType',
    'joinDate',
    'manager',
  ];
  if (includeSalary) header.push('salaryPkr');

  const records = rows.map((r) => {
    const base = [
      r.eid,
      r.fullName,
      r.email,
      r.phone ?? '',
      r.department,
      r.designation,
      r.status,
      r.contractType,
      r.joinDate.toISOString().slice(0, 10),
      r.manager ?? '',
    ];
    if (includeSalary) base.push(r.salaryPkr !== null ? String(r.salaryPkr) : '');
    return base;
  });

  return stringify([header, ...records]);
}

/**
 * Column set for the employee export, shared by CSV / Excel / PDF via
 * the Report Service. Salary is appended only when the caller is
 * allowed to see it.
 */
export function employeeReportData(
  rows: ExportRowInput[],
  includeSalary: boolean,
  generatedAt: Date,
): ReportData {
  const columns: ReportColumn[] = [
    { key: 'eid', header: 'EID', weight: 1 },
    { key: 'fullName', header: 'Name', weight: 2 },
    { key: 'email', header: 'Email', weight: 2.4 },
    { key: 'phone', header: 'Phone', weight: 1.2 },
    { key: 'department', header: 'Department', weight: 1.4 },
    { key: 'designation', header: 'Designation', weight: 1.2 },
    { key: 'status', header: 'Status', weight: 1 },
    { key: 'contractType', header: 'Contract', weight: 1 },
    { key: 'joinDate', header: 'Join date', weight: 1 },
    { key: 'manager', header: 'Manager', weight: 1.6 },
  ];
  if (includeSalary) {
    columns.push({ key: 'salaryPkr', header: 'Salary (PKR)', weight: 1.2, align: 'right' });
  }

  return {
    title: 'Employees',
    subtitle: `${rows.length} ${rows.length === 1 ? 'employee' : 'employees'}`,
    columns,
    generatedAt,
    rows: rows.map((r) => ({
      eid: r.eid,
      fullName: r.fullName,
      email: r.email,
      phone: r.phone ?? '',
      department: r.department,
      designation: r.designation,
      status: r.status,
      contractType: r.contractType,
      joinDate: r.joinDate.toISOString().slice(0, 10),
      manager: r.manager ?? '',
      salaryPkr: includeSalary && r.salaryPkr !== null ? r.salaryPkr : '',
    })),
  };
}
