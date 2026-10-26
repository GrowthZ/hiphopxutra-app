#!/usr/bin/env bash
# Pre-commit check: type check + production build.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Type check"
bun run lint

echo "==> Build"
bun run build

echo "All checks passed."
