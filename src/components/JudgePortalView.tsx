import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import {
  Send,
  ChevronLeft,
  ChevronRight,
  Check,
  Camera,
  Zap,
} from 'lucide-react';
import { soundFX } from '../services/soundEffects';
import {
  getDancerAvatarUrl,
  getTeamPhotoUrl,
  stripBreakerPrefix,
  getJudgeAvatarUrl,
} from '../utils/placeholderAssets';
import { JudgeWelcomeScreen } from './JudgeWelcomeScreen';
import { JudgeConfigModal } from './JudgeConfigModal';
import { BankingScoreKeypadModal } from './BankingScoreKeypadModal';
import { useJudgeHeartbeat } from '../hooks/useJudgePresence';

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
    updatePrelimScore,
    activeCategory,
    newbieDancers,
    proDancers,
    storageConfig,
    isJudgeConfigModalOpen,
    setIsJudgeConfigModalOpen,
    judgeAccountId,
    isNewbieTop32Locked,
    isProTop32Locked,
  } = useTournament();

  useJudgeHeartbeat(judgeAccountId);

  // Server-confirmed save status (a write made offline stays "saving" until it reaches the server).
  const [voteSave, setVoteSave] = useState<SaveState>('idle');
  const [prelimSave, setPrelimSave] = useState<SaveState>('idle');

  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [scoringMode, setScoringMode] = useState<'battle' | 'prelim'>('battle');
  const [selectedSide, setSelectedSide] = useState<'red' | 'blue' | null>('blue');
  const [isVoteSubmitted, setIsVoteSubmitted] = useState<boolean>(false);
  const [activePrelimDancerIdx, setActivePrelimDancerIdx] = useState<number>(0);
  const [isKeypadOpen, setIsKeypadOpen] = useState<boolean>(false);

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

  // Prelim mode dancers & 4 Prelim Judges
  const dancersList = activeCategory === 'newbie_1v1' ? newbieDancers : proDancers;
  const activePrelimDancer = dancersList[activePrelimDancerIdx] || dancersList[0];
  const savedScore = Math.round(activePrelimDancer?.prelimScores[selectedJudgeId] ?? 80);

  // Staged / Draft score (displays immediately on screen, only saved when judge confirms)
  const [stagedScore, setStagedScore] = useState<number>(savedScore);

  // Track whether current dancer's prelim score is confirmed by active judge
  const [confirmedPrelimDancers, setConfirmedPrelimDancers] = useState<Record<string, boolean>>({});

  // Sync stagedScore when active dancer or judge changes
  React.useEffect(() => {
    if (activePrelimDancer) {
      const saved = activePrelimDancer.prelimScores[selectedJudgeId];
      const valid = typeof saved === 'number' && !isNaN(saved) ? Math.round(saved) : 80;
      setStagedScore(valid);
    }
    setPrelimSave('idle');
  }, [activePrelimDancer?.id, selectedJudgeId]);

  const isCurrentDancerConfirmed = Boolean(
    activePrelimDancer &&
      confirmedPrelimDancers[activePrelimDancer.id] &&
      activePrelimDancer.prelimScores[selectedJudgeId] === stagedScore
  );

  const isPrelimLocked = activeCategory === 'newbie_1v1' ? isNewbieTop32Locked : isProTop32Locked;

  const handleConfirmPrelimScore = async (scoreToConfirm?: number) => {
    if (!activePrelimDancer || isPrelimLocked) return;
    const finalScore = scoreToConfirm ?? stagedScore;
    soundFX.playVoteConfirmed();
    setConfirmedPrelimDancers((prev) => ({
      ...prev,
      [activePrelimDancer.id]: true,
    }));
    setPrelimSave('saving');
    const ok = await updatePrelimScore(activeCategory, activePrelimDancer.id, selectedJudgeId, finalScore);
    setPrelimSave(ok ? 'saved' : 'failed');
  };

  // Preset click: ONLY shows number on screen, does NOT commit yet!
  const handleScorePresetClick = (preset: number) => {
    setStagedScore(preset);
    soundFX.playVoteClick();
  };

  const handleDeltaClick = (delta: number) => {
    setStagedScore((prev) => Math.min(100, Math.max(0, prev + delta)));
    soundFX.playVoteClick();
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
    <div className="h-[100dvh] max-h-[100dvh] bg-zinc-100 flex flex-col items-center justify-start sm:p-2 select-none overflow-hidden">
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

        {/* Mode Switcher */}
        <div className="p-1.5 bg-zinc-50 border-b border-zinc-200 flex gap-1 text-xs font-bold shrink-0">
          <button
            onClick={() => setScoringMode('battle')}
            className={`flex-1 py-1.5 rounded transition-colors cursor-pointer ${
              scoringMode === 'battle'
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Chấm Battle (9 GK)
          </button>
          <button
            onClick={() => setScoringMode('prelim')}
            className={`flex-1 py-1.5 rounded transition-colors cursor-pointer ${
              scoringMode === 'prelim'
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Chấm Prelim (4 GK)
          </button>
        </div>

        {scoringMode === 'battle' ? (
          /* BATTLE SCORING UI (Distraction-free, High-contrast, Exact to Image 2) */
          <div className="p-3.5 flex flex-col flex-1 space-y-3 overflow-y-auto">
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
                      : match?.sideRed.dancers[0]?.crew || 'Thí sinh tự do'}
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
                      : match?.sideBlue.dancers[0]?.crew || 'Thí sinh tự do'}
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
          /* PRELIM SOLO SCORING (FIT 100dvh MOBILE - ZERO SCROLL) */
          <div className="p-2.5 sm:p-3 flex flex-col flex-1 justify-between overflow-hidden gap-2">
            {/* 1. Dancer Navigator */}
            <div className="flex items-center justify-between bg-zinc-50 px-2.5 py-1.5 rounded-lg border border-zinc-200 shrink-0">
              <button
                onClick={() => setActivePrelimDancerIdx((p) => Math.max(0, p - 1))}
                disabled={activePrelimDancerIdx === 0}
                className="p-1.5 rounded-md bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-700 disabled:opacity-25 cursor-pointer shadow-2xs transition-colors"
                title="Thí sinh trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded">
                  SBD: {activePrelimDancer?.sbd}
                </span>
                <span className="text-xs font-mono font-bold text-zinc-700">
                  #{activePrelimDancerIdx + 1} <span className="text-zinc-400 font-normal">/ {dancersList.length}</span>
                </span>
              </div>

              <button
                onClick={() => setActivePrelimDancerIdx((p) => Math.min(dancersList.length - 1, p + 1))}
                disabled={activePrelimDancerIdx === dancersList.length - 1}
                className="p-1.5 rounded-md bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-700 disabled:opacity-25 cursor-pointer shadow-2xs transition-colors"
                title="Thí sinh sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 2. Active Dancer Card (Compact Horizontal) */}
            <div className="p-2 sm:p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center gap-2.5 shrink-0">
              {activePrelimDancer?.avatarUrl ? (
                <img
                  src={activePrelimDancer.avatarUrl}
                  alt={activePrelimDancer.name}
                  className="w-11 h-11 rounded-full object-cover border-2 border-zinc-300 shadow-2xs shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-zinc-200 border-2 border-zinc-300 flex items-center justify-center font-black text-xs text-zinc-600 shrink-0">
                  {activePrelimDancer?.sbd}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-condensed font-black text-lg sm:text-xl text-zinc-900 tracking-tight uppercase truncate leading-tight">
                  {activePrelimDancer?.name}
                </div>
                <div className="text-[11px] text-zinc-500 truncate">
                  {activePrelimDancer?.crew || 'Tự do'}
                </div>
              </div>
              <div className="text-right shrink-0 pl-1">
                <span className="text-[9px] font-mono text-zinc-400 uppercase block">Đã lưu</span>
                <span className="font-mono font-black text-xs sm:text-sm text-zinc-800 bg-zinc-200/70 px-1.5 py-0.5 rounded">
                  {savedScore} đ
                </span>
              </div>
            </div>

            {/* 3. Central Interactive Score Display (Chạm để mở bàn phím) */}
            <div
              onClick={() => setIsKeypadOpen(true)}
              className="text-center py-2 px-3 bg-amber-50/50 hover:bg-amber-50 rounded-xl border-2 border-amber-300 hover:border-amber-400 transition-all cursor-pointer group shrink-0 active:scale-98 shadow-xs"
              title="Chạm để mở bàn phím bấm số (kiểu app ngân hàng)"
            >
              <div className="flex items-center justify-between text-[11px] text-zinc-500 font-semibold px-1">
                <span className="flex items-center gap-1">
                  <span>Điểm bạn chấm ({activeJudge.code})</span>
                  <span className="text-[10px] text-amber-700 bg-amber-200/70 font-bold px-1.5 py-0.2 rounded">
                    Chạm để sửa
                  </span>
                </span>
                <span className="text-[10px] bg-zinc-900 text-amber-400 font-black px-1.5 py-0.5 rounded shadow-2xs">
                  Bấm số
                </span>
              </div>

              <div className="font-condensed font-black text-5xl sm:text-6xl text-zinc-900 group-hover:text-amber-600 tracking-tight tabular-nums my-0.5 transition-colors leading-none">
                {stagedScore}
              </div>

              <div className="text-[11px] text-zinc-500 font-medium flex items-center justify-center gap-1">
                <span>Chạm màn hình mở bàn phím bấm số (0–100 đ)</span>
              </div>
            </div>

            {/* 4. Quick Scoring Presets: 40, 50, 60, 70, 80, 90 & Micro adjustments */}
            <div className="space-y-1.5 shrink-0">
              <div className="flex items-center justify-between text-[11px] text-zinc-600 font-mono px-0.5">
                <span className="flex items-center gap-1 font-bold text-zinc-800">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>CHẤM NHANH (40 – 90)</span>
                </span>
                <span className="text-[10px] text-zinc-400">Hiện số lên màn hình</span>
              </div>

              {/* 6 Quick Presets: 40, 50, 60, 70, 80, 90 (Only changes display, not auto-commit) */}
              <div className="grid grid-cols-6 gap-1">
                {[40, 50, 60, 70, 80, 90].map((preset) => {
                  const isSelected = stagedScore === preset;
                  return (
                    <button
                      key={preset}
                      onClick={() => handleScorePresetClick(preset)}
                      className={`py-2 rounded-lg font-mono text-sm font-black transition-all cursor-pointer border active:scale-95 ${
                        isSelected
                          ? 'bg-amber-500 text-zinc-950 border-amber-600 shadow-xs ring-2 ring-amber-400/40'
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>

              {/* Fine tuning: -2, -1, +1, +2 and Open Keypad button */}
              <div className="grid grid-cols-5 gap-1">
                {[-2, -1, 1, 2].map((delta) => (
                  <button
                    key={delta}
                    onClick={() => handleDeltaClick(delta)}
                    className="py-1.5 rounded-lg bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300 font-mono text-xs font-bold cursor-pointer transition-colors active:scale-95 shadow-2xs"
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </button>
                ))}

                <button
                  onClick={() => setIsKeypadOpen(true)}
                  className="py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-400 font-bold text-xs flex items-center justify-center cursor-pointer transition-colors shadow-2xs active:scale-95"
                  title="Mở bàn phím số ngân hàng"
                >
                  Phím số
                </button>
              </div>
            </div>

            {/* 5. Status & Confirmation Actions */}
            <div className="space-y-1.5 shrink-0 pt-1 border-t border-zinc-200">
              <div className="flex items-center justify-between text-xs px-0.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCurrentDancerConfirmed ? 'bg-emerald-600' : 'bg-amber-500 animate-pulse'
                    }`}
                  />
                  <span className={isCurrentDancerConfirmed ? 'text-emerald-700' : 'text-amber-800'} aria-live="polite">
                    {isPrelimLocked
                      ? 'Prelim đã chốt, không sửa được điểm'
                      : prelimSave === 'saving'
                      ? `Đang gửi: ${stagedScore} đ…`
                      : prelimSave === 'failed'
                      ? 'Gửi lỗi, bấm xác nhận lại'
                      : isCurrentDancerConfirmed
                      ? `Đã lưu ✓ ${stagedScore} đ`
                      : `Chưa lưu: ${stagedScore} đ`}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-zinc-400">
                  Thí sinh {activePrelimDancerIdx + 1}/{dancersList.length}
                </span>
              </div>

              {!isCurrentDancerConfirmed ? (
                /* Primary Confirmation Button */
                <button
                  onClick={() => handleConfirmPrelimScore()}
                  disabled={isPrelimLocked}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-black text-sm uppercase tracking-wider transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check className="w-5 h-5 font-black stroke-[3]" />
                  <span>XÁC NHẬN CHẤM: {stagedScore} ĐIỂM</span>
                </button>
              ) : (
                /* Confirmed State + Quick Next */
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setIsKeypadOpen(true)}
                    className="py-2.5 px-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-emerald-100 transition-colors"
                  >
                    <Check className="w-4 h-4 text-emerald-600 font-black stroke-[3]" />
                    <span>Đã chốt (Sửa)</span>
                  </button>

                  {activePrelimDancerIdx < dancersList.length - 1 ? (
                    <button
                      onClick={() => setActivePrelimDancerIdx((p) => p + 1)}
                      className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-black text-xs uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-1 cursor-pointer active:scale-98"
                    >
                      <span>Tiếp theo</span>
                      <ChevronRight className="w-4 h-4 text-amber-400" />
                    </button>
                  ) : (
                    <div className="py-2.5 px-3 rounded-xl bg-zinc-100 text-zinc-600 text-xs font-bold text-center flex items-center justify-center">
                      ✓ Hoàn thành
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2 Photos Config Modal */}
      <JudgeConfigModal
        isOpen={isJudgeConfigModalOpen}
        onClose={() => setIsJudgeConfigModalOpen(false)}
        initialJudgeId={selectedJudgeId}
      />

      {/* Banking-style Score Keypad Modal for Judge Mobile (Theme Light) */}
      <BankingScoreKeypadModal
        isOpen={isKeypadOpen}
        onClose={() => setIsKeypadOpen(false)}
        dancer={activePrelimDancer}
        judge={activeJudge}
        initialScore={stagedScore}
        onSave={(score) => {
          setStagedScore(score);
          handleConfirmPrelimScore(score);
        }}
        onSaveAndNextDancer={(score) => {
          setStagedScore(score);
          handleConfirmPrelimScore(score);
          if (activePrelimDancerIdx < dancersList.length - 1) {
            setActivePrelimDancerIdx(activePrelimDancerIdx + 1);
          } else {
            setIsKeypadOpen(false);
          }
        }}
        hasNextDancer={activePrelimDancerIdx < dancersList.length - 1}
      />
    </div>
  );
};
