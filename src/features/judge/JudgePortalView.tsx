import React, { useEffect, useState } from 'react';
import { useTournament } from '../../state/TournamentContext';
import { Camera, LayoutDashboard, ListChecks, LogOut, Menu, Swords, Tv, UserRound, X } from 'lucide-react';
import { isStandalone } from '../../services/pwa';
import { useWakeLock } from '../../state/useWakeLock';
import { getJudgeAvatarUrl } from '../../shared/placeholderAssets';
import { JudgeWelcomeScreen } from './JudgeWelcomeScreen';
import { JudgeConfigModal } from './JudgeConfigModal';
import { PrelimScoringPanel } from './PrelimScoringPanel';
import { BattleScoringPanel } from './BattleScoringPanel';
import { InstallAppButton } from './InstallAppButton';
import { useJudgeHeartbeat } from '../../state/useJudgePresence';

type Mode = 'prelim' | 'battle';
const MODES: Record<Mode, { label: string; sub: string; Icon: typeof ListChecks }> = {
  prelim: { label: 'Prelim', sub: 'Vòng loại · 8 GK, 2 bảng', Icon: ListChecks },
  battle: { label: 'Main Battle', sub: 'Đối kháng · 9 GK', Icon: Swords },
};

export const JudgePortalView: React.FC = () => {
  const {
    judges,
    prelimJudges,
    selectedJudgeId,
    setSelectedJudgeId,
    activeJudge,
    isJudgeConfigModalOpen,
    setIsJudgeConfigModalOpen,
    judgeAccountId,
    judgeSignOut,
    setActiveView,
  } = useTournament();

  useJudgeHeartbeat(judgeAccountId);
  useWakeLock(); // scoring screen stays on between dancers

  // The installed app opens straight into scoring; the welcome screen stays one tap away (menu).
  const [showWelcome, setShowWelcome] = useState<boolean>(() => !isStandalone());
  const [menuOpen, setMenuOpen] = useState(false);
  // Prelim comes first in the day: prelim judges start there. A battle-only judge account (GK 05–09)
  // can't score prelims at all, so it gets the Battle screen only. Keyed on the signed-in account, which
  // is known before selectedJudgeId catches up with it.
  const isPrelimJudge = prelimJudges.some((j) => j.id === (judgeAccountId ?? selectedJudgeId));
  const canScorePrelim = !judgeAccountId || isPrelimJudge;
  const [pickedMode, setPickedMode] = useState<Mode | null>(null);
  const scoringMode: Mode = !canScorePrelim ? 'battle' : (pickedMode ?? (isPrelimJudge ? 'prelim' : 'battle'));
  const modes: Mode[] = canScorePrelim ? ['prelim', 'battle'] : ['battle'];

  // For battle mode, show all 9 judges; for prelim mode, show 4 prelim judges
  const activeJudgesList = scoringMode === 'battle' ? judges : prelimJudges;

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const configModal = (
    <JudgeConfigModal
      isOpen={isJudgeConfigModalOpen}
      onClose={() => setIsJudgeConfigModalOpen(false)}
      initialJudgeId={selectedJudgeId}
    />
  );

  if (showWelcome) {
    return (
      <>
        <JudgeWelcomeScreen onEnterPortal={() => setShowWelcome(false)} onOpenConfig={() => setIsJudgeConfigModalOpen(true)} />
        {configModal}
      </>
    );
  }

  const { label: modeLabel, Icon: ModeIcon } = MODES[scoringMode];
  const menuRow =
    'flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold hover:bg-zinc-50 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-amber-500';

  return (
    <div className="flex-1 min-h-0 bg-zinc-100 flex flex-col items-center justify-start sm:p-2 select-none overflow-hidden">
      <div className="w-full max-w-md bg-white sm:rounded-xl border border-zinc-300 shadow-sm overflow-hidden flex flex-col h-full">
        {/* App bar: who is scoring, what is being scored, menu */}
        <header className="flex items-center justify-between gap-2 border-b border-zinc-200 bg-white px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] shrink-0">
          <div className="flex min-w-0 items-center gap-2">
            <img src={getJudgeAvatarUrl(activeJudge)} alt="" className="h-9 w-9 shrink-0 rounded-full border-2 border-amber-500 object-cover" />
            <div className="min-w-0 leading-tight">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500">
                {activeJudge.code}
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-label="Online" />
              </p>
              <p className="flex items-center gap-1 font-condensed text-lg font-black uppercase text-zinc-900">
                <ModeIcon className="h-4 w-4 text-amber-600" />
                {modeLabel}
              </p>
            </div>
          </div>
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Mở menu"
            aria-expanded={menuOpen}
            className="-mr-1 rounded-full p-2.5 text-zinc-700 hover:bg-zinc-100 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {scoringMode === 'battle' ? <BattleScoringPanel /> : <PrelimScoringPanel />}
        <div className="pb-[env(safe-area-inset-bottom)] shrink-0" />
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-zinc-900/40" onClick={() => setMenuOpen(false)}>
          <nav
            aria-label="Menu"
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-72 max-w-[85vw] flex-col gap-4 overflow-y-auto bg-white px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl"
          >
            <div className="flex items-center justify-between">
              <span className="font-condensed text-xl font-black uppercase">Menu</span>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Đóng menu"
                className="-m-1 rounded-full p-2 text-zinc-400 hover:bg-zinc-100 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-3">
              <img src={getJudgeAvatarUrl(activeJudge)} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{activeJudge.judgeName || activeJudge.code}</span>
                {judgeAccountId ? (
                  <span className="text-xs text-zinc-500">{activeJudge.code}</span>
                ) : (
                  // Organizers can score on any judge's behalf.
                  <select
                    value={selectedJudgeId}
                    onChange={(e) => setSelectedJudgeId(e.target.value)}
                    aria-label="Chấm thay giám khảo"
                    className="mt-0.5 rounded border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 font-mono text-xs font-bold cursor-pointer"
                  >
                    {activeJudgesList.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.code}
                      </option>
                    ))}
                  </select>
                )}
              </span>
            </div>

            {/* The two scoring screens */}
            <div>
              <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Chấm điểm</p>
              <div className="overflow-hidden rounded-2xl border border-zinc-200">
                {modes.map((mode, i) => {
                  const { label, sub, Icon } = MODES[mode];
                  const active = scoringMode === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => {
                        setPickedMode(mode);
                        setMenuOpen(false);
                      }}
                      aria-current={active ? 'page' : undefined}
                      className={`${menuRow} ${i > 0 ? 'border-t border-zinc-100' : ''} ${active ? 'bg-amber-50' : ''}`}
                    >
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${active ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-100 text-zinc-500'}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-condensed text-lg font-black uppercase leading-tight">{label}</span>
                        <span className="text-xs font-medium text-zinc-500">{sub}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-200">
              <button
                onClick={() => {
                  setShowWelcome(true);
                  setMenuOpen(false);
                }}
                className={menuRow}
              >
                <UserRound className="h-4 w-4 text-zinc-400" /> Màn chào mừng
              </button>
              {!judgeAccountId && (
                <>
                  <button
                    onClick={() => {
                      setIsJudgeConfigModalOpen(true);
                      setMenuOpen(false);
                    }}
                    className={`${menuRow} border-t border-zinc-100`}
                  >
                    <Camera className="h-4 w-4 text-zinc-400" /> Ảnh giám khảo
                  </button>
                  <button onClick={() => setActiveView('prelim')} className={`${menuRow} border-t border-zinc-100`}>
                    <LayoutDashboard className="h-4 w-4 text-zinc-400" /> Về bảng điều hành
                  </button>
                  <button onClick={() => setActiveView('stage_control')} className={`${menuRow} border-t border-zinc-100`}>
                    <Tv className="h-4 w-4 text-zinc-400" /> Điều khiển màn LED
                  </button>
                </>
              )}
            </div>

            {judgeAccountId && (
              <>
                <InstallAppButton />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    judgeSignOut();
                  }}
                  className="mt-auto flex items-center justify-center gap-2 rounded-xl border border-zinc-200 py-3 text-sm font-bold text-red-600 hover:bg-red-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
              </>
            )}
          </nav>
        </div>
      )}

      {configModal}
    </div>
  );
};
