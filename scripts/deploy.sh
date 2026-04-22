#!/usr/bin/env bash
# =============================================================================
# DeelBot deploy helper — Suhani tenant app, full stack, or control plane only
# =============================================================================
# Usage (from repo root unless noted):
#   ./scripts/deploy.sh                    # same as: ./scripts/deploy.sh standalone
#   ./scripts/deploy.sh standalone         # build + up + migrate (+ quick DB credential sanity check at end)
#   ./scripts/deploy.sh verify-db          # only the DB check (no build) — use when debugging P1000 / login 500
#   USE_HOST_EDGE_PROXY=1 in .env.production merges docker-compose.host-edge.yml (host Nginx on :80/:443).
#   ./scripts/deploy.sh stack              # deelbot.com + *.deelbot.ai (deploy/docker-compose.production.yml)
#   ./scripts/deploy.sh control-plane      # SaaS control plane only (sibling saas-control-plane repo)
#
# Standalone / control-plane modes use `docker compose --env-file` (no `source .env`)
# so values with spaces do not break the shell. Prefer KEY="value with spaces" in .env.
#
# Environment:
#   DEELBOT_DEPLOY_DIR   — for stack mode (default: <suhani>/deploy)
#   SAAS_CP_ROOT         — for control-plane mode (default: sibling ../saas-control-plane)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUHANI_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MODE="${1:-standalone}"

run_compose() {
  if docker compose version &>/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose &>/dev/null; then
    docker-compose "$@"
  else
    echo "Error: Docker Compose is not installed."
    echo "  Debian/Ubuntu: sudo apt-get install -y docker-compose-v2"
    echo "  Or: https://docs.docker.com/compose/install/linux/"
    exit 1
  fi
}

# Read KEY=value from env file without sourcing (safe when values contain spaces).
# Last occurrence wins — same as Docker Compose when a key appears more than once in one file.
# (First-match here caused P1000: psql OK via Compose’s last password, Prisma URL built from first password.)
read_env_value() {
  local key="$1" file="$2" line val prefix hit
  [ -f "$file" ] || return 1
  prefix="${key}="
  hit=0
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line#"${line%%[![:space:]]*}"}"
    [[ "$line" == \#* ]] && continue
    [[ -z "$line" ]] && continue
    case "$line" in
      "${prefix}"*)
        val="${line#"${prefix}"}"
        val="${val%$'\r'}"
        if [[ "${#val}" -ge 2 && "${val:0:1}" == '"' && "${val: -1}" == '"' ]]; then
          val="${val:1:$((${#val} - 2))}"
        elif [[ "${#val}" -ge 2 && "${val:0:1}" == "'" && "${val: -1}" == "'" ]]; then
          val="${val:1:$((${#val} - 2))}"
        fi
        hit=1
        ;;
    esac
  done < "$file"
  if [ "$hit" = 1 ]; then
    printf '%s' "$val"
    return 0
  fi
  return 1
}

# Build the in-cluster Postgres URL from the same env file deploy uses (not only Compose interpolation).
# `docker compose run` can otherwise get a different DATABASE_URL than `docker compose up` (P1000 while exec works).
docker_database_url_from_env_file() {
  local f="$1" ov user pass db
  ov="$(read_env_value SUHANI_DOCKER_DATABASE_URL "$f" 2>/dev/null || true)"
  if [ -n "$ov" ]; then
    printf '%s' "$ov"
    return 0
  fi
  user="$(read_env_value POSTGRES_USER "$f" 2>/dev/null || printf '%s' 'postgres')"
  pass="$(read_env_value POSTGRES_PASSWORD "$f" 2>/dev/null || printf '%s' 'postgres')"
  db="$(read_env_value POSTGRES_DB "$f" 2>/dev/null || printf '%s' 'real_estate')"
  if command -v python3 &>/dev/null; then
    user="$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$user")"
    pass="$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$pass")"
    db="$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$db")"
  fi
  printf 'postgresql://%s:%s@db:5432/%s?schema=public' "$user" "$pass" "$db"
}

