import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Award, Zap, Minimize2, Maximize2, X, Check } from 'lucide-react';
import { BattleMatch, BattleSide } from '../../domain/types';
import { soundFX } from '../../services/soundEffects';
import {
  getDancerHalfBodyUrl,
  getTeamPhotoUrl,
  stripBreakerPrefix,
} from '../../shared/placeholderAssets';
import { useTournament } from '../../state/TournamentContext';

interface AutomatedVictoryDisplayProps {
  match: BattleMatch;
}

export const AutomatedVictoryDisplay: React.FC<AutomatedVictoryDisplayProps> = ({ match }) => {
  const { storageConfig } = useTournament();
  const [isVisible, setIsVisible] = useState<boolean>(() => match.status === 'finished' && !!match.winnerSide);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const lastTimestampRef = useRef<number | undefined>(match.victoryTriggerTimestamp);
  const autoMinimizeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const winnerSide: 'red' | 'blue' = match.winnerSide || (match.roundWinsRed >= match.roundWinsBlue ? 'red' : 'blue');
  const isRedWinner = winnerSide === 'red';
  const winningSideData: BattleSide = isRedWinner ? match.sideRed : match.sideBlue;

  // Extract clean breaker name without bboy/bgirl prefix in 1 line
  const breakerName = winningSideData.dancers && winningSideData.dancers.length > 0
    ? winningSideData.dancers.map((d) => stripBreakerPrefix(d.name)).join(' & ')
    : stripBreakerPrefix(winningSideData.name);

  // Extract SBD
  const sbdText = winningSideData.sbdText
    ? winningSideData.sbdText.replace(/^SBD\s*/i, '').trim()
    : winningSideData.dancers && winningSideData.dancers.length > 0
    ? winningSideData.dancers.map((d) => d.sbd).join('/')
    : '000';

  // Extract crew or team name
  const teamCrewText = match.category === 'pro_2v2'
    ? winningSideData.name
    : winningSideData.dancers?.[0]?.crew || '';

  // Winner photo url
  const winnerPhotoUrl = match.category === 'pro_2v2'
    ? getTeamPhotoUrl(winningSideData, storageConfig.placeholders)
    : getDancerHalfBodyUrl(winningSideData.dancers?.[0], storageConfig.placeholders);

  // Confetti cannon trigger function
  const fireVictoryConfetti = (side: 'red' | 'blue') => {
    const sideColors = side === 'red'
      ? ['#ef4444', '#dc2626', '#fca5a5', '#fbbf24', '#ffffff']
      : ['#3b82f6', '#2563eb', '#93c5fd', '#fbbf24', '#ffffff'];

    // Left cannon burst
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 70,
      origin: { x: 0.05, y: 0.7 },
      colors: sideColors,
    });

    // Right cannon burst
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 70,
      origin: { x: 0.95, y: 0.7 },
      colors: sideColors,
    });

    // Center golden championship shower
    setTimeout(() => {
      confetti({
        particleCount: 120,
        spread: 120,
        origin: { x: 0.5, y: 0.4 },
        colors: ['#fbbf24', '#f59e0b', '#fef08a', '#ffffff'],
      });
    }, 350);

    // Final high burst
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 160,
        origin: { y: 0.55 },
        colors: sideColors,
      });
    }, 700);
  };

  // Launch celebration sequence
  const launchCelebration = (side: 'red' | 'blue') => {
    setIsVisible(true);
    setIsMinimized(false);
    fireVictoryConfetti(side);

    // Play fanfare
    try {
      soundFX.playChampionFanfare(side);
      setTimeout(() => {
        soundFX.announceMatchWinner(side, breakerName);
      }, 500);
    } catch {
      // Audio autoplay policy fallback
    }

    // Auto-minimize after 12 seconds so stage operators can see 9-judge matrix
    if (autoMinimizeTimerRef.current) {
      clearTimeout(autoMinimizeTimerRef.current);
    }
    autoMinimizeTimerRef.current = setTimeout(() => {
      setIsMinimized(true);
    }, 12000);
  };

  // 1. React to match victoryTriggerTimestamp update from Context
  useEffect(() => {
    if (match.status === 'finished' && match.winnerSide) {
      if (match.victoryTriggerTimestamp && match.victoryTriggerTimestamp !== lastTimestampRef.current) {
        lastTimestampRef.current = match.victoryTriggerTimestamp;
        launchCelebration(match.winnerSide);
      } else if (!isVisible && !lastTimestampRef.current) {
        setIsVisible(true);
      }
    } else {
      setIsVisible(false);
      setIsMinimized(false);
    }
  }, [match.status, match.winnerSide, match.victoryTriggerTimestamp]);

  // 2. React to Window Custom Event (Zero-latency dispatch from operator)
  useEffect(() => {
    const handleCustomTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<{ matchId: string; side: 'red' | 'blue'; winnerName: string; timestamp: number }>;
      if (customEvent.detail && customEvent.detail.matchId === match.id) {
        lastTimestampRef.current = customEvent.detail.timestamp;
        launchCelebration(customEvent.detail.side);
      }
    };

    const handleCustomDismiss = (e: Event) => {
      const customEvent = e as CustomEvent<{ matchId: string }>;
      if (customEvent.detail && customEvent.detail.matchId === match.id) {
        setIsVisible(false);
        setIsMinimized(false);
      }
    };

    window.addEventListener('VICTORY_DISPLAY_TRIGGER', handleCustomTrigger);
    window.addEventListener('VICTORY_DISPLAY_DISMISS', handleCustomDismiss);

    return () => {
      window.removeEventListener('VICTORY_DISPLAY_TRIGGER', handleCustomTrigger);
      window.removeEventListener('VICTORY_DISPLAY_DISMISS', handleCustomDismiss);
      if (autoMinimizeTimerRef.current) {
        clearTimeout(autoMinimizeTimerRef.current);
      }
    };
  }, [match.id, breakerName]);

  // If not visible or match is ongoing, render nothing
  if (!isVisible || match.status !== 'finished' || !match.winnerSide) {
    return null;
  }

  // =========================================================================
  // VIEW MODE A: MINIMIZED FLOATING CHAMPION BAR (Allows viewing 9-judge matrix)
  // =========================================================================
  if (isMinimized) {
    return (
      <aside aria-label="Winner bar" className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl animate-in fade-in slide-in-from-top-4 duration-500">
        <div
          className={`flex items-center justify-between px-5 py-2.5 rounded-2xl shadow-2xl border-2 backdrop-blur-md transition-all ${
            isRedWinner
              ? 'bg-gradient-to-r from-red-950/95 via-red-900/95 to-amber-950/95 border-red-500 shadow-red-900/50'
              : 'bg-gradient-to-r from-blue-950/95 via-blue-900/95 to-amber-950/95 border-blue-500 shadow-blue-900/50'
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src={winnerPhotoUrl}
                alt={breakerName}
                className={`w-12 h-12 rounded-full object-cover border-2 ${
                  isRedWinner ? 'border-red-400' : 'border-blue-400'
                } shadow-md`}
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center text-black font-black text-[10px] shadow">
                <Trophy className="w-3 h-3 text-black fill-black" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-400 text-black font-black text-[10px] tracking-wider uppercase font-condensed">
                  CHAMPION
                </span>
                <span className={`text-[11px] font-mono font-bold uppercase ${isRedWinner ? 'text-red-300' : 'text-blue-300'}`}>
                  {isRedWinner ? 'GÓC ĐỎ' : 'GÓC XANH'} · SBD: {sbdText}
                </span>
              </div>
              <div className="font-condensed font-black text-xl text-white tracking-tight uppercase whitespace-nowrap overflow-hidden text-ellipsis leading-tight">
                {breakerName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block font-mono">
              <div className="text-[10px] text-amber-300/80 uppercase tracking-widest font-bold">
                TỈ SỐ CHUNG CUỘC
              </div>
              <div className="text-base font-black text-amber-300 tabular-nums">
                {match.roundWinsRed} - {match.roundWinsBlue} {match.rounds.some((r) => r.isTieBreak) ? '(TIE-BREAK)' : ''}
              </div>
            </div>

            {/* Toggle Fullscreen / Re-expand */}
            <button
              onClick={() => setIsMinimized(false)}
              className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-condensed font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95 shadow cursor-pointer"
              title="Mở rộng bảng vinh danh toàn màn hình"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Toàn Màn Hình</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // =========================================================================
  // VIEW MODE B: FULL AUTOMATED OLYMPIC CELEBRATION OVERLAY
  // =========================================================================
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Khung vinh danh nhà vô địch"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl overflow-hidden select-none animate-in fade-in zoom-in-95 duration-500"
    >
      {/* Dynamic Ambient Background Glows */}
      <div
        className={`absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[140px] pointer-events-none opacity-60 ${
          isRedWinner ? 'bg-red-600/60' : 'bg-blue-600/60'
        }`}
      />
      <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] pointer-events-none bg-amber-500/40" />

      {/* Background Animated Rays / Sunburst subtle styling */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-300 via-transparent to-transparent" />

      {/* Main Champion Card */}
      <div
        className={`relative z-10 w-full max-w-4xl rounded-3xl border-4 shadow-[0_0_90px_rgba(0,0,0,0.9)] overflow-hidden transition-all ${
          isRedWinner
            ? 'border-red-500 bg-gradient-to-b from-zinc-950 via-zinc-900 to-red-950/90 shadow-red-900/60'
            : 'border-blue-500 bg-gradient-to-b from-zinc-950 via-zinc-900 to-blue-950/90 shadow-blue-900/60'
        }`}
      >
        {/* Top Gold Olympic Ribbon Header */}
        <div className="relative bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 text-black py-2.5 px-6 flex items-center justify-between border-b-2 border-amber-200 shadow-md">
          <div className="flex items-center gap-2 font-mono font-black text-xs sm:text-sm tracking-widest uppercase">
            <Trophy className="w-4 h-4 text-black fill-black" />
            <span>HIPHOP XỨ TRÀ 2026 · VÒNG CHUNG KẾT</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 rounded-md bg-black/20 hover:bg-black/30 text-black transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold px-2"
              title="Thu nhỏ để xem bảng điểm 9 Giám khảo"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Thu nhỏ (Bảng điểm)</span>
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 rounded-md bg-black/20 hover:bg-black/40 text-black transition-colors cursor-pointer"
              title="Đóng bảng vinh danh"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Centerpiece Content */}
        <div className="p-6 sm:p-10 flex flex-col items-center text-center">
          {/* Winner Badge Callout */}
          <div className="inline-flex items-center gap-2.5 px-5 py-1.5 rounded-full bg-amber-400 text-black font-condensed font-black text-sm sm:text-base uppercase tracking-widest shadow-[0_0_25px_rgba(251,191,36,0.8)] border border-white mb-5 animate-pulse">
            <Trophy className="w-4 h-4 text-black" />
            <span>WINNER • CHIẾN THẮNG CHUNG CUỘC</span>
            <Trophy className="w-4 h-4 text-black" />
          </div>

          {/* Athlete / Crew Image with Golden Laurel Aura */}
          <div className="relative my-2">
            {/* Outer Laurel / Halo glow */}
            <div
              className={`absolute -inset-3 rounded-full blur-xl opacity-75 ${
                isRedWinner ? 'bg-red-500' : 'bg-blue-500'
              }`}
            />
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500 animate-spin-slow" />

            <div className="relative w-40 h-40 sm:w-56 sm:h-56 rounded-full overflow-hidden border-4 border-amber-300 shadow-2xl bg-zinc-950">
              <img
                src={winnerPhotoUrl}
                alt={breakerName}
                className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Corner Badge Tag */}
            <div
              className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full font-condensed font-black text-xs sm:text-sm uppercase tracking-widest text-white shadow-xl border-2 border-white flex items-center gap-1.5 whitespace-nowrap ${
                isRedWinner ? 'bg-red-600' : 'bg-blue-600'
              }`}
            >
              <Award className="w-4 h-4 text-amber-300" />
              <span>{isRedWinner ? 'GÓC ĐỎ • RED' : 'GÓC XANH • BLUE'}</span>
            </div>
          </div>

          {/* Breaker Name strictly on 1 LINE */}
          <div className="w-full max-w-3xl mt-6">
            <h1 className="font-condensed font-black text-4xl sm:text-6xl md:text-7xl text-white tracking-tight uppercase leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] whitespace-nowrap overflow-hidden text-ellipsis">
              {breakerName}
            </h1>

            {/* Sub-details: SBD & Crew / Team */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-3 text-sm sm:text-base font-mono">
              <div className="px-3.5 py-1 rounded-lg bg-zinc-800/90 border border-zinc-700 text-amber-300 font-bold uppercase flex items-center gap-1.5 shadow">
                <span className="text-zinc-400">SBD:</span>
                <span className="text-amber-300 font-black">{sbdText}</span>
              </div>

              {teamCrewText && (
                <div className="px-4 py-1 rounded-lg bg-zinc-800/90 border border-zinc-700 text-white font-bold uppercase tracking-wider shadow">
                  {teamCrewText}
                </div>
              )}

              <div className="px-3.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400 text-amber-300 font-bold uppercase tracking-wider shadow">
                {match.category === 'pro_2v2' ? 'PRO 2VS2 BREAKING' : '1VS1 NEWBIE U16'}
              </div>
            </div>
          </div>

          {/* Final Match Score Summary */}
          <div className="mt-6 pt-5 border-t border-white/15 w-full flex flex-col sm:flex-row items-center justify-between gap-4 px-2 sm:px-6">
            <div className="flex items-center gap-3 text-left">
              <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400/60 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest font-bold">
                  HỆ THỐNG ĐIỂM SỐ CHUNG CUỘC
                </div>
                <div className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span className="font-black text-amber-300 font-mono text-lg">
                    {match.roundWinsRed} - {match.roundWinsBlue}
                  </span>
                  <span>
                    {match.rounds.some((r) => r.isTieBreak)
                      ? '(CHIẾN THẮNG HIỆP PHỤ TIE-BREAK 2 - 1)'
                      : '(CHIẾN THẮNG TUYỆT ĐỐI 2 - 0)'}
                  </span>
                </div>
              </div>
            </div>

            {/* 9-Judge consensus pill */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-xs sm:text-sm font-mono text-sky-200">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>XÁC THỰC MA TRẬN 9 GIÁM KHẢO WDSF</span>
            </div>

            {/* Quick Action to view judge scorecard underneath */}
            <button
              onClick={() => setIsMinimized(true)}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-condensed font-black text-sm uppercase tracking-wider shadow-lg flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Xem Bảng Điểm 9 GK</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
