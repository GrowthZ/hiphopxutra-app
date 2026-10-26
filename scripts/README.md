# scripts/

Dev and maintenance scripts. Run from the repo root with Git Bash.

| Script | Purpose |
|---|---|
| `check.sh` | Type check (`tsc --noEmit`) and production build. Run before every commit. |

Add new scripts here with a one-line entry in the table. Scripts must be idempotent and
must not touch production data without an explicit flag.
