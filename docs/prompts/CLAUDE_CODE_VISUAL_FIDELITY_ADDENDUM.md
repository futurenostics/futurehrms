# Visual Fidelity Addendum — Read Before Implementing Any UI

This document is required reading before writing any UI code. It supplements `CLAUDE_CODE_PROMPT_PHASE_0_BOOTSTRAP.md` and applies to every subsequent phase. The standard set here is non-negotiable.

The design files in `docs/design/` represent significant upfront design work. The implementation must look identical to those designs at a glance — same colors, same typography, same spacing, same component shapes, same visual rhythm. A user comparing the implemented app side-by-side with the design screenshots should not be able to point to meaningful visual differences.

This is **not** the same as copying the inline styles from the JSX files. The reasons are explained below. But the *result* must be visually faithful.

---

## The two non-negotiable rules

**Rule 1: Use shadcn/ui primitives for all interactive components.**

Buttons, inputs, selects, dropdowns, dialogs, sheets, popovers, tooltips, tabs, command palettes, calendars, combobox/comboboxes, date pickers, accordions, switches, checkboxes, radio groups, toasts, forms, scroll areas — all of these come from shadcn. Do not build custom versions. Do not copy the design tool's inline-styled versions. shadcn handles keyboard navigation, focus management, ARIA attributes, screen reader compatibility, focus trapping in modals, and dozens of other things that take months to get right.

**Rule 2: Style those primitives to match the designs exactly.**

The shadcn defaults must be overridden so every component visually matches the designs. This is done through:
- CSS custom properties (the `--fn-*` tokens) mapped to shadcn's CSS variable names
- Tailwind utility classes on individual components where structural styling is needed
- Targeted component file edits when shadcn's default markup needs adjustment

If a Button in shadcn defaults to a different padding/radius/font than the designs, you adjust the Button. If a Dialog uses a different border-radius for the panel than the designs, you adjust the Dialog. Every primitive is verified against the design before it's considered done.

---

## The exact translation process for every screen

For every screen you implement, follow this process in order. Skipping steps causes visual drift.

### Step 1 — Open both references

Open the relevant screenshot from `docs/design/screenshots/` and the relevant JSX file from `docs/design/screens/`. Both must be visible while implementing.

### Step 2 — Extract every visual specification from the JSX

Read through the JSX file and list every visual property used:
- Colors (every `var(--fn-*)` reference, every hardcoded color)
- Font sizes, weights, line heights, letter spacing
- Padding values (every `padding: '8px 12px'`)
- Margins, gaps
- Border widths, colors, radii
- Box shadows
- Heights and widths
- Icon sizes
- Transitions

These specifications are the contract. The implementation must match every one of them.

### Step 3 — Verify the tokens are wired correctly

Before implementing the screen, verify that the tokens used in the design are available as Tailwind utilities. Open `packages/config/tailwind/tailwind.config.base.ts` and `packages/config/tailwind/fn-tokens.css`. Every `--fn-*` variable referenced in the screen must be present. Every spacing value, every radius value, every shadow value must be either a Tailwind utility (`p-4`, `rounded-lg`) or a CSS variable reference (`p-[var(--fn-...)]`).

If a token is missing, add it before implementing the screen.

### Step 4 — Build the screen with shadcn primitives

Now implement, using shadcn primitives. For each component in the design:

- If it's a button → shadcn `Button` styled with our tokens
- If it's an input → shadcn `Input`
- If it's a dropdown → shadcn `DropdownMenu`
- If it's a modal → shadcn `Dialog`
- If it's a side panel → shadcn `Sheet`
- If it's a tooltip → shadcn `Tooltip`
- If it's a tab control → shadcn `Tabs`
- If it's a popover → shadcn `Popover`
- If it's a select → shadcn `Select`
- If it's a card → shadcn `Card`
- If it's a badge → shadcn `Badge`
- If it's a date picker → shadcn `Calendar` + `Popover`
- If it's an avatar → shadcn `Avatar`

For non-interactive layout components (sections, grids, dividers, KPI cards), build with semantic HTML and Tailwind utilities — not custom React components unless they're reused across screens.

### Step 5 — Visual diff and fix

After implementing, open the implementation in the browser at the same viewport size as the design screenshot (usually 1440px wide for desktop). Open both side-by-side or alternate quickly between them. Look for:

