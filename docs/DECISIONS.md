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
