# Extracted design tokens

**Source files scanned:**
`docs/design/shared/tokens.jsx`, `docs/design/shared/primitives.jsx`,
`docs/design/shared/chrome.jsx`, all 44 `docs/design/screens/*.jsx`.

**How this doc is structured.** Each section lists:

1. **In-scope values** — every distinct value the design actually uses
   (frequency in parentheses where useful — `(43)` means 43 distinct
   inline references to that value across the source files).
2. **Proposed token** — the `--fn-*` name the value will get.
3. **Outliers / open questions** — values that don't fit cleanly,
   marked **OPEN: ⟨decision needed⟩** for human review before A.2.

**Token-naming convention.** All tokens are CSS custom properties
prefixed `--fn-`. Numeric scales use `--fn-{category}-{step}` where
`step` follows Tailwind's `0`, `0.5`, `1`, `1.5`, `2`, `2.5`, … pattern
(each whole step = 4px). Semantic tokens carry the role in the name
(`--fn-spacing-card-padding`, `--fn-shadow-drawer-left`).

**Scope reminder.** Sub-phase A locks down only value categories that
have design intent: color, spacing, sizing, radius, shadow, font size,
font weight, line height, letter spacing, transition duration.
Layout/flex/grid/positioning utilities stay on Tailwind defaults.

---

## 1 — Colors

### 1a — Already canonical (declared in `tokens.jsx`, used via `var(--fn-*)` everywhere)

Surfaces · borders · foreground · semantic accents — **complete, no gaps**.
The current `fn-tokens.css` already covers every color reference grepped
across the design. Confirmed via:

```
var(--fn-accent)            var(--fn-fg)            var(--fn-info)
var(--fn-accent-fg)         var(--fn-fg-faint)      var(--fn-info-soft)
var(--fn-accent-soft)       var(--fn-fg-invert)     var(--fn-info-soft-fg)
var(--fn-accent-soft-fg)    var(--fn-fg-muted)      var(--fn-shadow-lg)
var(--fn-bg)                var(--fn-font-display)  var(--fn-shadow-sm)
var(--fn-bg-inset)          var(--fn-font-mono)     var(--fn-shadow-xs)
var(--fn-bg-panel)          var(--fn-font-sans)     var(--fn-success)
var(--fn-bg-subtle)         var(--fn-icon-tile)     var(--fn-success-soft)
var(--fn-border)            var(--fn-icon-tile-fg)  var(--fn-success-soft-fg)
var(--fn-border-strong)     var(--fn-danger)        var(--fn-warning)
var(--fn-danger-soft)       var(--fn-divider)       var(--fn-warning-soft)
var(--fn-danger-soft-fg)                            var(--fn-warning-soft-fg)
```

### 1b — Avatar / chip-tile hue palette (deterministic per-entity colors)

Used in `screens/*.jsx` via patterns like
`oklch(0.38 0.15 ${hue})` and `oklch(0.92 0.07 ${hue})`, where `hue`
is one of a fixed 6–10-color palette (the same one used in the
existing `apps/web/lib/employee-colors.ts`).

**Hue ring:** `25, 65, 95, 145, 175, 200, 245, 280, 320, 350` (10
buckets, also the existing employee-colors palette).

**Proposed tokens (one set per role):**

```
--fn-avatar-bg-{hueName}     --fn-avatar-fg-{hueName}
--fn-chip-bg-{hueName}       --fn-chip-fg-{hueName}
```

where `hueName ∈ { coral, amber, lime, mint, teal, sky, blue, violet, fuchsia, rose }`.

**Lightness/chroma stops** (also extracted from the design):

| Role           | Light bg             | Light fg             | Dark bg              | Dark fg              |
| -------------- | -------------------- | -------------------- | -------------------- | -------------------- |
| Avatar (large) | `oklch(0.92 0.07 H)` | `oklch(0.38 0.15 H)` | `oklch(0.30 0.10 H)` | `oklch(0.85 0.13 H)` |
| Chip (table)   | `oklch(0.95 0.05 H)` | `oklch(0.42 0.16 H)` | `oklch(0.30 0.08 H)` | `oklch(0.82 0.13 H)` |

