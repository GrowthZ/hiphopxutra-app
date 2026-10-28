import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize, Medal, Radio } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { CategoryType, Dancer } from '../../domain/types';
import { VIEW_PATHS } from '../../app/routes';
import { stripBreakerPrefix } from '../../shared/placeholderAssets';
import { Avatar, GenderBadge, isScored, LIVE_LIMIT, PODIUM, QUALIFY, rankForDisplay } from './PrelimGuestView';

// /ket-qua/trinh-chieu: landscape prelim leaderboard for a TV / projector the audience watches.
// Laid out on a fixed 1920x1080 stage scaled to the window, so it fits any screen without scrolling.
// Same public rules as the guest page: top 10 while judging, top 32 once official.
// Alternates Newbie / Pro every ROTATE_MS; ?hang-muc=newbie|pro pins one. A freshly published score
// switches to its category, highlights the row and shows in the ticker.

const W = 1920;
const H = 1080;
const ROTATE_MS = 20_000;
const FLASH_MS = 10_000;
const CATEGORY_LABEL: Record<CategoryType, string> = { newbie_1v1: 'Newbie 1vs1', pro_2v2: 'Pro 2vs2' };
const PINNED: CategoryType | null = (() => {
  const p = new URLSearchParams(window.location.search).get('hang-muc');
  return p === 'newbie' ? 'newbie_1v1' : p === 'pro' ? 'pro_2v2' : null;
})();

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

