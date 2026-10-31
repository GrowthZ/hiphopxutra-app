import { Dancer, Judge, BattleMatch, Team2v2, CategoryType, RoundStage } from './types';
import { DEFAULT_PANELS, PANEL_SIZE, panelOf, prelimJudgeIdsFor } from './model';

// 9 Judges for Main Battle (Updated Official List)
export const DEFAULT_JUDGES: Judge[] = [
  { id: 'gk-1', code: 'GK 01', name: 'GK 01 • T-Cat', judgeName: 'T-Cat', isOnline: true },
  { id: 'gk-2', code: 'GK 02', name: 'GK 02 • Mouse', judgeName: 'Mouse', isOnline: true },
  { id: 'gk-3', code: 'GK 03', name: 'GK 03 • Patrick', judgeName: 'Patrick', isOnline: true },
  { id: 'gk-4', code: 'GK 04', name: 'GK 04 • Hope', judgeName: 'Hope', isOnline: true },
  { id: 'gk-5', code: 'GK 05', name: 'GK 05 • Mystery', judgeName: 'Mystery', isOnline: true },
  { id: 'gk-6', code: 'GK 06', name: 'GK 06 • Sakerz', judgeName: 'Sakerz', isOnline: true },
  { id: 'gk-7', code: 'GK 07', name: 'GK 07 • Russo', judgeName: 'Russo', isOnline: true },
  { id: 'gk-8', code: 'GK 08', name: 'GK 08 • Dash', judgeName: 'Dash', isOnline: true },
  { id: 'gk-9', code: 'GK 09', name: 'GK 09 • Huco', judgeName: 'Huco', isOnline: true },
];

// 4 Judges for Prelims (solo scoring)

const NEWBIE_NAMES = [
  'BBOY THUNDER', 'BBOY T-REX', 'BGIRL SAKURA', 'BBOY DRAGON', 'BGIRL RUBY',
  'BBOY PHOENIX', 'BBOY NEO', 'BGIRL LUNA', 'BBOY SHADOW', 'BBOY TITAN',
  'BGIRL CHERRY', 'BBOY BLAZE', 'BBOY SONIC', 'BGIRL DIAMOND', 'BBOY STORM',
  'BBOY VIPER', 'BBOY KEN', 'BGIRL AMBER', 'BBOY RAPTOR', 'BBOY APEX',
  'BBOY FROST', 'BGIRL SUNNY', 'BBOY CYCLONE', 'BBOY SPIDER', 'BGIRL JADE',
  'BBOY MATRIX', 'BBOY FLASH', 'BGIRL PEARL', 'BBOY E', 'BBOY F',
  'BBOY G', 'BBOY A', 'BBOY H', 'BBOY I', 'BBOY J',
  'BGIRL CRYSTAL', 'BBOY K', 'BBOY L', 'BGIRL M', 'BBOY N'
];

const PRO_NAMES = [
  'BBOY T-BOY', 'BGIRL ZIN', 'BBOY MONSTER', 'BBOY MINH NHẬT', 'BGIRL KIM',
  'BBOY QUICK', 'BBOY ATOM', 'BGIRL BEAST', 'BBOY LIGHTNING', 'BBOY GALAXY',
  'BBOY IRON', 'BGIRL STAR', 'BBOY ROCK', 'BBOY FLOW', 'BGIRL EMMA',
  'BBOY BULLET', 'BBOY ZERO', 'BBOY TURBO', 'BBOY NITRO', 'BGIRL MAYA',
  'BBOY DINO', 'BBOY ACE', 'BBOY JACK', 'BGIRL NOVA', 'BBOY COBRA',
  'BBOY SHARK', 'BBOY TORNADO', 'BGIRL SKY', 'BBOY C', 'BBOY D',
  'BBOY B', 'BBOY W', 'BBOY ALPHA', 'BGIRL BETA', 'BBOY GAMMA',
  'BBOY DELTA', 'BBOY OMEGA', 'BGIRL SIGMA', 'BBOY KRONOS', 'BBOY VORTEX'
];

