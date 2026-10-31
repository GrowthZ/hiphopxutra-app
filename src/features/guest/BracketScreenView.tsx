import React, { useEffect, useMemo, useState } from 'react';
import { Maximize } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { CategoryType } from '../../domain/types';
import { bracketLayout } from '../../domain/bracketLayout';
import { BracketTheme, BracketTree } from './BracketTree';

// /ket-qua/so-do: the knockout tree for everyone (phones, TV), live; also the 16:9 LED's "Sơ đồ knockout" scene
// (kiosk: category and look set at /admin/led, no controls). Drawn on a fixed 1920×1080 canvas scaled to the window;
// on a phone it stays readable and scrolls. ?hang-muc=newbie|pro picks the tab (Pro by default).

const W = 1920;
const H = 1080;
const TOP = 190; // bracket area
const BOTTOM = 1050;

const CATEGORIES: [CategoryType, string][] = [
  ['pro_2v2', 'Kid Pro 2vs2'],
  ['newbie_1v1', 'Kid Newbie 1vs1'],
];
const LABEL = Object.fromEntries(CATEGORIES) as Record<CategoryType, string>;
const START: CategoryType = new URLSearchParams(window.location.search).get('hang-muc') === 'newbie' ? 'newbie_1v1' : 'pro_2v2';

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
  const scale = size.w < 1000 ? Math.max(fit, 0.45) : fit;
  return { scale, scrolls: size.w < W * scale };
}

export const BracketScreenView: React.FC<{ category?: CategoryType; theme?: BracketTheme; kiosk?: boolean }> = ({
  category: fixedCategory,
  theme = 'light',
  kiosk = false,
}) => {
  const { matches, activeMatchId } = useTournament();
  const [picked, setPicked] = useState<CategoryType>(START);
  const category = fixedCategory ?? picked;
  const { scale, scrolls } = useFit();
  const idle = useIdle();
  const layout = useMemo(() => bracketLayout(matches, category, activeMatchId), [matches, category, activeMatchId]);
  const dark = theme === 'dark';

  return (
    <div className={`fixed inset-0 ${kiosk ? 'overflow-hidden' : 'overflow-auto'} ${dark ? 'bg-black' : 'bg-zinc-200'}`}>
      <div style={{ width: W * scale, height: H * scale }} className="relative mx-auto">
        <div
          className={`absolute left-0 top-0 origin-top-left overflow-hidden ${dark ? 'bg-[#07070b] text-white' : 'bg-zinc-50 text-zinc-900'}`}
          style={{ width: W, height: H, transform: `scale(${scale})` }}
        >
          {dark ? (
            <>
              <div className="pointer-events-none absolute -left-60 -top-60 h-[900px] w-[900px] rounded-full bg-rose-600/20 blur-[160px]" />
              <div className="pointer-events-none absolute -bottom-72 -right-40 h-[900px] w-[1000px] rounded-full bg-amber-500/15 blur-[180px]" />
            </>
          ) : (
            <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background:repeating-linear-gradient(115deg,#be123c_0_2px,transparent_2px_46px)]" />
          )}

          {/* Header */}
          <header className={`absolute inset-x-0 top-0 flex h-[150px] items-center gap-8 px-12 ${dark ? 'border-b border-white/10 bg-black/40' : 'border-b border-zinc-200 bg-white'}`}>
            <img src="/logo.png" alt="HipHop Xứ Trà U16" className="h-[110px] w-auto" />
            <div className="flex-1">
              <p className={`text-2xl font-bold uppercase tracking-[0.3em] ${dark ? 'text-amber-400/80' : 'text-zinc-400'}`}>Sơ đồ thi đấu</p>
              <h1 className="pb-1 font-condensed text-7xl font-black uppercase leading-[1.05]">Knockout</h1>
            </div>
            {kiosk ? (
              <span className={`rounded-2xl px-8 py-3 font-condensed text-4xl font-black uppercase ${dark ? 'bg-white/10' : 'bg-zinc-900 text-white'}`}>
                {LABEL[category]}
              </span>
            ) : (
              <div className={`flex rounded-2xl p-1.5 ${dark ? 'bg-white/5' : 'bg-zinc-100'}`} role="tablist" aria-label="Hạng mục">
                {CATEGORIES.map(([id, label]) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={category === id}
                    onClick={() => setPicked(id)}
                    className={`rounded-xl px-8 py-3 font-condensed text-4xl font-black uppercase cursor-pointer ${
                      category === id ? (dark ? 'bg-white text-zinc-950' : 'bg-zinc-900 text-white') : dark ? 'text-white/50' : 'text-zinc-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </header>

          {layout.columns.length === 0 ? (
            <p className={`absolute inset-x-0 top-[480px] text-center font-condensed text-7xl font-black uppercase ${dark ? 'text-white/20' : 'text-zinc-300'}`}>
              Chưa có nhánh đấu
            </p>
          ) : (
            <div className="absolute" style={{ left: 0, top: TOP, width: W, height: BOTTOM - TOP }}>
              <BracketTree layout={layout} pro={category === 'pro_2v2'} width={W} height={BOTTOM - TOP} theme={theme} />
            </div>
          )}

          <p className={`absolute inset-x-0 bottom-2 text-center text-sm font-bold uppercase tracking-widest ${dark ? 'text-white/30' : 'text-zinc-400'}`}>
            HipHop Xứ Trà 2026 · Breaking U16 · Cập nhật trực tiếp
          </p>
        </div>
      </div>

      {!kiosk && scrolls && (
        <p className="pointer-events-none fixed inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-zinc-900/85 px-4 py-2 text-xs font-bold text-white shadow-lg">
          Vuốt ngang để xem cả sơ đồ
        </p>
      )}
      {!kiosk && !idle && document.fullscreenEnabled && !document.fullscreenElement && (
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
