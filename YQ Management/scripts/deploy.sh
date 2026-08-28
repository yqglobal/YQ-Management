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
TOKEN=${1:-$GITHUB_TOKEN}
ACTOR=${2:-$GITHUB_ACTOR}

if [ -n "$TOKEN" ] && [ -n "$ACTOR" ]; then
    echo "====> Authenticating with GHCR..."
    echo "$TOKEN" | docker login ghcr.io -u "$ACTOR" --password-stdin
fi
# Pull the pre-built GHCR images
docker compose -f docker-compose.production.yml pull

echo "====> Running Safe Database Migrations..."
# Run migrations safely using a temporary container to prevent downtime crashes
docker exec yq-postgres psql -U postgres -d yq_queue -c "DELETE FROM _prisma_migrations WHERE finished_at IS NULL;" || true
docker compose -f docker-compose.production.yml run --rm backend npx prisma migrate deploy

echo "====> Starting new containers..."
# Recreate only the containers that have changed images or configs
docker compose -f docker-compose.production.yml up -d --remove-orphans

# Clean up dangling images to save disk space
docker image prune -f

echo "====> Deployment Complete!"
