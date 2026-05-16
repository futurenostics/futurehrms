# Futurenostics HRMS — Phase 0 Bootstrap Prompt

You are starting a new project — the Futurenostics HRMS — and this is the **Phase 0** session. Your job in this session is **scaffolding only**. Do not build business features. By the end of this session, the foundation must be solid enough that every subsequent phase (Employee module, Commissions, Payroll, etc.) can be built without re-doing setup work.

The full architectural specification lives in `docs/prompts/`:

- `CLAUDE_CODE_PROMPT.md` — master architecture (read this first, end to end)
- `CLAUDE_CODE_PROMPT_ADDENDUM.md` — Approvals, Leave, Attendance, Holidays, Org Settings
- `CLAUDE_CODE_PROMPT_ADDENDUM_2.md` — Overtime module, PKR Payroll foundation, extended Leave rules

Design reference lives in `docs/design/`:

- `docs/design/screens/*.jsx` — visual reference files from Claude Design. **These are NOT source code. They are visual reference.** Implementations use shadcn primitives styled to match.
- `docs/design/screenshots/*` — PNG screenshots of every designed surface, organized by module.
- `docs/design/tokens/tokens.jsx` — the source of design tokens (Poppins font, OKLCH colors, indigo-violet accent, mint/teal/amber/coral semantic colors, light + dark mode).
- `docs/design/briefs/*.md` — Claude Design briefs for each surface (29+ briefs).
- `docs/design/README.md` — read this before touching the design files.

Read all of `docs/prompts/CLAUDE_CODE_PROMPT.md` end to end before writing any code. Confirm by stating the three core architectural principles (modular monolith, manifest self-registration, permission-based RBAC) before proceeding.

---

## Phase 0 Scope (exactly this — no more, no less)

1. Initialize the monorepo (pnpm + Turborepo).
2. Scaffold the two applications: `apps/web` (Next.js 15 App Router) and `apps/api` (NestJS 10).
3. Create the shared packages: `packages/db`, `packages/types`, `packages/ui`, `packages/config`, `packages/email`, `packages/storage`.
4. Set up the local development environment via docker-compose (Postgres 16, Redis, MinIO, Mailpit).
5. Configure TypeScript strict mode across all packages, ESLint + Prettier, Husky + lint-staged + commitlint.
6. Wire the design tokens from `docs/design/tokens/tokens.jsx` into Tailwind config and shadcn theme.
7. Install shadcn/ui and add the core primitives we'll need (list below).
8. Set up the core Prisma schema for the **HR Core** tables only (User, Role, Permission, UserRole, RolePermission, Department, Designation, EmployeeStatus, Employee, EmployeeDocument, SalaryHistory, TimelineEntry, AuditLog).
9. Implement the core NestJS modules: AuthModule, RbacModule, AuditModule, EventBusModule, SchedulerModule, EmailModule, StorageModule, RegistryModule.
10. Build the **manifest self-registration** system: every domain module exports a manifest; the core boots them up.
11. Wire up the audit log via Prisma middleware so every write to audited tables auto-logs.
12. Build a working **login → dashboard placeholder** loop that proves the foundation works:
    - `/login` page styled to match `docs/design/screens/login.jsx`
    - JWT auth (access + refresh, HttpOnly cookies for refresh)
    - `/dashboard` page rendering an empty dashboard shell with the sidebar from `docs/design/shared/chrome.jsx`
    - A single placeholder widget on the dashboard saying "Hello, [user name]"
    - Logout flow that clears tokens
13. Seed: one super_admin user with credentials from `.env`, six baseline roles (super_admin, hr_admin, finance_manager, department_manager, team_lead, employee), seeded permissions, four baseline departments (Engineering, Business Development, Operations, HR), starter designations, baseline employee statuses (Intern, Probation, Permanent, Contractor, On Leave, Terminated).
14. Basic GitHub Actions CI: lint, typecheck, test on every PR.
15. Write the ADR for "modular monolith + manifest self-registration" in `docs/adr/0001-modular-monolith-manifest-pattern.md`.
16. Update the root `README.md` with how to run the project locally.

**Do not** build the Employees CRUD UI, the Org Chart, the Projects module, or any other business feature. That's Phase 1+.

---

## Exact stack — use these, do not substitute

