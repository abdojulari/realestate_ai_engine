#!/usr/bin/env bash
# Compare applied migration SQL to prisma/schema.prisma. Empty stdout = in sync.
# Requires Postgres where the user may create shadow DBs (same as Prisma Migrate).
# Usage:
#   ./scripts/check-prisma-migration-drift.sh              # print SQL diff
#   ./scripts/check-prisma-migration-drift.sh --exit-code  # exit 2 if drift (for CI)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
SHADOW_URL="${SHADOW_DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5433/postgres}"
if [[ "${1:-}" == "--exit-code" ]]; then
  exec npx prisma migrate diff \
    --from-migrations ./prisma/migrations \
    --to-schema-datamodel ./prisma/schema.prisma \
    --shadow-database-url "$SHADOW_URL" \
    --script \
    --exit-code
fi
exec npx prisma migrate diff \
  --from-migrations ./prisma/migrations \
  --to-schema-datamodel ./prisma/schema.prisma \
  --shadow-database-url "$SHADOW_URL" \
  --script
