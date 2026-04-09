#!/usr/bin/env bash
# =============================================================================
# Issue / refresh Let's Encrypt certs for host Nginx (Option B), update SSL snippets, reload Nginx.
#
# Prerequisites:
#   - install-debian.sh already run (Nginx + webroot /var/www/certbot + bootstrap snippets)
#   - DNS A/AAAA for every -d name points at this server (HTTP-01 on :80)
#   - Wildcard *.deelbot.ai: use --deelbot-ai-wildcard + Cloudflare DNS API (no HTTP-01 for *)
#
# Usage:
#   sudo CERTBOT_EMAIL=you@deelbot.com ./deploy/host-edge/issue-le-certs.sh
#
# Optional:
#   DEELBOT_AI_EXTRA_DOMAINS="aohomes.deelbot.ai"   # extra SANs (HTTP-01) on deelbot-ai cert
#   sudo ./deploy/host-edge/issue-le-certs.sh --deelbot-com-only
#   sudo ./deploy/host-edge/issue-le-certs.sh --deelbot-ai-only
#   sudo CLOUDFLARE_CREDENTIALS=/root/.secrets/cloudflare.ini \
#     ./deploy/host-edge/issue-le-certs.sh --deelbot-ai-wildcard
#
# Cloudflare credentials file (token with Zone.DNS:Edit on deelbot.ai):
#   dns_cloudflare_api_token = YOUR_TOKEN
# =============================================================================

set -euo pipefail

if [ "${EUID:-0}" -ne 0 ]; then
  echo "Error: run as root (sudo)."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEBROOT=/var/www/certbot
COM_CERT=deelbot-com
AI_CERT=deelbot-ai

DO_COM=1
DO_AI=1
AI_WILDCARD=0
CLOUDFLARE_CREDENTIALS="${CLOUDFLARE_CREDENTIALS:-/root/.secrets/cloudflare.ini}"

while [ $# -gt 0 ]; do
  case "$1" in
    --email)
      CERTBOT_EMAIL="$2"
      shift 2
      ;;
    --deelbot-com-only)
      DO_AI=0
      shift
      ;;
    --deelbot-ai-only)
      DO_COM=0
      shift
      ;;
    --deelbot-ai-wildcard)
      AI_WILDCARD=1
      shift
      ;;
    --cloudflare-credentials)
      CLOUDFLARE_CREDENTIALS="$2"
      shift 2
      ;;
    -h|--help)
      sed -n '1,35p' "$0" | tail -n +2
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

EMAIL="${CERTBOT_EMAIL:-}"
if [ -z "$EMAIL" ]; then
  echo "Error: set CERTBOT_EMAIL or pass --email you@domain.com"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq certbot

install -d -m 0755 "$WEBROOT" /etc/nginx/snippets
install -d -m 0755 /etc/letsencrypt/renewal-hooks/deploy
if [ -f "$SCRIPT_DIR/renewal-hooks/deploy/99-reload-nginx.sh" ]; then
  install -m 0755 "$SCRIPT_DIR/renewal-hooks/deploy/99-reload-nginx.sh" \
    /etc/letsencrypt/renewal-hooks/deploy/99-reload-nginx.sh
fi

reload_nginx() {
  nginx -t
  systemctl reload nginx
}

write_snippet_com_le() {
  cat > /etc/nginx/snippets/deelbot-com.ssl.inc <<EOF
ssl_certificate     /etc/letsencrypt/live/${COM_CERT}/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/${COM_CERT}/privkey.pem;
EOF
  chmod 0644 /etc/nginx/snippets/deelbot-com.ssl.inc
}

write_snippet_ai_le() {
  cat > /etc/nginx/snippets/deelbot-ai.ssl.inc <<EOF
ssl_certificate     /etc/letsencrypt/live/${AI_CERT}/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/${AI_CERT}/privkey.pem;
EOF
  chmod 0644 /etc/nginx/snippets/deelbot-ai.ssl.inc
}

issue_deelbot_com() {
  echo "=== Let's Encrypt: ${COM_CERT} (www.deelbot.com, deelbot.com) ==="
  certbot certonly --webroot -w "$WEBROOT" \
    --cert-name "$COM_CERT" --expand \
    --non-interactive --agree-tos --email "$EMAIL" \
    -d www.deelbot.com -d deelbot.com
  write_snippet_com_le
  reload_nginx
  echo "deelbot.com certificate installed; Nginx reloaded."
}

issue_deelbot_ai_http() {
  local -a domains=( -d deelbot.ai )
  local extra="${DEELBOT_AI_EXTRA_DOMAINS:-}"
  if [ -n "$extra" ]; then
    local d
    for d in $extra; do
      domains+=( -d "$d" )
    done
  fi

  echo "=== Let's Encrypt: ${AI_CERT} (HTTP-01) ==="
  if [ -n "$extra" ]; then
    echo "    SANs: deelbot.ai + $extra"
  else
    echo "    SANs: deelbot.ai only — set DEELBOT_AI_EXTRA_DOMAINS='aohomes.deelbot.ai ...' for tenant hosts"
  fi
  certbot certonly --webroot -w "$WEBROOT" \
    --cert-name "$AI_CERT" --expand \
    --non-interactive --agree-tos --email "$EMAIL" \
    "${domains[@]}"
  write_snippet_ai_le
  reload_nginx
  echo "deelbot.ai certificate installed; Nginx reloaded."
}

issue_deelbot_ai_wildcard() {
  if [ ! -f "$CLOUDFLARE_CREDENTIALS" ]; then
    echo "Error: missing $CLOUDFLARE_CREDENTIALS"
    echo "Create it with: dns_cloudflare_api_token = YOUR_CLOUDFLARE_API_TOKEN"
    exit 1
  fi
  chmod 0600 "$CLOUDFLARE_CREDENTIALS"

  apt-get install -y -qq python3-certbot-dns-cloudflare

  echo "=== Let's Encrypt: ${AI_CERT} (DNS-01, Cloudflare, wildcard) ==="
  certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials "$CLOUDFLARE_CREDENTIALS" \
    --dns-cloudflare-propagation-seconds 30 \
    --cert-name "$AI_CERT" \
    --non-interactive --agree-tos --email "$EMAIL" \
    -d deelbot.ai -d '*.deelbot.ai'
  write_snippet_ai_le
  reload_nginx
  echo "Wildcard deelbot.ai certificate installed; Nginx reloaded."
}

if [ "$DO_COM" = 1 ]; then
  issue_deelbot_com
fi

if [ "$DO_AI" = 1 ]; then
  if [ "$AI_WILDCARD" = 1 ]; then
    issue_deelbot_ai_wildcard
  else
    issue_deelbot_ai_http
  fi
fi

echo ""
echo "Renewal: certbot renew (timer) will run deploy hooks; 99-reload-nginx.sh reloads Nginx."
echo "Test: sudo certbot renew --dry-run"
