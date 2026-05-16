# Project conventions for Claude Code

## Commit attribution

- Never add `Co-Authored-By: Claude` or any similar AI attribution to commits.
- Never add `🤖 Generated with Claude Code` footers, signatures, or emoji tags.
- Never add Claude or Anthropic attribution to PR descriptions, code comments, or documentation.
- All commits, PRs, and code should appear authored solely by the human developer.
- Use clean conventional commit messages: `feat: add user model`, `fix: handle null email`, `chore: bump deps`. No trailers, no signatures, no attribution lines.

## Documentation

- Read `docs/prompts/` for architectural and phase-specific instructions before any significant change.
- Read `docs/design/README.md` before touching UI code.
- The visual fidelity standard in `docs/prompts/CLAUDE_CODE_VISUAL_FIDELITY_ADDENDUM.md` is non-negotiable for UI work.

## Commits

### When to commit

Commit at **logical boundaries** — points where the work-in-progress represents a complete, reviewable unit. Do not wait until a large feature is fully done; do not commit on every file save. The right frequency is roughly one commit per 15–45 minutes of focused work, depending on the size of the unit.

A unit of work that warrants a commit looks like one of these:

- A new file scaffolded with its initial contents (e.g., a new package's `package.json` + `tsconfig.json` + `src/index.ts` stub).
- A self-contained feature or sub-feature (e.g., the auth login endpoint and its tests).
- A configuration change (e.g., adding ESLint, setting up docker-compose, wiring a new env variable).
- A schema change with its migration.
- A bug fix.
- A refactor that improves structure without changing behavior.
- Documentation updates (README, ADR, comments).
  If you're about to make a logically unrelated change, commit what you have first.

### Commit hygiene rules

1. **Every commit must leave the project in a working state.** After the commit, `pnpm install && pnpm build && pnpm lint && pnpm typecheck` should all succeed. If your work is mid-flight and the project doesn't build cleanly, finish the unit before committing.
2. **One concern per commit.** Auth changes and a README typo fix are two commits, not one. Mixing concerns makes review and bisection painful.
3. **The commit message describes the change, not the process.** Good: `feat(auth): add JWT login endpoint with refresh token rotation`. Bad: `feat: continued work on auth`, `chore: WIP`, `wip: stuff`.
4. **Use conventional commit format:** `type(scope): description`. Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `style`, `build`, `ci`. The `scope` is the module or area being changed.
5. **Keep the subject line under 72 characters.** If more context is needed, add a blank line and a body explaining _why_ the change was made (not what — the diff shows what).
6. **Reference issues or phase numbers in the body when relevant.** Never reference Claude or AI assistance in any commit content.
7. **Never amend a commit that has been pushed.** Once it's on the remote, future changes are new commits.

### When NOT to commit

- Mid-refactor when only half the call sites have been updated.
- When linting or typecheck is broken.
- When tests are failing for code being modified (unless explicitly committing a failing-test-first TDD step, which is rare in this project).
- Just because time has passed — granularity is about logical units, not clock time.

### Examples of good commit sequences

For a Phase 0 work session, a healthy commit log looks like:

```
chore(repo): initialize pnpm workspace with turborepo
chore(packages): scaffold shared packages with tsconfig and package.json
chore(docker): add docker-compose for postgres, redis, minio, mailpit
chore(lint): configure eslint, prettier, husky, commitlint
feat(db): add HR core Prisma schema with initial migration
feat(api): scaffold NestJS skeleton with env validation
feat(auth): implement JWT login, refresh, logout, and me endpoints
feat(api): add JwtAuthGuard and RequirePermission decorator
feat(api): implement audit log Prisma middleware
chore(seed): add seed script for roles, departments, designations, admin user
feat(web): scaffold next.js app with tailwind v4 and shadcn primitives
feat(web): wire design tokens into tailwind config and css variables
feat(web): implement login page matching design reference
feat(web): implement app shell sidebar and topbar
feat(web): add dashboard placeholder with greeting widget
test(auth): add e2e test for login flow
ci: add github actions workflow for lint, typecheck, test
docs(adr): record modular monolith and manifest registry decision
docs(readme): add local setup instructions
```

Each of these is independently reviewable. Each one moves the project forward. Each one could be reverted if it turned out to be wrong, without losing the others.

### Branching and pushing

- Work on a feature branch named `feat/phase-0-bootstrap` or similar, not directly on `main`.
- Push to the remote regularly — at minimum at the end of every working session, ideally after every 2–3 commits.
- Do not force-push to shared branches. If a rebase is needed, use a new branch.

### What this looks like in practice

When you finish implementing the JWT login endpoint and its tests pass, that's the moment to commit. Don't wait until refresh and logout are also done — those are separate units. When you finish the next unit (refresh tokens), that's another commit. Each commit a self-contained step.

When you sit down to start a new work block, the first thing you do is verify the previous commit is clean (`pnpm build && pnpm lint && pnpm typecheck` pass). Then begin the next unit.

## Code style

- TypeScript strict mode everywhere. No `any` without an inline comment justifying it.
- Use the established design tokens; never introduce new color values, spacing values, or typography sizes without first adding them to the shared config.
- shadcn/ui primitives for all interactive components. No custom inline-styled components.

## Asking for clarification

- When something is genuinely ambiguous, ask before deciding.
- Don't guess on architectural decisions. Don't guess on visual specifications. Don't guess on business logic.