# POSTGRES_* as injected into the running `db` container (same source as the psql sanity check).
docker_database_url_from_running_db() {
  local ENV_FILE="$1"
  shift
  local user pass db
  user="$(run_compose --env-file "$ENV_FILE" "$@" exec -T db printenv POSTGRES_USER 2>/dev/null | tr -d '\r' || true)"
  pass="$(run_compose --env-file "$ENV_FILE" "$@" exec -T db printenv POSTGRES_PASSWORD 2>/dev/null | tr -d '\r' || true)"
  db="$(run_compose --env-file "$ENV_FILE" "$@" exec -T db printenv POSTGRES_DB 2>/dev/null | tr -d '\r' || true)"
  [ -n "$user" ] && [ -n "$pass" ] && [ -n "$db" ] || return 1
  if command -v python3 &>/dev/null; then
    user="$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$user")"
    pass="$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$pass")"
    db="$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$db")"
  fi
  printf 'postgresql://%s:%s@db:5432/%s?schema=public' "$user" "$pass" "$db"
}

# One-off Prisma: SUHANI_DOCKER_DATABASE_URL from file, else URL from running db (matches Compose + psql), else file POSTGRES_*.
docker_database_url_for_prisma() {
  local ENV_FILE="$1" ov rb
  shift
  ov="$(read_env_value SUHANI_DOCKER_DATABASE_URL "$ENV_FILE" 2>/dev/null || true)"
  if [ -n "$ov" ]; then
    printf '%s' "$ov"
    return 0
  fi
  if rb="$(docker_database_url_from_running_db "$ENV_FILE" "$@" 2>/dev/null)" && [ -n "$rb" ]; then
    printf '%s' "$rb"
    return 0
  fi
  docker_database_url_from_env_file "$ENV_FILE"
}

require_docker() {
  if ! docker info &>/dev/null; then
    echo "Error: Docker is not running"
    exit 1
  fi
}

# Auto-provision REDIS_PASSWORD if missing. The compose stack now requires it (`--requirepass`) and
# binds Redis to 127.0.0.1 only — without a password the prod overlay refuses to start (?:err interpolation).
# Generates a 32-byte url-safe secret and appends to the env file once. Pre-existing values are kept.
ensure_redis_password_in_env_file() {
  local ENV_FILE="$1"
  local existing
  existing="$(read_env_value REDIS_PASSWORD "$ENV_FILE" 2>/dev/null || true)"
  if [ -n "$existing" ]; then
    return 0
  fi
  local pw
  if command -v openssl &>/dev/null; then
    pw="$(openssl rand -base64 32 | tr -d '\n=+/' | cut -c1-40)"
  else
    pw="$(head -c 60 /dev/urandom | LC_ALL=C tr -dc 'A-Za-z0-9' | head -c 40)"
  fi
  if [ -z "$pw" ]; then
    echo "Error: failed to generate REDIS_PASSWORD (need openssl or /dev/urandom)."
    return 1
  fi
  echo "" >> "$ENV_FILE"
  echo "# Auto-generated by deploy.sh — Redis requirepass (do not edit unless you also rotate cached sessions)" >> "$ENV_FILE"
  printf 'REDIS_PASSWORD=%s\n' "$pw" >> "$ENV_FILE"
  echo "Note: wrote a fresh REDIS_PASSWORD to $ENV_FILE (Redis was previously running without auth)."
}

