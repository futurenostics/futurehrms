# Futurenostics HRMS — Initial Build Prompt for Claude Code

You are building the foundation of an in-house HRMS for Futurenostics. The initial scope is **two modules** — **Commission & Payroll Management** and **HR Increments & Status Reminders** — but the architecture must anticipate the full HRMS (recruitment, attendance, leave, performance, onboarding, expenses, assets, payroll-PK, learning) being added later by other engineers without touching the core.

Two source-of-truth documents are in `/docs`:

- `docs/TDD_Commission_Payroll_System_v2.docx` — Module 1 spec
- `docs/Technical_Specification__Internal_HR_Increments___Status_Reminder_System.docx` — Module 2 spec

Read both end-to-end before you write any code. Treat them as the functional contract. The architectural decisions below override anything in those docs where they conflict (the docs were written per-module; you are building one system).

---

## 1. Non-negotiable architectural principles

1. **Modular monolith, not microservices.** One repo, one deployable, but strict module boundaries enforced in code. We will not split services until we have a reason to.
2. **Module self-registration.** Every domain module exposes a manifest (`routes`, `permissions`, `navItems`, `scheduledJobs`, `eventHandlers`, `prismaSchemaFile`). The core iterates the manifest. Adding a new module = adding a folder, nothing more.
3. **Permission-based RBAC, not role enums.** Roles are rows in the DB, permissions are rows in the DB, both joined. Each module registers its own permissions at boot via a registry. UI for role management is data-driven.
4. **Event bus for cross-module work.** Modules emit domain events (`employee.created`, `employee.status.changed`, `salary.updated`, `commission.month.approved`, `evaluation.completed`). Other modules subscribe. No direct cross-module imports of services. Use an in-process emitter now; the same interface can be swapped for Redis pub/sub or a real bus later.
5. **Versioned business rules.** Every commission rule and HR reminder rule has `effective_from` and `effective_to` timestamps. Processing a historical month uses the rules active on that month's processing date. Never mutate a rule in place — create a new version.
6. **Immutable financial records.** Once a monthly commission run is approved, it is locked. No updates, no deletes, ever. Corrections happen via a new run referencing the old one.
7. **Soft deletes for everything with financial or HR significance.** `deleted_at` column. Never `DELETE FROM` on employees, projects, processing runs, salary history, timeline entries.
8. **Audit log is a first-class table**, not an afterthought. Every write to any audited table generates an `audit_log` entry with actor, before/after JSON, timestamp, IP, user-agent. Implement via Prisma middleware so module authors don't have to remember.
9. **All money in USD as base, with the conversion rate captured at the moment of conversion.** PKR values are computed on display, never stored as the source of truth (except `salary_pkr` on employee, which is the input).
10. **Timezone: Asia/Karachi for all UI display and scheduling.** All timestamps stored in UTC.

---

## 2. Tech stack — use exactly these

| Layer | Choice | Why |
|---|---|---|
| Monorepo | **pnpm workspaces + Turborepo** | Fast, standard, good caching |
| Frontend | **Next.js 14+ App Router, TypeScript** | RSC where it helps, SSR for SEO-free internal apps still gives us fast nav |
| UI kit | **shadcn/ui + Tailwind CSS + Radix primitives** | Owned components, modern, accessible, themable |
| Icons | **lucide-react** | Pairs with shadcn |
| Forms | **react-hook-form + zod** | Schema-first validation, shared with API |
| Data fetching | **TanStack Query** | Caching, mutations, optimistic updates |
| Tables | **TanStack Table** | Headless, fits shadcn pattern |
| Charts | **Recharts** | Sufficient for dashboards |
| Toasts | **sonner** | shadcn-recommended |
| Backend | **NestJS, TypeScript** | Built-in module system, DI, guards, interceptors — maps directly to our modular design |
| ORM | **Prisma** | Type-safe, great migrations |
| Database | **PostgreSQL 16** | |
| Validation | **zod** (shared types package) | Single schema source for FE + BE |
| Background jobs | **BullMQ + Redis** | For HR reminder scheduler and email queue |
| Email | **Nodemailer + Resend** (configurable provider) | Templated via React Email |
| Email templates | **React Email** | JSX-authored, type-safe |
| Excel export | **ExcelJS** | Payoneer CSV + reports |
| PDF export | **@react-pdf/renderer** | Payslip PDFs |
| Auth | **JWT (access + refresh), bcrypt(12), HttpOnly cookies for refresh** | Standard, no third-party dependency |
| Testing | **Vitest** (unit), **Supertest** (API integration), **Playwright** (E2E for critical flows) | |
| Linting | **ESLint + Prettier + TypeScript strict** | |
| Container | **Docker + docker-compose** for local dev | |
| CI | **GitHub Actions** | Lint, typecheck, test on PR |

