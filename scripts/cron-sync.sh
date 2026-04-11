#!/usr/bin/env bash
# -------------------------------------------------------
# Daily property sync — intended to be called by cron.
#
# Runs CREA (holistic) then Pillar9 sync sequentially.
# Logs are written to /opt/apps/suhani/logs/sync-*.log
# with automatic 14-day rotation.
#
# Install (as root or the deploy user):
#   crontab -e
#   0 0 * * * /opt/apps/suhani/scripts/cron-sync.sh >> /opt/apps/suhani/logs/cron-sync.log 2>&1
# -------------------------------------------------------

set -euo pipefail

APP_DIR="/opt/apps/suhani"
LOG_DIR="${APP_DIR}/logs"
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
RETENTION_DAYS=14

mkdir -p "$LOG_DIR"

# Load production environment
if [ -f "${APP_DIR}/.env.production" ]; then
  set -a
  # shellcheck disable=SC1091
  source "${APP_DIR}/.env.production"
  set +a
fi

# The sync scripts hit the running app via HTTP.
# On the VPS the app container listens on localhost:3000.
export HOLISTIC_SYNC_API_BASE="${HOLISTIC_SYNC_API_BASE:-http://localhost:3000}"

# Resolve node — prefer nvm if available, fall back to PATH
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  source "$HOME/.nvm/nvm.sh" --no-use
  nvm use default --silent 2>/dev/null || true
fi
NODE=$(command -v node 2>/dev/null || echo "/usr/bin/node")

echo "=========================================="
echo "  CRON SYNC — ${TIMESTAMP}"
echo "  API base : ${HOLISTIC_SYNC_API_BASE}"
echo "  Node     : ${NODE} ($(${NODE} --version))"
echo "=========================================="

# --- CREA holistic sync ---
CREA_LOG="${LOG_DIR}/crea-sync-${TIMESTAMP}.log"
echo ""
echo "[$(date '+%H:%M:%S')] Starting CREA holistic sync …"
if "${NODE}" "${APP_DIR}/scripts/holistic-sync.mjs" > "${CREA_LOG}" 2>&1; then
  echo "[$(date '+%H:%M:%S')] CREA sync completed successfully."
else
  echo "[$(date '+%H:%M:%S')] CREA sync exited with code $?. Check ${CREA_LOG}"
fi

# --- Pillar9 sync ---
PILLAR9_LOG="${LOG_DIR}/pillar9-sync-${TIMESTAMP}.log"
echo ""
echo "[$(date '+%H:%M:%S')] Starting Pillar9 sync …"
if "${NODE}" "${APP_DIR}/scripts/pillar9-sync.mjs" > "${PILLAR9_LOG}" 2>&1; then
  echo "[$(date '+%H:%M:%S')] Pillar9 sync completed successfully."
else
  echo "[$(date '+%H:%M:%S')] Pillar9 sync exited with code $?. Check ${PILLAR9_LOG}"
fi

# --- Cleanup old logs ---
find "${LOG_DIR}" -name "crea-sync-*.log" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "${LOG_DIR}" -name "pillar9-sync-*.log" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

echo ""
echo "[$(date '+%H:%M:%S')] Done."