# Align the superuser role password in the data directory with POSTGRES_PASSWORD in the env file.
# Docker Postgres only applies POSTGRES_PASSWORD on first init; `up -d` does not update an existing volume.
# Prisma uses SCRAM over the Docker network — this ALTER runs over the local socket (trust) so it is safe from $ in passwords.
sync_postgres_role_password_from_env() {
  local ENV_FILE="$1"
  shift
  if [ -n "$(read_env_value SUHANI_DOCKER_DATABASE_URL "$ENV_FILE" 2>/dev/null || true)" ]; then
    echo "Note: SUHANI_DOCKER_DATABASE_URL is set — not syncing local Postgres role password from POSTGRES_PASSWORD."
    return 0
  fi
  if [ "$(read_env_value SUHANI_SKIP_SYNC_DB_PASSWORD "$ENV_FILE" 2>/dev/null)" = "1" ]; then
    echo "Note: SUHANI_SKIP_SYNC_DB_PASSWORD=1 — skipping ALTER USER (see .env.example)."
    return 0
  fi
  local user pass
  user="$(read_env_value POSTGRES_USER "$ENV_FILE" 2>/dev/null || printf '%s' 'postgres')"
  pass="$(read_env_value POSTGRES_PASSWORD "$ENV_FILE" 2>/dev/null || printf '%s' 'postgres')"
  if ! [[ "$user" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
    echo "Warning: POSTGRES_USER=$user — skipping automated password sync (identifier not supported)."
    return 0
  fi
  echo "Syncing Postgres role \"$user\" password to POSTGRES_PASSWORD in $ENV_FILE (ALTER USER via local connection)..."
  if python3 -c "
import re, sys
u, p = sys.argv[1], sys.argv[2]
if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', u):
    sys.exit(2)
esc = p.replace(\"'\", \"''\")
sys.stdout.write(f\"ALTER USER {u} WITH PASSWORD '{esc}';\\n\")
" "$user" "$pass" | run_compose --env-file "$ENV_FILE" "$@" exec -T db psql -U "$user" -d postgres -v ON_ERROR_STOP=1 -f -; then
    echo "Postgres role password synced."
    return 0
  fi
  echo "Error: ALTER USER failed (see messages above). Is POSTGRES_USER a superuser in this cluster?"
  return 1
}

# Fail fast if volume password ≠ env: default Postgres pg_hba uses trust for 127.0.0.1, so
# `psql -h 127.0.0.1` inside the db container does NOT verify the password — it always “succeeds”.
# Prisma connects from the app network and hits scram-sha-256, so we must test the same path.
postgres_password_works_from_app_network() {
  local ENV_FILE="$1"
  shift
  if [ -n "$(read_env_value SUHANI_DOCKER_DATABASE_URL "$ENV_FILE" 2>/dev/null || true)" ]; then
    echo "Note: SUHANI_DOCKER_DATABASE_URL is set — skipping local stack TCP auth smoke test."
    return 0
  fi
  local DU
  DU="$(docker_database_url_for_prisma "$ENV_FILE" "$@")"
  echo "Checking Postgres (Prisma from app → db; same auth path as migrate — not psql on db:127.0.0.1 trust)..."
  if (
    export DATABASE_URL="$DU"
    run_compose --env-file "$ENV_FILE" "$@" run --rm -T --no-deps -e DATABASE_URL app \
      sh -c 'echo "SELECT 1" | npx prisma db execute --stdin --schema prisma/schema.prisma'
  ); then
    echo "Postgres credential check (SCRAM from app network): OK"
    return 0
  fi
  echo "Error: Prisma cannot authenticate to Postgres from the app container (same failure as migrate deploy)."
  echo "  Postgres only stores the password on first volume init; $ENV_FILE POSTGRES_PASSWORD must match that data."
  echo "  Fix: restore the original password, ALTER USER postgres WITH PASSWORD '…' to match $ENV_FILE, or docker compose ... down -v (wipes data)."
  echo "  See .env.example. (psql -h 127.0.0.1 inside db is not a valid password test — pg_hba often uses trust there.)"
  return 1
}

# Wait until Postgres accepts connections (avoids Prisma P1000 right after `up -d`).
wait_for_postgres() {
  local ENV_FILE="$1"
  shift
  local pg_user pg_db
  pg_user="$(read_env_value POSTGRES_USER "$ENV_FILE" 2>/dev/null || printf '%s' 'postgres')"
  pg_db="$(read_env_value POSTGRES_DB "$ENV_FILE" 2>/dev/null || printf '%s' 'real_estate')"
  echo "Waiting for Postgres to accept connections (pg_isready)..."
  local i
  for i in $(seq 1 90); do
    if run_compose --env-file "$ENV_FILE" "$@" exec -T db pg_isready -U "$pg_user" -d "$pg_db" &>/dev/null; then
      # One more beat so auth/backend are fully ready (reduces flaky P1000 on first prisma connect).
      sleep 3
      echo "Postgres is ready."
      return 0
    fi
    sleep 2
  done
  echo "Error: Postgres did not become ready within ~3 minutes (pg_isready)."
  return 1
}

# Prisma migrate with retries — pass DATABASE_URL via host `export` + `compose run -e DATABASE_URL` (no value).
# That copies the host variable into the one-off container and overrides merged service/env_file DATABASE_URL
# (fixes P1000 when e.g. .env.production’s host-only DATABASE_URL=...@localhost:5433 would otherwise win over --env-from-file).
prisma_migrate_deploy_retry() {
  local ENV_FILE="$1"
  shift
  local attempt DU
  DU="$(docker_database_url_for_prisma "$ENV_FILE" "$@")"
  for attempt in 1 2 3 4 5 6; do
    echo "Running Prisma migrations (attempt $attempt/6)..."
    if (
      export DATABASE_URL="$DU"
      run_compose --env-file "$ENV_FILE" "$@" run --rm -T --no-deps -e DATABASE_URL app npx prisma migrate deploy
    ); then
      return 0
    fi
    echo "  migrate deploy failed; waiting 8s before retry..."
    sleep 8
  done
  echo "Error: prisma migrate deploy failed after 6 attempts."
  return 1
}

# Standalone stack only: compare app DATABASE_URL vs db POSTGRES_* (read-only). Does not change passwords.
verify_standalone_db() {
  cd "$SUHANI_ROOT"
  local DC_FILES=(-f docker-compose.yml -f docker-compose.prod.yml)
  local ENV_FILE
  if [ -f .env.production ]; then
    ENV_FILE=.env.production
  elif [ -f .env ]; then
    ENV_FILE=.env
  else
    echo "verify-db: no .env.production or .env in $SUHANI_ROOT"
    return 1
  fi
  if [ "$(read_env_value USE_HOST_EDGE_PROXY "$ENV_FILE" 2>/dev/null)" = "1" ]; then
    DC_FILES+=(-f docker-compose.host-edge.yml)
  fi

  export SUHANI_ENV_FILE="$ENV_FILE"

  sc() {
    run_compose --env-file "$ENV_FILE" "${DC_FILES[@]}" "$@"
  }

  local _VERIFY_DU
  _VERIFY_DU="$(docker_database_url_for_prisma "$ENV_FILE" "${DC_FILES[@]}")"

  echo ""
  echo "──────── Quick DB check (read-only) ────────"
  if grep -qE '^[[:space:]]*SUHANI_DOCKER_DATABASE_URL=' "$ENV_FILE" 2>/dev/null; then
    echo "Note: SUHANI_DOCKER_DATABASE_URL is set — it overrides POSTGRES_* for the app's DATABASE_URL."
  fi
  echo "DATABASE_URL used for prisma one-off (from $ENV_FILE, password redacted):"
  printf '%s\n' "$_VERIFY_DU" | sed -E 's#(://[^:]+:)[^@]+#\1***#'
  echo "Long-running app container printenv DATABASE_URL (redacted):"
  sc exec -T app printenv DATABASE_URL 2>/dev/null | sed -E 's#(://[^:]+:)[^@]+#\1***#' || echo "  (app container not running — OK right after a failed deploy)"
  echo "DB container: POSTGRES_USER + POSTGRES_DB (password hidden)"
  U="$(sc exec -T db printenv POSTGRES_USER 2>/dev/null | tr -d '\r' || true)"
  D="$(sc exec -T db printenv POSTGRES_DB 2>/dev/null | tr -d '\r' || true)"
  echo "  POSTGRES_USER=${U:-?}  POSTGRES_DB=${D:-?}"
  if sc exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "select 1"' 2>/dev/null | grep -q 1; then
    echo "  psql inside db on 127.0.0.1: OK (Postgres Docker image often uses trust here — not proof the password matches the volume)"
  else
    echo "  psql inside db on 127.0.0.1: FAIL (unusual)"
  fi
  echo "  Prisma db execute (app one-off → db, same SCRAM path as migrate):"
  _EX_OUT="$( (
    export DATABASE_URL="$_VERIFY_DU"
    sc run --rm -T --no-deps -e DATABASE_URL app sh -c 'echo "SELECT 1" | npx prisma db execute --stdin --schema prisma/schema.prisma'
  ) 2>&1)" || true
  if echo "$_EX_OUT" | grep -qiE 'P1000|Authentication failed|credentials.*not valid'; then
    echo "    FAIL (auth) — POSTGRES_* / volume password mismatch for TCP from app network"
  elif echo "$_EX_OUT" | grep -qiE "P1001|Can't reach database|Can't reach database server|ECONNREFUSED"; then
    echo "    FAIL (cannot reach db from one-off app container)"
  else
    echo "    OK"
  fi
  if sc exec -T app true &>/dev/null; then
    MS_OUT="$(sc exec -T app sh -c 'cd /app && npx prisma migrate status' 2>&1)" || true
    if echo "$MS_OUT" | grep -qiE 'P1000|Authentication failed|credentials.*not valid'; then
      echo "  Prisma migrate status (exec into running app): FAIL (auth)"
    else
      echo "  Prisma migrate status (exec into running app): OK"
    fi
  else
    echo "  Prisma migrate status (exec): skipped (app container not running)"
  fi
  echo "  Prisma migrate status (one-off with explicit DATABASE_URL for Prisma):"
  MS_OUT="$( (
    export DATABASE_URL="$_VERIFY_DU"
    sc run --rm -T --no-deps -e DATABASE_URL app sh -c 'cd /app && npx prisma migrate status'
  ) 2>&1)" || true
  if echo "$MS_OUT" | grep -qiE 'P1000|Authentication failed|credentials.*not valid'; then
    echo "  FAIL (auth) — Postgres password in the volume must match POSTGRES_* / SUHANI_DOCKER_DATABASE_URL in $ENV_FILE"
  elif echo "$MS_OUT" | grep -qiE 'not reach database server|Database connection error'; then
    echo "  FAIL (cannot reach db host from one-off container)"
  else
    echo "  OK (one-off prisma DATABASE_URL)"
  fi
  echo "──────────────────────────────────────────────"
  echo ""
}

