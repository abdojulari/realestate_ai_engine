#!/usr/bin/env bash
# =============================================================================
# Issue Let's Encrypt for www.deelbot.com + deelbot.com (HTTP-01, webroot
# /var/www/certbot). Then replace nginx/conf.d/deelbot-com.conf with the
# HTTPS version (nginx/deelbot-com.post-ssl.conf) and reload nginx.
#
# Bootstrap conf.d/deelbot-com.conf must NOT reference the cert paths until
# this script has run — otherwise suhani-nginx crash-loops.
#
#   ./scripts/issue-deelbot-com-cert.sh
#
# Run from suhani repo root on the VPS (same dir as docker-compose.yml).
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

DC=(--env-file "$ENV_FILE" -f docker-compose.yml -f docker-compose.prod.yml)

compose() {
  if docker compose version &>/dev/null 2>&1; then
    docker compose "${DC[@]}" "$@"
  else
    docker-compose "${DC[@]}" "$@"
  fi
}

echo "Requesting certificate (certbot certonly)..."
compose run --rm --entrypoint "" certbot \
  certbot certonly \
  --webroot -w /var/www/certbot \
  -d www.deelbot.com -d deelbot.com \
  --email "$EMAIL" \
  --agree-tos --non-interactive \
  --expand

FULLCHAIN="/etc/letsencrypt/live/www.deelbot.com/fullchain.pem"
if [ ! -f "$FULLCHAIN" ]; then
  echo "Error: expected $FULLCHAIN after certbot (check lineage name under live/)."
  ls -la /etc/letsencrypt/live 2>/dev/null || true
  exit 1
fi

POST_SSL="$ROOT/nginx/deelbot-com.post-ssl.conf"
TARGET="$ROOT/nginx/conf.d/deelbot-com.conf"
if [ ! -f "$POST_SSL" ]; then
  echo "Error: missing $POST_SSL"
  exit 1
fi

echo "Installing full HTTPS vhost (post-SSL) into nginx/conf.d/deelbot-com.conf ..."
cp "$POST_SSL" "$TARGET"

echo "Reloading nginx ..."
CID="$(compose ps -q nginx 2>/dev/null | head -n1 || true)"
if [ -z "$CID" ]; then
  echo "Error: no running nginx container (docker compose ps nginx). Start the stack first."
  exit 1
fi

run_nginx() {
  local cmd=("$@")
  if compose exec -T nginx "${cmd[@]}"; then
    return 0
  fi
  docker exec -i "$CID" "${cmd[@]}"
}

run_nginx nginx -t
run_nginx nginx -s reload
echo "Done."