**OPEN-1.** The avatar palette is currently scattered across screens as inline
`oklch(…)` literals interpolating runtime `hue` values. Proposal: codify the
10-hue ring into `--fn-avatar-*` tokens AND keep the existing
`hashName→hue` mapping in `employee-colors.ts` (so the deterministic
assignment lives in TS, but the actual colors come from CSS vars).
**Approve / redirect?**

### 1c — Raw hex/rgba values found inline

| Value                                                                    | Where used                                    | Disposition                                                                                      |
| ------------------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `#fff` / `#ffffff`                                                       | Login orbit satellite tiles, page bg refs     | Map to `var(--fn-fg-invert)` or `var(--fn-bg-panel)`.                                            |
| `#ECEEF1`                                                                | Page bg literal                               | Matches `--fn-bg` light; remove inline use.                                                      |
| `#ddd`, `#e5e5e8`, `#b0b0c0`, `#9090a8`, `#6e6e88`, `#3a3a55`, `#1a1a2e` | Loading screen brand mark only                | One-off brand mark; keep as raw inline OR add semantic `--fn-loading-mark-*` tokens. **OPEN-2.** |
| `#F25022 #7FBA00 #00A4EF #FFB900`                                        | Microsoft brand colors in payslip-pdf SSO row | Third-party brand — keep raw.                                                                    |
| `#4285F4 #EA4335 #FBBC05 #34A853`                                        | Google brand colors                           | Third-party brand — keep raw.                                                                    |
| `rgb(242, 247, 248)`                                                     | Login reflection plate background             | Add `--fn-auth-reflection-bg` semantic token.                                                    |
| `rgba(0,0,0,0.15)`                                                       | Shadow color stop in one shadow string        | Fold into shadow tokens (1f).                                                                    |
| `rgba(15,17,23, 0.06 → 0.50)` (8 distinct alpha steps)                   | Shadow color stops                            | Fold into a single `--fn-shadow-color` channel + dedicated shadow tokens.                        |
| `rgba(40,30,70, 0.08 → 0.18)`                                            | Login card/auth shadow color stops            | `--fn-auth-shadow-color` + dedicated tokens.                                                     |

### 1d — Third-party brand colors

Stay as raw inline literals — they aren't ours to tokenize. The lint rule
in A.4 will need an exception for these (likely scoped to specific files
via the `// fn-allow-default-utility` escape hatch).

---

## 2 — Spacing (`--fn-space-*`)

**Extracted unique values (px):**
`0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64`

Frequencies confirm the canonical scale is well-defined.
The top gap values are `10 (173×) · 8 (169×) · 12 (129×) · 6 (83×) ·
16 (48×) · 14 (36×)` — values that align with a 2-px stepped scale up
to 16, then 4-px stepped beyond.

### Proposed scale (Tailwind v4 `--spacing` slot → manual `--fn-space-*` tokens)

| Token             | px  | Notes                                                                                |
| ----------------- | --- | ------------------------------------------------------------------------------------ |
| `--fn-space-0`    | 0   |                                                                                      |
| `--fn-space-px`   | 1   | Hairlines, borders inside compound paddings (`1px 6px`).                             |
| `--fn-space-0.5`  | 2   | Kbd vertical pad, badge stem.                                                        |
| `--fn-space-0.75` | 3   | Dot gap, badge inner.                                                                |
| `--fn-space-1`    | 4   |                                                                                      |
| `--fn-space-1.25` | 5   | **Specialty** — used in badge dot gap (`gap: 5`) and tabular margins. Keep distinct. |
| `--fn-space-1.5`  | 6   |                                                                                      |
| `--fn-space-1.75` | 7   | **Specialty** — button md gap (`gap: 7`).                                            |
| `--fn-space-2`    | 8   |                                                                                      |
| `--fn-space-2.25` | 9   | **Specialty** — trend-pill padding-x (`2px 9px`).                                    |
| `--fn-space-2.5`  | 10  |                                                                                      |
| `--fn-space-3`    | 12  |                                                                                      |
| `--fn-space-3.5`  | 14  | The "rounded-down by Tailwind defaults" value — explicit token to stop that drift.   |
| `--fn-space-4`    | 16  |                                                                                      |
| `--fn-space-4.5`  | 18  | Sidebar item left pad, section header bottom pad.                                    |
| `--fn-space-5`    | 20  |                                                                                      |
| `--fn-space-5.5`  | 22  | Card body horizontal pad, sidebar full-mode pad.                                     |
| `--fn-space-6`    | 24  |                                                                                      |
| `--fn-space-7`    | 28  | Page padding (`main { padding: 28 }`).                                               |
| `--fn-space-8`    | 32  |                                                                                      |
| `--fn-space-9`    | 36  | Avatar size, icon-tile size.                                                         |
| `--fn-space-10`   | 40  | Button-lg height, KPI icon tile.                                                     |
| `--fn-space-11`   | 44  |                                                                                      |
| `--fn-space-12`   | 48  |                                                                                      |
| `--fn-space-13`   | 52  |                                                                                      |
| `--fn-space-14`   | 56  | Topbar height (52, close to 56) — actually 52, see semantic below.                   |
| `--fn-space-15`   | 60  | Login-form margin only. **OPEN-3.** Keep or drop?                                    |
| `--fn-space-16`   | 64  | Rail sidebar width.                                                                  |