| Layer | Choice | Version |
|---|---|---|
| Node | LTS | 22.x (pin in `.nvmrc` and `engines`) |
| Package manager | pnpm | 9.x |
| Monorepo orchestrator | Turborepo | latest |
| Frontend | Next.js | 15.x App Router |
| Backend | NestJS | 10.x |
| Language | TypeScript | 5.x strict |
| ORM | Prisma | 5.x |
| Database | PostgreSQL | 16 |
| Cache / Queue | Redis | 7 |
| Object storage | MinIO | latest |
| Email (dev) | Mailpit | latest |
| Email (prod-ready library) | Nodemailer + Resend SDK (configurable) | latest |
| UI library | shadcn/ui | latest, NY style |
| Styling | Tailwind CSS | v4 (with OKLCH support) |
| Icons | lucide-react | latest |
| Forms | react-hook-form + zod | latest |
| Data fetching | TanStack Query | v5 |
| Tables | TanStack Table | v8 |
| Charts | Recharts | latest |
| Toasts | sonner | latest |
| Background jobs | BullMQ | latest |
| Email templates | React Email | latest |
| Excel | ExcelJS | latest |
| PDF (React) | @react-pdf/renderer | latest |
| PDF (Puppeteer for Markdown→PDF) | playwright (browser=chromium) | latest — defer install until needed by Documents module |
| Validation | zod | latest |
| Auth | jose (JWT lib) | latest |
| Password hashing | argon2 | latest (preferred over bcrypt for new projects) |
| Testing | Vitest + Supertest + Playwright | latest |
| Linting | ESLint + Prettier | latest |
| Git hooks | Husky + lint-staged + commitlint | latest |
| CI | GitHub Actions | — |

Do not introduce other libraries without asking.

---

## Repository structure

Create exactly this layout. Empty placeholder files where stubs are needed.

```
futurenostics-hrms/
├── .github/
│   └── workflows/
│       └── ci.yml
├── apps/
│   ├── web/                                # Next.js 15
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   └── login/
│   │   │   │       └── page.tsx
│   │   │   ├── (app)/
│   │   │   │   ├── layout.tsx              # App shell with sidebar
│   │   │   │   └── dashboard/
│   │   │   │       └── page.tsx
│   │   │   ├── api/
│   │   │   │   └── auth/
│   │   │   │       └── [...nextauth]/
│   │   │   │           └── route.ts        # or custom JWT handler
│   │   │   ├── globals.css                 # Tailwind + design token CSS variables
│   │   │   └── layout.tsx                  # Root layout
│   │   ├── components/
│   │   │   ├── ui/                         # shadcn primitives go here
│   │   │   ├── shell/                      # AppShell, Sidebar, Topbar
│   │   │   └── widgets/                    # Dashboard widget components (empty for now)
│   │   ├── lib/
│   │   │   ├── api-client.ts               # Fetch wrapper with auth
│   │   │   ├── auth.ts                     # JWT handling
│   │   │   └── utils.ts                    # cn() and helpers
│   │   ├── hooks/
│   │   │   ├── use-user.ts
│   │   │   └── use-permissions.ts
│   │   ├── public/
│   │   │   └── fonts/                      # Poppins WOFF2 files (download from Google Fonts)
│   │   ├── tailwind.config.ts              # Imports tokens from packages/config
│   │   ├── next.config.mjs
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                                 # NestJS 10
│       ├── src/
│       │   ├── core/
│       │   │   ├── auth/
│       │   │   │   ├── auth.module.ts
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── jwt.strategy.ts
│       │   │   │   ├── guards/
│       │   │   │   │   ├── jwt-auth.guard.ts
│       │   │   │   │   └── permission.guard.ts
│       │   │   │   └── decorators/
│       │   │   │       ├── current-user.decorator.ts
│       │   │   │       └── require-permission.decorator.ts
│       │   │   ├── rbac/
│       │   │   │   ├── rbac.module.ts
│       │   │   │   └── rbac.service.ts
│       │   │   ├── audit/
│       │   │   │   ├── audit.module.ts
│       │   │   │   ├── audit.service.ts
│       │   │   │   └── prisma-audit.middleware.ts
│       │   │   ├── events/
│       │   │   │   ├── events.module.ts
│       │   │   │   └── event-bus.service.ts
│       │   │   ├── scheduler/
│       │   │   │   ├── scheduler.module.ts
│       │   │   │   └── bullmq.config.ts
│       │   │   ├── email/
│       │   │   │   ├── email.module.ts
│       │   │   │   └── email.service.ts
│       │   │   ├── storage/
│       │   │   │   ├── storage.module.ts
│       │   │   │   └── storage.service.ts   # MinIO/S3 wrapper
│       │   │   └── registry/
│       │   │       ├── registry.module.ts
│       │   │       ├── registry.service.ts
│       │   │       └── types.ts             # ModuleManifest interface
│       │   ├── modules/                     # Domain modules (empty for now, just .gitkeep)
│       │   │   └── .gitkeep
│       │   ├── config/
│       │   │   ├── env.schema.ts            # zod schema for env validation
│       │   │   └── app.config.ts
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── prisma/
│       │   ├── schema.prisma                # HR Core schema only
│       │   ├── migrations/                  # generated
│       │   └── seed.ts
│       ├── test/
│       │   └── auth.e2e-spec.ts             # one e2e test proving login works
│       ├── nest-cli.json
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── db/
│   │   ├── src/
│   │   │   ├── client.ts                    # PrismaClient singleton
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── types/
│   │   ├── src/
│   │   │   ├── schemas/                     # zod schemas shared FE+BE
│   │   │   │   └── index.ts                 # placeholder for now
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── ui/
│   │   ├── src/                              # shadcn components shared across apps (if needed later)
│   │   │   └── index.ts                      # placeholder
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── config/
│   │   ├── tailwind/
│   │   │   ├── tailwind.config.base.ts       # base Tailwind config with FN tokens
│   │   │   └── fn-tokens.css                 # CSS variables (light + dark) extracted from design
│   │   ├── eslint/
│   │   │   └── index.cjs
│   │   ├── tsconfig/
│   │   │   ├── base.json
│   │   │   ├── nextjs.json
│   │   │   └── nestjs.json
│   │   └── package.json
│   │
│   ├── email/
│   │   ├── src/
│   │   │   ├── templates/                    # React Email templates (empty placeholder)
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── storage/
│       ├── src/
│       │   ├── minio-client.ts
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── docs/
│   ├── prompts/                              # already populated
│   ├── design/                               # already populated
│   ├── tdds/                                 # already populated
│   ├── adr/
│   │   └── 0001-modular-monolith-manifest-pattern.md
│   └── DECISIONS.md
│
├── docker-compose.yml
├── docker-compose.override.example.yml
├── .env.example                              # all env vars with placeholder values
├── .env.local                                # NEVER committed; .gitignored
├── .gitignore
├── .nvmrc                                    # "22"
├── .editorconfig
├── .prettierrc.cjs
├── .prettierignore
├── commitlint.config.cjs
├── lint-staged.config.cjs
├── pnpm-workspace.yaml
├── package.json
├── turbo.json
├── tsconfig.base.json
├── README.md
└── LICENSE                                   # MIT or proprietary, your call
```

