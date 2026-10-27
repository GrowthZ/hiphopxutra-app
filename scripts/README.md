# scripts/

Dev and maintenance scripts. Run from the repo root with Git Bash.

| Script | Purpose |
|---|---|
| `db.ts` | Firestore admin tool: admins, stats, backup/restore, reset (`bun run db`, see docs/firebase-setup.md). Prod by default, `--emulator` for local; prod writes ask for confirmation. |
| `emulators.ts` | Starts the Auth + Firestore emulators with Java 21 (`bun run emulators`, `bun run test:e2e`). |
| `check.sh` | Type check (`tsc --noEmit`), unit tests (`bun test`) and production build. Run before every commit. |

Add new scripts here with a one-line entry in the table. Scripts must be idempotent and
must not touch production data without an explicit flag.