**Negative margins used (pull-up / overlap patterns):** `-1, -4, -6, -8` —
expose as `-fn-space-px`, `-fn-space-1`, `-fn-space-1.5`, `-fn-space-2`
through Tailwind's negative-prefix syntax. No new tokens needed.

### Semantic spacing aliases

These name _roles_ the scale plays, so usage sites read intent
(`p-fn-card`) instead of magnitude (`p-fn-5.5`). Authoring rule: when
the same scale value carries different meaning in different
contexts, alias it.

| Token                         | =                          | Used by                                     |
| ----------------------------- | -------------------------- | ------------------------------------------- |
| `--fn-spacing-page`           | `var(--fn-space-7)` (28)   | `<main>` outer padding                      |
| `--fn-spacing-card-padding`   | `var(--fn-space-5.5)` (22) | Card / panel body                           |
| `--fn-spacing-card-padding-x` | `var(--fn-space-6)` (24)   | KPI cards (`px-6 py-[22px]`)                |
| `--fn-spacing-section-gap`    | `var(--fn-space-7)` (28)   | Between cards in a column                   |
| `--fn-spacing-form-row-gap`   | `var(--fn-space-4)` (16)   | Vertical gap between form rows              |
| `--fn-spacing-form-field-gap` | `var(--fn-space-1.5)` (6)  | Label → input                               |
| `--fn-spacing-sheet-header-x` | `var(--fn-space-5.5)` (22) | Sheet header padding-x                      |
| `--fn-spacing-sheet-header-y` | `var(--fn-space-4.5)` (18) | Sheet header padding-y                      |
| `--fn-spacing-table-cell-x`   | `var(--fn-space-3)` (12)   | Table cell horizontal                       |
| `--fn-spacing-table-cell-y`   | `var(--fn-space-3)` (12)   | Table cell vertical (InsetTable uses 12px)  |
| `--fn-spacing-table-edge-x`   | `var(--fn-space-4.5)` (18) | First/last cell horizontal padding          |
| `--fn-spacing-sidebar-rail-w` | `var(--fn-space-16)` (64)  | Rail sidebar width                          |
| `--fn-spacing-sidebar-full-w` | `240px`                    | Full sidebar width — see Sizing (§7).       |
| `--fn-spacing-topbar-h`       | `52px`                     | Topbar height (not on the scale; semantic). |

---

## 3 — Border radius (`--fn-radius-*`)

**Extracted unique values (px):** `0.5, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18, 99, 999`
**Frequencies:** `6 (188×) · 8 (158×) · 99 (122 — pill) · 4 (75×) · 7 (50×) · 5 (37×) · 10 (31×) · 3 (23×) · 12 (8×) · 14 (6×) · 2 (2×) · 0.5 (2×) · 999 (1×) · 18 (1×) · 16 (1×)`

### Proposed scale