---

## Design tokens — wire these in carefully

The design tokens at `docs/design/tokens/tokens.jsx` are the source of visual truth. Translate them into:

1. **CSS variables** in `packages/config/tailwind/fn-tokens.css`. Light mode in `:root`, dark mode in `[data-theme="dark"]`. Include all `--fn-*` variables: bg/fg/border/divider scales, accent + accent-hover + accent-soft, semantic colors (success/warning/danger/info), radius scales, shadow scales, font family declarations.

2. **Tailwind 4 config** in `packages/config/tailwind/tailwind.config.base.ts` that exposes these as Tailwind utilities. Tailwind v4 supports `@theme` directive — use it. Map design tokens to Tailwind color names: `bg-fn-panel`, `text-fn-muted`, `border-fn-border`, etc.

3. **Font loading.** Poppins should be self-hosted via `next/font` for the Next.js app. Download Poppins weights 400, 500, 600, 700 (and matching italics) to `apps/web/public/fonts/` or use `next/font/google` (simpler — use the Google Fonts integration unless there's a reason not to).

4. **shadcn theme.** When installing shadcn primitives, use the NY style with custom CSS variables. Override shadcn's default color names to point to our `--fn-*` variables so shadcn components automatically pick up our theme.

5. **Dark mode toggle.** Use `next-themes` for the theme switcher. Default to system preference. Test that switching theme updates all components correctly.

The screen reference files (`docs/design/screens/*.jsx`) use inline styles with `var(--fn-*)` references. When implementing screens, **do not copy the inline styles**. Instead, use Tailwind classes that resolve to the same tokens.

Example translation:

```jsx
// Design reference (DO NOT COPY VERBATIM):
<button style={{
  background: 'var(--fn-accent)',
  color: 'var(--fn-accent-fg)',
  borderRadius: '6px',
  padding: '0 12px',
  height: 34
}}>Save</button>

// Implementation (DO THIS):
<Button>Save</Button>
// where <Button> is shadcn's Button styled with our tokens via tailwind.config
```

---

## Prisma schema for Phase 0

Implement exactly the HR Core schema from `CLAUDE_CODE_PROMPT.md §4`. Do not add module-specific tables yet (no Project, no PayrollRun, no LeaveRequest — those come in their respective phases).

The core tables for Phase 0:

- `User`, `Role`, `Permission`, `UserRole`, `RolePermission`
- `Department`, `Designation`, `EmployeeStatus`
- `Employee`, `EmployeeDocument` (placeholder, will be migrated to full Documents module in Phase 9), `SalaryHistory`, `TimelineEntry`
- `AuditLog`

Every model has `createdAt`, `updatedAt`, and where appropriate `deletedAt` for soft deletes. Use `cuid()` for IDs. Add indexes per the master prompt.

The Prisma client lives in `packages/db` and is imported by `apps/api` via the workspace. Do not generate the Prisma client into `apps/api/node_modules` — use the shared package.

Audit middleware: install a Prisma middleware in `core/audit/prisma-audit.middleware.ts` that intercepts every write to tables in an audited-tables list and creates an `AuditLog` entry with before/after JSON snapshots, the acting user ID (from AsyncLocalStorage request context), IP, and user-agent. Audited tables for Phase 0: Employee, SalaryHistory, Role, Permission, UserRole. Other modules will register their tables as they're added.

---

## Auth implementation specifics

- Argon2id for password hashing (not bcrypt). Memory cost 19MB, iterations 2, parallelism 1 — sensible defaults from OWASP.
- JWT access tokens: 15 minute expiry, signed with HS256 using a strong secret from env.
- Refresh tokens: 7 day expiry, stored HttpOnly + Secure + SameSite=Lax cookies, server-side revocable via a `RefreshToken` table.
- Login endpoint: `POST /api/auth/login` accepts email + password, returns access token in JSON body + sets refresh cookie.
- Refresh endpoint: `POST /api/auth/refresh` accepts refresh cookie, returns new access token, rotates refresh token.
- Logout endpoint: `POST /api/auth/logout` revokes refresh token, clears cookie.
- `GET /api/auth/me` returns the current user with their permissions resolved.
- All API endpoints except `/auth/*` and `/health` require a valid JWT bearer token. Use a global `JwtAuthGuard` with an `@Public()` decorator to opt out.
- The `@RequirePermission('permission:key')` decorator on controllers checks the user's resolved permissions. The PermissionGuard reads from a request-scoped cache so multiple checks in one request don't re-query.
- Rate limit `/auth/login` to 5 attempts per IP per 15 minutes. Use `@nestjs/throttler`.
- Lockout: after 10 failed attempts on the same email, lock the account for 30 minutes. Auto-unlock or admin unlock.

---

## Module Registry implementation

The manifest pattern is core architecture. Implement `core/registry/types.ts`:

```typescript
export interface ModuleManifest {
  key: string;                            // e.g. 'employees'
  name: string;                           // e.g. 'Employees'
  permissions: PermissionDefinition[];
  navItems?: NavItemDefinition[];
  scheduledJobs?: ScheduledJobDefinition[];
  eventSubscriptions?: EventSubscriptionDefinition[];
  dashboardWidgets?: DashboardWidgetDefinition[];
  approvables?: ApprovableDefinition[];
  settingsPages?: SettingsPageDefinition[];
  auditedEntities?: string[];
}

export interface PermissionDefinition {
  action: string;                         // 'view', 'create', 'approve', etc.
  description: string;
}

// etc — define every shape used by manifests
```

The `RegistryService` collects manifests from every domain module on boot and:
- Upserts permissions into the DB (so the `permission` table is always in sync with code)
- Builds the navigation tree for the frontend (filtered by user permissions on request)
- Registers BullMQ schedules from `scheduledJobs`
- Wires event subscriptions to the event bus
- Aggregates dashboard widgets, approvables, settings pages

For Phase 0, no domain modules exist yet, so the registry boots empty. But the *plumbing* must work — write a test that asserts the registry can register a fake manifest and the permissions appear in the DB.

---

## Event bus implementation

Use Node's `EventEmitter2` (or NestJS's built-in `@nestjs/event-emitter`). Define a typed event interface:

