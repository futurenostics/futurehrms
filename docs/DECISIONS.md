# Decisions log

Running log of decisions that shape the project but aren't large enough for a
dedicated ADR. Entries are appended chronologically; resolved entries are not
edited or removed — they're updated with a follow-up note instead.

## 2026-05-15 — Phase 0 stack pins

- **Node 22 LTS** (`.nvmrc`, `engines.node >= 22`). Anyone with a newer Node
  (24, 25, …) can still run the project; CI builds against 22.
- **pnpm 10.28.1** pinned via `packageManager`. Workspaces use the `apps/*` and
  `packages/*` globs.
- **Turborepo** for the task graph. Pipelines fan out `^build` so apps wait on
  package builds.
- **TypeScript 5.7** in strict mode everywhere, with `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitReturns` enabled on packages and
  the API; relaxed for the Next.js workspace (Next emits some patterns that
  trip those flags).
- **ESLint 9 flat config** at the root. `consistent-type-imports` is disabled
  for `apps/api` because NestJS DI uses `reflect-metadata` and breaks silently
  when injected service classes are imported as types.

## 2026-05-15 — Shared packages compile to dist

Initially the shared packages (`@futurenostics/db`, `…/types`, `…/storage`,
`…/email`, `…/ui`) exported `./src/index.ts` directly so the apps could resolve
TypeScript source through workspace symlinks. This broke at runtime because
`apps/api/dist/main.js` runs through Node, which doesn't load `.ts`. We now
compile each shared package to `dist/`, point `exports` at `./dist/index.js`,
and run `pnpm -r build` before `apps/api build`. Turbo's `^build` dependency
handles the order in CI.

## 2026-05-15 — Auth design

- Password hashing: **argon2id**, memory 19 MiB, 2 iterations, single-thread
  parallelism. OWASP cheat-sheet defaults.
- Tokens: **JWT access** (15 min, HS256, in-memory client storage) +
  **refresh** (7 d, HttpOnly + Secure + SameSite=Lax cookie, rotating, server-
  side revocable via a `RefreshToken` row).
- Account lockout: 10 failed login attempts → 30-minute soft lock.
- Rate limit: `/api/auth/login` is throttled to 5 per 15 minutes per IP.

## 2026-05-15 — Frontend body validation

We chose **zod-in-controller** for request validation instead of installing
`class-validator` + `class-transformer` and wiring NestJS's `ValidationPipe`.
The shared `@futurenostics/types` package owns the schemas, and the same
schema is parsed on the FE (via `zodResolver` for react-hook-form) and on the
BE (in the controller). Single source of truth, no decorator metadata duplication.

## 2026-05-15 — Tailwind v4

The web app uses **Tailwind v4** with the `@tailwindcss/postcss` plugin.
Design tokens live in `packages/config/tailwind/fn-tokens.css` as raw
`--fn-*` custom properties under `:root` (light) and `[data-theme='dark']`
(dark), and a `@theme inline` block bridges them to Tailwind utilities
(`bg-fn-panel`, `text-fn-fg-muted`, `rounded-fn-lg`, `shadow-fn-md`, etc.).
shadcn's own variables (`--background`, `--primary`, …) are remapped to the
`--fn-*` set so every shadcn primitive automatically picks up the FN theme
without per-component overrides.

## 2026-05-15 — Dark mode trigger

Theme is controlled by `next-themes` writing `data-theme="dark"` on `<html>`.
Tailwind v4's `@custom-variant dark (&:is([data-theme='dark'] *, .dark *))`
lets the `dark:` modifier work against either attribute. Default is `system`.

## 2026-05-15 — Storage abstraction

`@futurenostics/storage` wraps `@aws-sdk/client-s3`. In dev it points at MinIO
with `forcePathStyle: true`; in production the same interface targets AWS S3
with virtual-hosted URLs. The decision keeps the production choice open while
the dev experience is fully local.

## 2026-05-16 — Sidebar rebuild deviations

Rebuilt the sidebar to match `docs/design/shared/chrome.jsx`. Three deviations
from the spec, all minor:

