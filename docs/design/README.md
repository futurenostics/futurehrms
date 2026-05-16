# Design Reference

This folder contains the visual reference for the Futurenostics HRMS, produced in Claude Design. **These are reference materials, not source code.** The implementation lives in `apps/web/` and uses shadcn/ui primitives styled with our design tokens. Engineers consult this folder to understand the target visual language; they do not copy from it.

---

## What's in this folder

```
docs/design/
├── README.md                          ← this file
├── screens/                           ← JSX files for each designed screen (visual reference)
├── shared/                            ← the design system source of truth
│   ├── tokens.jsx                     ← colors, fonts, spacing, radius, shadows
│   ├── primitives.jsx                 ← component patterns (buttons, inputs, cards)
│   ├── chrome.jsx                     ← app shell — sidebar, topbar, navigation
│   └── flow-chart.jsx                 ← flow chart visualization patterns
│
├── design-canvas.jsx                  ← Claude Design's canvas wrapper — IGNORE
├── main.jsx                           ← Claude Design's entry point — IGNORE
├── tweaks-panel.jsx                   ← Claude Design's interactive controls — IGNORE
├── Futurenostics HRMS.html            ← Claude Design's HTML preview — open this to view designs
└── Futurenostics HRMS-print.html      ← Claude Design's print export
```

### Files engineers actually use

- **`shared/tokens.jsx`** — the source of truth for every color, font family, radius, and shadow value. The Tailwind config and CSS variables in `packages/config/tailwind/` are derived from this file. If you need to know what color the accent is, look here.
- **`shared/primitives.jsx`** — reference patterns for components: Button variants, Input states, Card shapes, Badge styles, etc. Use this as a visual specification when styling shadcn primitives.
- **`shared/chrome.jsx`** — the app shell: sidebar structure, navigation groups, topbar layout, logo, user menu. The implementation's `<AppShell>` component matches this.
- **`shared/flow-chart.jsx`** — patterns for flow charts and step indicators.
- **`screens/*.jsx`** — one file per designed surface. Each shows the intended layout, content, and component composition for that screen.

### Files engineers ignore (Claude Design's runtime wrapper)

- `design-canvas.jsx`, `main.jsx`, `tweaks-panel.jsx`. These let the designs be previewed in a browser. They contain no implementation patterns worth copying.

### Viewing the designs in a browser

Open `Futurenostics HRMS.html` in any modern browser to see all the designs rendered. This is the easiest way to see what a screen should look like when implementing. The print version is for occasional reference when you need a static export.

---

## How to use this folder when building a screen

For every screen you implement, follow this process:

### 1. Find the relevant files

- Open the matching JSX file in `screens/` (e.g., for the login screen, `screens/login.jsx`).
- Open `Futurenostics HRMS.html` in the browser to see the rendered design.
- Identify which design briefs describe this surface, if any.

### 2. Read the intent

The JSX file shows the visual target. The HTML preview shows the rendered result. The brief, if one exists, explains the *intent* — what states need to exist, what edge cases matter, what should adapt to different user roles.

### 3. Extract the visual specs from the JSX

Read through the JSX and note every visual property used:
- Color tokens (every `var(--fn-*)` reference)
- Font sizes, weights, line heights
- Padding and margin values
- Border widths, colors, radius values
- Shadow tokens
- Heights, widths, icon sizes

These are the contract. The implementation must hit every one of them.

### 4. Verify the tokens are wired in Tailwind

Before implementing, confirm that every token used in the design is available as a Tailwind utility or CSS variable in `packages/config/tailwind/`. If a token is missing, add it before implementing. Tokens never get hardcoded in component files.

### 5. Build with shadcn primitives, styled to match

Use shadcn/ui primitives for every interactive component — Button, Input, Dialog, Sheet, Popover, DropdownMenu, Command, Calendar, Combobox, Tabs, Tooltip, Form, Toast, etc. The shadcn primitives are styled (via Tailwind classes mapping to our tokens) to match the designs visually.