function generateDancers(category: 'newbie_1v1' | 'pro_2v2', names: string[]): Dancer[] {
  return names.map((name, index) => {
    const sbdNum = index + 1;
    const sbd = sbdNum.toString().padStart(3, '0');
    
    // Base integer scores between 72 and 96
    let baseScore = Math.round(95 - (index * 0.4));
    if (name === 'BBOY E') baseScore = 86;
    if (name === 'BBOY F') baseScore = 86;
    if (name === 'BBOY G') baseScore = 85;
    if (name === 'BBOY A') baseScore = 83;
    if (name === 'BBOY H') baseScore = 82;
    if (name === 'BBOY I') baseScore = 81;

    // The 4 judges of the dancer's panel (odd SBD: A, even: B) score integers
    const scores: Record<string, number> = {};
    prelimJudgeIdsFor({ sbd }, DEFAULT_PANELS).forEach((judgeId, jIdx) => {
      let offset = 0;
      if (jIdx === 0) offset = index % 2 === 0 ? 0 : 1;
      else if (jIdx === 1) offset = index % 3 === 0 ? -1 : 0;
      else if (jIdx === 2) offset = index % 2 === 1 ? 1 : 0;
      else offset = index % 4 === 0 ? 0 : -1;

      // Ensure exact values for boundary ranks matching Image 1
      if (name === 'BBOY E') offset = [0, -1, 1, 0][jIdx];
      if (name === 'BBOY F') offset = [0, 0, -1, -1][jIdx];
      if (name === 'BBOY G') offset = [-1, 0, 0, -1][jIdx];
      if (name === 'BBOY A') offset = [0, 0, 0, 0][jIdx];
      if (name === 'BBOY H') offset = [1, 1, 0, 1][jIdx]; // total 331, avg 83
      if (name === 'BBOY I') offset = [1, 2, 2, 1][jIdx]; // total 330, avg 83

      const score = Math.min(100, Math.max(50, Math.round(baseScore + offset)));
      scores[judgeId] = score;
    });

    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    const avg = Math.round(total / PANEL_SIZE);
    const isFemale = name.startsWith('BGIRL');

    return {
      id: `${category}-dancer-${index + 1}`,
      sbd,
      panel: panelOf(sbd, DEFAULT_PANELS) ?? undefined, // as check-in would assign
      name,
      realName: isFemale
        ? `Nguyễn Thị ${String.fromCharCode(65 + (index % 26))}`
        : `Nguyễn Văn ${String.fromCharCode(65 + (index % 26))}`,
      gender: isFemale ? 'female' : 'male',
      crew: index % 3 === 0 ? 'Thái Nguyên HipHop' : index % 3 === 1 ? 'S-Zone Kids' : 'Trà Xanh Crew',
      category,
      prelimScores: scores,
      prelimScoreTotal: total,
      prelimScoreAvg: avg,
      prelimRank: index + 1,
      isQualifiedTop32: index < 32,
    };
  });
}

export const INITIAL_NEWBIE_DANCERS = generateDancers('newbie_1v1', NEWBIE_NAMES);
export const INITIAL_PRO_DANCERS = generateDancers('pro_2v2', PRO_NAMES);

// Helper to generate 16 pairs for Pro 2vs2 from Top 32
export function generateRandomTeams(top32Dancers: Dancer[]): Team2v2[] {
  const shuffled = [...top32Dancers.slice(0, 32)].sort(() => Math.random() - 0.5);
  const teams: Team2v2[] = [];
  for (let i = 0; i < 16; i++) {
    const d1 = shuffled[i * 2];
    const d2 = shuffled[i * 2 + 1];
    teams.push({
      id: `team-${i + 1}`,
      teamNumber: i + 1,
      name: `ĐỘI ${String(i + 1).padStart(2, '0')}`,
      dancer1: d1,
      dancer2: d2,
    });
  }
  return teams;
}

export const INITIAL_PRO_TEAMS = generateRandomTeams(INITIAL_PRO_DANCERS);

/** Regulation rounds per battle by stage (docs/main-battle.md 2.3). Pro has no Top 32. */
export const ROUNDS_BY_STAGE: Record<CategoryType, Record<RoundStage, number>> = {
  newbie_1v1: { top32: 1, top16: 1, top8: 1, top4: 2, final: 2 },
  pro_2v2: { top32: 2, top16: 2, top8: 2, top4: 4, final: 4 },
};

