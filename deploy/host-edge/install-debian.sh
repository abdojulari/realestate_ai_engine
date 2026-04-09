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

# Avoid clashing with stock default_server on :80 / :443
rm -f /etc/nginx/sites-enabled/default

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
nginx -t
systemctl enable --now nginx
systemctl reload nginx

echo ""
echo "Host Nginx installed. Open ports 80 and 443 (e.g. ufw allow 80,443/tcp)."
echo "Ensure Docker stacks use USE_HOST_EDGE_PROXY=1 (see deploy/host-edge/README.md)."
echo "Replace ${BOOT}-*.pem with Let's Encrypt when ready (certbot --webroot -w /var/www/certbot ...)."
