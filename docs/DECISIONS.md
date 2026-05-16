# Decisions log

Running log of decisions that shape the project but aren't large enough for a
dedicated ADR. Entries are appended chronologically; resolved entries are not
edited or removed — they're updated with a follow-up note instead.

## 2026-05-15 — Phase 0 stack pins

- **Node 22 LTS** (`.nvmrc`, `engines.node >= 22`). Anyone with a newer Node
  (24, 25, …) can still run the project; CI builds against 22.
- **pnpm 10.28.1** pinned via `packageManager`. Workspaces use the `apps/*` and
  `packages/*` globs.
- **Turborepo** for the task graph. Pipelines fan out `^build` so apps wait on
  package builds.
- **TypeScript 5.7** in strict mode everywhere, with `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitReturns` enabled on packages and
  the API; relaxed for the Next.js workspace (Next emits some patterns that
  trip those flags).
- **ESLint 9 flat config** at the root. `consistent-type-imports` is disabled
  for `apps/api` because NestJS DI uses `reflect-metadata` and breaks silently
  when injected service classes are imported as types.

## 2026-05-15 — Shared packages compile to dist

Initially the shared packages (`@futurenostics/db`, `…/types`, `…/storage`,
`…/email`, `…/ui`) exported `./src/index.ts` directly so the apps could resolve
TypeScript source through workspace symlinks. This broke at runtime because
`apps/api/dist/main.js` runs through Node, which doesn't load `.ts`. We now
compile each shared package to `dist/`, point `exports` at `./dist/index.js`,
and run `pnpm -r build` before `apps/api build`. Turbo's `^build` dependency
handles the order in CI.

## 2026-05-15 — Auth design

- Password hashing: **argon2id**, memory 19 MiB, 2 iterations, single-thread
  parallelism. OWASP cheat-sheet defaults.
- Tokens: **JWT access** (15 min, HS256, in-memory client storage) +
  **refresh** (7 d, HttpOnly + Secure + SameSite=Lax cookie, rotating, server-
  side revocable via a `RefreshToken` row).
- Account lockout: 10 failed login attempts → 30-minute soft lock.
- Rate limit: `/api/auth/login` is throttled to 5 per 15 minutes per IP.

## 2026-05-15 — Frontend body validation

We chose **zod-in-controller** for request validation instead of installing
`class-validator` + `class-transformer` and wiring NestJS's `ValidationPipe`.
The shared `@futurenostics/types` package owns the schemas, and the same
schema is parsed on the FE (via `zodResolver` for react-hook-form) and on the
BE (in the controller). Single source of truth, no decorator metadata duplication.

## 2026-05-15 — Tailwind v4

The web app uses **Tailwind v4** with the `@tailwindcss/postcss` plugin.
Design tokens live in `packages/config/tailwind/fn-tokens.css` as raw
`--fn-*` custom properties under `:root` (light) and `[data-theme='dark']`
(dark), and a `@theme inline` block bridges them to Tailwind utilities
(`bg-fn-panel`, `text-fn-fg-muted`, `rounded-fn-lg`, `shadow-fn-md`, etc.).
shadcn's own variables (`--background`, `--primary`, …) are remapped to the
`--fn-*` set so every shadcn primitive automatically picks up the FN theme
without per-component overrides.

## 2026-05-15 — Dark mode trigger

Theme is controlled by `next-themes` writing `data-theme="dark"` on `<html>`.
Tailwind v4's `@custom-variant dark (&:is([data-theme='dark'] *, .dark *))`
lets the `dark:` modifier work against either attribute. Default is `system`.

## 2026-05-15 — Storage abstraction

`@futurenostics/storage` wraps `@aws-sdk/client-s3`. In dev it points at MinIO
with `forcePathStyle: true`; in production the same interface targets AWS S3
with virtual-hosted URLs. The decision keeps the production choice open while
the dev experience is fully local.

## 2026-05-16 — Sidebar rebuild deviations

Rebuilt the sidebar to match `docs/design/shared/chrome.jsx`. Three deviations
from the spec, all minor:

1. **File case kept lowercase** (`sidebar.tsx`, not `Sidebar.tsx`). The rest of
   the shell directory uses lowercase-kebab (`topbar.tsx`, `app-shell.tsx`,
   `user-menu.tsx`); breaking that convention for one file would force a rename
   on Linux CI even though macOS would silently accept the existing import path.
   Consistency with the directory wins.
2. **Collapse persistence uses localStorage only**, not a cookie. The spec
   explicitly allowed accepting a brief layout shift for users with a persisted
   collapsed state; we took that option. If the shift becomes annoying we'll
   move to a cookie hydrated by middleware so the SSR shell matches.
3. **Group labels are not rendered** in this iteration. The spec said groups
   are flattened (matching `chrome.jsx`'s `navGroups.flatMap(...)`); the group
   structure is preserved in `nav-config.ts` for future use.

Active-item detection is prefix-aware: `/employees/123` highlights "Employees"
because `pathname.startsWith('/employees/')` matches. `/dashboard` uses an
exact-match guard so it doesn't capture other roots.

Nav counts (84, 23) and badges (2, 4) are placeholder values copied from the
design mockup — flagged with a TODO in `nav-config.ts` to wire to real counts
when the relevant module endpoints land.

## 2026-05-16 — Login polish + Remember Me

- **Remember me cookie duration: 30 days** when checked, 7 days when not.
  30 days is the standard "stay signed in" duration (matches Google, GitHub,
  Linear) — long enough to be useful, short enough that a forgotten laptop
  doesn't stay signed in indefinitely. The refresh token row's `expiresAt`
  column stores the actual chosen TTL so server-side revocation tracks the
  correct lifetime.
- **Email pre-fill via localStorage** under key `fn:login:lastEmail`. Only
  the email is persisted client-side, never the password. When Remember Me
  is unchecked on a subsequent login, the stored email is cleared.
- **Open-redirect defence**: the `?from=` query param is validated to start
  with `/`, not contain `//`, not contain `://`, and not start with `/\`
  (Windows path-escape attempts). Anything else falls back to `/dashboard`.
- **User-enumeration defence**: `/auth/login` returns the same
  `INVALID_CREDENTIALS` message for unknown email and wrong password. We do
  not surface which field is wrong.
- **Structured error payload**: `/auth/login` returns `{code, message,
retryAt?}` for INVALID_CREDENTIALS, ACCOUNT_LOCKED, and RATE_LIMITED so
  the client can show countdown UI without parsing free-form text.
- **Cursor + disabled discipline on Button primitive**: replaced
  `disabled:pointer-events-none` with `cursor-pointer` +
  `disabled:cursor-not-allowed disabled:opacity-60`. The native `disabled`
  attribute on `<button>` blocks clicks; removing `pointer-events: none`
  lets the cursor change reflect intent on hover.
- **Throttle limit 20/15min** (was 5) — see prior entry; surfaced here too
  because the login UI reads `Retry-After` to drive the cooldown banner.
- **`force-dynamic` on `/login`** since `useSearchParams()` reads `from`
  during render. Avoids the Suspense-around-search-params boilerplate.