deploy_standalone_suhani() {
  cd "$SUHANI_ROOT"
  # Base + prod overlay (see docker-compose.prod.yml header — avoids Compose `include` override bugs).
  local DC_FILES=(-f docker-compose.yml -f docker-compose.prod.yml)

  if [ -f .env.production ]; then
    ENV_FILE=.env.production
  elif [ -f .env ]; then
    ENV_FILE=.env
  else
    echo "Error: create .env.production or .env in $SUHANI_ROOT (see .env.example)"
    exit 1
  fi

  # docker-compose.yml app env_file uses this path so container DB creds match --env-file (avoids stale .env).
  export SUHANI_ENV_FILE="$ENV_FILE"

  echo ""
  echo "── Deploy environment ──"
  echo "  Using: $ENV_FILE for docker compose --env-file and SUHANI_ENV_FILE (app service env_file in docker-compose.yml)."
  if [ -f .env ] && [ -f .env.production ]; then
    if cmp -s .env .env.production 2>/dev/null; then
      echo "  .env and .env.production both exist and are identical (cmp)."
    else
      echo "  Warning: .env and .env.production differ. This run uses ONLY $ENV_FILE — edit that file for DB secrets, or delete .env.production to use .env."
    fi
  fi
  echo "────────────────────────"
  echo ""

  ensure_redis_password_in_env_file "$ENV_FILE"

  USE_SELF_SIGNED_SSL="$(read_env_value USE_SELF_SIGNED_SSL "$ENV_FILE" 2>/dev/null || true)"
  SEED_DATABASE="$(read_env_value SEED_DATABASE "$ENV_FILE" 2>/dev/null || true)"

  if [ "$(read_env_value USE_HOST_EDGE_PROXY "$ENV_FILE" 2>/dev/null)" = "1" ]; then
    DC_FILES+=(-f docker-compose.host-edge.yml)
    export SUHANI_APP_PORTS="${SUHANI_APP_PORTS:-127.0.0.1:3000:3000}"
  fi

  mkdir -p nginx/ssl nginx/logs certbot/www

  if [ "${USE_SELF_SIGNED_SSL:-0}" = "1" ]; then
    if [ ! -f nginx/ssl/server.crt ] || [ ! -f nginx/ssl/server.key ]; then
      openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/server.key \
        -out nginx/ssl/server.crt \
        -subj "/CN=localhost"
    fi
  fi

  echo "Building Suhani images (tenant app: *.\${APP_BASE_DOMAIN:-deelbot.ai})..."
  run_compose --env-file "$ENV_FILE" "${DC_FILES[@]}" build

  # Stop app if it is already running so ALTER USER (sync) cannot race an old Prisma process from a previous `up`.
  run_compose --env-file "$ENV_FILE" "${DC_FILES[@]}" stop app 2>/dev/null || true

  # Bring up db + redis only first. If `app` starts in the same `up -d` as before this split, its CMD runs
  # `prisma migrate deploy` before this script's ALTER USER (sync). That ordering can leave the long-lived
  # app's Prisma broken (P1000 on /api/auth/login and /api/tenant-settings) while one-off prisma checks pass.
  echo "Starting Postgres and Redis..."
  run_compose --env-file "$ENV_FILE" "${DC_FILES[@]}" up -d db redis

  wait_for_postgres "$ENV_FILE" "${DC_FILES[@]}"

  sync_postgres_role_password_from_env "$ENV_FILE" "${DC_FILES[@]}"

  postgres_password_works_from_app_network "$ENV_FILE" "${DC_FILES[@]}"

  prisma_migrate_deploy_retry "$ENV_FILE" "${DC_FILES[@]}"

  if [ "${SEED_DATABASE:-}" = "true" ]; then
    echo "Running Prisma seed..."
    _seed_ok=1
    _seed_du="$(docker_database_url_for_prisma "$ENV_FILE" "${DC_FILES[@]}")"
    for _seed_attempt in 1 2 3; do
      if (
        export DATABASE_URL="$_seed_du"
        run_compose --env-file "$ENV_FILE" "${DC_FILES[@]}" run --rm -T --no-deps -e DATABASE_URL app npx prisma db seed
      ); then
        _seed_ok=0
        break
      fi
      echo "  seed failed; retrying in 6s..."
      sleep 6
    done
    if [ "$_seed_ok" != 0 ]; then
      echo "Warning: prisma db seed failed after 3 attempts (deploy continues)."
    fi
  fi

  echo "Starting app, nginx, certbot, and remaining services..."
  run_compose --env-file "$ENV_FILE" "${DC_FILES[@]}" up -d

  run_compose --env-file "$ENV_FILE" "${DC_FILES[@]}" ps
  echo "Suhani deploy complete."
  verify_standalone_db || true
  if [ "$(read_env_value USE_HOST_EDGE_PROXY "$ENV_FILE" 2>/dev/null)" = "1" ]; then
    echo "  Host edge: TLS on this server :443 → app on ${SUHANI_APP_PORTS:-127.0.0.1:3000:3000} (see deploy/host-edge/README.md)."
  else
    HTTP_P="${NGINX_PUBLISH_HTTP_PORT:-9080}"
    HTTPS_P="${NGINX_PUBLISH_HTTPS_PORT:-9443}"
    echo "  Docker Nginx: http://localhost:${HTTP_P}  https://localhost:${HTTPS_P}"
  fi
}

