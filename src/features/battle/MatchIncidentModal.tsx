import React, { useEffect, useState } from 'react';
import { Flag, RefreshCw, RotateCcw, X } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { BattleMatch } from '../../domain/types';
import { stripBreakerPrefix } from '../../shared/placeholderAssets';

type Side = 'red' | 'blue';
const LABEL: Record<Side, string> = { red: 'Góc Đỏ', blue: 'Góc Xanh' };

/**
 * Something went wrong around one battle: put another team / dancer in a corner (a swap after the draw, a
 * replacement), let a side withdraw (the other goes through and the bracket moves on), or undo it all.
 */
export const MatchIncidentModal: React.FC<{ match: BattleMatch | null; onClose: () => void }> = ({ match, onClose }) => {
  const { proTeams, newbieDancers, isNewbieTop32Locked, replaceMatchSide, forfeitMatch, resetMatch } = useTournament();
  const [pick, setPick] = useState<Record<Side, string>>({ red: '', blue: '' });

  useEffect(() => setPick({ red: '', blue: '' }), [match?.id]);
  useEffect(() => {
    if (!match) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [match, onClose]);

  if (!match) return null;

  const pro = match.category === 'pro_2v2';
  const started = match.status !== 'upcoming' || match.rounds.some((r) => r.isConfirmed || Object.values(r.votes).some(Boolean));
  const name = (s: BattleMatch['sideRed']) =>
    s.dancers.map((d) => stripBreakerPrefix(d.name)).join(' & ') || stripBreakerPrefix(s.name);
  const candidates = pro
    ? proTeams.map((t) => ({ id: t.id, label: `${t.name} · ${stripBreakerPrefix(t.dancer1.name)} & ${stripBreakerPrefix(t.dancer2.name)}`, top: true }))
    : newbieDancers.map((d, i) => ({
        id: d.id,
        label: `${d.sbd} · ${d.name}`,
        top: isNewbieTop32Locked ? Boolean(d.isQualifiedTop32) : i < 32,
      }));

  const swap = (side: Side) => {
    if (!pick[side]) return;
    if (started && !window.confirm('Trận đã có phiếu hoặc kết quả. Vẫn đổi người ở góc này?')) return;
    replaceMatchSide(match.id, side, pick[side]);
    setPick((p) => ({ ...p, [side]: '' }));
  };
  const withdraw = (side: Side) => {
    const s = side === 'red' ? match.sideRed : match.sideBlue;
    if (!window.confirm(`${name(s)} (${LABEL[side]}) bỏ cuộc? Bên kia đi tiếp, phiếu của trận này bị xoá.`)) return;
    forfeitMatch(match.id, side);
  };
  const reset = () => {
    if (!window.confirm('Đặt lại trận về 0–0: huỷ bỏ cuộc và mọi kết quả, xoá phiếu?')) return;
    resetMatch(match.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="incident-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl space-y-4 rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Xử lý sự cố</p>
            <h2 id="incident-title" className="font-condensed text-2xl font-black uppercase text-zinc-900">
              {match.stageName} · Trận {String(match.matchNumber).padStart(2, '0')}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="-m-1 rounded-full p-2 text-zinc-400 hover:bg-zinc-100 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {match.forfeitSide && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
            {LABEL[match.forfeitSide]} đã bỏ cuộc. Bấm “Đặt lại trận” để huỷ.
          </p>
        )}

        {(['red', 'blue'] as Side[]).map((side) => {
          const s = side === 'red' ? match.sideRed : match.sideBlue;
          return (
            <section key={side} className={`space-y-2 rounded-xl border-l-4 bg-zinc-50 p-3 ${side === 'red' ? 'border-red-500' : 'border-blue-500'}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0">
                  <span className={`block text-[10px] font-black uppercase tracking-widest ${side === 'red' ? 'text-red-600' : 'text-blue-600'}`}>
                    {LABEL[side]}
                  </span>
                  <span className="block truncate font-condensed text-xl font-black uppercase text-zinc-900">{name(s)}</span>
                  <span className="block truncate text-xs text-zinc-500">{pro ? `${s.name} · ${s.sbdText}` : s.sbdText}</span>
                </p>
                <button
                  onClick={() => withdraw(side)}
                  disabled={match.forfeitSide === side}
                  className="flex shrink-0 items-center gap-1.5 rounded border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer disabled:opacity-40"
                >
                  <Flag className="h-3.5 w-3.5" /> Bỏ cuộc
                </button>
              </div>
              <div className="flex gap-2">
                <select
                  value={pick[side]}
                  onChange={(e) => setPick((p) => ({ ...p, [side]: e.target.value }))}
                  aria-label={`Đổi ${LABEL[side]} sang`}
                  className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 py-2 text-xs font-bold text-zinc-900 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
                >
                  <option value="">{pro ? 'Đổi sang đội…' : 'Đổi sang thí sinh…'}</option>
                  <optgroup label={pro ? '16 đội' : 'Top 32'}>
                    {candidates.filter((c) => c.top && c.id !== s.id).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </optgroup>
                  {!pro && (
                    <optgroup label="Ngoài Top 32 (thay thế)">
                      {candidates.filter((c) => !c.top).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <button
                  onClick={() => swap(side)}
                  disabled={!pick[side]}
                  className="flex shrink-0 items-center gap-1.5 rounded bg-zinc-900 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-700 cursor-pointer disabled:opacity-40"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Đổi
                </button>
              </div>
            </section>
          );
        })}

        <div className="flex items-center justify-between gap-2 border-t border-zinc-200 pt-3">
          <p className="text-[11px] text-zinc-500">Người thắng tự vào trận kế tiếp; trận kế chưa đấu sẽ cập nhật theo.</p>
          <button
            onClick={reset}
            className="flex shrink-0 items-center gap-1.5 rounded border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Đặt lại trận
          </button>
        </div>
      </div>
    </div>
  );
};
