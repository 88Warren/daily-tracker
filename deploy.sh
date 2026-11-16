#!/bin/bash
# deploy.sh — Manual redeploy on VPS (the GitHub Actions pipeline does this automatically).
# Run this if you need to redeploy without pushing a tag, e.g. after editing .env.
#
# Usage: ./deploy.sh
# Prerequisites: docker + docker compose installed, run from /opt/tracker on VPS.

set -euo pipefail

echo "==> Pulling latest image from Docker Hub..."
docker compose pull

echo "==> Restarting container..."
docker compose up -d --force-recreate

echo "==> Pruning old images..."
docker image prune -f

echo "==> Checking health..."
sleep 10
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time 10 \
  -u "${BASIC_AUTH_USER}:${BASIC_AUTH_PASS}" \
  http://localhost:3001/api/health 2>&1) || STATUS="error"

if [ "$STATUS" = "200" ]; then
  echo "✅ App is healthy (HTTP 200)"
else
  echo "⚠️  Health check returned: $STATUS — check logs with: docker compose logs -f"
fi
