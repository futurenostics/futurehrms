# Futurenostics HRMS

Internal HRMS covering **Commission & Payroll** and **HR Increments & Reminders**,
with an architecture that supports the rest of the HRMS surface (recruitment,
attendance, leave, performance, onboarding, expenses, assets, PK payroll)
being added module-by-module by other engineers without touching the core.

## Quick start

```sh
# 1. Prerequisites
#    Node 22+, pnpm 10+, Docker Desktop (or Docker Engine + Compose v2)

# 2. Install dependencies
pnpm install

# 3. Spin up local services (Postgres, Redis, MinIO, Mailpit)
pnpm dev:services

# 4. Create your local env from the example
cp .env.example .env.local
#   then fill in JWT_ACCESS_SECRET and JWT_REFRESH_SECRET with:
#   openssl rand -base64 64 | tr -d '\n'

# 5. Apply migrations and seed reference data
pnpm db:migrate
pnpm db:seed

# 6. Start both apps
pnpm dev
#   → web at http://localhost:3000
#   → api at http://localhost:4000
#   → mailpit UI at http://localhost:8025
#   → minio console at http://localhost:9001
```

The seed creates a super-admin user with the credentials from
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in your `.env.local`. Sign in on
`http://localhost:3000/login` to land on the dashboard.

## Repo layout

```
apps/
  api/          # NestJS 10 backend
  web/          # Next.js 15 frontend
packages/
  config/       # Tailwind tokens, ESLint, tsconfig presets
  db/           # Prisma client wrapper
  types/        # Shared zod schemas + TS types
  storage/      # S3-compatible client (MinIO in dev, S3 in prod)
  email/        # React Email templates
  ui/           # Cross-app UI primitives (empty placeholder)
docs/
  prompts/      # Architecture + phase prompts for Claude Code
  design/       # Visual reference (JSX + screenshots, NOT source)
  adr/          # Architecture Decision Records
  DECISIONS.md  # Running log of smaller decisions
```

Every domain module under `apps/api/src/modules/` ships a `manifest.ts`
declaring its permissions, nav items, scheduled jobs, event subscriptions,
and audited entities. The core `RegistryService` boots them automatically.
See [ADR 0001](docs/adr/0001-modular-monolith-manifest-pattern.md) for
the rationale.

## Common scripts

```sh
pnpm dev                  # both apps in parallel
pnpm build                # production builds
pnpm typecheck            # tsc --noEmit across the workspace
pnpm lint                 # eslint everywhere
pnpm test                 # vitest across the workspace
pnpm format               # prettier --write

pnpm dev:services         # docker compose up -d
pnpm dev:services:down    # docker compose down
pnpm dev:services:reset   # rm -rf volumes and bring back up

pnpm db:migrate           # prisma migrate dev
pnpm db:migrate:deploy    # prisma migrate deploy (CI / prod)
pnpm db:seed              # populate roles, departments, super admin
pnpm db:studio            # open Prisma Studio
pnpm db:reset             # drop + recreate + seed
```

## Design system

Visual reference lives in `docs/design/`. The implementation matches it via
shadcn/ui primitives styled with `--fn-*` design tokens — never by copying the
reference JSX inline styles. The full visual-fidelity standard is at
[docs/prompts/CLAUDE_CODE_VISUAL_FIDELITY_ADDENDUM.md](docs/prompts/CLAUDE_CODE_VISUAL_FIDELITY_ADDENDUM.md);
the day-to-day workflow is at
[docs/design/README.md](docs/design/README.md).

## Tech stack

| Layer               | Choice                                         |
| ------------------- | ---------------------------------------------- |
| Runtime             | Node 22 LTS                                    |
| Package manager     | pnpm 10 + Turborepo                            |
| Frontend            | Next.js 15 App Router, React 19, TypeScript    |
| UI kit              | shadcn/ui (NY style) + Tailwind CSS v4 + Radix |
| Forms               | react-hook-form + zod                          |
| Data fetching       | TanStack Query v5                              |
| Backend             | NestJS 10, TypeScript                          |
| ORM                 | Prisma 5 → PostgreSQL 16                       |
| Queues / scheduling | BullMQ + Redis 7                               |
| Object storage      | MinIO (dev) / S3-compatible (prod)             |
| Email (dev)         | Mailpit                                        |
| Email (prod)        | Resend or generic SMTP via Nodemailer          |
| Auth                | Argon2id, JWT (jose), HttpOnly refresh cookies |
| Testing             | Vitest + Supertest                             |
| Linting             | ESLint 9 + Prettier                            |
| Git hooks           | Husky + lint-staged + commitlint               |
| CI                  | GitHub Actions                                 |

## Architecture in one paragraph

The system is a **modular monolith**. Modules under `apps/api/src/modules/`
self-register via a manifest; the `RegistryService` iterates manifests to
upsert permissions, mount nav, wire cron jobs, and bind event subscribers.
Modules talk to each other through the **event bus** (`employee.created`,
`commission.month.approved`, …) — never via direct service imports. The DB is
shared but writes are audited via a Prisma middleware that resolves the actor
from per-request `AsyncLocalStorage`. RBAC is **permission-based** (roles and
permissions are DB rows, not enums), and every commission rule + HR rule is
**versioned** (`effective_from`/`effective_to`) so historical runs reproduce
exactly.
