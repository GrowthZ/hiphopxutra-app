import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize, Moon, Radio, Sun } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { CategoryType, Dancer } from '../../domain/types';
import { VIEW_PATHS } from '../../app/routes';
import { stripBreakerPrefix } from '../../shared/placeholderAssets';
import { PANEL_SIZE } from '../../domain/model';
import { QrImage } from '../../shared/QrImage';
import { Avatar, GenderBadge, isScored, LIVE_LIMIT, QUALIFY, rankForDisplay } from './PrelimGuestView';

// Landscape prelim leaderboard for the audience: /ket-qua/trinh-chieu (light, TV / projector) and
// /ket-qua/trinh-chieu-led (dark, LED wall). Laid out on a fixed 1920x1080 stage scaled to the window, so it
// fits any screen without scrolling. Same public rules as the guest page: top 10 while judging, top 32 once
// official. Newbie / Pro tabs (?hang-muc=newbie|pro picks the first one). A dancer whose 4th score lands is
// highlighted and announced in the ticker. Either page can switch between the two looks (remembered per page).

const W = 1920;
const H = 1080;
const FLASH_MS = 10_000;
const CATEGORIES: [CategoryType, string][] = [
  ['newbie_1v1', 'Newbie 1vs1'],
  ['pro_2v2', 'Pro 2vs2'],
];
const LABEL = Object.fromEntries(CATEGORIES) as Record<CategoryType, string>;
const START: CategoryType = new URLSearchParams(window.location.search).get('hang-muc') === 'pro' ? 'pro_2v2' : 'newbie_1v1';

type Theme = 'light' | 'led';
type Medalist = { card: string; score: string };

/** Everything that differs between the two looks. */
const THEMES: Record<
  Theme,
  {
    page: string;
    backdrop?: React.ReactNode;
    header: string;
    kicker: string;
    title: string;
    tabs: string;
    tabOn: string;
    tabOff: string;
    live: string;
    official: string;
    qr: string;
    row: string;
    rank: string;
    name: string;
    score: string;
    empty: string;
    emptySub: string;
    qualifiedTitle: string;
    ticker: string;
    tickerIdle: string;
    tickerTag: string;
    flash: string;
    medal: Medalist[];
  }