| Token                     | px   | Used for                                                                                                              |
| ------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------- |
| `--fn-radius-px`          | 1    | Sub-pixel decorative seams (rare).                                                                                    |
| `--fn-radius-2xs`         | 3    | Sortable column arrow, dotted progress segment.                                                                       |
| `--fn-radius-xs-minus`    | 4    | Kbd, mini-rules, sortable-table tick squares.                                                                         |
| `--fn-radius-xs-plus-low` | 5    | Legend dot tile, currency-toggle inner pill. **Could collapse to 4 or 6 — see open question.**                        |
| `--fn-radius-xs`          | 6    | **Primary** — Badge, Card, Input, Button-sm, sidebar item, logo mark.                                                 |
| `--fn-radius-xs-plus`     | 7    | KPI icon tile, topbar pill (search, currency, bell). **One-off but visible — keep.**                                  |
| `--fn-radius-sm`          | 8    | Section header icon tile, button-lg, dialog inner panel, InsetTable header pill, avatar squircle.                     |
| `--fn-radius-md`          | 10   | Mid-card (commission rule form, KPI shell variant), floating bars.                                                    |
| `--fn-radius-lg`          | 14   | Login orbit center, large icon tiles, hero cards. **Only 6 uses in design — was over-applied in the implementation.** |
| `--fn-radius-xl`          | 18   | Dialog modals only (1 use).                                                                                           |
| `--fn-radius-full`        | 9999 | Pills / circles. (`99` and `999` collapse to one token.)                                                              |

**OPEN-4.** `5px` (37×) and `0.5px` (2×) and `12px` (8×) and `16px`/`18px` (1× each)
sit between the canonical steps. Proposal:

- `5px` → its own token `--fn-radius-xs-low` (used by currency toggle inner pill — visually distinct from 4 and 6).
- `0.5px` → drop, use 0.
- `12px` → snap to 10 OR keep distinct. The 8 usages are mid-card variants — I lean **keep distinct** as `--fn-radius-md-plus`.
- `16px` (1×) → snap to 14.
- `18px` (1×) → already on scale as `--fn-radius-xl`.

**Approve scale, snap-decisions, and naming?**

---

## 4 — Box shadow (`--fn-shadow-*`)

### Token-backed (already canonical)

```
--fn-shadow-xs   0 1px 2px rgb(15 17 23 / 0.04)
--fn-shadow-sm   0 1px 2px rgb(15 17 23 / 0.04), 0 1px 1px rgb(15 17 23 / 0.03)
--fn-shadow-md   0 4px 14px rgb(15 17 23 / 0.06), 0 2px 4px rgb(15 17 23 / 0.04)
--fn-shadow-lg   0 16px 36px rgb(15 17 23 / 0.10), 0 6px 12px rgb(15 17 23 / 0.06)
```

### Inline custom shadows found across screens (deduped)

| Found                                                                              | Where                             | Proposed semantic token                                    |
| ---------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------- |
| `0 12px 28px -8px rgb(15 17 23 / 0.12)`                                            | Popover, dropdown panel           | `--fn-shadow-popover`                                      |
| `0 12px 28px -8px … , 0 4px 8px -2px …`                                            | Popover with double-stop          | `--fn-shadow-popover-strong`                               |
| `0 16px 36px -8px rgb(15 17 23 / 0.18)`                                            | Hero cards, login card light mode | `--fn-shadow-hero`                                         |
| `0 16px 36px -8px rgb(15 17 23 / 0.20)`, `…/0.25`, `…/0.30`                        | Hero cards dark mode              | `--fn-shadow-hero-dark` (single token, dark-mode override) |
| `0 18px 40px -10px rgb(15 17 23 / 0.18), 0 6px 12px -3px rgb(15 17 23 / 0.08)`     | Sheet drawer right                | `--fn-shadow-drawer-right`                                 |
| `-20px 0 40px -16px rgb(15 17 23 / 0.18)`                                          | Sheet drawer left edge            | `--fn-shadow-drawer-left`                                  |
| `-30px 0 60px -20px rgb(15 17 23 / 0.30)`                                          | Dialog modal                      | `--fn-shadow-dialog`                                       |
| `0 30px 60px -20px rgb(15 17 23 / 0.30)` (and `.40, .50`)                          | Login card                        | `--fn-shadow-auth-card` (light/dark variants)              |
| `0 30px 60px -20px rgb(40 30 70 / 0.18), 0 8px 24px -8px rgb(40 30 70 / 0.08)`     | Auth card warm-tinted             | `--fn-shadow-auth-card-warm`                               |
| `0 12px 24px -6px color-mix(…fn-accent 50%…), 0 4px 8px -2px rgb(40 30 70 / 0.12)` | Primary button hover/pressed glow | `--fn-shadow-accent-glow`                                  |
| `0 16px 30px -8px color-mix(…fn-accent 55%…), 0 6px 12px -4px …`                   | Larger primary CTA                | `--fn-shadow-accent-glow-strong`                           |
| `0 4px 10px -2px color-mix(…fn-accent 45%…)`                                       | Small accent glow                 | `--fn-shadow-accent-glow-sm`                               |
| `0 8px 16px -4px rgb(40 30 70 / 0.18), 0 0 0 1px rgb(255 255 255 / 0.5)`           | Login orbit satellite tile        | `--fn-shadow-satellite`                                    |
| `inset 0 0 0 2px var(--fn-bg-panel)`                                               | Active orbit ring                 | `--fn-shadow-orbit-active`                                 |
| `0 1px 2px rgba(0,0,0,0.15)`                                                       | Single dropdown-arrow shadow      | Drop — use `--fn-shadow-xs` instead.                       |

