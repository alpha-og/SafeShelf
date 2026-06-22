#!/usr/bin/env bash
set -euo pipefail

#
# Deploy the backend to a Hugging Face Space.
#
# Reads HF_TOKEN and HF_SPACE_ID from the environment, falling back to
# sourcing them from the project root's .env.local.
#
# Usage:
#   ./scripts/deploy_hf.sh
#
# Required env vars (set in .env.local or exported):
#   HF_TOKEN      Hugging Face API token (write access)
#   HF_SPACE_ID   Space identifier, e.g. alpha0g/safe_shelf
#
# Optional env vars:
#   REPO_DIR      Local path to clone/pull the HF Space repo
#                 (default: /tmp/<space-id-with-hyphens>)
#

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source root .env.local if present (but don't override existing env vars)
if [ -f "$ROOT_DIR/.env.local" ]; then
    set -a
    source <(grep -v '^\s*#' "$ROOT_DIR/.env.local" | grep -v '^\s*$')
    set +a
fi

HF_TOKEN="${HF_TOKEN:-}"
HF_SPACE_ID="${HF_SPACE_ID:-}"

if [ -z "$HF_TOKEN" ]; then
    echo "Error: HF_TOKEN is not set."
    echo "Set it in $ROOT_DIR/.env.local or export it."
    exit 1
fi

if [ -z "$HF_SPACE_ID" ]; then
    echo "Error: HF_SPACE_ID is not set."
    echo "Set it in $ROOT_DIR/.env.local or export it."
    exit 1
fi

REPO_DIR="${REPO_DIR:-/tmp/$(echo "$HF_SPACE_ID" | tr '/' '-')}"

# Clone or pull the HF Space repo
if [ -d "$REPO_DIR" ]; then
    if [ -d "$REPO_DIR/.git" ]; then
        echo "==> Pulling $HF_SPACE_ID into $REPO_DIR ..."
        cd "$REPO_DIR"
        git pull
    else
        echo "==> Re-creating $REPO_DIR (leftover from failed run) ..."
        rm -rf "$REPO_DIR"
        git clone "https://user:${HF_TOKEN}@huggingface.co/spaces/${HF_SPACE_ID}" "$REPO_DIR"
    fi
else
    echo "==> Cloning $HF_SPACE_ID into $REPO_DIR ..."
    git clone "https://user:${HF_TOKEN}@huggingface.co/spaces/${HF_SPACE_ID}" "$REPO_DIR"
fi

# Files to exclude from sync
RSYNC_EXCLUDE=(
    --exclude='.git/'
    --exclude='.venv/'
    --exclude='__pycache__/'
    --exclude='*.py[cod]'
    --exclude='*.db'
    --exclude='chroma_db/'
    --exclude='.ruff_cache/'
    --exclude='.env'
    --exclude='.env.local'
    --exclude='README.md'
    --exclude='data/'
)

echo "==> Syncing backend/ to $REPO_DIR ..."
rsync -av --delete "${RSYNC_EXCLUDE[@]}" "$BACKEND_DIR/" "$REPO_DIR/"

# Generate README if missing
if [ ! -f "$REPO_DIR/README.md" ]; then
    echo "==> Creating HF Space README ..."
    cat > "$REPO_DIR/README.md" <<-'EOF'
---
title: SafeShelf Backend
sdk: docker
---

# SafeShelf Backend

FastAPI backend for the SafeShelf app.
EOF
fi

# Commit and push
echo "==> Committing and pushing to HF Space ..."
cd "$REPO_DIR"
SHORT_SHA="$(cd "$BACKEND_DIR" && git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
git config user.name "safeshelf-deploy"
git config user.email "deploy@safeshelf.app"
git add -A
if git diff --quiet --staged; then
    echo "    No changes to deploy."
    exit 0
fi
git commit -m "deploy: sync backend from ${SHORT_SHA}"
git push "https://user:${HF_TOKEN}@huggingface.co/spaces/${HF_SPACE_ID}" main

echo "==> Done! Build will start on HF Spaces."
echo "    URL: https://huggingface.co/spaces/${HF_SPACE_ID}"
