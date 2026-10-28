import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { PANEL_SIZE, PanelId, PrelimPanels } from '../../domain/model';

type Seat = PanelId | '';

/** Admin: which 4 judges score panel A and which 4 panel B, and which SBD parity goes to A. */
export const PrelimPanelsCard: React.FC = () => {
  const { judges, prelimPanels, setPrelimPanels, newbieDancers, proDancers } = useTournament();
  const [draft, setDraft] = useState<PrelimPanels>(prelimPanels);
  useEffect(() => setDraft(prelimPanels), [prelimPanels]);

  const seatOf = (id: string): Seat => (draft.A.includes(id) ? 'A' : draft.B.includes(id) ? 'B' : '');
  const seat = (id: string, to: Seat) =>
    setDraft((d) => ({
      ...d,
      A: to === 'A' ? [...d.A.filter((j) => j !== id), id] : d.A.filter((j) => j !== id),
      B: to === 'B' ? [...d.B.filter((j) => j !== id), id] : d.B.filter((j) => j !== id),
    }));
  // Keep each panel in judge order (GK 01, 02…), so score columns stay stable.
  const ordered = (ids: string[]) => judges.map((j) => j.id).filter((id) => ids.includes(id));

  const valid = draft.A.length === PANEL_SIZE && draft.B.length === PANEL_SIZE;
  const changed = JSON.stringify({ ...draft, A: ordered(draft.A), B: ordered(draft.B) }) !== JSON.stringify(prelimPanels);
  const scoresExist = [...newbieDancers, ...proDancers].some((d) => Object.keys(d.prelimScores ?? {}).length > 0);

  const save = () => {
    if (!valid) return;
    if (scoresExist && !window.confirm('Đã có điểm Prelim. Đổi bảng chấm có thể làm lệch điểm của các thí sinh đã chấm. Vẫn đổi?')) return;
    setPrelimPanels({ ...draft, A: ordered(draft.A), B: ordered(draft.B) });
  };

  const parityLabel = (panel: PanelId) => ((panel === 'A') === draft.aIsOdd ? 'SBD lẻ' : 'SBD chẵn');

  return (
    <section className="rounded border border-zinc-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-600" />
          <h2 className="text-sm font-black uppercase text-zinc-900">Bảng chấm Prelim</h2>
          <span className="text-xs text-zinc-500">8 giám khảo, mỗi thí sinh do 4 GK của bảng mình chấm · Pro trước, Newbie sau</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="text-zinc-500">Bảng A chấm:</span>
          <div className="flex rounded border border-zinc-300 bg-white p-0.5" role="group" aria-label="Bảng A chấm SBD">
            {([true, false] as const).map((odd) => (
              <button
                key={String(odd)}
                onClick={() => setDraft((d) => ({ ...d, aIsOdd: odd }))}
                aria-pressed={draft.aIsOdd === odd}
                className={`rounded px-3 py-1 cursor-pointer ${draft.aIsOdd === odd ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
              >
                {odd ? 'SBD lẻ' : 'SBD chẵn'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {judges.map((j) => {
          const s = seatOf(j.id);
          return (
            <div key={j.id} className="flex items-center justify-between gap-2 rounded border border-zinc-200 px-2.5 py-1.5">
              <span className="min-w-0 truncate text-xs font-bold text-zinc-800">
                <span className="font-mono text-zinc-400">{j.code}</span> {j.judgeName}
              </span>
              <div className="flex shrink-0 rounded bg-zinc-100 p-0.5 text-[11px] font-black" role="group" aria-label={`Bảng của ${j.judgeName || j.code}`}>
                {(['A', 'B', ''] as const).map((p) => (
                  <button
                    key={p || 'none'}
                    onClick={() => seat(j.id, p)}
                    aria-pressed={s === p}
                    title={p ? `Bảng ${p} (${parityLabel(p)})` : 'Không chấm Prelim'}
                    className={`min-w-6 rounded px-1.5 py-0.5 cursor-pointer ${
                      s === p ? (p === 'A' ? 'bg-amber-500 text-zinc-950' : p === 'B' ? 'bg-sky-600 text-white' : 'bg-white text-zinc-700') : 'text-zinc-500'
                    }`}
                  >
                    {p || '—'}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className={valid ? 'text-zinc-500' : 'font-bold text-red-600'}>
          Bảng A ({parityLabel('A')}): {draft.A.length}/{PANEL_SIZE} GK · Bảng B ({parityLabel('B')}): {draft.B.length}/{PANEL_SIZE} GK
          {!valid && ' · mỗi bảng cần đúng 4 giám khảo'}
        </span>
        {changed && (
          <button
            onClick={save}
            disabled={!valid}
            className="rounded bg-zinc-900 px-4 py-2 font-black uppercase text-white hover:bg-zinc-700 disabled:opacity-40 cursor-pointer"
          >
            Lưu bảng chấm
          </button>
        )}
      </div>
    </section>
  );
};