**OPEN-5.** 14 new semantic shadow tokens is a lot. Most are
one-context-only (login orbit, sheet, dialog). Two options:

- **(a)** Token them all anyway, so no inline `boxShadow` exists in `apps/web/`. Clean, but lots of token surface that's never re-used.
- **(b)** Token only the multi-use shadows (`popover`, `drawer-*`, `dialog`, `auth-card`). Leave one-context shadows inline in the primitive that owns them, with a `// fn-allow-default-utility` justification.

I lean **(b)** — token discipline is for things that compose, not for
hero-card paint jobs. **Approve / redirect?**

---

## 5 — Typography

### 5a — Font sizes (`--fn-text-*`)

**Extracted (px, by frequency):**
`11 (219) · 12 (218) · 11.5 (194) · 12.5 (163) · 13 (153) · 10.5 (97) · 13.5 (51) · 14 (43) · 10 (33) · 16 (29) · 24 (24) · 9.5 (17) · 18 (16) · 9 (14) · 15 (13) · 28 (12) · 26 (12) · 22 (12) · 8.5 (11) · 30 (8) · 32 (6) · 20 (6) · 17 (5) · 38 (3) · 36 (3) · 14.5 (3) · 8 (2) · 34 (2) · 4 (1) · 4.5 (1) · 6 (1) · 56 (1) · 140 (—login loading hero)`

Per the keep-fractional decision, **every distinct value gets its own token**.

### Proposed scale

