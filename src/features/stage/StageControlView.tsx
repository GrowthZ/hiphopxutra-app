import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, MonitorOff, Power, Sun, Moon, Swords, Trophy, Image, DoorOpen, PartyPopper } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { useStageController, DEFAULT_SCREEN_ID } from '../../state/useStage';
import { VIEW_PATHS } from '../../app/routes';
import { StageSceneType } from '../../domain/types';

const LED_WIDTH = 1920;

/** Live preview: the real /led page in an iframe, scaled down — identical to what the venue sees.
 *  `arch`: the stepped-arch wall layout with its cabinet grid (/led?khung=vom&luoi=1). */
const LedPreview: React.FC<{ arch: boolean }> = ({ arch }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / LED_WIDTH));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={boxRef} className="relative w-full aspect-video overflow-hidden rounded-lg border border-zinc-300 bg-black">
      <iframe
        src={`${VIEW_PATHS.stage}?preview=1${arch ? '&khung=vom&luoi=1' : ''}`}
        title="Xem trước màn LED"
        className="absolute top-0 left-0 origin-top-left border-0 pointer-events-none"
        style={{ width: LED_WIDTH, height: (LED_WIDTH * 9) / 16, transform: `scale(${scale})` }}
      />
    </div>
  );
};

const SCENES: { id: StageSceneType; label: string; icon: React.ElementType }[] = [
  { id: 'idle', label: 'Màn chờ (logo)', icon: Image },
  { id: 'battle', label: 'Trận Battle', icon: Swords },
  { id: 'prelim_leaderboard', label: 'Bảng xếp hạng Prelim', icon: Trophy },
];

