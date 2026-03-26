#!/usr/bin/env bash
# =============================================================================
# DeelBot VPS Setup Script
# =============================================================================
# Run on a fresh Ubuntu 22.04/24.04 VPS as root.
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/<repo>/deploy/setup-vps.sh | bash
#   — or —
#   chmod +x setup-vps.sh && ./setup-vps.sh
# =============================================================================

set -euo pipefail

DEPLOY_DIR="/opt/deelbot"
DOMAIN_COM="deelbot.com"
DOMAIN_AI="deelbot.ai"
EMAIL="abdul.ojulari@exprealty.com"

echo "================================================"
echo "  DeelBot VPS Setup — $(date)"
echo "================================================"

# ── 1. System updates & essentials ───────────────────────────────
echo "[1/8] Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y -qq \
  curl git ufw fail2ban \
  apt-transport-https ca-certificates gnupg lsb-release \
  software-properties-common jq unzip htop

# ── 2. Install Docker Engine ────────────────────────────────────
echo "[2/8] Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

if ! command -v docker compose &>/dev/null; then
  echo "Docker Compose plugin not found — installing..."
  apt-get install -y docker-compose-plugin
fi

docker --version
docker compose version

# ── 3. Firewall (UFW) ───────────────────────────────────────────
echo "[3/8] Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment 'SSH'
ufw allow 80/tcp   comment 'HTTP'
ufw allow 443/tcp  comment 'HTTPS'
ufw --force enable

# ── 4. Create deployment directory ──────────────────────────────
echo "[4/8] Creating deployment directory..."
mkdir -p "$DEPLOY_DIR"/{certbot/www,nginx}

# ── 5. Install Certbot + Cloudflare DNS plugin ──────────────────
echo "[5/8] Installing Certbot..."
apt-get install -y -qq certbot
# Cloudflare plugin for wildcard DNS validation
apt-get install -y -qq python3-certbot-dns-cloudflare 2>/dev/null || \
  pip3 install certbot-dns-cloudflare 2>/dev/null || true

# ── 6. Obtain SSL certificates ──────────────────────────────────
echo "[6/8] Obtaining SSL certificates..."
echo ""
echo "  You need TWO certificates:"
echo "    1. deelbot.com        (standard HTTP validation)"
echo "    2. *.deelbot.ai       (wildcard — requires DNS validation)"
echo ""

# 6a. deelbot.com — standard webroot (Nginx not running yet, use standalone)
if [ ! -d "/etc/letsencrypt/live/$DOMAIN_COM" ]; then
  echo "  → Requesting cert for $DOMAIN_COM..."
  certbot certonly --standalone \
    -d "$DOMAIN_COM" -d "www.$DOMAIN_COM" \
    --email "$EMAIL" --agree-tos --no-eff-email
else
  echo "  → Cert for $DOMAIN_COM already exists."
fi

# 6b. *.deelbot.ai — wildcard requires DNS challenge
if [ ! -d "/etc/letsencrypt/live/$DOMAIN_AI" ]; then
  echo ""
  echo "  → Requesting WILDCARD cert for *.$DOMAIN_AI..."
  echo ""
  echo "  ┌──────────────────────────────────────────────────────────┐"
  echo "  │  WILDCARD CERTS require DNS validation.                  │"
  echo "  │                                                          │"
  echo "  │  Option A: Cloudflare DNS plugin (automatic)             │"
  echo "  │    Create /root/.cloudflare.ini with:                    │"
  echo "  │      dns_cloudflare_api_token = YOUR_TOKEN               │"
  echo "  │    Then run:                                             │"
  echo "  │      certbot certonly --dns-cloudflare \\                 │"
  echo "  │        --dns-cloudflare-credentials /root/.cloudflare.ini│"
  echo "  │        -d '$DOMAIN_AI' -d '*.$DOMAIN_AI' \\              │"
  echo "  │        --email $EMAIL --agree-tos                        │"
  echo "  │                                                          │"
  echo "  │  Option B: Manual DNS (interactive)                      │"
  echo "  │      certbot certonly --manual \\                         │"
  echo "  │        --preferred-challenges dns \\                      │"
  echo "  │        -d '$DOMAIN_AI' -d '*.$DOMAIN_AI' \\              │"
  echo "  │        --email $EMAIL --agree-tos                        │"
  echo "  │                                                          │"
  echo "  │  You'll be asked to add a TXT record to your DNS.       │"
  echo "  └──────────────────────────────────────────────────────────┘"
  echo ""

  if [ -f "/root/.cloudflare.ini" ]; then
    echo "  Found /root/.cloudflare.ini — using Cloudflare plugin..."
    chmod 600 /root/.cloudflare.ini
    certbot certonly --dns-cloudflare \
      --dns-cloudflare-credentials /root/.cloudflare.ini \
      -d "$DOMAIN_AI" -d "*.$DOMAIN_AI" \
      --email "$EMAIL" --agree-tos --no-eff-email
  else
    echo "  No Cloudflare credentials found. Running manual DNS challenge..."
    certbot certonly --manual \
      --preferred-challenges dns \
      -d "$DOMAIN_AI" -d "*.$DOMAIN_AI" \
      --email "$EMAIL" --agree-tos --no-eff-email
  fi
else
  echo "  → Cert for *.$DOMAIN_AI already exists."
fi

# ── 7. Auto-renewal cron ────────────────────────────────────────
echo "[7/8] Setting up auto-renewal..."
cat > /etc/cron.d/certbot-renew <<'CRON'
# Renew certs twice daily, reload Nginx on success
0 */12 * * * root certbot renew --quiet --deploy-hook "docker exec deelbot-nginx nginx -s reload" >> /var/log/certbot-renew.log 2>&1
CRON

# ── 8. Swap file (important for 8GB VPS) ────────────────────────
echo "[8/8] Configuring swap..."
if [ ! -f /swapfile ]; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl vm.swappiness=10
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi

echo ""
echo "================================================"
echo "  VPS setup complete!"
echo ""
echo "  Next steps:"
echo "    1. Clone repos into $DEPLOY_DIR/:"
echo "       cd $DEPLOY_DIR"
echo "       git clone <suhani-repo> suhani"
echo "       git clone <saas-control-plane-repo> saas-control-plane"
echo ""
echo "    2. Copy config files:"
echo "       cp suhani/deploy/docker-compose.production.yml ."
echo "       cp suhani/deploy/nginx/nginx.conf nginx/"
echo "       cp suhani/deploy/init-databases.sql ."
echo ""
echo "    3. Create env files:"
echo "       cp suhani/deploy/.env.production .env"
echo "       cp suhani/deploy/suhani.env.example suhani.env"
echo "       cp suhani/deploy/control-plane.env.example control-plane.env"
echo "       # Edit all three with real values"
echo ""
echo "    4. Launch:"
echo "       docker compose -f docker-compose.production.yml up -d --build"
echo ""
echo "    5. Run migrations:"
echo "       docker exec deelbot-suhani npx prisma migrate deploy"
echo "       docker exec deelbot-control-plane npx prisma migrate deploy"
echo ""
echo "================================================"
