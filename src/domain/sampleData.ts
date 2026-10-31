// Sample data for the rehearsal event, built with the app's own domain functions so documents look exactly like
// the ones the admin client writes. Used by the admin page "Tổng duyệt" and by `bun run db seed <stage> --dev`.
// All names are made up (rules.md: no real dancer data in the repo). The same fixed random seed is used for every
// stage, so the same dancers move from one stage to the next: registration → check-in → prelim → Top 32 → battle.

import { matchToDoc, dancerToDoc, teamToDoc, DEFAULT_PANELS, panelOf, PrelimPanels, recalculateDancers, cutoffTie, toPublicDancer, applyVotes, matchVotesToDoc, sortMatches, toPublicVotes, Votes } from './model';
import { advanceBracket, confirmRound, seedNewbieTop32, seedProTop16 } from './battle';
import { DEFAULT_JUDGES } from './seed';
import type { BattleMatch, CategoryType, Dancer, Judge, Team2v2 } from './types';

export const SEED_STAGES = ['dang-ky', 'check-in', 'prelim', 'chot-top32', 'battle', 'tu-ket', 'ban-ket', 'chung-ket'] as const;
export type SeedStage = (typeof SEED_STAGES)[number];

export const SEED_STAGE_LABELS: Record<SeedStage, string> = {
  'dang-ky': 'Đăng ký (chưa ai check-in)',
  'check-in': 'Check-in xong, chưa chấm',
  prelim: 'Prelim đang chấm (khoảng 70%)',
  'chot-top32': 'Prelim chấm xong, có đồng điểm ở ngưỡng Top 32',
  battle: 'Battle vòng đầu: đã chốt Top 32, nhánh Newbie Top 32 và Pro Top 16 chưa đấu',
  'tu-ket': 'Đã đấu xong tới Top 16: sắp vào Tứ kết (Top 8)',
  'ban-ket': 'Đã đấu xong Tứ kết: sắp vào Bán kết (Top 4)',
  'chung-ket': 'Đã đấu xong Bán kết: sắp vào Chung kết',
};

export type Docs = Record<string, Record<string, unknown>>; // id -> document

/** How many sample dancers: Newbie only, Pro only, and in both (one entry in each list, same name / club). */
export interface SampleCounts {
  newbie: number;
  pro: number;
  both: number;
}
export const DEFAULT_COUNTS: SampleCounts = { newbie: 45, pro: 45, both: 15 };

const PREFIX: Record<CategoryType, { prefix: string; idPrefix: string; noShow: number }> = {
  newbie_1v1: { prefix: 'N', idPrefix: 'newbie', noShow: 4 },
  pro_2v2: { prefix: 'P', idPrefix: 'pro', noShow: 2 },
};
// A few registered dancers never show up at the desk, once the field is big enough to spare them.
const noShowsOf = (cat: CategoryType, count: number) => (count >= 40 ? PREFIX[cat].noShow : 0);

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
function category(cat: CategoryType, stage: SeedStage, rnd: () => number, people: Person[], panels: PrelimPanels) {
  const { prefix, idPrefix } = PREFIX[cat];
  const count = people.length;
  const noShow = noShowsOf(cat, count);
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
      Object.assign(a, { sbd, panel: panelOf(sbd, panels) ?? undefined, checkedInAt: start + k * 75_000 });
    });
  }

  // Prelim, called in SBD order. 'prelim' = still running: 70% fully scored, 4 half scored, the rest waiting.
  if (at >= STAGE_INDEX('prelim')) {
    const order = [...arrivals].sort((x, y) => x.sbd.localeCompare(y.sbd));
    const done = at >= STAGE_INDEX('chot-top32') ? order.length : Math.floor(order.length * 0.7);
    order.forEach((d, k) => {
      const judges = d.panel ? panels[d.panel] : [];
      const scored = k < done ? judges : k < done + 4 ? judges.slice(0, 2) : [];
      d.prelimScores = Object.fromEntries(
        scored.map((j) => [j, Math.min(99, Math.max(50, Math.round(skill.get(d.id)! + (rnd() - 0.5) * 8)))])
      );
    });
  }

  // Full prelim: a 3-way tie across the cut-off (ranks 32-34) so the tie-break can be rehearsed.
  if (at >= STAGE_INDEX('chot-top32')) {
    const ranked = recalculateDancers(dancers, panels);
    const target = Object.values(ranked[31].prelimScores);
    for (const d of [ranked[32], ranked[33]]) {
      const judges = panels[d.panel!];
      d.prelimScores = Object.fromEntries(judges.map((j, i) => [j, target[i]]));
    }
    dancers = dancers.map((d) => ranked.find((r) => r.id === d.id) ?? d);
  }

  // Battle: the tie-break has been scored by all 8 judges and the category is locked.
  if (at >= STAGE_INDEX('battle')) {
    const tied = cutoffTie(recalculateDancers(dancers, panels));
    const all8 = [...panels.A, ...panels.B];
    tied.forEach((t, i) => {
      const d = dancers.find((x) => x.id === t.id)!;
      d.tieBreak = true;
      d.tieBreakScores = Object.fromEntries(all8.map((j, k) => [j, 70 + i * 3 + (k % 3)])); // distinct totals
    });
  }

  return { dancers: recalculateDancers(dancers, panels), issued: at >= STAGE_INDEX('check-in') ? arrivals.length : 0 };
}