- Color mismatches (any difference in hue, saturation, or lightness)
- Typography mismatches (wrong font, weight, size, line height, tracking)
- Spacing mismatches (different paddings, margins, gaps — even a 2px difference is noticeable in dense layouts)
- Radius mismatches (slightly more or less rounded)
- Shadow mismatches (too soft, too sharp, wrong color)
- Layout mismatches (different alignment, different proportions, missing elements)
- Iconography mismatches (different stroke width, wrong icon variant)

Every mismatch must be fixed before the screen is considered done. The goal is for someone holding the screenshot next to the implementation to find no visible differences.

### Step 6 — Component primitive verification

Before declaring any screen complete, verify the underlying primitives match the designs across all states, not just the rendered state in the screenshot:

For a Button: rendered, hover, focus (keyboard tab), active (pressed), disabled, loading. Each state must look correct, matching the design's visual language even if that specific state isn't in a screenshot.

For an Input: rendered empty, rendered with value, focused, disabled, with error, with helper text.

For a Dialog: opening transition, open state, focus trap working, escape key closing, backdrop click closing, focus returning to trigger on close.

For a DropdownMenu: closed, open, item hover, item focus (keyboard), item selected, item disabled, item with icon.

These states are not in the screenshots but must be implemented and visually consistent with the design language.

---

## Component primitive specs — match these exactly

Before any feature work begins in Phase 1, build a `docs/design/components-checklist.md` file that lists every shadcn primitive with its target visual specs and a verification screenshot. Get every primitive right first, then build screens on top. This is "build the component library first" — the same pattern professional design systems follow.

For each primitive, document:

**Button** — three sizes (sm/md/lg) × six variants (primary/secondary/ghost/soft/outline/dark/destructive/success), each with all interactive states. Match the radii, padding, font sizes, and color tokens from the design's `Button` component in `docs/design/screens/shared/primitives.jsx`. The design uses different radii per size (6/6/8px) — replicate this exactly.

**Input / Textarea / Select / Combobox** — match the height (34px for md), padding, border color (default and focused), border-radius (6px), font size (13px), placeholder color. Focused state uses accent color border, no default browser ring. Disabled state mutes the text and background.

**Card** — white panel background, 14px border radius (rLg), 1px border with the border token color, shadow-sm by default, card header has a 16px bottom-border divider.

**Badge / Pill** — small padding (2px 8px), font size 11px, font weight 500, full radius. Semantic variants use the soft tokens (`--fn-success-soft`, etc.) for background and the corresponding soft-fg tokens for text.

**Dialog / Sheet** — backdrop at 50% black, panel uses `--fn-bg-panel`, border-radius 18px (rXl), shadow-lg, header has a bottom border, footer has a top border, padding 24px throughout, escape key and backdrop click both close, focus trap is enforced, focus returns to trigger on close.

**Tooltip** — dark panel background (`--fn-fg`), light foreground (`--fn-fg-invert`), padding 6px 10px, font size 12px, 6px radius, small arrow pointer, 4px offset from trigger, 300ms delay before showing.

**Tabs** — underlined style (not pill style), active tab has accent underline (2px), inactive tabs use muted foreground, hover state uses regular foreground, transition is 150ms.

**Sidebar nav items** — exact pattern from `docs/design/shared/chrome.jsx`: icon (lucide 20px) on left, label, optional count badge or notification badge on right, 12px vertical padding, 16px horizontal, 8px gap between icon and label, active state uses accent-soft background and accent-soft-fg text, hover uses neutral-soft background.

**Topbar** — 56px tall, white background, bottom border 1px, contents: collapse-toggle, breadcrumb, search (cmd+K), currency toggle (USD/PKR), notification bell with badge, user avatar dropdown.

**KPI Cards (dashboard)** — white panel, 14px radius, 24px padding, icon tile in `--fn-icon-tile` background top-left (40x40, 10px radius), card title 14px medium muted, big number 28px semibold display font, delta pill below the number using semantic soft colors.

Verify each of these against the JSX files and screenshots before moving on.

---

## The verification workflow per screen

When you finish implementing any screen, before marking it complete:

1. Open the implementation in the browser at 1440px viewport, light mode.
2. Open the corresponding design screenshot from `docs/design/screenshots/` at 1440px.
3. Take a screenshot of your implementation at the same dimensions.
4. Place both screenshots side by side.
5. Walk through the comparison systematically — top to bottom, left to right.
6. Document any differences in the PR description.
7. Fix any differences before merging.
8. Then repeat in dark mode if the screen supports it.
9. Then test at 768px (tablet) and 375px (mobile) — these aren't in the original designs but the screen must adapt cleanly.