```typescript
export interface DomainEvent<TPayload = unknown> {
  type: string;                           // e.g. 'employee.created'
  payload: TPayload;
  occurredAt: Date;
  actorId?: string;
  correlationId?: string;
}
```

The event bus is synchronous for now (in-process). Architectural note in the ADR: this interface can be swapped for an out-of-process bus (Redis Streams, Kafka) later without changing emitter or subscriber code.

---

## Docker-compose for local dev

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: hrms
      POSTGRES_PASSWORD: hrms_dev_password
      POSTGRES_DB: hrms_dev
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hrms"]
      interval: 5s

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes:
      - redis-data:/data

  minio:
    image: minio/minio:latest
    ports: ["9000:9000", "9001:9001"]
    environment:
      MINIO_ROOT_USER: minio_admin
      MINIO_ROOT_PASSWORD: minio_dev_password
    command: server /data --console-address ":9001"
    volumes:
      - minio-data:/data

  mailpit:
    image: axllent/mailpit:latest
    ports: ["1025:1025", "8025:8025"]
    environment:
      MP_MAX_MESSAGES: 5000

volumes:
  postgres-data:
  redis-data:
  minio-data:
```

Add a `pnpm dev:services` script that runs `docker compose up -d`.
Add a `pnpm dev:services:down` for cleanup.
Add a `pnpm dev` script that runs `turbo dev` (which runs both apps in parallel via Turborepo pipeline).

On first run, after services are up, run a MinIO bootstrap script to create the required buckets (`fn-hrms-documents`, `fn-hrms-template-assets`) with deny-all bucket policies.

---

## Environment variables

Create `.env.example` with every variable documented. Validate with zod at app startup — fail loudly if anything is missing or malformed.

```
# Database
DATABASE_URL=postgresql://hrms:hrms_dev_password@localhost:5432/hrms_dev

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=<generate-with-openssl-rand-base64-64>
JWT_REFRESH_SECRET=<generate-with-openssl-rand-base64-64>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# MinIO / S3
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minio_admin
S3_SECRET_KEY=minio_dev_password
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true
DOCUMENTS_BUCKET=fn-hrms-documents
TEMPLATES_BUCKET=fn-hrms-template-assets

