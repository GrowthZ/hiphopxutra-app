import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, Search, X } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { Dancer } from '../../domain/types';
import { stripBreakerPrefix } from '../../shared/placeholderAssets';
import { RankEmblem } from '../../shared/RankEmblem';
import { GuestHeader } from './GuestBattleView';
import { PANEL_SIZE, prelimJudgeIdsFor } from '../../domain/model';

// Public prelim results (/ket-qua/prelim), phone first: one column, total score only; tap a dancer for details.
// Reads the published copy: a dancer's scores appear only once all 4 prelim judges have scored (KG-06).
// While judging is on only a provisional top 10 is public. Afterwards everyone below rank 40 is shown as "40+"
// in a shuffled order (scores still shown), so the order gives nothing away.
// `?sbd=N012` opens that dancer's card: the link parents share along with the card.

type Scope = 'top10' | 'top32' | 'all';
export const QUALIFY = 32;
const RANKED_UNTIL = 40;
export const LIVE_LIMIT = 10;
// Gold, silver, bronze: metal tones for medals and rings, plus the row tint.
const METALS = [
  { name: 'Vàng', light: '#FFF3C4', mid: '#E3B23C', dark: '#8C6510', row: 'bg-amber-50' },
  { name: 'Bạc', light: '#FFFFFF', mid: '#BFC4CB', dark: '#6B717A', row: 'bg-zinc-100' },
  { name: 'Đồng', light: '#FFDDBA', mid: '#C27A3A', dark: '#6E3D14', row: 'bg-orange-50' },
];
const metalGradient = (m: (typeof METALS)[number]) => `linear-gradient(135deg, ${m.light}, ${m.mid} 45%, ${m.dark})`;

const CHEERS = [
  'Cảm ơn bạn đã cháy hết mình trên sàn hôm nay! Mỗi lần thi đấu là một bước tiến, hẹn gặp bạn ở mùa giải sau với phiên bản mạnh hơn.',
  'Dám bước lên sàn đấu đã là chiến thắng đầu tiên. Tiếp tục luyện tập nhé, sân khấu luôn chờ bạn quay lại!',
  'Hiphop là hành trình, không phải một trận đấu. Giữ lửa đam mê, lần sau bạn sẽ còn bùng nổ hơn nữa!',
];

export const isScored = (d: Dancer, judges: number) => Object.keys(d.prelimScores ?? {}).length >= judges;

/** Public ranking: fully scored dancers by total (then tie-break); those still being scored go last, by SBD. */
export const rankForDisplay = (list: Dancer[], judges: number) =>
  [...list].sort(
    (a, b) =>
      Number(isScored(b, judges)) - Number(isScored(a, judges)) ||
      b.prelimScoreTotal - a.prelimScoreTotal ||
      (b.tieBreakTotal ?? -1) - (a.tieBreakTotal ?? -1) || // tie across the cut-off: settled by all 8 judges
      Number(Boolean(b.judgesPick)) - Number(Boolean(a.judgesPick)) || // ... or, still level, by the judges' pick
      a.sbd.localeCompare(b.sbd)
  );

/** Stable pseudo-random number per dancer: the 40+ group keeps one shuffled order across renders. */
const hashOf = (id: string) => [...id].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7) >>> 0;

export const GenderBadge: React.FC<{ dancer: Dancer }> = ({ dancer }) =>
  dancer.gender === 'female' ? (
    <span className="shrink-0 rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-black uppercase text-pink-700">BGirl</span>
  ) : (
    <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-black uppercase text-sky-700">BBoy</span>
  );

const RankBadge: React.FC<{ rank: number; scored: boolean }> = ({ rank, scored }) =>
  scored && rank <= 3 ? (
    <span className="flex w-8 shrink-0 justify-center">
      <RankEmblem rank={rank} className={rank === 1 ? 'h-11' : 'h-9'} />
    </span>
  ) : (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center text-xs font-black tabular-nums text-zinc-500">
      {!scored ? '–' : rank > RANKED_UNTIL ? `${RANKED_UNTIL}+` : rank}
    </span>
  );

