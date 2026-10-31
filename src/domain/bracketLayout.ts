import { BattleMatch, BattleSide, CategoryType, RoundStage } from './types';

// The knockout tree of one category, column by column, for the public bracket screen. Column 0 holds the sides of
// the first stage (Newbie Top 32, Pro Top 16), two slots per battle; each next column holds the next stage's sides,
// down to the final's two. A next-stage battle is only drawn once its whole stage is over (battle.advanceBracket),
// so until then its slots are filled from the winners of the two battles that feed it.

const STAGES: RoundStage[] = ['top32', 'top16', 'top8', 'top4', 'final'];

export interface BracketSlot {
  side?: BattleSide; // undefined: still to be decided
  matchId?: string; // the battle this slot plays in
  score?: number; // rounds won in that battle, once it has started
  won?: boolean;
  lost?: boolean;
  forfeit?: boolean; // this side withdrew
  live?: boolean; // its battle is the one on stage
}

export interface BracketLayout {
  stages: RoundStage[]; // one per column, the last is the final
  columns: BracketSlot[][]; // columns[i].length = 2 × battles of stages[i]
  champion?: BattleSide;
}

export function bracketLayout(matches: BattleMatch[], category: CategoryType, activeMatchId?: string): BracketLayout {
  const own = matches.filter((m) => m.category === category);
  const first = STAGES.findIndex((s) => own.some((m) => m.stage === s));
  if (first < 0) return { stages: [], columns: [] };
  const stages = STAGES.slice(first);
  const byStage = (stage: RoundStage) =>
    own.filter((m) => m.stage === stage).sort((a, b) => a.matchNumber - b.matchNumber);
  const battlesAt = (column: number) => Math.max(1, byStage(stages[0]).length >> column);

  const slotFor = (m: BattleMatch, color: 'red' | 'blue'): BracketSlot => {
    const started = m.status !== 'upcoming' || m.roundWinsRed + m.roundWinsBlue > 0;
    const done = m.status === 'finished' && Boolean(m.winnerSide);
    return {
      side: color === 'red' ? m.sideRed : m.sideBlue,
      matchId: m.id,
      score: started && !m.forfeitSide ? (color === 'red' ? m.roundWinsRed : m.roundWinsBlue) : undefined,
      won: done && m.winnerSide === color,
      lost: done && m.winnerSide !== color,
      forfeit: m.forfeitSide === color,
      live: m.id === activeMatchId && m.status !== 'finished',
    };
  };
  const winnerSlot = (m?: BattleMatch): BracketSlot => {
    if (!m || m.status !== 'finished' || !m.winnerSide) return {};
    return { side: m.winnerSide === 'red' ? m.sideRed : m.sideBlue };
  };

  const columns = stages.map((stage, column) => {
    const battles = byStage(stage);
    const previous = column > 0 ? byStage(stages[column - 1]) : [];
    return Array.from({ length: battlesAt(column) }, (_, k) => {
      const m = battles.find((b) => b.matchNumber === k + 1);
      if (m) return [slotFor(m, 'red'), slotFor(m, 'blue')];
      const feed = (n: number) => previous.find((b) => b.matchNumber === n);
      return [winnerSlot(feed(2 * k + 1)), winnerSlot(feed(2 * k + 2))];
    }).flat();
  });

  const final = byStage('final')[0];
  const champion = final?.status === 'finished' && final.winnerSide ? (final.winnerSide === 'red' ? final.sideRed : final.sideBlue) : undefined;
  return { stages, columns, champion };
}