Do **not** introduce other libraries without first proposing and getting confirmation.

---

## 3. Repository structure

```
futurenostics-hrms/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/               # login, forgot password
│   │   │   ├── (app)/                # authenticated shell with sidebar
│   │   │   │   ├── dashboard/
│   │   │   │   ├── employees/
│   │   │   │   ├── projects/
│   │   │   │   ├── commissions/
│   │   │   │   ├── hr/               # reminders, evaluations, rules
│   │   │   │   ├── reports/
│   │   │   │   ├── settings/         # roles, permissions, departments, designations
│   │   │   │   └── portal/           # employee self-service
│   │   │   └── api/                  # Next route handlers ONLY for FE-specific concerns; main API is NestJS
│   │   ├── components/
│   │   ├── lib/
│   │   └── hooks/
│   └── api/                          # NestJS backend
│       ├── src/
│       │   ├── core/                 # auth, rbac, audit, events, scheduler, email, registry
│       │   ├── modules/
│       │   │   ├── employees/        # HR Core (shared by both modules + all future)
│       │   │   ├── departments/
│       │   │   ├── designations/
│       │   │   ├── timeline/         # Employee lifecycle timeline
│       │   │   ├── projects/         # External / Upwork / B2B
│       │   │   ├── commission-rules/
│       │   │   ├── commissions/      # Monthly processing engine
│       │   │   ├── payroll/          # Payoneer export, disbursement
│       │   │   ├── hr-rules/         # Reminder rules engine
│       │   │   ├── reminders/        # Scheduler + notification dispatch
│       │   │   ├── evaluations/      # Forms + instances
│       │   │   ├── salary-history/
│       │   │   ├── reports/
│       │   │   └── portal/           # Employee self-service endpoints
│       │   └── main.ts
│       └── prisma/
│           ├── schema/               # split per module, merged at build
│           ├── migrations/
│           └── seed.ts
├── packages/
│   ├── db/                           # Prisma client wrapper, shared
│   ├── types/                        # zod schemas, shared TS types
│   ├── ui/                           # shadcn-based shared components (if needed across apps)
│   ├── email-templates/              # React Email
│   ├── config/                       # eslint, tsconfig, tailwind presets
│   └── utils/                        # date, currency, formatters
├── docs/                             # source TDDs + ADRs
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
└── README.md
```

Every module folder in `apps/api/src/modules/` follows the same shape:

```
<module-name>/
├── <module-name>.module.ts          # NestJS module
├── <module-name>.manifest.ts        # Self-registration: permissions, nav, jobs, events
├── <module-name>.controller.ts
├── <module-name>.service.ts
├── dto/                              # zod schemas
├── events/                           # event handlers for events from other modules
├── jobs/                             # BullMQ job processors (if any)
└── tests/
```

---

## 4. Database schema — start here, then extend per module

This is the **HR Core schema** that both modules and every future module will share. Build this first.

