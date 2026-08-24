#!/bin/bash
# Server-side deploy script called by GitHub Actions
# Location: scripts/deploy.sh

set -e

APP_DIR="/var/www/yq"
cd $APP_DIR

echo "====> Pulling latest code..."
git pull origin main

echo "====> Validating .env file..."
if [ ! -f .env ]; then
    echo "ERROR: .env file missing in $APP_DIR! Deployment aborted."
    exit 1
fi

echo "====> Rebuilding Docker Containers..."
# Build without bringing down the system yet
docker compose -f docker-compose.production.yml build

echo "====> Running Safe Database Migrations..."
# Run migrations safely using a temporary container to prevent downtime crashes
docker compose -f docker-compose.production.yml run --rm backend npx prisma migrate deploy

echo "====> Starting new containers..."
# Recreate only the containers that have changed images or configs
docker compose -f docker-compose.production.yml up -d --remove-orphans

# Clean up dangling images to save disk space
docker image prune -f

echo "====> Deployment Complete!"
