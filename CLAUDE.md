# Project conventions for Claude Code

## Commit attribution

- Never add `Co-Authored-By: Claude` or any similar AI attribution to commits.
- Never add `🤖 Generated with Claude Code` footers, signatures, or emoji tags.
- Never add Claude or Anthropic attribution to PR descriptions, code comments, or documentation.
- All commits, PRs, and code should appear authored solely by the human developer.
- Use clean conventional commit messages: `feat: add user model`, `fix: handle null email`, `chore: bump deps`. No trailers, no signatures, no attribution lines.

## Documentation

- Read `docs/prompts/` for architectural and phase-specific instructions before any significant change.
- Read `docs/design/README.md` before touching UI code.
- The visual fidelity standard in `docs/prompts/CLAUDE_CODE_VISUAL_FIDELITY_ADDENDUM.md` is non-negotiable for UI work.

## Visual fidelity rules (strict mode)

The Foundation Reset established five non-negotiable rules for any UI work. Full text in `docs/prompts/CLAUDE_CODE_VISUAL_FIDELITY_ADDENDUM.md`; summary here so the rules are part of every session's context:

1. **No raw Tailwind defaults for tokenized properties.** Spacing, sizing, color, radius, shadow, font-size, font-weight, line-height, letter-spacing must use `fn-*` utilities. `p-4`, `text-sm`, `rounded-md`, `bg-blue-500`, `shadow-sm`, `font-semibold`, `leading-none`, `tracking-tight` — all banned. Use `p-fn-4`, `text-fn-sm`, `rounded-fn-md`, `bg-fn-accent`, `shadow-fn-sm`, `font-fn-semibold`, `leading-fn-unit`, `tracking-fn-tight`. The ESLint rule `fn-tokens/no-default-utilities` is the enforcement; violations fail CI.
2. **No inline styles for static values.** Use className with `fn-*` utilities. Inline `style={{}}` only for values that are genuinely dynamic at render time (computed hue, computed transform).
3. **Modify primitives at source, not at usage.** A Button's padding lives once in `components/ui/button.tsx`. Usage sites only customize layout (`mt-fn-4`, `w-full`) — never the primitive's internal styling.
4. **Every primitive verified visually before use.** The verification surface is `/dev/style-guide` (dev-only). A primitive without a style-guide section doesn't exist.
5. **Every screen section verified during build, not after.** Walk one section at a time; don't accumulate unverified sections. Per-section process: `docs/prompts/QA_VERIFICATION_PROTOCOL.md` §4.

Layout/positioning utilities (`flex`, `grid`, `items-center`, `absolute`, `transition`, `mx-auto`, `w-full`, `min-h-screen`, etc.) stay default — they have no design-token implications. Numeric `0` (`p-0`, `top-0`, `min-w-0`) is also allowed — it's a layout-reset marker, not a scale step.

Where things live:

| Looking for…                                       | Read…                                                                         |
| -------------------------------------------------- | ----------------------------------------------------------------------------- |
| Every design token                                 | `packages/config/tailwind/fn-tokens.css`                                      |
| Token catalog with rationale                       | `packages/config/tailwind/extracted-tokens.md`                                |
| Strict-mode rules + per-screen translation process | `docs/prompts/CLAUDE_CODE_VISUAL_FIDELITY_ADDENDUM.md`                        |
| The runnable verification protocol                 | `docs/prompts/QA_VERIFICATION_PROTOCOL.md`                                    |
| The visual verification surface                    | `/dev/style-guide` (dev only)                                                 |
| Files awaiting Sub-phase D remediation             | `packages/config/eslint/legacy-skip-list.mjs` + `docs/RESET_LINT_FAILURES.md` |

Escape hatch (use sparingly, expect questions in review):

```tsx
// eslint-disable-next-line fn-tokens/no-default-utilities
<div className="…" />
```

Using this more than once or twice in a screen is a signal that a new token is needed, not that the escape should be used repeatedly. Add the token first.

