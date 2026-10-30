// Sample data for the rehearsal event (`bun run db seed <stage> --dev`), built with the app's own domain functions
// so documents look exactly like the ones the admin client writes. All names are made up (rules.md: no real
// dancer data in the repo). The same fixed random seed is used for every stage, so the same dancers move from
// one stage to the next: registration → check-in → prelim → Top 32 cut-off → battle.

import { matchToDoc, dancerToDoc, teamToDoc, DEFAULT_PANELS, panelOf, recalculateDancers, cutoffTie } from '../src/domain/model';
import { seedNewbieTop32, seedProTop16 } from '../src/domain/battle';
import { DEFAULT_JUDGES } from '../src/domain/seed';
import type { BattleMatch, CategoryType, Dancer, Team2v2 } from '../src/domain/types';

export const SEED_STAGES = ['dang-ky', 'check-in', 'prelim', 'chot-top32', 'battle'] as const;
export type SeedStage = (typeof SEED_STAGES)[number];

type Docs = Record<string, Record<string, unknown>>; // id -> document

/** Registered dancers and how many of them never show up at the desk. */
const ROSTER: Record<CategoryType, { prefix: string; idPrefix: string; count: number; noShow: number }> = {
  newbie_1v1: { prefix: 'N', idPrefix: 'newbie', count: 60, noShow: 4 },
  pro_2v2: { prefix: 'P', idPrefix: 'pro', count: 60, noShow: 2 },
};
/** Dancers registered in both categories: one entry in each list, same name / real name / club. */
const IN_BOTH = 15;

const NICKNAMES = [
  'SÓC NÂU', 'MÈO MUN', 'TÔM HÙM', 'GIÓ LỐC', 'BÃO CÁT', 'SAO BĂNG', 'CHÂU CHẤU', 'BẮP RANG', 'ỚT CAY', 'BẠC HÀ',
  'KIWI', 'MANGO', 'PEPPER', 'ROCKET', 'PIXEL', 'TURBO-K', 'NINJA-T', 'ZIGZAG', 'BOUNCE', 'LOOP',
  'ECHO', 'GLITCH', 'NOVA-X', 'ORBIT', 'COMET', 'HELIX', 'RADAR', 'SPIN-Z', 'TWIST', 'BLINK',
  'CRUSH', 'DRIFT', 'FLINT', 'GECKO', 'HAWK', 'IGLOO', 'JOLT', 'KOALA', 'LYNX', 'MOCHI',
  'NACHO', 'OTTER', 'PANDA-B', 'QUARTZ', 'RAVEN', 'SALSA', 'TOFU', 'UMBRA', 'VOLT', 'WASABI',
  'YETI', 'ZEN', 'ACORN', 'BISCUIT', 'CACTUS', 'DOMINO', 'EMBER', 'FALCON', 'GINGER', 'HONEY',
  'INDIGO', 'JUNO', 'KARMA', 'LEMON', 'MAPLE', 'NIMBUS', 'OLIVE', 'PRISM', 'QUILL', 'RIPPLE',
  'SPROUT', 'TANGO', 'UNO', 'VIVID', 'WAFFLE', 'XENON', 'YOYO', 'ZESTY', 'ATLAS', 'BOLT', 'CINDER', 'DUSK',
  'CÀ PHÊ', 'BÁNH BAO', 'XOÀI XANH', 'CHÈ KHÚC', 'SẤM SÉT', 'MƯA RÀO', 'HẠT TIÊU', 'ĐOM ĐÓM', 'BỌ NGỰA', 'CÁ CHÉP',
  'AMBER-K', 'BREEZE', 'COCOA', 'DYNAMO', 'ESPRESSO', 'FIZZ', 'GROOVE', 'HUSTLE', 'JAZZ', 'KOMBU',
  'LOTUS', 'MAMBO', 'NOODLE', 'OREO', 'POPCORN', 'RUMBA', 'SWIRL', 'TIDAL', 'VELVET', 'WHIZ',
];
const FAMILY = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô', 'Dương', 'Lý'];
const MIDDLE_M = ['Văn', 'Minh', 'Đức', 'Gia', 'Quang', 'Hữu'];
const MIDDLE_F = ['Thị', 'Ngọc', 'Thu', 'Khánh', 'Bảo', 'Diệu'];
const GIVEN_M = ['An', 'Bình', 'Khôi', 'Long', 'Nam', 'Phúc', 'Quân', 'Sơn', 'Tùng', 'Vinh', 'Huy', 'Đạt'];
const GIVEN_F = ['Anh', 'Chi', 'Hà', 'Linh', 'Mai', 'Ngân', 'Thảo', 'Trang', 'Vy', 'Yến'];
const CREWS = ['CLB Sông Công', 'Trà Xanh Crew', 'S-Zone Kids', 'Phổ Yên Breakers', 'Đại Từ B-Boys', 'Tân Cương Kids', 'Hồ Núi Cốc Crew'];

