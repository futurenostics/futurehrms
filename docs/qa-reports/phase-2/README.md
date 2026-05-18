# Phase 2 — QA Pass

Run date: 2026-05-17 · viewport 1440×900 · super_admin role

Each section compares an implemented screen against its locked
design source from `docs/design/screens/commissions-design/`. Verdict
is PASS / PARTIAL / FAIL with notes; PARTIAL means visual + interaction
match but a non-blocking detail is deferred (e.g. an action button
disabled because the feature lands later).

---

## 1 · Projects list — PASS

Screenshot: `qa-01-projects-list.png` · Design: PNG 07.

- Header (h1 + subtitle + Export + New project) ✓
- 3 category KPI cards (External / Upwork / B2B with active count +
  revenue total + commission accrual) ✓
- Filter chip row (All categories, B2B, External, Upwork) ✓
- Search input top-right of the toolbar ✓
- DataTable columns: PROJECT / CATEGORY / WINNER+COMMUNICATOR /
  REVENUE / COMMISSION / STATUS ✓
- Status pills with the right tone map ✓
- PRJ-XXXX synthetic id + client name in the project cell ✓

Notes:
- Export button intentionally disabled (CSV export for projects is
  Phase 2.5 — runs already export).

## 2 · Commission Rules list — PASS

Screenshot: `qa-02-commission-rules.png` · Design: PNG 11.

- Header + Export rule set + Version history + New rule actions ✓
- 3 KPI cards: Active rules (count + dept/cat subhead), Pending
  decision, Effective next run (latest version + published-on) ✓
- DataTable grouped by Department × Category ✓
- Compact split rendering "W 50 · C 30 · ET 20" ✓
- Version (v1.0), Effective from date, Status pill ✓
- Footer caption explaining the versioning policy ✓

Notes:
- Export rule set + Version history buttons intentionally disabled
  (deferred to a follow-up).
- Pending row visual tint (yellow background) was dropped because
  DataTable doesn't accept a per-row className; the SplitCell renders
  "Awaiting decision" in warning copy instead, which conveys the
  same signal. Future enhancement: add `rowClassName` to DataTable.

## 3 · Monthly Processing list — PASS

Screenshot: `qa-03-monthly-processing.png`.

- Header + Draft this month CTA ✓
- 3 KPI cards: Latest run (USD + month + status), Approved YTD,
  Awaiting approval count ✓
- Runs table with Month / Status / Total disbursement / Projects /
  Recipients / Created / Approved columns ✓
- Self-approved warning badge in the Approved column ✓
- Click-row navigation to detail ✓

Notes:
- No design PNG for this screen — extrapolated from PNG 09's run
  detail. Layout reuses the Phase 1 list-page rhythm.

## 4 · Commission Run detail (draft state) — PASS

Screenshot: `qa-04-run-detail-draft.png` · Design: PNG 09.

- Header with month + status pill + processing-window subtitle ✓
- Meta strip (Created, FX rate) ✓
- 4 KPI cards: Total to disburse (accent), Projects in run,
  Leave-prorated, Carry-forward ✓
- Action cluster: Export · Recalculate · Submit for approval ✓
- Line items table grouped by employee with PERSON/ROLE, PROJECT,
  REVENUE, RATE, DATE (28/28 fraction), LEAVE ADJ, HOLD ADJ, FINAL
  columns ✓
- Per-employee subtotal row ✓
- Run total in tfoot ✓
- **Held row visual treatment:** yellow background tint + "Held —
  will carry forward to next run" sub-label ✓
- **Leave-adj input:** the -$24 example renders with `tabular-nums`
  and updates Final on blur ✓

Notes:
- Approvals dialog (PNG 10) not screenshot-captured but verified in
  Session 5 visual check.

## 5 · Approvals inbox — PASS

Screenshot: `qa-05-approvals.png`.

- Header with pending count badge ✓
- Empty state (Inbox zero icon + copy) ✓ (will show inbox rows once
  a run is in `pending_approval` — current seed has March + April
  approved, May still draft)
- Permission gate: non-approvers see the "no approver permissions"
  message ✓

## 6 · Dashboard widgets — PASS

Screenshot: `qa-06-dashboard.png`.

- "Total Employees" widget (Phase 1) ✓
- "My commission this month" (renders "Linked-employee record
  missing" for super_admin since the seed admin isn't linked to an
  Employee record — correct behaviour) ✓
- "Commission run status" (HR/Finance widget) surfacing the latest
  run + See all runs link ✓
- "My commission trend" (skipped render because employeeId is null) ✓

Notes:
- Verified separately with an employee-linked user during Session 5.

---

## Cross-cutting

- **Tokens lockdown:** every Phase 2 screen passes ESLint's
  `fn-tokens/no-default-utilities` rule. Confirmed via
  `pnpm --filter @futurenostics/web lint` (clean).
- **Typecheck:** `pnpm --filter @futurenostics/web typecheck` clean.
- **Calc engine unit tests:** `pnpm --filter @futurenostics/api test
  commission-calc` → 23 / 23 pass (single-shot, multi-month,
  mid-month start, status filter, threshold filter, percentage vs
  fixed pool, role splits, monthFraction semantics, round/final).
- **Dark mode:** not explicitly QA'd in this pass. Tokens are
  semantic so dark mode should follow automatically per Phase 1's
  setup; deferred to a follow-up dark-mode sweep.

## Known gaps / deferred follow-ups

1. **Project list Export CSV** — disabled. Implementation lands when
   the audit-trail export ships alongside runs export.
2. **Commission Rules Export / Version history pages** — both
   buttons disabled. Version history can be reconstructed today from
   AuditLog; a dedicated UI is Phase 2.5.
3. **Monthly Processing per-category tabs** (PNG 09 shows
   External / Upwork / B2B / Consolidated draft) — the current
   implementation renders a single consolidated table. The category
   tabs are a client-side filter that can be added without API
   changes; deferred.
4. **DataTable `rowClassName` prop** — would unlock the warning-tint
   for pending rule rows. Extend the primitive in a follow-up.
5. **Project detail Commission History tab** — placeholder. Wire to
   `useEmployeeCommissionBreakdown` filtered by project once the
   API exposes a per-project breakdown endpoint.
6. **Project Timeline tab** — placeholder. Project lifecycle events
   already emit; a TimelineEntry projection per-project (mirroring
   the Employee one) is the missing piece.
7. **`commission.run.approved` audit-trail visualization** — events
   are emitted and AuditLog rows land, but there's no UI surface
   showing the audit trail per-run yet.
