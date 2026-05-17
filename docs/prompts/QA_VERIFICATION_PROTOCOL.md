# QA Verification Protocol

This document defines **how visual fidelity is verified** in this codebase. It is the runnable companion to `CLAUDE_CODE_VISUAL_FIDELITY_ADDENDUM.md` (which defines *what* the discipline is and *why* it exists).

The protocol exists at three scales:

- **§3 Per-primitive verification** — runs when a primitive in `components/ui/` is rebuilt or added.
- **§4 Per-section verification** — runs *during* the build of any screen, after each visual section is implemented.
- **§5 Per-screen verification** — runs once before declaring a screen done and merging the PR.

A screen that has not gone through §4 during the build and §5 before merge has not been visually verified, regardless of how it looks at a glance.

---

## §1 — Verdict system

Every verification run produces one of three verdicts:

| Verdict | Meaning | What happens next |
|---|---|---|
| **PASS** | Every checklist item matches the design. Zero visible differences at 1440px in both themes. | Continue (next section / next primitive / merge). |
| **NEEDS_FIXES** | One or more items diverge from the design but the divergence is fixable inside the existing scope. | Fix the flagged items. Re-run the verification once. Stop after that regardless of result. |
| **FAIL** | The divergence is structural (wrong primitive, wrong composition, wrong design source) or cannot be fixed inside this scope. | Stop the work. Surface to the human with the specific list of what's wrong and why the divergence requires a scope or approach change. |

NEEDS_FIXES is the most common verdict and is a normal part of the loop. FAIL is rare and means the work needs human input before it can proceed.

---

## §2 — Iteration limits

To prevent infinite tweaking loops:

- **Per primitive:** max **3** verification iterations (initial + 2 re-runs).
- **Per section in a screen:** max **3** verification iterations.
- **Per screen final pass:** max **3** verification iterations on §5 as a whole.
- **Per-screen section streak:** if **3 sections in a row** all needed re-runs to pass, stop and surface — that's a signal the design source is being misread, not that the implementation is sloppy.

If the limit is hit, the verdict converts to **FAIL** and surfaces to the human with the specific list of what's still mismatching and why the implementation is stuck.

---

## §3 — Per-primitive verification

Runs when a primitive in `apps/web/components/ui/` is rebuilt or added during Sub-phase B (or maintained later).

### Inputs

- The primitive's source file (`components/ui/{name}.tsx`).
- The design's reference for that primitive in `docs/design/shared/primitives.jsx` and any usage examples in `docs/design/screens/*.jsx`.
- The primitive's section in `/dev/style-guide`.

### Steps

1. **Open the design reference at 1440px** in a browser. Find the variant of the primitive in the rendered HTML at `docs/design/Futurenostics HRMS.html`.
2. **Open `/dev/style-guide#primitive-{name}`** at 1440px in another window. Side-by-side, not alternating tabs.
3. **For every variant and every state** of the primitive, compare the rendered output to the design. Specifically check:
   - Padding (use DevTools to read computed values).
   - Font: family, size, weight, line-height, letter-spacing.
   - Border: width, color, radius (per-corner if asymmetric).
   - Shadow: offset, blur, spread, color, opacity.
   - Color: foreground, background, focus ring, hover transition.
   - Transition: duration, easing.
   - Icon size and stroke width if the primitive has icons.
4. **For every interactive state** the primitive can be in:
   - Idle / default
   - Hover (cursor over)
   - Focus (keyboard tab — the visible focus ring)
   - Active (mouse-down)
   - Disabled
   - Loading (if applicable)
   - Error (if applicable)
5. **Toggle dark mode** in the style guide and repeat the comparison against the dark version of the design.
6. **Produce the verdict** per §1.

### Output

If PASS: commit message ends with `Verified against design reference for all variants and states in light + dark mode.`

If NEEDS_FIXES: fix the flagged items, re-run §3 once. If still NEEDS_FIXES after the re-run, the verdict converts to FAIL.

If FAIL: stop. Open a discussion thread (PR comment or DECISIONS.md entry) describing:

- The primitive name and variant.
- The specific design value that can't be matched.
- The technical reason (e.g., "the design uses an inset shadow combined with a transform that breaks Radix's positioning logic").
- Proposed paths forward (e.g., "drop the inset, accept the deviation" / "extend Radix's positioning logic" / "use a different primitive entirely").

