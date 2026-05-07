#!/usr/bin/env bash
# =============================================================================
# Issue / renew Let's Encrypt cert for www.deelbot.com + deelbot.com using the
# same HTTP-01 webroot as Suhani (/var/www/certbot). Run on the VPS from repo root:
#
#   ./scripts/issue-deelbot-com-cert.sh
#
# Requires: nginx + certbot services from docker-compose (prod overlay), port 80
# reachable at http://www.deelbot.com/.well-known/acme-challenge/ (Suhani nginx
# default_server :80 already serves that path).
#
# After first issuance, reload nginx:
#   docker compose -f docker-compose.yml -f docker-compose.prod.yml exec nginx nginx -s reload
# =============================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

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

if [ -f .env.production ]; then
  ENV_FILE=.env.production
elif [ -f .env ]; then
  ENV_FILE=.env
else
  echo "Error: create .env.production or .env"
  exit 1
fi

EMAIL="${CERTBOT_EMAIL:-$(read_env_value CERTBOT_EMAIL "$ENV_FILE" 2>/dev/null || true)}"
if [ -z "$EMAIL" ]; then
  EMAIL="$(read_env_value AGENT_EMAIL "$ENV_FILE" 2>/dev/null || true)"
fi
if [ -z "$EMAIL" ]; then
  echo "Error: set CERTBOT_EMAIL in $ENV_FILE or export CERTBOT_EMAIL"
  exit 1
fi

DC=(-f docker-compose.yml -f docker-compose.prod.yml)

if docker compose version &>/dev/null 2>&1; then
  docker compose --env-file "$ENV_FILE" "${DC[@]}" run --rm --entrypoint "" certbot \
    certbot certonly \
    --webroot -w /var/www/certbot \
    -d www.deelbot.com -d deelbot.com \
    --email "$EMAIL" \
    --agree-tos --non-interactive \
    --expand
else
  docker-compose --env-file "$ENV_FILE" "${DC[@]}" run --rm --entrypoint "" certbot \
    certbot certonly \
    --webroot -w /var/www/certbot \
    -d www.deelbot.com -d deelbot.com \
    --email "$EMAIL" \
    --agree-tos --non-interactive \
    --expand
fi

echo ""
echo "Certificates should exist at /etc/letsencrypt/live/www.deelbot.com/"
echo "Reload nginx: docker compose ${DC[*]} exec nginx nginx -s reload"
