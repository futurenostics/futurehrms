#!/bin/sh
# =============================================================================
# Container entrypoint (runs on every start of the api / web / studio services).
# The service's `command:` from docker-compose.yml is passed in as "$@".
#
# Order: sync deps → (api only) wait for Postgres, migrate, seed → exec command.
# `set -e` aborts on the first error so a broken start fails loudly.
# =============================================================================
set -e

# Activate the pnpm version pinned in package.json.
corepack enable >/dev/null 2>&1 || true

# Re-sync deps against the mounted source (near-instant when nothing changed),
# so a teammate's new dependency appears without an image rebuild.
echo "[entrypoint] Installing dependencies..."
pnpm install

# --- DB bootstrap: only the api service sets RUN_MIGRATIONS=true --------------
# web/studio leave it unset and skip straight to their command.
if [ "${RUN_MIGRATIONS}" = "true" ]; then
  DB_HOST="${POSTGRES_HOST:-postgres}"
  DB_USER="${POSTGRES_USER:-hrms}"
  DB_NAME="${POSTGRES_DB:-hrms_dev}"

  # Wait until Postgres actually accepts connections before migrating.
  echo "[entrypoint] Waiting for Postgres at ${DB_HOST}:5432..."
  until pg_isready -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; do
    sleep 1
  done

  # Regenerate the client (schema may have changed) and apply migrations.
  pnpm --filter @futurenostics/api exec prisma generate
  pnpm --filter @futurenostics/api exec prisma migrate deploy

  # Idempotent seed; don't let a seed hiccup block the API from starting.
  if [ "${RUN_SEED:-true}" = "true" ]; then
    pnpm --filter @futurenostics/api exec tsx prisma/seed.ts \
      || echo "[entrypoint] Seed failed - continuing."
  fi
fi

# Replace the shell with the service command so signals reach it directly.
exec "$@"
