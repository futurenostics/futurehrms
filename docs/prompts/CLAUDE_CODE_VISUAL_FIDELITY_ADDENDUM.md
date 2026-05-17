# Visual Fidelity Addendum — Read Before Implementing Any UI

This document is required reading before writing any UI code in this repository. The standard set here is non-negotiable.

The design files in `docs/design/` represent significant upfront design work. The implementation must look identical to those designs at a glance — same colors, same typography, same spacing, same component shapes, same visual rhythm. A user comparing the implemented app side-by-side with the design at the same viewport size should not be able to point to meaningful visual differences.

This is **not** the same as copying inline `style={{}}` blocks from the JSX files. The reasons are explained below. But the *result* must be visually faithful, and the structural mechanisms in this repo make it the path of least resistance to get there.

---

## The five non-negotiable rules (strict mode)

These five rules were established at the Foundation Reset and are enforced by the build system itself, not by good intentions. Internalize them before writing a single className.

### Rule 1 — No raw Tailwind default utilities for properties with design tokens

Spacing, sizing, color, radius, shadow, font-size, font-weight, line-height, and letter-spacing **must come from `fn-*` tokens**. `p-4`, `text-sm`, `rounded-md`, `bg-blue-500`, `shadow-sm`, `font-semibold`, `leading-none`, `tracking-tight` — all banned.

The replacements are:

| Banned | Use instead |
|---|---|
| `p-4`, `m-2`, `gap-3`, `inset-2`, `top-4` | `p-fn-4`, `m-fn-2`, `gap-fn-3`, `inset-fn-2`, `top-fn-4` (numeric scale from `fn-tokens.css §1.14`) |
| `w-9`, `h-9`, `size-4`, `min-w-32` | `w-fn-9`, `h-fn-9`, `size-fn-4`, `min-w-fn-8` |
| `text-sm`, `text-xl`, `text-2xl` | `text-fn-sm`, `text-fn-xl`, `text-fn-2xl` (31-step scale in `fn-tokens.css §1.10`) |
| `font-medium`, `font-semibold`, `font-bold` | `font-fn-medium`, `font-fn-semibold`, `font-fn-bold` |
| `leading-none`, `leading-tight`, `leading-normal` | `leading-fn-unit`, `leading-fn-tight`, `leading-fn-normal` |
| `tracking-tight`, `tracking-wide` | `tracking-fn-tight`, `tracking-fn-wide` |
| `rounded-md`, `rounded-lg`, `rounded-full` | `rounded-fn-md`, `rounded-fn-lg`, `rounded-fn-full` |
| `shadow-sm`, `shadow-lg` | `shadow-fn-sm`, `shadow-fn-lg` |
| `bg-blue-500`, `text-gray-700`, `border-slate-200` | `bg-fn-accent`, `text-fn-fg-muted`, `border-fn-border` |

What stays default and usable: every layout/positioning utility (`flex`, `grid`, `items-center`, `justify-between`, `absolute`, `relative`, `sticky`), transitions (`transition`, `transition-colors`, `duration-150`), display (`hidden`, `block`, `inline-flex`), opacity, overflow, cursor, and the `mx-auto` / `w-full` / `h-screen` family of structural keyword-based layout primitives. These have no design-token implications.

Numeric `0` (`p-0`, `top-0`, `min-w-0`, `inset-0`) is also allowed — it's a layout-reset marker, not a scale step.

The rule is enforced by `fn-tokens/no-default-utilities` (ESLint). It runs on every commit and fails CI. Violating it does not get you a warning; it gets you a red build.

### Rule 2 — No inline styles in components except for genuinely dynamic values

`style={{ padding: 16 }}` for a static value is a violation of the spirit of Rule 1 — it just routes around the lint rule. Use the className path so the design tokens flow through.

The exceptions are values that are *genuinely* dynamic at render time:

- Computed colors: `style={{ background: 'var(--fn-avatar-bg-' + hue + ')' }}` when the hue comes from a hash of the user's name.
- Computed transforms / layout: `style={{ transform: 'translateY(' + scrollOffset + 'px)' }}`.
- Style props passed through to a low-level primitive: a third-party component's `style` prop.

Static values, even if they're "just this one place", go through the token system. If a token doesn't exist for the value you need, add it to `fn-tokens.css` first.

### Rule 3 — Modify primitives at the source, not at usage sites

