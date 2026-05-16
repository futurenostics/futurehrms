/**
 * Seed the database with baseline reference data + one super admin.
 *
 * Idempotent — re-running upserts everything. Run with:
 *   pnpm db:seed
 *
 * Order matters because of foreign-key constraints:
 *   1. EmployeeStatus (referenced by Employee)
 *   2. Department (referenced by Designation, Employee)
 *   3. Designation (referenced by Employee)
 *   4. Role (referenced by UserRole, RolePermission)
 *   5. Permission (referenced by RolePermission)
 *   6. RolePermission attachments
 *   7. Super-admin User + UserRole
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { parseEnv } from '../src/config/env.schema';

const prisma = new PrismaClient();

const STATUSES = [
  { slug: 'intern', name: 'Intern', isTerminal: false },
  { slug: 'probation', name: 'Probation', isTerminal: false },
  { slug: 'permanent', name: 'Permanent', isTerminal: false },
  { slug: 'contractor', name: 'Contractor', isTerminal: false },
  { slug: 'on-leave', name: 'On Leave', isTerminal: false },
  { slug: 'terminated', name: 'Terminated', isTerminal: true },
];

const DEPARTMENTS = [
  {
    slug: 'engineering',
    name: 'Engineering',
    designations: ['Software Engineer', 'Senior Software Engineer', 'Engineering Lead', 'CTO'],
  },
  {
    slug: 'business-development',
    name: 'Business Development',
    designations: ['BD Associate', 'BD Lead', 'BD Manager', 'Head of BD'],
  },
  {
    slug: 'operations',
    name: 'Operations',
    designations: ['Operations Associate', 'Operations Manager', 'COO'],
  },
  {
    slug: 'hr',
    name: 'HR',
    designations: ['HR Associate', 'HR Manager', 'Head of People'],
  },
];

const ROLES = [
  {
    slug: 'super_admin',
    name: 'Super Admin',
    description: 'Full system access — manages roles, permissions, and every module.',
    isSystem: true,
  },
  {
    slug: 'hr_admin',
    name: 'HR Admin',
    description: 'Manages employees, departments, designations, HR rules, and evaluations.',
    isSystem: true,
  },
  {
    slug: 'finance_manager',
    name: 'Finance Manager',
    description: 'Runs commissions, payroll, exports, and financial reports.',
    isSystem: true,
  },
  {
    slug: 'department_manager',
    name: 'Department Manager',
    description: 'Manages a single department — team employees, projects, evaluations.',
    isSystem: true,
  },
  {
    slug: 'team_lead',
    name: 'Team Lead',
    description: 'Subset of department-manager scope — direct reports and submissions.',
    isSystem: true,
  },
  {
    slug: 'employee',
    name: 'Employee',
    description: 'Self-service portal access — own payslips, commissions, timeline.',
    isSystem: true,
  },
];

/**
 * Platform-level permissions for Phase 0 (Settings module).
 *
 * Domain-module permissions (commissions:*, payroll:*, hr-rules:*) are
 * registered at boot by their respective modules via the manifest — not
 * seeded here. The role-management UI lets admins attach those to roles
 * once the modules ship.
 */