export const StageControlView: React.FC = () => {
  const { authUser, matches, activeMatch, setActiveMatchId, judges, triggerTeamEntrance, triggerVictoryAnimation } =
    useTournament();
  const [archPreview, setArchPreview] = useState(false);
  const { state, error, isScreenOnline, setScene, setCategory, setTheme, setBlackout } = useStageController(
    DEFAULT_SCREEN_ID,
    authUser?.email ?? ''
  );

  const currentRound = activeMatch?.rounds.find((r) => r.roundNumber === activeMatch.currentRound);
  const votedCount = currentRound ? Object.keys(currentRound.votes).length : 0;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header: screen status + always-visible blackout */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
              Màn LED: Sân khấu chính
            </span>
            <span
              className={`flex items-center gap-1.5 text-xs font-bold ${isScreenOnline ? 'text-emerald-600' : 'text-red-600'}`}
              aria-live="polite"
            >
              <span className={`w-2 h-2 rounded-full ${isScreenOnline ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
              {isScreenOnline ? 'LED đang online' : 'LED offline / chưa mở'}
            </span>
          </div>
          <h1 className="font-condensed font-black text-2xl sm:text-3xl text-zinc-900 tracking-tight mt-1 uppercase">
            Điều khiển màn LED
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded border border-zinc-300 bg-white p-0.5" role="group" aria-label="Chế độ hiển thị">
            {(['daylight', 'night'] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => setTheme(theme)}
                aria-pressed={state.theme === theme}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 ${
                  state.theme === theme ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {theme === 'daylight' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                {theme === 'daylight' ? 'Ban ngày' : 'Ban đêm'}
              </button>
            ))}
          </div>

          <a
            href={VIEW_PATHS.stage}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors focus-visible:outline-2 focus-visible:outline-amber-500"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Mở /led
          </a>
          <a
            href={`${VIEW_PATHS.stage}?khung=vom`}
            target="_blank"
            rel="noreferrer"
            title="Màn LED vòm bậc thang 10m × 5,5m (20 × 11 module), xuất HDMI 1920×1080"
            className="flex items-center gap-1.5 rounded border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors focus-visible:outline-2 focus-visible:outline-amber-500"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Mở LED vòm
          </a>
          <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 cursor-pointer">
            <input type="checkbox" checked={archPreview} onChange={(e) => setArchPreview(e.target.checked)} className="h-4 w-4 accent-zinc-900" />
            Xem trước khung vòm
          </label>

          <button
            onClick={() => setBlackout(!state.blackout)}
            aria-pressed={state.blackout}
            className={`flex items-center gap-1.5 rounded px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 ${
              state.blackout ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-red-600 text-white hover:bg-red-500'
            }`}
          >
            {state.blackout ? <Power className="w-4 h-4" /> : <MonitorOff className="w-4 h-4" />}
            {state.blackout ? 'Bật lại LED' : 'Blackout'}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          Không gửi được lệnh tới LED: {error}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Preview + live match status */}
        <div className="space-y-3">
          <LedPreview arch={archPreview} />
          {state.blackout && (
            <p className="text-xs font-bold text-red-600">Đang Blackout: LED hiện màn logo, cảnh bên phải sẽ hiện lại khi bật lại.</p>
          )}
          {activeMatch && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm">
              <span className="font-condensed text-lg font-black uppercase text-zinc-900">
                {activeMatch.sideRed.name} <span className="text-zinc-400">vs</span> {activeMatch.sideBlue.name}
              </span>
              <span className="text-xs font-bold text-zinc-500 tabular-nums">
                {activeMatch.stageName} · Hiệp {activeMatch.currentRound}/{activeMatch.totalRoundsRequired} · Phiếu{' '}
                <span className={votedCount === judges.length ? 'text-emerald-600' : 'text-amber-600'}>
                  {votedCount}/{judges.length}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <section className="rounded-lg border border-zinc-200 bg-white p-3 space-y-1">
            <h2 className="px-1 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Cảnh</h2>
            {SCENES.map(({ id, label, icon: Icon }) => {
              const active = state.scene === id && !state.blackout;
              return (
                <button
                  key={id}
                  onClick={() => setScene(id)}
                  aria-pressed={active}
                  className={`w-full flex items-center gap-3 rounded px-3 py-2.5 text-left text-sm font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 ${
                    active ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-amber-400' : 'text-zinc-400'}`} />
                  {label}
                </button>
              );
            })}
          </section>

          {state.scene === 'prelim_leaderboard' && (
            <section className="rounded-lg border border-zinc-200 bg-white p-3 space-y-2">
              <h2 className="px-1 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Hạng mục</h2>
              <select
                value={state.category}
                onChange={(e) => setCategory(e.target.value as typeof state.category)}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-900 cursor-pointer"
              >
                <option value="pro_2v2">Pro 2vs2</option>
                <option value="newbie_1v1">Newbie 1vs1</option>
              </select>
            </section>
          )}

          {state.scene === 'battle' && (
            <section className="rounded-lg border border-zinc-200 bg-white p-3 space-y-2">
              <h2 className="px-1 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Trận trên LED</h2>
              <select
                value={activeMatch?.id ?? ''}
                onChange={(e) => setActiveMatchId(e.target.value)}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-900 cursor-pointer"
              >
                {matches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.category === 'pro_2v2' ? 'PRO' : 'NEWBIE'} · {m.stageName} · Trận {m.matchNumber} ({m.sideRed.name} vs{' '}
                    {m.sideBlue.name})
                  </option>
                ))}
              </select>

              <h2 className="px-1 pt-2 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Hiệu ứng</h2>
              <button
                onClick={() => activeMatch && triggerTeamEntrance(activeMatch.id)}
                disabled={!activeMatch}
                className="w-full flex items-center justify-center gap-2 rounded bg-amber-500 px-3 py-2.5 text-sm font-black uppercase text-zinc-950 hover:bg-amber-400 disabled:opacity-40 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-zinc-900"
              >
                <DoorOpen className="w-4 h-4" />
                Ra sân
              </button>
              <button
                onClick={() => activeMatch && triggerVictoryAnimation(activeMatch.id)}
                disabled={!activeMatch?.winnerSide}
                title={activeMatch?.winnerSide ? undefined : 'Trận chưa có người thắng'}
                className="w-full flex items-center justify-center gap-2 rounded border border-zinc-300 bg-white px-3 py-2.5 text-sm font-bold text-zinc-800 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                <PartyPopper className="w-4 h-4" />
                Phát lại màn chiến thắng
              </button>
              <p className="px-1 text-[11px] text-zinc-500">
                Lật phiếu từng hiệp chạy tự động khi công bố hiệp ở Bàn điều hành Battle.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