/** Small deterministic PRNG (mulberry32): same data on every run. */
function prng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const plain = (v: unknown) => JSON.parse(JSON.stringify(v)) as Record<string, unknown>;
const pad3 = (n: number) => String(n).padStart(3, '0');

function shuffle<T>(list: T[], rnd: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const STAGE_INDEX = (s: SeedStage) => SEED_STAGES.indexOf(s);

type Person = Pick<Dancer, 'name' | 'realName' | 'crew' | 'gender'>;

function person(nick: string, rnd: () => number): Person {
  const female = rnd() < 0.3;
  const pick = <T,>(l: T[]) => l[Math.floor(rnd() * l.length)];
  return {
    name: `${female ? 'BGIRL' : 'BBOY'} ${nick}`,
    realName: `${pick(FAMILY)} ${pick(female ? MIDDLE_F : MIDDLE_M)} ${pick(female ? GIVEN_F : GIVEN_M)}`,
    crew: rnd() < 0.9 ? pick(CREWS) : undefined, // a few without a club: the app hides the field
    gender: female ? 'female' : 'male',
  };
}

/** One category through the stages. Returns the dancers (scored as far as the stage goes) and the SBD counter. */
function category(cat: CategoryType, stage: SeedStage, rnd: () => number, people: Person[]) {
  const { prefix, idPrefix, count, noShow } = ROSTER[cat];
  const at = STAGE_INDEX(stage);

  let dancers: Dancer[] = people.slice(0, count).map((p, i) => ({
    ...p,
    id: `${idPrefix}-${pad3(i + 1)}`,
    sbd: '',
    category: cat,
    prelimScores: {},
    prelimScoreTotal: 0,
    prelimScoreAvg: 0,
  }));

  // Check-in: everyone but the no-shows, in a random arrival order, from 07:30 on the day.
  const arrivals = shuffle(dancers, rnd).slice(0, count - noShow);
  const skill = new Map(dancers.map((d) => [d.id, 62 + rnd() * 30]));
  if (at >= STAGE_INDEX('check-in')) {
    const start = new Date('2026-11-01T07:30:00+07:00').getTime();
    arrivals.forEach((a, k) => {
      const sbd = `${prefix}${pad3(k + 1)}`;
      Object.assign(a, { sbd, panel: panelOf(sbd, DEFAULT_PANELS) ?? undefined, checkedInAt: start + k * 75_000 });
    });
  }

  // Prelim, called in SBD order. 'prelim' = still running: 70% fully scored, 4 half scored, the rest waiting.
  if (at >= STAGE_INDEX('prelim')) {
    const order = [...arrivals].sort((x, y) => x.sbd.localeCompare(y.sbd));
    const done = at >= STAGE_INDEX('chot-top32') ? order.length : Math.floor(order.length * 0.7);
    order.forEach((d, k) => {
      const judges = d.panel ? DEFAULT_PANELS[d.panel] : [];
      const scored = k < done ? judges : k < done + 4 ? judges.slice(0, 2) : [];
      d.prelimScores = Object.fromEntries(
        scored.map((j) => [j, Math.min(99, Math.max(50, Math.round(skill.get(d.id)! + (rnd() - 0.5) * 8)))])
      );
    });
  }

  // Full prelim: a 3-way tie across the cut-off (ranks 32-34) so the tie-break can be rehearsed.
  if (at >= STAGE_INDEX('chot-top32')) {
    const ranked = recalculateDancers(dancers, DEFAULT_PANELS);
    const target = Object.values(ranked[31].prelimScores);
    for (const d of [ranked[32], ranked[33]]) {
      const judges = DEFAULT_PANELS[d.panel!];
      d.prelimScores = Object.fromEntries(judges.map((j, i) => [j, target[i]]));
    }
    dancers = dancers.map((d) => ranked.find((r) => r.id === d.id) ?? d);
  }

  // Battle: the tie-break has been scored by all 8 judges and the category is locked.
  if (at >= STAGE_INDEX('battle')) {
    const tied = cutoffTie(recalculateDancers(dancers, DEFAULT_PANELS));
    const all8 = [...DEFAULT_PANELS.A, ...DEFAULT_PANELS.B];
    tied.forEach((t, i) => {
      const d = dancers.find((x) => x.id === t.id)!;
      d.tieBreak = true;
      d.tieBreakScores = Object.fromEntries(all8.map((j, k) => [j, 70 + i * 3 + (k % 3)])); // distinct totals
    });
  }

  return { dancers: recalculateDancers(dancers, DEFAULT_PANELS), issued: at >= STAGE_INDEX('check-in') ? arrivals.length : 0 };
}

export function buildSeed(stage: SeedStage): Record<string, Docs> {
  const rnd = prng(2026);
  const nicks = shuffle(NICKNAMES, rnd);
  const newbiePeople = nicks.slice(0, ROSTER.newbie_1v1.count).map((n) => person(n, rnd));
  const proOnly = nicks.slice(ROSTER.newbie_1v1.count, ROSTER.newbie_1v1.count + ROSTER.pro_2v2.count - IN_BOTH);
  if (proOnly.length + IN_BOTH < ROSTER.pro_2v2.count) throw new Error('NICKNAMES: not enough names for the roster');
  // The 15 who entered both, mixed in among the Pro-only dancers.
  const proPeople = shuffle([...shuffle(newbiePeople, rnd).slice(0, IN_BOTH), ...proOnly.map((n) => person(n, rnd))], rnd);
  const newbie = category('newbie_1v1', stage, rnd, newbiePeople);
  const pro = category('pro_2v2', stage, rnd, proPeople);
  const locked = stage === 'battle';

  // Before the lock the bracket is only a placeholder (replaced by "Chốt Top 32"), but the collections must not
  // be empty: an admin client would then push its built-in demo bracket, whose dancers don't exist here.
  const top32 = (list: Dancer[]) => list.slice(0, 32);
  const proPool = locked ? shuffle(top32(pro.dancers), rnd) : top32(pro.dancers);
  const teams: Team2v2[] = Array.from({ length: 16 }, (_, i) => ({
    id: `team-${i + 1}`,
    teamNumber: i + 1,
    name: `ĐỘI ${String(i + 1).padStart(2, '0')}`,
    dancer1: proPool[i * 2],
    dancer2: proPool[i * 2 + 1],
  }));
  const matches: BattleMatch[] = [...seedProTop16(teams), ...seedNewbieTop32(top32(newbie.dancers))];

  const byId = <T extends { id: string }>(list: T[], toDoc: (x: T) => object) =>
    Object.fromEntries(list.map((x) => [x.id, plain(toDoc(x))]));

  return {
    newbieDancers: byId(newbie.dancers, dancerToDoc),
    proDancers: byId(pro.dancers, dancerToDoc),
    teams: byId(teams, teamToDoc),
    matches: byId(matches, matchToDoc),
    judges: byId(DEFAULT_JUDGES, (j) => j),
    meta: {
      current: plain({
        id: 'current',
        activeMatchId: matches[0].id,
        isNewbieTop32Locked: locked,
        isProTop32Locked: locked,
        prelimPanels: DEFAULT_PANELS,
      }),
    },
    ...(newbie.issued || pro.issued ? { counters: { sbd: { N: newbie.issued, P: pro.issued } } } : {}),
  };
}