const PLATFORM_PERMISSIONS = [
  { module: 'settings', action: 'roles:view', description: 'View roles' },
  { module: 'settings', action: 'roles:manage', description: 'Create and edit roles' },
  { module: 'settings', action: 'permissions:view', description: 'View permissions catalog' },
  { module: 'settings', action: 'departments:view', description: 'View departments' },
  { module: 'settings', action: 'departments:manage', description: 'Create and edit departments' },
  { module: 'settings', action: 'designations:view', description: 'View designations' },
  {
    module: 'settings',
    action: 'designations:manage',
    description: 'Create and edit designations',
  },
  { module: 'settings', action: 'users:view', description: 'View user accounts' },
  { module: 'settings', action: 'users:manage', description: 'Create, deactivate, reset users' },
  { module: 'audit', action: 'view', description: 'View audit log' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  // super_admin gets every permission — populated dynamically below.
  super_admin: [],
  hr_admin: [
    'settings:departments:view',
    'settings:departments:manage',
    'settings:designations:view',
    'settings:designations:manage',
    'settings:users:view',
    'audit:view',
  ],
  finance_manager: ['settings:users:view', 'audit:view'],
  department_manager: [
    'settings:departments:view',
    'settings:designations:view',
    'settings:users:view',
  ],
  team_lead: ['settings:departments:view', 'settings:designations:view'],
  employee: [],
};

async function main(): Promise<void> {
  const env = parseEnv(process.env);

  console.info('Seeding employee statuses...');
  for (const status of STATUSES) {
    await prisma.employeeStatus.upsert({
      where: { slug: status.slug },
      create: status,
      update: { name: status.name, isTerminal: status.isTerminal },
    });
  }

  console.info('Seeding departments and designations...');
  for (const dept of DEPARTMENTS) {
    const department = await prisma.department.upsert({
      where: { slug: dept.slug },
      create: { slug: dept.slug, name: dept.name },
      update: { name: dept.name },
    });
    for (const designationName of dept.designations) {
      await prisma.designation.upsert({
        where: { name_departmentId: { name: designationName, departmentId: department.id } },
        create: { name: designationName, departmentId: department.id },
        update: {},
      });
    }
  }

  console.info('Seeding platform permissions...');
  for (const perm of PLATFORM_PERMISSIONS) {
    const key = `${perm.module}:${perm.action}`;
    await prisma.permission.upsert({
      where: { key },
      create: { key, module: perm.module, action: perm.action, description: perm.description },
      update: { description: perm.description },
    });
  }

  console.info('Seeding roles...');
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      create: role,
      update: { name: role.name, description: role.description, isSystem: role.isSystem },
    });
  }

  console.info('Attaching permissions to roles...');
  const allPermissions = await prisma.permission.findMany({ select: { id: true, key: true } });
  const permByKey = new Map(allPermissions.map((p) => [p.key, p.id]));

  // super_admin gets every permission currently in the DB.
  ROLE_PERMISSIONS.super_admin = allPermissions.map((p) => p.key);

  for (const role of ROLES) {
    const roleRow = await prisma.role.findUnique({ where: { slug: role.slug } });
    if (!roleRow) continue;
    const keys = ROLE_PERMISSIONS[role.slug] ?? [];
    for (const key of keys) {
      const permissionId = permByKey.get(key);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roleRow.id, permissionId } },
        create: { roleId: roleRow.id, permissionId },
        update: {},
      });
    }
  }

  console.info('Seeding super-admin user...');
  const passwordHash = await argon2.hash(env.SEED_ADMIN_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const superAdminUser = await prisma.user.upsert({
    where: { email: env.SEED_ADMIN_EMAIL.toLowerCase() },
    create: {
      email: env.SEED_ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      isActive: true,
    },
    update: { isActive: true },
  });

  const superAdminRole = await prisma.role.findUnique({ where: { slug: 'super_admin' } });
  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: superAdminUser.id, roleId: superAdminRole.id } },
      create: { userId: superAdminUser.id, roleId: superAdminRole.id },
      update: {},
    });
  }

  console.info('Seeding sample employees + linked users...');
  const employeesCreated = await seedSampleEmployees(superAdminUser.id, passwordHash);

  console.info(`Seed complete.`);
  console.info(`  Super admin email: ${env.SEED_ADMIN_EMAIL}`);
  console.info(`  Statuses: ${STATUSES.length}`);
  console.info(`  Departments: ${DEPARTMENTS.length}`);
  console.info(`  Roles: ${ROLES.length}`);
  console.info(`  Platform permissions: ${PLATFORM_PERMISSIONS.length}`);
  console.info(`  Sample employees: ${employeesCreated}`);
}

/* ---------- Sample employees ---------- */

interface SampleEmployee {
  fullName: string;
  email: string;
  deptSlug: string;
  designation: string;
  statusSlug: string;
  contractType: 'FullTime' | 'PartTime' | 'Contractor' | 'Intern';
  joinDate: string;
  salaryPkr: number;
  managerEmail: string | null;
  /** When set, also create a User account with the given role(s). */
  user?: {
    roles: string[];
    /** When the role is department_manager / team_lead, the dept slug to scope. */
    scopeDeptSlug?: string;
  };
}

