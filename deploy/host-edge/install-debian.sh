#!/usr/bin/env bash
# Install host Nginx config for Option B (TLS on the VPS, Docker apps on 127.0.0.1:3000 / :3001).
# Run on the server as root:  sudo ./deploy/host-edge/install-debian.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF_SRC="$SCRIPT_DIR/nginx/deelbot-edge.conf"
CONF_DST="/etc/nginx/conf.d/deelbot-edge.conf"

if [ ! -f "$CONF_SRC" ]; then
  echo "Error: missing $CONF_SRC"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx openssl

# Stock Ubuntu nginx also loads sites-enabled/* — those vhosts steal Host matching and return 404 for ACME.
if [ -d /etc/nginx/sites-enabled ] && compgen -G '/etc/nginx/sites-enabled/*' >/dev/null; then
  echo "Disabling /etc/nginx/sites-enabled/* (Option B uses conf.d/deelbot-edge.conf only)."
  rm -f /etc/nginx/sites-enabled/*
fi

install -d -m 0755 /var/www/certbot /etc/nginx/ssl

# Bootstrap TLS (replace with Let's Encrypt when ready).
BOOT="/etc/nginx/ssl/deelbot-edge"
if [ ! -f "${BOOT}-fullchain.pem" ] || [ ! -f "${BOOT}-privkey.pem" ]; then
  echo "Creating 60-day self-signed certificate (SAN: deelbot.com, www, deelbot.ai, *.deelbot.ai)..."
  openssl req -x509 -nodes -days 60 -newkey rsa:2048 \
    -keyout "${BOOT}-privkey.pem" \
    -out "${BOOT}-fullchain.pem" \
    -subj "/CN=www.deelbot.com" \
    -addext "subjectAltName=DNS:deelbot.com,DNS:www.deelbot.com,DNS:deelbot.ai,DNS:*.deelbot.ai"
  chmod 0640 "${BOOT}-privkey.pem"
  chmod 0644 "${BOOT}-fullchain.pem"
fi

cp -a "$CONF_SRC" "$CONF_DST"

SNIP_DIR="$SCRIPT_DIR/nginx/snippets"
if [ -d "$SNIP_DIR" ]; then
  install -d -m 0755 /etc/nginx/snippets
  if [ -f "$SNIP_DIR/deelbot-acme.inc" ]; then
    cp -a "$SNIP_DIR/deelbot-acme.inc" /etc/nginx/snippets/deelbot-acme.inc
  fi
  for f in deelbot-com.ssl.inc deelbot-ai.ssl.inc; do
    if [ ! -f "/etc/nginx/snippets/$f" ]; then
      cp -a "$SNIP_DIR/$f" "/etc/nginx/snippets/$f"
    fi
  done
  for f in deelbot-com-https-direct.inc deelbot-com-https-docker.inc; do
    if [ -f "$SNIP_DIR/$f" ]; then
      cp -a "$SNIP_DIR/$f" "/etc/nginx/snippets/$f"
    fi
  done
  MODE="${DEELBOT_COM_PROXY_MODE:-direct}"
  case "$MODE" in
    direct|docker) ;;
    *)
      echo "Error: DEELBOT_COM_PROXY_MODE must be direct or docker (got $MODE)"
      exit 1
      ;;
  esac
  if [ -f "$SNIP_DIR/deelbot-com-https-$MODE.inc" ]; then
    cp -a "$SNIP_DIR/deelbot-com-https-$MODE.inc" /etc/nginx/snippets/deelbot-com-https-app.inc
  else
    echo "Error: missing $SNIP_DIR/deelbot-com-https-$MODE.inc"
    exit 1
  fi
fi

install -d -m 0755 /etc/letsencrypt/renewal-hooks/deploy
if [ -f "$SCRIPT_DIR/renewal-hooks/deploy/99-reload-nginx.sh" ]; then
  install -m 0755 "$SCRIPT_DIR/renewal-hooks/deploy/99-reload-nginx.sh" \
    /etc/letsencrypt/renewal-hooks/deploy/99-reload-nginx.sh
fi

nginx -t
systemctl enable --now nginx
systemctl reload nginx

echo ""
echo "Host Nginx installed. Open ports 80 and 443 (e.g. ufw allow 80,443/tcp)."
echo "Docker apps: USE_HOST_EDGE_PROXY=1 proxies :3000/:3001 directly (DEELBOT_COM_PROXY_MODE=direct, default)."
echo "Hybrid: Suhani Docker nginx on host HTTP (see NGINX_PUBLISH_HTTP_HOST_PORT / NGINX_PUBLISH_HTTP_PORT, default 9080) → DEELBOT_COM_PROXY_MODE=docker + README §2b."
echo "Let's Encrypt: sudo CERTBOT_EMAIL=you@domain.com $SCRIPT_DIR/issue-le-certs.sh"