# Email
EMAIL_PROVIDER=mailpit                     # 'mailpit' | 'smtp' | 'resend'
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM="Futurenostics HRMS <no-reply@futurenostics.local>"
RESEND_API_KEY=                            # only used when EMAIL_PROVIDER=resend

# App
APP_URL=http://localhost:3000
API_URL=http://localhost:4000
NODE_ENV=development
LOG_LEVEL=debug

# Seed
SEED_ADMIN_EMAIL=admin@futurenostics.local
SEED_ADMIN_PASSWORD=ChangeMe!Now123
```

---

## What "working" means at the end of Phase 0

To declare Phase 0 done, all of these must work:

1. `pnpm install` succeeds from a fresh clone.
2. `pnpm dev:services` brings up Postgres, Redis, MinIO, Mailpit.
3. `pnpm db:migrate` runs migrations cleanly.
4. `pnpm db:seed` seeds the data (one super_admin user, six roles, permissions, departments, designations, statuses).
5. `pnpm dev` brings up `apps/web` on `:3000` and `apps/api` on `:4000`.
6. Hitting `http://localhost:3000` redirects unauthenticated users to `/login`.
7. The login page renders styled to match `docs/design/screens/login.jsx` (using shadcn primitives — not the raw inline styles).
8. Logging in with seeded credentials lands on `/dashboard`.
9. The dashboard shows the sidebar from the design, the topbar, and a single placeholder widget "Hello, [user name]".
10. Logout works and clears tokens.
11. Hitting `http://localhost:4000/health` returns `{ status: 'ok' }`.
12. `pnpm test` passes (at minimum: the auth e2e test and a registry unit test).
13. `pnpm lint` and `pnpm typecheck` pass cleanly across all packages.
14. `pnpm build` produces production builds for both apps.
15. Dark mode toggle works on the dashboard.
16. The audit log records an entry when the seeded super_admin's profile is touched (sanity test).
17. CI passes on a PR (.github/workflows/ci.yml runs lint + typecheck + test).
18. `docs/adr/0001-modular-monolith-manifest-pattern.md` is written and committed.
19. Root `README.md` documents the setup steps.

---

## Order of operations

Work in this order. After each major step, commit with a conventional commit message. Push regularly.

