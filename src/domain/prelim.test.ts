/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { cutoffStillTied, cutoffTie, DEFAULT_PANELS, isCutoffUndecided, panelOf, panelOfJudge, prelimJudgeIdsFor, recalculateDancers, toPublicDancer } from './model';
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

describe('tie-break across the Top 32 cut-off', () => {
  const all8 = (score: number) => Object.fromEntries(['gk-1', 'gk-2', 'gk-3', 'gk-4', 'gk-5', 'gk-6', 'gk-7', 'gk-8'].map((j) => [j, score]));
  // 31 clear qualifiers, then P032 and P033 tied on 280 for the last place.
  const field = (tie: Partial<Dancer> = {}, tie2: Partial<Dancer> = {}) =>
    recalculateDancers([
      ...Array.from({ length: 31 }, (_, i) => dancer(`P${101 + 2 * i}`, { 'gk-1': 90, 'gk-2': 90, 'gk-3': 90, 'gk-4': 90 })),
      { ...dancer('P033', { 'gk-1': 70, 'gk-2': 70, 'gk-3': 70, 'gk-4': 70 }), ...tie },
      { ...dancer('P035', { 'gk-1': 70, 'gk-2': 70, 'gk-3': 70, 'gk-4': 70 }), ...tie2 },
    ]);

  test('a tie across the cut-off is found and blocks the lock', () => {
    const ranked = field();
    expect(cutoffTie(ranked).map((d) => d.sbd)).toEqual(['P033', 'P035']);
    expect(isCutoffUndecided(ranked)).toBe(true);
  });

  test('the 8-judge tie-break orders the tied dancers once all 8 are in', () => {
    const partial = field({ tieBreak: true, tieBreakScores: { 'gk-1': 50 } }, { tieBreak: true, tieBreakScores: all8(60) });
    expect(isCutoffUndecided(partial)).toBe(true); // P033 still waiting on 7 judges

    const done = field({ tieBreak: true, tieBreakScores: all8(50) }, { tieBreak: true, tieBreakScores: all8(60) });
    expect(done[31].sbd).toBe('P035');
    expect(done[31].tieBreakTotal).toBe(480);
    expect(done[31].prelimScoreTotal).toBe(280); // prelim total unchanged
    expect(isCutoffUndecided(done)).toBe(false);
  });

  test('a tie-break that is level again goes to the judges: the pick takes the place', () => {
    const level = field({ tieBreak: true, tieBreakScores: all8(60) }, { tieBreak: true, tieBreakScores: all8(60) });
    expect(isCutoffUndecided(level)).toBe(true);
    const { group, places } = cutoffStillTied(level);
    expect(group.map((d) => d.sbd)).toEqual(['P033', 'P035']);
    expect(places).toBe(1);

    // The judges confer and pick P035 (higher SBD, so not first by default); an admin enters it.
    const picked = field({ tieBreak: true, tieBreakScores: all8(60) }, { tieBreak: true, tieBreakScores: all8(60), judgesPick: true });
    expect(picked[31].sbd).toBe('P035');
    expect(picked[31].isQualifiedTop32).toBe(true);
    expect(picked[32].sbd).toBe('P033');
    expect(isCutoffUndecided(picked)).toBe(false);
  });

  test('tie-break scores stay hidden from guests until all 8 judges are in', () => {
    const d = { ...dancer('P033'), tieBreak: true, tieBreakScores: { 'gk-1': 50 } };
    expect(toPublicDancer(d, false, DEFAULT_PANELS).tieBreakScores).toEqual({});
    const full = { ...d, tieBreakScores: all8(50) };
    expect(toPublicDancer(full, false, DEFAULT_PANELS).tieBreakScores).toEqual(all8(50));
  });
});

describe('withdrawn after the prelim (bỏ cuộc)', () => {
  const panelA = (score: number) => ({ 'gk-1': score, 'gk-2': score, 'gk-3': score, 'gk-4': score });
  // 33 dancers on distinct totals: P101 best, P165 (rank 33) just outside the Top 32.
  const field = (withdrawn: string[]) =>
    recalculateDancers(
      Array.from({ length: 33 }, (_, i) => ({ ...dancer(`P${101 + 2 * i}`, panelA(90 - i)), withdrawn: withdrawn.includes(`P${101 + 2 * i}`) }))
    );

  test('keeps their score, loses their rank and Top 32 place; the next dancer moves up', () => {
    const ranked = field(['P101']);
    const gone = ranked.find((d) => d.sbd === 'P101')!;
    expect(gone.prelimScoreTotal).toBe(360);
    expect(gone.prelimRank).toBeUndefined();
    expect(gone.isQualifiedTop32).toBe(false);
    expect(ranked.at(-1)!.sbd).toBe('P101'); // listed last
    expect(ranked[0]).toMatchObject({ sbd: 'P103', prelimRank: 1 });
    expect(ranked.find((d) => d.sbd === 'P165')).toMatchObject({ prelimRank: 32, isQualifiedTop32: true });
    expect(ranked.filter((d) => d.isQualifiedTop32)).toHaveLength(32);
  });

  test('a withdrawn dancer is left out of a tie at the cut-off', () => {
    // P201 / P203 tied for place 32; P205, withdrawn on the same total, doesn't join the tie.
    const ranked = recalculateDancers([
      ...Array.from({ length: 31 }, (_, i) => dancer(`P${101 + 2 * i}`, panelA(90))),
      dancer('P201', panelA(70)),
      dancer('P203', panelA(70)),
      { ...dancer('P205', panelA(70)), withdrawn: true },
    ]);
    expect(cutoffTie(ranked).map((d) => d.sbd)).toEqual(['P201', 'P203']);
    expect(isCutoffUndecided(ranked)).toBe(true);
    // Only 32 left in the running once one more withdraws: no cut-off to decide.
    const fewer = recalculateDancers(ranked.map((d) => (d.sbd === 'P203' ? { ...d, withdrawn: true } : d)));
    expect(isCutoffUndecided(fewer)).toBe(false);
    expect(fewer.filter((d) => d.isQualifiedTop32)).toHaveLength(32);
  });
});