deploy_stack() {
  local ROOT="${DEELBOT_DEPLOY_DIR:-$SUHANI_ROOT/deploy}"
  if [ ! -f "$ROOT/docker-compose.production.yml" ]; then
    echo "Error: $ROOT/docker-compose.production.yml not found. Set DEELBOT_DEPLOY_DIR."
    exit 1
  fi
  cd "$ROOT"

  for f in suhani.env control-plane.env; do
    if [ ! -f "$f" ]; then
      echo "Error: missing $ROOT/$f — copy from *.env.example and configure."
      exit 1
    fi
  done

  if [ -z "${POSTGRES_PASSWORD:-}" ] || [ -z "${REDIS_PASSWORD:-}" ]; then
    echo "Error: export POSTGRES_PASSWORD and REDIS_PASSWORD before stack deploy."
    exit 1
  fi

  require_docker
  echo "Building full stack (deelbot.com control plane + *.deelbot.ai Suhani)..."
  run_compose -f docker-compose.production.yml build --parallel
  run_compose -f docker-compose.production.yml up -d --remove-orphans

  sleep 8

  echo "Migrations: Suhani (auto on container start) + Control Plane..."
  docker exec deelbot-suhani npx prisma migrate deploy 2>/dev/null || true
  docker exec deelbot-control-plane pnpm exec prisma migrate deploy 2>/dev/null || true

  run_compose -f docker-compose.production.yml ps
  echo "Stack deploy complete. Ensure certs exist for deelbot.com and *.deelbot.ai (wildcard)."
}

