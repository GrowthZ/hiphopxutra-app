import { BattleMatch, BattleRound, BattleSide, CategoryType, Dancer, RoundStage, Team2v2 } from './types';
import { createInitialMatch } from './seed';

// Battle rules as pure functions: no React, no Firebase, no sound. TournamentContext applies the returned
// match to state and fires the stage cues (sound, confetti, LED effects) from the returned outcome.

export type Side = 'red' | 'blue';

/** 9 judges, so a round always has a winner; an even split goes to red. */
const roundWinner = (red: number, blue: number): Side => (red >= blue ? 'red' : 'blue');

export const sideName = (m: BattleMatch, side: Side) => (side === 'red' ? m.sideRed.name : m.sideBlue.name);

const blankRound = (roundNumber: number, isTieBreak = false): BattleRound => ({
  roundNumber,
  votes: {},
  redVotesCount: 0,
  blueVotesCount: 0,
  winner: null,
  isConfirmed: false,
  isRevealed: false,
  ...(isTieBreak && { isTieBreak: true }),
});

/** The regulation rounds of a match (1, 2 or 4 by stage), without the tie-break. */
export const regulationRounds = (m: Pick<BattleMatch, 'rounds'>) => m.rounds.filter((r) => !r.isTieBreak);

/** Level after the regulation rounds: add one tie-break round after them (once). */
const withTieBreak = (rounds: BattleRound[]) =>
  rounds.some((r) => r.isTieBreak) ? rounds : [...rounds, blankRound(rounds.length + 1, true)];

export interface RoundOutcome {
  match: BattleMatch;
  roundWinner: Side;
  matchWinner: Side | null;
}

/**
 * Confirm one round from its counted votes. The match goes on through every regulation round (no early finish);
 * after the last one, more round wins decide it, a level score adds the tie-break, which decides it.
 */
export function confirmRound(m: BattleMatch, roundNumber: number, now: number): RoundOutcome | null {
  const target = m.rounds.find((r) => r.roundNumber === roundNumber);
  if (!target) return null;

  const winner = roundWinner(target.redVotesCount, target.blueVotesCount);
  const winsRed = m.roundWinsRed + (winner === 'red' ? 1 : 0);
  const winsBlue = m.roundWinsBlue + (winner === 'blue' ? 1 : 0);
  let rounds = m.rounds.map((r) =>
    r.roundNumber === roundNumber ? { ...r, winner, isConfirmed: true, isRevealed: true } : r
  );

  let matchWinner: Side | null = null;
  let status = m.status;
  let totalRoundsRequired = m.totalRoundsRequired;
  let currentRound = roundNumber;

  const nextRegulation = rounds.find((r) => !r.isTieBreak && !r.isConfirmed);
  if (target.isTieBreak) {
    matchWinner = winner;
    status = 'finished';
  } else if (nextRegulation) {
    status = 'ongoing';
    currentRound = nextRegulation.roundNumber;
  } else if (winsRed === winsBlue) {
    rounds = withTieBreak(rounds);
    status = 'ongoing';
    totalRoundsRequired = rounds.length;
    currentRound = rounds.length;
  } else {
    matchWinner = winsRed > winsBlue ? 'red' : 'blue';
    status = 'finished';
  }

  return {
    roundWinner: winner,
    matchWinner,
    match: {
      ...m,
      rounds,
      totalRoundsRequired,
      roundWinsRed: winsRed,
      roundWinsBlue: winsBlue,
      winnerSide: matchWinner,
      status,
      currentRound,
      victoryTriggerTimestamp: matchWinner ? now : m.victoryTriggerTimestamp,
    },
  };
}

export interface RevealOutcome {
  match: BattleMatch;
  matchWinner: Side | null;
  tieBreak: boolean;
}

/** Reveal every round at once, recounting votes; a level score opens the tie-break. */
export function revealAllRounds(m: BattleMatch, now: number): RevealOutcome {
  let winsRed = 0;
  let winsBlue = 0;
  const counted = m.rounds.map((r) => {
    const sides = Object.values(r.votes);
    const red = sides.filter((v) => v === 'red').length;
    const blue = sides.filter((v) => v === 'blue').length;
    const winner = roundWinner(red, blue);
    if (winner === 'red') winsRed++;
    else winsBlue++;
    return { ...r, redVotesCount: red, blueVotesCount: blue, winner, isConfirmed: true, isRevealed: true };
  });

  const tieBreak = winsRed === winsBlue;
  const matchWinner: Side | null = tieBreak ? null : winsRed > winsBlue ? 'red' : 'blue';
  const rounds = tieBreak ? withTieBreak(counted) : counted;
  return {
    tieBreak,
    matchWinner,
    match: {
      ...m,
      rounds,
      roundWinsRed: winsRed,
      roundWinsBlue: winsBlue,
      totalRoundsRequired: tieBreak ? rounds.length : m.totalRoundsRequired,
      currentRound: tieBreak ? rounds.length : m.currentRound,
      winnerSide: matchWinner,
      status: tieBreak ? 'ongoing' : 'finished',
      victoryTriggerTimestamp: matchWinner ? now : m.victoryTriggerTimestamp,
    },
  };
}

/** Finish the match for `side` (operator override) and stamp the victory animation. */
export const declareWinner = (m: BattleMatch, side: Side, now: number): BattleMatch => ({
  ...m,
  winnerSide: side,
  status: 'finished',
  victoryTriggerTimestamp: now,
});