export const PrelimScreenView: React.FC = () => {
  const { newbieDancers, proDancers, prelimJudges, isNewbieTop32Locked, isProTop32Locked } = useTournament();
  const judgeCount = prelimJudges.length || 4;
  const scale = useStageScale();
  const idle = useIdle();

  const lists = useMemo(
    () => ({
      newbie_1v1: rankForDisplay(newbieDancers, judgeCount),
      pro_2v2: rankForDisplay(proDancers, judgeCount),
    }),
    [newbieDancers, proDancers, judgeCount]
  );
  const hasData = (c: CategoryType) => lists[c].length > 0;

  const [category, setCategory] = useState<CategoryType>(PINNED ?? 'newbie_1v1');
  const [fresh, setFresh] = useState<Fresh | null>(null);
  const [now, setNow] = useState(Date.now());

  // Rotate between categories (unless pinned or one is empty); a fresh score resets the timer.
  useEffect(() => {
    if (PINNED || !hasData('newbie_1v1') || !hasData('pro_2v2')) return;
    const t = setTimeout(() => setCategory((c) => (c === 'newbie_1v1' ? 'pro_2v2' : 'newbie_1v1')), ROTATE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, fresh?.at, lists]);

  // Detect newly published scores (not the ones already there when the page opened).
  const known = useRef<Set<string> | null>(null);
  useEffect(() => {
    const scored = (['newbie_1v1', 'pro_2v2'] as const).flatMap((c) =>
      lists[c].filter((d) => isScored(d, judgeCount)).map((d) => ({ id: d.id, category: c }))
    );
    if (!known.current) {
      if (scored.length || lists.newbie_1v1.length || lists.pro_2v2.length) known.current = new Set(scored.map((s) => s.id));
      return;
    }
    const added = scored.filter((s) => !known.current!.has(s.id));
    added.forEach((s) => known.current!.add(s.id));
    const latest = added.at(-1);
    if (latest) {
      setFresh({ ...latest, at: Date.now() });
      if (!PINNED) setCategory(latest.category);
    }
  }, [lists, judgeCount]);

  useEffect(() => {
    if (!fresh) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
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
    <div className={`fixed inset-0 overflow-hidden bg-zinc-200 ${idle ? 'cursor-none' : ''}`}>
      <div
        className="absolute left-1/2 top-1/2 flex flex-col bg-zinc-50 text-zinc-900"
        style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {/* Header */}
        <header className="flex h-[150px] shrink-0 items-center gap-8 border-b border-zinc-200 bg-white px-14">
          <img src="/logo.png" alt="HipHop Xứ Trà U16" className="h-[110px] w-auto" />
          <div className="flex-1">
            <p className="text-2xl font-bold uppercase tracking-[0.2em] text-zinc-400">Kết quả vòng loại</p>
            <h1 className="font-condensed text-7xl font-black uppercase leading-none">{CATEGORY_LABEL[category]}</h1>
          </div>
          <div className="flex flex-col items-end gap-3">
            {locked ? (
              <span className="rounded-full bg-emerald-100 px-6 py-2 text-2xl font-black uppercase text-emerald-700">Kết quả chính thức</span>
            ) : (
              <span className="flex items-center gap-3 rounded-full bg-red-50 px-6 py-2 text-2xl font-black uppercase text-red-600">
                <Radio className="h-7 w-7 animate-pulse" />
                Đang chấm · {scored.length}/{ranked.length}
              </span>
            )}
            {!PINNED && hasData('newbie_1v1') && hasData('pro_2v2') && (
              <span className="flex gap-2" aria-hidden>
                {(['newbie_1v1', 'pro_2v2'] as const).map((c) => (
                  <span key={c} className={`h-2.5 w-12 rounded-full ${c === category ? 'bg-zinc-900' : 'bg-zinc-300'}`} />
                ))}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 p-3">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent(guestUrl)}`}
              alt=""
              className="h-[104px] w-[104px]"
            />
            <p className="w-40 text-lg font-bold leading-tight text-zinc-600">Quét để xem trên điện thoại</p>
          </div>
        </header>

        {/* Body */}
        <main className="min-h-0 flex-1 px-14 py-10">
          {shown.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="font-condensed text-8xl font-black uppercase text-zinc-300">Vòng loại sắp bắt đầu</p>
              <p className="mt-4 text-3xl text-zinc-400">Điểm hiện lên ngay khi 4 giám khảo chấm xong mỗi thí sinh.</p>
            </div>
          ) : locked ? (
            <QualifiedGrid dancers={shown} flashing={flashing} />
          ) : (
            <LiveBoard dancers={shown} flashing={flashing} />
          )}
        </main>

        {/* Ticker: the latest published score */}
        <footer className="flex h-[96px] shrink-0 items-center gap-6 bg-zinc-900 px-14 text-white">
          {freshDancer && flashing ? (
            <>
              <span className="rounded-lg bg-amber-400 px-4 py-1.5 text-2xl font-black uppercase text-zinc-900">Vừa công bố</span>
              <span className="font-condensed text-5xl font-black uppercase">{stripBreakerPrefix(freshDancer.name)}</span>
              <span className="text-3xl text-zinc-400">{CATEGORY_LABEL[fresh!.category]}</span>
              {freshPublic ? (
                <span className="ml-auto font-condensed text-5xl font-black tabular-nums">
                  {freshDancer.prelimScoreTotal} điểm · Hạng {freshRank}
                </span>
              ) : (
                <span className="ml-auto text-3xl text-zinc-300">đã chấm xong</span>
              )}
            </>
          ) : (
            <span className="text-3xl text-zinc-400">
              {locked
                ? `Top ${QUALIFY} bước vào vòng Battle · Chúc mừng các bạn!`
                : `Top ${LIVE_LIMIT} tạm thời · Tổng điểm của 4 giám khảo, tối đa ${judgeCount * 100}`}
            </span>
          )}
        </footer>
      </div>

      {!idle && document.fullscreenEnabled && !document.fullscreenElement && (
        <button
          onClick={() => document.documentElement.requestFullscreen().catch(() => undefined)}
          className="fixed bottom-5 right-5 flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-bold text-white shadow-lg cursor-pointer"
        >
          <Maximize className="h-4 w-4" /> Toàn màn hình
        </button>
      )}
    </div>
  );
};

const flashClass = (id: string, flashing: string | null) => (id === flashing ? 'ring-8 ring-amber-400 animate-pulse' : '');

/** While judging: big top 3 on the left, ranks 4–10 on the right. */
const LiveBoard: React.FC<{ dancers: Dancer[]; flashing: string | null }> = ({ dancers, flashing }) => {
  const [first, second, third] = dancers;
  const rest = dancers.slice(3);
  return (
    <div className="grid h-full grid-cols-[760px_1fr] gap-10">
      <div className="flex flex-col gap-6">
        {first && <PodiumCard dancer={first} rank={1} big flashing={flashing} />}
        <div className="grid flex-1 grid-cols-2 gap-6">
          {second && <PodiumCard dancer={second} rank={2} flashing={flashing} />}
          {third && <PodiumCard dancer={third} rank={3} flashing={flashing} />}
        </div>
      </div>
      <ol className="flex flex-col gap-3">
        {rest.map((d, i) => (
          <li key={d.id} className={`flex h-[94px] items-center gap-6 rounded-2xl bg-white px-6 shadow-sm ${flashClass(d.id, flashing)}`}>
            <span className="w-14 text-center font-condensed text-5xl font-black tabular-nums text-zinc-400">{i + 4}</span>
            <Avatar dancer={d} size="h-16 w-16 text-3xl" />
            <span className="min-w-0 flex-1 truncate font-condensed text-5xl font-black uppercase">{stripBreakerPrefix(d.name)}</span>
            <span className="scale-150 origin-right">
              <GenderBadge dancer={d} />
            </span>
            <span className="w-32 text-right font-condensed text-6xl font-black tabular-nums">{d.prelimScoreTotal}</span>
          </li>
        ))}
      </ol>
    </div>
  );
};

const PodiumCard: React.FC<{ dancer: Dancer; rank: number; big?: boolean; flashing: string | null }> = ({ dancer, rank, big, flashing }) => (
  <div
    className={`flex items-center gap-6 rounded-3xl ${PODIUM[rank - 1].row} border border-zinc-200 px-8 ${big ? 'h-[330px]' : 'flex-col justify-center text-center'} ${flashClass(
      dancer.id,
      flashing
    )}`}
  >
    <span className={`flex items-center gap-1 rounded-full px-4 py-1.5 font-black ${PODIUM[rank - 1].badge} ${big ? 'text-4xl' : 'text-3xl'}`}>
      <Medal className={big ? 'h-9 w-9' : 'h-7 w-7'} />
      {rank}
    </span>
    <Avatar dancer={dancer} size={big ? 'h-44 w-44 text-7xl' : 'h-28 w-28 text-5xl'} />
    <div className={`min-w-0 ${big ? 'flex-1' : 'w-full'}`}>
      <p className={`truncate font-condensed font-black uppercase leading-none ${big ? 'text-7xl' : 'text-5xl'}`}>{stripBreakerPrefix(dancer.name)}</p>
      <p className={`font-condensed font-black tabular-nums leading-none ${big ? 'mt-3 text-[120px]' : 'mt-2 text-7xl'}`}>{dancer.prelimScoreTotal}</p>
    </div>
  </div>
);

/** Official: the 32 qualifiers in 4 columns. */
const QualifiedGrid: React.FC<{ dancers: Dancer[]; flashing: string | null }> = ({ dancers, flashing }) => (
  <div>
    <p className="mb-6 font-condensed text-4xl font-black uppercase text-emerald-700">Top {QUALIFY} vào vòng Battle</p>
    <ol className="grid grid-flow-col grid-cols-4 grid-rows-8 gap-x-6 gap-y-3">
      {dancers.map((d, i) => {
        const podium = i < 3 ? PODIUM[i] : null;
        return (
          <li
            key={d.id}
            className={`flex h-[78px] items-center gap-3 rounded-xl px-4 shadow-sm ${podium ? podium.row : 'bg-white'} ${flashClass(d.id, flashing)}`}
          >
            <span
              className={`flex h-11 min-w-11 items-center justify-center gap-0.5 rounded-full px-1.5 font-condensed text-2xl font-black tabular-nums ${
                podium ? podium.badge : 'text-zinc-400'
              }`}
            >
              {podium && <Medal className="h-5 w-5" />}
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate font-condensed text-3xl font-black uppercase">{stripBreakerPrefix(d.name)}</span>
            <span className="font-condensed text-4xl font-black tabular-nums">{d.prelimScoreTotal}</span>
          </li>
        );
      })}
    </ol>
  </div>
);
