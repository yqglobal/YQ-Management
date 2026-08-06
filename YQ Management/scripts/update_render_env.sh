#!/usr/bin/env bash
set -euo pipefail

if [ -z "${RENDER_TOKEN:-}" ] || [ -z "${RENDER_SERVICE_ID:-}" ]; then
  echo "Usage: RENDER_TOKEN=... RENDER_SERVICE_ID=... ./scripts/update_render_env.sh"
  exit 1
fi

# This script reads update_render_env.example.js to build env payload.
# It does not store tokens in the repo.

SERVICE_ID="$RENDER_SERVICE_ID"
TOKEN="$RENDER_TOKEN"

# Build payload from example file (simple approach: edit as needed)
PAYLOAD=$(node -e "const e=require('../update_render_env.example.js'); console.log(JSON.stringify(typeof currentEnv !== 'undefined' ? currentEnv : []))" 2>/dev/null)

if [ -z "$PAYLOAD" ] || [ "$PAYLOAD" = "[]" ]; then
  echo "Failed to read payload from update_render_env.example.js. Edit the file with desired keys first." >&2
  exit 1
fi

curl -sS -X PUT "https://api.render.com/v1/services/$SERVICE_ID/env-vars" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  | jq '.'
