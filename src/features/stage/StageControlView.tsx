import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, MonitorOff, Power, Sun, Moon, Swords, Trophy, Image, DoorOpen, PartyPopper, Network, Upload, Trash2, Loader2 } from 'lucide-react';
import { uploadPhoto } from '../../services/media';
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
  { id: 'bracket', label: 'Sơ đồ knockout', icon: Network },
];

/** Standby screen picture: upload (resized to the arch wall's 2560×1536 at most) or go back to the built-in screen. */
const IdleImageControl: React.FC<{ url?: string; onChange: (url: string) => void }> = ({ url, onChange }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadPhoto(file, 'placeholders', 'man-cho', { width: 2560, height: 1536 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-3 space-y-2">
      <h2 className="px-1 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Ảnh màn chờ</h2>
      {url ? (
        <img src={url} alt="Ảnh màn chờ hiện tại" className="w-full rounded border border-zinc-200 bg-black object-contain aspect-[5/3]" />
      ) : (
        <p className="px-1 text-xs text-zinc-500">Đang dùng màn chữ mặc định “HIPHOP XỨ TRÀ”.</p>
      )}
      <label
        className={`flex w-full items-center justify-center gap-2 rounded bg-zinc-900 px-3 py-2.5 text-sm font-bold text-white hover:bg-zinc-700 cursor-pointer focus-within:outline-2 focus-within:outline-amber-500 ${
          busy ? 'pointer-events-none opacity-60' : ''
        }`}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {busy ? 'Đang tải ảnh…' : url ? 'Đổi ảnh' : 'Tải ảnh lên'}
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} disabled={busy} />
      </label>
      {url && (
        <button
          onClick={() => window.confirm('Bỏ ảnh, quay về màn chữ mặc định?') && onChange('')}
          className="flex w-full items-center justify-center gap-2 rounded border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" /> Bỏ ảnh
        </button>
      )}
      <p className="px-1 text-[11px] text-zinc-500">Nên dùng ảnh 2560×1536 (khung vòm). Ảnh hiện nguyên vẹn trên nền đen.</p>
      {error && <p role="alert" className="px-1 text-xs font-bold text-red-600">{error}</p>}
    </section>
  );
};

export const StageControlView: React.FC = () => {
  const { authUser, matches, activeMatch, setActiveMatchId, judges, triggerTeamEntrance, triggerVictoryAnimation } =
    useTournament();
  const [archPreview, setArchPreview] = useState(false);
  const { state, error, isScreenOnline, setScene, setCategory, setTheme, setBlackout, setArchEdge, setBracketTheme, setIdleImage } =
    useStageController(
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
            title="Màn LED vòm bậc thang 10 m × 6 m (20 × 12 cabinet, 2560×1536 px)"
            className="flex items-center gap-1.5 rounded border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors focus-visible:outline-2 focus-visible:outline-amber-500"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Mở LED vòm
          </a>
          <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 cursor-pointer">
            <input type="checkbox" checked={archPreview} onChange={(e) => setArchPreview(e.target.checked)} className="h-4 w-4 accent-zinc-900" />
            Xem trước khung vòm
          </label>
          {/* Arch LED edge: the whole picture (the stepped wall cuts it) or a smooth dome inside the steps */}
          <div className="flex rounded border border-zinc-300 bg-white p-0.5" role="group" aria-label="Viền màn LED vòm">
            {(
              [
                ['full', 'Nền đầy đủ', 'Vẽ kín 2560×1536, màn LED tự cắt theo bậc'],
                ['dome', 'Viền vòm cong', 'Vẽ trong một đường vòm cong nằm gọn trong các bậc'],
              ] as const
            ).map(([edge, label, title]) => (
              <button
                key={edge}
                onClick={() => setArchEdge(edge)}
                aria-pressed={(state.archEdge ?? 'full') === edge}
                title={title}
                className={`rounded px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 ${
                  (state.archEdge ?? 'full') === edge ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

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

          {(state.scene === 'idle' || state.blackout) && <IdleImageControl url={state.idleImageUrl} onChange={setIdleImage} />}

          {(state.scene === 'prelim_leaderboard' || state.scene === 'bracket') && (
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
              {state.scene === 'bracket' && (
                <>
                  <h2 className="px-1 pt-2 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Giao diện sơ đồ</h2>
                  <div className="grid grid-cols-2 gap-1" role="group" aria-label="Giao diện sơ đồ knockout">
                    {(
                      [
                        ['dark', 'Tối', Moon],
                        ['light', 'Sáng', Sun],
                      ] as const
                    ).map(([theme, label, Icon]) => (
                      <button
                        key={theme}
                        onClick={() => setBracketTheme(theme)}
                        aria-pressed={(state.bracketTheme ?? 'dark') === theme}
                        className={`flex items-center justify-center gap-1.5 rounded px-3 py-2 text-xs font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 ${
                          (state.bracketTheme ?? 'dark') === theme ? 'bg-zinc-900 text-white' : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" /> {label}
                      </button>
                    ))}
                  </div>
                  <p className="px-1 text-[11px] text-zinc-500">Hiện sau mỗi trận: người thắng đã đi tiếp, cập nhật trực tiếp.</p>
                </>
              )}
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