| Token                    | px   | Frequency-weighted role                            |
| ------------------------ | ---- | -------------------------------------------------- |
| `--fn-text-pico`         | 4    | Dot indicator labels (1 use).                      |
| `--fn-text-pico-plus`    | 4.5  | One use (org-chart node label).                    |
| `--fn-text-2xs`          | 6    | Sub-dot label.                                     |
| `--fn-text-2xs-plus`     | 8    | Sub-script in payroll cells.                       |
| `--fn-text-2xs-hi`       | 8.5  | Currency unit suffix.                              |
| `--fn-text-xs-lo`        | 9    | Compact table sub-row.                             |
| `--fn-text-xs-lo-plus`   | 9.5  | Probation-end micro labels.                        |
| `--fn-text-xs`           | 10   | Compact eyebrows.                                  |
| `--fn-text-xs-plus`      | 10.5 | Kbd shortcut, badge text in nav.                   |
| `--fn-text-sm`           | 11   | **Primary table-label, uppercase eyebrow.** (219×) |
| `--fn-text-sm-plus`      | 11.5 | Sidebar role line, topbar currency. (194×)         |
| `--fn-text-base-lo`      | 12   | **Primary badge / pill / table sub-text.** (218×)  |
| `--fn-text-base-lo-plus` | 12.5 | Sidebar item count, KPI sub-line. (163×)           |
| `--fn-text-base`         | 13   | **Primary body text.** (153×)                      |
| `--fn-text-base-plus`    | 13.5 | Sidebar item label, topbar crumbs. (51×)           |
| `--fn-text-md`           | 14   | Form labels, secondary body. (43×)                 |
| `--fn-text-md-plus`      | 14.5 | One-off form helpers. (3×)                         |
| `--fn-text-lg`           | 15   | KPI label, card title secondary. (13×)             |
| `--fn-text-lg-plus`      | 16   | Section header title. (29×)                        |
| `--fn-text-xl`           | 17   | One-off CTAs. (5×)                                 |
| `--fn-text-xl-plus`      | 18   | Sub-heading, BrandMark md. (16×)                   |
| `--fn-text-2xl`          | 20   | Card title. (6×)                                   |
| `--fn-text-2xl-plus`     | 22   | Page title. (12×)                                  |
| `--fn-text-3xl`          | 24   | KPI mid-tier. (24×)                                |
| `--fn-text-3xl-plus`     | 26   | Compact hero number. (12×)                         |
| `--fn-text-4xl`          | 28   | KPI value mid. (12×)                               |
| `--fn-text-4xl-plus`     | 30   | Display number. (8×)                               |
| `--fn-text-5xl`          | 32   | Big metric. (6×)                                   |
| `--fn-text-5xl-plus`     | 34   | KPI primary value (employees list). (2×)           |
| `--fn-text-6xl`          | 36   | Section hero. (3×)                                 |
| `--fn-text-6xl-plus`     | 38   | Login title. (3×)                                  |
| `--fn-text-display`      | 56   | Login mark. (1×)                                   |
| `--fn-text-loading`      | 140  | Loading screen brand char. (1×)                    |

**OPEN-6.** That's **31 font-size tokens.** The keep-fractional decision
mandates this, but I want to confirm before locking it. Alternative
would be to drop the lowest-use one-offs (4, 4.5, 6, 8, 8.5, 9.5, 14.5,
17, 26, 30, 34, 38, 56, 140 — anything with ≤5 uses across 44 screens)
and accept slight drift in those contexts. Drops the surface to ~17
tokens. **Confirm 31-token scale or trim to ~17?**

### 5b — Font weight (`--fn-weight-*`)

| Token                   | Value |
| ----------------------- | ----- |
| `--fn-weight-normal`    | 400   |
| `--fn-weight-medium`    | 500   |
| `--fn-weight-semibold`  | 600   |
| `--fn-weight-bold`      | 700   |
| `--fn-weight-extrabold` | 800   |

Clean — no decisions needed.

### 5c — Line height (`--fn-leading-*`)

| Token                      | Value | Used for                                |
| -------------------------- | ----- | --------------------------------------- |
| `--fn-leading-none`        | 0.95  | Display-number squeeze (login loading). |
| `--fn-leading-unit`        | 1     | Large numbers, KPI value.               |
| `--fn-leading-tight`       | 1.35  | (2×) tight body.                        |
| `--fn-leading-tight-plus`  | 1.4   | (3×)                                    |
| `--fn-leading-snug`        | 1.45  | (2×) compact text.                      |
| `--fn-leading-normal`      | 1.5   | **Primary body line height.** (45×)     |
| `--fn-leading-normal-plus` | 1.55  | Badge / pill body. (23×)                |
| `--fn-leading-relaxed`     | 1.6   | (7×) long text.                         |
| `--fn-leading-loose`       | 1.7   | (25×) onboarding/landing copy.          |
| `--fn-leading-loose-plus`  | 1.8   | (3×)                                    |
| `--fn-leading-extra`       | 1.9   | (5×) widely-spaced quotes.              |

11 tokens. Same drift-prevention rationale as font sizes — keep all.

### 5d — Letter spacing (`--fn-tracking-*`)

