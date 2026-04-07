#!/usr/bin/env bash
set -euo pipefail

# One-shot deploy script for Cloudflare Pages.
# Usage: export CLOUDFLARE_API_TOKEN=your_token && ./scripts/deploy_pages.sh

PROJECT_NAME=linkedin-sniper
BUILD_DIR=frontend/build

if [ ! -d "$BUILD_DIR" ]; then
  echo "Build directory $BUILD_DIR not found. Run 'npm run build' in frontend first." >&2
  exit 2
fi

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "Please set CLOUDFLARE_API_TOKEN environment variable." >&2
  exit 3
fi

echo "Deploying $BUILD_DIR to Cloudflare Pages project $PROJECT_NAME"
npx --yes wrangler@3 pages deploy "$BUILD_DIR" --project-name "$PROJECT_NAME" --branch main --commit-message "deploy from local script"

echo "Deploy command finished. Check Cloudflare dashboard for status." 
