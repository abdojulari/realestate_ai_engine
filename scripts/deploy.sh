#!/usr/bin/env bash
# =============================================================================
# DeelBot deploy helper — Suhani tenant app, full stack, or control plane only
# =============================================================================
# Usage (from repo root unless noted):
#   ./scripts/deploy.sh                    # standalone Suhani (docker-compose.prod.yml)
#   ./scripts/deploy.sh standalone
#   ./scripts/deploy.sh stack              # deelbot.com + *.deelbot.ai (deploy/docker-compose.production.yml)
#   ./scripts/deploy.sh control-plane      # SaaS control plane only (sibling saas-control-plane repo)
#
# Environment:
#   DEELBOT_DEPLOY_DIR   — for stack mode (default: <suhani>/deploy)
#   SAAS_CP_ROOT         — for control-plane mode (default: sibling ../saas-control-plane)
#
# Production TLS: use Let's Encrypt (see deploy/setup-vps.sh / certbot). The optional
# nginx/ssl self-signed block below is for local smoke tests only.
#
# Custom tenant domains (e.g. aohomes.com or future *.propertymatch.estate):
#   Copy nginx/conf.d/custom-domains.conf.example → custom-domains.conf, add server_name +
#   certificate paths, then: docker compose exec nginx nginx -s reload
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUHANI_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MODE="${1:-standalone}"

resolve_docker_compose() {
  if docker compose version &>/dev/null; then
    echo "docker compose"
  elif command -v docker-compose &>/dev/null; then
    echo "docker-compose"
  else
    echo ""
  fi
}

DC="$(resolve_docker_compose)"
if [ -z "$DC" ]; then
  echo "Error: Docker Compose is not installed."
  echo "Install the v2 plugin (recommended), then verify: docker compose version"
  echo "  Debian/Ubuntu: sudo apt-get update && sudo apt-get install -y docker-compose-plugin"
  echo "  Or: https://docs.docker.com/compose/install/linux/"
  exit 1
fi

require_docker() {
  if ! docker info &>/dev/null; then
    echo "Error: Docker is not running"
    exit 1
  fi
}

deploy_standalone_suhani() {
  cd "$SUHANI_ROOT"

  if [ -f .env.production ]; then
    set -a
    # shellcheck disable=SC1091
    source .env.production
    set +a
  elif [ -f .env ]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
  else
    echo "Error: create .env.production or .env in $SUHANI_ROOT (see .env.example)"
    exit 1
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
  $DC -f docker-compose.prod.yml build
  $DC -f docker-compose.prod.yml up -d

  echo "Waiting for Postgres/Redis and app..."
  sleep 8

  echo "Running Prisma migrations..."
  $DC -f docker-compose.prod.yml exec -T app npx prisma migrate deploy

  if [ "${SEED_DATABASE:-}" = "true" ]; then
    $DC -f docker-compose.prod.yml exec -T app npx prisma db seed || true
  fi

  $DC -f docker-compose.prod.yml ps
  HTTP_P="${NGINX_PUBLISH_HTTP_PORT:-9080}"
  HTTPS_P="${NGINX_PUBLISH_HTTPS_PORT:-9443}"
  echo "Suhani deploy complete."
  echo "  Nginx (host): http://localhost:${HTTP_P}  https://localhost:${HTTPS_P}"
  echo "  (Set NGINX_PUBLISH_HTTP_PORT / NGINX_PUBLISH_HTTPS_PORT=80/443 in .env when this stack owns standard ports.)"
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
  $DC -f docker-compose.production.yml build --parallel
  $DC -f docker-compose.production.yml up -d --remove-orphans

  sleep 8

  echo "Migrations: Suhani (auto on container start) + Control Plane..."
  docker exec deelbot-suhani npx prisma migrate deploy 2>/dev/null || true
  docker exec deelbot-control-plane pnpm exec prisma migrate deploy 2>/dev/null || true

  $DC -f docker-compose.production.yml ps
  echo "Stack deploy complete. Ensure certs exist for deelbot.com and *.deelbot.ai (wildcard)."
}

deploy_control_plane_only() {
  local CP="${SAAS_CP_ROOT:-$(cd "$SUHANI_ROOT/../saas-control-plane" 2>/dev/null && pwd || true)}"
  if [ ! -d "$CP" ] || [ ! -f "$CP/docker-compose.prod.yml" ]; then
    echo "Error: saas-control-plane not found at $CP. Set SAAS_CP_ROOT."
    exit 1
  fi
  cd "$CP"

  if [ ! -f .env.production ] && [ ! -f .env ]; then
    echo "Error: create .env.production or .env in $CP (see .env.example)"
    exit 1
  fi

  if [ -f .env.production ]; then
    set -a
    # shellcheck disable=SC1091
    source .env.production
    set +a
  else
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
  fi

  mkdir -p certbot/www nginx/logs
  require_docker

  echo "Building control plane (deelbot.com)..."
  $DC -f docker-compose.prod.yml build
  $DC -f docker-compose.prod.yml up -d

  sleep 8
  echo "Running Prisma migrations..."
  $DC -f docker-compose.prod.yml exec -T app pnpm exec prisma migrate deploy

  $DC -f docker-compose.prod.yml ps
  echo "Control plane deploy complete."
}

require_docker

case "$MODE" in
  standalone)
    deploy_standalone_suhani
    ;;
  stack|full)
    deploy_stack
    ;;
  control-plane|cp)
    deploy_control_plane_only
    ;;
  *)
    echo "Unknown mode: $MODE (use standalone | stack | control-plane)"
    exit 1
    ;;
esac
