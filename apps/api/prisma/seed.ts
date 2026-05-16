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

  console.info(`Seed complete.`);
  console.info(`  Super admin email: ${env.SEED_ADMIN_EMAIL}`);
  console.info(`  Statuses: ${STATUSES.length}`);
  console.info(`  Departments: ${DEPARTMENTS.length}`);
  console.info(`  Roles: ${ROLES.length}`);
  console.info(`  Platform permissions: ${PLATFORM_PERMISSIONS.length}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
