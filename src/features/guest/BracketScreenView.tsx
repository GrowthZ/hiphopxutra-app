import React, { useEffect, useMemo, useState } from 'react';
import { Crown, Maximize } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { CategoryType } from '../../domain/types';
import { bracketLayout, BracketSlot } from '../../domain/bracketLayout';
import { stripBreakerPrefix } from '../../shared/placeholderAssets';

// /ket-qua/so-do: the knockout tree for everyone (phones, TV, LED), live. Like a printed bracket: the first half of
// the first stage on the left, the second half on the right, each side narrowing to its finalist, the champion in the
// middle. Drawn on a fixed 1920×1080 canvas scaled to the window; on a phone it stays readable and scrolls.
// ?hang-muc=newbie|pro picks the tab (Pro by default).

const W = 1920;
const H = 1080;
const TOP = 190; // bracket area
const BOTTOM = 1050;
const EDGE = 28; // outer margin
const MIDDLE_GAP = 70; // between the two finalists

const CATEGORIES: [CategoryType, string][] = [
  ['pro_2v2', 'Kid Pro 2vs2'],
  ['newbie_1v1', 'Kid Newbie 1vs1'],
];
const START: CategoryType = new URLSearchParams(window.location.search).get('hang-muc') === 'newbie' ? 'newbie_1v1' : 'pro_2v2';

const STAGE_LABEL: Record<string, string> = { top32: 'Top 32', top16: 'Top 16', top8: 'Tứ kết', top4: 'Bán kết', final: 'Chung kết' };

/** The fullscreen button shows only while the mouse moves, so it never covers a slot on the TV. */
function useIdle(ms = 3000) {
  const [idle, setIdle] = useState(true);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), ms);
    };
    window.addEventListener('mousemove', wake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', wake);
    };
  }, [ms]);
  return idle;
}

function useFit() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const fit = Math.min(size.w / W, size.h / H);
  // Phones: keep the names readable and let the page scroll instead.
  return { scale: size.w < 1000 ? Math.max(fit, 0.45) : fit, scrolls: size.w < W * Math.max(fit, 0.45) };
}

