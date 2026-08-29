#!/bin/bash
# Server-side deploy script called by GitHub Actions
# Location: scripts/deploy.sh

set -e

GIT_DIR="/var/www/yq"
APP_DIR="/var/www/yq/YQ Management"

echo "====> Pulling latest code..."
cd "$GIT_DIR"
git pull origin main

cd "$APP_DIR"

echo "====> Validating .env file..."
if [ ! -f .env ]; then
    echo "ERROR: .env file missing in $APP_DIR! Deployment aborted."
    exit 1
fi

echo "====> Pulling New Docker Images..."
# Read GHCR credentials from a file stored directly on the VPS.
# This avoids GitHub Actions secret-masking issues with ephemeral GITHUB_TOKEN.
# To update credentials: echo 'TOKEN' > /root/.ghcr_token && echo 'USERNAME' > /root/.ghcr_user
GHCR_TOKEN_FILE="/root/.ghcr_token"
GHCR_USER_FILE="/root/.ghcr_user"

if [ -f "$GHCR_TOKEN_FILE" ] && [ -f "$GHCR_USER_FILE" ]; then
    echo "====> Authenticating with GHCR (from stored credentials)..."
    cat "$GHCR_TOKEN_FILE" | docker login ghcr.io -u "$(cat $GHCR_USER_FILE)" --password-stdin
else
    echo "WARNING: GHCR credentials not found at $GHCR_TOKEN_FILE / $GHCR_USER_FILE"
    echo "Run: echo 'YOUR_PAT' > /root/.ghcr_token && echo 'yqglobal' > /root/.ghcr_user"
fi
# Pull the pre-built GHCR images
docker compose -f docker-compose.production.yml pull

echo "====> Running Safe Database Migrations..."
# Run migrations safely using a temporary container to prevent downtime crashes
docker exec yq-postgres psql -U postgres -d yq_queue -c "DELETE FROM _prisma_migrations WHERE finished_at IS NULL;" || true
docker compose -f docker-compose.production.yml run --rm backend npx prisma migrate deploy

echo "====> Starting new containers..."
# Recreate only the containers that have changed images or configs
docker compose -f docker-compose.production.yml up -d --remove-orphans --wait

# Clean up dangling images to save disk space
docker image prune -f

echo "====> Deployment Complete!"
