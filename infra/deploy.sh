#!/usr/bin/env bash
# Simple deploy: rsync repo to the VPS and run docker compose.
# Usage: HOST=root@1.2.3.4 ./infra/deploy.sh

set -euo pipefail

HOST="${HOST:?set HOST=user@ip}"
REMOTE_DIR="${REMOTE_DIR:-/opt/shoda}"

echo ">> syncing to $HOST:$REMOTE_DIR"
rsync -avz --delete \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude "__pycache__" \
  --exclude ".venv" \
  --exclude "dist" \
  ./ "$HOST:$REMOTE_DIR/"

echo ">> docker compose up --build -d"
ssh "$HOST" "cd $REMOTE_DIR && cp -n .env.example .env || true && docker compose up --build -d"

echo ">> done"