/** A local sample photo (scripts/sample-photos.ts): half-body cut-out + avatar, BBOY or BGIRL. */
export type SamplePhoto = Pick<Dancer, 'halfBodyUrl' | 'avatarUrl'> & { gender: Dancer['gender'] };

/**
 * Gives every dancer a photo of their gender, in turn, so neighbours in the list (and the two members of a team,
 * handed out back to back) get different ones. A dancer entered in both categories keeps the same photo.
 */
function givePhotos(dancers: Dancer[], photos: SamplePhoto[], byName: Map<string, SamplePhoto>, turn: Record<string, number>) {
  for (const d of dancers) {
    let photo = byName.get(d.name);
    if (!photo) {
      const pool = photos.some((p) => p.gender === d.gender) ? photos.filter((p) => p.gender === d.gender) : photos;
      photo = pool[(turn[d.gender] = (turn[d.gender] ?? -1) + 1) % pool.length];
      byName.set(d.name, photo);
    }
    Object.assign(d, { halfBodyUrl: photo.halfBodyUrl, avatarUrl: photo.avatarUrl });
  }
}

/**
 * A drawn portrait for a sample dancer: DiceBear "Notionists" (CC0, no attribution needed), seeded by the name so a
 * dancer in both categories keeps the same face. The avatar gets a soft background; the half-body one (LED, cards)
 * stays transparent like the real cut-out photos.
 */
const PORTRAIT = 'https://api.dicebear.com/9.x/notionists/svg';
const drawnPortrait = (name: string) => {
  const seed = encodeURIComponent(name);
  return {
    avatarUrl: `${PORTRAIT}?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`,
    halfBodyUrl: `${PORTRAIT}?seed=${seed}`,
  };
};

const PLAYED_AT = new Date('2026-11-01T14:00:00+07:00').getTime(); // long past: no LED replays a win from it

/**
 * Plays a battle out: every judge votes each round (one side is the favourite), rounds are announced in turn, and a
 * level score goes to the tie-break, exactly as the operator's "Công bố" does. The votes land in `votes`.
 */
function playMatch(m: BattleMatch, judgeIds: string[], rnd: () => number, votes: Record<string, Votes>): BattleMatch {
  const redShare = rnd() < 0.5 ? 0.68 : 0.32;
  const cast: Votes = {};
  let match = m;
  while (match.status !== 'finished') {
    const round = match.currentRound;
    cast[`r${round}`] = Object.fromEntries(judgeIds.map((j) => [j, rnd() < redShare ? 'red' : 'blue']));
    const outcome = confirmRound(applyVotes(match, cast), round, PLAYED_AT);
    if (!outcome) break;
    match = outcome.match;
  }
  votes[m.id] = cast;
  return match;
}

/** Why these counts can't make that stage (a Vietnamese message for the admin page), or null when they can. */
export function sampleCountsProblem(stage: SeedStage, { newbie, pro, both }: SampleCounts): string | null {
  if ([newbie, pro, both].some((n) => !Number.isInteger(n) || n < 0)) return 'Số thí sinh phải là số nguyên không âm.';
  if (newbie + pro + both > NICKNAMES.length) return `Tối đa ${NICKNAMES.length} thí sinh mẫu (tổng 3 ô).`;
  // The bracket placeholder is a Top 32 (Newbie 32 dancers, Pro 16 teams); the cut-off tie needs ranks 32-34.
  const needed = STAGE_INDEX(stage) >= STAGE_INDEX('chot-top32') ? 34 : 32;
  for (const [label, count, cat] of [
    ['Newbie', newbie + both, 'newbie_1v1'],
    ['Pro', pro + both, 'pro_2v2'],
  ] as const) {
    const present = count - noShowsOf(cat, count);
    if (present < needed) return `${label} cần ít nhất ${needed} thí sinh có mặt (hiện ${present}): nhánh đấu theo thể thức Top 32.`;
  }
  return null;
}