## Commits

### When to commit

Commit at **logical boundaries** — points where the work-in-progress represents a complete, reviewable unit. Do not wait until a large feature is fully done; do not commit on every file save. The right frequency is roughly one commit per 15–45 minutes of focused work, depending on the size of the unit.

A unit of work that warrants a commit looks like one of these:

- A new file scaffolded with its initial contents (e.g., a new package's `package.json` + `tsconfig.json` + `src/index.ts` stub).
- A self-contained feature or sub-feature (e.g., the auth login endpoint and its tests).
- A configuration change (e.g., adding ESLint, setting up docker-compose, wiring a new env variable).
- A schema change with its migration.
- A bug fix.
- A refactor that improves structure without changing behavior.
- Documentation updates (README, ADR, comments).
  If you're about to make a logically unrelated change, commit what you have first.

### Commit hygiene rules

1. **Every commit must leave the project in a working state.** After the commit, `pnpm install && pnpm build && pnpm lint && pnpm typecheck` should all succeed. If your work is mid-flight and the project doesn't build cleanly, finish the unit before committing.
2. **One concern per commit.** Auth changes and a README typo fix are two commits, not one. Mixing concerns makes review and bisection painful.
3. **The commit message describes the change, not the process.** Good: `feat(auth): add JWT login endpoint with refresh token rotation`. Bad: `feat: continued work on auth`, `chore: WIP`, `wip: stuff`.
4. **Use conventional commit format:** `type(scope): description`. Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `style`, `build`, `ci`. The `scope` is the module or area being changed.
5. **Keep the subject line under 72 characters.** If more context is needed, add a blank line and a body explaining _why_ the change was made (not what — the diff shows what).
6. **Reference issues or phase numbers in the body when relevant.** Never reference Claude or AI assistance in any commit content.
7. **Never amend a commit that has been pushed.** Once it's on the remote, future changes are new commits.

### When NOT to commit

- Mid-refactor when only half the call sites have been updated.
- When linting or typecheck is broken.
- When tests are failing for code being modified (unless explicitly committing a failing-test-first TDD step, which is rare in this project).
- Just because time has passed — granularity is about logical units, not clock time.

### Examples of good commit sequences

For a Phase 0 work session, a healthy commit log looks like:

```
chore(repo): initialize pnpm workspace with turborepo
chore(packages): scaffold shared packages with tsconfig and package.json
chore(docker): add docker-compose for postgres, redis, minio, mailpit
chore(lint): configure eslint, prettier, husky, commitlint
feat(db): add HR core Prisma schema with initial migration
feat(api): scaffold NestJS skeleton with env validation
feat(auth): implement JWT login, refresh, logout, and me endpoints
feat(api): add JwtAuthGuard and RequirePermission decorator
feat(api): implement audit log Prisma middleware
chore(seed): add seed script for roles, departments, designations, admin user
feat(web): scaffold next.js app with tailwind v4 and shadcn primitives
feat(web): wire design tokens into tailwind config and css variables
feat(web): implement login page matching design reference
feat(web): implement app shell sidebar and topbar
feat(web): add dashboard placeholder with greeting widget
test(auth): add e2e test for login flow
ci: add github actions workflow for lint, typecheck, test
docs(adr): record modular monolith and manifest registry decision
docs(readme): add local setup instructions
```

Each of these is independently reviewable. Each one moves the project forward. Each one could be reverted if it turned out to be wrong, without losing the others.

### Branching and pushing

- Work on a feature branch named `feat/phase-0-bootstrap` or similar, not directly on `main`.
- Push to the remote regularly — at minimum at the end of every working session, ideally after every 2–3 commits.
- Do not force-push to shared branches. If a rebase is needed, use a new branch.

### What this looks like in practice

When you finish implementing the JWT login endpoint and its tests pass, that's the moment to commit. Don't wait until refresh and logout are also done — those are separate units. When you finish the next unit (refresh tokens), that's another commit. Each commit a self-contained step.

When you sit down to start a new work block, the first thing you do is verify the previous commit is clean (`pnpm build && pnpm lint && pnpm typecheck` pass). Then begin the next unit.

## Code style

- TypeScript strict mode everywhere. No `any` without an inline comment justifying it.
- Use the established design tokens; never introduce new color values, spacing values, or typography sizes without first adding them to the shared config.
- shadcn/ui primitives for all interactive components. No custom inline-styled components.

## Labels

Every label-shaped element in the app — status pills, KPI trend chips, EID stamps, count chips, module tags, contract / employment-record tags, "Latest" / "Verified" / "Archived" markers, the salary "+9.6%" / "Hire" chips, etc. — uses the **`Badge` primitive** at `apps/web/components/ui/badge.tsx`. **No bespoke `<span className="rounded-… bg-fn-…-soft text-fn-…-soft-fg">` pills**.

Locked shape (matches the design's "+5.6% ↗" KPI badge):

- `rounded-fn-xs` (6px)
- 9px horizontal / 2px vertical padding
- 12px / fw-600 / tabular-nums / tight leading
- soft-tinted bg + matching `*-soft-fg` text + a **35%-mix tinted border** (so the badge reads on coloured surfaces)

Tones: `default` (neutral) · `accent` · `success` · `warning` · `danger` · `info` · `outline`. Optional leading `icon` slot, or `dot` for status indicators ("● Permanent"). See `/style-guide#primitive-badge` for every tone × dot/icon combination.

If a label needs functionality the primitive doesn't support (clickable, removable chip, count badge on a circle, etc.), extend the primitive — do not roll a new one. The visual treatment is owned by `Badge`; consumers own only the tone choice and the content.

## Tables

All tabular data displays in this app use the `<DataTable>` primitive at `apps/web/components/ui/data-table.tsx`. Do not build custom table markup. If a table needs functionality the primitive doesn't support (column reordering, virtualization, expandable rows, etc.), extend the primitive — do not build a bespoke alternative. The visual treatment (sticky header, column structure via colgroup, design's rounded grey header pill), infinite-scroll mechanics, loading / empty / next-page-error / end-of-list states, selection column, and row-actions kebab column are all owned by the primitive. Pages own only:

- Column definitions (`DataTableColumn<T>[]` — id, header, width, align, sortable, cell renderer).
- The flattened row data (typically from `useInfiniteQuery` — the page wires `hasMore` / `isFetchingMore` / `onLoadMore` callbacks).
- Per-row actions (`rowActions(row): DataTableRowAction[]`) and selection state (controlled — parent owns the Set so bulk-action bars can read it).
- An optional custom empty state and sort callbacks.

See `/style-guide#primitive-data-table` for the full state matrix (default, initial loading, empty, initial error, next-page error, live infinite scroll). The Employees list at `apps/web/app/(app)/employees/page.tsx` is the canonical adoption example.

## Dropdowns

Every dropdown / picker / selectable list in this app uses one of **three primitives** — no bespoke `<select>`, no rolling your own popover-listbox, no inline menus pieced together from buttons and `useState`. Visual spec lives in `docs/design/screens/dropdowns-style-guide/` (screens 194–197 cover Select + Combobox in light/dark).

| Primitive                                                                                                    | Use when                                                                                                                                   | Source                                     |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `Select` (+ `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator`) | Closed list of options known at render time, single value — countries, statuses, sort orders. No search needed.                            | `apps/web/components/ui/select.tsx`        |
| `Combobox` / `MultiCombobox`                                                                                 | Searchable list (typically 10+ options, async, or rich rows): employees, departments, designations, managers, tag filters, role assigners. | `apps/web/components/ui/combobox.tsx`      |
| `DropdownMenu`                                                                                               | Action menus only — kebabs, profile menu, "more actions" buttons. Never use it for value picking.                                          | `apps/web/components/ui/dropdown-menu.tsx` |

Locked trigger shape (matches the design's form-field rhythm):

- `rounded-fn-xs` (6px) on the trigger; content panel uses `rounded-fn-sm` (8px) + `shadow-fn-popover`.
- `default` trigger is 34px tall (Input parity); `compact` is 28px; `ghost` removes the border for inline edits; `label` prefixes the trigger with a colored eyebrow ("Department: Engineering").
- Items: 6px rounded inset, `text-fn-base`, optional leading icon and trailing meta slot. Selected item is checkmarked (Select) or backed with `bg-fn-accent-soft/60`.
- Multi-select trigger shows a chip rail (`bg-fn-accent-soft` + 35%-mix border, matching `Badge`); chips collapse to `+N more` past `maxChips` (default 3); a Clear (×) button appears in the trigger, and a footer with **N selected** + **Clear all** appears in the panel.
- Empty/no-results uses the `SearchX` illustration tile + "No <thing> match …" copy.
- Loading uses 4 skeleton rows with an icon-circle + line per row.

If you need behavior a primitive doesn't support (creatable options, async paging, virtualized 10k rows, etc.), **extend the primitive in place** — do not build a parallel implementation. The visual treatment is owned by `select.tsx` / `combobox.tsx`; pages own only options data and the value/values state.

See `/style-guide#primitive-select` and `/style-guide#primitive-combobox` for every state. The Employee form sheet at `apps/web/components/employees/employee-form-sheet.tsx` is the canonical adoption example (11 Combobox call sites — gender, department, designation, manager, contract type, etc.).

## Filters

Every list page that supports filtering uses the **Advanced Filters** primitives at `apps/web/components/filters/` and the state hook at `apps/web/hooks/use-filter-state.ts`. **No bespoke filter popovers, no `<select>` chains, no ad-hoc `?filter=` query params managed by hand.** Visual spec lives in `docs/design/screens/advance-filter/` (PNGs 199–202 cover the drawer, saved presets, date-range picker, and dark mode).

Architecture:

| Piece                                 | Source                                | Job                                                                                                                                                                                                                                                                                                      |
| ------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `useFilterState({ entity, initial })` | `hooks/use-filter-state.ts`           | Holds the typed `Record<sectionKey, FilterValue>`, syncs to the URL under the `?f.<sectionKey>=` namespace, persists named presets to localStorage scoped by `entity`. Exposes `state`, `setSection`, `clearSection`, `clearAll`, `activeCount`, `presets`, `savePreset`, `applyPreset`, `deletePreset`. |
| `<FilterPanelTrigger>`                | `components/filters/filter-panel.tsx` | The toolbar button — shows the active count as a badge and opens the drawer.                                                                                                                                                                                                                             |
| `<FilterPanel>`                       | same file                             | Sheet-based drawer chrome with sticky header (title + active count + X), optional `presetsSlot` between header and body, scrollable section stack, sticky footer (matched-of-total card + Clear all + Save as preset + Apply).                                                                           |
| `<FilterPresetsBar>`                  | `filter-presets-bar.tsx`              | Saved-preset chips row at the top of the drawer. PNG-200 active state.                                                                                                                                                                                                                                   |
| `<FilterSection>`                     | `filter-section.tsx`                  | Collapsible card with icon + uppercase title + count badge + Clear link.                                                                                                                                                                                                                                 |
| `<FilterMultiSelect>`                 | `filter-multi-select.tsx`             | Checkbox row list with optional colored dot + count. Use for short fixed lists (statuses, contract types).                                                                                                                                                                                               |
| `<FilterSearchableList>`              | `filter-searchable-list.tsx`          | Search input + filtered rows + "Show N more" expander. Use for long lists (designations, projects, employees).                                                                                                                                                                                           |
| `<FilterPillGroup mode="single        | multi">`                              | `filter-pill-group.tsx`                                                                                                                                                                                                                                                                                  | Toggleable chip row. Single-select gets `activeTone="warning"` for status-style emphasis. |
| `<FilterRangeSlider>`                 | `filter-range-slider.tsx`             | Dual-handle numeric range with min/max inputs + display string. Use for salary, revenue, count windows.                                                                                                                                                                                                  |
| `<FilterDateRange>`                   | `filter-date-range.tsx`               | Preset chip row (Any / Last 30d / Last 90d / This year / Last year / Custom) + two date inputs.                                                                                                                                                                                                          |
| `<FilterToggleList>`                  | `filter-toggle-list.tsx`              | Labeled checkbox list with sub-label text. Use for boolean filters (Has Payoneer / Include archived / Active only).                                                                                                                                                                                      |
| `<FilterChipsBar>`                    | `filter-chips-bar.tsx`                | Active-filters strip above the DataTable. Consumer passes a `SectionDescriptor[]` describing how each section renders to chip text.                                                                                                                                                                      |

The chips bar is **always** rendered above the DataTable when `activeCount > 0` — never hide active filters behind a button. The drawer is the editor; the chips are the always-on summary.

URL encoding (owned by `useFilterState`):

```
?f.<sectionKey>=<encoded>

multi / toggles → comma-joined id list
single          → raw id
range           → "min..max"   (either side may be empty)
date-range      → "preset|from..to"
```

If a section needs behaviour the primitives don't support (e.g. creatable options, cascading filters, async paged options), **extend the primitive in place** — don't roll a parallel implementation. The Employees list at `apps/web/app/(app)/employees/page.tsx` is the canonical adoption example (4 sections — Department / Status / Contract type / Visibility, plus the active-chips bar above the DataTable).

## Phase 2 — Commissions Module

Phase 2 added Projects + Commissions on top of the HR Core. The
locked patterns below are the contract; future sessions should read
this section before touching commission code.

### Module locations

| What                             | Where                                                                                                                                                          |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Projects backend                 | `apps/api/src/modules/projects/` (`projects.{controller,service,scope,mapper,manifest,module}.ts`)                                                             |
| Commissions backend              | `apps/api/src/modules/commissions/` (rules, runs, calc engine, scheduler, timeline subscriber, employee-breakdown controller)                                  |
| Pure calc engine                 | `apps/api/src/modules/commissions/commission-calc.ts` + 23 vitest unit tests in `commission-calc.spec.ts` — canonical source of truth for calculation behavior |
| Projects frontend                | `apps/web/app/(app)/projects/` + `apps/web/components/projects/`                                                                                               |
| `/commission-rules`              | rule list + editor sheet                                                                                                                                       |
| `/monthly-processing`            | run list + `[runId]` detail with line items                                                                                                                    |
| `/approvals?type=commission-run` | unified approvals inbox filtered to commission runs (Phase 3; `/commissions/approvals` server-redirects here)                                                  |
| Commission components            | `apps/web/components/commissions/` (approve-lock dialog + run-detail building blocks) + `apps/web/components/dashboard/commission-widgets.tsx`                 |
| Project detail tabs              | Overview · Role Assignments · Commission History · Timeline · Settings                                                                                         |
| Run state machine                | `draft → pending_approval → approved → locked`; `rejected` is a side branch back to `draft` via `reopenRejected`                                               |
| E2E tests                        | `apps/web/tests/e2e/commissions/` — Playwright; run with `pnpm test:e2e` after `pnpm test:e2e:install`                                                         |

### Key architectural patterns

**FK-to-immutable-rule pattern (NOT denormalized snapshots).**
Projects do not snapshot commission rule percentages into denormalized columns. Instead, `Project.commissionRuleId` FKs directly to a specific `CommissionRule` _version row_. The integrity contract:

- A `CommissionRule`, once published, is immutable. `commission-rules.service.ts:update()` rejects edits to non-draft rules.
- To change a rule, the publish flow creates a NEW row with a bumped version. The previous row's `effectiveTo` is stamped to `now`.
- Existing Projects keep their `commissionRuleId` FK pointing at the original row. Their percentages are read through the rule, never duplicated.
- Result: the same integrity property as snapshotting (past calculations remain stable) with fewer columns and no risk of snapshot drift.

See `docs/DECISIONS.md` lines 295–310 for the full rationale.

**Soft separation of duties on approval.**
Commission run approval does NOT block the same user who submitted the run from also approving it. The `approverIsSubmitter` boolean is persisted on the run for audit transparency, but no exception is thrown. See `docs/DECISIONS.md` lines 401–412. If you need hard SoD later, add the guard in `commission-runs.service.ts:approve()` — currently a one-line addition.

**Typed confirmation phrase on approval.**
Approval requires a typed confirmation phrase (e.g. `APPROVE MAY 2026`) in the approve dialog — see the schema at `packages/types/src/schemas/commission-run.ts:commissionRunApproveSchema` and the dialog at `apps/web/components/commissions/approve-lock-dialog.tsx`. The phrase must match exactly. This is the design's enforced intentional-act control (PNG 10 in `docs/design/screens/commissions-design/`). The free-form `notes` field is optional.

**Audit middleware does not cover seed inserts.**
The Prisma audit middleware (`apps/api/src/core/audit/prisma-audit.middleware.ts`) is installed during NestJS `onApplicationBootstrap`. Seed scripts run as standalone Node processes — they call `prisma.$transaction(...)` directly without bootstrapping Nest, so seed writes do NOT generate `AuditLog` rows. This is intentional; seed data should not flood the audit log. Runtime API writes are audited normally. If you need to log an action that doesn't go through Prisma writes (e.g. an export, a read-only sensitive operation), use `AuditService.record(...)` explicitly — see the `exportCsv` method in `commission-runs.service.ts` for the canonical pattern.

**FX rate pinning.**
At run-create time, `CommissionRun.fxRateUsdToPkr` is stamped from `COMMISSION_DEFAULT_FX_RATE` env var (or `0.0035` fallback). HR can edit the rate on the run-detail screen before submitting. Once the run is approved, the rate is frozen — Phase 7+ PKR Payroll reads this snapshot rather than the current rate. See `docs/DECISIONS.md` line 394.

### Permission model

**Projects** (10 perms; see `projects.manifest.ts`):

- Scoping: `view_own` · `view_team` · `view_all`
- Writes: `create` · `update` · `delete` · `change_status` · `assign_roles`
- Special: `override` (flip a project off rule defaults; audited with mandatory `overrideReason`)
- Taxonomy: `manage_categories`

**Commissions** (12 perms; see `commissions.manifest.ts`):

- Per-employee: `view_own_breakdown` (every authenticated user) · `view_all_breakdowns` (HR/Finance)
- Read: `view_rules` · `view_runs`
- Rules: `manage_rules`
- Runs: `create_run` · `adjust_line_item` (draft only) · `submit_run` · `approve_run` · `reject_run` · `lock_run`
- Export: `export_run` (frontend button visibility gate; the backend endpoint is gated on `view_runs` per the design intent "if you can see the run you can export it")

Default role bindings live in each manifest's `defaultRolePermissions`. HR Admin gets the create/manage half; Finance Manager gets the approve/lock half — separation of duties through permission grants, not through hard runtime checks.

### Events emitted

The EventBus is the audit + side-effect highway. Subscribers (timeline, future notifications/BI sinks) listen here.

**Projects:** `project.created`, `project.updated`, `project.deleted`, `project.status.changed`, `project.role.assigned`, `project.role.removed`.

**Commission rules:** `commission.rule.published`.

**Commission runs:** `commission.run.created`, `commission.run.recalculated`, `commission.run.submitted_for_approval`, `commission.run.approved`, `commission.run.rejected`, `commission.run.locked`, `commission.run.exported`, `commission.line_item.adjusted`.

The timeline subscriber (`commission-timeline.subscriber.ts`) listens to `commission.run.approved` and fans out one `TimelineEntry` per affected employee with `module='commissions'`. Other events have no subscribers yet but the bus call is in place for future hooks.

### Reference for future work

- Business rule details: `docs/DECISIONS.md` § "Phase 2 — Commissions module — Business rules" (lines 219–526).
- Visual references: PNGs in `docs/design/screens/commissions-design/` (07 projects list, 08 new-project live preview, 09 run detail, 10 approve dialog, 11 rules list, 12 rule editor).
- Calculation behavior: the 23-passing vitest suite in `apps/api/src/modules/commissions/commission-calc.spec.ts` is the canonical reference. Reach for it before re-deriving any formulas.
- E2E regression net: `apps/web/tests/e2e/commissions/` — covers the lifecycle (draft → submit → approve), rejection + reopen, confirmation-phrase validation, and line-item adjustment guards.

## Phase 3 — Notifications, Reminders, Approvals

Phase 3 wired three cross-cutting modules — a notification bell, a
rule-driven reminder scheduler, and a generic approvals inbox — on
top of the HR Core. The patterns below are the contract; future
modules opt in by registering, not by re-implementing.

### Module locations

| What                    | Where                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Notifications backend   | `apps/api/src/modules/notifications/` (service, controller, manifest, types registry, recipient resolver registry)                                  |
| Reminders backend       | `apps/api/src/modules/reminders/` (rule service + sheet editor, BullMQ scheduler, fire + retry pipeline, event subscriber, dept-scoped resolvers)   |
| Approvals backend       | `apps/api/src/modules/approvals/` (`approval-type.registry`, `approvals.service`, `approvals.controller`, `approvals.manifest`, `approvals.module`) |
| Approvals tests         | `apps/api/src/modules/approvals/approvals.service.spec.ts` — 11-case integration spec (submit dedupe, soft/hard SoD, phrase validation, rollback)   |
| Notification bell       | `apps/web/components/shell/notification-bell.tsx` (Topbar) + queries in `apps/web/lib/queries/notifications.ts`                                     |
| Reminder rules UI       | `/settings/reminder-rules` list + editor sheet (event vs cron); `/settings/reminders` scheduled-viewer; queries in `lib/queries/reminders.ts`       |
| Unified approvals inbox | `/approvals` (chip rail filter + complex-vs-simple row split); legacy `/commissions/approvals` server-redirects to `/approvals?type=commission-run` |

### Key architectural patterns

**Generic Approval + per-module ApprovalType.**
There is one `Approval` table and one `/api/approvals` endpoint. Each
approvable kind (commission run today; payroll run, OT, leave next)
registers an `ApprovalTypeDefinition` on its module's `onModuleInit`
— see `commissions/commission-run.approval-type.ts` for the canonical
example. The definition owns: `loadSource`, `toMetadata` (writes the
inbox-row blob into `Approval.metadata`), `confirmationPhraseFor` /
`validateConfirmation` (typed phrase guard, PNG 10),
`onApproved` / `onRejected` / `onCancelled` (side-effects that
dual-write any denormalised columns on the source and emit the
source's domain event). The unified inbox at `/approvals` reads
metadata generically; no per-kind FE branching.

**Soft separation of duties is per-type, opt-in.**
`ApprovalTypeDefinition.softSoD: true` lets the submitter also
approve (commission-run keeps Phase 2's policy — see
`docs/DECISIONS.md` L401-412 and the Phase 3 record). `softSoD: false`
returns 403 on same-user approve. The decision-payload always
carries `approverIsSubmitter` so downstream side effects can surface
it. **Do not** add hard-coded user-id checks in service code — set
the flag on the type.

**FK-to-immutable rule, same as commissions.**
`ReminderRule` follows the Phase 2 commission-rule integrity model.
A rule is mutable while `status='draft'`. Publishing freezes it,
bumps the version (semver minor), and creates a new draft if you
want to edit further. The scheduler reads `status='active'` rows
and joins back to the originating rule by `ruleId` — never
denormalises rule fields onto fired `Reminder` rows. Result: edits
to a rule never retroactively change reminders that already fired.

**Bespoke endpoints become shims, not duplicates.**
After Session 4B, `CommissionRunsService.submitForApproval / approve
/ reject` are thin wrappers that delegate to `ApprovalsService` via
`findActiveBySource('commission-run', runId)`. The Phase 2 FE and
e2e suite see no behaviour change. When adding a new approvable kind,
mirror this pattern — the new module's bespoke endpoints (if any
exist for backwards-compat) delegate; the canonical implementation
lives in `ApprovalsService`.

**Polymorphic source columns + denormalised `requiredPermission`.**
`Approval` carries `(sourceType, sourceId)` as a polymorphic FK
(there's no DB-level constraint — the service uses
`def.loadSource()` and 404s if the source vanished, then advises
"cancel the approval"). The `requiredPermission` column is
**denormalised** off `ApprovalTypeDefinition.requiredPermission` so
the inbox `for=me` filter is a single index hit (`WHERE
requiredPermission IN (viewer.permissions)`) instead of resolving
permissions per-row at query time.

**Audit middleware does not cover seed inserts (still true).**
Same caveat as Phase 2 — seed scripts (`prisma/seed-phase3.ts`) talk
directly to Prisma without bootstrapping Nest, so seed-time
`Approval`/`Reminder`/`Notification` rows generate **no** AuditLog
entries. The Phase 3 seed's `backfillCommissionRunApprovals()`
helper deliberately mirrors `commission-run.approval-type.ts`
`toMetadata()` because it can't call the registered type — keep the
two in sync if either changes.

### Permission model

**Approvals** (4 perms; see `approvals.manifest.ts`):

- Inbox reads: `view_own_inbox` (HR Admin, Finance Manager, Super Admin) · `view_all_inbox` (auditors)
- Writes: `submit` (system / type-owning modules) · `cancel_any` (admin escape hatch)
- Acting on an approval (`approve` / `reject`) is gated by the **owning type's** `requiredPermission`, not by an approvals-module permission. The service intersects with `viewer.permissions` per request.

**Notifications + Reminders**: see each module's manifest. The bell
endpoint requires `notifications:view_own`; reminder-rule edits
require `reminders:manage_rules`.

### Events emitted

The EventBus is still the audit + side-effect highway.

**Approvals:** `approval.submitted`, `approval.approved`,
`approval.rejected`, `approval.cancelled` — these fire **in addition
to** the source's own domain event (commission run's
`commission.run.approved` still emits with the original
`recipients[]` payload, because the timeline subscriber depends on
that shape — see `commission-run.approval-type.ts:onApproved`).

**Notifications:** `notification.created`, `notification.dismissed`,
`notification.read`.

**Reminders:** `reminder.scheduled`, `reminder.fired`,
`reminder.cancelled`, `reminder.rule.published`,
`reminder.rule.archived`.

### Reference for future work

- Generic approvals contract: `docs/DECISIONS.md` § "Phase 3 — Approvals + Reminders + Notifications".
- Visual references: `docs/design/screens/approval-inbox.jsx` (Brief 11), `docs/design/screens/reminders/` (rule editor + scheduled viewer), and the bell mocks under `docs/design/screens/notifications/`.
- The 11-case `approvals.service.spec.ts` is the canonical reference for the SoD / dedup / rollback contract — extend it before changing the service.
- When introducing a new approvable kind, the diff is: define a `kind` slug, write an `ApprovalTypeDefinition`, register on `onModuleInit`, optionally keep a thin bespoke endpoint that delegates via `findActiveBySource`. No FE work needed — the unified inbox renders generically from `Approval.metadata`.

## Asking for clarification

- When something is genuinely ambiguous, ask before deciding.
- Don't guess on architectural decisions. Don't guess on visual specifications. Don't guess on business logic.
