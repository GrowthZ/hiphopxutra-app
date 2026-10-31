/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import * as battle from './battle';
import { applyVotes } from './model';
import { createInitialMatch } from './seed';
import { BattleMatch, Dancer } from './types';

const NOW = 1_700_000_000_000;
const JUDGES = Array.from({ length: 9 }, (_, i) => `gk-${i + 1}`);

const dancer = (n: number) =>
  ({ id: `d${n}`, sbd: `N${String(n).padStart(3, '0')}`, name: `Dancer ${n}` }) as Dancer;
const side = (d: Dancer) => ({ id: d.id, name: d.name, dancers: [d], sbdText: `SBD ${d.sbd}` });
// A 2-round battle (Newbie semi-final); the 1- and 4-round formats have their own tests below.
const newMatch = () => createInitialMatch('newbie_1v1', 'top4', 1, side(dancer(1)), side(dancer(2)));

/** `red` of the 9 judges vote red in that round, the rest blue. */
function vote(m: BattleMatch, roundNumber: number, red: number): BattleMatch {
  const votes = Object.fromEntries(m.rounds.map((r) => [`r${r.roundNumber}`, r.votes]));
  votes[`r${roundNumber}`] = Object.fromEntries(JUDGES.map((j, i) => [j, i < red ? 'red' : 'blue']));
  return applyVotes(m, votes as never);
}

const confirm = (m: BattleMatch, roundNumber: number, red: number) =>
  battle.confirmRound(vote(m, roundNumber, red), roundNumber, NOW)!;

describe('confirmRound', () => {
  test('round 1 moves on to round 2', () => {
    const { match, roundWinner, matchWinner } = confirm(newMatch(), 1, 6);
    expect(roundWinner).toBe('red');
    expect(matchWinner).toBeNull();
    expect(match.currentRound).toBe(2);
    expect(match.status).toBe('ongoing');
    expect(match.rounds[0]).toMatchObject({ winner: 'red', isConfirmed: true, isRevealed: true });
  });

  test('2 - 0 finishes the match', () => {
    const r1 = confirm(newMatch(), 1, 2).match;
    const { match, matchWinner } = confirm(r1, 2, 3);
    expect(matchWinner).toBe('blue');
    expect(match).toMatchObject({ status: 'finished', winnerSide: 'blue', roundWinsBlue: 2, victoryTriggerTimestamp: NOW });
  });

  test('1 - 1 adds one tie-break round, which decides the match', () => {
    const r1 = confirm(newMatch(), 1, 9).match;
    const r2 = confirm(r1, 2, 0);
    expect(r2.matchWinner).toBeNull();
    expect(r2.match).toMatchObject({ status: 'ongoing', currentRound: 3, totalRoundsRequired: 3 });
    expect(r2.match.rounds.filter((r) => r.isTieBreak)).toHaveLength(1);

    const r3 = confirm(r2.match, 3, 5);
    expect(r3.matchWinner).toBe('red');
    expect(r3.match.status).toBe('finished');
  });

  test('unknown round is a no-op', () => {
    expect(battle.confirmRound(newMatch(), 7, NOW)).toBeNull();
  });
});

describe('revealAllRounds', () => {
  test('recounts votes and names the winner', () => {
    const m = vote(vote(newMatch(), 1, 7), 2, 5);
    const { match, matchWinner, tieBreak } = battle.revealAllRounds(m, NOW);
    expect(tieBreak).toBe(false);
    expect(matchWinner).toBe('red');
    expect(match).toMatchObject({ status: 'finished', roundWinsRed: 2, roundWinsBlue: 0 });
    expect(match.rounds[0]).toMatchObject({ redVotesCount: 7, blueVotesCount: 2 });
  });

  test('a split opens the tie-break', () => {
    const m = vote(vote(newMatch(), 1, 7), 2, 1);
    const { match, matchWinner, tieBreak } = battle.revealAllRounds(m, NOW);
    expect(tieBreak).toBe(true);
    expect(matchWinner).toBeNull();
    expect(match).toMatchObject({ status: 'ongoing', currentRound: 3, totalRoundsRequired: 3 });
  });
});

describe('match controls', () => {
  test('resetMatch drops tie-breaks and votes', () => {
    const tied = confirm(confirm(newMatch(), 1, 9).match, 2, 0).match;
    const reset = battle.resetMatch(tied);
    expect(reset.rounds).toHaveLength(2);
    expect(reset).toMatchObject({ status: 'upcoming', currentRound: 1, roundWinsRed: 0, winnerSide: null });
    expect(reset.rounds.every((r) => !r.isConfirmed && Object.keys(r.votes).length === 0)).toBe(true);
  });

  test('advanceRound stops at the last round', () => {
    const m = battle.advanceRound(newMatch());
    expect(m.currentRound).toBe(2);
    expect(battle.advanceRound(m).currentRound).toBe(2);
  });

  test('addTieBreakRound appends and reopens the match', () => {
    const m = battle.addTieBreakRound(battle.declareWinner(newMatch(), 'red', NOW));
    expect(m.rounds.at(-1)).toMatchObject({ roundNumber: 3, isTieBreak: true });
    expect(m).toMatchObject({ status: 'ongoing', winnerSide: null, currentRound: 3 });
  });

  test('leadingSide prefers the declared winner', () => {
    expect(battle.leadingSide({ ...newMatch(), winnerSide: 'blue', roundWinsRed: 2 })).toBe('blue');
    expect(battle.leadingSide({ ...newMatch(), roundWinsBlue: 1 })).toBe('blue');
  });
});