| Token                            | Value    | Frequency | Role                                     |
| -------------------------------- | -------- | --------- | ---------------------------------------- |
| `--fn-tracking-display-tight`    | -0.025em | 50×       | Display headings.                        |
| `--fn-tracking-uppercase`        | 0.08em   | 40×       | Uppercase eyebrows.                      |
| `--fn-tracking-uppercase-tight`  | 0.06em   | 38×       | Currency code.                           |
| `--fn-tracking-tight`            | -0.02em  | 35×       | Body emphasis.                           |
| `--fn-tracking-tight-lo`         | -0.015em | 21×       | Hero numbers.                            |
| `--fn-tracking-uppercase-wide`   | 0.10em   | 16×       | Table column header.                     |
| `--fn-tracking-uppercase-extra`  | 0.12em   | 1×        | One-off. **OPEN-7: drop?**               |
| `--fn-tracking-uppercase-mega`   | 0.18em   | 1×        | Loading screen kicker. **OPEN-7: drop?** |
| `--fn-tracking-wide`             | 0.04em   | 12×       | Sidebar group label.                     |
| `--fn-tracking-micro-tight`      | -0.01em  | 11×       | Body tabular.                            |
| `--fn-tracking-micro-loose`      | -0.005em | 9×        | Button text.                             |
| `--fn-tracking-positive-mini`    | 0.02em   | 6×        | Mono-font currency.                      |
| `--fn-tracking-display-tighter`  | -0.03em  | 6×        | KPI numbers.                             |
| `--fn-tracking-positive-mid`     | 0.05em   | 5×        | Form labels.                             |
| `--fn-tracking-display-tightest` | -0.05em  | 3×        | Brand mark / logo.                       |
| `--fn-tracking-display-snug`     | -0.04em  | 2×        | Hero CTA.                                |
| `--fn-tracking-tight-quirky`     | -0.018em | 1×        | **OPEN-7: snap to -0.02 (drop)?**        |
| `--fn-tracking-display-quirky`   | -0.035em | 1×        | **OPEN-7: snap to -0.03 (drop)?**        |
| `--fn-tracking-normal`           | 0        | implicit  | Reset.                                   |

**OPEN-7.** Drop the 4 single-use values (`-0.018, -0.035, 0.12, 0.18`)
and snap their usages to the nearest scale? That brings tracking down
from 19 tokens to 15.

---

## 6 — Transitions (`--fn-duration-*` + `--fn-easing-*`)

### Durations

**Extracted (s):** `0.12, 0.15, 0.18, 0.2, 0.3` + a `.12s, .15s` pair from `transition: 'opacity .15s, box-shadow .12s, transform .12s'`.

| Token                  | Value | Role                                     |
| ---------------------- | ----- | ---------------------------------------- |
| `--fn-duration-fast`   | 120ms | Hover paint, box-shadow ramps.           |
| `--fn-duration-base`   | 150ms | **Primary** — color, opacity, transform. |
| `--fn-duration-medium` | 180ms | Sidebar width animation.                 |
| `--fn-duration-slow`   | 200ms | Page-level transitions.                  |
| `--fn-duration-slower` | 300ms | Drawer/modal open.                       |

### Easings

The design uses Tailwind's default `ease` everywhere except sidebar's `ease` explicit. No custom cubic-bezier curves grepped. Propose:

| Token                    | Value                                                                     |
| ------------------------ | ------------------------------------------------------------------------- |
| `--fn-easing-standard`   | `cubic-bezier(0.4, 0, 0.2, 1)` (Material standard, matches `ease-in-out`) |
| `--fn-easing-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` (Material emphasized, snappier end)          |

---

## 7 — Sizing primitives

These are semantic, not on the spacing scale (some are off-scale).

### Avatars

| Token                 | px  | Role                             |
| --------------------- | --- | -------------------------------- |
| `--fn-avatar-xs`      | 20  | Inline ref in dense text.        |
| `--fn-avatar-sm`      | 24  | Comment thread.                  |
| `--fn-avatar-md`      | 28  | Sidebar user, table row default. |
| `--fn-avatar-md-plus` | 32  | Sidebar full mode user.          |
| `--fn-avatar-lg`      | 36  | Table row generous.              |
| `--fn-avatar-xl`      | 48  | Profile-card mini.               |
| `--fn-avatar-2xl`     | 64  | Profile header.                  |

### Icon tiles