const SAMPLE_EMPLOYEES: SampleEmployee[] = [
  // Engineering (12) — Maria → (Asma | Faisal) → engineers/interns
  {
    fullName: 'Maria Tanveer',
    email: 'maria.tanveer@futurenostics.local',
    deptSlug: 'engineering',
    designation: 'CTO',
    statusSlug: 'permanent',
    contractType: 'FullTime',
    joinDate: '2022-01-15',
    salaryPkr: 800000,
    managerEmail: null,
  },
  {
    fullName: 'Asma Ali',
    email: 'asma.ali@futurenostics.local',
    deptSlug: 'engineering',
    designation: 'Engineering Lead',
    statusSlug: 'permanent',
    contractType: 'FullTime',
    joinDate: '2022-03-01',
    salaryPkr: 450000,
    managerEmail: 'maria.tanveer@futurenostics.local',
    user: { roles: ['department_manager'], scopeDeptSlug: 'engineering' },
  },
  {
    fullName: 'Faisal Hussain',
    email: 'faisal.hussain@futurenostics.local',
    deptSlug: 'engineering',
    designation: 'Engineering Lead',
    statusSlug: 'permanent',
    contractType: 'FullTime',
    joinDate: '2022-04-10',
    salaryPkr: 430000,
    managerEmail: 'maria.tanveer@futurenostics.local',
  },
  {
    fullName: 'Bilal Khan',
    email: 'bilal.khan@futurenostics.local',
    deptSlug: 'engineering',
    designation: 'Senior Software Engineer',
    statusSlug: 'permanent',
    contractType: 'FullTime',
    joinDate: '2023-02-15',
    salaryPkr: 280000,
    managerEmail: 'asma.ali@futurenostics.local',
  },
  {
    fullName: 'Hira Mahmood',
    email: 'hira.mahmood@futurenostics.local',
    deptSlug: 'engineering',
    designation: 'Senior Software Engineer',
    statusSlug: 'permanent',
    contractType: 'FullTime',
    joinDate: '2023-05-20',
    salaryPkr: 265000,
    managerEmail: 'asma.ali@futurenostics.local',
  },
  {
    fullName: 'Zara Saleem',
    email: 'zara.saleem@futurenostics.local',
    deptSlug: 'engineering',
    designation: 'Software Engineer',
    statusSlug: 'permanent',
    contractType: 'FullTime',
    joinDate: '2024-01-10',
    salaryPkr: 175000,
    managerEmail: 'asma.ali@futurenostics.local',
  },
  {
    fullName: 'Omar Sheikh',
    email: 'omar.sheikh@futurenostics.local',
    deptSlug: 'engineering',
    designation: 'Software Engineer',
    statusSlug: 'permanent',
    contractType: 'FullTime',
    joinDate: '2024-03-25',
    salaryPkr: 165000,
    managerEmail: 'asma.ali@futurenostics.local',
  },
  {
    fullName: 'Maryam Iqbal',
    email: 'maryam.iqbal@futurenostics.local',
    deptSlug: 'engineering',
    designation: 'Software Engineer',
    statusSlug: 'permanent',
    contractType: 'FullTime',
    joinDate: '2024-06-01',
    salaryPkr: 150000,
    managerEmail: 'faisal.hussain@futurenostics.local',
    user: { roles: ['employee'] },
  },
  {
    fullName: 'Junaid Akhtar',
    email: 'junaid.akhtar@futurenostics.local',
    deptSlug: 'engineering',
    designation: 'Software Engineer',
    statusSlug: 'probation',
    contractType: 'FullTime',
    joinDate: '2025-12-15',
    salaryPkr: 130000,
    managerEmail: 'faisal.hussain@futurenostics.local',
  },
  {
    fullName: 'Sara Nadeem',
    email: 'sara.nadeem@futurenostics.local',
    deptSlug: 'engineering',
    designation: 'Software Engineer',
    statusSlug: 'probation',
    contractType: 'FullTime',
    joinDate: '2026-01-20',
    salaryPkr: 125000,
    managerEmail: 'faisal.hussain@futurenostics.local',
  },
  {
    fullName: 'Ahmed Raza',
    email: 'ahmed.raza@futurenostics.local',
    deptSlug: 'engineering',
    designation: 'Software Engineer',
    statusSlug: 'intern',
    contractType: 'Intern',
    joinDate: '2026-03-01',
    salaryPkr: 60000,
    managerEmail: 'faisal.hussain@futurenostics.local',
  },
  {
    fullName: 'Imran Yousaf',
    email: 'imran.yousaf@futurenostics.local',
    deptSlug: 'engineering',
    designation: 'Software Engineer',
    statusSlug: 'intern',
    contractType: 'Intern',
    joinDate: '2026-04-01',
    salaryPkr: 55000,
    managerEmail: 'asma.ali@futurenostics.local',
  },

  // Business Development (4)
  {
    fullName: 'Adnan Bhatti',
    email: 'adnan.bhatti@futurenostics.local',
    deptSlug: 'business-development',
    designation: 'Head of BD',
    statusSlug: 'permanent',
    contractType: 'FullTime',
    joinDate: '2022-02-01',
    salaryPkr: 600000,
    managerEmail: null,
  },
  {
    fullName: 'Sana Akram',
    email: 'sana.akram@futurenostics.local',
    deptSlug: 'business-development',
    designation: 'BD Manager',
    statusSlug: 'permanent',
    contractType: 'FullTime',
    joinDate: '2023-04-15',
    salaryPkr: 320000,
    managerEmail: 'adnan.bhatti@futurenostics.local',
    user: { roles: ['department_manager'], scopeDeptSlug: 'business-development' },
  },
  {
    fullName: 'Talha Ahmed',
    email: 'talha.ahmed@futurenostics.local',
    deptSlug: 'business-development',
    designation: 'BD Lead',
    statusSlug: 'permanent',
    contractType: 'FullTime',
    joinDate: '2024-02-01',
    salaryPkr: 180000,
    managerEmail: 'sana.akram@futurenostics.local',
  },
  {
    fullName: 'Ayesha Malik',
    email: 'ayesha.malik@futurenostics.local',
    deptSlug: 'business-development',
    designation: 'BD Associate',
    statusSlug: 'probation',
    contractType: 'FullTime',
    joinDate: '2025-11-10',
    salaryPkr: 100000,
    managerEmail: 'sana.akram@futurenostics.local',
  },

  // Operations (2)
  {
    fullName: 'Hassan Riaz',
    email: 'hassan.riaz@futurenostics.local',
    deptSlug: 'operations',
    designation: 'COO',
    statusSlug: 'permanent',
    contractType: 'FullTime',
    joinDate: '2022-01-15',
    salaryPkr: 700000,
    managerEmail: null,
  },
  {
    fullName: 'Noor ul Ain',
    email: 'noor.ulain@futurenostics.local',
    deptSlug: 'operations',
    designation: 'Operations Manager',
    statusSlug: 'permanent',
    contractType: 'FullTime',
    joinDate: '2023-06-01',
    salaryPkr: 310000,
    managerEmail: 'hassan.riaz@futurenostics.local',
  },

  // HR (2) — Rida is the de-facto HR Admin
  {
    fullName: 'Rida Hashmi',
    email: 'rida.hashmi@futurenostics.local',
    deptSlug: 'hr',
    designation: 'Head of People',
    statusSlug: 'permanent',
    contractType: 'FullTime',
    joinDate: '2022-02-15',
    salaryPkr: 550000,
    managerEmail: null,
    user: { roles: ['hr_admin'] },
  },
  {
    fullName: 'Asif Mehmood',
    email: 'asif.mehmood@futurenostics.local',
    deptSlug: 'hr',
    designation: 'HR Manager',
    statusSlug: 'permanent',
    contractType: 'FullTime',
    joinDate: '2023-08-20',
    salaryPkr: 300000,
    managerEmail: 'rida.hashmi@futurenostics.local',
  },
];

