import type { DocumentData } from 'firebase/firestore';
import { BattleMatch, BattleRound, BattleSide, Dancer, Judge, RoundStage, Team2v2 } from './types';

// Pure domain helpers + the mapping between React state and Firestore documents.
// Teams and matches store dancer ids only (photos live once, on the dancer doc, keeping docs under 1MB);
// battle votes live in their own `votes` collection so judges never write match documents.

export const PRELIM_JUDGE_IDS = ['gk-1', 'gk-2', 'gk-3', 'gk-4'];

export type Votes = Record<string, Record<string, 'red' | 'blue' | 'hidden'>>; // `r{round}` -> judgeId -> side
export interface MatchVotes {
  id: string; // matchId
  rounds: Votes;
}

// Recalculate dancer ranks and scores (Strictly 4 Prelim Judges, Max 400 points)
export function recalculateDancers(list: Dancer[]): Dancer[] {
  const updated = list.map((d) => {
    const total = PRELIM_JUDGE_IDS.reduce((acc, jId) => acc + (d.prelimScores?.[jId] ?? 0), 0);
    return {
      ...d,
      prelimScores: d.prelimScores ?? {},
      prelimScoreTotal: Math.min(400, Math.round(total)),
      prelimScoreAvg: Math.round(total / PRELIM_JUDGE_IDS.length),
    };
  });

  // Sort descending by total score, secondary sort by SBD
  updated.sort((a, b) => b.prelimScoreTotal - a.prelimScoreTotal || a.sbd.localeCompare(b.sbd));

  return updated.map((d, idx) => ({ ...d, prelimRank: idx + 1, isQualifiedTop32: idx < 32 }));
}

const stubDancer = (id: string): Dancer => ({
  id,
  sbd: '',
  name: '',
  gender: 'male',
  category: 'newbie_1v1',
  prelimScores: {},
  prelimScoreTotal: 0,
  prelimScoreAvg: 0,
});

// ---------- Dancers: derived ranking fields are computed, not stored ----------
export function dancerToDoc(d: Dancer): DocumentData {
  const { prelimScoreTotal: _t, prelimScoreAvg: _a, prelimRank: _r, isQualifiedTop32: _q, ...stored } = d;
  return stored;
}

// ---------- Teams ----------
export function teamToDoc({ dancer1, dancer2, ...rest }: Team2v2): DocumentData {
  return { ...rest, dancer1Id: dancer1.id, dancer2Id: dancer2.id };
}

export function teamFromDoc(id: string, data: DocumentData): Team2v2 {
  const { dancer1Id, dancer2Id, ...rest } = data;
  return { ...rest, id, dancer1: stubDancer(dancer1Id), dancer2: stubDancer(dancer2Id) } as Team2v2;
}

export const sortTeams = (teams: Team2v2[]) => [...teams].sort((a, b) => a.teamNumber - b.teamNumber);

// ---------- Matches ----------
const sideToDoc = ({ dancers, teamPhotoUrl: _photo, ...rest }: BattleSide): DocumentData => ({
  ...rest,
  dancerIds: dancers.map((d) => d.id),
});

const sideFromDoc = ({ dancerIds = [], ...rest }: DocumentData): BattleSide =>
  ({ ...rest, dancers: (dancerIds as string[]).map(stubDancer) }) as BattleSide;

const roundToDoc = ({ votes: _v, redVotesCount: _r, blueVotesCount: _b, ...rest }: BattleRound): DocumentData => rest;

export function matchToDoc(m: BattleMatch): DocumentData {
  return {
    ...m,
    sideRed: sideToDoc(m.sideRed),
    sideBlue: sideToDoc(m.sideBlue),
    rounds: m.rounds.map(roundToDoc),
  };
}

export function matchFromDoc(id: string, data: DocumentData): BattleMatch {
  return {
    ...data,
    id,
    sideRed: sideFromDoc(data.sideRed),
    sideBlue: sideFromDoc(data.sideBlue),
    rounds: (data.rounds as DocumentData[]).map((r) => ({ ...r, votes: {}, redVotesCount: 0, blueVotesCount: 0 })),
  } as BattleMatch;
}

const STAGE_ORDER: RoundStage[] = ['top32', 'top16', 'top8', 'top4', 'final'];

export const sortMatches = (matches: BattleMatch[]) =>
  [...matches].sort(
    (a, b) =>
      a.category.localeCompare(b.category) ||
      STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage) ||
      a.matchNumber - b.matchNumber
  );

