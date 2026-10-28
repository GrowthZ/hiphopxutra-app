import React, { useMemo, useState } from 'react';
import { Check, ChevronRight, Medal, Search, X } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { Dancer } from '../../domain/types';
import { stripBreakerPrefix } from '../../shared/placeholderAssets';
import { GuestHeader } from './GuestBattleView';
import { PANEL_SIZE, prelimJudgeIdsFor } from '../../domain/model';

// Public prelim results (/ket-qua/prelim), phone first: one column, total score only; tap a dancer for details.
// Reads the published copy: a dancer's scores appear only once all 4 prelim judges have scored (KG-06).
// While judging is on only a provisional top 10 is public. Afterwards everyone below rank 40 is shown as "40+"
// in a shuffled order without scores, so nobody can tell who came last.

type Scope = 'top10' | 'top32' | 'all';
export const QUALIFY = 32;
const RANKED_UNTIL = 40;
export const LIVE_LIMIT = 10;
// Gold, silver, bronze: row tint and rank badge.
export const PODIUM = [
  { row: 'bg-amber-50', badge: 'bg-amber-400 text-amber-950' },
  { row: 'bg-zinc-100', badge: 'bg-zinc-300 text-zinc-800' },
  { row: 'bg-orange-50', badge: 'bg-orange-300 text-orange-950' },
];
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
    <span className={`flex h-8 shrink-0 items-center gap-0.5 rounded-full px-1.5 text-xs font-black tabular-nums ${PODIUM[rank - 1].badge}`}>
      <Medal className="h-3.5 w-3.5" />
      {rank}
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

        {/* Top 3 */}
        {podium.length > 0 && !query && (
          <section aria-label="Top 3" className="grid grid-cols-3 gap-2">
            {podium.map((d, i) => (
              <button
                key={d.id}
                onClick={() => setSelected(d)}
                className={`flex flex-col items-center rounded-2xl border bg-white px-2 pb-3 pt-2 text-center cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 ${
                  i === 0 ? 'border-amber-300 shadow-sm' : 'border-zinc-200'
                }`}
              >
                <span className={`mb-1.5 flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-black ${PODIUM[i].badge}`}>
                  <Medal className="h-3 w-3" />
                  {i + 1}
                </span>
                <Avatar dancer={d} size={i === 0 ? 'h-16 w-16 text-2xl' : 'h-14 w-14 text-xl'} />
                <span className="mt-1.5 w-full truncate font-condensed text-base font-black uppercase leading-tight">
                  {stripBreakerPrefix(d.name)}
                </span>
                <span className="font-condensed text-2xl font-black tabular-nums leading-none text-zinc-900">{d.prelimScoreTotal}</span>
              </button>
            ))}
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
            const podium = scored && rank <= 3 ? PODIUM[rank - 1] : null;
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
                    {scored && unranked ? null : scored ? (
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
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};

/** Bottom sheet: one dancer's score per judge. */
const DancerSheet: React.FC<{
  dancer: Dancer;
  rank: number;
  cheer: string;
  judges: { id: string; code: string }[];
  locked: boolean;
  onClose: () => void;
}> = ({ dancer, rank, cheer, judges, locked, onClose }) => {
  const scored = isScored(dancer, PANEL_SIZE);
  const unranked = scored && rank > RANKED_UNTIL;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={stripBreakerPrefix(dancer.name)}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
      >
        <div className="flex items-start gap-3">
          <Avatar dancer={dancer} size="h-16 w-16 text-2xl" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-zinc-500">
              {!scored ? 'Đang chấm' : unranked ? `Hạng ${RANKED_UNTIL}+` : `Hạng ${rank}`}
              {dancer.sbd && <span className="font-mono"> · {dancer.sbd}</span>}
            </p>
            <h2 className="flex items-center gap-2 font-condensed text-3xl font-black uppercase leading-none">
              {stripBreakerPrefix(dancer.name)}
              <GenderBadge dancer={dancer} />
            </h2>
            {dancer.crew && <p className="mt-0.5 truncate text-sm text-zinc-500">{dancer.crew}</p>}
          </div>
          <button onClick={onClose} aria-label="Đóng" className="-m-1 rounded-full p-2 text-zinc-400 hover:bg-zinc-100 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {unranked ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-4 text-center text-sm leading-relaxed text-amber-900">{cheer}</p>
        ) : scored ? (
          <>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {judges.map((j) => (
                <div key={j.id} className="rounded-xl bg-zinc-50 py-2 text-center">
                  <p className="text-[10px] font-bold text-zinc-400">{j.code}</p>
                  <p className="font-condensed text-2xl font-black tabular-nums">{dancer.prelimScores[j.id] ?? '–'}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-end justify-between rounded-xl bg-zinc-900 px-4 py-3 text-white">
              <span className="text-sm font-bold">Tổng điểm</span>
              <span className="font-condensed text-4xl font-black tabular-nums leading-none">
                {dancer.prelimScoreTotal}
                <span className="text-base text-zinc-400"> / {judges.length * 100}</span>
              </span>
            </div>
            {locked && (
              <p className={`mt-3 text-center text-sm font-bold ${rank <= QUALIFY ? 'text-emerald-600' : 'text-zinc-500'}`}>
                {rank <= QUALIFY ? `Vào vòng Battle (Top ${QUALIFY})` : 'Dừng ở vòng loại'}
              </p>
            )}
          </>
        ) : (
          <p className="mt-4 rounded-xl bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
            Điểm sẽ hiện khi cả {judges.length} giám khảo chấm xong.
          </p>
        )}
      </div>
    </div>
  );
};
