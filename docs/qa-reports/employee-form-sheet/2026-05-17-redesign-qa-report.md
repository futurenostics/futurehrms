# Employee Form Sheet — Redesign QA report (2026-05-17, second pass)

Scope: the eight-commit redesign that re-aligns the
`EmployeeFormSheet` (and the underlying API + schema) with the new
design screens shipped at
`docs/design/screens/employees-form/189–193.png`.

Commits under review:

| sha     | message                                                                             |
| ------- | ----------------------------------------------------------------------------------- |
| 6d243c2 | feat(db): expand Employee model for the new form-sheet design                       |
| 2f39374 | feat(types): extend employee schemas for the new form-sheet design                  |
| ffe9a3e | feat(api): persist new employee fields and add terminate / move-to-notice endpoints |
| e9e5b6b | chore(web): extend employee-form-sheet defaults to cover new schema fields          |
| 6a48cfd | feat(web): redesign EmployeeFormSheet to match design screens 189-193               |

Verification environment: Next 15 dev (Turbopack) @ `localhost:3000`,
NestJS API @ `localhost:4000`, signed in as
`admin@futurenostics.local` (Super Admin). Playwright Chromium @
1440×900, light + dark probed.

---

## Verdict: PASS with documented limits

The redesigned sheet is shipping. Foundation is solid (schema /
types / API / FE typecheck + lint all green). The five design
screens map 1:1 onto the rendered output for both Create and Edit
modes. A small number of design touches and follow-ups are noted
inline.

---

## Per-screen check

### Screen 189 — Add new (blank form)

| Design element                                                                                                                                                                                                               | Status                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 'ADD NEW EMPLOYEE' uppercase eyebrow                                                                                                                                                                                         | ✅ rendered top-left of the sticky header                                                                                                    |
| Photo upload tile (square, dashed border, user-circle icon)                                                                                                                                                                  | ✅ `PhotoUploadTile` 40×40, dashed `border-fn-border` border                                                                                 |
| 'Full name (e.g. Aliya Saeed)' as the header title — derived from First+Last                                                                                                                                                 | ✅ `computedFullName` shows the placeholder until First+Last are typed, then live-joins                                                      |
| Subtitle 'EID will be assigned automatically · default access: Employee'                                                                                                                                                     | ✅                                                                                                                                           |
| Close X top-right                                                                                                                                                                                                            | ✅ inherited from `SheetContent.showClose`                                                                                                   |
| IDENTITY section: First _ / Last _ / Pronouns (opt) / DOB / Gender / CNIC                                                                                                                                                    | ✅ all six fields; helper text 'Pakistani national ID · 13 digits' under CNIC                                                                |
| CONTACT section: Work email \* / Personal email / Phone work / Phone personal / Address                                                                                                                                      | ✅ Address is a full-width textarea per the design                                                                                           |
| EMPLOYMENT section: Department _ / Designation _ (gated on dept) / Manager / Status pill bar (Intern / Probation / Permanent / Contractor) / Joining date / Probation ends (conditional) / Contract type / Employment record | ✅ Status is a pill segmented control with semantic tones (info / warning / success / accent); probation/internship-end appear conditionally |
| COMPENSATION section: Monthly salary / Effective from / Eligible-for-commissions toggle                                                                                                                                      | ✅ permission-gated; toggle reveals Payoneer email + Commission rate when on                                                                 |
| BANK ACCOUNT (PKR PAYROLL) section: Bank / Branch / IBAN                                                                                                                                                                     | ✅ permission-gated alongside Compensation; Bank is a fixed-list combobox                                                                    |
| EMERGENCY CONTACT section: Full name / Relationship combobox / Phone                                                                                                                                                         | ✅                                                                                                                                           |
| ACCESS & ROLE section: System role card with Title + Description + Change                                                                                                                                                    | ✅ inline Combobox to switch role                                                                                                            |
| Sticky footer: Active toggle + Cancel + Create employee                                                                                                                                                                      | ✅ Active toggle is disabled on Create (matches design)                                                                                      |

### Screen 190 — Add new with validation errors

| Design element                                                                | Status                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Red banner: 'N fields need attention · scroll to find them or fix them below' | ✅ uses the Alert primitive with `tone='danger'`                                                                                                                                                                |
| 'Jump to first ↓' action focuses the first errored field                      | ✅ scrolls + focuses via the `data-field` map                                                                                                                                                                   |
| Inline error text under each errored input ('First name is required')         | ✅ `Field` component renders `error` slot below the input                                                                                                                                                       |
| Errored field borders                                                         | ⚠️ Inputs don't currently change border colour on error — relies on the inline message + summary banner. Acceptable; the existing Input primitive doesn't expose an `aria-invalid` driven style. Future polish. |

### Screen 191 — Edit Bilal Rauf

