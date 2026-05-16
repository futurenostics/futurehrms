# Reset lint failures — `fn-tokens/no-default-utilities`

**Generated:** A.6 lint sweep of the Foundation Reset.
**Total:** 1097 violations across 45 files.
**Other lint errors:** 0 (the codebase is otherwise clean).

Every file below is in the legacy skip-list at
`packages/config/eslint/legacy-skip-list.mjs` so `pnpm lint` exits
green during the Reset. Sub-phase D remediates these one file at a
time; each remediation removes the file from the skip-list AND fixes
every violation listed for it.

The skip-list shrinks as Sub-phase D progresses. When it's empty, the
Reset is feature-complete on the discipline axis (still need component
library from B and screen audits from D).

---

## Violations by category

What categories of utility are being misused, and how often:

| Category     | Count | Token namespace to use instead                                       |
| ------------ | ----- | -------------------------------------------------------------------- |
| spacing      | 485   | `p-fn-*`, `m-fn-*`, `gap-fn-*`, `inset-fn-*` (§4.9 of fn-tokens.css) |
| sizing       | 368   | `w-fn-*`, `h-fn-*`, `size-fn-*` (same namespace as spacing)          |
| font-weight  | 125   | `font-fn-normal/medium/semibold/bold/extrabold` (§4.6)               |
| tracking     | 39    | `tracking-fn-*` (§4.8)                                               |
| inset        | 30    | `inset-fn-*` / `top-fn-*` / `right-fn-*` etc. (§4.9)                 |
| radius       | 22    | `rounded-fn-*` (§4.2)                                                |
| font-size    | 11    | `text-fn-*` (§4.5)                                                   |
| line-height  | 9     | `leading-fn-*` (§4.7)                                                |
| border-width | 4     | `border-fn-*` if non-1px is intentional                              |
| color        | 4     | `bg-fn-*` / `text-fn-*` / `border-fn-*` from the FN palette (§4.1)   |

The shape (spacing + sizing dominant) is consistent with the original
diagnosis in the Reset prompt: the agent reaches for `p-4`/`h-9`
without thinking, while colors and radii (where we already had fn-\*
tokens) leak much less often.

---

## Violations by file (most-violating first)

| Count | File                                                               |
| ----- | ------------------------------------------------------------------ |
| 192   | `apps/web/app/(app)/employees/page.tsx`                            |
| 126   | `apps/web/app/(app)/employees/[id]/page.tsx`                       |
| 111   | `apps/web/app/(app)/employees/import/page.tsx`                     |
| 85    | `apps/web/app/(auth)/login/login-card.tsx`                         |
| 69    | `apps/web/components/ui/dropdown-menu.tsx`                         |
| 46    | `apps/web/app/(app)/employees/org/page.tsx`                        |
| 45    | `apps/web/components/ui/select.tsx`                                |
| 41    | `apps/web/components/shell/sidebar.tsx`                            |
| 37    | `apps/web/components/employees/kpi-strip.tsx`                      |
| 28    | `apps/web/components/employees/profile-header.tsx`                 |
| 25    | `apps/web/components/shell/topbar.tsx`                             |
| 21    | `apps/web/components/ui/dialog.tsx`                                |
| 21    | `apps/web/components/ui/table.tsx`                                 |
| 17    | `apps/web/app/(app)/dashboard/page.tsx`                            |
| 17    | `apps/web/components/ui/sheet.tsx`                                 |
| 16    | `apps/web/components/brand/logo.tsx`                               |
| 14    | `apps/web/components/ui/avatar.tsx`                                |
| 14    | `apps/web/components/ui/card.tsx`                                  |
| 14    | `apps/web/components/ui/tabs.tsx`                                  |
| 12    | `apps/web/components/employees/employee-form.tsx`                  |
| 12    | `apps/web/components/ui/input.tsx`                                 |
| 11    | `apps/web/app/(app)/layout.tsx`                                    |
| 11    | `apps/web/components/employees/widgets/total-employees-widget.tsx` |
| 10    | `apps/web/components/shell/brand-mark.tsx`                         |
| 9     | `apps/web/components/shell/currency-toggle.tsx`                    |
| 8     | `apps/web/app/(app)/employees/[id]/edit/page.tsx`                  |
| 8     | `apps/web/components/ui/separator.tsx`                             |
| 7     | `apps/web/app/(auth)/login/forgot-password-dialog.tsx`             |
| 7     | `apps/web/components/employees/dialogs/change-salary-dialog.tsx`   |
| 7     | `apps/web/components/shell/user-menu.tsx`                          |
| 6     | `apps/web/app/(app)/employees/new/page.tsx`                        |
| 6     | `apps/web/components/employees/dialogs/change-status-dialog.tsx`   |
| 6     | `apps/web/components/ui/tooltip.tsx`                               |
| 5     | `apps/web/components/employees/status-pill.tsx`                    |
| 5     | `apps/web/components/shell/app-shell.tsx`                          |
| 4     | `apps/web/components/shell/theme-toggle.tsx`                       |
| 4     | `apps/web/components/ui/popover.tsx`                               |
| 3     | `apps/web/app/(auth)/layout.tsx`                                   |
| 3     | `apps/web/components/employees/dialogs/change-manager-dialog.tsx`  |
| 3     | `apps/web/components/ui/badge.tsx`                                 |
| 3     | `apps/web/components/ui/button.tsx`                                |
| 2     | `apps/web/components/employees/employee-avatar.tsx`                |
| 2     | `apps/web/components/ui/checkbox.tsx`                              |
| 2     | `apps/web/components/ui/form.tsx`                                  |
| 2     | `apps/web/components/ui/label.tsx`                                 |