**Do not** copy the inline-styled custom components from the JSX files into your code. The design tool produced standalone components without accessibility, keyboard navigation, focus management, or proper state handling. shadcn provides all of these correctly. Style shadcn to look like the designs; don't replace shadcn with the designs.

### 6. Visual diff before declaring done

Open the implementation in the browser at the same viewport size as the design (typically 1440px wide for desktop). Open `Futurenostics HRMS.html` at the same width. Place both side by side. Walk through them systematically — top to bottom, left to right. Look for:

- Color mismatches (any hue, saturation, or lightness difference)
- Typography mismatches (font, weight, size, line height)
- Spacing mismatches (paddings, margins, gaps — even a 2px difference)
- Radius and shadow mismatches
- Layout mismatches (alignment, proportions)
- Icon mismatches (stroke width, variant)

Every mismatch must be fixed before merging.

If you want a more rigorous workflow, capture a screenshot of the relevant screen from the HTML preview and save it alongside your PR for side-by-side comparison.

### 7. Cover the states the design doesn't show

The designs show one state per screen — usually the "happy path" with sample data. Real implementation needs more states:

- Loading (skeleton)
- Empty (no data)
- Error (API failure)
- Long content (text wrapping or truncation)
- Permission-denied (user can't see this)
- Interactive states for components (focus, hover, active, disabled, loading)

When a state isn't in the design, design it using the established tokens and shadcn conventions. Stay within the system. If a state is genuinely ambiguous, ask before implementing — don't guess.

---

## The design system in three numbers

For quick reference:

**Font:** Poppins (sans + display), Geist Mono (code). Loaded via `next/font/google` in `apps/web/app/layout.tsx`.

**Accent color:** `oklch(0.55 0.18 280)` — an indigo-violet. Available as `--fn-accent` and as the Tailwind class `bg-fn-accent` / `text-fn-accent`.

**Border radius scale:** 6px (xs), 8px (sm), 10px (md), 14px (lg), 18px (xl), full. Available as `rounded-fn-xs` through `rounded-fn-xl`.

All other tokens follow the same pattern: defined in `shared/tokens.jsx`, exposed as CSS variables, surfaced as Tailwind utilities.

---

## How this folder is maintained

- The JSX files and HTML preview are produced by Claude Design and are checked in as immutable reference. They are not edited by engineers.
- When a screen needs a new variant (e.g., a new module is added, an existing surface gets a new state), the design tool generates new files. The new files replace the old ones in the same location.
- The `shared/tokens.jsx` file is the single source of truth for design tokens. When tokens change, this file changes, and the Tailwind config + CSS variables in `packages/config/tailwind/` are regenerated to match.

---

## A note on visual fidelity

The implementation aims for visual fidelity to these designs, not pixel-perfect copying. The difference matters:

- **Visual fidelity** means: same colors, same typography, same spacing rhythm, same component shapes, same overall feel. A user comparing the implementation to the designs side-by-side should not see meaningful differences. This is what we ship.
- **Pixel-perfect copying** would mean reproducing the design tool's inline styles verbatim. This produces code that looks identical to screenshots but lacks accessibility, keyboard navigation, and proper state handling. This is what we don't do.

The discipline is: visual identity comes from tokens (sacred, copied exactly). Structural correctness comes from shadcn (battle-tested, accessible). Both, not one or the other.

For the full standard, see `docs/prompts/CLAUDE_CODE_VISUAL_FIDELITY_ADDENDUM.md`.

---

## Where related materials live

- **Implementation prompts** for Claude Code: `docs/prompts/`
- **Architecture documents** including TDDs: `docs/tdds/`
- **Architecture decision records:** `docs/adr/`
- **Running log of decisions and trade-offs:** `docs/DECISIONS.md`
- **Design briefs** that describe what each screen needs to do (not stored in this repo; available separately)

If you need to understand *why* a screen looks the way it does — what user problem it solves, what states must exist, what edge cases matter — the briefs are the answer. They're maintained outside this folder and can be requested from the project owner.