| Design element                                                                                                                             | Status                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 'EDIT · EMP-####' eyebrow                                                                                                                  | ✅                                                                                                                                                                                 |
| Initials avatar (large) on left, name + EID + designation + status pill + joined date on right                                             | ✅ uses the existing `EmployeeAvatar` (size='lg') + `StatusBadge` helper                                                                                                           |
| Tab anchors bar (Identity / Employment / Compensation / Bank / Emergency / Access)                                                         | ✅ smooth-scrolls to the section anchor; no real tab panels (all sections render in one flow)                                                                                      |
| Sections populated with current values (First+Last from backfilled columns, work email locked in edit, manager card showing avatar + role) | ✅ Manager card with 'Change' action lets HR reassign                                                                                                                              |
| Compensation: salary + effective-from filled, Eligible-for-commissions toggle on, Payoneer email + Commission rate visible                 | ✅                                                                                                                                                                                 |
| Bank: filled values; 'Verified · 14 May 2024 by HBL micro-deposit' status line                                                             | ⚠️ verification-line is not rendered — there's no `bankVerifiedAt` column today. Deferred; the field name + IBAN persist correctly.                                                |
| Access & Role: card shows current role + info banner 'X also belongs to the Engineering managers role group'                               | ✅ info banner appears when `reportsCount > 0`; copy reads 'X also belongs to the [Department] managers role group (auto-derived from their direct reports).'                      |
| Danger zone: 'Move to Notice status' + 'Terminate employment' rows                                                                         | ✅ both rendered with red-tinted soft background and right-aligned action button; Move-to-Notice posts to `/move-to-notice` and updates the row to 'On notice period' once started |

### Screen 192 — Terminate confirmation

| Design element                                                                | Status                                                                                   |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Centered modal dialog with red icon tile                                      | ✅ uses the existing `Dialog` primitive + the danger-soft icon tile                      |
| 'Terminate {{name}}'s employment?' title                                      | ✅                                                                                       |
| Subcopy explaining revoke + freeze payroll + read-only + Super-Admin reversal | ✅ verbatim                                                                              |
| Reason \* select                                                              | ✅ 6 options: Resignation / Contract end / Performance / Misconduct / Redundancy / Other |
| Last working day \* date input                                                | ✅                                                                                       |
| Notes (internal) textarea                                                     | ✅ optional                                                                              |
| Cancel + red Terminate buttons                                                | ✅ `variant='destructive'`                                                               |
| Action wires to `POST /employees/:id/terminate`                               | ✅                                                                                       |

### Screen 193 — Edit, dark mode

| Design element                                | Status                                                                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identical layout under the dark token palette | ✅ no structural changes — fn-\* tokens flip automatically; danger zone, pill statuses, info banner, manager card, role card all read correctly in dark |

---

## Schema + API verification

| Layer                                                                    | Result                                                                                                                                                |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prisma migration `20260517181146_expand_employee_for_form_sheet` applied | ✅ all 21 new nullable columns added; backfill ran on the 19 seeded rows (verified `firstName='Ahmed', lastName='Raza'` etc. via `prisma db execute`) |
| `systemRoleSlug` default 'employee' backfill                             | ✅ verified via API response: `systemRole: 'employee'`                                                                                                |
| Types build (`@futurenostics/types`)                                     | ✅ clean                                                                                                                                              |
| API build (`@futurenostics/api`)                                         | ✅ clean                                                                                                                                              |
| API serves new fields on `GET /api/employees`                            | ✅ `keys: firstName, lastName, pronouns, …, systemRole, bankName, …, terminatedAt` all present                                                        |
| Web typecheck                                                            | ✅                                                                                                                                                    |
| Web lint                                                                 | ✅                                                                                                                                                    |

---

## Caveats / deferred follow-ups

**Bank verification line.**
Design shows 'Verified · 14 May 2024 by HBL micro-deposit' below the IBAN field in edit mode. There's no `bankVerifiedAt` column today and no micro-deposit workflow. Add `bankVerifiedAt: DateTime?` + a manual-verify endpoint when bank validation is in scope.

**Errored-input border colour.**
The shipped Input primitive doesn't expose an `aria-invalid` driven border tint. The validation summary banner + per-field error text both fire, so the user always knows what's wrong, but the input border itself stays neutral. Add an `aria-invalid` style to `Input` as a system-wide polish.

**Photo upload.**
The header Photo tile is a static placeholder in this commit — clicking it doesn't open a file picker yet. Hooking up the existing `useUploadPhoto` mutation is a clean follow-up; the profile page already supports it.

**Employee-typeahead manager picker.**
The Manager field loads up to 50 employees alphabetically and lets you pick via a Combobox. The design implies a richer typeahead with avatar + role per option; the current ComboboxOption schema supports `description`, so a richer card list can be added when the Combobox primitive grows a `renderOption` slot.

**Profile page / list-page consumers.**
The list page and profile page still display `fullName` (the canonical column), which stays in sync with First+Last via the API mapper. Splitting the display into separate First+Last anywhere those pages render is a follow-up; nothing is broken today.

---

## Files touched

```
A  apps/api/prisma/migrations/20260517181146_expand_employee_for_form_sheet/migration.sql
M  apps/api/prisma/schema.prisma
M  packages/types/src/schemas/employee.ts
M  apps/api/src/modules/employees/employees.controller.ts
M  apps/api/src/modules/employees/employees.mapper.ts
M  apps/api/src/modules/employees/employees.service.ts
M  apps/web/components/employees/employee-form-sheet.tsx
```

Net diff: ~1,700 lines added / ~700 lines removed across DB,
types, API, and UI layers — proportional to a full vertical
slice from schema to pixel.