---

## §4 — Per-section verification (during screen build)

Runs **during** the build of a screen, after each visual section is implemented. This is the discipline that prevents the historical drift pattern of "build a whole screen, compare at the end, accept 30 small differences as good enough."

### What counts as a "section"

A section is a logically grouped visual region of a screen. Examples for the Employees list page:

- The page header (title + subtitle + action buttons).
- The KPI strip (4 cards).
- The toolbar (search + filter pills + view toggle).
- The table header.
- A representative row.
- The pagination footer.

Roughly 4–8 sections per screen. If a screen has more than 10 sections, it's probably either a very dense screen (Profile, Dashboard) or it needs decomposition.

### Steps per section

1. **Implement the section** using primitives from `components/ui/` and `fn-*` utilities only. No raw Tailwind defaults, no inline styles for static values.
2. **Run the dev server** and navigate to the screen at 1440px in a browser (use the same theme as the design's reference render).
3. **Screenshot just that section** (browser tools or a dedicated screenshot utility — the full screen is fine if there's only one section in flight; otherwise crop to the section).
4. **Open the design's rendered HTML** at the same viewport and find the corresponding section. Screenshot it.
5. **Place both screenshots side by side.** Visually compare. List every visible difference in a scratchpad — even 2px paddings, even subtle color shifts.
6. **Fix every difference at the source** (in the primitive, in a section component, or in a token if a value is missing). Don't override at the call site.
7. **Re-run from step 2** until the lists match (or the iteration limit is hit).
8. **Toggle dark mode and repeat steps 3–7.**
9. **Repeat at 768px and 375px** if the screen is expected to be responsive (most are).
10. **Move to the next section.** Do NOT accumulate unverified sections.

### Anti-pattern to actively avoid

Do not build sections A, B, C, D, then verify them all at once. That's the original drift pattern — by the time you get to section D, the agent has accumulated 4 sections of small misses and "fixing them all" becomes "rework" instead of "iteration". Fix one section at a time. Stay disciplined.

---

## §5 — Per-screen final verification (before merge)

Runs **once** when a screen is complete, before the PR is opened for review.

### Steps

1. **Confirm every section of the screen has passed §4** (per-section verification). If any section was deferred or skipped, that's a NEEDS_FIXES.
2. **Open the full screen at 1440px in light mode.** Open the design's rendered HTML side-by-side at the same viewport.
3. **Walk through the screen top to bottom, left to right.** Note every divergence.
4. **Toggle to dark mode.** Repeat the walk-through.
5. **Resize the browser to 768px (tablet).** Confirm layout adapts cleanly: sections collapse to single column where the design's tablet view shows that, cards reflow, the table goes horizontal-scroll if needed, the sticky header/footer of any sheet still works.
6. **Resize to 375px (mobile).** Same checks.
7. **Walk through interactive states** for every clickable / focusable element:
   - Tab through the entire screen — confirm the focus order is logical (top to bottom, left to right, with form fields preceding form actions).
   - Hover every interactive element — confirm the hover treatment matches the design.
   - For every modal / sheet / dropdown / popover — open, confirm it traps focus correctly, escape closes it, click-outside closes it (unless it shouldn't).
   - For every form — submit with no input → confirm error states render correctly; submit with valid input → confirm the success path runs.
8. **Walk through edge states:**
   - Empty state (no data).
   - Loading state (initial fetch).
   - Error state (e.g., API returns 500 — use DevTools network panel to force one).
   - Long-content state (paste a very long name into a Name field, very long department name into a chip, etc.).
   - Permission-denied state (log in as a user without the required permission).
9. **File the QA report** per §6.

### What's NOT covered by §5

- Functional API correctness (use unit / integration tests).
- Performance budgets (use Lighthouse).
- Accessibility compliance beyond keyboard navigation (use axe-core / similar).
- Cross-browser compatibility beyond Chromium-based (manual or Playwright matrix).

§5 is specifically about *visual* + *interactive* fidelity. Other QA flows run alongside.

---

## §6 — QA report format

After §5 completes, write a report at:

```
docs/qa-reports/{screen-or-feature-slug}/{YYYY-MM-DD}-qa-report.md
```

Examples:

- `docs/qa-reports/employee-form-sheet/2026-05-20-qa-report.md`
- `docs/qa-reports/employees-list/2026-06-02-qa-report.md`
- `docs/qa-reports/login/2026-05-16-qa-report.md`

### Report template

```markdown
# QA Report — {screen name}

**Date:** YYYY-MM-DD
**Verifier:** {human name or "claude-code" if claude ran the protocol}
**Verdict:** PASS / NEEDS_FIXES / FAIL
**Iterations:** {N of 3}

## Scope verified

- {list every section that went through §4, e.g. "Page header", "KPI strip", …}

## Viewports

- [x] 1440px light mode
- [x] 1440px dark mode
- [x] 768px (tablet) light mode
- [x] 768px (tablet) dark mode
- [x] 375px (mobile) light mode
- [ ] 375px (mobile) dark mode  ← unchecked = deferred or not verified

## Interactive states

- [x] Keyboard tab order
- [x] Hover treatments
- [x] Focus rings
- [x] Modal/Sheet trap + escape + click-outside
- [x] Form: empty submit
- [x] Form: valid submit
- [ ] Form: error API response  ← unchecked = deferred

## Edge states

- [x] Empty
- [x] Loading
- [x] Error
- [x] Long content
- [ ] Permission-denied  ← unchecked = N/A or deferred

## Findings

(For each finding, the section, the divergence, and the resolution.)

### Finding 1 — Page header subtitle wraps differently
- **Section:** Page header
- **Divergence:** The subtitle wraps after "departments." at 1440px but the design wraps after "salaries,".
- **Cause:** Subtitle paragraph max-width is 600px in spec; was 560px in implementation.
- **Resolution:** Set max-width to 600px (the `fn-spacing-…` token). Re-rendered, matches.

### Finding 2 — Status pill color drift in dark mode
- **Section:** Table row
- **Divergence:** "Probation" pill background reads more orange than the design's amber.
- **Cause:** `--fn-warning-soft` dark-mode token was set to `oklch(0.30 0.10 75)` instead of `oklch(0.30 0.08 75)`.
- **Resolution:** Adjusted token. Updated `extracted-tokens.md` row. Re-rendered, matches.

## Open items / deferred

- 375px mobile dark mode not verified — small device QA queued for end of Sub-phase D.
- Permission-denied state not implemented yet — depends on RBAC backend gating that lands in Phase 2.

## Verdict rationale

Concrete statement: e.g., "PASS — every section matches the design in both themes at 1440px; one mobile viewport was deferred and is tracked in Open items; all primitives used are §3-verified."
```

The report is the audit trail. Six months from now when something visibly drifts, the report is what gets compared against to bisect when the drift started.

---

## §7 — Running this protocol with Claude Code

When this protocol is invoked by a prompt that says "run the QA protocol" or "produce a QA report":

1. Walk every applicable item in §5 in order. Don't skip.
2. For each item, state explicitly in the output whether it was checked (and what was found) or deferred (and why).
3. Use the report template from §6 verbatim — file it at the correct path.
4. If verdict is NEEDS_FIXES, fix only the flagged items, then re-run §5 *once*, then stop regardless of result. Don't run unbounded iterations.
5. If verdict is FAIL, do not attempt fixes. Surface the FAIL with the specific list of why §5 cannot pass.

The QA protocol is bounded work. It is not an open-ended polish phase.

---

## §8 — When to skip parts of the protocol

These are the only acceptable reasons to skip:

| Skip | When acceptable |
|---|---|
| §3 (per-primitive) | The primitive is unchanged from the previous commit. Don't re-verify a primitive every time some unrelated screen uses it. |
| §4 (per-section, dark mode) | The screen has no dark mode by design (rare — the login is the only such surface currently). |
| §5 (mobile / 375px) | The screen is explicitly desktop-only (e.g., Org Chart, Payroll Run dashboard). Document the decision in `docs/DECISIONS.md`. |
| §5 (permission-denied edge state) | The screen has no permission gating. |

Everything else runs every time. "We're in a hurry" is not an acceptable reason to skip.

---

## §9 — Maintenance

This protocol is itself a versioned document. If the discipline has to change (a step becomes obsolete because of tooling improvements, a step becomes inadequate because of a class of bugs slipping through), update this file and call out the change in the commit message: `docs(qa): tighten §5 step 7 to require keyboard nav of all modals after the focus-trap regression`.

The protocol's authority comes from being consistently applied. Bending it case-by-case erodes the authority within weeks.
