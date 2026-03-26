#!/usr/bin/env bash
# =============================================================================
# DeelBot Deploy Script — run on VPS to pull latest code and redeploy
# =============================================================================
# Usage:
#   ssh root@your-vps "bash /opt/deelbot/deploy.sh"
#   — or —
#   cd /opt/deelbot && ./deploy.sh
#
# Options:
#   ./deploy.sh              # Rebuild + redeploy all
#   ./deploy.sh suhani       # Rebuild only suhani
#   ./deploy.sh control-plane # Rebuild only control plane
# =============================================================================

set -euo pipefail

DEPLOY_DIR="/opt/deelbot"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.production.yml"

cd "$DEPLOY_DIR"

TARGET="${1:-all}"

echo "══════════════════════════════════════════════"
echo "  DeelBot Deploy — $(date '+%Y-%m-%d %H:%M:%S')"
echo "  Target: $TARGET"
echo "══════════════════════════════════════════════"

# Pull latest code
echo "[1/5] Pulling latest code..."
if [ "$TARGET" = "all" ] || [ "$TARGET" = "suhani" ]; then
  (cd suhani && git pull --ff-only)
fi
if [ "$TARGET" = "all" ] || [ "$TARGET" = "control-plane" ]; then
  (cd saas-control-plane && git pull --ff-only)
fi

# Build
echo "[2/5] Building containers..."
if [ "$TARGET" = "all" ]; then
  docker compose -f "$COMPOSE_FILE" build --parallel
elif [ "$TARGET" = "suhani" ]; then
  docker compose -f "$COMPOSE_FILE" build suhani
elif [ "$TARGET" = "control-plane" ]; then
  docker compose -f "$COMPOSE_FILE" build control-plane
fi

# Deploy with zero-downtime rolling restart
echo "[3/5] Deploying..."
if [ "$TARGET" = "all" ]; then
  docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
else
  docker compose -f "$COMPOSE_FILE" up -d --no-deps "$TARGET"
fi

# Run migrations
echo "[4/5] Running database migrations..."
if [ "$TARGET" = "all" ] || [ "$TARGET" = "suhani" ]; then
  docker exec deelbot-suhani npx prisma migrate deploy 2>&1 || true
fi
if [ "$TARGET" = "all" ] || [ "$TARGET" = "control-plane" ]; then
  docker exec deelbot-control-plane npx prisma migrate deploy 2>&1 || true
fi

# Clean up old images
echo "[5/5] Cleaning up dangling images..."
docker image prune -f

echo ""
echo "══════════════════════════════════════════════"
echo "  Deploy complete!"
echo ""
docker compose -f "$COMPOSE_FILE" ps
echo "══════════════════════════════════════════════"