| Token               | px  | Radius                    | Role                                          |
| ------------------- | --- | ------------------------- | --------------------------------------------- |
| `--fn-icon-tile-sm` | 28  | `--fn-radius-xs-plus` (7) | KPI strip.                                    |
| `--fn-icon-tile-md` | 36  | `--fn-radius-sm` (8)      | Section header, profile-tab section.          |
| `--fn-icon-tile-lg` | 40  | `--fn-radius-md` (10)     | Dashboard KPI, login icon orbit center inner. |
| `--fn-icon-tile-xl` | 48  | `--fn-radius-lg` (14)     | Empty state, sheet header.                    |

### Layout chrome (semantic — off the scale)

| Token                 | px  |
| --------------------- | --- |
| `--fn-sidebar-full-w` | 240 |
| `--fn-sidebar-rail-w` | 64  |
| `--fn-topbar-h`       | 52  |
| `--fn-page-pad`       | 28  |

---

## 8 — Outliers and "OPEN" summary

Quick index of every decision I'm flagging for human review before A.2:

| #      | Topic     | Question                                                                                                                                  |
| ------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| OPEN-1 | Colors    | Codify avatar/chip 10-hue palette into `--fn-avatar-*` / `--fn-chip-*` tokens?                                                            |
| OPEN-2 | Colors    | Loading-mark grays (`#1a1a2e` … `#b0b0c0`) — token them or keep raw with escape-hatch?                                                    |
| OPEN-3 | Spacing   | Keep `--fn-space-15` (60px, login-only)?                                                                                                  |
| OPEN-4 | Radius    | `5px` (37×), `12px` (8×), `16/18` (1× each) — keep distinct or snap? Recommend: keep 5 and 12 distinct, snap 16→14 and 18 already exists. |
| OPEN-5 | Shadow    | Token every inline shadow (14 new), or only multi-use ones (~5 new)? Recommend (b) — only multi-use.                                      |
| OPEN-6 | Font size | 31-token scale (every fractional value) or trim to ~17 by dropping ≤5-use outliers? Per user's keep-fractional decision, default is 31.   |
| OPEN-7 | Tracking  | Drop the 4 single-use tracking values, snap to nearest? Recommend yes.                                                                    |

---

## 9 — Token surface summary

If all proposed tokens are accepted as written:

| Category                                              | Token count                           |
| ----------------------------------------------------- | ------------------------------------- |
| Colors (existing palette)                             | ~30                                   |
| Colors (avatar/chip palette + auth + shadow channels) | +25 (depends on OPEN-1, 5)            |
| Spacing scale + semantic aliases                      | 22 + 14 = 36                          |
| Radius                                                | 11                                    |
| Shadow                                                | 4 base + ~5 semantic (OPEN-5 (b)) = 9 |
| Font sizes                                            | 31 (OPEN-6)                           |
| Font weights                                          | 5                                     |
| Line heights                                          | 11                                    |
| Letter spacing                                        | 15 (after OPEN-7 trim)                |
| Transitions (duration + easing)                       | 7                                     |
| Sizing primitives (avatar / icon-tile / chrome)       | 14                                    |
| **Total**                                             | **~190 tokens**                       |

For comparison, a typical mature design system runs 150–300 tokens.
This sits in the right range — broad enough to capture the design's
intent, narrow enough to keep readable.

---

## 10 — What happens next (after this catalog is approved)

**A.2** — Rewrite `packages/config/tailwind/fn-tokens.css` with every
token above, organized into `@layer base` blocks:

```css
@layer base {
  :root {
    /* §1 colors */
    /* §2 spacing */
    /* §3 radius */
    /* …etc */
  }
  [data-theme='dark'] {
    /* overrides */
  }
}
```

Then `@theme inline { … }` registers each token as a Tailwind utility,
which is the v4 lockdown mechanism (since v4 only emits utilities
for declared theme keys).

**A.3** — Trim `tailwind.config.base.ts` to a content-paths shell.

**A.4** — ESLint rule banning raw spacing/sizing/color/radius/shadow/font-size utilities.

**A.5** — Sanity test the rule fires on a deliberate `p-4`.

**A.6** — Run lint on the codebase, write `docs/RESET_LINT_FAILURES.md` cataloging every existing violation (file → line → violation → proposed fix). These get fixed in Sub-phase D.

Then I stop for the end-of-A review.