A Button's padding is set once in `apps/web/components/ui/button.tsx`, not overridden with `className="px-6"` at every usage. A Card's border-radius is set in `apps/web/components/ui/card.tsx`, not patched at the screen level.

Usage sites only customize layout and positioning (`mt-fn-4`, `w-full`, `grid-cols-2`) — never the primitive's internal styling. If a primitive doesn't render the way you need, the fix is to update the primitive, add a variant, or compose two primitives — never to override its internals from outside.

When a primitive is wrong at the source, every screen using it inherits the fix. When it's overridden at usage sites, every screen drifts independently and the design system breaks down within months.

### Rule 4 — Every primitive verified visually against the design before use

A primitive is "done" only when it renders identically to the design's reference in every variant and every state. "Looks the same" is not verification.

The verification surface is `/dev/style-guide` (dev-only — `NODE_ENV !== 'production'`). Every primitive in `apps/web/components/ui/` is shown there in every variant and state, with the design's reference value documented beside it in a spec table.

If a screen needs a primitive that isn't yet verified against the design, the work pauses and the primitive is verified first. Don't build screens on un-verified primitives — you'll have to redo the screens.

The detailed per-primitive verification process lives in `docs/prompts/QA_VERIFICATION_PROTOCOL.md` §3.

### Rule 5 — Every screen section verified during the build, not after

Don't build a whole screen and then compare to the design. Build one section, verify it against the design at 1440px in both light and dark mode, then move to the next section. The cost of fixing visual drift compounds — five sections of accumulated drift takes much longer to fix than five sections each fixed at the moment they were built.

The per-section process lives in `docs/prompts/QA_VERIFICATION_PROTOCOL.md` §4.

---

## Why these rules exist

The first failure mode of UI work in this codebase, observed repeatedly before the Foundation Reset, was: **the agent rounds.** A design value of 14px gets implemented as `p-3` (12px) or `p-4` (16px) because those are the closest values on Tailwind's default scale. A weight of 600 gets implemented as `font-semibold` (which is 600, but in the wrong namespace) and then drifted to 500 the next time. A border-radius of 6px becomes 8px because "8 is closer to what shadcn defaults give us." Individually each error is tiny. Cumulatively, the result doesn't match the design.

The strict-mode rules close every rounding path:

- **Rule 1** removes the default Tailwind scale entirely. The agent can't reach for `p-3` anymore — it's a lint error. The only available `p-` values are the design's actual values, available as `p-fn-3.5` for 14px.
- **Rule 2** prevents the escape via inline styles.
- **Rule 3** prevents the local-override escape — a screen author can't quietly retune a primitive at their call site.
- **Rule 4** + **Rule 5** prevent the "we'll fix it later" escape — verification happens as you build, not afterward when the rework is expensive.

The discipline is the value.

---

## The translation process for every screen

For every screen you implement, follow this in order. Skipping steps causes visual drift.

### Step 1 — Open both references at the same viewport

Open the relevant JSX in `docs/design/screens/`. Open the rendered `docs/design/Futurenostics HRMS.html` at 1440px in a browser. Both must be visible while implementing. Use a side-by-side window arrangement; alternating tabs causes the agent to miss differences.

### Step 2 — Extract every visual specification from the JSX

Read through the JSX file and list every visual property used:

- Colors (every `var(--fn-*)` reference, every hardcoded color — flag the hardcoded ones for tokenization)
- Font sizes, weights, line heights, letter spacing — every distinct numeric value
- Padding values, including compound `padding: '12px 18px'` strings
- Margins, gaps
- Border widths, colors, radii
- Box shadows (whether token-backed or inline)
- Heights and widths (esp. for non-stretchy elements)
- Icon sizes
- Transitions

These specifications are the contract. The implementation must match every one of them.

### Step 3 — Verify the tokens are wired

For every value extracted in Step 2, confirm there's a matching `--fn-*` token in `packages/config/tailwind/fn-tokens.css`. The catalog at `packages/config/tailwind/extracted-tokens.md` indexes them all.

If a token is missing, the screen pauses. Add the token to `fn-tokens.css`, register it in the `@theme inline` block (so it generates a `text-fn-*` / `bg-fn-*` / `p-fn-*` utility), and add the row to `extracted-tokens.md`. Then resume the screen.

Never use an arbitrary value like `text-[13.5px]` "just for this one place" — that's the rounding failure mode in disguise.

### Step 4 — Build the screen with primitives from `components/ui/`

