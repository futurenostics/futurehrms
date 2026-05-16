# ADR 0002 — Row-level scoping enforced at the data layer

- **Status:** Accepted
- **Date:** 2026-05-16
- **Phase:** 1 (Employees module)
- **Supersedes:** —
- **Related:** ADR 0001 (modular monolith + manifest pattern)

## Context

The Employees module is the first module that exposes per-department data.
Different role tiers see different slices of the same table:

| Role                                         | What they should see                                  |
| -------------------------------------------- | ----------------------------------------------------- |
| `super_admin`, `hr_admin`, `finance_manager` | every row                                             |
| `department_manager`, `team_lead`            | only rows where `departmentId` is in their scoped set |
| `employee`                                   | only their own row                                    |

Future modules with the same shape — Leave, Attendance, Overtime, Payroll,
Documents — will repeat the pattern. We need a model that's safe by default,
because the cost of a missed scope check is "a department manager sees the
entire org's salary history." That's a leak that can survive a code review.

The naive approach is to push the check into the controller:

```ts
if (!canSeeAll(user)) {
  where.departmentId = { in: user.scopedDepartmentIds };
}
const rows = await prisma.employee.findMany({ where });
```

…repeated in every list endpoint, every aggregate, every export. The first
forgotten `if` is a breach. There's nothing structurally stopping a future
developer from calling `prisma.employee.findMany({ where: { ... } })` without
the guard — the type system doesn't know about scope.

## Decision

**Row-level scope is enforced at the data layer via helpers, not at the
controller**. Every read of an employee-shaped table goes through a helper
that takes the viewer and a base `WHERE` and returns a scoped `WHERE`:

```ts
const where = buildEmployeeScopeWhere(user, {
  status: { slug: { not: 'terminated' } },
  deletedAt: includeArchived ? undefined : null,
});
const rows = await prisma.employee.findMany({ where });
```

The helper:

- bypasses scope when the user has the module's `view_all` permission
- otherwise ANDs the base with an `OR` of `departmentId in [...]` and
  `id = ownEmployeeId`
- returns a match-nothing sentinel (`id: '__none__'`) when the user can't
  read anything, so the query is well-formed and the result is an empty page

A second helper `assertEmployeeReadable(user, employee)` does the analogue
check for single-record reads — it throws `ForbiddenException` instead of
silently returning empty.

### Why not a Prisma client extension?

Prisma 5's `$extends` lets you wrap models with `$allOperations` and inject
a base `where`. We considered this — it would make scope enforcement
literally invisible to callers. We rejected it for now because:

1. The extension can't read per-request context cleanly. We'd need to thread
   the user through an AsyncLocalStorage to the extension and accept the
   coupling.
2. Aggregates (`count`, `groupBy`) and raw queries bypass the extension's
   semantic wrappers depending on the operation, which means we'd still
   have to remember to scope manually in those cases — the worst of both
   worlds (false sense of security).
3. The helper approach is greppable: searching for `prisma.employee.find`
   without a nearby `buildEmployeeScopeWhere` is a five-second lint check
   we can codify in CI later.

We may revisit the extension approach in Phase 5+ once enough modules have
shipped that the helper pattern shows seams. For now, **call the helper
explicitly** is the rule.

### Where the scope data comes from

`AuthenticatedUser.scopedDepartmentIds` is populated by `AuthService.resolveUser`
on every authenticated request. It reads `UserRole` rows where
`departmentScope IS NOT NULL` and unions the values. Global roles
(no `departmentScope`) contribute nothing to the list — those users rely on
the `view_all` permission instead.

A user with mixed roles (e.g. `department_manager` for Engineering + `team_lead`
for BD) gets the union: `[engineering.id, bd.id]`.

### Permissions, not roles

The helper never branches on role slugs. It only reads permission keys
(`employees:view_all`, `view_team`, `view_own`, `view_salary`, `view_pii`).
This means a custom role with the right permissions Just Works — the role
table is data, not code.

## Consequences

**Positive**

- One place to fix scope bugs (`scope.ts`), not N controllers.
- The pattern is the same for every future scoped module — copy the helper,
  swap `Employee` for `Leave`, done.
- `view_salary` and `view_pii` are separate permissions, separately gated.
  HR sees everything; a department manager sees their team's employees but
  not their salaries.

**Negative**

- The helper is opt-in — a new endpoint that forgets to call it is a hole.
  Mitigation: code review, plus a future custom-ESLint rule that flags any
  `prisma.employee.find*` without a `buildEmployeeScopeWhere` in the same
  block.
- Aggregates need an explicit count query that takes the scope too —
  `prisma.employee.count({ where: buildEmployeeScopeWhere(user) })`. Easy
  to forget; same mitigation as above.
- The match-nothing sentinel (`id: '__none__'`) is a string-comparison cost
  on every empty-scope query. Negligible for the volumes we expect, but
  worth flagging for posterity.

**Trade-offs we accept**

- The helper-based approach trades some elegance for a clearer mental model.
  Anyone reading a Prisma query sees the scope helper next to it; they don't
  need to know about a transparent extension layer.
- We are accepting that the type system doesn't enforce the call. A
  developer can write `prisma.employee.findMany({ where: {} })` and ship.
  Code review and (eventually) lint rules catch it. We chose this over a
  more invasive abstraction.
