#!/usr/bin/env bash
# Quick checks before deploying: merged compose + nginx always proxies /uploads to the app.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== docker compose config (base + prod) =="
docker compose -f docker-compose.yml -f docker-compose.prod.yml config >/dev/null
echo "OK"

echo "== SUHANI_PUBLIC_UPLOADS_DIR in docker-compose.yml =="
grep -q 'SUHANI_PUBLIC_UPLOADS_DIR' docker-compose.yml

echo "== nginx: ^~ /uploads/ proxies to suhani_app =="
grep -q 'location \^~ /uploads/' nginx/nginx.conf
grep -q 'proxy_pass http://suhani_app' nginx/nginx.conf

echo "All verify-docker-prod-compose checks passed."
