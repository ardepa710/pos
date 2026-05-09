#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# tag-stable.sh  — Promote the current :latest to :stable
#
# Run this after you've tested a deploy and want to mark it
# as the known-good version.
#
# Usage:
#   ./scripts/tag-stable.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

REGISTRY="ghcr.io"
GITHUB_USER="ardepa710"
REPO="pos"

BACKEND_IMAGE="$REGISTRY/$GITHUB_USER/$REPO-backend"
FRONTEND_IMAGE="$REGISTRY/$GITHUB_USER/$REPO-frontend"

GITHUB_TOKEN=$(grep "^GITHUB_TOKEN=" "$(dirname "$0")/../.env" | cut -d= -f2-)
if [[ -z "$GITHUB_TOKEN" ]]; then
  echo "✗ GITHUB_TOKEN not found in .env"
  exit 1
fi

echo "$GITHUB_TOKEN" | docker login "$REGISTRY" -u "$GITHUB_USER" --password-stdin

echo "▶ Pulling :latest to get current digest..."
docker pull "$BACKEND_IMAGE:latest"
docker pull "$FRONTEND_IMAGE:latest"

echo "▶ Tagging :latest → :stable..."
docker tag "$BACKEND_IMAGE:latest"  "$BACKEND_IMAGE:stable"
docker tag "$FRONTEND_IMAGE:latest" "$FRONTEND_IMAGE:stable"

docker push "$BACKEND_IMAGE:stable"
docker push "$FRONTEND_IMAGE:stable"

SHA=$(docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$BACKEND_IMAGE:stable" 2>/dev/null || echo "unknown")
echo ""
echo "  ✓ :stable now points to the same image as :latest"
echo "  To deploy stable on VPS:  TAG=stable docker compose -f docker-compose.prod.yml up -d"