> = {
  light: {
    page: 'bg-zinc-50 text-zinc-900',
    header: 'border-b border-zinc-200 bg-white',
    kicker: 'text-zinc-400',
    title: 'text-zinc-900',
    tabs: 'bg-zinc-100',
    tabOn: 'bg-zinc-900 text-white',
    tabOff: 'text-zinc-500',
    live: 'bg-red-50 text-red-600',
    official: 'bg-emerald-100 text-emerald-700',
    qr: 'border border-zinc-200',
    row: 'bg-white shadow-sm',
    rank: 'text-zinc-400',
    name: 'text-zinc-900',
    score: 'text-zinc-900',
    empty: 'text-zinc-300',
    emptySub: 'text-zinc-400',
    qualifiedTitle: 'text-emerald-700',
    ticker: 'bg-zinc-900 text-white',
    tickerIdle: 'text-zinc-400',
    tickerTag: 'bg-amber-400 text-zinc-900',
    flash: 'ring-8 ring-amber-400 animate-pulse',
    medal: [
      { card: 'bg-amber-50 border border-zinc-200', score: 'text-zinc-900' },
      { card: 'bg-zinc-100 border border-zinc-200', score: 'text-zinc-900' },
      { card: 'bg-orange-50 border border-zinc-200', score: 'text-zinc-900' },
    ],
  },
  led: {
    page: 'bg-[#07070b] text-white',
    backdrop: (
      <>
        <div className="absolute -left-60 -top-60 h-[900px] w-[900px] rounded-full bg-red-600/25 blur-[160px]" />
        <div className="absolute -bottom-72 -right-40 h-[900px] w-[1000px] rounded-full bg-amber-500/20 blur-[180px]" />
        <div className="absolute inset-0 opacity-[0.06] [background:repeating-linear-gradient(115deg,#fff_0_2px,transparent_2px_46px)]" />
        <div className="absolute -bottom-24 right-10 select-none font-condensed text-[420px] font-black uppercase leading-none text-transparent [-webkit-text-stroke:2px_rgba(255,255,255,0.05)]">
          Prelim
        </div>
      </>
    ),
    header: 'border-b border-white/10 bg-black/40 backdrop-blur',
    kicker: 'text-amber-400/80',
    title: 'bg-gradient-to-r from-white via-amber-200 to-amber-500 bg-clip-text text-transparent',
    tabs: 'bg-white/5 ring-1 ring-white/10',
    tabOn: 'bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-[0_0_30px_rgba(245,158,11,0.55)]',
    tabOff: 'text-white/50',
    live: 'bg-red-600/20 text-red-400 ring-1 ring-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.4)]',
    official: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/50',
    qr: 'bg-white/5 ring-1 ring-white/15',
    row: 'bg-white/[0.06] ring-1 ring-white/10 backdrop-blur-sm',
    rank: 'text-white/40',
    name: 'text-white',
    score: 'bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent',
    empty: 'text-white/20',
    emptySub: 'text-white/40',
    qualifiedTitle: 'bg-gradient-to-r from-emerald-300 to-amber-300 bg-clip-text text-transparent',
    ticker: 'bg-gradient-to-r from-red-700 via-red-600 to-amber-500 text-white',
    tickerIdle: 'text-white/60',
    tickerTag: 'bg-black text-amber-400 ring-2 ring-amber-400',
    flash: 'led-flash',
    medal: [
      {
        card: 'bg-gradient-to-br from-amber-500/30 via-amber-400/10 to-transparent ring-2 ring-amber-400/80 shadow-[0_0_60px_rgba(251,191,36,0.35)]',
       
        score: 'bg-gradient-to-b from-amber-100 to-amber-400 bg-clip-text text-transparent',
      },
      {
        card: 'bg-gradient-to-br from-zinc-300/25 via-zinc-300/5 to-transparent ring-2 ring-zinc-300/70 shadow-[0_0_50px_rgba(212,212,216,0.25)]',
       
        score: 'bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent',
      },
      {
        card: 'bg-gradient-to-br from-orange-500/30 via-orange-400/5 to-transparent ring-2 ring-orange-400/70 shadow-[0_0_50px_rgba(251,146,60,0.3)]',
       
        score: 'bg-gradient-to-b from-orange-100 to-orange-400 bg-clip-text text-transparent',
      },
    ],
  },
};

function useStageScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return scale;
}

