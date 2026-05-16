# ADR 0001 — Modular monolith with manifest-driven self-registration

- **Status:** Accepted
- **Date:** 2026-05-15
- **Phase:** 0 (Foundation)

## Context

Futurenostics is building an in-house HRMS. The initial scope is two modules
(Commission & Payroll, HR Increments & Reminders), but the system is expected
to grow to cover recruitment, attendance, leave, performance, onboarding,
expenses, assets, and PK payroll. A small engineering team will work in parallel
on different modules, and a single operations team will own the deployment.

The architectural decision is between three options:

1. **Microservices from day one.** One service per module, separate deployments,
   service-to-service calls over HTTP or a bus.
2. **Big-ball-of-mud monolith.** A single Next/Nest app, every module imports
   every other module's services directly, no internal walls.
3. **Modular monolith with hard internal walls.** One repo, one deployable, but
   strict module boundaries enforced in code so the future split into services
   (if it ever happens) is a refactor, not a rewrite.

## Decision

We are choosing **option 3 — a modular monolith** with the following rules:

- Single repo (`futurenostics-hrms`), single deployable (one Next.js app, one
  NestJS API), single Postgres + Redis pair.
- Every domain module lives at `apps/api/src/modules/<name>/` and exports a
  `manifest.ts` declaring its permissions, navigation items, scheduled jobs,
  event subscriptions, dashboard widgets, approvables, settings pages, and
  audited entities.
- The `RegistryService` collects manifests at boot and projects them onto:
  - the `Permission` table (upsert),
  - the navigation tree the frontend consumes,
  - the BullMQ scheduler,
  - the event bus subscriptions.
- Modules communicate **only** through:
  - The DB (read-only access to common HR Core tables — Employee, Department,
    etc. — is allowed).
  - The event bus (`employee.created`, `commission.month.approved`, …).
  - The shared `@futurenostics/types` package for cross-cutting contracts.
- No direct service-to-service imports across modules. If module A needs
  something from module B, it emits an event or subscribes to one. If a
  synchronous read is unavoidable, it goes through the HR Core or a dedicated
  read-model API that module B owns.

## Consequences

**Positive**

- A new engineer adds a module by creating a folder and a manifest. The core
  iterates the manifest. There is no central registration file to edit, so
  there are no merge conflicts on the registration boundary.
- Permissions are declared once (in the manifest) and surface automatically in
  the role-management UI. Removing a permission is the only manual step,
  because we never auto-delete to avoid silently stripping access from custom
  roles.
- Audit, event bus, scheduler, RBAC, storage, and email are all core concerns.
  Module authors get them for free; they cannot accidentally bypass them.
- The future split into services (if commission processing or PK payroll grows
  big enough to warrant it) is a refactor: change the event bus implementation
  from in-process to Redis Streams or Kafka, and pull the module into its own
  process. The call sites and the contracts stay the same.

**Negative**

- Strong discipline is required. The rule "no direct cross-module service
  imports" is enforceable only by code review and ESLint rules (to be added
  in a later phase). A single mistake creates coupling that's expensive to
  undo.
- A failure in one module's boot manifest (a bad cron, a malformed permission)
  takes the whole API down, because everything is one process. The mitigation
  is to validate manifests in the registry before applying them.
- The DB is shared. Heavy writes from one module (e.g., commission processing
  during the month-end run) can impact other modules. Mitigations: long
  operations go through BullMQ, read-heavy modules use TanStack Query caching
  on the FE, and we keep a path to read-replicas open.

**Trade-offs we accept**

- We are not optimizing for independent deployment of modules. The same risk
  appetite that picks a modular monolith is one that prefers "deploy the whole
  thing on Friday afternoon" over "coordinate seven service deploys at once".
- We are not optimizing for polyglot. Every module is TypeScript + NestJS +
  Prisma. Teams that want a different stack will be told to wait until the
  microservices split, which is unlikely to happen during the lifetime of this
  HRMS.

## Reference shape

```ts
export const employeesManifest: ModuleManifest = {
  key: 'employees',
  name: 'Employees',
  permissions: [
    { action: 'view', description: 'View employees' },
    { action: 'create', description: 'Create employees' },
    { action: 'edit', description: 'Edit employee profile' },
    { action: 'deactivate', description: 'Deactivate an employee' },
  ],
  navItems: [{ label: 'Employees', path: '/employees', icon: 'Users', requires: 'employees:view' }],
  eventSubscriptions: [{ event: 'commission.month.approved', handler: 'onCommissionApproved' }],
  auditedEntities: ['Employee', 'EmployeeDocument'],
};
```

This shape is non-negotiable for new modules. If a module needs something the
manifest doesn't cover, we extend `ModuleManifest` and update every existing
module — not the registry boot logic.