For each visual element in the design, identify the primitive that owns it:

| If the design has… | Use… |
|---|---|
| Button | `Button` from `components/ui/button.tsx` |
| Input | `Input` |
| Dropdown menu | `DropdownMenu` |
| Modal / dialog | `Dialog` |
| Side panel / drawer | `Sheet` |
| Tooltip | `Tooltip` |
| Tab control | `Tabs` |
| Popover | `Popover` |
| Select | `Select` |
| Combobox (searchable select) | `Combobox` |
| Card / panel | `Card` |
| Badge / status pill | `Badge` (semantic variants) or `StatusPill` (with dot) |
| Date picker | `Calendar` + `Popover` composition |
| Avatar | `Avatar` (or `EmployeeAvatar` for the deterministic-color version) |
| Inline loading | `Spinner` |
| Form field row | `FormField` + `FormControl` + `FormLabel` + `FormMessage` |

For non-interactive layout (sections, grids, dividers, KPI cards, banners), build with semantic HTML and Tailwind utilities. If the same composition appears more than twice, promote it to a small reusable component under `components/{module}/`. Don't keep one-off compositions inline if they're going to repeat.

### Step 5 — Per-section visual verification

After implementing each *section* of the screen (not after the whole screen), run §4 of the QA protocol against it. The minimum is: screenshot of the implementation at 1440px, screenshot of the design at 1440px, side-by-side comparison, list every visible difference, fix.

Only move to the next section once the current section matches. Accumulating unverified sections is the failure mode that produced the original drift this Reset is meant to undo.

### Step 6 — Final pass: dark mode, mobile, interactive states

Before declaring the screen done, repeat the verification:

- In dark mode (toggle via the theme switcher).
- At 768px viewport (tablet — sections may collapse to single column).
- At 375px viewport (mobile — same).
- For every interactive state of every primitive: hover, focus (keyboard tab), active, disabled, loading, error.

Most of these states are absent from the static design screenshots. Use the design language consistently — match the colors, transitions, and rhythm the design has established for visible states, and extend the same language to the absent ones.

### Step 7 — File the QA report

When the screen passes the per-section discipline and the final pass, file a QA report at `docs/qa-reports/{screen-name}/{date}-qa-report.md` per the protocol. The report is the audit trail — six months from now, when something visibly drifts, the report is what you compare against.

---

## Primitive verification — the style guide

Every primitive in `apps/web/components/ui/` has a corresponding section in `/dev/style-guide` showing:

- Every variant (e.g., Button has 8 variants × 3 sizes).
- Every state (idle, hover, focus, active, disabled, loading, error).
- A spec table listing the design source for each measurable property (size, weight, color, radius, padding, etc.) so the rendered output and the spec are side-by-side comparable.

When a primitive is changed, its style guide section is updated in the same commit. When a primitive is added, its style guide section is added in the same commit. The rule is: a primitive without a style guide section doesn't exist.

The style guide is dev-only — gated by `NODE_ENV !== 'production'` in `apps/web/app/(dev)/layout.tsx`. It does not appear in production navigation and does not ship in production bundles.

---

## Escape hatches and their abuse

### The `eslint-disable-next-line` escape

If a default Tailwind utility is genuinely required (extremely rare — usually a third-party CSS class that conflicts with the lockdown), the escape is:

```tsx
// eslint-disable-next-line fn-tokens/no-default-utilities
<div className="p-4 …" />
```

**Using this comment is a signal to ask whether a new token is needed.** If you use it more than once or twice in a screen, you're probably reaching for a value that should be in the token system. Stop, add the token, remove the escape.

If you genuinely have a brand-color exception (e.g., Microsoft Azure brand colors in an SSO row, where we cannot use our palette), document the reason in a code comment alongside the escape.

### The `// fn-allow-default-utility` legacy escape

Same effect, different spelling. The `fn-allow-default-utility` comment was the original Reset-era escape but `eslint-disable-next-line fn-tokens/no-default-utilities` is the canonical form going forward. Both work; prefer the canonical one in new code.

### Adding to the legacy skip-list

`packages/config/eslint/legacy-skip-list.mjs` lists files that pre-date the Reset and are awaiting remediation. **Adding a file to this list is not an escape hatch.** It is only allowed for code that genuinely pre-dates the Reset lockdown commit. New files must comply from day one.

The skip-list shrinks during Sub-phase D. Adding to it grows technical debt and contradicts the Reset's purpose.

