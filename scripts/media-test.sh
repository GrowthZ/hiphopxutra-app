#!/usr/bin/env bash
# Photo upload end to end, locally: Firebase emulators + the media Worker on `wrangler dev` (local R2 in
# worker/.wrangler, nothing touches Cloudflare) + the app. Run from the repo root: `bun run test:media`.
set -euo pipefail
PORT=8787

cd worker
npx -y wrangler@4 dev --local --port "$PORT" \
  --var FIREBASE_PROJECT_ID:demo-hiphopxutra --var FIRESTORE_URL:http://127.0.0.1:8080 >/dev/null 2>&1 &
WORKER=$!
trap 'kill $WORKER 2>/dev/null || true' EXIT
cd ..

for _ in $(seq 60); do curl -s -o /dev/null "http://localhost:$PORT/" && break; sleep 1; done

VITE_MEDIA_URL="http://localhost:$PORT" bunx playwright test e2e/media.spec.ts
