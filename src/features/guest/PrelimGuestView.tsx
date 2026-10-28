import React, { useMemo, useState } from 'react';
import { Check, ChevronRight, Search, X } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { Dancer } from '../../domain/types';
import { stripBreakerPrefix } from '../../shared/placeholderAssets';
import { GuestHeader } from './GuestBattleView';

// Public prelim results (/ket-qua/prelim), phone first: one column, total score only; tap a dancer for details.
// Reads the published copy: a dancer's scores appear only once all 4 prelim judges have scored (KG-06).

type Scope = 'top10' | 'top15' | 'top32' | 'all';
const QUALIFY = 32;
const RANK_STYLE = ['bg-amber-400 text-amber-950', 'bg-zinc-300 text-zinc-800', 'bg-orange-300 text-orange-950'];

const isScored = (d: Dancer, judges: number) => Object.keys(d.prelimScores ?? {}).length >= judges;

const Avatar: React.FC<{ dancer: Dancer; size: string }> = ({ dancer, size }) =>
  dancer.avatarUrl ? (
    <img src={dancer.avatarUrl} alt="" loading="lazy" decoding="async" className={`${size} shrink-0 rounded-full object-cover bg-zinc-100`} />
  ) : (
    <span className={`${size} shrink-0 rounded-full bg-zinc-100 text-zinc-400 font-condensed font-black flex items-center justify-center`}>
      {stripBreakerPrefix(dancer.name).charAt(0)}
    </span>
  );

export const PrelimGuestView: React.FC = () => {
  const { activeCategory, setActiveCategory, newbieDancers, proDancers, prelimJudges, isNewbieTop32Locked, isProTop32Locked } =
    useTournament();

  const [scope, setScope] = useState<Scope>('top10');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Dancer | null>(null);

  const locked = activeCategory === 'newbie_1v1' ? isNewbieTop32Locked : isProTop32Locked;
  const judgeCount = prelimJudges.length || 4;

  // Ranked by total; dancers still being scored go last, by SBD.
  const ranked = useMemo(() => {
    const list = activeCategory === 'newbie_1v1' ? newbieDancers : proDancers;
    return [...list].sort(
      (a, b) =>
        Number(isScored(b, judgeCount)) - Number(isScored(a, judgeCount)) ||
        b.prelimScoreTotal - a.prelimScoreTotal ||
        a.sbd.localeCompare(b.sbd)
    );
  }, [activeCategory, newbieDancers, proDancers, judgeCount]);
  const scoredCount = ranked.filter((d) => isScored(d, judgeCount)).length;

  // While judging is on, only a provisional top 10/15 is public.
  const effectiveScope: Scope = locked ? scope : scope === 'top15' ? 'top15' : 'top10';
  const limit = { top10: 10, top15: 15, top32: QUALIFY, all: Infinity }[effectiveScope];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const withRank = ranked.map((d, i) => ({ dancer: d, rank: i + 1 }));
    if (q) return withRank.filter(({ dancer }) => [dancer.name, dancer.sbd].some((f) => f.toLowerCase().includes(q)));
    return withRank.slice(0, limit);
  }, [ranked, query, limit]);

  const podium = ranked.slice(0, 3).filter((d) => isScored(d, judgeCount));
  const scopes: [Scope, string][] = locked
    ? [['top10', 'Top 10'], ['top32', 'Top 32'], ['all', `Tất cả (${ranked.length})`]]
    : [['top10', 'Top 10'], ['top15', 'Top 15']];

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
            Bảng xếp hạng tạm thời. Danh sách đầy đủ và Top {QUALIFY} vào vòng Battle công bố khi chấm xong.
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
                <span className={`mb-1.5 rounded-full px-2 py-0.5 text-[11px] font-black ${RANK_STYLE[i]}`}>#{i + 1}</span>
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
            placeholder="Tìm tên hoặc số báo danh"
            aria-label="Tìm thí sinh"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm placeholder:text-zinc-400 focus-visible:outline-2 focus-visible:outline-amber-500"
          />
        </label>

        {/* Ranking: rank · photo · name · total */}
        <ol className="overflow-hidden rounded-2xl border border-zinc-200 bg-white" aria-label="Bảng xếp hạng">
          {visible.length === 0 && <li className="px-4 py-8 text-center text-sm text-zinc-500">Không tìm thấy thí sinh.</li>}
          {visible.map(({ dancer: d, rank }) => {
            const scored = isScored(d, judgeCount);
            return (
              <React.Fragment key={d.id}>
                {locked && rank === QUALIFY + 1 && !query && (
                  <li className="flex items-center gap-2 bg-zinc-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-400">
                    <span className="h-px flex-1 bg-zinc-200" />
                    Dừng ở vòng loại
                    <span className="h-px flex-1 bg-zinc-200" />
                  </li>
                )}
                <li className="border-t border-zinc-100 first:border-t-0">
                  <button
                    onClick={() => setSelected(d)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-50 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-amber-500"
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black tabular-nums ${
                        scored && rank <= 3 ? RANK_STYLE[rank - 1] : 'text-zinc-500'
                      }`}
                    >
                      {scored ? rank : '–'}
                    </span>
                    <Avatar dancer={d} size="h-10 w-10 text-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-condensed text-lg font-black uppercase leading-tight">{stripBreakerPrefix(d.name)}</span>
                      <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                        {d.sbd && <span className="font-mono">{d.sbd}</span>}
                        {locked && rank <= QUALIFY && (
                          <span className="flex items-center gap-0.5 font-bold text-emerald-600">
                            <Check className="h-3 w-3" /> Vào Battle
                          </span>
                        )}
                      </span>
                    </span>
                    {scored ? (
                      <span className="text-right">
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
          judges={prelimJudges.map((j) => ({ id: j.id, code: j.code }))}
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
  judges: { id: string; code: string }[];
  locked: boolean;
  onClose: () => void;
}> = ({ dancer, rank, judges, locked, onClose }) => {
  const scored = isScored(dancer, judges.length || 4);
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
              {scored ? `Hạng ${rank}` : 'Đang chấm'}
              {dancer.sbd && <span className="font-mono"> · {dancer.sbd}</span>}
            </p>
            <h2 className="font-condensed text-3xl font-black uppercase leading-none">{stripBreakerPrefix(dancer.name)}</h2>
            {dancer.crew && <p className="mt-0.5 truncate text-sm text-zinc-500">{dancer.crew}</p>}
          </div>
          <button onClick={onClose} aria-label="Đóng" className="-m-1 rounded-full p-2 text-zinc-400 hover:bg-zinc-100 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {scored ? (
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