/** Side to celebrate when replaying the victory animation: the winner, else whoever leads. */
export const leadingSide = (m: BattleMatch): Side =>
  m.winnerSide || (m.roundWinsRed >= m.roundWinsBlue ? 'red' : 'blue');

export const advanceRound = (m: BattleMatch): BattleMatch =>
  m.currentRound < m.totalRoundsRequired ? { ...m, currentRound: m.currentRound + 1 } : m;

/** Operator-added extra round. */
export function addTieBreakRound(m: BattleMatch): BattleMatch {
  const next = m.rounds.length + 1;
  return {
    ...m,
    rounds: [...m.rounds, blankRound(next, true)],
    totalRoundsRequired: Math.max(m.totalRoundsRequired, next),
    currentRound: next,
    status: 'ongoing',
    winnerSide: null,
  };
}

/** Back to regulation rounds with no votes. */
export function resetMatch(m: BattleMatch): BattleMatch {
  const rounds = m.rounds
    .filter((r) => !r.isTieBreak)
    .map((r) => ({ ...r, votes: {}, redVotesCount: 0, blueVotesCount: 0, winner: null, isConfirmed: false, isRevealed: false }));
  return {
    ...m,
    currentRound: 1,
    roundWinsRed: 0,
    roundWinsBlue: 0,
    totalRoundsRequired: rounds.length,
    rounds,
    winnerSide: null,
    status: 'upcoming',
    forfeitSide: undefined,
  };
}

// ---------- Bracket progression ----------

const NEXT_STAGE: Record<RoundStage, RoundStage | null> = { top32: 'top16', top16: 'top8', top8: 'top4', top4: 'final', final: null };
const CATEGORIES: CategoryType[] = ['newbie_1v1', 'pro_2v2'];

/** No vote and no announced round yet: its sides can still change. */
const notStarted = (m: BattleMatch) =>
  m.status !== 'finished' && m.rounds.every((r) => !r.isConfirmed && Object.values(r.votes ?? {}).every((v) => !v));

const winnerOf = (m: BattleMatch): BattleSide => (m.winnerSide === 'blue' ? m.sideBlue : m.sideRed);

/**
 * Winners move on: once every battle of a stage has a winner, the next stage is drawn, winner of match 1 vs winner of
 * match 2 (red / blue), 3 vs 4, ... up to the final. A next-stage battle not started yet follows a changed result;
 * one already under way is left alone. Returns the same array when nothing changes.
 */
export function advanceBracket(matches: BattleMatch[]): BattleMatch[] {
  let out = matches;
  for (const category of CATEGORIES) {
    for (const [stage, next] of Object.entries(NEXT_STAGE) as [RoundStage, RoundStage | null][]) {
      if (!next) continue;
      const round = out.filter((m) => m.category === category && m.stage === stage).sort((a, b) => a.matchNumber - b.matchNumber);
      if (round.length < 2 || round.some((m) => m.status !== 'finished' || !m.winnerSide)) continue;
      for (let k = 0; k < Math.floor(round.length / 2); k++) {
        const [red, blue] = [winnerOf(round[2 * k]), winnerOf(round[2 * k + 1])];
        const drawn = { ...createInitialMatch(category, next, k + 1, red, blue), status: 'upcoming' as const };
        const existing = out.find((m) => m.id === drawn.id);
        if (!existing) out = [...out, drawn];
        else if (notStarted(existing) && (existing.sideRed.id !== red.id || existing.sideBlue.id !== blue.id)) {
          out = out.map((m) => (m.id === drawn.id ? { ...m, sideRed: red, sideBlue: blue } : m));
        }
      }
    }
  }
  return out;
}

// ---------- Bracket seeding ----------

/** Newbie Top 32: seed 1 vs 32, 2 vs 31, ... (16 matches). */
export const seedNewbieTop32 = (top32: Dancer[]): BattleMatch[] =>
  Array.from({ length: 16 }, (_, m) => {
    const red = top32[m];
    const blue = top32[31 - m];
    return createInitialMatch(
      'newbie_1v1',
      'top32',
      m + 1,
      { id: red.id, name: red.name, dancers: [red], sbdText: `SBD ${red.sbd}` },
      { id: blue.id, name: blue.name, dancers: [blue], sbdText: `SBD ${blue.sbd}` }
    );
  });

export const teamSide = (t: Team2v2): BattleSide => ({
  id: t.id,
  name: t.name,
  dancers: [t.dancer1, t.dancer2],
  sbdText: `SBD ${t.dancer1.sbd} / ${t.dancer2.sbd}`,
});

/** Pro Top 16: drawn teams paired in order, 1 vs 2, 3 vs 4, ... (8 matches). */
export const seedProTop16 = (teams: Team2v2[]): BattleMatch[] =>
  Array.from({ length: 8 }, (_, m) =>
    createInitialMatch('pro_2v2', 'top16', m + 1, teamSide(teams[m * 2]), teamSide(teams[m * 2 + 1]))
  );

// ---------- Incidents ----------

/** One side withdraws (bỏ cuộc): the other goes through without a battle; votes so far no longer count. */
export const forfeitMatch = (m: BattleMatch, side: Side): BattleMatch => ({
  ...resetMatch(m),
  status: 'finished',
  winnerSide: side === 'red' ? 'blue' : 'red',
  forfeitSide: side,
});

/** Another team / dancer takes one corner (a swap after the draw, a replacement). */
export const replaceSide = (m: BattleMatch, color: Side, side: BattleSide): BattleMatch =>
  color === 'red' ? { ...m, sideRed: side } : { ...m, sideBlue: side };