---

## Recommended remediation order for Sub-phase D

Per the Reset doc, fix primitives first (Sub-phase B builds them
right, then screens compose from them). Within that, address files
in this order so each fix unblocks the next:

### Tier 1 — UI primitives (block screen remediation)

These are touched by every screen, so fixing them once eliminates
hundreds of violations elsewhere through propagation. Sub-phase B
will rewrite each one to match the design and use fn-\* tokens; after
B these should be at zero violations.

- `components/ui/badge.tsx` (3)
- `components/ui/button.tsx` (3)
- `components/ui/card.tsx` (14)
- `components/ui/checkbox.tsx` (2)
- `components/ui/dialog.tsx` (21)
- `components/ui/dropdown-menu.tsx` (69)
- `components/ui/form.tsx` (2)
- `components/ui/input.tsx` (12)
- `components/ui/label.tsx` (2)
- `components/ui/popover.tsx` (4)
- `components/ui/select.tsx` (45)
- `components/ui/separator.tsx` (8)
- `components/ui/sheet.tsx` (17)
- `components/ui/table.tsx` (21)
- `components/ui/tabs.tsx` (14)
- `components/ui/tooltip.tsx` (6)
- `components/ui/avatar.tsx` (14)

**Tier 1 total: 257 violations** — but most of these collapse during
B's rewrite, not D's screen remediation.

### Tier 2 — Shell & shared widgets (block layout consistency)

- `components/shell/app-shell.tsx` (5)
- `components/shell/sidebar.tsx` (41)
- `components/shell/topbar.tsx` (25)
- `components/shell/brand-mark.tsx` (10)
- `components/shell/currency-toggle.tsx` (9)
- `components/shell/theme-toggle.tsx` (4)
- `components/shell/user-menu.tsx` (7)
- `components/brand/logo.tsx` (16)
- `app/(app)/layout.tsx` (11)
- `app/(auth)/layout.tsx` (3)

**Tier 2 total: 131 violations**

### Tier 3 — Domain compositions

- `components/employees/employee-avatar.tsx` (2)
- `components/employees/employee-form.tsx` (12)
- `components/employees/kpi-strip.tsx` (37)
- `components/employees/profile-header.tsx` (28)
- `components/employees/status-pill.tsx` (5)
- `components/employees/widgets/total-employees-widget.tsx` (11)
- `components/employees/dialogs/change-manager-dialog.tsx` (3)
- `components/employees/dialogs/change-salary-dialog.tsx` (7)
- `components/employees/dialogs/change-status-dialog.tsx` (6)

**Tier 3 total: 111 violations**

### Tier 4 — Screens

Remediate in the order the Reset doc specifies: login first
(most-used), then dashboard, then employees list, then everything else.

- `app/(auth)/login/login-card.tsx` (85)
- `app/(auth)/login/forgot-password-dialog.tsx` (7)
- `app/(app)/dashboard/page.tsx` (17)
- `app/(app)/employees/page.tsx` (192)
- `app/(app)/employees/[id]/page.tsx` (126)
- `app/(app)/employees/[id]/edit/page.tsx` (8)
- `app/(app)/employees/new/page.tsx` (6)
- `app/(app)/employees/org/page.tsx` (46)
- `app/(app)/employees/import/page.tsx` (111)

**Tier 4 total: 598 violations**

---

## Per-file remediation contract

For each file, the Sub-phase D process is:

1. Open the file. Read every `className` string.
2. For each banned utility, map to the fn-\* equivalent using
   `packages/config/tailwind/extracted-tokens.md` (the catalog) and
   `packages/config/tailwind/fn-tokens.css` (the wired-up tokens).
3. Replace inline `style={{...}}` blocks with className utilities where
   the value maps to a token. Keep inline only for truly dynamic values
   (computed hue, computed transform).
4. Where the design's value isn't on the scale, _don't_ invent a one-off
   — surface to the catalog and add a token first.
5. Remove the file from `packages/config/eslint/legacy-skip-list.mjs`.
6. Run `pnpm --filter @futurenostics/web lint <file>` — must exit 0.
7. Run `pnpm --filter @futurenostics/web typecheck` and visual-verify
   the rendered output at 1440px in light + dark mode.
8. Commit:
   `refactor(web): remediate <file> under strict design system`

---

## Running the sweep again

```bash
cd apps/web
npx eslint . --format=json > /tmp/lint-fn-tokens.json
node -e "const r=JSON.parse(require('fs').readFileSync('/tmp/lint-fn-tokens.json','utf8'));console.log(r.reduce((a,f)=>a+f.messages.filter(m=>m.ruleId==='fn-tokens/no-default-utilities').length,0)+' violations across '+r.filter(f=>f.messages.some(m=>m.ruleId==='fn-tokens/no-default-utilities')).length+' files')"
```

When the count hits zero, delete this file and remove the skip-list.
