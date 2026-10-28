/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { DEFAULT_PANELS, panelOf, panelOfJudge, prelimJudgeIdsFor, recalculateDancers, toPublicDancer } from './model';
import { Dancer } from './types';

const dancer = (sbd: string, prelimScores: Record<string, number> = {}) =>
  ({ id: sbd, sbd, name: sbd, gender: 'male', category: 'pro_2v2', prelimScores }) as unknown as Dancer;

describe('prelim panels', () => {
  test('odd SBDs go to panel A, even to B (and the other way round)', () => {
    expect(panelOf('P001', DEFAULT_PANELS)).toBe('A');
    expect(panelOf('P010', DEFAULT_PANELS)).toBe('B');
    expect(panelOf('N017', { ...DEFAULT_PANELS, aIsOdd: false })).toBe('B');
    expect(panelOf('', DEFAULT_PANELS)).toBeNull(); // not checked in yet
  });

  test('a dancer is scored by the 4 judges of their panel', () => {
    expect(prelimJudgeIdsFor({ sbd: 'P003' }, DEFAULT_PANELS)).toEqual(['gk-1', 'gk-2', 'gk-3', 'gk-4']);
    expect(prelimJudgeIdsFor({ sbd: 'P004' }, DEFAULT_PANELS)).toEqual(['gk-5', 'gk-6', 'gk-7', 'gk-8']);
    expect(panelOfJudge('gk-9', DEFAULT_PANELS)).toBeNull();
  });

  test('totals count only the panel judges and rank both panels together', () => {
    const [b, a] = recalculateDancers([
      dancer('P001', { 'gk-1': 80, 'gk-2': 80, 'gk-3': 80, 'gk-4': 80, 'gk-5': 100 }), // stray B score ignored
      dancer('P002', { 'gk-5': 90, 'gk-6': 90, 'gk-7': 90, 'gk-8': 90 }),
    ]);
    expect(b.sbd).toBe('P002');
    expect(b.prelimScoreTotal).toBe(360);
    expect(b.prelimRank).toBe(1);
    expect(a.prelimScoreTotal).toBe(320);
    expect(a.prelimScoreAvg).toBe(80);
  });

  test('scores go public once the 4 panel judges are in', () => {
    const three = dancer('P002', { 'gk-5': 90, 'gk-6': 90, 'gk-7': 90 });
    expect(toPublicDancer(three, false, DEFAULT_PANELS).prelimScores).toEqual({});
    const four = dancer('P002', { 'gk-5': 90, 'gk-6': 90, 'gk-7': 90, 'gk-8': 70 });
    expect(toPublicDancer(four, false, DEFAULT_PANELS).prelimScores).toEqual(four.prelimScores);
  });
});

describe('panel set at check-in', () => {
  test("the dancer's own panel wins over the SBD parity", () => {
    const d = { ...dancer('P001'), panel: 'B' as const };
    expect(prelimJudgeIdsFor(d, DEFAULT_PANELS)).toEqual(DEFAULT_PANELS.B);
  });
});
