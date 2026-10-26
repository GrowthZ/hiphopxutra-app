# Agent Guide — HIPHOP XỨ TRÀ 2026

Operating system for a U16 Breaking tournament: 9-judge scoring, Prelims Top 32,
random 2vs2 team draw, battle bracket, and the LED stage display.

Read `rules.md` before changing code. Project skills live in `.claude/skills/`.

## Stack

- React 19 + TypeScript, Vite 8 (`@tailwindcss/vite`), Tailwind CSS v4
- `motion` for animation, `lucide-react` for icons, `canvas-confetti` for victory effects
- Firebase (`src/services/firebase.ts`), Google Sheets sync, pluggable photo storage (R2 / Drive / local)
- Package manager: **bun** (`bun.lock`). Originally scaffolded in Google AI Studio.

## Commands

| Task | Command |
|---|---|
| Install | `bun install` |
| Dev server (port 3000) | `bun run dev` |
| Type check | `bun run lint` |
| Production build | `bun run build` |
| Full pre-commit check | `bash scripts/check.sh` |

## Layout

```
src/
  App.tsx                    view router (switches on activeView)
  context/TournamentContext  single source of truth for all tournament state
  components/                one file per view or modal (*View.tsx, *Modal.tsx)
  services/                  firebase, googleSheets, storageService, soundEffects
  types/tournament.ts        all shared domain types
  data/mockData.ts           seed dancers/judges for local dev
  utils/placeholderAssets.ts fallback avatars and team images
scripts/                     dev/maintenance scripts (see scripts/README.md)
```

## Domain glossary

- **Category**: `newbie_1v1` or `pro_2v2`.
- **Prelim**: qualifying round; judges score each dancer, top 32 advance.
- **Team draw**: random 2vs2 pairing of qualified dancers (`TeamDrawView`).
- **Round stages**: `top32 → top16 → top8 → top4 → final`.
- **Views** (`ActiveViewType`): `prelim`, `prelim_results`, `prelim_guest`, `teams`,
  `bracket`, `battle`, `stage`, `judge`, `dancers`, `sheets`, `storage`.
- **Stage display**: full-screen LED output for the venue — read from a distance, no admin chrome.
- **Judge portal**: used by judges on phones/tablets during live battles.

## How to work here

1. Find the relevant view in `src/components/` and the state it reads in `TournamentContext`.
2. New shared types go in `src/types/tournament.ts`; don't redeclare them locally.
3. UI work: load the `tailwind` and `ui-ux` skills.
4. Run `bash scripts/check.sh` before saying a change is done.
