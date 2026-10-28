import React, { useState } from 'react';
import { useTournament } from '../../state/TournamentContext';
import { Camera, ListChecks, Swords } from 'lucide-react';
import { isStandalone } from '../../services/pwa';
import { useWakeLock } from '../../state/useWakeLock';
import { getJudgeAvatarUrl } from '../../shared/placeholderAssets';
import { JudgeWelcomeScreen } from './JudgeWelcomeScreen';
import { JudgeConfigModal } from './JudgeConfigModal';
import { PrelimScoringPanel } from './PrelimScoringPanel';
import { BattleScoringPanel } from './BattleScoringPanel';
import { useJudgeHeartbeat } from '../../state/useJudgePresence';

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
  } = useTournament();

  useJudgeHeartbeat(judgeAccountId);
  useWakeLock(); // scoring screen stays on between dancers

  // The installed app opens straight into scoring; the welcome screen stays one tap away (avatar button).
  const [showWelcome, setShowWelcome] = useState<boolean>(() => !isStandalone());
  // Prelim comes first in the day: prelim judges start there. A battle-only judge account (GK 05–09)
  // can't score prelims at all, so it gets the Battle screen only. Keyed on the signed-in account, which
  // is known before selectedJudgeId catches up with it.
  const isPrelimJudge = prelimJudges.some((j) => j.id === (judgeAccountId ?? selectedJudgeId));
  const canScorePrelim = !judgeAccountId || isPrelimJudge;
  const [pickedMode, setPickedMode] = useState<'battle' | 'prelim' | null>(null);
  const scoringMode = !canScorePrelim ? 'battle' : (pickedMode ?? (isPrelimJudge ? 'prelim' : 'battle'));

  // For battle mode, show all 9 judges; for prelim mode, show 4 prelim judges
  const activeJudgesList = scoringMode === 'battle' ? judges : prelimJudges;

  if (showWelcome) {
    return (
      <>
        <JudgeWelcomeScreen
          onEnterPortal={() => setShowWelcome(false)}
          onOpenConfig={() => setIsJudgeConfigModalOpen(true)}
        />
        <JudgeConfigModal
          isOpen={isJudgeConfigModalOpen}
          onClose={() => setIsJudgeConfigModalOpen(false)}
          initialJudgeId={selectedJudgeId}
        />
      </>
    );
  }

  return (
    <div className="flex-1 min-h-0 bg-zinc-100 flex flex-col items-center justify-start sm:p-2 select-none overflow-hidden">
      {/* Mobile-Viewport Frame */}
      <div className="w-full max-w-md bg-white sm:rounded-xl border border-zinc-300 shadow-sm overflow-hidden flex flex-col h-full">
        {/* Top App Bar (Exact layout from Image 2) */}
        <div className="px-3.5 py-2.5 border-b border-zinc-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-condensed font-black text-lg sm:text-xl tracking-tight text-zinc-900 uppercase">
              HIPHOP XỨ TRÀ
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Switch Judge */}
            <select
              value={selectedJudgeId}
              onChange={(e) => setSelectedJudgeId(e.target.value)}
              disabled={Boolean(judgeAccountId)}
              className="font-mono font-bold text-xs bg-zinc-100 border border-zinc-300 text-zinc-900 rounded px-2 py-1 outline-none cursor-pointer disabled:cursor-default"
            >
              {activeJudgesList.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.code}
                </option>
              ))}
            </select>

            {/* Return to Welcome Screen */}
            <button
              onClick={() => setShowWelcome(true)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-xs font-bold text-zinc-800 transition-colors cursor-pointer"
              title="Xem lại màn hình chào mừng đăng nhập"
            >
              <img
                src={getJudgeAvatarUrl(activeJudge)}
                alt="Avatar"
                className="w-4 h-4 rounded-full object-cover border border-amber-500"
              />
              <span className="hidden sm:inline">Chào mừng</span>
            </button>

            {/* Quick 2 Photos Config (organizers only) */}
            {!judgeAccountId && (
              <button
                onClick={() => setIsJudgeConfigModalOpen(true)}
                className="p-1.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 border border-zinc-300 transition-colors cursor-pointer"
                title="Cấu hình 2 ảnh Giám khảo (Ảnh Full & Avatar)"
              >
                <Camera className="w-3.5 h-3.5 text-amber-600" />
              </button>
            )}

            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-emerald-700 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span className="hidden sm:inline">Online</span>
            </div>
          </div>
        </div>

        {scoringMode === 'battle' ? (
          <BattleScoringPanel />
        ) : (
          <PrelimScoringPanel />
        )}

        {/* Bottom tab bar (thumb zone), in event order: Prelim, then Battle */}
        {!canScorePrelim && <div className="pb-[env(safe-area-inset-bottom)] shrink-0" />}
        {canScorePrelim && (
          <nav className="grid grid-cols-2 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] shrink-0" aria-label="Chế độ chấm">
            {([
              ['prelim', 'Chấm Prelim', '4 GK', ListChecks],
              ['battle', 'Chấm Battle', '9 GK', Swords],
            ] as const).map(([mode, label, sub, Icon]) => (
              <button
                key={mode}
                onClick={() => setPickedMode(mode)}
                aria-current={scoringMode === mode ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 pt-2 pb-1.5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-amber-500 ${
                  scoringMode === mode ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                <span className={`px-4 py-0.5 rounded-full ${scoringMode === mode ? 'bg-amber-100' : ''}`}>
                  <Icon className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-black uppercase leading-none">{label}</span>
                <span className="text-[10px] font-medium leading-none">{sub}</span>
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* 2 Photos Config Modal */}
      <JudgeConfigModal
        isOpen={isJudgeConfigModalOpen}
        onClose={() => setIsJudgeConfigModalOpen(false)}
        initialJudgeId={selectedJudgeId}
      />

    </div>
  );
};
