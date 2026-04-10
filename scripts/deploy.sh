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
read_env_value() {
  local key="$1" file="$2" line val prefix
  [ -f "$file" ] || return 1
  prefix="${key}="
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
        printf '%s' "$val"
        return 0
        ;;
    esac
  done < "$file"
  return 1
}

require_docker() {
  if ! docker info &>/dev/null; then
    echo "Error: Docker is not running"
    exit 1
  fi
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

# Prisma migrate with retries (transient P1000 / connection during stack bring-up).
prisma_migrate_deploy_retry() {
  local ENV_FILE="$1"
  shift
  local attempt
  for attempt in 1 2 3 4 5 6; do
    echo "Running Prisma migrations (attempt $attempt/6)..."
    if run_compose --env-file "$ENV_FILE" "$@" run --rm -T app npx prisma migrate deploy; then
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

  sc() {
    run_compose --env-file "$ENV_FILE" "${DC_FILES[@]}" "$@"
  }

  echo ""
  echo "──────── Quick DB check (read-only) ────────"
  if grep -qE '^[[:space:]]*SUHANI_DOCKER_DATABASE_URL=' "$ENV_FILE" 2>/dev/null; then
    echo "Note: SUHANI_DOCKER_DATABASE_URL is set — it overrides POSTGRES_* for the app's DATABASE_URL."
  fi
  echo "App DATABASE_URL (password redacted):"
  sc exec -T app printenv DATABASE_URL 2>/dev/null | sed -E 's#(://[^:]+:)[^@]+#\1***#' || echo "  (app container not running?)"
  echo "DB container: POSTGRES_USER + POSTGRES_DB (password hidden)"
  U="$(sc exec -T db printenv POSTGRES_USER 2>/dev/null | tr -d '\r' || true)"
  D="$(sc exec -T db printenv POSTGRES_DB 2>/dev/null | tr -d '\r' || true)"
  echo "  POSTGRES_USER=${U:-?}  POSTGRES_DB=${D:-?}"
  if sc exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "select 1"' 2>/dev/null | grep -q 1; then
    echo "  psql inside db: OK"
  else
    echo "  psql inside db: FAIL (volume password may not match POSTGRES_PASSWORD in env)"
  fi
  MS_OUT="$(sc exec -T app sh -c 'cd /app && npx prisma migrate status' 2>&1)" || true
  if echo "$MS_OUT" | grep -qiE 'P1000|Authentication failed|credentials.*not valid'; then
    echo "  Prisma from app: FAIL (auth — align DATABASE_URL with real Postgres password, or fix SUHANI_DOCKER_DATABASE_URL)"
  elif echo "$MS_OUT" | grep -qiE 'not reach database server|Database connection error'; then
    echo "  Prisma from app: FAIL (cannot reach db host)"
  else
    echo "  Prisma migrate status: OK (no obvious connection/auth error)"
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

  echo "Building and starting Suhani stack (tenant app: *.\${APP_BASE_DOMAIN:-deelbot.ai})..."
  run_compose --env-file "$ENV_FILE" "${DC_FILES[@]}" build
  run_compose --env-file "$ENV_FILE" "${DC_FILES[@]}" up -d

  wait_for_postgres "$ENV_FILE" "${DC_FILES[@]}"

  prisma_migrate_deploy_retry "$ENV_FILE" "${DC_FILES[@]}"

  if [ "${SEED_DATABASE:-}" = "true" ]; then
    echo "Running Prisma seed..."
    _seed_ok=1
    for _seed_attempt in 1 2 3; do
      if run_compose --env-file "$ENV_FILE" "${DC_FILES[@]}" run --rm -T app npx prisma db seed; then
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
