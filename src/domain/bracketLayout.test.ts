/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import * as battle from './battle';
import { bracketLayout } from './bracketLayout';
import { BattleMatch, Team2v2 } from './types';

const team = (n: number) =>
  ({
    id: `team-${n}`,
    teamNumber: n,
    name: `ĐỘI ${String(n).padStart(2, '0')}`,
    dancer1: { id: `a${n}`, sbd: `P${n}a`, name: `A${n}` },
    dancer2: { id: `b${n}`, sbd: `P${n}b`, name: `B${n}` },
  }) as Team2v2;
const teams = Array.from({ length: 16 }, (_, i) => team(i + 1));

/** Red wins every battle of the stage as a walkover, then the next stage is drawn. */
const finishStage = (matches: BattleMatch[], stage: string) =>
  battle.advanceBracket(matches.map((m) => (m.stage === stage ? battle.forfeitMatch(m, 'blue') : m)));

describe('bracketLayout', () => {
  test('Pro: 16 teams in drawing order, then 8, 4, 2 slots; team 1 meets team 2', () => {
    const layout = bracketLayout(battle.seedProTop16(teams), 'pro_2v2');
    expect(layout.stages).toEqual(['top16', 'top8', 'top4', 'final']);
    expect(layout.columns.map((c) => c.length)).toEqual([16, 8, 4, 2]);
    expect(layout.columns[0].map((s) => s.side?.id)).toEqual(teams.map((t) => t.id));
    expect(layout.columns[1].every((s) => !s.side)).toBe(true);
  });

  test('a winner moves on before the rest of the stage is over', () => {
    const [first, ...rest] = battle.seedProTop16(teams);
    const layout = bracketLayout([battle.forfeitMatch(first, 'red'), ...rest], 'pro_2v2');
    expect(layout.columns[0][0]).toMatchObject({ lost: true, forfeit: true });
    expect(layout.columns[0][1]).toMatchObject({ won: true });
    expect(layout.columns[1][0].side?.id).toBe('team-2');
    expect(layout.columns[1][1].side).toBeUndefined();
  });

  test('down to the champion', () => {
    let matches = battle.seedProTop16(teams);
    for (const stage of ['top16', 'top8', 'top4', 'final']) matches = finishStage(matches, stage);
    const layout = bracketLayout(matches, 'pro_2v2');
    expect(layout.columns[3].map((s) => s.side?.id)).toEqual(['team-1', 'team-9']);
    expect(layout.champion?.id).toBe('team-1');
  });

  test('a replaced corner shows the new team', () => {
    const [first, ...rest] = battle.seedProTop16(teams);
    const swapped = battle.replaceSide(first, 'blue', battle.teamSide(team(16)));
    expect(bracketLayout([swapped, ...rest], 'pro_2v2').columns[0][1].side?.id).toBe('team-16');
  });

  test('a forfeit can be undone', () => {
    const [first] = battle.seedProTop16(teams);
    const undone = battle.resetMatch(battle.forfeitMatch(first, 'red'));
    expect(undone).toMatchObject({ status: 'upcoming', winnerSide: null, forfeitSide: undefined });
  });
});