/** The event's own judges (names, photos) and prelim panels, so the rehearsal looks like the real day. */
export interface SampleSetup {
  counts?: SampleCounts;
  judges?: Judge[];
  panels?: PrelimPanels;
}

export function buildSeed(
  stage: SeedStage,
  photos: SamplePhoto[] = [],
  { counts = DEFAULT_COUNTS, judges = DEFAULT_JUDGES, panels = DEFAULT_PANELS }: SampleSetup = {}
): Record<string, Docs> {
  const problem = sampleCountsProblem(stage, counts);
  if (problem) throw new Error(problem);
  const rnd = prng(2026);
  const nicks = shuffle(NICKNAMES, rnd);
  const newbiePeople = nicks.slice(0, counts.newbie + counts.both).map((n) => person(n, rnd));
  const proOnly = nicks.slice(counts.newbie + counts.both, counts.newbie + counts.both + counts.pro);
  // Those who entered both, mixed in among the Pro-only dancers.
  const proPeople = shuffle([...shuffle(newbiePeople, rnd).slice(0, counts.both), ...proOnly.map((n) => person(n, rnd))], rnd);
  const newbie = category('newbie_1v1', stage, rnd, newbiePeople, panels);
  const pro = category('pro_2v2', stage, rnd, proPeople, panels);
  const locked = STAGE_INDEX(stage) >= STAGE_INDEX('battle');

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
  let matches: BattleMatch[] = [...seedProTop16(teams), ...seedNewbieTop32(top32(newbie.dancers))];

  // Past the first round: those stages are played out (9 judges, a tie-break when level) and winners move on.
  const votes: Record<string, Votes> = {};
  const played = { 'tu-ket': ['top32', 'top16'], 'ban-ket': ['top32', 'top16', 'top8'], 'chung-ket': ['top32', 'top16', 'top8', 'top4'] }[stage as string] ?? [];
  const judgeIds = judges.map((j) => j.id);
  for (const roundStage of played) {
    matches = advanceBracket(matches.map((m) => (m.stage === roundStage ? playMatch(m, judgeIds, rnd, votes) : m)));
  }
  matches = sortMatches(matches);

  // Photos in first-round order (red, then blue; a team's two members back to back), so the two sides of a battle
  // and the members of a team look different on the LED; then everyone else.
  if (photos.length) {
    const all = new Map([...newbie.dancers, ...pro.dancers].map((d) => [d.id, d]));
    const inBattle = matches
      .flatMap((m) => [m.sideRed, m.sideBlue].flatMap((s) => s.dancers.map((d) => all.get(d?.id))))
      .filter((d): d is Dancer => Boolean(d));
    givePhotos([...new Set([...inBattle, ...newbie.dancers, ...pro.dancers])], photos, new Map(), {});
  } else {
    // No local photos (the admin page on production): drawn avatars, one per name, so nobody real is shown.
    for (const d of [...newbie.dancers, ...pro.dancers]) Object.assign(d, drawnPortrait(d.name));
  }

  const byId = <T extends { id: string }>(list: T[], toDoc: (x: T) => object) =>
    Object.fromEntries(list.map((x) => [x.id, plain(toDoc(x))]));

  return {
    newbieDancers: byId(newbie.dancers, dancerToDoc),
    proDancers: byId(pro.dancers, dancerToDoc),
    // The published copies guests and the LED read: there from the start, without waiting for an admin to open /admin.
    publicDancers: {
      ...byId(newbie.dancers, (d) => toPublicDancer(d, locked, panels)),
      ...byId(pro.dancers, (d) => toPublicDancer(d, locked, panels)),
    },
    teams: byId(teams, teamToDoc),
    matches: byId(matches, matchToDoc),
    // Judges' votes of the battles already played, and their published copy (announced rounds are open).
    ...(Object.keys(votes).length
      ? {
          votes: byId(Object.entries(votes).map(([id, rounds]) => ({ id, rounds })), matchVotesToDoc),
          publicVotes: byId(
            matches.filter((m) => votes[m.id]).map((m) => toPublicVotes(m, votes[m.id])),
            matchVotesToDoc
          ),
        }
      : {}),
    judges: byId(judges, (j) => j),
    meta: {
      current: plain({
        id: 'current',
        // The next battle to run (the first one not played yet).
        activeMatchId: (matches.find((m) => m.status !== 'finished') ?? matches[0]).id,
        isNewbieTop32Locked: locked,
        isProTop32Locked: locked,
        prelimPanels: panels,
      }),
    },
    ...(newbie.issued || pro.issued ? { counters: { sbd: { N: newbie.issued, P: pro.issued } } } : {}),
  };
}
