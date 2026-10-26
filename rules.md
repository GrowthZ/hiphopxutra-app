# Project Rules

Hard rules for anyone (human or agent) changing this codebase.

## Code

- TypeScript everywhere; no `any` in new code. Domain types come from `src/types/tournament.ts`.
- Tournament state lives in `TournamentContext`. Components read it with `useTournament()`;
  don't fork state into local copies that can drift.
- Services (`src/services/*`) hold all I/O (Firebase, Sheets, storage, audio). Components never
  call `fetch` or SDKs directly.
- Keep components focused: one view or modal per file. Split a file once it grows past ~600 lines
  by extracting sub-components next to it.
- Icons from `lucide-react` only. Animations with `motion` (or the keyframes already in `src/index.css`).
- Do not edit `vite.config.ts` HMR/watch settings — AI Studio depends on them.

## Styling

- Tailwind utility classes only; no new CSS files or inline `style` except for dynamic values
  (e.g. computed widths, image URLs).
- Global CSS changes go in `src/index.css` and must be reusable (fonts, keyframes, utilities).
- Follow the `tailwind` and `ui-ux` skills in `.claude/skills/`.

## Data & scoring

- Scores, timers, and rankings use `tabular-nums`. Never round scores for storage — only for display.
- Any change to scoring, ranking or bracket progression needs a manual walkthrough with mock data
  (`src/data/mockData.ts`) covering ties and a full bracket to the final.
- Never commit real dancer personal data or photos of minors outside `public/assets/` placeholders.

## Secrets

- Keys live in `.env` (gitignored). Only `.env.example` is committed, with placeholder values.
- `firebase-applet-config.json` holds public client config only — never service-account keys.

## UI copy

- User-facing text is Vietnamese (with correct diacritics). Code, comments and identifiers are English.

## Git

- Small commits with conventional prefixes: `feat:`, `fix:`, `refactor:`, `style:`, `chore:`, `docs:`.
- `bash scripts/check.sh` must pass before commit.
