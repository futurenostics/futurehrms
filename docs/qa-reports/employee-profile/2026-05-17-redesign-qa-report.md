# Employee profile — redesign QA report (2026-05-17)

Scope: rebuild the `/employees/[id]` page to match the four design
files at `docs/design/screens/employee-profile{,-header,-timeline,
-compensation}.jsx`.

Commit: `033d6be — feat(web): rebuild employee profile page to match
design screens`.

Verification environment: Next 15 dev (Turbopack) @ `localhost:3000`,
NestJS API @ `localhost:4000`, signed in as
`admin@futurenostics.local` (Super Admin). Playwright Chromium @
1440×1100, light tested directly.

---

## Verdict: PASS with documented stubs

Every visual element from the four design files is rendered. Two
panels (Commissions YTD value and Documents tile grid) ship as
empty-state placeholders because the backing modules don't exist
yet — both are spelled out as deferrals below.

---

## Per-screen check

### `employee-profile-header.jsx`

| Design element                                                                                            | Status                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Outer card: rounded-fn-sm, fn-bg-panel, fn-border, 24px padding                                           | ✅                                                                                                                                                     |
| Top-right action cluster: Message · Assign project · Edit profile · more (kebab)                          | ✅ Message + Assign project are optional callbacks (hidden when not wired); Edit profile is primary; kebab carries the legacy Change\*/Archive actions |
| 84×84 rounded avatar with accent→teal gradient ring (3px) and initials inside                             | ✅ exact gradient + 30px initials inside                                                                                                               |
| Green status dot at bottom-right of the avatar with a 3px panel-bg ring                                   | ✅ dot tone follows archive state (success normally, faint when archived)                                                                              |
| Camera upload overlay in HR roles                                                                         | ✅ preserved from prior header                                                                                                                         |
| Row 1: h1 name (26px semibold, -0.03em tracking) + status pill (with dot) + contract pill + mono EID chip | ✅                                                                                                                                                     |
| Row 2: 'designation · department' muted secondary (14px medium)                                           | ✅                                                                                                                                                     |
| Meta row: email · phone · 'Reports to {manager}' · location with icons                                    | ✅ phone hidden when not set; address used as the location value (employees today have address, not separate location)                                 |

### `employee-profile.jsx` (page layout shell)

| Design element                                                                                                  | Status                                                                   |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 5-cell quick-stat strip below the header (Tenure / Salary/mo / Commissions YTD / Performance / Active projects) | ✅ `ProfileQuickStats` component; cells separated by 1px dividers on lg+ |
| Tabs: Overview · Job & comp · Salary history · Timeline · Documents · Evaluations · Commissions                 | ✅                                                                       |
| 2-col body layout (1.4fr / 1fr) under the tab bar — primary content left, sidebar right                         | ✅ collapses to single column under lg                                   |

### `employee-profile-timeline.jsx`

| Design element                                                                                                                                  | Status                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Section header: clock icon-tile + 'Activity timeline' + count badge + module filter chips (All / HR / Commissions / Projects)                   | ✅ filter chips toggle the visible entries; count reflects the filtered total                          |
| Continuous left rail (2px vertical line) running the full list height                                                                           | ✅ absolute-positioned at left:39 + top:4 / bottom:22 to match the spec                                |
| Per-entry: 32px icon bubble centred on the rail (3px panel-bg border + 1px tone-tinted outline)                                                 | ✅ tone derived from the event module (commissions / projects / HR / neutral)                          |
| Body card: title + module badge + 'Latest' pill (newest only) + detail line + amount/tag on the right + dashed-divider footer with date + actor | ✅ amount + actor pulled from `entry.details` when present (handles `{ amount, delta, actor }` shapes) |
| Month-group dividers ('MAY 2026' uppercase) when the month changes top-to-bottom                                                                | ✅                                                                                                     |
| 'Show N earlier events' loader appears when filtered > 6                                                                                        | ✅ shows the first 6, button reveals the rest                                                          |
| Empty / loading / error states                                                                                                                  | ✅ all three handled (skeleton during fetch, empty card text, error message)                           |

