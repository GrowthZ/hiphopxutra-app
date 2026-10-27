#!/usr/bin/env bash
# Pre-commit check: type check, unit tests, production build.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Type check"
bun run lint

echo "==> Unit tests"
bun run test

echo "==> Build"
bun run build

echo "All checks passed."