1. **File case kept lowercase** (`sidebar.tsx`, not `Sidebar.tsx`). The rest of
   the shell directory uses lowercase-kebab (`topbar.tsx`, `app-shell.tsx`,
   `user-menu.tsx`); breaking that convention for one file would force a rename
   on Linux CI even though macOS would silently accept the existing import path.
   Consistency with the directory wins.
2. **Collapse persistence uses localStorage only**, not a cookie. The spec
   explicitly allowed accepting a brief layout shift for users with a persisted
   collapsed state; we took that option. If the shift becomes annoying we'll
   move to a cookie hydrated by middleware so the SSR shell matches.
3. **Group labels are not rendered** in this iteration. The spec said groups
   are flattened (matching `chrome.jsx`'s `navGroups.flatMap(...)`); the group
   structure is preserved in `nav-config.ts` for future use.

Active-item detection is prefix-aware: `/employees/123` highlights "Employees"
because `pathname.startsWith('/employees/')` matches. `/dashboard` uses an
exact-match guard so it doesn't capture other roots.

Nav counts (84, 23) and badges (2, 4) are placeholder values copied from the
design mockup — flagged with a TODO in `nav-config.ts` to wire to real counts
when the relevant module endpoints land.

## 2026-05-16 — Login polish + Remember Me

- **Remember me cookie duration: 30 days** when checked, 7 days when not.
  30 days is the standard "stay signed in" duration (matches Google, GitHub,
  Linear) — long enough to be useful, short enough that a forgotten laptop
  doesn't stay signed in indefinitely. The refresh token row's `expiresAt`
  column stores the actual chosen TTL so server-side revocation tracks the
  correct lifetime.
- **Email pre-fill via localStorage** under key `fn:login:lastEmail`. Only
  the email is persisted client-side, never the password. When Remember Me
  is unchecked on a subsequent login, the stored email is cleared.
- **Open-redirect defence**: the `?from=` query param is validated to start
  with `/`, not contain `//`, not contain `://`, and not start with `/\`
  (Windows path-escape attempts). Anything else falls back to `/dashboard`.
- **User-enumeration defence**: `/auth/login` returns the same
  `INVALID_CREDENTIALS` message for unknown email and wrong password. We do
  not surface which field is wrong.
- **Structured error payload**: `/auth/login` returns `{code, message,
retryAt?}` for INVALID_CREDENTIALS, ACCOUNT_LOCKED, and RATE_LIMITED so
  the client can show countdown UI without parsing free-form text.
- **Cursor + disabled discipline on Button primitive**: replaced
  `disabled:pointer-events-none` with `cursor-pointer` +
  `disabled:cursor-not-allowed disabled:opacity-60`. The native `disabled`
  attribute on `<button>` blocks clicks; removing `pointer-events: none`
  lets the cursor change reflect intent on hover.
- **Throttle limit 20/15min** (was 5) — see prior entry; surfaced here too
  because the login UI reads `Retry-After` to drive the cooldown banner.
- **`force-dynamic` on `/login`** since `useSearchParams()` reads `from`
  during render. Avoids the Suspense-around-search-params boilerplate.

## 2026-05-16 — Visual-fidelity verification process

The Phase 1 verification checklist had a 38-item entry for "List view
matches design at 1440px, light + dark." That item was marked pass on
inspection of _some_ elements but a side-by-side comparison was never
done. The implementation was missing the entire KPI strip, had wrong
column shapes, wrong filter row, and wrong header buttons. The mistake:
treating visual-match items the same as code-correctness items.

**Going forward**, every visual-match item in any phase checklist
requires explicit element-by-element walkthrough before it can be
marked pass:

1. Open the design file (`docs/design/screens/<screen>.jsx`) and the
   rendered HTML preview (`docs/design/Futurenostics HRMS.html`) in
   one browser window at 1440px.
2. Open the implementation in a second browser window at 1440px.
3. Walk the design top to bottom. For each visible element list:
   - Where it sits on the screen (header / strip / row / cell)
   - What it contains (icon + label + value + delta, etc.)
   - What primitives it uses (Card / Button / Pill / Avatar)
4. Confirm each element exists in the implementation in the same
   position with the same shape. Anything missing, in the wrong
   place, or shaped differently is a failure.
5. Capture screenshots of both windows and attach to the PR. The
   reviewer should be able to see "this matches" without re-running
   the verification themselves.

Don't mark a visual-match item pass on partial inspection or on
"I built all the listed primitives correctly." Built-correct ≠ visually
matches the design.

## 2026-05-16 — Employees list deviations

Single intentional deviation: **the design's salary column shows USD when
the topbar's USD/PKR toggle is set to USD**. The current `CurrencyToggle`
in the topbar is a local UI-only state; there's no app-wide currency
provider yet. We render PKR amounts only (matching the storage unit) and
defer the USD conversion until the topbar toggle is wired to a context
provider (planned for Phase 2 with the Commissions module, where USD↔PKR
conversion is load-bearing).

Avatar palette uses a single light-mode set in both themes. The pastels
are tuned to remain readable on the dark panel; if any user reports a
contrast issue we'll switch to theme-aware OKLCH variants under
`--fn-avatar-*` tokens.

## 2026-05-17 — DataTable is the canonical table primitive

Every tabular list in the app (Employees today; Projects, Commissions,
Payroll, Documents, Leave, Reports, etc. as those modules land) renders
through `<DataTable>` at `apps/web/components/ui/data-table.tsx`. No
module gets to build its own bespoke table; functionality gaps are
closed by extending the primitive. CLAUDE.md carries the rule; this
entry records the reasoning.

Why a primitive and not a config-driven shadcn re-export:

- Every table in the design uses the same chrome — the rounded grey
  header pill, the 12px column rhythm, the 48px checkbox/kebab system
  columns, the per-row hover, the "Showing N of M · End of list"
  footer. Re-implementing that in every page was producing drift after
  the second screen.
- Infinite scroll, selection, and row actions are the same
  ingredients across every list — they don't need to be re-discovered
  per module.
- The primitive is intentionally compositional (cells are React
  children, not config objects) so it stays flexible without forcing
  every consumer through a generated DSL.

Pagination is offset+limit on the API (`offset` + `limit` query
params; response `{ items, total, hasMore }`). Cursor-based pagination
is a future change — defer until any single list exceeds ~50k rows or
ordering-sensitivity makes offset unsafe. The migration path is
isolated to `useInfiniteEmployees` (and any future infinite hooks) +
the controller's query schema; the primitive itself doesn't care.

Virtualization (`@tanstack/react-virtual` or similar) is deferred.
Re-evaluate when any single dataset exceeds ~1,000 rows or when
profiling shows the DOM-row count is causing input lag. Until then,
the simpler non-virtualized scroll is correct.

URL state for table filters and search is in scope (Employees writes
search/filters to the URL — actually it doesn't yet; that's a small
follow-up). Scroll position is NOT persisted to the URL — it would
fight with the IntersectionObserver and produce surprising jumps.


## Phase 2 — Commissions module — Business rules

These decisions were locked with the user on 2026-05-17 before Phase 2
Session 1. Each is the authoritative source for the corresponding
schema or business-logic choice. The design-source-of-truth for this
phase is `docs/design/screens/commissions-design/` — `commissions.jsx`,
`commission-rule-form.jsx`, `projects.jsx`, and `approval-inbox.jsx`
are explicitly *out of date* and must not be referenced.

### CommissionRule key

A rule is keyed by `(department, categoryId, version)` where
`department` may be the literal string `*` to mean "org-wide
fallback". Resolution at project-create time:

1. Look for an active rule matching `(project.department, project.categoryId)`.
2. If none found, fall back to `('*', project.categoryId)`.
3. If still none, the project cannot be created — surface a validation
   error pointing the user at Commission Rules.

Rationale: PNG 11 shows separate rule rows per dept × category and
the master prompt's Phase 2 spec says rules are "grouped by department
× category", but in practice many categories have the same defaults
across departments — the `*` fallback avoids the user having to
re-enter the same numbers per department.

### Role taxonomy

Roles are **configurable per rule** (any string). They are stored
inside `CommissionRule.rolePercentages: Json` (`{ "winner": 58,
"communicator": 30, "eligible_team": 12 }`). The schema enforces
nothing about role names — Winner / Communicator / Eligible team are
seed data conventions, not enums. This matches the design's intent
that future categories may need different roles (e.g. B2B's
"Channel partner") without a migration.

### Pool model

`CommissionRule.poolMode` is `'percentage' | 'fixed'`:

- `percentage` — `poolValue` is the % of project revenue that flows
  into the commission pool. Default mode (matches PNG 12 toggle).
- `fixed` — `poolValue` is a USD amount per project, regardless of
  revenue. Used by "Internal R&D" and similar categories where
  there's no client revenue.

The calculation engine branches on `poolMode`; the role split
(rolePercentages) is identical in both modes.

### Categories taxonomy

`ProjectCategory` is a **first-class DB entity** with parent →
sub-category nesting, color tag, archived flag, and a pointer to its
default `CommissionRule`. Matches PNG 09 (the taxonomy editor).
Sub-categories (Johnny, Michele under Upwork) are supported via
`ProjectCategory.parentId`. The taxonomy editor UI ships in Phase 2.

### Project status taxonomy

Seven states:

| State          | Meaning                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------- |
| `draft`        | Saved but not yet launched. No commissions accrue.                                       |
| `active`       | Role assignments set, commissions can accrue but billing hasn't started.                 |
| `in_billing`   | Client invoicing in flight; commissions are being calculated each month.                 |
| `on_hold`      | Paused (held mid-month for any reason). Carry-forward applies.                           |
| `completed`    | Fully billed. No further line items will be generated.                                   |
| `cancelled`    | Project cancelled. Future line items void; past line items remain in approved runs.      |
| `refunded`     | Completed-then-refunded. Past line items get a negative adjustment in the next run.      |

Status transitions are validated server-side. The `change-status`
endpoint enforces the allowed transitions and audit-logs every change.

### Snapshot scope on Project

`Project.commissionRuleId` is an FK to a specific `CommissionRule`
row (a specific *version*). Since rule versions are immutable
(publishing a new version creates a new row, never mutates the old
one), this FK is a stable contract — future reads will always see the
exact percentages and pool model that were active at project-create
time.

We do NOT snapshot the rule body into JSON on the Project. Trade-off:
every read joins to `commission_rule`, but data isn't duplicated and
there's no risk of snapshot drift if a backfill ever needs to fix a
historical rule row.

Per-project overrides (custom %s for a specific project) are stored
in `ProjectAssignment` rows — one row per (project, employee, role)
tuple, each with its own `percentage`. The Project also carries
`hasOverride: boolean` + `overrideReason: string?` so audit can tell
overridden projects from default-percentage projects at a glance.

### Approve & lock dialog (PNG 10) — Phase 2 rendering

The dialog renders the Payslip-PDF / Disbursement-email / Payoneer-
export rows as **disabled rows with a "Phase 7" pill**. The actual
state change (run.status: pending → approved + audit log) DOES fire.
The disabled rows make it visually obvious to users that those
downstream actions are *not yet wired*, while keeping the visual
match with the design intact.

When Phase 7 (PKR Payroll) ships, those rows become active and the
pill drops. The dialog markup will be the same component.

### Default % seed

The seed reproduces PNG 11 + PNG 12 verbatim:

| Department    | Category         | Pool % | Winner | Communicator | Eligible team |
| ------------- | ---------------- | -----: | -----: | -----------: | ------------: |
| Engineering   | External         |   24%  |   50%  |          30%  |          20%  |
| Engineering   | Upwork           |   38%  |   58%  |          30%  |          12%  |
| Engineering   | B2B              |   29%  |   70%  |          30%  |           0%  |
| Business Dev  | External         |   28%  |   *(read amounts: BD Mgr 85%, Lead 12%, Assoc 3%)* | | |
| Business Dev  | Upwork           |   32%  |   *(read amounts: BD Mgr 85%, Lead 10%, Assoc 5%)* | | |
| Business Dev  | B2B              |   —    |   *pending — escalated to leadership* | | |
| Operations    | External         |   12%  |   60%  |          40%  |           0%  |
| Operations    | Upwork           |   15%  |   60%  |          30%  |          10%  |

Gaps (BD/B2B, anything not pictured) become `status: 'pending'` rule
rows that render in the rules grid with the "Awaiting decision"
treatment from PNG 11 so the user can fill them in via the UI.

### Disbursement schedule

**Time-proportional across project duration.** For a given run-month
M and a project P:

```
total_pool        = (poolMode === 'percentage')
                      ? P.revenueUsd × rule.poolValue / 100
                      : rule.poolValue
days_in_M         = calendar days in month M
overlap_days      = days that fall in both M and [P.startDate, P.expectedCompletionDate]
total_active_days = days between P.startDate and P.expectedCompletionDate (inclusive)
month_share       = total_pool × (overlap_days / total_active_days)
employee_share    = month_share × (assignment.percentage / 100)
```

If `expectedCompletionDate` is null, the project is treated as
single-shot: the full pool pays out in the month containing
`startDate`. The first / last month of a multi-month project gets a
prorated share when start or end falls mid-month.

The PNG-09 `DATE 28/28` column is `overlap_days / days_in_M` — the
display of how much of the month the project was active for. It
ALSO factors into `month_share` for the first / last month.

### Carry-forward

**Explicit.** When a project is held mid-month (`status = on_hold`
during the run window), its line items are stamped with
`carryForwardToRunId` pointing at the next run. The next run's
calculation pulls them in as separate line items with
`carryForwardFromRunId` set, so the audit trail shows
"GreenLeaf carry-forward from May" as a distinct row in June's run.

The PNG-09 `Carry-forward` KPI counts line items where
`carryForwardFromRunId IS NOT NULL` in the current run.

### Leave-prorated

**Manual for Phase 2.** Each `CommissionLineItem` has a
`leaveAdjustmentUsd` (Decimal, default 0) that HR fills in during
draft-state review. The PNG-09 leave-adj column shows the value
with edit affordance.

When the Leave / Attendance module lands (post-Phase 2), it'll
populate `leaveAdjustmentUsd` automatically by reading leave days
from its own tables. No schema migration needed.

### FX rate pinning per run

**Pinned at run-create time.** `CommissionRun.fxRateUsdToPkr` is a
Decimal column set when the draft run is created. Display only in
Phase 2 — calculations stay USD. Phase 7 (PKR Payroll) reads this
field to convert USD line items to PKR for payslip PDFs.

### Approval workflow

**Soft separation of duties.** The same user CAN approve a run
they created/submitted, but the audit log records the conflict
(the `commission.run.approved` event payload includes
`approverIsSubmitter: true`) and the UI shows a yellow warning
banner before the approve button.

The typed-phrase confirmation from PNG 10 (`Type APPROVE
<MONTH YEAR> to confirm`) is a UI gate — server validates a
`confirmationPhrase` field on the approve request matches
`APPROVE <MONTH YEAR>` for the run's month.

Single approver is enough — no multi-approval chain in Phase 2.

### Cancellation / termination

**Past stands, future stops.** When a project transitions to
`cancelled` or `refunded`, the calculation engine generates no
new line items for it from that point forward. When an Employee
is terminated (deletedAt set or status flips to terminal), their
ProjectAssignment rows remain (for history) but the calc engine
skips them.

No automatic redistribution — if Bilal had the Winner share and
gets terminated mid-project, the Winner's % share simply doesn't
pay out in subsequent runs. HR can manually reassign the role via
the project detail screen if the role should be filled.

No negative line items / clawbacks for `cancelled`. For `refunded`
(future enhancement), the clawback behavior will need its own
decision — Phase 2 ships without it.

### Role reassignment

**Future runs reflect current assignments at calc time.** The
calc engine reads `ProjectAssignment` rows fresh each month with
`removedAt IS NULL`. Reassignments take effect from the next run
forward.

Past runs (already-generated line items) are NEVER retroactively
altered. The `commission.line_item.adjusted` event covers
explicit manual adjustments during draft state, but historical
approved runs are immutable per the immutable-financial-records
principle.

### Minimum project revenue threshold

**Configurable per rule.** `CommissionRule.minProjectRevenueUsd`
(Decimal, default 0). Calc engine skips projects whose
`revenueUsd < minProjectRevenueUsd` for the rule, generating no
line items. Display: gross of tax (no tax math in Phase 2 — that
lands with Phase 10).

### Decisions still deferred

- Override policy specifics (who can override beyond `projects:override`,
  whether a second approval is required for overrides) — currently any
  user with `projects:override` can flip `hasOverride` + provide a
  reason. Revisit if overrides become common.

### Phase 2 — Done checklist

Locked + verified at end of Session 6. The QA report sits next to
this file at `docs/qa-reports/phase-2/README.md`.

**Backend**
- `ProjectCategory` (tree + archive + default-rule pointer), `Project`
  (FK to immutable rule version + status state-machine),
  `ProjectAssignment` (soft-remove via `removedAt`), `CommissionRule`
  (versioned per dept × category, `*` org-wide fallback),
  `CommissionRun` (lifecycle columns + pinned FX), `CommissionLineItem`
  (snapshot + leave/manual adj + carry-forward bidirectional links).
- Projects module: CRUD, scoping, change-status with transition
  guards, role assignment / removal, commission preview endpoint,
  categories CRUD. 6 lifecycle events.
- Commissions module: rules CRUD + publish (immutable-via-version),
  run lifecycle (draft / pending_approval / approved / rejected /
  locked) with soft SoD + typed-phrase confirmation, line-item adjust
  endpoint, per-employee breakdown + trend, BullMQ monthly scheduler
  (`0 2 1 * *` Asia/Karachi), CSV export.
- Pure calc engine in `commission-calc.ts` with 23 unit tests
  covering single-shot, multi-month, threshold, status filter,
  percentage vs fixed pool, role splits.
- Timeline subscriber for `commission.run.approved` fans out one
  TimelineEntry per recipient (`module='commissions'`).

**Frontend**
- `/projects` list (PNG 07), project create/edit sheet (PNG 08),
  project detail with tabs (Overview / Role assignments /
  Commission history placeholder / Timeline placeholder / Settings).
- `/commission-rules` list (PNG 11), rule editor sheet (PNG 12) with
  live preview + compare-to-current diff.
- `/monthly-processing` list, run detail (PNG 09) with inline
  leave/manual adjustments + per-row hold toggle, Approve & Lock
  dialog (PNG 10).
- `/commissions/approvals` inbox.
- Dashboard widgets: My commission this month, My commission trend
  (12-month sparkline), Commission run status (HR/Finance).
- Employee profile Commissions tab with month picker + 12-month
  trend chart.

**Seed**
- 6 ProjectCategories (External, Upwork + Johnny / Michele sub-cats,
  B2B, Internal R&D archived).
- 8 CommissionRules at v1.0 (one explicit `pending` for BD/B2B).
- 15 sample Projects spanning every category × status × department.
- 3 sample CommissionRuns (March approved, April approved, May
  draft) with one held line item + one leave-adjusted line item for
  demo variety.

**Out-of-scope (explicit deferrals)**
- Payslip PDF generation, Payoneer CSV export, disbursement emails
  → Phase 7 (PKR Payroll). The Approve & Lock dialog renders these
  as `Phase 7` placeholder rows.
- Tax math, PKR conversion in calc → Phase 10.
- Project pipeline / opportunity tracking → future CRM module.
- Time tracking against projects → not a Phase-2 concept.
- Client entity → "client name" is a string on Project for now.
- Multi-currency commissions → USD-only.

**Known gaps captured in the QA report**
- Project list Export, Rule set Export, Version history page (UI
  hooks present, server side TBD).
- Per-category tabs on Monthly Processing list (client-side filter,
  small follow-up).
- DataTable `rowClassName` prop (would tint pending rule rows).
- Project Commission History tab + Project Timeline tab still
  placeholders pending per-project breakdown/timeline endpoints.