---

## When the design has ambiguous or missing states

The design files show specific states. Real implementation needs many more states than the designs cover:

- Loading (skeleton or Spinner)
- Empty (no data — use an `EmptyState` composition)
- Error (API failure, validation failure)
- Long-content (text that wraps or truncates)
- Permission-denied (user can't see this)
- Concurrent-edit (someone else changed the data)
- Disabled per interactive element

When a state isn't in the design, design it yourself by:

1. Reading the design briefs in `docs/design/briefs/` (if present) — many briefs describe states that aren't in the rendered HTML.
2. Following the design language consistently: same colors, same spacing rhythm, same typography, same animation durations.
3. Reusing patterns from other screens that handle the equivalent state (e.g., the empty state on Employees list and the empty state on Org Chart should look identical).

If a critical state is genuinely ambiguous, ask before implementing. Don't guess and don't pick a default that looks different from the rest of the app.

---

## When the design conflicts with shadcn structure

Sometimes the design's component structure doesn't match shadcn's. For example, the design might have a dropdown that includes a search input above the items; shadcn's `DropdownMenu` doesn't include search by default but shadcn's `Command` component does. In this case, use `Command`, not `DropdownMenu`. Choose the shadcn primitive whose **behavior** matches the design, not the one whose **name** matches.

If no shadcn primitive matches the behavior, two options:

1. Compose shadcn primitives — e.g., a "filter dropdown" might be `Popover` + `Command` + `Checkbox`.
2. As a last resort, extend a shadcn primitive by editing its file in `components/ui/`. shadcn components are owned, not vendored — you can modify them.

Never build a custom interactive component from scratch when shadcn or a composition of shadcn primitives can serve the need. shadcn handles keyboard navigation, focus management, ARIA, focus trapping in modals, and dozens of other things that take months to get right.

---

## Communication contract for PRs touching UI

A PR that touches any UI must include in its description:

1. **Screenshots of the implementation** at 1440px in both light and dark mode.
2. **Screenshots of the design reference** at the same viewport in both themes.
3. **A diff list** of any intentional deviations (and why — e.g., "the design showed a state our data can't produce, layout reflowed accordingly").
4. **Confirmation that all interactive states were verified** (focus / hover / active / disabled / loading / error).
5. **Confirmation that the screen renders cleanly at 768px and 375px** (or a note that those viewports are deferred with a rationale).
6. **The QA report path** for screens that went through formal verification.

This is the verification protocol. It is slower than just shipping screens. It produces a system that actually looks like the designs and stays that way as the codebase grows.

---

## Why we do it this way

The design files represent visual intent. shadcn provides interactive correctness. The job of implementation is to honor both — visually identical to the designs, structurally correct via shadcn. The two are not in conflict; they're complementary. A button can be exactly the same color, padding, radius, and font as the design *and* have proper focus management, keyboard navigation, and screen-reader support. Both, not one or the other.

The trap to avoid: "the designs are sacred, copy them exactly, including the inline styles." This produces visually faithful but accessibility-broken code that fails any compliance audit within three months. Pakistani labour law does not yet require accessibility audits; EU markets do, and Anthropic's clients increasingly do. Building accessibility in from day one costs the same as building it in later costs 100x.

The discipline of "visual fidelity via tokens, structural correctness via shadcn, verification during the build, primitives modified at source" is what professional teams ship. It is worth the upfront care.

---

## Quick reference — where things live

| Looking for… | Read… |
|---|---|
| Every design token (color, spacing, font-size, etc.) | `packages/config/tailwind/fn-tokens.css` |
| The catalog with frequency data and rationale | `packages/config/tailwind/extracted-tokens.md` |
| The ESLint rule that enforces fn-* | `packages/config/eslint/rules/no-default-utilities.mjs` |
| Files pre-Reset, awaiting remediation | `packages/config/eslint/legacy-skip-list.mjs` |
| The verification surface for primitives | `apps/web/app/(dev)/style-guide/page.tsx` |
| Per-section + per-screen verification process | `docs/prompts/QA_VERIFICATION_PROTOCOL.md` |
| Outstanding screen-remediation work | `docs/RESET_LINT_FAILURES.md` |
| The original design source of truth | `docs/design/shared/{tokens,primitives,chrome}.jsx` + `docs/design/screens/*.jsx` |
| The design's rendered output | `docs/design/Futurenostics HRMS.html` (open at 1440px) |
