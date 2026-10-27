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
const newMatch = () => createInitialMatch('newbie_1v1', 'top32', 1, side(dancer(1)), side(dancer(2)));

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