deploy_control_plane_only() {
  local CP="${SAAS_CP_ROOT:-$(cd "$SUHANI_ROOT/../saas-control-plane" 2>/dev/null && pwd || true)}"
  if [ ! -d "$CP" ] || [ ! -f "$CP/docker-compose.prod.yml" ]; then
    echo "Error: saas-control-plane not found at $CP. Set SAAS_CP_ROOT."
    exit 1
  fi
  cd "$CP"

  if [ -f .env.production ]; then
    ENV_FILE=.env.production
  elif [ -f .env ]; then
    ENV_FILE=.env
  else
    echo "Error: create .env.production or .env in $CP (see .env.example)"
    exit 1
  fi

  mkdir -p certbot/www nginx/logs nginx/ssl
  if [ ! -f nginx/ssl/server.crt ] || [ ! -f nginx/ssl/server.key ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout nginx/ssl/server.key \
      -out nginx/ssl/server.crt \
      -subj "/CN=www.deelbot.com"
  fi

  require_docker

  local CP_DC=(-f docker-compose.prod.yml)
  if [ "$(read_env_value USE_HOST_EDGE_PROXY "$ENV_FILE" 2>/dev/null)" = "1" ]; then
    CP_DC+=(-f docker-compose.host-edge.yml)
    export CP_APP_PORTS="${CP_APP_PORTS:-127.0.0.1:3001:3001}"
  fi

  echo "Building control plane (deelbot.com)..."
  run_compose --env-file "$ENV_FILE" "${CP_DC[@]}" build
  run_compose --env-file "$ENV_FILE" "${CP_DC[@]}" up -d

  sleep 8
  echo "Running Prisma migrations..."
  run_compose --env-file "$ENV_FILE" "${CP_DC[@]}" run --rm -T app pnpm exec prisma migrate deploy

  run_compose --env-file "$ENV_FILE" "${CP_DC[@]}" ps
  echo "Control plane deploy complete."
}

require_docker

case "$MODE" in
  standalone|"")
    deploy_standalone_suhani
    ;;
  verify-db)
    require_docker
    verify_standalone_db
    ;;
  stack|full)
    deploy_stack
    ;;
  control-plane|cp)
    deploy_control_plane_only
    ;;
  *)
    echo "Unknown mode: $MODE (use standalone | verify-db | stack | control-plane)"
    exit 1
    ;;
esac