/** Hides the cursor (and the fullscreen button) after a few idle seconds. */
function useIdle(ms = 3000) {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let timer = setTimeout(() => setIdle(true), ms);
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

interface Fresh {
  id: string;
  category: CategoryType;
  at: number;
}

const themeKey = (start: Theme) => `hiphop_xu_tra_prelim_screen_theme_${start}`;
function savedTheme(start: Theme): Theme {
  try {
    const saved = localStorage.getItem(themeKey(start));
    return saved === 'light' || saved === 'led' ? saved : start;
  } catch {
    return start;
  }
}

export const PrelimScreenView: React.FC<{ theme?: Theme }> = ({ theme: start = 'light' }) => {
  const [theme, setThemeState] = useState<Theme>(() => savedTheme(start));
  const setTheme = (next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(themeKey(start), next);
    } catch {
      // private mode: the choice lasts for this visit only
    }
  };
  const t = THEMES[theme];
  const { newbieDancers, proDancers, isNewbieTop32Locked, isProTop32Locked } = useTournament();
  const judgeCount = PANEL_SIZE; // the 4 judges of each dancer's panel
  const scale = useStageScale();
  const idle = useIdle();

  const lists = useMemo(
    () => ({
      newbie_1v1: rankForDisplay(newbieDancers, judgeCount),
      pro_2v2: rankForDisplay(proDancers, judgeCount),
    }),
    [newbieDancers, proDancers, judgeCount]
  );

  const [category, setCategory] = useState<CategoryType>(START);
  const [fresh, setFresh] = useState<Fresh | null>(null);
  const [now, setNow] = useState(Date.now());

  // Detect newly published scores (not the ones already there when the page opened).
  const known = useRef<Set<string> | null>(null);
  useEffect(() => {
    const scored = (['newbie_1v1', 'pro_2v2'] as const).flatMap((c) =>
      lists[c].filter((d) => isScored(d, judgeCount)).map((d) => ({ id: d.id, category: c }))
    );
    if (!known.current) {
      if (lists.newbie_1v1.length || lists.pro_2v2.length) known.current = new Set(scored.map((s) => s.id));
      return;
    }
    const added = scored.filter((s) => !known.current!.has(s.id));
    added.forEach((s) => known.current!.add(s.id));
    const latest = added.at(-1);
    if (latest) setFresh({ ...latest, at: Date.now() });
  }, [lists, judgeCount]);

  useEffect(() => {
    if (!fresh) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [fresh]);
  const flashing = fresh && now - fresh.at < FLASH_MS ? fresh.id : null;

  const locked = category === 'newbie_1v1' ? isNewbieTop32Locked : isProTop32Locked;
  const ranked = lists[category];
  const scored = ranked.filter((d) => isScored(d, judgeCount));
  const shown = scored.slice(0, locked ? QUALIFY : LIVE_LIMIT);

  const freshDancer = fresh ? lists[fresh.category].find((d) => d.id === fresh.id) : undefined;
  const freshRank = freshDancer ? lists[fresh!.category].indexOf(freshDancer) + 1 : 0;
  const freshLocked = fresh?.category === 'newbie_1v1' ? isNewbieTop32Locked : isProTop32Locked;
  // While judging, a score is only public inside the top 10.
  const freshPublic = freshRank > 0 && (freshLocked ? freshRank <= QUALIFY : freshRank <= LIVE_LIMIT);

  const guestUrl = `${window.location.origin}${VIEW_PATHS.prelim_guest}`;

  return (
    <div className={`fixed inset-0 overflow-hidden ${theme === 'led' ? 'bg-black' : 'bg-zinc-200'} ${idle ? 'cursor-none' : ''}`}>
      <div
        className={`absolute left-1/2 top-1/2 flex flex-col overflow-hidden ${t.page}`}
        style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {t.backdrop && <div className="pointer-events-none absolute inset-0">{t.backdrop}</div>}

        {/* Header */}
        <header className={`relative flex h-[150px] shrink-0 items-center gap-8 px-14 ${t.header}`}>
          <img
            src="/logo.png"
            alt="HipHop Xứ Trà U16"
            className={`h-[110px] w-auto ${theme === 'led' ? 'drop-shadow-[0_0_25px_rgba(239,68,68,0.35)]' : ''}`}
          />
          <div className="flex-1">
            <p className={`text-2xl font-bold uppercase tracking-[0.3em] ${t.kicker}`}>Kết quả</p>
            <h1 className={`pb-2 font-condensed text-7xl font-black uppercase leading-[1.05] ${t.title}`}>Vòng loại</h1>
          </div>
          <div className={`flex rounded-2xl p-1.5 ${t.tabs}`} role="tablist" aria-label="Hạng mục">
            {CATEGORIES.map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={category === id}
                onClick={() => setCategory(id)}
                className={`rounded-xl px-8 py-3 font-condensed text-4xl font-black uppercase transition-all cursor-pointer ${
                  category === id ? t.tabOn : t.tabOff
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {locked ? (
            <span className={`rounded-full px-6 py-3 text-2xl font-black uppercase ${t.official}`}>Chính thức</span>
          ) : (
            <span className={`flex items-center gap-3 rounded-full px-6 py-3 text-2xl font-black uppercase ${t.live}`}>
              <Radio className="h-7 w-7 animate-pulse" />
              Live · {scored.length}/{ranked.length}
            </span>
          )}
          {/* Top-right corner: QR to the phone page */}
          <div className={`rounded-2xl p-2.5 ${t.qr}`}>
            <QrImage value={guestUrl} label="Mã QR trang kết quả trên điện thoại" className="h-[118px] w-[118px] rounded-lg bg-white" />
          </div>
        </header>

        {/* Body (re-mounted per tab so rows animate in again) */}
        <main key={category} className="relative min-h-0 flex-1 px-14 py-10">
          {shown.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className={`font-condensed text-8xl font-black uppercase ${t.empty}`}>Vòng loại sắp bắt đầu</p>
              <p className={`mt-4 text-3xl ${t.emptySub}`}>Điểm hiện lên ngay khi 4 giám khảo chấm xong mỗi thí sinh.</p>
            </div>
          ) : locked ? (
            <QualifiedGrid dancers={shown} flashing={flashing} theme={theme} />
          ) : (
            <LiveBoard dancers={shown} flashing={flashing} theme={theme} />
          )}
        </main>

        {/* Ticker: the latest published score */}
        <footer className={`relative flex h-[96px] shrink-0 items-center gap-6 px-14 ${t.ticker}`}>
          {freshDancer && flashing ? (
            <div key={fresh!.at} className="led-ticker-in flex w-full items-center gap-6">
              <span className={`rounded-lg px-4 py-1.5 text-2xl font-black uppercase ${t.tickerTag}`}>Vừa công bố</span>
              <span className="font-condensed text-5xl font-black uppercase">{stripBreakerPrefix(freshDancer.name)}</span>
              <span className="text-3xl opacity-70">{LABEL[fresh!.category]}</span>
              {freshPublic ? (
                <span className="ml-auto font-condensed text-5xl font-black tabular-nums">
                  {freshDancer.prelimScoreTotal} điểm · Hạng {freshRank}
                </span>
              ) : (
                <span className="ml-auto text-3xl opacity-80">đã chấm xong</span>
              )}
            </div>
          ) : (
            <span className={`text-3xl ${t.tickerIdle}`}>
              {locked
                ? `Top ${QUALIFY} bước vào vòng Battle · Chúc mừng các bạn!`
                : `Top ${LIVE_LIMIT} tạm thời · Tổng điểm của 4 giám khảo, tối đa ${judgeCount * 100}`}
            </span>
          )}
        </footer>
      </div>

      {/* Operator controls, hidden with the cursor */}
      {!idle && (
        <div className="fixed bottom-5 right-5 flex gap-2">
          <button
            onClick={() => setTheme(theme === 'led' ? 'light' : 'led')}
            className="flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-bold text-white shadow-lg ring-1 ring-white/20 cursor-pointer"
          >
            {theme === 'led' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'led' ? 'Theme sáng' : 'Theme tối'}
          </button>
          {document.fullscreenEnabled && !document.fullscreenElement && (
            <button
              onClick={() => document.documentElement.requestFullscreen().catch(() => undefined)}
              className="flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-bold text-white shadow-lg ring-1 ring-white/20 cursor-pointer"
            >
              <Maximize className="h-4 w-4" /> Toàn màn hình
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const rise = (i: number): React.CSSProperties => ({ animationDelay: `${i * 70}ms` });

/** Gold, silver, bronze spray paint: paint, its light and dark shades, LED glow. */
const PAINTS = [
  { paint: '#facc15', hi: '#fef08a', lo: '#a16207', glow: 'drop-shadow-[0_0_22px_rgba(250,204,21,0.7)]' },
  { paint: '#d4d4d8', hi: '#ffffff', lo: '#71717a', glow: 'drop-shadow-[0_0_18px_rgba(228,228,231,0.55)]' },
  { paint: '#f97316', hi: '#fdba74', lo: '#9a3412', glow: 'drop-shadow-[0_0_18px_rgba(249,115,22,0.6)]' },
];

/** Deterministic wobble so every screen draws the same splat. */
const wobble = (seed: number) => {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
};

/** A spray-paint splat around (70,72): jagged blob, smoothed through the midpoints. */
const splatPath = (seed: number) => {
  const rnd = wobble(seed);
  const pts = Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 2;
    const spike = rnd() > 0.62;
    const r = 50 * (spike ? 1.06 + rnd() * 0.22 : 0.84 + rnd() * 0.14);
    return [70 + Math.cos(a) * r * 1.08, 72 + Math.sin(a) * r];
  });
  const mid = (p: number[], q: number[]) => `${((p[0] + q[0]) / 2).toFixed(1)},${((p[1] + q[1]) / 2).toFixed(1)}`;
  return (
    `M${mid(pts[21], pts[0])} ` +
    pts.map((p, i) => `Q${p[0].toFixed(1)},${p[1].toFixed(1)} ${mid(p, pts[(i + 1) % 22])}`).join(' ') +
    ' Z'
  );
};

/** Paint drips running off the bottom of the splat: [x, length, width]. */
const DRIPS = [
  [44, 30, 7],
  [63, 46, 9],
  [92, 22, 6],
];

/** Top-3 tag: a sprayed paint splat with drips and a 3D graffiti number; first place gets a hand-drawn crown. */
const RankEmblem: React.FC<{ rank: number; className: string; glow?: boolean }> = ({ rank, className, glow }) => {
  const id = React.useId().replace(/:/g, '');
  const c = PAINTS[rank - 1];
  const crown = rank === 1;
  const rnd = wobble(rank * 7);
  const specks = Array.from({ length: 14 }, () => {
    const a = rnd() * Math.PI * 2;
    const r = 60 + rnd() * 14;
    return [70 + Math.cos(a) * r, 72 + Math.sin(a) * r * 0.9, 0.8 + rnd() * 2.2];
  });
  return (
    <svg
      viewBox={crown ? '-6 -30 152 190' : '-6 -6 152 166'}
      className={`w-auto shrink-0 overflow-visible ${glow ? c.glow : 'drop-shadow-md'} ${className}`}
      role="img"
      aria-label={`Hạng ${rank}`}
    >
      <defs>
        <filter id={`${id}r`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed={rank} />
          <feDisplacementMap in="SourceGraphic" scale="7" />
        </filter>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor={c.hi} />
          <stop offset="1" stopColor={c.paint} />
        </linearGradient>
      </defs>

      {/* black underspray, then the colour splat, drips and overspray specks, all roughened like real paint */}
      <g filter={`url(#${id}r)`}>
        <path d={splatPath(rank * 13)} fill="#0a0a0a" transform="translate(4 5)" />
        <path d={splatPath(rank * 13)} fill={c.paint} />
        {DRIPS.map(([x, len, w]) => (
          <g key={x} fill={c.paint}>
            <rect x={x - w / 2} y={100} width={w} height={len} />
            <circle cx={x} cy={100 + len} r={w * 0.75} />
          </g>
        ))}
        {specks.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill={i % 3 ? c.paint : '#0a0a0a'} />
        ))}
        <path d={splatPath(rank * 13)} fill={c.lo} opacity="0.35" transform="translate(70 72) scale(0.72) translate(-70 -72)" />
      </g>

      {/* graffiti number: black 3D block, thick outline, light fill, tilted like a tag */}
      <g transform="rotate(-8 70 72) skewX(-10)" fontFamily="var(--font-condensed)" fontWeight="900" fontSize="96" textAnchor="middle">
        <text x="88" y="106" fill="#0a0a0a" stroke="#0a0a0a" strokeWidth="14" strokeLinejoin="round">
          {rank}
        </text>
        <text x="82" y="100" fill={`url(#${id}t)`} stroke="#0a0a0a" strokeWidth="7" strokeLinejoin="round" paintOrder="stroke">
          {rank}
        </text>
        <text x="82" y="100" fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="1.5">
          {rank}
        </text>
      </g>

      {crown && (
        // Hand-drawn three-point crown, slightly crooked
        <g transform="translate(2 10) rotate(-10 70 -6)" strokeLinejoin="round" strokeLinecap="round">
          <path d="M38 6 L34 -26 L54 -6 L70 -34 L84 -6 L106 -24 L100 8 Z" fill={c.paint} stroke="#0a0a0a" strokeWidth="6" />
          <path d="M40 2 L98 4" stroke="#0a0a0a" strokeWidth="4" />
          <circle cx="34" cy="-28" r="5" fill="#fff" stroke="#0a0a0a" strokeWidth="3" />
          <circle cx="70" cy="-37" r="5" fill="#ef4444" stroke="#0a0a0a" strokeWidth="3" />
          <circle cx="106" cy="-26" r="5" fill="#fff" stroke="#0a0a0a" strokeWidth="3" />
        </g>
      )}
    </svg>
  );
};

/** While judging: big top 3 on the left, ranks 4–10 on the right. */
const LiveBoard: React.FC<{ dancers: Dancer[]; flashing: string | null; theme: Theme }> = ({ dancers, flashing, theme }) => {
  const t = THEMES[theme];
  const [first, second, third] = dancers;
  const rest = dancers.slice(3);
  return (
    <div className="grid h-full grid-cols-[760px_1fr] gap-10">
      <div className="flex flex-col gap-6">
        {first && <PodiumCard dancer={first} rank={1} big flashing={flashing} theme={theme} />}
        <div className="grid flex-1 grid-cols-2 gap-6">
          {second && <PodiumCard dancer={second} rank={2} flashing={flashing} theme={theme} />}
          {third && <PodiumCard dancer={third} rank={3} flashing={flashing} theme={theme} />}
        </div>
      </div>
      <ol className="flex flex-col gap-3">
        {rest.map((d, i) => (
          <li
            key={d.id}
            style={rise(i + 3)}
            className={`led-rise flex h-[94px] items-center gap-6 rounded-2xl px-6 ${t.row} ${d.id === flashing ? t.flash : ''}`}
          >
            <span className={`w-14 text-center font-condensed text-5xl font-black tabular-nums ${t.rank}`}>{i + 4}</span>
            <Avatar dancer={d} size="h-16 w-16 text-3xl" dark={theme === 'led'} />
            <span className={`min-w-0 flex-1 truncate font-condensed text-5xl font-black uppercase ${t.name}`}>{stripBreakerPrefix(d.name)}</span>
            <span className="origin-right scale-150">
              <GenderBadge dancer={d} />
            </span>
            <span className={`w-32 text-right font-condensed text-6xl font-black tabular-nums ${t.score}`}>{d.prelimScoreTotal}</span>
          </li>
        ))}
      </ol>
    </div>
  );
};

const PodiumCard: React.FC<{ dancer: Dancer; rank: number; big?: boolean; flashing: string | null; theme: Theme }> = ({
  dancer,
  rank,
  big,
  flashing,
  theme,
}) => {
  const t = THEMES[theme];
  const m = t.medal[rank - 1];
  return (
    <div
      style={rise(rank - 1)}
      className={`led-rise relative flex items-center gap-6 overflow-hidden rounded-3xl px-8 ${m.card} ${
        big ? 'h-[330px]' : 'flex-col justify-center text-center'
      } ${dancer.id === flashing ? t.flash : ''}`}
    >
      {theme === 'led' && <span className="led-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent" />}
      <RankEmblem rank={rank} className={big ? 'h-[170px]' : 'h-[110px]'} glow={theme === 'led'} />
      <Avatar dancer={dancer} size={big ? 'h-44 w-44 text-7xl' : 'h-28 w-28 text-5xl'} dark={theme === 'led'} />
      <div className={`min-w-0 ${big ? 'flex-1' : 'w-full'}`}>
        <p className={`truncate font-condensed font-black uppercase leading-none ${t.name} ${big ? 'text-7xl' : 'text-5xl'}`}>
          {stripBreakerPrefix(dancer.name)}
        </p>
        <p className={`font-condensed font-black tabular-nums leading-none ${m.score} ${big ? 'mt-3 text-[120px]' : 'mt-2 text-7xl'}`}>
          {dancer.prelimScoreTotal}
        </p>
      </div>
    </div>
  );
};

/** Official: the 32 qualifiers in 4 columns. */
const QualifiedGrid: React.FC<{ dancers: Dancer[]; flashing: string | null; theme: Theme }> = ({ dancers, flashing, theme }) => {
  const t = THEMES[theme];
  return (
    <div>
      <p className={`mb-6 font-condensed text-4xl font-black uppercase ${t.qualifiedTitle}`}>Top {QUALIFY} vào vòng Battle</p>
      <ol className="grid grid-flow-col grid-cols-4 grid-rows-8 gap-x-6 gap-y-3">
        {dancers.map((d, i) => {
          const m = i < 3 ? t.medal[i] : null;
          return (
            <li
              key={d.id}
              style={rise(i)}
              className={`led-rise relative flex h-[78px] items-center gap-3 overflow-hidden rounded-xl px-4 ${m ? m.card : t.row} ${
                d.id === flashing ? t.flash : ''
              }`}
            >
              {m ? (
                <RankEmblem rank={i + 1} className={i === 0 ? 'h-[74px]' : 'h-[62px]'} glow={theme === 'led'} />
              ) : (
                <span className={`flex h-11 min-w-11 items-center justify-center rounded-full px-1.5 font-condensed text-2xl font-black tabular-nums ${t.rank}`}>
                  {i + 1}
                </span>
              )}
              <span className={`min-w-0 flex-1 truncate font-condensed text-3xl font-black uppercase ${t.name}`}>{stripBreakerPrefix(d.name)}</span>
              <span className={`font-condensed text-4xl font-black tabular-nums ${m ? m.score : t.score}`}>{d.prelimScoreTotal}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
