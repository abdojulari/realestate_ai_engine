#!/usr/bin/env bash
# =============================================================================
# Issue / renew Let's Encrypt certs for tenant custom domains (HTTP-01, webroot)
# =============================================================================
# Prerequisites:
#   - DNS A/AAAA for each hostname points at this server
#   - HTTP-01: Let's Encrypt must reach nginx on host port 80. Default Suhani compose maps
#     container :80 → host NGINX_PUBLISH_HTTP_PORT (9080). Either set NGINX_PUBLISH_HTTP_PORT=80
#     in .env, or port-forward 80→9080, or use DNS-01 for certs.
#   - default_server in nginx.conf still serves /.well-known/acme-challenge/ on container port 80
#
# Usage:
#   cd /path/to/suhani
#   export CERTBOT_EMAIL=you@example.com   # or pass as first arg
#   ./scripts/issue-custom-domain-cert.sh admin@example.com aohomes.com www.aohomes.com
#
# Compose file (override if needed):
#   COMPOSE_FILE=docker-compose.prod.yml
# Combined stack (from suhani repo root):
#   COMPOSE_FILE=deploy/docker-compose.production.yml ./scripts/issue-custom-domain-cert.sh you@x.com site.com
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
DC="docker compose"
if ! docker compose version &>/dev/null; then
  DC="docker-compose"
fi

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ] || [ $# -lt 2 ]; then
  echo "Usage: CERTBOT_EMAIL=you@domain.com $0 <email> <domain> [domain2 ...]"
  echo "   or: $0 <email> <domain> [domain2 ...]"
  exit 1
fi

EMAIL="$1"
shift
DOMAINS=("$@")

if ! docker info &>/dev/null; then
  echo "Error: Docker is not running."
  exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Error: $COMPOSE_FILE not found in $ROOT"
  exit 1
fi

ARGS=()
for d in "${DOMAINS[@]}"; do
  ARGS+=(-d "$d")
done

echo "Requesting certificate for: ${DOMAINS[*]}"
echo "Using compose file: $COMPOSE_FILE"

# certonly: nginx keeps running; webroot must match nginx (./certbot/www → /var/www/certbot)
$DC -f "$COMPOSE_FILE" run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --non-interactive \
  "${ARGS[@]}"

echo ""
echo "Next steps:"
echo "  1. Add HTTPS (and optional HTTP→HTTPS) server blocks to nginx/conf.d/custom-domains.conf"
echo "     (see nginx/conf.d/custom-domains.conf.example — use include snippets/suhani-tenant-server.inc)"
echo "  2. Reload nginx: $DC -f $COMPOSE_FILE exec nginx nginx -s reload"
echo "  3. Ensure TenantSettings.customDomain (Suhani) matches this hostname."
