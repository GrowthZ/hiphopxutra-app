import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Delete, Loader2, Lock, Zap } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { soundFX } from '../../services/soundEffects';
import { CategoryType, Dancer } from '../../domain/types';
import { panelOfDancer, panelOfJudge, PrelimPanels } from '../../domain/model';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'] as const;

// Pro and Newbie each have their own colour, so a judge sees at a glance which list is being scored.
// Red stays for the tie-break (and red / blue for the battle corners), so neither category uses them.
const THEMES: Record<CategoryType, { short: string; page: string; pad: string; pill: string; card: string; ring: string; glow: string; text: string; badge: string }> = {
  pro_2v2: {
    short: 'Pro',
    page: 'bg-violet-100',
    pad: 'bg-violet-200/60',
    pill: 'bg-violet-600 text-white',
    card: 'border-violet-300',
    ring: 'ring-violet-500',
    glow: 'shadow-violet-500/70',
    text: 'text-violet-700',
    badge: 'bg-violet-600 text-white',
  },
  newbie_1v1: {
    short: 'Newbie',
    page: 'bg-sky-100',
    pad: 'bg-sky-200/60',
    pill: 'bg-sky-600 text-white',
    card: 'border-sky-300',
    ring: 'ring-sky-500',
    glow: 'shadow-sky-500/70',
    text: 'text-sky-700',
    badge: 'bg-sky-600 text-white',
  },
};
const TIE_THEME = { page: 'bg-red-100', pad: 'bg-red-200/50', card: 'border-red-300', badge: 'bg-red-600 text-white' };

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
  // Avatar strip: 4 in view, scrolled one dancer at a time (arrows or a swipe); it follows the dancer being scored.
  const stripRef = useRef<HTMLDivElement>(null);
  const scrollStrip = (step: number) => {
    const strip = stripRef.current;
    if (strip) strip.scrollBy({ left: step * (strip.clientWidth / 4), behavior: 'smooth' });
  };
  const currentId = dancers[index]?.id;
  useEffect(() => {
    const strip = stripRef.current;
    const item = currentId ? strip?.querySelector<HTMLElement>(`[data-dancer="${currentId}"]`) : null;
    if (strip && item) strip.scrollTo({ left: item.offsetLeft - strip.offsetLeft, behavior: 'smooth' });
  }, [currentId]);
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

  const theme = tie ? TIE_THEME : THEMES[activeCategory];
  const tieTotal = tieDancers[0]?.prelimScoreTotal;

  return (
    <div className={`grid flex-1 min-h-0 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,2fr)_minmax(13.25rem,1fr)] transition-colors ${theme.page}`}>
      {/* Top two thirds: who, the score, confirm */}
      <div className="flex min-h-0 flex-col gap-2 p-2.5">
        {/* Category (coloured, so Pro and Newbie never get mixed up) + panel / tie-break + progress */}
        <div className="flex items-center justify-between gap-1.5 shrink-0">
          {/* Which list this is (switched from the menu: Prelim Pro / Prelim Newbie) */}
          <span className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-black uppercase ${THEMES[activeCategory].pill}`}>
            {THEMES[activeCategory].short}
          </span>
          {tieOpen ? (
            <div className="flex rounded-lg bg-white/80 p-0.5 ring-1 ring-black/5" role="group" aria-label="Chấm vòng loại hoặc tie-break">
              <button
                onClick={() => {
                  setMode('prelim');
                  setDancerId(null);
                }}
                aria-pressed={!tie}
                className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-black uppercase cursor-pointer ${!tie ? 'bg-zinc-900 text-white' : 'text-zinc-500'}`}
              >
                <span className="max-[360px]:hidden">Bảng </span>{myPanel}
              </button>
              <button
                onClick={() => {
                  setMode('tie');
                  setDancerId(null);
                }}
                aria-pressed={tie}
                className={`flex items-center gap-0.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-black uppercase cursor-pointer ${tie ? 'bg-red-600 text-white' : 'text-red-600'}`}
              >
                <Zap className="h-3 w-3" /> Tie ({tieDancers.length})
              </button>
            </div>
          ) : (
            myPanel && (
              <span className="whitespace-nowrap rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs font-black uppercase text-white">
                Bảng {myPanel}<span className="max-[380px]:hidden"> · {(myPanel === 'A') === prelimPanels.aIsOdd ? 'lẻ' : 'chẵn'}</span>
              </span>
            )
          )}
          <label className="relative flex items-center gap-1 rounded-lg bg-white/80 px-2.5 py-1.5 text-xs font-bold text-zinc-600 tabular-nums ring-1 ring-black/5">
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

        {tie ? (
          /* Tie-break: why these dancers are back, and each of them at a tap */
          <section aria-label="Tie-break đồng điểm" className="shrink-0 rounded-xl bg-red-600 px-3 py-2 text-white shadow-sm">
            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide">
              <Zap className="h-3.5 w-3.5" /> Tie-break ngưỡng Top 32{typeof tieTotal === 'number' && ` · đồng ${tieTotal} điểm`}
            </p>
            <p className="text-[11px] leading-snug text-white/85 [@media(max-height:600px)]:hidden">
              Cả 8 giám khảo chấm thêm 1 lượt · điểm này chỉ để tách hạng
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {tieDancers.map((d) => {
                const done = typeof scoreOf(d) === 'number';
                return (
                  <button
                    key={d.id}
                    onClick={() => setDancerId(d.id)}
                    aria-pressed={d.id === dancer?.id}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[11px] font-black cursor-pointer ${
                      d.id === dancer?.id ? 'bg-white text-red-700' : 'bg-white/15 text-white'
                    }`}
                  >
                    {done && <Check className="h-3 w-3" />}
                    {d.sbd || '—'}
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          tieOpen && (
            <button
              onClick={() => {
                setMode('tie');
                setDancerId(null);
              }}
              className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-black text-red-700 cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5" /> Có tie-break: {tieDancers.length} thí sinh cần chấm lại
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )
        )}

        {/* Running order, scrolled one dancer at a time: the one being scored lit up, scored ones greyed out */}
        {!tie && dancers.length > 1 && (
          <nav aria-label="Thứ tự thí sinh" className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => scrollStrip(-1)}
              aria-label="Cuộn sang trái"
              className="flex h-12 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80 text-zinc-600 ring-1 ring-black/5 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div
              ref={stripRef}
              className="flex min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {dancers.map((d) => {
                const done = typeof scoreOf(d) === 'number';
                const current = d.id === dancer?.id;
                return (
                  <button
                    key={d.id}
                    data-dancer={d.id}
                    onClick={() => setDancerId(d.id)}
                    aria-current={current ? 'step' : undefined}
                    aria-label={`${d.sbd} ${d.name}${done ? ', đã chấm' : ''}`}
                    className="flex w-1/4 shrink-0 snap-start flex-col items-center gap-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
                  >
                    <span
                      className={`relative rounded-full transition-shadow ${
                        current ? `ring-[3px] ${THEMES[activeCategory].ring} shadow-[0_0_14px_3px] ${THEMES[activeCategory].glow}` : ''
                      } ${done && !current ? 'opacity-40 grayscale' : ''}`}
                    >
                      {d.avatarUrl ? (
                        <img src={d.avatarUrl} alt="" className="h-10 w-10 rounded-full bg-zinc-100 object-cover [@media(max-height:600px)]:h-8 [@media(max-height:600px)]:w-8" />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 font-condensed text-lg font-black text-zinc-500 [@media(max-height:600px)]:h-8 [@media(max-height:600px)]:w-8">
                          {d.name.replace(/^(BBOY|BGIRL)\s+/i, '').charAt(0)}
                        </span>
                      )}
                      {done && (
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white">
                          <Check className="h-2.5 w-2.5 stroke-[4]" />
                        </span>
                      )}
                    </span>
                    <span
                      className={`font-mono text-[11px] font-black leading-none ${
                        current ? THEMES[activeCategory].text : done ? 'text-zinc-400' : 'text-zinc-800'
                      }`}
                    >
                      {d.sbd || '—'}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => scrollStrip(1)}
              aria-label="Cuộn sang phải"
              className="flex h-12 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80 text-zinc-600 ring-1 ring-black/5 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </nav>
        )}

        {/* Who is dancing + the score being entered */}
        {dancer ? (
          <section
            aria-label="Thí sinh đang chấm"
            className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border-2 p-3 shadow-sm transition-colors [@media(max-height:600px)]:p-2 ${
              dirty ? 'border-amber-400 bg-amber-50' : typeof saved === 'number' ? 'border-emerald-300 bg-emerald-50' : `${theme.card} bg-white`
            }`}
          >
            <div className="flex items-center gap-3">
              {dancer.avatarUrl && (
                <img src={dancer.avatarUrl} alt="" className={`${tie ? 'h-16 w-16' : 'h-20 w-20'} [@media(max-height:600px)]:h-12 [@media(max-height:600px)]:w-12 shrink-0 rounded-full object-cover bg-zinc-100`} />
              )}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-bold">
                  <span className={`rounded px-1.5 py-0.5 font-mono text-base font-black ${theme.badge}`}>{dancer.sbd || '—'}</span>
                  <span className="text-zinc-400">
                    {index + 1}/{dancers.length}
                  </span>
                </p>
                <h2 className={`mt-0.5 font-condensed ${tie ? 'text-[1.85rem]' : 'text-[2.1rem]'} font-black uppercase leading-none text-zinc-900 line-clamp-2 break-words [@media(max-height:600px)]:text-2xl [@media(max-height:600px)]:line-clamp-1`}>
                  {dancer.name}
                </h2>
                {dancer.crew && <p className="mt-0.5 truncate text-sm text-zinc-500 [@media(max-height:600px)]:hidden">{dancer.crew}</p>}
              </div>
            </div>
            {/* The score */}
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden" aria-live="polite">
              <p className="font-condensed font-black leading-none tabular-nums">
                <span
                  className={`${tie ? 'text-[clamp(2.75rem,8vh,5rem)]' : 'text-[clamp(3.25rem,12vh,6.5rem)]'} ${
                    value === null ? 'text-zinc-300' : 'text-zinc-900'
                  }`}
                >
                  {value ?? '–'}
                </span>
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
          <p className="flex flex-1 items-center justify-center rounded-2xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
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
            className="flex-1 py-3.5 rounded-xl bg-amber-500 text-zinc-950 font-black text-base max-[380px]:text-sm uppercase tracking-wide whitespace-nowrap active:bg-amber-600 disabled:bg-zinc-200 disabled:text-zinc-500 cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-zinc-900"
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
      <div className={`grid min-h-0 grid-cols-3 grid-rows-4 gap-1.5 border-t border-black/5 p-2 ${theme.pad}`}>
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