```prisma
// Core identity & access
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  employeeId    String?  @unique
  employee      Employee? @relation(fields: [employeeId], references: [id])
  roles         UserRole[]
  isActive      Boolean  @default(true)
  lastLoginAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?
}

model Role {
  id            String   @id @default(cuid())
  name          String   @unique          // e.g. "Super Admin", "HR Admin"
  slug          String   @unique          // e.g. "super_admin"
  description   String?
  isSystem      Boolean  @default(false)  // seeded roles cannot be deleted
  permissions   RolePermission[]
  users         UserRole[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Permission {
  id          String  @id @default(cuid())
  key         String  @unique             // e.g. "commissions:process"
  module      String                       // e.g. "commissions"
  action      String                       // e.g. "process"
  description String?
  roles       RolePermission[]
}

model UserRole {
  userId          String
  roleId          String
  departmentScope String?                 // optional: limits role to one dept
  user            User @relation(fields: [userId], references: [id])
  role            Role @relation(fields: [roleId], references: [id])
  assignedAt      DateTime @default(now())
  @@id([userId, roleId])
}

model RolePermission {
  roleId       String
  permissionId String
  role         Role @relation(fields: [roleId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])
  @@id([roleId, permissionId])
}

// HR Core
model Department {
  id           String   @id @default(cuid())
  name         String   @unique
  slug         String   @unique
  isActive     Boolean  @default(true)
  employees    Employee[]
  designations Designation[]
  createdAt    DateTime @default(now())
  deletedAt    DateTime?
}

model Designation {
  id            String   @id @default(cuid())
  name          String
  departmentId  String
  department    Department @relation(fields: [departmentId], references: [id])
  isActive      Boolean  @default(true)
  employees     Employee[]
  @@unique([name, departmentId])
}

model EmployeeStatus {
  id      String @id @default(cuid())
  name    String @unique   // Intern, Probation, Permanent, Contractor, On Leave, Terminated
  slug    String @unique
  isTerminal Boolean @default(false)
}

model Employee {
  id                  String   @id @default(cuid())
  eid                 String   @unique           // EMP-0001
  fullName            String
  email               String   @unique
  phone               String?
  dateOfBirth         DateTime?
  gender              String?
  cnic                String?  @unique
  joinDate            DateTime
  departmentId        String
  department          Department @relation(fields: [departmentId], references: [id])
  designationId       String
  designation         Designation @relation(fields: [designationId], references: [id])
  statusId            String
  status              EmployeeStatus @relation(fields: [statusId], references: [id])
  contractType        String                     // FullTime, PartTime, Contractor, Intern
  managerId           String?
  manager             Employee? @relation("EmployeeManager", fields: [managerId], references: [id])
  reports             Employee[] @relation("EmployeeManager")
  user                User?
  salaryPkr           Decimal? @db.Decimal(14, 2)
  salaryProcessedExternally Boolean @default(false)
  hasPayoneer         Boolean @default(false)
  payoneerAccountId   String?
  internshipEndDate   DateTime?
  probationEndDate    DateTime?
  biannualReviewEnabled Boolean @default(false)
  annualReviewEnabled   Boolean @default(true)
  lastIncrementDate   DateTime?
  emergencyContact    Json?
  documents           EmployeeDocument[]
  salaryHistory       SalaryHistory[]
  timeline            TimelineEntry[]
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  deletedAt           DateTime?
  @@index([departmentId, statusId])
}

model EmployeeDocument {
  id         String   @id @default(cuid())
  employeeId String
  employee   Employee @relation(fields: [employeeId], references: [id])
  kind       String                              // offer_letter, contract, cnic, etc.
  fileUrl    String
  uploadedAt DateTime @default(now())
}

model SalaryHistory {
  id           String   @id @default(cuid())
  employeeId   String
  employee     Employee @relation(fields: [employeeId], references: [id])
  oldSalaryPkr Decimal? @db.Decimal(14, 2)
  newSalaryPkr Decimal  @db.Decimal(14, 2)
  effectiveDate DateTime
  remarks      String?
  changedBy    String                            // userId
  createdAt    DateTime @default(now())
}

model TimelineEntry {
  id          String   @id @default(cuid())
  employeeId  String
  employee    Employee @relation(fields: [employeeId], references: [id])
  eventType   String                            // joined, status_changed, salary_updated, evaluation_completed, commission_disbursed, document_uploaded, etc.
  module      String                            // which module emitted this
  title       String
  details     Json?
  occurredAt  DateTime
  createdById String?
  createdAt   DateTime @default(now())
  @@index([employeeId, occurredAt])
}

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String?
  module     String
  entity     String                              // table/model name
  entityId   String
  action     String                              // create, update, delete, approve, etc.
  before     Json?
  after      Json?
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())
  @@index([entity, entityId])
  @@index([actorId, createdAt])
}
```

