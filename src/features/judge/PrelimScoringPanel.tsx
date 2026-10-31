import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Delete, Loader2, Lock } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { soundFX } from '../../services/soundEffects';
import { Dancer } from '../../domain/types';
import { panelOfDancer, panelOfJudge, PrelimPanels } from '../../domain/model';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'] as const;

/** This judge's dancers in running order: checked in (an SBD) and of the judge's panel's parity, by SBD. */
function scoringOrder(list: Dancer[], judgeId: string, panels: PrelimPanels) {
  const panel = panelOfJudge(judgeId, panels);
  return list.filter((d) => panel && panelOfDancer(d, panels) === panel).sort((a, b) => a.sbd.localeCompare(b.sbd));
}

/**
 * Judge's prelim screen, one phone screen, no scrolling: who is dancing, the score being typed, a keypad,
 * and one button that saves and moves to the next dancer.
 */
export const PrelimScoringPanel: React.FC = () => {
  const {
    newbieDancers,
    proDancers,
    activeCategory,
    setActiveCategory,
    selectedJudgeId,
    updatePrelimScore,
    updateTieBreakScore,
    isNewbieTop32Locked,
    isProTop32Locked,
    prelimPanels,
  } = useTournament();

  const myPanel = panelOfJudge(selectedJudgeId, prelimPanels);
  const locked = activeCategory === 'newbie_1v1' ? isNewbieTop32Locked : isProTop32Locked;
  const categoryList = activeCategory === 'newbie_1v1' ? newbieDancers : proDancers;

  // Tie-break across the Top 32 cut-off: the flagged dancers, scored by all 8 judges whatever their panel.
  const tieDancers = useMemo(
    () => categoryList.filter((d) => d.tieBreak).sort((a, b) => a.sbd.localeCompare(b.sbd)),
    [categoryList]
  );
  const tieOpen = Boolean(myPanel) && tieDancers.length > 0 && !locked;
  const [mode, setMode] = useState<'prelim' | 'tie'>('prelim');
  useEffect(() => setMode(tieOpen ? 'tie' : 'prelim'), [tieOpen, activeCategory]);
  const tie = mode === 'tie' && tieOpen;

  const dancers = useMemo(
    () => (tie ? tieDancers : scoringOrder(categoryList, selectedJudgeId, prelimPanels)),
    [tie, tieDancers, categoryList, selectedJudgeId, prelimPanels]
  );
  const scoreOf = (d?: Dancer) => (tie ? d?.tieBreakScores?.[selectedJudgeId] : d?.prelimScores[selectedJudgeId]);
  // Tracked by id: the list re-sorts as scores arrive, an index would jump to someone else.
  const [dancerId, setDancerId] = useState<string | null>(null);
  const index = Math.max(0, dancers.findIndex((d) => d.id === dancerId));
  const dancer = dancers[index];
  const saved = scoreOf(dancer);

  const [input, setInput] = useState('');
  const [fresh, setFresh] = useState(true); // the first key replaces the shown (saved) score
  const [sending, setSending] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  // Score shown for this dancer: one still on its way to the server, else the saved one.
  const shown = dancer && sending[dancer.id] !== undefined ? sending[dancer.id] : saved;

  useEffect(() => {
    setInput(typeof shown === 'number' ? String(shown) : '');
    setFresh(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dancer?.id, selectedJudgeId]);

  // A saved score arriving updates the display, unless the judge has started typing a new one.
  useEffect(() => {
    if (fresh) setInput(typeof shown === 'number' ? String(shown) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  const value = input === '' ? null : Number(input);
  const dirty = value !== null && value !== shown;
  const hasNext = index < dancers.length - 1;
  const scoredCount = dancers.filter((d) => typeof scoreOf(d) === 'number').length;

  const goTo = (i: number) => {
    const next = dancers[Math.min(dancers.length - 1, Math.max(0, i))];
    if (next) setDancerId(next.id);
  };

  const press = (key: (typeof KEYS)[number]) => {
    if (locked || !dancer) return;
    soundFX.playVoteClick();
    if (key === 'clear') {
      setInput('');
    } else if (key === 'back') {
      setInput((s) => (fresh ? '' : s.slice(0, -1)));
    } else {
      const next = fresh || input === '0' ? key : input + key;
      if (Number(next) > 100) return; // 0–100 only; ignore the extra digit
      setInput(next);
    }
    setFresh(false);
  };

  const save = () => {
    if (!dancer || locked || value === null) return;
    if (!dirty) return hasNext && goTo(index + 1);
    const target = dancer;
    soundFX.playVoteConfirmed();
    setError(null);
    setSending((s) => ({ ...s, [target.id]: value }));
    (tie ? updateTieBreakScore : updatePrelimScore)(activeCategory, target.id, selectedJudgeId, value).then((ok) => {
      setSending(({ [target.id]: _, ...rest }) => rest);
      if (!ok) setError(`Chưa lưu được điểm ${target.name}. Quay lại thí sinh này và bấm Lưu lần nữa.`);
    });
    if (hasNext) goTo(index + 1);
  };

  // Hardware keyboard (tablet, laptop at the judges' table).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (/^\d$/.test(e.key)) press(e.key as (typeof KEYS)[number]);
      else if (e.key === 'Backspace') press('back');
      else if (e.key === 'Enter') save();
      else if (e.key === 'ArrowRight') goTo(index + 1);
      else if (e.key === 'ArrowLeft') goTo(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const status =
    dancer && sending[dancer.id] !== undefined
      ? { text: 'Đang gửi…', tone: 'text-amber-700' }
      : typeof saved === 'number' && !dirty
        ? { text: 'Đã lưu', tone: 'text-emerald-700' }
        : typeof saved === 'number'
          ? { text: `Đã lưu ${saved}`, tone: 'text-zinc-500' }
          : { text: 'Chưa chấm', tone: 'text-zinc-500' };

  const saveLabel = locked
    ? 'Prelim đã chốt'
    : value === null
      ? 'Nhập điểm'
      : dirty
        ? `Lưu ${value} điểm`
        : hasNext
          ? 'Thí sinh tiếp theo'
          : 'Đã chấm xong';

  return (
    <div className="grid flex-1 min-h-0 grid-rows-[2fr_1fr]">
      {/* Top two thirds: who, the score, confirm */}
      <div className="flex min-h-0 flex-col gap-2 p-2.5">
        {/* Category + progress (tap the counter to jump to any dancer) */}
        <div className="flex items-center justify-between gap-2 shrink-0">
          <div className="flex rounded-lg bg-zinc-100 p-0.5" role="group" aria-label="Hạng mục">
            {(
              [
                ['pro_2v2', 'Pro'],
                ['newbie_1v1', 'Newbie'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => {
                  setActiveCategory(id);
                  setDancerId(null);
                }}
                aria-pressed={activeCategory === id}
                className={`rounded-md px-3 py-1.5 text-xs font-black uppercase cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 ${
                  activeCategory === id ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {tieOpen ? (
            <div className="flex rounded-lg bg-zinc-100 p-0.5" role="group" aria-label="Chấm vòng loại hoặc tie-break">
              <button
                onClick={() => {
                  setMode('prelim');
                  setDancerId(null);
                }}
                aria-pressed={!tie}
                className={`rounded-md px-2.5 py-1.5 text-xs font-black uppercase cursor-pointer ${!tie ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500'}`}
              >
                Bảng {myPanel}
              </button>
              <button
                onClick={() => {
                  setMode('tie');
                  setDancerId(null);
                }}
                aria-pressed={tie}
                className={`rounded-md px-2.5 py-1.5 text-xs font-black uppercase cursor-pointer ${tie ? 'bg-red-600 text-white' : 'text-red-600'}`}
              >
                Tie-break ({tieDancers.length})
              </button>
            </div>
          ) : (
            myPanel && (
              <span className="rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs font-black uppercase text-white">
                Bảng {myPanel} · SBD {(myPanel === 'A') === prelimPanels.aIsOdd ? 'lẻ' : 'chẵn'}
              </span>
            )
          )}
          <label className="relative flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-bold text-zinc-600 tabular-nums">
            {scoredCount}/{dancers.length}
            <ChevronRight className="w-3.5 h-3.5 rotate-90 text-zinc-400" />
            <select
              value={dancer?.id ?? ''}
              onChange={(e) => setDancerId(e.target.value)}
              aria-label="Chọn thí sinh"
              className="absolute inset-0 opacity-0 cursor-pointer"
            >
              {dancers.map((d) => (
                <option key={d.id} value={d.id}>
                  {typeof scoreOf(d) === 'number' ? '✓ ' : ''}
                  {d.sbd ? `${d.sbd} · ` : ''}
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        </div>
  
        {/* Who is dancing + the score being entered */}
        {dancer ? (
          <section
            aria-label="Thí sinh đang chấm"
            className={`flex min-h-0 flex-1 flex-col rounded-2xl border-2 p-3 transition-colors ${
              dirty ? 'border-amber-400 bg-amber-50' : typeof saved === 'number' ? 'border-emerald-300 bg-emerald-50/60' : 'border-zinc-200 bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              {dancer.avatarUrl && (
                <img src={dancer.avatarUrl} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover bg-zinc-100" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm font-black text-zinc-500">
                  {dancer.sbd || '—'} <span className="font-sans font-bold text-zinc-400">· {index + 1}/{dancers.length}</span>
                </p>
                <h2 className="font-condensed text-[1.75rem] font-black uppercase leading-[1.05] text-zinc-900 line-clamp-2 break-words">
                  {dancer.name}
                </h2>
                {dancer.crew && <p className="truncate text-xs text-zinc-500">{dancer.crew}</p>}
              </div>
            </div>
            {/* The score, as large as the space allows */}
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center" aria-live="polite">
              <p className="font-condensed font-black leading-none tabular-nums">
                <span className={`text-[clamp(3.5rem,14vh,7rem)] ${value === null ? 'text-zinc-300' : 'text-zinc-900'}`}>{value ?? '–'}</span>
                <span className="text-2xl text-zinc-400"> /100</span>
              </p>
              <span className={`mt-1 flex items-center gap-1 text-xs font-bold ${status.tone}`}>
                {sending[dancer.id] !== undefined ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : typeof saved === 'number' && !dirty ? (
                  <Check className="w-3.5 h-3.5" />
                ) : null}
                {status.text}
              </span>
            </div>
          </section>
        ) : (
          <p className="flex flex-1 items-center justify-center rounded-2xl border border-zinc-200 p-6 text-center text-sm text-zinc-500">
            {myPanel
              ? 'Chưa có thí sinh bảng này: thí sinh hiện ra sau khi check-in và có số báo danh.'
              : 'Giám khảo này không chấm Prelim.'}
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 shrink-0">
            {error}
          </p>
        )}

        {/* Prev · Save (and next) · Next */}
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            aria-label="Thí sinh trước"
            className="w-12 rounded-xl border border-zinc-300 bg-white text-zinc-700 disabled:opacity-30 cursor-pointer flex items-center justify-center focus-visible:outline-2 focus-visible:outline-amber-500"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={save}
            disabled={locked || value === null || (!dirty && !hasNext)}
            className="flex-1 py-3.5 rounded-xl bg-amber-500 text-zinc-950 font-black text-base uppercase tracking-wide active:bg-amber-600 disabled:bg-zinc-200 disabled:text-zinc-500 cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-zinc-900"
          >
            {locked ? <Lock className="w-4 h-4" /> : dirty ? <Check className="w-5 h-5 stroke-[3]" /> : null}
            {saveLabel}
            {!locked && (dirty || value !== null) && hasNext && <ChevronRight className="w-5 h-5" />}
          </button>
          <button
            onClick={() => goTo(index + 1)}
            disabled={!hasNext}
            aria-label="Thí sinh sau"
            className="w-12 rounded-xl border border-zinc-300 bg-white text-zinc-700 disabled:opacity-30 cursor-pointer flex items-center justify-center focus-visible:outline-2 focus-visible:outline-amber-500"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Keypad: fixed to the bottom third, in the thumb zone */}
      <div className="grid min-h-0 grid-cols-3 grid-rows-4 gap-1.5 border-t border-zinc-200 bg-zinc-50 p-2">
        {KEYS.map((key) => (
          <button
            key={key}
            onClick={() => press(key)}
            disabled={locked || !dancer}
            aria-label={key === 'clear' ? 'Xoá hết' : key === 'back' ? 'Xoá số cuối' : key}
            className={`min-h-11 rounded-xl border font-condensed font-black transition-colors cursor-pointer disabled:opacity-40 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-amber-500 ${
              key === 'clear' || key === 'back'
                ? 'border-zinc-200 bg-zinc-100 text-zinc-600 text-base active:bg-zinc-300'
                : 'border-zinc-200 bg-white text-zinc-900 text-3xl shadow-xs active:bg-zinc-200'
            }`}
          >
            {key === 'clear' ? 'C' : key === 'back' ? <Delete className="w-6 h-6" /> : key}
          </button>
        ))}
      </div>
    </div>
  );
};
