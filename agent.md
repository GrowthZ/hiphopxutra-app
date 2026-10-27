# Agent Guide — HIPHOP XỨ TRÀ 2026

Operating system for a U16 Breaking tournament: 9-judge scoring, Prelims Top 32,
random 2vs2 team draw, battle bracket, and the LED stage display.

Read `rules.md` before changing code. Project skills live in `.claude/skills/`.
Product design (roles, user stories, URLs, LED control hooks): `docs/user-stories.md`.

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
  App.tsx                    renders the view for activeView; gates /admin/* behind AdminLoginGate
  routes.ts                  view <-> URL path map, legacy #hash redirects
  context/TournamentContext  single source of truth for all tournament state
  context/tournamentModel.ts ranking, vote counting, state <-> Firestore document mapping
  hooks/useSyncedCollection  mirrors a state array to events/{EVENT_ID}/{collection} (realtime, diffed writes)
  components/                one file per view or modal (*View.tsx, *Modal.tsx)
  services/                  firebase, firestore, googleSheets, storageService, soundEffects
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

## Data & sync

- Firestore tree `events/hiphopxutra-2026/`: `newbieDancers`, `proDancers`, `teams`, `matches`, `judges`,
  `meta/current` (activeMatchId, Top 32 locks), `votes/{matchId}`, `admins/{email}`. Rules: `firestore.rules`.
- Admin clients write through `useSyncedCollection` (only changed fields). Judges never write those collections:
  scores go through `writePrelimScore` (one field), battle votes through `writeBattleVote` (`votes` doc).
- Judges: Firebase email/password accounts `gk-N@giamkhao.hiphopxutra.vn`, PIN = password
  (`src/services/judgeAccounts.ts`; admins manage them at `/admin/cai-dat/giam-khao` through a secondary in-memory
  Auth instance). `firestore.rules` derives the judge id from that email, so keep the format in sync.
  PINs live in admin-only `judgeSecrets`; `judgeSessions` enforces one device per judge; `judgePresence` = heartbeat.
- Teams/matches store dancer **ids**, not copies; `hydrateMatch`/`hydrateTeam` rebuild full objects for the UI.
- `BroadcastChannel` now carries only same-machine audio/animation cues, never data.
- LED: `/admin/led` (`StageControlView`, `useStageController`) writes `screens/san-khau-chinh` (scene, theme,
  blackout); `/led` (`LedScreen`, `useStageState`) renders it in kiosk mode (`.kiosk` hides buttons, blocks clicks)
  and heartbeats `presence/san-khau-chinh`. Effects (entrance, round reveal, victory) ride on match data, not screens.
  `/led?preview=1` is the admin preview iframe: no heartbeat, no sound, no writes.
- Public pages (`/ket-qua/*`, `/led`, `IS_PUBLIC_SOURCE` in `routes.ts`) read only `publicDancers` (prelim scores
  once all 4 prelim judges scored or Top 32 is locked) and `publicVotes` (sides masked as `hidden` until the round is
  revealed/confirmed) plus the public-safe `teams`, `matches`, `judges`, `meta`. Any admin client on an admin page
  derives and writes these (`toPublicDancer`, `toPublicVotes`); rules keep raw dancers/votes to admins + judges.
  Moving between public and private pages reloads the page so the data source never mixes.
- URLs: see `src/routes.ts` and the table in `HUONG-DAN-CHAY.md`.

## How to work here

1. Find the relevant view in `src/components/` and the state it reads in `TournamentContext`.
2. New shared types go in `src/types/tournament.ts`; don't redeclare them locally.
3. UI work: load the `tailwind` and `ui-ux` skills.
4. Run `bash scripts/check.sh` before saying a change is done.