test('seedNewbieTop32 pairs seed 1 with 32', () => {
  const matches = battle.seedNewbieTop32(Array.from({ length: 32 }, (_, i) => dancer(i + 1)));
  expect(matches).toHaveLength(16);
  expect([matches[0].sideRed.id, matches[0].sideBlue.id]).toEqual(['d1', 'd32']);
  expect([matches[15].sideRed.id, matches[15].sideBlue.id]).toEqual(['d16', 'd17']);
});

describe('rounds per stage (docs/main-battle.md 2.3)', () => {
  const match = (category: 'newbie_1v1' | 'pro_2v2', stage: 'top32' | 'top16' | 'top8' | 'top4' | 'final') =>
    createInitialMatch(category, stage, 1, side(dancer(1)), side(dancer(2)));

  test('each stage gets its regulation rounds', () => {
    expect(['top32', 'top16', 'top8', 'top4', 'final'].map((s) => match('newbie_1v1', s as never).rounds.length)).toEqual([1, 1, 1, 2, 2]);
    expect(['top16', 'top8', 'top4', 'final'].map((s) => match('pro_2v2', s as never).rounds.length)).toEqual([2, 2, 4, 4]);
    expect(match('pro_2v2', 'final').totalRoundsRequired).toBe(4);
  });

  test('a 1-round battle is decided by that round', () => {
    const { match: m, matchWinner } = confirm(match('newbie_1v1', 'top32'), 1, 4);
    expect(matchWinner).toBe('blue');
    expect(m.status).toBe('finished');
    expect(m.rounds).toHaveLength(1);
  });

  test('a 4-round battle plays all 4 rounds: 3 - 1 wins, 2 - 2 goes to a 5th tie-break round', () => {
    let m = match('pro_2v2', 'final');
    for (const [round, red] of [[1, 9], [2, 9], [3, 9]] as const) {
      const out = confirm(m, round, red);
      expect(out.matchWinner).toBeNull(); // 3 - 0 after round 3: still not over
      m = out.match;
    }
    expect(confirm(m, 4, 0)).toMatchObject({ matchWinner: 'red', match: { status: 'finished', roundWinsRed: 3 } });

    let level = match('pro_2v2', 'top4');
    for (const [round, red] of [[1, 9], [2, 0], [3, 9]] as const) level = confirm(level, round, red).match;
    const tied = confirm(level, 4, 0);
    expect(tied.matchWinner).toBeNull();
    expect(tied.match).toMatchObject({ status: 'ongoing', currentRound: 5, totalRoundsRequired: 5 });
    expect(tied.match.rounds.at(-1)).toMatchObject({ roundNumber: 5, isTieBreak: true });
    expect(confirm(tied.match, 5, 6)).toMatchObject({ matchWinner: 'red', match: { status: 'finished' } });
  });
});

describe('advanceBracket: winners move on up to the final', () => {
  const finish = (m: BattleMatch, side: 'red' | 'blue') => battle.declareWinner(m, side, NOW);
  const stageOf = (all: BattleMatch[], stage: string) => all.filter((m) => m.stage === stage).sort((a, b) => a.matchNumber - b.matchNumber);

  test('Newbie Top 32 → Top 16 → ... → final, winner of match 1 vs winner of match 2', () => {
    let all = battle.seedNewbieTop32(Array.from({ length: 32 }, (_, i) => dancer(i + 1)));
    expect(battle.advanceBracket(all)).toBe(all); // nothing finished: nothing drawn
    for (const [stage, size] of [['top32', 16], ['top16', 8], ['top8', 4], ['top4', 2]] as const) {
      const round = stageOf(all, stage);
      expect(round).toHaveLength(size);
      // Red wins the odd matches, blue the even ones.
      all = all.map((m) => (m.stage === stage ? finish(m, m.matchNumber % 2 ? 'red' : 'blue') : m));
      all = battle.advanceBracket(all);
      const next = stageOf(all, { top32: 'top16', top16: 'top8', top8: 'top4', top4: 'final' }[stage]);
      expect(next).toHaveLength(size / 2);
      expect(next[0].sideRed.id).toBe(round[0].sideRed.id); // match 1: red won
      expect(next[0].sideBlue.id).toBe(round[1].sideBlue.id); // match 2: blue won
      expect(next[0].rounds).toHaveLength(stage === 'top8' || stage === 'top4' ? 2 : 1); // semis and final: 2 rounds
    }
    expect(stageOf(all, 'final')[0]).toMatchObject({ stage: 'final', status: 'upcoming' });
  });

  test('a changed result moves into a next battle not started yet, never into one under way', () => {
    let all = battle.seedNewbieTop32(Array.from({ length: 32 }, (_, i) => dancer(i + 1)));
    all = battle.advanceBracket(all.map((m) => finish(m, 'red')));
    const first = stageOf(all, 'top16')[0];
    expect(first.sideRed.id).toBe('d1');

    all = battle.advanceBracket(all.map((m) => (m.id === stageOf(all, 'top32')[0].id ? finish(m, 'blue') : m)));
    expect(stageOf(all, 'top16')[0].sideRed.id).toBe('d32'); // seed 1 vs 32: blue (32) now goes through

    all = all.map((m) => (m.id === first.id ? vote(m, 1, 6) : m)); // the Top 16 battle has started
    all = battle.advanceBracket(all.map((m) => (m.id === stageOf(all, 'top32')[0].id ? finish(m, 'red') : m)));
    expect(stageOf(all, 'top16')[0].sideRed.id).toBe('d32');
  });
});
