# =============================================================================
# One Dockerfile, four build "targets" (stages). Each `FROM ... AS <name>` is a
# target you can build independently with `docker build --target <name> .`
#
#   dev             → LOCAL DEVELOPMENT. Hot-reload via bind mounts. This is the
#                     ONLY stage docker-compose.yml builds/runs today.
#   builder         → BUILD-ONLY helper. Compiles the whole workspace; its
#                     output is copied into the two production stages below.
#   api-production  → PRODUCTION image for the NestJS API. Deploy TEMPLATE —
#                     not used locally; wired up for a future deployment.
#   web-production  → PRODUCTION image for the Next.js app. Deploy TEMPLATE —
#                     not used locally; wired up for a future deployment.
#
# Node is pinned to 22 in every stage so the host machine's Node version is
# irrelevant (this is also what keeps Prisma/Prisma Studio working).
# =============================================================================


# -----------------------------------------------------------------------------
# dev — the image docker compose runs for the api / web / studio services.
# -----------------------------------------------------------------------------
FROM node:22-alpine AS dev
WORKDIR /app

# System libs Alpine doesn't ship by default:
#   libc6-compat        → glibc shim for prebuilt binaries on musl
#   python3 / make / g++→ compile native addons (argon2, sharp)
#   openssl             → required by the Prisma query engine
#   postgresql-client   → provides `pg_isready` for the entrypoint's DB wait
RUN apk add --no-cache libc6-compat python3 make g++ openssl postgresql-client
RUN corepack enable

# Copy manifests first so the (slow) install layer is cached until deps change.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json         apps/api/
COPY apps/web/package.json         apps/web/
COPY packages/config/package.json  packages/config/
COPY packages/db/package.json      packages/db/
COPY packages/email/package.json   packages/email/
COPY packages/storage/package.json packages/storage/
COPY packages/types/package.json   packages/types/
COPY packages/ui/package.json      packages/ui/
RUN pnpm install --frozen-lockfile

# Generate the Prisma client so the image is runnable out of the box.
COPY apps/api/prisma apps/api/prisma
RUN pnpm --filter @futurenostics/api exec prisma generate

# Startup script: install → (api) wait-for-db, migrate, seed → run the command.
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000 4000 5555
ENTRYPOINT ["docker-entrypoint.sh"]


# -----------------------------------------------------------------------------
# builder — build-only stage. Compiles every workspace once; the production
# images below copy its output. Nothing here runs in production.
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++ openssl
RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json         apps/api/
COPY apps/web/package.json         apps/web/
COPY packages/config/package.json  packages/config/
COPY packages/db/package.json      packages/db/
COPY packages/email/package.json   packages/email/
COPY packages/storage/package.json packages/storage/
COPY packages/types/package.json   packages/types/
COPY packages/ui/package.json      packages/ui/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @futurenostics/api exec prisma generate
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN pnpm build


# -----------------------------------------------------------------------------
# api-production — PRODUCTION image for the API (deploy template, unused locally).
# Copies compiled output from `builder`, so the toolchain stays out of the image.
# -----------------------------------------------------------------------------
FROM node:22-alpine AS api-production
WORKDIR /app
RUN apk add --no-cache openssl postgresql-client
RUN corepack enable
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 4000
# A real deploy runs `prisma migrate deploy` as a separate release step first.
CMD ["node", "apps/api/dist/main.js"]


# -----------------------------------------------------------------------------
# web-production — PRODUCTION image for the web app (deploy template, unused locally).
# -----------------------------------------------------------------------------
FROM node:22-alpine AS web-production
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 3000
CMD ["pnpm", "--filter", "@futurenostics/web", "start"]