1. Initialize the monorepo (`pnpm init`, `pnpm-workspace.yaml`, `turbo.json`, root `package.json` with workspace dependencies).
2. Create the shared packages first (`packages/config`, `packages/db`, `packages/types`, `packages/email`, `packages/storage`, `packages/ui`). Each gets `package.json`, `tsconfig.json`, a `src/index.ts` stub.
3. Set up `tsconfig.base.json` and per-app extends.
4. Set up ESLint, Prettier, Husky, lint-staged, commitlint.
5. Create `docker-compose.yml` and verify services come up.
6. Scaffold `apps/api` with NestJS CLI. Wire core modules: AuthModule (no logic yet, just structure), ConfigModule with env validation, PrismaModule.
7. Write the HR Core Prisma schema, run the first migration.
8. Implement env validation with zod.
9. Build out core/registry, core/events, core/audit (Prisma middleware), core/email (Mailpit-backed), core/storage (MinIO-backed).
10. Implement auth: AuthModule with login/refresh/logout/me endpoints, JwtAuthGuard, PermissionGuard.
11. Write the seed script.
12. Scaffold `apps/web` with `pnpm create next-app` — App Router, TypeScript, Tailwind, no src directory, app router.
13. Install shadcn/ui with NY style. Add primitives: Button, Input, Label, Card, Avatar, Badge, DropdownMenu, Dialog, Sheet, Tabs, Tooltip, Toast (Sonner), Form, Separator, Skeleton.
14. Translate design tokens into `packages/config/tailwind/fn-tokens.css` and the base Tailwind config. Override shadcn's CSS variables to point to ours.
15. Build the login page styled to match `docs/design/screens/login.jsx`.
16. Build the app shell (Sidebar + Topbar from `docs/design/shared/chrome.jsx`).
17. Build the placeholder dashboard page.
18. Wire `api-client.ts` to call the NestJS backend with proper auth headers.
19. Hook up `use-user.ts` and `use-permissions.ts` hooks.
20. Add dark mode toggle via `next-themes`.
21. Write the auth e2e test and a registry unit test.
22. Write the CI workflow.
23. Write the ADR.
24. Update README.
25. Run the full "Phase 0 done" checklist above. Fix anything that fails.

---

## Things to ask me before starting

Before you write any code, confirm or ask about these:

1. **Repository hosting:** GitHub? GitLab? Affects the CI workflow file location.
2. **Branch protection:** is `main` protected? Should PRs be required? (Affects how Husky configures pre-push hooks.)
3. **Production deployment target eventually:** AWS / DigitalOcean / Vercel + Railway / self-hosted? (Doesn't affect Phase 0 but informs choices.)
4. **Tailwind v4 vs v3:** v4 is the latest with better OKLCH support, but it's newer. If you'd prefer v3 for stability, I'll adjust the config.
5. **shadcn style:** NY (sharper, modern, what most production apps use) or default? Default is fine if you prefer; NY is my recommendation.
6. **MinIO in dev only:** for production, will we use AWS S3 or stay with self-hosted MinIO? Affects abstraction in `packages/storage`.
7. **The `Employee.user` relationship:** every Employee has at most one User. Confirm — there's no scenario where an Employee has multiple Users, right?
8. **Logo / brand assets:** any company SVG or brand mark to use? For Phase 0, the design has an "F" logo built in CSS — I'll use that placeholder unless you have a real asset.

---

## Critical reminders

- **The design files in `docs/design/screens/` are visual reference, NOT source code.** Do not paste their inline-styled JSX into the implementation. Build with shadcn primitives, style with Tailwind classes that resolve to our token variables.
- **Phase 0 is scaffolding only.** No business logic. No CRUD for employees. No projects. No commissions. The placeholder dashboard widget literally just says "Hello, [user name]". That's the deliverable.
- **Commit early, commit often.** Conventional commit messages. Each logical chunk of work gets its own commit. Push to a feature branch and open a PR for review before merging to main.
- **If something seems underspecified, ask before deciding.** Don't paint into a corner.
- **Stop after Phase 0.** Do not start Phase 1 until I review Phase 0 and explicitly approve it.

---

When you're ready, confirm:
1. You've read `CLAUDE_CODE_PROMPT.md` and can state the three core architectural principles.
2. You've reviewed the design tokens in `docs/design/tokens/tokens.jsx`.
3. You've answered the §"Things to ask me" questions OR proceeded with the documented defaults.
4. You understand that the design JSX files are reference, not code.

Then begin with Step 1 of the order of operations. Take it slow, get the foundation right.