If a difference is intentional (e.g., the design showed a state that doesn't exist in your data, so the layout reflowed), document the difference and why. If a difference is unintentional, fix it.

This workflow is slow. It's supposed to be. The cost of fixing visual drift later is much higher than the cost of catching it now. Settling for "close enough" early produces a UI that gradually drifts away from the design and ends up looking like a different product.

---

## When the design files conflict with shadcn's structure

Sometimes the design tool's component structure doesn't match shadcn's. For example, the design might have a dropdown that shows a search input above the items; shadcn's DropdownMenu doesn't include search by default but shadcn's Command component does. In this case, use Command, not DropdownMenu. Choose the shadcn primitive whose *behavior* matches the design, not the one whose name matches.

If no shadcn primitive matches the behavior, two options:
1. Compose shadcn primitives — e.g., a "filter dropdown" might be Popover + Command + Checkbox.
2. As a last resort, extend a shadcn primitive by editing its file in `components/ui/`. shadcn components are owned, not vendored — you can modify them.

Never build a custom interactive component from scratch when shadcn or a composition of shadcn primitives can serve the need.

---

## When the design files have ambiguous or missing states

The design files show specific states (one screenshot per state, maybe a few). Real implementation needs many more states than the designs cover:

- Loading state (skeleton or spinner)
- Empty state (no data)
- Error state (API failure, validation failure)
- Long-content state (text that wraps or truncates)
- Permission-denied state (user can't see this)
- Concurrent-edit state (someone else changed the data)
- Disabled state per interactive element

When a state isn't in the design, design it yourself by:
1. Reading the design briefs in `docs/design/briefs/` — many briefs describe states that aren't in the screenshots.
2. Following shadcn's conventions for that state (shadcn's `Skeleton` component for loading, shadcn's `Empty` patterns for empty states).
3. Using the design tokens consistently — same colors, same spacing rhythm, same typography.

If a critical state is genuinely ambiguous, ask before implementing. Don't guess and don't pick a default that looks different from the rest of the app.

---

## Verifying the design language stays consistent over time

After Phase 0 lands and shadcn primitives are styled, every new screen built in later phases must match the established design language. To prevent drift:

1. **No new color values.** Every color in a new screen must come from the established `--fn-*` token palette. If a new semantic color is needed (say, a "purple" for a new module), add it to the tokens file first, document it, then use it.

2. **No new typography sizes.** Use the established type scale. If a new size is needed, add it to the Tailwind config first.

3. **No new spacing values.** Use the established spacing scale (4, 8, 12, 16, 20, 24, 32, 48, 64). If a value isn't on this scale, you're probably making an exception that should be normalized.

4. **No new radius or shadow values.** Use the established scales (rXs through rXl, shadowXs through shadowLg).

5. **No new component primitives.** If a new screen needs a primitive that doesn't exist, add it once to the component library (and document it in `docs/design/components-checklist.md`), then use it. Don't create one-off custom components inline.

A small visual style guide at `docs/design/style-guide.html` should be built in Phase 0 — a single page rendering every primitive in every state. It becomes the canonical reference and the test page for the design tokens.

---

## The build-the-component-library-first principle

Before building any feature screen in Phase 1+, complete the component library:

1. Implement every shadcn primitive listed above with proper styling.
2. Build the style guide page at `/dev/style-guide` (gated to development mode and admin users).
3. The style guide shows every primitive in every state, side by side with the design reference.
4. Get the component library reviewed and signed off before building any feature screen.
5. Feature screens then compose from the library, not from raw HTML.

This is non-obvious but critical: trying to perfect components while building screens means components keep changing and screens have to be re-fixed every time. Doing components first means screens compose from a stable library.

The style guide should remain in the codebase forever — it's the canonical visual reference for new engineers and for verifying that no module quietly drifts.

---

## Specifications that override defaults — the precise values

These exact values must override shadcn's defaults. Implement them in `packages/config/tailwind/fn-tokens.css` and the Tailwind config:

**Font family override** — Poppins for sans (display and body), Geist Mono for code. shadcn defaults to system fonts; override globally.

**Radius scale** — `--radius-xs: 6px`, `--radius-sm: 8px`, `--radius-md: 10px`, `--radius-lg: 14px`, `--radius-xl: 18px`, `--radius-full: 999px`. shadcn defaults to 0.5rem (8px) for `--radius`; map our scale.

**Color tokens** — every `--fn-*` variable from `docs/design/tokens/tokens.jsx` must be present in CSS and mapped to a Tailwind color name (`fn-accent`, `fn-accent-soft`, `fn-bg`, `fn-bg-panel`, `fn-bg-subtle`, `fn-bg-inset`, `fn-border`, `fn-border-strong`, `fn-divider`, `fn-fg`, `fn-fg-muted`, `fn-fg-faint`, `fn-fg-invert`, `fn-success`, `fn-success-soft`, `fn-success-soft-fg`, `fn-warning`, `fn-warning-soft`, `fn-warning-soft-fg`, `fn-danger`, `fn-danger-soft`, `fn-danger-soft-fg`, `fn-info`, `fn-info-soft`, `fn-info-soft-fg`, `fn-icon-tile`, `fn-icon-tile-fg`).

**shadcn variable remapping** — open `globals.css` and override every shadcn CSS variable (`--background`, `--foreground`, `--card`, `--card-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--destructive-foreground`, `--border`, `--input`, `--ring`) to map to the corresponding `--fn-*` variable. This makes every shadcn primitive automatically pick up the FN theme.

**Dark mode** — replicate the same remapping under `[data-theme="dark"]` using the dark mode tokens from the design.

**Shadow scale** — `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg` exactly as defined in the design tokens. shadcn defaults are different; override.

---

## Concrete first-week verification milestones

By the end of Phase 0, these specific checks should pass:

**Check 1 — Color tokens reach the DOM.** Open the dashboard in DevTools. Inspect any element. Confirm `--fn-accent` is set on `:root` and resolves to `oklch(0.55 0.18 280)` in light mode and the dark variant in dark mode.

**Check 2 — Poppins is rendering.** Inspect the body's computed font-family. Confirm Poppins is loaded and applied. Confirm font weights 400/500/600/700 are available (test by setting a paragraph to each weight and visually verifying).

**Check 3 — shadcn picks up the theme.** Open the style guide page. A primary Button should be indigo-violet (our accent), not shadcn's default. A success Badge should be mint/teal, not shadcn's default green. A destructive Button should be coral, not red.

**Check 4 — Login page visual match.** Compare the implemented `/login` page side-by-side with `docs/design/screens/login.jsx` rendered output (the screenshot or the JSX in a sandbox). The differences should be invisible.

**Check 5 — Sidebar visual match.** Compare the implemented sidebar with `docs/design/shared/chrome.jsx`. Logo, nav groups, active state, hover state, badge styles, count pills — all should match.

**Check 6 — Dashboard placeholder visual match.** The empty placeholder dashboard, even with just one "Hello, [name]" widget, should look like it belongs to the design system — same page padding, same typography hierarchy, same card patterns.

**Check 7 — Dark mode parity.** Toggle to dark mode. Every screen should switch cleanly. Compare with `docs/design/screens/states.jsx` if it shows dark mode variants.

If any of these seven checks fail, do not proceed to Phase 1. Fix the foundation first.

---

## Communication contract with me

When implementing screens, in PR descriptions you must include:

1. Screenshot of the implementation
2. Screenshot of the design reference, same viewport
3. List of any deviations and why
4. Confirmation that all interactive states (focus, hover, active, disabled, loading, error) have been visually verified
5. Confirmation that the screen has been tested in light and dark mode
6. Confirmation that the screen has been tested at desktop, tablet, and mobile viewports

This is the verification protocol. It is slower than just shipping screens. It produces a system that actually looks like the designs.

---

## Why we're doing it this way

To be explicit about the reasoning: the design files represent visual intent. shadcn provides interactive correctness. The job of implementation is to honor both — visually identical to the designs, structurally correct via shadcn. The two are not in conflict; they're complementary. A button can be exactly the same color, padding, radius, and font as the design *and* have proper focus management, keyboard navigation, and screen reader support. Both, not one or the other.

The trap to avoid is: "the designs are sacred, copy them exactly, including the inline styles." This produces visually faithful but accessibility-broken code. Within three months, you have a UI that looks great in screenshots and is unusable for keyboard users, breaks WCAG 2.1 AA, and fails any compliance audit. Pakistani labour law doesn't yet require accessibility audits, but EU markets do, and Anthropic's clients increasingly do. Building accessibility in from day one costs the same as building it in later costs 100x.

The discipline of "visual fidelity via tokens, structural correctness via shadcn" is what professional teams ship. It's worth the upfront care.