/** Past salary changes for a handful of employees, for the history tab. */
const PAST_INCREMENTS: Array<{
  email: string;
  effectiveDate: string;
  fromSalaryPkr: number;
  remarks: string;
}> = [
  {
    email: 'asma.ali@futurenostics.local',
    effectiveDate: '2024-07-01',
    fromSalaryPkr: 380000,
    remarks: 'Annual increment — promoted to Eng Lead.',
  },
  {
    email: 'bilal.khan@futurenostics.local',
    effectiveDate: '2025-02-15',
    fromSalaryPkr: 230000,
    remarks: 'Annual increment.',
  },
  {
    email: 'hira.mahmood@futurenostics.local',
    effectiveDate: '2025-05-20',
    fromSalaryPkr: 220000,
    remarks: 'Promoted to Senior Software Engineer.',
  },
  {
    email: 'sana.akram@futurenostics.local',
    effectiveDate: '2025-04-15',
    fromSalaryPkr: 270000,
    remarks: 'Annual increment.',
  },
];

async function seedSampleEmployees(
  superAdminUserId: string,
  sharedPasswordHash: string,
): Promise<number> {
  const departments = await prisma.department.findMany();
  const designations = await prisma.designation.findMany();
  const statuses = await prisma.employeeStatus.findMany();
  const roles = await prisma.role.findMany();

  const deptBySlug = new Map(departments.map((d) => [d.slug, d]));
  const statusBySlug = new Map(statuses.map((s) => [s.slug, s]));
  const designKey = (name: string, deptId: string) => `${name}|${deptId}`;
  const designBySlugName = new Map(designations.map((d) => [designKey(d.name, d.departmentId), d]));
  const roleBySlug = new Map(roles.map((r) => [r.slug, r]));

  // Pass 1: upsert employees (without manager) so they all exist.
  let created = 0;
  for (const sample of SAMPLE_EMPLOYEES) {
    const dept = deptBySlug.get(sample.deptSlug);
    const design = dept ? designBySlugName.get(designKey(sample.designation, dept.id)) : null;
    const status = statusBySlug.get(sample.statusSlug);
    if (!dept || !design || !status) {
      console.warn(
        `Skipping ${sample.email}: missing reference (dept=${!!dept}, design=${!!design}, status=${!!status})`,
      );
      continue;
    }

    const existing = await prisma.employee.findUnique({ where: { email: sample.email } });
    if (existing) continue;

    // Assign sequential EIDs by counting existing employees.
    const count = await prisma.employee.count();
    const eid = `EMP-${String(count + 1).padStart(4, '0')}`;

    await prisma.employee.create({
      data: {
        eid,
        fullName: sample.fullName,
        email: sample.email,
        joinDate: new Date(sample.joinDate),
        departmentId: dept.id,
        designationId: design.id,
        statusId: status.id,
        contractType: sample.contractType,
        salaryPkr: sample.salaryPkr,
      },
    });
    created += 1;
  }

  // Pass 2: wire managers now that every email exists.
  const allEmployees = await prisma.employee.findMany({ select: { id: true, email: true } });
  const empByEmail = new Map(allEmployees.map((e) => [e.email, e]));
  for (const sample of SAMPLE_EMPLOYEES) {
    if (!sample.managerEmail) continue;
    const employee = empByEmail.get(sample.email);
    const manager = empByEmail.get(sample.managerEmail);
    if (!employee || !manager) continue;
    await prisma.employee.update({
      where: { id: employee.id },
      data: { managerId: manager.id },
    });
  }

  // Pass 3: link User accounts where requested.
  for (const sample of SAMPLE_EMPLOYEES) {
    if (!sample.user) continue;
    const employee = empByEmail.get(sample.email);
    if (!employee) continue;

    const user = await prisma.user.upsert({
      where: { email: sample.email },
      create: {
        email: sample.email,
        passwordHash: sharedPasswordHash,
        employeeId: employee.id,
        isActive: true,
      },
      update: { employeeId: employee.id, isActive: true },
    });

    for (const roleSlug of sample.user.roles) {
      const role = roleBySlug.get(roleSlug);
      if (!role) continue;
      const scopeDeptId = sample.user.scopeDeptSlug
        ? (deptBySlug.get(sample.user.scopeDeptSlug)?.id ?? null)
        : null;
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        create: { userId: user.id, roleId: role.id, departmentScope: scopeDeptId },
        update: { departmentScope: scopeDeptId },
      });
    }
  }

  // Pass 4: past salary changes so the history tab has data.
  for (const increment of PAST_INCREMENTS) {
    const employee = empByEmail.get(increment.email);
    if (!employee) continue;
    const existingHistory = await prisma.salaryHistory.count({
      where: { employeeId: employee.id, effectiveDate: new Date(increment.effectiveDate) },
    });
    if (existingHistory > 0) continue;

    const current = await prisma.employee.findUnique({ where: { id: employee.id } });
    if (!current?.salaryPkr) continue;

    await prisma.salaryHistory.create({
      data: {
        employeeId: employee.id,
        oldSalaryPkr: increment.fromSalaryPkr,
        newSalaryPkr: current.salaryPkr,
        effectiveDate: new Date(increment.effectiveDate),
        remarks: increment.remarks,
        changedBy: superAdminUserId,
      },
    });
  }

  return created;
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