### `employee-profile-compensation.jsx`

| Design element                                                                                                    | Status                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Compensation card header: title + 'Monthly base salary' subline + 'Increment' secondary button                    | ✅ Increment button opens the existing ChangeSalaryDialog                                               |
| Big tabular salary (34px semibold, -0.03em) + '/ mo' suffix                                                       | ✅                                                                                                      |
| Delta badge (success/danger arrow + %) + alt-currency equivalent + 'effective {date}' line                        | ✅ delta + alt-currency only shown when salary present; effective date pulled from newest history entry |
| 'RECENT CHANGES' uppercase eyebrow                                                                                | ✅                                                                                                      |
| Per-history row: small % badge (success / 'Hire' neutral) + 'From → To' mono number + reason + actor + date right | ✅ feeds from `useSalaryHistory`; empty-state copy when no history                                      |
| Documents card header: title + '{n} files' subline + 'Upload' secondary button                                    | ✅                                                                                                      |
| 2-col tile grid of doc cards (extension chip + name + kind/size + date + download icon)                           | ✅ tile component shipped; the grid is empty today (see deferrals)                                      |

---

## Caveats / deferred

**Commissions YTD value, Performance score, Active projects count.**
The QuickStatStrip renders all five cells so the strip's shape is
stable, but three of them display placeholders ('—' / '0' /
explanatory subline) because the backing data doesn't exist yet:
commissions module hasn't landed, performance reviews don't have a
table, and 'Active projects' is wired to `reportsCount` as a stand-in
('direct reports today') until the projects module brings real counts.
Once the modules ship, the strip wiring is a one-line update per cell.

**Documents tile grid is empty today.**
`useDocuments` and S3 attachment plumbing aren't shipped — the
DocumentsCard renders the header + 'Upload' button + an empty-state
("No documents uploaded yet · Offer letters, contracts, ID copies,
and bank details land here."). The tile component is built so the
grid fills in as soon as the documents query exists.

**Message + Assign project header actions.**
Both are optional props on `ProfileHeader` so the visual surface is
ready, but the page doesn't pass them today — no messaging /
project-assignment workflows exist yet.

**Avatar palette.**
The design hard-codes one OKLCH palette (violet inner + accent→teal
ring). We reuse it directly so dark-mode rendering may need a token
pass if it reads too saturated; a follow-up can move it onto
`--fn-avatar-*` tokens that flip with the theme.

---

## Regression checks

| Area                                              | Result                                                                                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm --filter @futurenostics/web typecheck`      | ✅ clean                                                                                                                                                           |
| `pnpm --filter @futurenostics/web lint`           | ✅ clean                                                                                                                                                           |
| EmployeeFormSheet (edit flow from profile)        | ✅ still mounted at the page level, opens via Edit profile button                                                                                                  |
| ChangeStatus / Manager / Salary / Archive dialogs | ✅ all still mounted; Salary's Increment shortcut from the Compensation card opens the same dialog                                                                 |
| URL-state for `?sheet=edit`                       | ✅ unchanged                                                                                                                                                       |
| URL-state for `?tab=…`                            | ✅ default tab now 'timeline' (matches the design's primary view); other tabs (overview, jobcomp, salary, documents, evaluations, commissions) all route correctly |

---

## Files touched

```
A  apps/web/components/employees/profile-quick-stats.tsx
A  apps/web/components/employees/profile-timeline.tsx
A  apps/web/components/employees/profile-sidebar-cards.tsx
M  apps/web/components/employees/profile-header.tsx
M  apps/web/app/(app)/employees/[id]/page.tsx
```

Net diff: +1,135 / −195 LOC. One commit (`033d6be`); the three
visual sub-areas (header, strip + tabs, timeline + sidebar) come
together because the file restructuring is too tightly intertwined
to land cleanly in three separate commits.