export const BracketScreenView: React.FC = () => {
  const { matches, activeMatchId } = useTournament();
  const [category, setCategory] = useState<CategoryType>(START);
  const { scale, scrolls } = useFit();
  const idle = useIdle();
  const layout = useMemo(() => bracketLayout(matches, category, activeMatchId), [matches, category, activeMatchId]);

  const columns = layout.columns.length; // the last one is the final's two slots
  const perSide = columns - 1; // columns on each side before the final
  const pro = category === 'pro_2v2';
  const slotW = columns > 4 ? 158 : 196;
  const step = columns > 1 ? (W / 2 - MIDDLE_GAP / 2 - EDGE - slotW) / perSide : 0;
  const first = layout.columns[0]?.length ?? 0;
  const slotH = Math.min(70, Math.floor(((BOTTOM - TOP) / Math.max(first / 2, 1)) * 0.78));

  /** Slot `i` of one side's column `c`: left edge x and centre y. */
  const place = (c: number, i: number, count: number, right: boolean) => {
    const x = EDGE + c * step;
    return { x: right ? W - x - slotW : x, y: TOP + ((i + 0.5) * (BOTTOM - TOP)) / count };
  };

  const lines: React.ReactNode[] = [];
  const boxes: React.ReactNode[] = [];
  for (let c = 0; c < columns; c++) {
    const col = layout.columns[c];
    const final = c === columns - 1;
    const half = final ? 1 : col.length / 2;
    col.forEach((slot, idx) => {
      const right = final ? idx === 1 : idx >= half;
      const i = final ? 0 : right ? idx - half : idx;
      const { x, y } = place(c, i, half, right);
      boxes.push(<Slot key={`${c}-${idx}`} slot={slot} pro={pro} style={{ left: x, top: y - slotH / 2, width: slotW, height: slotH }} compact={columns > 4} />);

      if (final) return;
      // Connector to the next column: out from the inner edge, along to the pair's middle, then into the next slot.
      const next = place(c + 1, Math.floor(i / 2), half / 2 || 1, right);
      const fromX = right ? x : x + slotW;
      const midX = right ? fromX - (step - slotW) / 2 : fromX + (step - slotW) / 2;
      const toX = right ? next.x + slotW : next.x;
      const lit = Boolean(slot.won);
      const stroke = lit ? '#be123c' : '#d4d4d8';
      lines.push(
        <path
          key={`l-${c}-${idx}`}
          d={`M ${fromX} ${y} H ${midX} V ${next.y} H ${toX}`}
          fill="none"
          stroke={stroke}
          strokeWidth={lit ? 4 : 2.5}
        />
      );
    });
  }

  // Finalists to the champion box above them.
  const finalY = TOP + (BOTTOM - TOP) / 2;
  const crownTop = finalY - slotH / 2 - 250;
  const champion = layout.champion;
  const finalLit = Boolean(layout.columns[columns - 1]?.some((s) => s.won));
  lines.push(
    <path
      key="final"
      d={`M ${W / 2 - MIDDLE_GAP / 2} ${finalY} H ${W / 2 + MIDDLE_GAP / 2} M ${W / 2} ${finalY} V ${crownTop + 190}`}
      fill="none"
      stroke={finalLit ? '#be123c' : '#d4d4d8'}
      strokeWidth={finalLit ? 4 : 2.5}
    />
  );

  return (
    <div className="fixed inset-0 overflow-auto bg-zinc-200">
      <div style={{ width: W * scale, height: H * scale }} className="relative mx-auto">
        <div
          className="absolute left-0 top-0 origin-top-left overflow-hidden bg-zinc-50 text-zinc-900"
          style={{ width: W, height: H, transform: `scale(${scale})` }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background:repeating-linear-gradient(115deg,#be123c_0_2px,transparent_2px_46px)]" />

          {/* Header */}
          <header className="absolute inset-x-0 top-0 flex h-[150px] items-center gap-8 border-b border-zinc-200 bg-white px-12">
            <img src="/logo.png" alt="HipHop Xứ Trà U16" className="h-[110px] w-auto" />
            <div className="flex-1">
              <p className="text-2xl font-bold uppercase tracking-[0.3em] text-zinc-400">Sơ đồ thi đấu</p>
              <h1 className="pb-1 font-condensed text-7xl font-black uppercase leading-[1.05] text-zinc-900">Knockout</h1>
            </div>
            <div className="flex rounded-2xl bg-zinc-100 p-1.5" role="tablist" aria-label="Hạng mục">
              {CATEGORIES.map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={category === id}
                  onClick={() => setCategory(id)}
                  className={`rounded-xl px-8 py-3 font-condensed text-4xl font-black uppercase cursor-pointer ${
                    category === id ? 'bg-zinc-900 text-white' : 'text-zinc-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </header>

          {columns === 0 ? (
            <p className="absolute inset-x-0 top-[480px] text-center font-condensed text-7xl font-black uppercase text-zinc-300">Chưa có nhánh đấu</p>
          ) : (
            <>
              {/* Stage names over each column */}
              {layout.stages.slice(0, -1).map((stage, c) =>
                [false, true].map((right) => (
                  <span
                    key={`${stage}-${right}`}
                    className="absolute text-center text-lg font-black uppercase tracking-widest text-rose-700/70"
                    style={{ left: place(c, 0, 1, right).x, width: slotW, top: TOP - 34 }}
                  >
                    {STAGE_LABEL[stage]}
                  </span>
                ))
              )}

              <svg className="pointer-events-none absolute inset-0" width={W} height={H}>
                {lines}
              </svg>
              {boxes}

              {/* Champion */}
              <div
                className={`absolute flex flex-col items-center justify-center rounded-2xl border-4 text-center ${
                  champion ? 'border-amber-400 bg-gradient-to-b from-amber-50 to-amber-100 shadow-[0_0_60px_rgba(251,191,36,0.55)]' : 'border-rose-700/40 bg-white'
                }`}
                style={{ left: W / 2 - 170, width: 340, top: crownTop + 40, height: 150 }}
              >
                <span className="absolute -top-[46px] flex flex-col items-center">
                  <Crown className="h-9 w-9 text-amber-500" fill="currentColor" />
                </span>
                <span className="font-condensed text-2xl font-black uppercase tracking-[0.3em] text-rose-700">Vô địch</span>
                <span className="mt-1 max-w-[310px] truncate font-condensed text-4xl font-black uppercase leading-tight">
                  {champion ? sideTitle(champion.dancers, champion.name) : '?'}
                </span>
                {champion && pro && <span className="text-base font-bold uppercase text-zinc-500">{champion.name}</span>}
              </div>
            </>
          )}

          <p className="absolute inset-x-0 bottom-2 text-center text-sm font-bold uppercase tracking-widest text-zinc-400">
            HipHop Xứ Trà 2026 · Breaking U16 · Cập nhật trực tiếp
          </p>
        </div>
      </div>

      {scrolls && (
        <p className="pointer-events-none fixed inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-zinc-900/85 px-4 py-2 text-xs font-bold text-white shadow-lg">
          Vuốt ngang để xem cả sơ đồ
        </p>
      )}
      {!idle && document.fullscreenEnabled && !document.fullscreenElement && (
        <button
          onClick={() => document.documentElement.requestFullscreen().catch(() => undefined)}
          className="fixed bottom-4 right-4 hidden items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-bold text-white shadow-lg sm:flex cursor-pointer"
        >
          <Maximize className="h-4 w-4" /> Toàn màn hình
        </button>
      )}
    </div>
  );
};

const sideTitle = (dancers: { name: string }[], fallback: string) =>
  dancers.length ? dancers.map((d) => stripBreakerPrefix(d.name)).join(' & ') : stripBreakerPrefix(fallback);

/** One entrant: team (Pro: team name over the pair) or dancer, rounds won, and how their battle went. */
const Slot: React.FC<{ slot: BracketSlot; pro: boolean; compact: boolean; style: React.CSSProperties }> = ({ slot, pro, compact, style }) => {
  const { side } = slot;
  if (!side) {
    return (
      <div style={style} className="absolute flex items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-white/60">
        <span className="font-condensed text-xl font-black text-zinc-300">—</span>
      </div>
    );
  }
  const title = sideTitle(side.dancers, side.name);
  const sub = pro ? side.name : side.sbdText.replace(/^SBD\s*/i, 'SBD ');
  return (
    <div
      style={style}
      className={`absolute flex items-center gap-2 overflow-hidden rounded-lg border-2 px-2.5 transition-all duration-700 ${
        slot.won
          ? 'border-rose-700 bg-rose-700 text-white shadow-[0_6px_20px_rgba(190,18,60,0.35)]'
          : slot.lost
            ? 'border-zinc-200 bg-zinc-100 text-zinc-400'
            : slot.live
              ? 'border-amber-400 bg-white ring-4 ring-amber-300/70'
              : 'border-rose-700/50 bg-white'
      }`}
    >
      <div className="min-w-0 flex-1 leading-none">
        <p className={`truncate font-condensed font-black uppercase ${compact ? 'text-[19px]' : 'text-[23px]'} ${slot.lost ? 'line-through decoration-2' : ''}`}>
          {title}
        </p>
        <p className={`mt-1 truncate text-[12px] font-bold uppercase ${slot.won ? 'text-white/80' : 'text-zinc-500'}`}>
          {slot.forfeit ? 'Bỏ cuộc' : slot.live ? '● Đang thi đấu' : sub}
        </p>
      </div>
      {slot.score !== undefined && (
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded font-condensed text-2xl font-black tabular-nums ${
            slot.won ? 'bg-white text-rose-700' : 'bg-zinc-200 text-zinc-600'
          }`}
        >
          {slot.score}
        </span>
      )}
    </div>
  );
};
