#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Stopping dev servers on ports 3000 and 4000..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "tsx watch" 2>/dev/null || true
lsof -ti :3000 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti :4000 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

echo "==> Ensuring env files..."
[ -f apps/api/.env ] || cp apps/api/.env.example apps/api/.env
[ -f apps/web/.env.local ] || cp apps/web/.env.example apps/web/.env.local

echo "==> Building all packages..."
npm run build

echo "==> Starting production API..."
PORT=4000 FRONTEND_URL=http://localhost:3000 node apps/api/dist/index.js &
API_PID=$!
trap 'kill $API_PID 2>/dev/null || true' EXIT

for i in {1..20}; do
  if curl -sf http://localhost:4000/health >/dev/null; then
    break
  fi
  sleep 0.5
done

echo "==> API health:"
curl -sf http://localhost:4000/health
echo

echo "==> Starting production web..."
(cd apps/web && API_URL=http://localhost:4000 npm run start) &
WEB_PID=$!
trap 'kill $API_PID $WEB_PID 2>/dev/null || true' EXIT

for i in {1..30}; do
  if curl -sf http://localhost:3000 >/dev/null; then
    break
  fi
  sleep 0.5
done

echo "==> Web homepage:"
curl -sf -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000

echo "==> Building Docker image..."
npm run docker:build

echo
echo "All local checks passed."
echo "  API:  http://localhost:4000/health"
echo "  Web:  http://localhost:3000"
echo
echo "Push to Docker Hub when ready:"
echo "  npm run docker:push"