Module-specific schema (projects, commission_rules, monthly_processing, commission_entries, hr_rules, evaluation_template, evaluation_instance, notification_log) is detailed in the two TDDs — implement per-module-folder schema files and merge via Prisma's multi-file schema feature.

---

## 5. Seed data — exact roles & permissions to create on first migration

Seed these six roles. Permissions for each module are registered by that module on boot; the seeder runs after registration to attach them.

| Role | Scope | Description |
|---|---|---|
| `super_admin` | global | Every permission registered in the system + role management |
| `hr_admin` | global | Full HR module: employees, hr-rules, evaluations, timeline, salary-history, departments, designations |
| `finance_manager` | global | Commissions processing, payroll export/disbursement, financial reports, view all employees (read) |
| `department_manager` | scoped by dept | View team employees, approve evaluations for team, view team commissions, create/edit projects for team |
| `team_lead` | scoped by dept | Subset of department_manager: view direct reports, submit evaluations, can be project Communicator/Winner |
| `employee` | self only | Read own portal: own commission history, own payslips, own timeline, own active projects |

Also seed: default departments (Engineering, Business Development, Operations, HR), starter designations per department, default statuses (Intern, Probation, Permanent, Contractor, On Leave, Terminated), and one super_admin user with credentials from `.env` (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`).

---

## 6. Module manifest contract

Every module exports a `manifest.ts`:

```ts
// example: apps/api/src/modules/commissions/commissions.manifest.ts
import { ModuleManifest } from '@/core/registry/types';

export const commissionsManifest: ModuleManifest = {
  key: 'commissions',
  name: 'Commissions',
  permissions: [
    { action: 'view',          description: 'View commission runs' },
    { action: 'process',       description: 'Initiate monthly processing' },
    { action: 'approve',       description: 'Approve a monthly run' },
    { action: 'disburse',      description: 'Trigger disbursement & emails' },
    { action: 'override',      description: 'Override calculated amounts' },
    { action: 'hold_project',  description: 'Place a project on payment hold' },
  ],
  navItems: [
    { label: 'Monthly Processing', path: '/commissions/processing', icon: 'Calculator', requires: 'commissions:view' },
    { label: 'Approvals',          path: '/commissions/approvals',  icon: 'CheckSquare', requires: 'commissions:approve' },
  ],
  scheduledJobs: [],
  eventSubscriptions: [
    { event: 'employee.deactivated', handler: 'onEmployeeDeactivated' },
  ],
};
```

The core registry collects these at app boot and:
- inserts missing permissions into the DB,
- builds the frontend nav from `navItems` filtered by the current user's permissions,
- registers BullMQ schedules from `scheduledJobs`,
- wires event subscriptions.

---

## 7. Module-by-module build order

Build in this order. Each step ends with a working, demoable slice.

### Phase 0 — Foundation (do this first, top to bottom, no shortcuts)
1. Monorepo scaffold (pnpm + Turborepo, all packages stubbed).
2. Docker-compose with Postgres + Redis.
3. NestJS app skeleton with `core/` modules: `AuthModule`, `RbacModule`, `AuditModule` (Prisma middleware), `EventBusModule`, `SchedulerModule`, `EmailModule`, `RegistryModule`.
4. Next.js app skeleton with shadcn/ui installed, theme tokens defined, auth layout + app shell layout (sidebar + topbar + breadcrumbs + user menu).
5. Auth flow end-to-end: login, JWT issue/refresh, route guards, permission guard decorator (`@RequirePermission('commissions:approve')`), useUser/usePermissions hooks on the frontend.
6. Settings → Roles & Permissions UI (data-driven from the registry).
7. Settings → Departments & Designations CRUD.

### Phase 1 — HR Core
8. Employees module: CRUD, list with filters, profile page with tabs (Personal, Job, Salary History, Timeline, Documents, Evaluations placeholder).
9. SalaryHistory: auto-recorded whenever `salaryPkr` changes via Prisma middleware; UI sub-panel on profile.
10. TimelineEntry: subscribe to `employee.created`, `employee.status.changed`, `employee.salary.updated`, `employee.document.uploaded`. Render as a vertical timeline on the profile page.
11. Org chart view (read from `managerId` self-reference); render with `react-flow` or a simple recursive tree component.
12. Employee bulk CSV import (parse → validate per row with zod → preview → commit).

### Phase 2 — Module 1: Commission & Payroll
13. Projects module: External, Upwork, B2B with the polymorphic pattern from the TDD. Step-1 category modal → category-specific forms. Commission preview computed live by calling the rules engine in `preview` mode.
14. Commission Rules module: versioned rules, UI table grouped by department × category, edit flow creates a new version (never mutates), audit log of changes.
15. Monthly Processing: three tabs (External / Upwork / B2B), leave-prorated math, project hold toggle with mandatory reason, carry-forward flag, consolidated draft view, approve & lock flow, disburse action.
16. Payoneer CSV export (exact format — confirm spec with HR before coding the columns).
17. PDF payslip generation per employee per approved month.
18. Email dispatch on disbursement (queued via BullMQ, templated via React Email, logged in `email_logs`).
19. Employee self-service portal: own commission history, own payslip download, own active projects, own timeline.

### Phase 3 — Module 2: HR Increments & Reminders
20. EmployeeStatus values from TDD2 seeded (Intern, Probation, Permanent, Contract). Wire to Employee.
21. HR Rules module: per-department rules with event types (Birthday, Anniversary, InternshipEnd, ProbationEnd, BiannualReview, AnnualReview, CustomDate), lead time, conditional fields, active toggle. "Duplicate rules from another department" action.
22. Reminder Scheduler: BullMQ cron job that runs daily at 06:00 Asia/Karachi. For each active rule, find matching employees, check if event date is within `lead_time_days`, dispatch notifications, log to `notification_log`.
23. Evaluation Templates: HR creates form templates (JSON-defined fields — text, rating, dropdown, textarea). UI form builder is nice-to-have for V1; HTML form per template is fine.
24. Evaluation Instances: triggered by reminder rule or manually by HR. Email link to assigned manager with magic-token form access. On submission, results saved, timeline entry created, reminder loop stops.
25. Auto-retry reminders for incomplete evaluations past due date.
26. HR Dashboard: upcoming tasks (probations ending, reviews due, birthdays this month), recent activity, pending evaluations.
27. Monthly birthday report (auto-email on the 1st of each month to HR).

### Phase 4 — Reports & polish
28. Reports module: all reports listed in TDD1 §7.1 + HR reports (salary increase log, evaluation completion rates, status change log). Excel + PDF.
29. Management dashboard (TDD1 §9): KPI cards, monthly commission trend, revenue by category, top earners, BD performance.
30. Global search (Cmd+K via `cmdk`): jump to any employee, project, processing run.
31. Dark mode (already supported by shadcn — just expose the toggle).
32. Accessibility pass: keyboard nav, focus management, ARIA labels, color contrast.

---

## 8. Design system & UX guidelines

This will be used by the company internally — make it feel like a calm, professional tool, not a flashy SaaS landing page.

- **Layout:** sidebar (collapsible, with module groups), top bar (breadcrumbs, search, notifications, user menu), main content area with consistent page header pattern (title + description + primary action button on the right).
- **Spacing:** Tailwind default scale. Page padding `p-6` to `p-8`. Card padding `p-6`. Section gap `gap-6`.
- **Typography:** Inter font. `text-2xl font-semibold` for page titles, `text-lg font-medium` for section titles, `text-sm` for body, `text-xs text-muted-foreground` for metadata.
- **Color:** shadcn neutral theme as base. Accent color: Futurenostics brand color (ask user to provide; default to a deep blue `hsl(221 83% 53%)` for now). Status colors: green (active/approved), amber (pending/hold), red (terminated/overdue), blue (info).
- **Data display:** TanStack Table with sticky header, row hover, zebra optional, column visibility toggle, server-side pagination + filtering + sorting for any list expected to exceed 100 rows. Empty states with illustration + CTA.
- **Forms:** vertical, label above input, helper text below, inline error in red below the field, submit button right-aligned in a footer that becomes sticky on long forms. Use `react-hook-form` + zod resolver. Never silently truncate — show validation errors clearly.
- **Money:** always show currency code (USD / PKR), use `Intl.NumberFormat`, two decimals, monospace tabular numbers (`font-variant-numeric: tabular-nums`).
- **Dates:** display `dd MMM yyyy` (e.g., `15 May 2026`). Always show in Asia/Karachi. Use `date-fns` + `date-fns-tz`.
- **Toasts:** sonner. Success = green, error = red, info = neutral. Position bottom-right. 4s duration.
- **Modals:** shadcn Dialog. Use for confirmations and short forms. Use a side Sheet for longer forms (employee edit, project edit).
- **Loading:** skeletons on initial load (not spinners). Inline button loading states.
- **Error states:** every async surface must handle loading, empty, and error. Errors show a retry button.
- **Confirmations:** any destructive or irreversible action (disburse, approve, soft-delete) requires a typed confirmation ("type APPROVE to continue") or a checkbox + button combo, not just a "Yes" button.
- **Mobile:** layouts must be usable down to 768px. Below that, prioritize the portal (employee view) and dashboard.

---

## 9. Coding standards

- TypeScript strict mode on everywhere. No `any` without a `// eslint-disable-next-line` and a comment explaining why.
- Backend service methods return DTOs, not Prisma models, to avoid leaking the schema shape to the API.
- API responses are always `{ data, meta? }` for success and `{ error: { code, message, details? } }` for errors. Status codes used correctly.
- Zod schemas live in `packages/types` and are imported by both apps. One schema per entity, with `.create`, `.update`, `.public` variants.
- All money is `Decimal` (Prisma) on the wire and `string` in JSON to avoid float drift; convert to `number` only at the very last UI step via `Intl.NumberFormat`.
- All currency math runs through a `Money` util that uses `decimal.js`. Never use `Number` for money.
- Date math via `date-fns`. Never use native `Date` arithmetic.
- Every controller method has a permission guard. Every list endpoint supports `page`, `pageSize`, `sort`, `filter[field]=value`, `q` for search.
- Every long-running action (processing, exports, emails) is queued via BullMQ, not done in the request thread.
- Tests: unit tests for the commission engine (every project type, leave deduction edge cases, hold/carry-forward), the reminder scheduler (each event type, lead-time boundary cases), and the RBAC guard. Integration tests for the auth flow, employee CRUD, and one full monthly processing run end-to-end. Aim for 70%+ on the commission and rule engines; the rest is nice-to-have.

---

## 10. Things to ask the user before building

These have unresolved decisions in the TDDs (TDD1 §14 lists them). When you reach a phase that depends on one, surface the question — don't guess:

- Exact Payoneer CSV column spec (request a sample).
- Final BD commission amounts for Associate / Lead / Manager on each project type (TDD1 §5.2.1 has draft values — confirm).
- B2B BD commission structure (not defined in TDD1).
- Full list of engineering designations and their B2B commission values.
- Upwork profiles to be tracked (list).
- Email template branding (logo, footer, primary color).
- Whether to import historical Excel data; if yes, request the cleaned files.
- The exact "Johnny + Michele" sub-category rule.
- For HR Rules: confirm the list of default departments and their initial probation/review rules (TDD2 mentions Engineering and Digital Commerce as examples).

---

## 11. Deliverable expectations per phase

Each phase ends with:
1. All code merged into `main` behind a feature flag if not yet usable end-to-end.
2. A short demo recording or screenshot set in `docs/demos/phase-N/`.
3. Updated README with how to run the new functionality locally.
4. An ADR file in `docs/adr/` if a non-obvious decision was made.
5. Migrations created and reversible.
6. Seeders updated if new reference data is needed.

---

## 12. What to do now

Start with **Phase 0**. Before writing code, produce these and post them for review:

1. The final repo file tree (after `pnpm create` of the workspace).
2. The full Phase-0 Prisma schema as a single migration plan.
3. The full list of seeded permissions (predict what each module will register, even if not built yet).
4. The shadcn component install list and the theme configuration.
5. A short ADR explaining the modular-monolith + manifest approach for new engineers joining the team.

Then implement Phase 0 in order. After Phase 0 lands and is reviewed, proceed to Phase 1.

Read both TDDs in `/docs` now. Confirm you've read them by quoting one specific commission rule from TDD1 and one specific reminder rule example from TDD2 in your reply, then ask any clarifying questions you have before writing code.