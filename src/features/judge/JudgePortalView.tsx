import React, { useState } from 'react';
import { useTournament } from '../../state/TournamentContext';
import {
  Send,
  Check,
  Camera,
  ListChecks,
  Swords,
} from 'lucide-react';
import { isStandalone } from '../../services/pwa';
import { useWakeLock } from '../../state/useWakeLock';
import { soundFX } from '../../services/soundEffects';
import {
  getDancerAvatarUrl,
  getTeamPhotoUrl,
  stripBreakerPrefix,
  getJudgeAvatarUrl,
} from '../../shared/placeholderAssets';
import { JudgeWelcomeScreen } from './JudgeWelcomeScreen';
import { JudgeConfigModal } from './JudgeConfigModal';
import { PrelimScoringPanel } from './PrelimScoringPanel';
import { useJudgeHeartbeat } from '../../state/useJudgePresence';

type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

export const JudgePortalView: React.FC = () => {
  const {
    judges,
    prelimJudges,
    selectedJudgeId,
    setSelectedJudgeId,
    activeJudge,
    matches,
    activeMatchId,
    setActiveMatchId,
    submitJudgeVote,
    storageConfig,
    isJudgeConfigModalOpen,
    setIsJudgeConfigModalOpen,
    judgeAccountId,
  } = useTournament();

  useJudgeHeartbeat(judgeAccountId);
  useWakeLock(); // scoring screen stays on between dancers

  // Server-confirmed save status (a write made offline stays "saving" until it reaches the server).
  const [voteSave, setVoteSave] = useState<SaveState>('idle');

  // The installed app opens straight into scoring; the welcome screen stays one tap away (avatar button).
  const [showWelcome, setShowWelcome] = useState<boolean>(() => !isStandalone());
  // Prelim comes first in the day: prelim judges start there, battle-only judges on Battle.
  const [scoringMode, setScoringMode] = useState<'battle' | 'prelim'>(() =>
    prelimJudges.some((j) => j.id === selectedJudgeId) ? 'prelim' : 'battle'
  );
  const [selectedSide, setSelectedSide] = useState<'red' | 'blue' | null>('blue');
  const [isVoteSubmitted, setIsVoteSubmitted] = useState<boolean>(false);

  const [selectedRoundNum, setSelectedRoundNum] = useState<number | null>(null);

  // Active match
  const match = matches.find((m) => m.id === activeMatchId) || matches[0];
  const activeRoundNum = selectedRoundNum ?? (match?.currentRound || 1);
  const currentRound = match?.rounds.find((r) => r.roundNumber === activeRoundNum) || match?.rounds[0];
  const existingVote = currentRound?.votes[selectedJudgeId];
  // Once the operator announces the round (or the match ends), votes can't change.
  const isRoundLocked = Boolean(currentRound?.isConfirmed) || match?.status === 'finished';

  // Reset or initialize selected round when activeMatchId changes
  React.useEffect(() => {
    setSelectedRoundNum(null);
  }, [match?.id]);

  // Initialize selected side from current round if exists
  React.useEffect(() => {
    if (existingVote === 'red' || existingVote === 'blue') {
      setSelectedSide(existingVote);
      setIsVoteSubmitted(true);
    } else if (existingVote === 'hidden') {
      // Published "has voted" arrived before this judge's own ballot: keep the current pick.
      setIsVoteSubmitted(true);
    } else {
      setSelectedSide(null);
      setIsVoteSubmitted(false);
    }
    setVoteSave((prev) => (prev === 'saving' ? prev : existingVote ? 'saved' : 'idle'));
  }, [match?.id, activeRoundNum, existingVote, selectedJudgeId]);

  const handleSelectSide = (side: 'red' | 'blue') => {
    if (isRoundLocked) return;
    setSelectedSide(side);
    setIsVoteSubmitted(false);
    soundFX.playVoteClick();
  };

  const handleConfirmVote = async () => {
    if (!match || !selectedSide || isRoundLocked) return;
    setIsVoteSubmitted(true);
    setVoteSave('saving');
    const ok = await submitJudgeVote(match.id, activeRoundNum, selectedJudgeId, selectedSide);
    setVoteSave(ok ? 'saved' : 'failed');
  };

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
          /* BATTLE SCORING UI (Distraction-free, High-contrast, Exact to Image 2) */
          <div className="p-3.5 flex flex-col flex-1 min-h-0 space-y-3 overflow-y-auto">
            {/* Match Switcher Dropdown */}
            <div className="flex items-center justify-between text-xs text-zinc-500 bg-zinc-50 px-3 py-1.5 rounded border border-zinc-200">
              <span className="font-semibold text-zinc-600">Chọn trận:</span>
              <select
                value={match?.id}
                onChange={(e) => setActiveMatchId(e.target.value)}
                className="font-bold text-zinc-900 bg-transparent border-none outline-none cursor-pointer"
              >
                {matches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.category === 'pro_2v2' ? 'PRO 2v2' : 'NEWBIE 1v1'} • {m.stageName} • Trận {m.matchNumber}
                  </option>
                ))}
              </select>
            </div>

            {/* Battle Header */}
            <div className="text-center space-y-0.5">
              <h2 className="font-condensed font-black text-2xl text-zinc-900 tracking-tight uppercase">
                {match?.category === 'pro_2v2' ? 'KID PRO • 2vs2' : 'KID NEWBIE • 1vs1'}
              </h2>
              <div className="text-xs font-bold text-zinc-500">
                {match?.stageName} · Trận {String(match?.matchNumber).padStart(2, '0')}
              </div>
            </div>

            {/* Round Switcher Tabs (Round 1, Round 2, Tie-Break) */}
            <div className="flex items-center justify-center gap-1.5 p-1 bg-zinc-100 rounded-lg">
              {match?.rounds.map((r) => {
                const isVoted = Boolean(r.votes[selectedJudgeId]);
                const isSelected = r.roundNumber === activeRoundNum;
                return (
                  <button
                    key={r.roundNumber}
                    onClick={() => {
                      setSelectedRoundNum(r.roundNumber);
                      soundFX.playVoteClick();
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-md font-condensed font-black text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      isSelected
                        ? r.isTieBreak
                          ? 'bg-amber-500 text-black shadow-sm ring-2 ring-amber-400'
                          : 'bg-zinc-900 text-white shadow-sm'
                        : r.isTieBreak
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-white text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
                    }`}
                  >
                    <span>{r.isTieBreak ? '⚡ TIE-BREAK' : `ROUND ${r.roundNumber}`}</span>
                    {isVoted && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Đã chấm round này" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Round Wins Score */}
            <div className="text-center">
              <div className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                Tỉ số round thắng
              </div>
              <div className="font-condensed font-black text-4xl text-zinc-900 tracking-widest tabular-nums mt-0.5">
                {match?.roundWinsRed} — {match?.roundWinsBlue}
              </div>
            </div>

            {/* Two Large Competing Cards (Side-by-side, Ultra-clean, High contrast) */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* GÓC ĐỎ */}
              <div
                onClick={() => handleSelectSide('red')}
                className={`rounded border-2 transition-all p-3 text-center flex flex-col justify-between cursor-pointer ${
                  selectedSide === 'red'
                    ? 'border-red-600 bg-red-50 ring-1 ring-red-600'
                    : 'border-zinc-200 bg-white hover:border-red-300'
                }`}
              >
                <div>
                  <div className="text-xs font-black text-red-600 uppercase tracking-wider py-0.5 border-b border-red-100">
                    GÓC ĐỎ
                  </div>

                  {/* Primary Bboy/Bgirl Headline */}
                  <div className="font-condensed font-black text-xl text-zinc-900 mt-2 whitespace-nowrap overflow-hidden text-ellipsis uppercase leading-tight">
                    {match?.sideRed.dancers.map((d) => stripBreakerPrefix(d.name)).join(' & ') || stripBreakerPrefix(match?.sideRed.name)}
                  </div>

                  {/* Secondary Team Name */}
                  <div className="text-[11px] font-bold text-red-600 whitespace-nowrap overflow-hidden text-ellipsis uppercase mt-0.5">
                    {match?.category === 'pro_2v2'
                      ? match.sideRed.name
                      : match?.sideRed.dancers[0]?.crew}
                  </div>

                  {/* Avatars / Team Photo with Placeholders */}
                  <div className="flex items-center justify-center gap-1.5 my-2.5">
                    {match?.category === 'pro_2v2' ? (
                      <img
                        src={getTeamPhotoUrl(match.sideRed, storageConfig.placeholders)}
                        alt={match.sideRed.name}
                        className="h-12 w-20 rounded object-cover border border-red-400"
                      />
                    ) : (
                      match?.sideRed.dancers.map((d) => (
                        <img
                          key={d.id}
                          src={getDancerAvatarUrl(d, storageConfig.placeholders)}
                          alt={d.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-red-500"
                        />
                      ))
                    )}
                  </div>

                  <div className="text-[10px] font-mono text-zinc-500">
                    {match?.sideRed.sbdText}
                  </div>
                </div>

                <div className="pt-3">
                  <div
                    className={`w-full py-2.5 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-colors uppercase ${
                      selectedSide === 'red'
                        ? 'bg-red-600 text-white'
                        : 'border border-zinc-300 text-zinc-700 bg-white'
                    }`}
                  >
                    {selectedSide === 'red' ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Đã chọn</span>
                      </>
                    ) : (
                      <span>Chọn đỏ</span>
                    )}
                  </div>
                </div>
              </div>

              {/* GÓC XANH */}
              <div
                onClick={() => handleSelectSide('blue')}
                className={`rounded border-2 transition-all p-3 text-center flex flex-col justify-between cursor-pointer ${
                  selectedSide === 'blue'
                    ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                    : 'border-zinc-200 bg-white hover:border-blue-300'
                }`}
              >
                <div>
                  <div className="text-xs font-black text-blue-600 uppercase tracking-wider py-0.5 border-b border-blue-100">
                    GÓC XANH
                  </div>

                  {/* Primary Bboy/Bgirl Headline */}
                  <div className="font-condensed font-black text-xl text-zinc-900 mt-2 whitespace-nowrap overflow-hidden text-ellipsis uppercase leading-tight">
                    {match?.sideBlue.dancers.map((d) => stripBreakerPrefix(d.name)).join(' & ') || stripBreakerPrefix(match?.sideBlue.name)}
                  </div>

                  {/* Secondary Team Name */}
                  <div className="text-[11px] font-bold text-blue-600 whitespace-nowrap overflow-hidden text-ellipsis uppercase mt-0.5">
                    {match?.category === 'pro_2v2'
                      ? match.sideBlue.name
                      : match?.sideBlue.dancers[0]?.crew}
                  </div>

                  {/* Avatars / Team Photo with Placeholders */}
                  <div className="flex items-center justify-center gap-1.5 my-2.5">
                    {match?.category === 'pro_2v2' ? (
                      <img
                        src={getTeamPhotoUrl(match.sideBlue, storageConfig.placeholders)}
                        alt={match.sideBlue.name}
                        className="h-12 w-20 rounded object-cover border border-blue-400"
                      />
                    ) : (
                      match?.sideBlue.dancers.map((d) => (
                        <img
                          key={d.id}
                          src={getDancerAvatarUrl(d, storageConfig.placeholders)}
                          alt={d.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-blue-500"
                        />
                      ))
                    )}
                  </div>

                  <div className="text-[10px] font-mono text-zinc-500">
                    {match?.sideBlue.sbdText}
                  </div>
                </div>

                <div className="pt-3">
                  <div
                    className={`w-full py-2.5 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-colors uppercase ${
                      selectedSide === 'blue'
                        ? 'bg-blue-600 text-white'
                        : 'border border-zinc-300 text-zinc-700 bg-white'
                    }`}
                  >
                    {selectedSide === 'blue' ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Đã chọn</span>
                      </>
                    ) : (
                      <span>Chọn xanh</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Status Box */}
            <div className="bg-zinc-50 border border-zinc-200 rounded p-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-zinc-500">Đã chọn: </span>
                  <span
                    className={`font-black uppercase ${
                      selectedSide === 'red'
                        ? 'text-red-600'
                        : selectedSide === 'blue'
                        ? 'text-blue-600'
                        : 'text-zinc-400'
                    }`}
                  >
                    {selectedSide === 'red'
                      ? 'Đội đỏ'
                      : selectedSide === 'blue'
                      ? 'Đội xanh'
                      : 'Chưa chọn'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs" aria-live="polite">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      voteSave === 'saved'
                        ? 'bg-emerald-600'
                        : voteSave === 'saving'
                        ? 'bg-amber-500 animate-pulse'
                        : voteSave === 'failed'
                        ? 'bg-red-600'
                        : 'bg-zinc-400'
                    }`}
                  />
                  <span className="text-zinc-500 font-medium">
                    {voteSave === 'saved'
                      ? 'Đã lưu ✓'
                      : voteSave === 'saving'
                      ? 'Đang gửi…'
                      : voteSave === 'failed'
                      ? 'Gửi lỗi, bấm xác nhận lại'
                      : isVoteSubmitted
                      ? 'Đã gửi phiếu'
                      : 'Chưa gửi'}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-zinc-400">
                {isRoundLocked
                  ? 'Hiệp này đã được công bố, phiếu đã khoá.'
                  : voteSave === 'saving'
                  ? 'Mạng chập chờn? Phiếu được giữ trên máy và tự gửi lại khi có mạng.'
                  : 'Có thể đổi lựa chọn trước khi xác nhận gửi.'}
              </div>
            </div>

            {/* Confirmation Button (Large, thumb-optimized) */}
            <div className="space-y-1">
              <div className="text-center text-[11px] text-zinc-400 font-medium">
                Trận {String(match?.matchNumber).padStart(2, '0')} · {currentRound?.isTieBreak ? 'Tie-Break' : `Round ${activeRoundNum}`} · {activeJudge.code}
              </div>

              <button
                onClick={handleConfirmVote}
                disabled={!selectedSide || isRoundLocked}
                className={`w-full py-3.5 px-4 rounded font-bold text-xs sm:text-sm text-white shadow-xs transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  selectedSide === 'red'
                    ? 'bg-red-700 hover:bg-red-800'
                    : selectedSide === 'blue'
                    ? 'bg-blue-700 hover:bg-blue-800'
                    : 'bg-zinc-800'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>
                  {isRoundLocked
                    ? 'Hiệp đã khoá'
                    : selectedSide === 'red'
                    ? 'Xác nhận chọn đội đỏ'
                    : selectedSide === 'blue'
                    ? 'Xác nhận chọn đội xanh'
                    : 'Chọn đội để xác nhận'}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <PrelimScoringPanel />
        )}

        {/* Bottom tab bar (thumb zone), in event order: Prelim, then Battle */}
        <nav className="grid grid-cols-2 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] shrink-0" aria-label="Chế độ chấm">
          {([
            ['prelim', 'Chấm Prelim', '4 GK', ListChecks],
            ['battle', 'Chấm Battle', '9 GK', Swords],
          ] as const).map(([mode, label, sub, Icon]) => (
            <button
              key={mode}
              onClick={() => setScoringMode(mode)}
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
