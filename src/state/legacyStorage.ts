import { BattleMatch, Dancer, Judge, Team2v2 } from '../domain/types';
import { PRELIM_JUDGE_IDS } from '../domain/model';
import {
  DEFAULT_JUDGES,
  INITIAL_NEWBIE_DANCERS,
  INITIAL_PRO_DANCERS,
  INITIAL_PRO_TEAMS,
  buildInitialMatches,
} from '../domain/seed';

// Pre-Firestore builds kept the tournament in localStorage. It is read once, as the starting state an admin's
// first load migrates into Firestore; afterwards Firestore wins. Guests never see local or sample data.

const KEY = 'hiphop_xu_tra_tournament_v1';
const SUFFIXES = ['newbie', 'pro', 'locked_newbie', 'locked_pro', 'teams', 'matches', 'activeMatchId', 'judges_v2'];

function read<T>(suffix: string, parse: (raw: unknown) => T, fallback: T): T {
  try {
    const saved = localStorage.getItem(`${KEY}_${suffix}`);
    return saved ? parse(JSON.parse(saved)) : fallback;
  } catch {
    return fallback;
  }
}

/** Old saves may hold partial or out-of-range prelim scores: clamp them and recompute the totals. */
function sanitizeDancers(raw: unknown, fallback: Dancer[]): Dancer[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  return (raw as Dancer[]).map((d, idx) => {
    const fallbackDancer = fallback[idx] || fallback[0];
    const scores: Record<string, number> = {};
    PRELIM_JUDGE_IDS.forEach((jId) => {
      const val = d.prelimScores?.[jId];
      scores[jId] =
        typeof val === 'number' && !isNaN(val)
          ? Math.min(100, Math.max(50, Math.round(val)))
          : (fallbackDancer?.prelimScores?.[jId] ?? 80);
    });
    const total = PRELIM_JUDGE_IDS.reduce((acc, jId) => acc + (scores[jId] || 0), 0);
    return {
      ...d,
      prelimScores: scores,
      prelimScoreTotal: Math.min(400, Math.round(total)),
      prelimScoreAvg: Math.round(total / PRELIM_JUDGE_IDS.length),
    };
  });
}

/** Saved names/photos laid over the default judge list. */
function mergeJudges(raw: unknown): Judge[] {
  const saved = raw as Judge[];
  return DEFAULT_JUDGES.map((dj) => {
    const match = saved.find((pj) => pj.id === dj.id);
    return match
      ? {
          ...dj,
          name: match.name || dj.name,
          judgeName: match.judgeName || dj.judgeName,
          avatar: match.avatar || dj.avatar,
          fullPhotoUrl: match.fullPhotoUrl || dj.fullPhotoUrl,
        }
      : dj;
  });
}

export const legacy = {
  judges: () => read('judges_v2', mergeJudges, DEFAULT_JUDGES),
  newbieDancers: (isPublic: boolean) =>
    isPublic ? [] : read('newbie', (r) => sanitizeDancers(r, INITIAL_NEWBIE_DANCERS), INITIAL_NEWBIE_DANCERS),
  proDancers: (isPublic: boolean) =>
    isPublic ? [] : read('pro', (r) => sanitizeDancers(r, INITIAL_PRO_DANCERS), INITIAL_PRO_DANCERS),
  teams: (isPublic: boolean): Team2v2[] => (isPublic ? [] : read('teams', (r) => r as Team2v2[], INITIAL_PRO_TEAMS)),
  matches: (isPublic: boolean): BattleMatch[] =>
    isPublic ? [] : read('matches', (r) => r as BattleMatch[], buildInitialMatches()),
  locked: (category: 'newbie' | 'pro') => localStorage.getItem(`${KEY}_locked_${category}`) === 'true',
  activeMatchId: () => localStorage.getItem(`${KEY}_activeMatchId`) || 'match-pro_2v2-top16-1',
  clear: () => SUFFIXES.forEach((s) => localStorage.removeItem(`${KEY}_${s}`)),
};
