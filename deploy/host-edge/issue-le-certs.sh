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
#   DEELBOT_AI_INCLUDE_APEX=0                       # omit deelbot.ai apex (use if you have no @ A record)
#   DEELBOT_AI_EXTRA_DOMAINS="aohomes.deelbot.ai"   # SANs (HTTP-01); * in DNS does not cover apex
#   sudo ./deploy/host-edge/issue-le-certs.sh --deelbot-com-only
#   sudo ./deploy/host-edge/issue-le-certs.sh --deelbot-ai-only
#   sudo CLOUDFLARE_CREDENTIALS=/root/.secrets/cloudflare.ini \
#     ./deploy/host-edge/issue-le-certs.sh --deelbot-ai-wildcard
#   ./deploy/host-edge/issue-le-certs.sh --skip-preflight   # skip :80 listen check
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
SKIP_PREFLIGHT=0
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
    --skip-preflight)
      SKIP_PREFLIGHT=1
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

if ! command -v nginx >/dev/null 2>&1; then
  echo "Error: nginx is not installed on this server."
  echo "Option B (host TLS on :80/:443) uses the OS Nginx package — it is separate from Docker."
  echo "Install it once from the Suhani repo:"
  echo "  cd ~/opt/apps/suhani && sudo ./deploy/host-edge/install-debian.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq certbot curl dnsutils

install -d -m 0755 "$WEBROOT" /etc/nginx/snippets
install -d -m 0755 /etc/letsencrypt/renewal-hooks/deploy
if [ -f "$SCRIPT_DIR/renewal-hooks/deploy/99-reload-nginx.sh" ]; then
  install -m 0755 "$SCRIPT_DIR/renewal-hooks/deploy/99-reload-nginx.sh" \
    /etc/letsencrypt/renewal-hooks/deploy/99-reload-nginx.sh
fi

needs_http_01() {
  [ "$DO_COM" = 1 ] && return 0
  [ "$DO_AI" = 1 ] && [ "$AI_WILDCARD" = 0 ] && return 0
  return 1
}

preflight_http_01() {
  [ "$SKIP_PREFLIGHT" = 1 ] && return 0
  needs_http_01 || return 0

  if ! systemctl is-active --quiet nginx 2>/dev/null; then
    echo "Error: nginx is not active. HTTP-01 requires host Nginx on port 80."
    echo "  sudo systemctl status nginx"
    echo "  sudo nginx -t && sudo systemctl start nginx"
    exit 1
  fi

  local ok=0
  if command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | awk '$4 ~ /:80$/ { f=1 } END { exit(f ? 0 : 1) }'; then
    ok=1
  elif command -v netstat >/dev/null 2>&1 && netstat -tln 2>/dev/null | grep -qE '[:.]80\s'; then
    ok=1
  fi
  if [ "$ok" != 1 ]; then
    echo "Error: nothing is listening on TCP port 80 on this host."
    echo "Let's Encrypt must fetch http://YOUR-DOMAIN/.well-known/acme-challenge/... from the internet."
    echo "Fix:"
    echo "  1) sudo systemctl start nginx && sudo systemctl status nginx"
    echo "  2) sudo ufw allow 80/tcp && sudo ufw reload   (and allow 80 in your cloud security group / firewall)"
    echo "  3) Ensure no other stack bound :80 instead of host Nginx (USE_HOST_EDGE_PROXY=1 for Docker stacks)"
    echo "Verify from the server: ss -ltn | awk '\$4 ~ /:80\$/'"
    exit 1
  fi

  if ss -ltnp 2>/dev/null | grep -qE 'users:\(\("'; then
    if ! ss -ltnp 2>/dev/null | awk '/LISTEN/ && $4 ~ /:80$/ && $0 ~ /nginx/ { f=1 } END { exit(f ? 0 : 1) }'; then
      echo "Error: TCP port 80 does not appear to be bound by nginx."
      ss -ltnp 2>/dev/null | awk '/LISTEN/ && $4 ~ /:80$/ {print}' || true
      echo "If Docker owns :80, stop that container or set USE_HOST_EDGE_PROXY=1 and redeploy."
      exit 1
    fi
  fi

  if ! [ -f /etc/nginx/snippets/deelbot-acme.inc ]; then
    echo "Error: missing /etc/nginx/snippets/deelbot-acme.inc"
    echo "Pull latest Suhani and run: sudo ./deploy/host-edge/install-debian.sh"
    exit 1
  fi

  if ! nginx -t; then
    exit 1
  fi

  install -d -m 0755 "$WEBROOT/.well-known/acme-challenge"
  echo "preflight" >"$WEBROOT/.well-known/acme-challenge/_deelbot_ping"
  chmod a+r "$WEBROOT/.well-known/acme-challenge/_deelbot_ping"

  if ! curl -fsS --max-time 3 \
    --resolve "www.deelbot.com:80:127.0.0.1" \
    "http://www.deelbot.com/.well-known/acme-challenge/_deelbot_ping" | grep -q preflight; then
    rm -f "$WEBROOT/.well-known/acme-challenge/_deelbot_ping"
    echo "Error: Nginx returned 404 (or no body) for the ACME URL on 127.0.0.1:80."
    echo "Common causes:"
    echo "  • Stock site still enabled: ls /etc/nginx/sites-enabled  (should be empty; re-run install-debian.sh)"
    echo "  • Stale config: sudo cp .../deploy/host-edge/nginx/deelbot-edge.conf /etc/nginx/conf.d/ && sudo nginx -t && sudo systemctl reload nginx"
    echo "  • Missing snippet: ls /etc/nginx/snippets/deelbot-acme.inc"
    exit 1
  fi
  rm -f "$WEBROOT/.well-known/acme-challenge/_deelbot_ping"
}

preflight_http_01

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
  local -a domains=()
  if [ "${DEELBOT_AI_INCLUDE_APEX:-1}" != "0" ]; then
    domains+=( -d deelbot.ai )
  fi
  local extra="${DEELBOT_AI_EXTRA_DOMAINS:-}"
  if [ -n "$extra" ]; then
    local d
    for d in $extra; do
      domains+=( -d "$d" )
    done
  fi

  if [ ${#domains[@]} -eq 0 ]; then
    echo "Error: no hostnames for the deelbot-ai certificate."
    echo "  • Add DEELBOT_AI_EXTRA_DOMAINS='aohomes.deelbot.ai ...', and/or"
    echo "  • Keep apex on the cert (default) with a Cloudflare A record: name @ → your VPS IP"
    exit 1
  fi

  if [ "${DEELBOT_AI_INCLUDE_APEX:-1}" != "0" ] && command -v dig >/dev/null 2>&1; then
    if ! dig +short deelbot.ai A @1.1.1.1 | grep -q . && ! dig +short deelbot.ai AAAA @1.1.1.1 | grep -q .; then
      echo "Error: public DNS has no A/AAAA for deelbot.ai (zone apex)."
      echo "A Cloudflare record * (wildcard) matches tenant hosts like aohomes.deelbot.ai but NOT bare deelbot.ai."
      echo "Choose one:"
      echo "  A) Cloudflare → DNS → add A @ (or deelbot.ai) → same IP as your wildcard, then re-run this script."
      echo "  B) Cert for subdomains only: DEELBOT_AI_INCLUDE_APEX=0 DEELBOT_AI_EXTRA_DOMAINS='aohomes.deelbot.ai' sudo $SCRIPT_DIR/issue-le-certs.sh --deelbot-ai-only"
      exit 1
    fi
  fi

  echo "=== Let's Encrypt: ${AI_CERT} (HTTP-01) ==="
  echo "    SAN list: ${domains[*]}"

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
