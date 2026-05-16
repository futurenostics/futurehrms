#!/usr/bin/env bash
# Re-create the local MinIO buckets manually.
# Useful if you reset the MinIO volume without the docker-compose bootstrap
# container running, or want to re-seed buckets without restarting compose.
set -euo pipefail

MC_BIN="${MC_BIN:-mc}"
MINIO_ALIAS="${MINIO_ALIAS:-local}"
MINIO_URL="${MINIO_URL:-http://localhost:9000}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:-minio_admin}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-minio_dev_password}"

BUCKETS=(
  "fn-hrms-documents"
  "fn-hrms-template-assets"
)

if ! command -v "$MC_BIN" >/dev/null 2>&1; then
  echo "ERROR: '$MC_BIN' (MinIO client) not found. Install via 'brew install minio/stable/mc'." >&2
  exit 1
fi

"$MC_BIN" alias set "$MINIO_ALIAS" "$MINIO_URL" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"

for bucket in "${BUCKETS[@]}"; do
  echo "Ensuring bucket: $bucket"
  "$MC_BIN" mb --ignore-existing "$MINIO_ALIAS/$bucket"
  "$MC_BIN" anonymous set none "$MINIO_ALIAS/$bucket"
done

echo "Done."