export function createInitialMatch(
  category: 'newbie_1v1' | 'pro_2v2',
  stage: RoundStage,
  matchNumber: number,
  sideRed: { id: string; name: string; dancers: Dancer[]; sbdText: string },
  sideBlue: { id: string; name: string; dancers: Dancer[]; sbdText: string }
): BattleMatch {
  // Số round chính thức theo vòng (docs/main-battle.md 2.3); hòa sau các round đó thì thêm 1 round Tie-break.
  const totalRounds = ROUNDS_BY_STAGE[category][stage];

  const stageTitles: Record<string, string> = {
    top32: 'Top 32',
    top16: 'Top 16',
    top8: 'Tứ kết (Top 8)',
    top4: 'Bán kết (Top 4)',
    final: 'Chung kết',
  };

  const rounds = Array.from({ length: totalRounds }).map((_, rIdx) => ({
    roundNumber: rIdx + 1,
    votes: {},
    redVotesCount: 0,
    blueVotesCount: 0,
    winner: null,
    isConfirmed: false,
  }));

  return {
    id: `match-${category}-${stage}-${matchNumber}`,
    category,
    stage,
    stageName: stageTitles[stage] || stage,
    matchNumber,
    title: `${category === 'newbie_1v1' ? 'KID NEWBIE • 1vs1' : 'KID PRO • 2vs2'} • ${stageTitles[stage]} • Trận ${String(matchNumber).padStart(2, '0')}`,
    sideRed,
    sideBlue,
    totalRoundsRequired: totalRounds,
    currentRound: 1,
    roundWinsRed: 0,
    roundWinsBlue: 0,
    rounds,
    winnerSide: null,
    status: matchNumber === 1 && stage === 'top16' ? 'ongoing' : 'upcoming',
  };
}

export function buildInitialMatches(): BattleMatch[] {
  // Pro 2vs2 matches: 16 teams -> 8 matches for Top 16
  const proTop16Matches: BattleMatch[] = [];
  for (let m = 0; m < 8; m++) {
    const tRed = INITIAL_PRO_TEAMS[m * 2];
    const tBlue = INITIAL_PRO_TEAMS[m * 2 + 1];
    proTop16Matches.push(createInitialMatch(
      'pro_2v2',
      'top16',
      m + 1,
      {
        id: tRed.id,
        name: tRed.name,
        dancers: [tRed.dancer1, tRed.dancer2],
        sbdText: `SBD ${tRed.dancer1.sbd} / ${tRed.dancer2.sbd}`,
      },
      {
        id: tBlue.id,
        name: tBlue.name,
        dancers: [tBlue.dancer1, tBlue.dancer2],
        sbdText: `SBD ${tBlue.dancer1.sbd} / ${tBlue.dancer2.sbd}`,
      }
    ));
  }

  // Pre-fill Match 1: Round 1 & Round 2 have all 9 judges votes submitted, waiting for Admin reveal
  if (proTop16Matches[0]) {
    const m1 = proTop16Matches[0];
    m1.currentRound = 1;
    m1.roundWinsRed = 0;
    m1.roundWinsBlue = 0;
    // Round 1: 9 votes cast, awaiting Admin reveal (shows green with white checkmark)
    m1.rounds[0] = {
      roundNumber: 1,
      votes: {
        'gk-1': 'red', 'gk-2': 'red', 'gk-3': 'blue', 'gk-4': 'red',
        'gk-5': 'red', 'gk-6': 'blue', 'gk-7': 'red', 'gk-8': 'red', 'gk-9': 'blue'
      },
      redVotesCount: 6,
      blueVotesCount: 3,
      winner: null,
      isConfirmed: false,
      isRevealed: false,
    };
    // Round 2: 9 votes cast, awaiting Admin reveal (shows green with white checkmark)
    if (m1.rounds[1]) {
      m1.rounds[1] = {
        roundNumber: 2,
        votes: {
          'gk-1': 'blue', 'gk-2': 'blue', 'gk-3': 'red', 'gk-4': 'blue',
          'gk-5': 'blue', 'gk-6': 'blue', 'gk-7': 'blue', 'gk-8': 'red', 'gk-9': 'blue'
        },
        redVotesCount: 2,
        blueVotesCount: 7,
        winner: null,
        isConfirmed: false,
        isRevealed: false,
      };
    }
  }

  // Newbie 1vs1 matches: Top 32 dancers -> 16 matches for Top 32
  const newbieTop32Matches: BattleMatch[] = [];
  for (let m = 0; m < 16; m++) {
    const dRed = INITIAL_NEWBIE_DANCERS[m];
    const dBlue = INITIAL_NEWBIE_DANCERS[31 - m];
    newbieTop32Matches.push(createInitialMatch(
      'newbie_1v1',
      'top32',
      m + 1,
      {
        id: dRed.id,
        name: dRed.name,
        dancers: [dRed],
        sbdText: `SBD ${dRed.sbd}`,
      },
      {
        id: dBlue.id,
        name: dBlue.name,
        dancers: [dBlue],
        sbdText: `SBD ${dBlue.sbd}`,
      }
    ));
  }

  return [...proTop16Matches, ...newbieTop32Matches];
}
