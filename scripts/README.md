# scripts/

Dev and maintenance scripts. Run from the repo root with Git Bash.

| Script | Purpose |
|---|---|
| `db.ts` | Firestore admin tool: admins, BTC logins (`staff:add`), stats, backup/restore, reset, rehearsal `seed` (`bun run db`, see docs/firebase-setup.md). Prod by default, `--dev` for the rehearsal event, `--emulator` for local; prod writes ask for confirmation. |
| `devSeed.ts` | Sample data for `bun run db seed <stage> --dev`, built with the app's domain functions (docs/dev-database.md). |
| `emulators.ts` | Starts the Auth + Firestore emulators with Java 21 (`bun run emulators`, `bun run test:e2e`). |
| `media-test.sh` | Tải ảnh thật qua media Worker chạy local (`wrangler dev`, R2 giả lập) + emulator (`bun run test:media`). |
| `check.sh` | Type check (`tsc --noEmit`), unit tests (`bun test`) and production build. Run before every commit. |

Add new scripts here with a one-line entry in the table. Scripts must be idempotent and
must not touch production data without an explicit flag.