/** Votes doc is the source of truth for every round's votes and counts. */
export function applyVotes(m: BattleMatch, votes: Votes | undefined): BattleMatch {
  const rounds = m.rounds.map((r) => {
    const roundVotes = votes?.[`r${r.roundNumber}`] ?? {};
    const sides = Object.values(roundVotes);
    return {
      ...r,
      votes: roundVotes,
      redVotesCount: sides.filter((s) => s === 'red').length,
      blueVotesCount: sides.filter((s) => s === 'blue').length,
    };
  });
  const hasVotes = rounds.some((r) => Object.keys(r.votes).length > 0);
  return { ...m, rounds, status: m.status === 'upcoming' && hasVotes ? 'ongoing' : m.status };
}

/** Replace dancer stubs with the live dancer (photos, scores) and pull the team photo from the team. */
export function hydrateMatch(m: BattleMatch, dancersById: Map<string, Dancer>, teamsById: Map<string, Team2v2>): BattleMatch {
  const hydrateSide = (side: BattleSide): BattleSide => ({
    ...side,
    dancers: side.dancers.map((d) => dancersById.get(d.id) ?? d),
    teamPhotoUrl: teamsById.get(side.id)?.teamPhotoUrl ?? side.teamPhotoUrl,
  });
  return { ...m, sideRed: hydrateSide(m.sideRed), sideBlue: hydrateSide(m.sideBlue) };
}

export const hydrateTeam = (t: Team2v2, dancersById: Map<string, Dancer>): Team2v2 => ({
  ...t,
  dancer1: dancersById.get(t.dancer1.id) ?? t.dancer1,
  dancer2: dancersById.get(t.dancer2.id) ?? t.dancer2,
});

export const matchVotesFromDoc = (id: string, data: DocumentData): MatchVotes => ({ id, rounds: data as Votes });
export const matchVotesToDoc = (v: MatchVotes): DocumentData => v.rounds;

// ---------- Published copies for guests and the LED (KG-06) ----------
// An admin client derives these from the private collections; rules keep the private ones unreadable to guests.

/**
 * A dancer's prelim scores go public once all prelim judges have scored, or when the category is locked.
 * Real name and age of the (under-16) dancers stay private.
 */
export function toPublicDancer(d: Dancer, categoryLocked: boolean): DocumentData {
  const { realName: _name, ...stored } = dancerToDoc(d);
  const complete = PRELIM_JUDGE_IDS.every((j) => typeof d.prelimScores?.[j] === 'number');
  return { ...stored, prelimScores: complete || categoryLocked ? d.prelimScores : {} };
}

/** What one judge has scored and voted: lets a judge see their own ballots, never the others' (GK-09). */
export interface JudgeBallot {
  id: string; // judgeId
  prelim: Record<string, number>; // dancerId -> score
  votes: Record<string, Record<string, 'red' | 'blue'>>; // matchId -> `r{round}` -> side
}

export function toJudgeBallot(judgeId: string, dancers: Dancer[], votes: Record<string, Votes>): JudgeBallot {
  const prelim: Record<string, number> = {};
  for (const d of dancers) {
    const score = d.prelimScores?.[judgeId];
    if (typeof score === 'number') prelim[d.id] = score;
  }
  const own: JudgeBallot['votes'] = {};
  for (const [matchId, rounds] of Object.entries(votes)) {
    for (const [key, roundVotes] of Object.entries(rounds)) {
      const side = roundVotes[judgeId];
      if (side === 'red' || side === 'blue') (own[matchId] ??= {})[key] = side;
    }
  }
  return { id: judgeId, prelim, votes: own };
}

/** A round's sides go public once the admin reveals or confirms it; before that only "has voted" shows. */
export function toPublicVotes(m: BattleMatch, votes: Votes): MatchVotes {
  const rounds = Object.fromEntries(
    Object.entries(votes).map(([key, roundVotes]) => {
      const round = m.rounds.find((r) => `r${r.roundNumber}` === key);
      const open = round?.isConfirmed || round?.isRevealed;
      return [key, open ? roundVotes : Object.fromEntries(Object.keys(roundVotes).map((j) => [j, 'hidden' as const]))];
    })
  );
  return { id: m.id, rounds };
}

/** Friendly id for /ket-qua/tran/{slug}, e.g. `pro-top8-02`. */
export const matchSlug = (m: BattleMatch) =>
  `${m.category === 'pro_2v2' ? 'pro' : 'newbie'}-${m.stage}-${String(m.matchNumber).padStart(2, '0')}`;

// ---------- Judges ----------
export const sortJudges = (judges: Judge[]) =>
  [...judges].sort((a, b) => Number(a.id.split('-')[1]) - Number(b.id.split('-')[1]));

/** Sides of a round may be shown: revealed/confirmed, and (on public pages) the published votes have arrived. */
export const isRoundOpen = (r: BattleRound) =>
  Boolean(r.isRevealed || r.isConfirmed) && !Object.values(r.votes).includes('hidden');
