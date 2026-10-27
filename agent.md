# Agent Guide — HIPHOP XỨ TRÀ 2026

Operating system for a U16 Breaking tournament: 9-judge scoring, Prelims Top 32,
random 2vs2 team draw, battle bracket, and the LED stage display.

Read `rules.md` before changing code. Project skills live in `.claude/skills/`.
Product design (roles, user stories, URLs, LED control hooks): `docs/user-stories.md`.

## Stack

- React 19 + TypeScript, Vite 8 (`@tailwindcss/vite`), Tailwind CSS v4
- `motion` for animation, `lucide-react` for icons, `canvas-confetti` for victory effects
- Firebase (`src/services/firebase.ts`), Google Sheets sync, photos in Cloudflare R2 via the media Worker (`worker/`)
- Package manager: **bun** (`bun.lock`).

## Commands

| Task | Command |
|---|---|
| Install | `bun install` |
| Dev server (port 3000) | `bun run dev` |
| Type check | `bun run lint` |
| Unit tests (`src/**/*.test.ts`) | `bun run test` |
| Production build | `bun run build` |
| E2E on Firebase emulators (needs JDK 21) | `bun run test:e2e` |
| Firestore admin tool (prod; `--emulator` for local) | `bun run db` |
| Deploy hosting + rules / rules only | `bun run deploy` / `bun run deploy:rules` |
| Full pre-commit check | `bash scripts/check.sh` |

## Layout

Dependencies point down only: `features → state → services → domain`. `domain/` imports nothing from React or Firebase.

```
src/
  App.tsx                    renders the view for activeView; gates /admin/* behind AdminLoginGate
  app/routes.ts              view <-> URL path map, legacy #hash redirects
  domain/                    pure tournament logic (unit-tested with `bun test`)
    types.ts                 all shared domain types
    model.ts                 ranking, vote counting, hydration, state <-> Firestore document mapping, public copies
    battle.ts                round/match transitions (confirm, reveal, tie-break, reset) and bracket seeding
    seed.ts                  default judges, sample dancers/teams/matches
  services/                  all I/O: firebase (+ firebase.config.json), firestore, judgeAccounts, media (R2),
                             googleSheets, storageService, soundEffects, stageCues (sound/confetti/LED cues)
  state/
    TournamentContext.tsx    single source of truth; composes the hooks below and exposes useTournament()
    useSyncedCollection.ts   mirrors a state array to events/{EVENT_ID}/{collection} (realtime, diffed writes)
    useNavigation / useAuthSession / useSoundSettings / useGoogleSheets   slices of the context
    legacyStorage.ts         one-time read of pre-Firestore localStorage data
    useStage / useJudgePresence   LED screen state and judge heartbeats
  features/<area>/           one file per view or modal: admin, prelim, dancers, teams, battle, stage, judge,
                             guest, settings
  shared/placeholderAssets.ts fallback avatars and team images
e2e/                         Playwright specs, run against the emulators (project demo-hiphopxutra)
scripts/                     dev/maintenance scripts (see scripts/README.md)
worker/                      Cloudflare Worker in front of the R2 photo bucket (admin-only upload, cached public GET)
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
- `services/stageCues.ts` plays sound/confetti and sends LED animation cues; its `BroadcastChannel` only reaches
  tabs on the same machine and never carries data. Battle actions in the context call `domain/battle.ts` for the
  new match state and `stageCues` for the effects.
- LED: `/admin/led` (`StageControlView`, `useStageController`) writes `screens/san-khau-chinh` (scene, theme,
  blackout); `/led` (`LedScreen`, `useStageState`) renders it in kiosk mode (`.kiosk` hides buttons, blocks clicks)
  and heartbeats `presence/san-khau-chinh`. Effects (entrance, round reveal, victory) ride on match data, not screens.
  `/led?preview=1` is the admin preview iframe: no heartbeat, no sound, no writes.
- Public pages (`/ket-qua/*`, `/led`, `IS_PUBLIC_SOURCE` in `app/routes.ts`) read only `publicDancers` (prelim scores
  once all 4 prelim judges scored or Top 32 is locked; no real name or age) and `publicVotes` (sides masked as
  `hidden` until the round is revealed/confirmed) plus the public-safe `teams`, `matches`, `judges`, `meta`.
  Judges read the same copies plus their own `judgeBallots/{judgeId}` (GK-09), overlaid in `TournamentContext`.
  Any admin client on an admin page derives and writes all three (`toPublicDancer`, `toPublicVotes`,
  `toJudgeBallot`); rules keep raw dancers/votes admin-only.
  Moving between public and private pages reloads the page so the data source never mixes.
- Photos: never inside Firestore docs. `src/services/media.ts` resizes to WebP in the browser and PUTs to
  `VITE_MEDIA_URL/upload/{folder}/{name}-{sha256}.webp` with the admin's Firebase ID token; the Worker checks the
  `admins` doc with that token. Content-hashed names = immutable caching. Dancers upload one half-body photo; the
  avatar is a crop of it (`avatarCrop`, % of the photo, editable later). `MediaStoragePanel` migrates old base64 photos.
- Dev and prod share one Firestore database; `VITE_FIREBASE_EMULATORS=true` switches the app to the local
  emulators. Setup, service-account key, `bun run db` and the emulator workflow: `docs/firebase-setup.md`.
  Test every `firestore.rules` change on the emulators (`bun run test:e2e`) before `bun run deploy:rules`.
- URLs: see `src/app/routes.ts` and the table in `HUONG-DAN-CHAY.md`.

## How to work here

1. Find the relevant view in `src/features/<area>/` and the state it reads in `state/TournamentContext.tsx`.
   Rules of the game belong in `src/domain/` as pure functions with a test next to them.
2. New shared types go in `src/domain/types.ts`; don't redeclare them locally.
3. UI work: load the `tailwind` and `ui-ux` skills.
4. Run `bash scripts/check.sh` before saying a change is done.
