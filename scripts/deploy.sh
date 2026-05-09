#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# deploy.sh  — Build images locally, push to ghcr.io, deploy to VPS
#
# Usage:
#   ./scripts/deploy.sh            # push latest + SHA tag, deploy to VPS
#   ./scripts/deploy.sh --no-push  # build + tag locally only (skip push + VPS)
#   ./scripts/deploy.sh --no-ssh   # push to registry only (skip VPS deploy)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config ────────────────────────────────────────────────────
REGISTRY="ghcr.io"
GITHUB_USER="ardepa710"
REPO="pos"

VPS_HOST="62.72.26.125"
VPS_USER="root"                        # change if different
VPS_PATH="/opt/pos"                    # path on VPS where .env + docker-compose.prod.yml live

BACKEND_IMAGE="$REGISTRY/$GITHUB_USER/$REPO-backend"
FRONTEND_IMAGE="$REGISTRY/$GITHUB_USER/$REPO-frontend"

# ── Flags ─────────────────────────────────────────────────────
PUSH=true
SSH_DEPLOY=true
for arg in "$@"; do
  [[ "$arg" == "--no-push" ]] && PUSH=false && SSH_DEPLOY=false
  [[ "$arg" == "--no-ssh"  ]] && SSH_DEPLOY=false
done

# ── Derive SHA tag from git ───────────────────────────────────
SHA=$(git rev-parse --short HEAD)
BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  POS Deploy                                  ║"
echo "╚══════════════════════════════════════════════╝"
echo "  SHA    : $SHA"
echo "  Branch : $BRANCH"
echo "  Push   : $PUSH"
echo "  VPS    : $([[ $SSH_DEPLOY == true ]] && echo "$VPS_USER@$VPS_HOST:$VPS_PATH" || echo 'skip')"
echo ""

# ── Step 1 — Build ────────────────────────────────────────────
echo "▶ Building images..."
BUILD_SHA=$SHA docker compose build --no-cache 2>&1 | grep -E "^(#|DONE|ERROR| => |Step)" || true
echo "  ✓ Build complete"

# ── Step 2 — Tag ──────────────────────────────────────────────
echo "▶ Tagging..."
# Backend: local name is 'pos-backend' (from compose project name + service)
docker tag pos-backend "$BACKEND_IMAGE:$SHA"
docker tag pos-backend "$BACKEND_IMAGE:latest"

# Frontend
docker tag pos-frontend "$FRONTEND_IMAGE:$SHA"
docker tag pos-frontend "$FRONTEND_IMAGE:latest"

echo "  ✓ Tagged as :$SHA and :latest"

# ── Step 3 — Login + Push ─────────────────────────────────────
if [[ "$PUSH" == true ]]; then
  # Read token from .env in project root
  GITHUB_TOKEN=$(grep "^GITHUB_TOKEN=" "$(dirname "$0")/../.env" | cut -d= -f2-)
  if [[ -z "$GITHUB_TOKEN" ]]; then
    echo "✗ GITHUB_TOKEN not found in .env — add GITHUB_TOKEN=ghp_... to .env"
    exit 1
  fi

  echo "▶ Logging in to $REGISTRY..."
  echo "$GITHUB_TOKEN" | docker login "$REGISTRY" -u "$GITHUB_USER" --password-stdin
  echo "  ✓ Logged in"

  echo "▶ Pushing images..."
  docker push "$BACKEND_IMAGE:$SHA"
  docker push "$BACKEND_IMAGE:latest"
  docker push "$FRONTEND_IMAGE:$SHA"
  docker push "$FRONTEND_IMAGE:latest"
  echo "  ✓ Pushed $BACKEND_IMAGE:$SHA"
  echo "  ✓ Pushed $FRONTEND_IMAGE:$SHA"
fi

# ── Step 4 — Deploy to VPS ────────────────────────────────────
if [[ "$SSH_DEPLOY" == true ]]; then
  echo "▶ Deploying to VPS ($VPS_HOST)..."
  ssh "$VPS_USER@$VPS_HOST" bash <<EOF
set -e
cd $VPS_PATH

# Pull new images
TAG=$SHA docker compose -f docker-compose.prod.yml pull backend frontend

# Restart with new images (zero-downtime: db + proxy stay up)
TAG=$SHA docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend

# Verify
sleep 4
STATUS=\$(curl -s http://localhost/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['build'])" 2>/dev/null || echo "unreachable")
echo "  /health build: \$STATUS"
if [[ "\$STATUS" == "$SHA" ]]; then
  echo "  ✓ VPS running $SHA"
else
  echo "  ⚠ Expected $SHA, got \$STATUS — check logs: docker compose logs backend --tail=30"
fi
EOF
fi

# ── Done ──────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Deploy complete                             ║"
echo "╚══════════════════════════════════════════════╝"
echo "  Images  : $BACKEND_IMAGE:$SHA"
echo "           $FRONTEND_IMAGE:$SHA"
echo "  Verify  : curl https://tu-dominio/health"
echo ""