export const Avatar: React.FC<{ dancer: Dancer; size: string; dark?: boolean }> = ({ dancer, size, dark }) =>
  dancer.avatarUrl ? (
    <img
      src={dancer.avatarUrl}
      alt=""
      loading="lazy"
      decoding="async"
      className={`${size} shrink-0 rounded-full object-cover ${dark ? 'bg-white/10 ring-2 ring-white/20' : 'bg-zinc-100'}`}
    />
  ) : (
    <span
      className={`${size} shrink-0 rounded-full font-condensed font-black flex items-center justify-center ${
        dark ? 'bg-white/10 text-white/50 ring-2 ring-white/15' : 'bg-zinc-100 text-zinc-400'
      }`}
    >
      {stripBreakerPrefix(dancer.name).charAt(0)}
    </span>
  );

export const PrelimGuestView: React.FC = () => {
  const { activeCategory, setActiveCategory, newbieDancers, proDancers, judges, prelimPanels, isNewbieTop32Locked, isProTop32Locked } =
    useTournament();

  const [scope, setScope] = useState<Scope>('top10');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Dancer | null>(null);

  const locked = activeCategory === 'newbie_1v1' ? isNewbieTop32Locked : isProTop32Locked;
  // Each dancer is scored by the 4 judges of their panel (A: one SBD parity, B: the other).
  const judgeCount = PANEL_SIZE;

  // Ranked by total; dancers still being scored go last, by SBD.
  const ranked = useMemo(
    () => rankForDisplay(activeCategory === 'newbie_1v1' ? newbieDancers : proDancers, judgeCount),
    [activeCategory, newbieDancers, proDancers, judgeCount]
  );
  const scoredCount = ranked.filter((d) => isScored(d, judgeCount)).length;

  // While judging is on, only the provisional top 10 is public (search included).
  const effectiveScope: Scope = locked ? scope : 'top10';
  const limit = { top10: LIVE_LIMIT, top32: QUALIFY, all: Infinity }[effectiveScope];

  const visible = useMemo(() => {
    const withRank = ranked.map((d, i) => ({ dancer: d, rank: i + 1 }));
    // Below rank 40: one group, shuffled, so the order gives nothing away.
    const shown = [
      ...withRank.slice(0, RANKED_UNTIL),
      ...withRank.slice(RANKED_UNTIL).sort((a, b) => hashOf(a.dancer.id) - hashOf(b.dancer.id)),
    ];
    const pool = locked ? shown : shown.slice(0, LIVE_LIMIT);
    const q = query.trim().toLowerCase();
    if (q) return pool.filter(({ dancer }) => [dancer.name, dancer.sbd].some((f) => f.toLowerCase().includes(q)));
    return pool.slice(0, limit);
  }, [ranked, query, limit, locked]);

  // Shared card link (?sbd=): open it once the data is in, switching category if needed; hidden ranks stay hidden.
  const [linkedSbd, setLinkedSbd] = useState(() => new URLSearchParams(window.location.search).get('sbd'));
  useEffect(() => {
    if (!linkedSbd) return;
    const index = ranked.findIndex((d) => d.sbd === linkedSbd);
    if (index < 0) {
      const other = activeCategory === 'newbie_1v1' ? 'pro_2v2' : 'newbie_1v1';
      if ((other === 'newbie_1v1' ? newbieDancers : proDancers).some((d) => d.sbd === linkedSbd)) setActiveCategory(other);
      return;
    }
    setLinkedSbd(null);
    if (locked || index < LIVE_LIMIT) setSelected(ranked[index]);
  }, [linkedSbd, ranked, locked, activeCategory, newbieDancers, proDancers, setActiveCategory]);

  const podium = ranked.slice(0, 3).filter((d) => isScored(d, judgeCount));
  const scopes: [Scope, string][] = locked
    ? [['top10', 'Top 10'], ['top32', 'Top 32'], ['all', `Tất cả (${ranked.length})`]]
    : [];

  return (
    <div className="min-h-[100dvh] bg-zinc-50 text-zinc-900">
      <GuestHeader current="prelim" />

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* Category */}
        <div className="grid grid-cols-2 rounded-xl bg-zinc-200/70 p-1 text-sm font-bold" role="group" aria-label="Hạng mục">
          {(
            [
              ['newbie_1v1', 'Newbie 1vs1'],
              ['pro_2v2', 'Pro 2vs2'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              aria-pressed={activeCategory === id}
              className={`rounded-lg py-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 ${
                activeCategory === id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Status + scope */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm">
            {locked ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-bold text-emerald-700">Kết quả chính thức</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="font-bold text-red-600">Đang chấm</span>
                <span className="text-zinc-500 tabular-nums">
                  {scoredCount}/{ranked.length} thí sinh
                </span>
              </>
            )}
          </p>
          <div className="flex gap-1" role="group" aria-label="Phạm vi hiển thị">
            {scopes.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setScope(id)}
                aria-pressed={effectiveScope === id}
                className={`rounded-full px-3 py-1 text-xs font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 ${
                  effectiveScope === id ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 border border-zinc-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {!locked && (
          <p className="-mt-2 text-xs text-zinc-500">
            Top {LIVE_LIMIT} tạm thời. Danh sách đầy đủ và Top {QUALIFY} vào vòng Battle công bố khi chấm xong.
          </p>
        )}

        {/* Top 3 podium: 2 · 1 · 3, the winner raised in the middle */}
        {podium.length > 0 && !query && (
          <section
            aria-label="Top 3"
            className="grid grid-cols-3 items-end gap-2 overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-b from-white to-amber-50/60 px-3 pt-4"
          >
            {[1, 0, 2].map((i) => {
              const d = podium[i];
              if (!d) return <div key={i} />;
              const m = METALS[i];
              const first = i === 0;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelected(d)}
                  aria-label={`Hạng ${i + 1}: ${stripBreakerPrefix(d.name)}, ${d.prelimScoreTotal} điểm`}
                  className="group flex min-w-0 flex-col items-center text-center cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 rounded-t-2xl"
                >
                  <span className="relative transition-transform motion-safe:group-active:scale-95">
                    <span className="block rounded-full p-[3px] shadow-md" style={{ background: metalGradient(m) }}>
                      <Avatar dancer={d} size={first ? 'h-24 w-24 text-4xl' : 'h-[4.5rem] w-[4.5rem] text-2xl'} />
                    </span>
                  </span>
                  {/* Under the photo, only its top edge touching the ring, so the face stays clear */}
                  <RankEmblem rank={i + 1} className={`${first ? '-mt-8 h-[68px]' : '-mt-6 h-12'} relative`} />
                  <span className={`${first ? 'mt-0.5 text-lg' : 'mt-0.5 text-base'} w-full truncate px-0.5 font-condensed font-black uppercase leading-tight`}>
                    {stripBreakerPrefix(d.name)}
                  </span>
                  <span className="w-full truncate px-0.5 text-[11px] text-zinc-500">{d.crew || d.sbd}</span>
                  <span
                    className={`mt-2 flex w-full flex-col items-center justify-center rounded-t-xl border-t-4 text-zinc-900 ${
                      first ? 'h-[4.5rem]' : i === 1 ? 'h-14' : 'h-12'
                    }`}
                    style={{ borderTopColor: m.mid, background: `linear-gradient(180deg, ${m.light}, ${m.mid}59)` }}
                  >
                    <span className={`font-condensed font-black tabular-nums leading-none ${first ? 'text-3xl' : 'text-2xl'}`}>
                      {d.prelimScoreTotal}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-600">/ {judgeCount * 100}</span>
                  </span>
                </button>
              );
            })}
          </section>
        )}

        {/* Search */}
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={locked ? 'Tìm tên hoặc số báo danh' : `Tìm trong Top ${LIVE_LIMIT}`}
            aria-label="Tìm thí sinh"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm placeholder:text-zinc-400 focus-visible:outline-2 focus-visible:outline-amber-500"
          />
        </label>

        {/* Ranking: rank · photo · name · total */}
        <ol className="overflow-hidden rounded-2xl border border-zinc-200 bg-white" aria-label="Bảng xếp hạng">
          {visible.length === 0 && <li className="px-4 py-8 text-center text-sm text-zinc-500">Không tìm thấy thí sinh.</li>}
          {visible.map(({ dancer: d, rank }, i) => {
            const scored = isScored(d, judgeCount);
            const podium = scored && rank <= 3 ? METALS[rank - 1] : null;
            const unranked = rank > RANKED_UNTIL;
            return (
              <React.Fragment key={d.id}>
                {locked && rank === QUALIFY + 1 && !query && (
                  <li className="flex items-center gap-2 bg-zinc-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-400">
                    <span className="h-px flex-1 bg-zinc-200" />
                    Dừng ở vòng loại
                    <span className="h-px flex-1 bg-zinc-200" />
                  </li>
                )}
                {unranked && !query && (i === 0 || visible[i - 1].rank <= RANKED_UNTIL) && (
                  <li className="bg-zinc-50 px-4 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-zinc-400">
                    Hạng {RANKED_UNTIL}+ · không xếp thứ tự
                  </li>
                )}
                <li className={`border-t border-zinc-100 first:border-t-0 ${podium?.row ?? ''}`}>
                  <button
                    onClick={() => setSelected(d)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-amber-500 ${
                      podium ? '' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <RankBadge rank={rank} scored={scored} />
                    <Avatar dancer={d} size="h-10 w-10 text-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-condensed text-lg font-black uppercase leading-tight">{stripBreakerPrefix(d.name)}</span>
                      <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                        {d.sbd && <span className="font-mono">{d.sbd}</span>}
                        {locked && rank <= QUALIFY && (
                          <span className="flex items-center gap-0.5 whitespace-nowrap font-bold text-emerald-600">
                            <Check className="h-3 w-3" /> Vào Battle
                          </span>
                        )}
                      </span>
                    </span>
                    <GenderBadge dancer={d} />
                    {scored ? (
                      <span className="w-11 text-right">
                        <span className="block font-condensed text-2xl font-black tabular-nums leading-none">{d.prelimScoreTotal}</span>
                        <span className="text-[10px] text-zinc-400">/ {judgeCount * 100}</span>
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-zinc-400">Đang chấm</span>
                    )}
                    <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300" />
                  </button>
                </li>
              </React.Fragment>
            );
          })}
        </ol>
      </main>

      {selected && (
        <DancerSheet
          dancer={selected}
          rank={ranked.findIndex((d) => d.id === selected.id) + 1}
          cheer={CHEERS[hashOf(selected.id) % CHEERS.length]}
          judges={prelimJudgeIdsFor(selected, prelimPanels).map((id) => ({ id, code: judges.find((j) => j.id === id)?.code ?? id }))}
          locked={locked}
          categoryLabel={activeCategory === 'newbie_1v1' ? 'Newbie 1vs1' : 'Pro 2vs2'}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};

/** One dancer's card, centred on screen: photo, rank, every judge's score. Tap outside, Esc or the × below to close. */
const DancerSheet: React.FC<{
  dancer: Dancer;
  rank: number;
  cheer: string;
  judges: { id: string; code: string }[];
  locked: boolean;
  categoryLabel: string;
  onClose: () => void;
}> = ({ dancer, rank, cheer, judges, locked, categoryLabel, onClose }) => {
  const scored = isScored(dancer, PANEL_SIZE);
  const unranked = scored && rank > RANKED_UNTIL;
  const medal = scored && rank <= 3 ? METALS[rank - 1] : null;
  const qualified = locked && scored && rank <= QUALIFY;
  const name = stripBreakerPrefix(dancer.name);
  const rankLabel = !scored
    ? 'Đang chấm'
    : unranked
      ? `Top ${RANKED_UNTIL}+`
      : medal
        ? `Hạng ${rank} · Vé ${medal.name}`
        : `Hạng ${rank}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={name}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[100dvh] w-full max-w-sm flex-col items-center gap-4 overflow-y-auto px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <article className="relative w-full overflow-hidden rounded-3xl bg-zinc-950 text-white shadow-2xl ring-1 ring-white/10">
          {/* Glow in the rank's colour and a faint diagonal texture */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full opacity-60 blur-3xl"
            style={{ background: medal ? medal.mid : qualified ? '#10B981' : '#DC2626' }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.05] bg-[repeating-linear-gradient(135deg,#fff_0_2px,transparent_2px_14px)]"
          />
          <div className="relative flex flex-col items-center px-5 pb-5 pt-5 text-center">
            <img src="/logo.png" alt="HipHop Xứ Trà U16" className="h-12 w-auto" />
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">Vòng loại · {categoryLabel}</p>

            <div className="relative mt-4">
              <span
                className="block rounded-full p-1 shadow-xl"
                style={{
                  background: medal
                    ? metalGradient(medal)
                    : qualified
                      ? 'linear-gradient(135deg, #6EE7B7, #047857)'
                      : 'linear-gradient(135deg, #F87171, #7F1D1D)',
                }}
              >
                <Avatar dancer={dancer} size="h-32 w-32 text-5xl" dark />
              </span>
            </div>
            {/* Under the photo, only its top edge touching the ring, so the face stays clear */}
            {medal && <RankEmblem rank={rank} className={`relative -mt-9 ${rank === 1 ? 'h-20' : 'h-16'}`} glow />}

            <p
              className={`${medal ? 'mt-2' : 'mt-4'} font-condensed text-sm font-black uppercase tracking-[0.2em]`}
              style={{ color: medal ? medal.mid : '#FBBF24' }}
            >
              {rankLabel}
            </p>
            <h2 className="mt-0.5 max-w-full break-words font-condensed text-4xl font-black uppercase leading-none">{name}</h2>
            <p className="mt-2 flex max-w-full items-center justify-center gap-2 text-sm text-white/60">
              <GenderBadge dancer={dancer} />
              <span className="truncate">{[dancer.crew, dancer.sbd && `SBD ${dancer.sbd}`].filter(Boolean).join(' · ')}</span>
            </p>

            {scored ? (
              <>
                <div className="mt-4 grid w-full grid-cols-4 gap-1.5">
                  {judges.map((j) => (
                    <div key={j.id} className="rounded-xl bg-white/[0.07] py-2 ring-1 ring-white/10">
                      <p className="text-[10px] font-bold text-white/50">{j.code}</p>
                      <p className="font-condensed text-2xl font-black tabular-nums leading-tight">{dancer.prelimScores[j.id] ?? '–'}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex w-full items-end justify-between rounded-2xl bg-white px-4 py-3 text-zinc-950">
                  <span className="text-sm font-black uppercase">Tổng điểm</span>
                  <span className="font-condensed text-5xl font-black tabular-nums leading-none">
                    {dancer.prelimScoreTotal}
                    <span className="text-base text-zinc-400"> / {judges.length * 100}</span>
                  </span>
                </div>
                {qualified && (
                  <p className="mt-3 flex items-center gap-1.5 rounded-full bg-emerald-400 px-3 py-1 text-xs font-black uppercase text-emerald-950">
                    <Check className="h-3.5 w-3.5" /> Vào vòng Battle · Top {QUALIFY}
                  </p>
                )}
                {locked && !qualified && <p className="mt-3 text-sm leading-relaxed text-white/75">{cheer}</p>}
              </>
            ) : (
              <p className="mt-4 w-full rounded-xl bg-white/[0.07] px-4 py-5 text-sm text-white/70">
                Điểm sẽ hiện khi cả {judges.length} giám khảo chấm xong.
              </p>
            )}

            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.25em] text-white/35">#HiphopXuTra2026</p>
          </div>
        </article>

        <button
          onClick={onClose}
          aria-label="Đóng"
          className="rounded-full p-3 text-white/40 hover:bg-white/10 hover:text-white/80 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          <X className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
};
