import { BattleMatch, BattleRound, Dancer, Team2v2 } from './types';
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

/** 1 - 1 after the two regulation rounds: add round 3 as the tie-break (once). */
const withTieBreak = (rounds: BattleRound[]) =>
  rounds.some((r) => r.isTieBreak) ? rounds : [...rounds, blankRound(3, true)];

export interface RoundOutcome {
  match: BattleMatch;
  roundWinner: Side;
  matchWinner: Side | null;
}

/** Confirm one round from its counted votes; decides the match after round 2 or the tie-break. */
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

  if (target.isTieBreak) {
    matchWinner = winner;
    status = 'finished';
  } else if (roundNumber === 1 && m.totalRoundsRequired >= 2) {
    status = 'ongoing';
    currentRound = 2;
  } else if (roundNumber >= 2) {
    if (winsRed === 1 && winsBlue === 1) {
      status = 'ongoing';
      totalRoundsRequired = 3;
      currentRound = 3;
      rounds = withTieBreak(rounds);
    } else {
      // 2 round wins decide it (red first, as before); otherwise whoever leads
      matchWinner = winsRed >= 2 ? 'red' : winsBlue >= 2 ? 'blue' : winsRed > winsBlue ? 'red' : 'blue';
      status = 'finished';
    }
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
  return {
    tieBreak,
    matchWinner,
    match: {
      ...m,
      rounds: tieBreak ? withTieBreak(counted) : counted,
      roundWinsRed: winsRed,
      roundWinsBlue: winsBlue,
      totalRoundsRequired: tieBreak ? 3 : m.totalRoundsRequired,
      currentRound: tieBreak ? 3 : m.currentRound,
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
  };
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

const teamSide = (t: Team2v2) => ({
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
