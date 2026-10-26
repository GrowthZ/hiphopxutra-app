import React, { useState, useEffect, useRef } from 'react';
import { useTournament } from '../context/TournamentContext';
import {
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Sun,
  Flame,
  Check,
  Zap,
  Trophy,
  Swords,
} from 'lucide-react';
import { soundFX } from '../services/soundEffects';
import { AudioSettingsModal } from './AudioSettingsModal';
import {
  getDancerHalfBodyUrl,
  getTeamPhotoUrl,
  stripBreakerPrefix,
  getJudgeAvatarUrl,
  DEFAULT_JUDGE_AVATAR,
} from '../utils/placeholderAssets';
import { BattleSide } from '../types/tournament';
import { AutomatedVictoryDisplay } from './AutomatedVictoryDisplay';

interface JudgeBallotCardProps {
  judgeCode: string;
  judgeIndex: number;
  vote?: 'red' | 'blue' | null;
  isRevealed: boolean;
  revealStartTime?: number;
}

const JudgeBallotCard: React.FC<JudgeBallotCardProps> = ({
  judgeCode,
  judgeIndex,
  vote,
  isRevealed,
  revealStartTime,
}) => {
  const [hasFlipped, setHasFlipped] = useState<boolean>(() => {
    if (!isRevealed) return false;
    if (!revealStartTime) return true;
    return Date.now() - revealStartTime > judgeIndex * 150 + 300;
  });
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const flipTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isRevealed) {
      setHasFlipped(false);
      setIsFlipping(false);
      return;
    }

    if (revealStartTime) {
      const elapsed = Date.now() - revealStartTime;
      const targetDelay = judgeIndex * 150; // 150ms per judge sequential flip

      if (elapsed < targetDelay) {
        setHasFlipped(false);
        setIsFlipping(false);
        flipTimerRef.current = setTimeout(() => {
          setIsFlipping(true);
          setHasFlipped(true);
          try {
            soundFX.playCardFlipTick(judgeIndex, vote || undefined);
          } catch {
            // ignore
          }
          setTimeout(() => setIsFlipping(false), 450);
        }, targetDelay - elapsed);
      } else {
        setHasFlipped(true);
        setIsFlipping(false);
      }
    } else {
      setHasFlipped(true);
      setIsFlipping(false);
    }

    return () => {
      if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
    };
  }, [isRevealed, revealStartTime, judgeIndex, vote]);

  // Display revealed card (flipped to Red / Blue)
  if (isRevealed && hasFlipped) {
    return (
      <div
        className={`h-8 sm:h-9 rounded-lg sm:rounded-xl border-2 flex items-center justify-center font-condensed font-black text-xs sm:text-sm tracking-wider uppercase drop-shadow-md transition-all ${
          isFlipping ? 'animate-judge-flip' : ''
        } ${
          vote === 'red'
            ? 'bg-red-600 border-red-300 text-white shadow-[0_0_16px_rgba(220,38,38,0.95)] ring-1 ring-white/50 scale-102'
            : vote === 'blue'
            ? 'bg-blue-600 border-blue-300 text-white shadow-[0_0_16px_rgba(37,99,235,0.95)] ring-1 ring-white/50 scale-102'
            : 'bg-white/10 border-white/20 text-white/40'
        }`}
        title={`${judgeCode}: Đã chọn ${vote === 'red' ? 'ĐỎ' : vote === 'blue' ? 'XANH' : 'Chưa có'}`}
      >
        <span>{vote === 'red' ? 'ĐỎ' : vote === 'blue' ? 'XANH' : '—'}</span>
      </div>
    );
  }

  // Display submitted ballot with Green checkmark (Waiting for reveal flip)
  const hasVoted = vote === 'red' || vote === 'blue';
  if (hasVoted) {
    return (
      <div
        className={`h-8 sm:h-9 rounded-lg sm:rounded-xl border-2 border-emerald-300 bg-emerald-600 text-white flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.9)] scale-102 transition-all ${
          isFlipping ? 'animate-judge-flip' : ''
        }`}
        title={`${judgeCode}: Đã chấm điểm ✓ (Chờ lật thẻ)`}
      >
        <Check className="w-5 h-5 text-white stroke-[3.5]" />
      </div>
    );
  }

  // Display pending box
  return (
    <div
      className="h-8 sm:h-9 rounded-lg sm:rounded-xl border-2 border-white/70 bg-white/90 text-zinc-400 flex items-center justify-center font-mono font-bold text-[10px] sm:text-xs shadow-xs transition-all"
      title={`${judgeCode}: Đang chờ chấm...`}
    >
      <span className="opacity-40">{judgeCode.replace('GK ', '')}</span>
    </div>
  );
};

export const StageDisplayView: React.FC = () => {
  const {
    matches,
    activeMatchId,
    setActiveMatchId,
    judges,
    soundEnabled,
    setSoundEnabled,
    storageConfig,
  } = useTournament();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [isDaylightHighContrast, setIsDaylightHighContrast] = useState(true); // Default true for outdoor daytime LED screen

  const match = matches.find((m) => m.id === activeMatchId) || matches[0];

  // 1. Hiệu ứng xuất hiện 2 team (từ ngoài lướt vào)
  const [entranceKey, setEntranceKey] = useState<number>(() => Date.now());
  const [isEntranceActive, setIsEntranceActive] = useState<boolean>(true);
  const lastMatchIdRef = useRef<string>(match?.id || '');
  const lastEntranceTimestampRef = useRef<number | undefined>(match?.entranceTriggerTimestamp);

  const triggerEntranceAnimation = (playSound = true) => {
    setEntranceKey(Date.now());
    setIsEntranceActive(true);
    if (playSound) {
      try {
        soundFX.playTeamEntranceSwoosh();
      } catch {
        // ignore
      }
    }
    setTimeout(() => {
      setIsEntranceActive(false);
    }, 1200);
  };

  useEffect(() => {
    if (!match) return;
    if (match.id !== lastMatchIdRef.current) {
      lastMatchIdRef.current = match.id;
      lastEntranceTimestampRef.current = match.entranceTriggerTimestamp;
      triggerEntranceAnimation(true);
    } else if (
      match.entranceTriggerTimestamp &&
      match.entranceTriggerTimestamp !== lastEntranceTimestampRef.current
    ) {
      lastEntranceTimestampRef.current = match.entranceTriggerTimestamp;
      triggerEntranceAnimation(true);
    }
  }, [match?.id, match?.entranceTriggerTimestamp]);

  useEffect(() => {
    const handleEntranceCustom = (e: Event) => {
      const customEvent = e as CustomEvent<{ matchId: string; timestamp: number }>;
      if (customEvent.detail && customEvent.detail.matchId === match?.id) {
        lastEntranceTimestampRef.current = customEvent.detail.timestamp;
        triggerEntranceAnimation(true);
      }
    };

    window.addEventListener('TEAM_ENTRANCE_DISPLAY_TRIGGER', handleEntranceCustom);
    return () => {
      window.removeEventListener('TEAM_ENTRANCE_DISPLAY_TRIGGER', handleEntranceCustom);
    };
  }, [match?.id]);

  // 2. Hiệu ứng lật từng ô khi công bố phiếu giám khảo
  const [revealStartTimes, setRevealStartTimes] = useState<Record<number, number>>({});
  const prevRevealedRoundsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const handleRoundRevealCustom = (e: Event) => {
      const customEvent = e as CustomEvent<{ matchId: string; roundNumbers: number[]; timestamp: number }>;
      if (customEvent.detail && customEvent.detail.matchId === match?.id) {
        const now = customEvent.detail.timestamp || Date.now();
        setRevealStartTimes((prev) => {
          const updated = { ...prev };
          customEvent.detail.roundNumbers.forEach((rNum) => {
            updated[rNum] = now;
          });
          return updated;
        });
      }
    };

    window.addEventListener('ROUND_REVEAL_DISPLAY_TRIGGER', handleRoundRevealCustom);
    return () => {
      window.removeEventListener('ROUND_REVEAL_DISPLAY_TRIGGER', handleRoundRevealCustom);
    };
  }, [match?.id]);

  useEffect(() => {
    if (!match?.rounds) return;
    const currentlyRevealed = new Set<number>();
    const newlyRevealedRounds: number[] = [];

    match.rounds.forEach((r) => {
      if (r.isRevealed || r.isConfirmed) {
        currentlyRevealed.add(r.roundNumber);
        if (!prevRevealedRoundsRef.current.has(r.roundNumber)) {
          newlyRevealedRounds.push(r.roundNumber);
        }
      }
    });

    if (newlyRevealedRounds.length > 0 && prevRevealedRoundsRef.current.size > 0) {
      const now = Date.now();
      setRevealStartTimes((prev) => {
        const updated = { ...prev };
        newlyRevealedRounds.forEach((rNum) => {
          if (!updated[rNum]) updated[rNum] = now;
        });
        return updated;
      });
    }

    prevRevealedRoundsRef.current = currentlyRevealed;
  }, [match?.rounds]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const handleNextMatch = () => {
    const idx = matches.findIndex((m) => m.id === match?.id);
    if (idx < matches.length - 1) {
      setActiveMatchId(matches[idx + 1].id);
    }
  };

  const handlePrevMatch = () => {
    const idx = matches.findIndex((m) => m.id === match?.id);
    if (idx > 0) {
      setActiveMatchId(matches[idx - 1].id);
    }
  };

  // Helper to extract clean Bboy/Bgirl name with prefix stripped (e.g. BBOY T-REX -> T-REX, BGIRL MAYA -> MAYA)
  const getBreakerName = (side?: BattleSide): string => {
    if (!side) return 'CHƯA XÁC ĐỊNH';
    if (side.dancers && side.dancers.length > 0) {
      return side.dancers.map((d) => stripBreakerPrefix(d.name)).join(' & ');
    }
    return stripBreakerPrefix(side.name);
  };

  // Helper to extract Team / Crew name displayed underneath the dancer name
  const getTeamName = (side?: BattleSide, category?: string): string => {
    if (!side) return '';
    if (category === 'pro_2v2') {
      const crews = Array.from(new Set(side.dancers.map((d) => d.crew).filter(Boolean))).join(' · ');
      return crews ? `${side.name} · ${crews}` : side.name;
    }
    const dancer = side.dancers?.[0];
    if (dancer?.crew) {
      return dancer.crew;
    }
    return side.name !== dancer?.name ? side.name : 'THÍ SINH TỰ DO';
  };

  // Helper to extract SBD text / identifier
  const getSideSbdText = (side?: BattleSide): string => {
    if (!side) return '000';
    if (side.sbdText) {
      return side.sbdText.replace(/^SBD\s*/i, '').trim();
    }
    if (side.dancers && side.dancers.length > 0) {
      return side.dancers.map((d) => d.sbd).join('/');
    }
    return '000';
  };

  // Smart font sizing to guarantee strictly 1 line without cutting off
  const getBreakerFontSize = (name: string): string => {
    const len = name.length;
    if (len > 22) {
      return 'text-lg sm:text-xl md:text-2xl lg:text-3xl';
    }
    if (len > 14) {
      return 'text-xl sm:text-2xl md:text-3xl lg:text-4xl';
    }
    if (len > 8) {
      return 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl';
    }
    return 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl';
  };

  // Get photo for Red Corner (upper-body standing above the name board)
  const redPhotoUrl = match
    ? match.category === 'pro_2v2'
      ? getTeamPhotoUrl(match.sideRed, storageConfig.placeholders)
      : getDancerHalfBodyUrl(match.sideRed?.dancers?.[0], storageConfig.placeholders)
    : '';

  // Get photo for Blue Corner (upper-body standing above the name board)
  const bluePhotoUrl = match
    ? match.category === 'pro_2v2'
      ? getTeamPhotoUrl(match.sideBlue, storageConfig.placeholders)
      : getDancerHalfBodyUrl(match.sideBlue?.dancers?.[0], storageConfig.placeholders)
    : '';

  // Short judge name for the 9-column matrix
  const getJudgeShortName = (name: string, code: string): string => {
    if (!name) return code;
    const parts = name.split('•');
    if (parts[1]) {
      const clean = parts[1].split('(')[0].trim().replace(/^BBOY\s+|^BGIRL\s+/i, '');
      if (clean) return clean;
    }
    return code;
  };

  const redBreakerName = getBreakerName(match?.sideRed);
  const blueBreakerName = getBreakerName(match?.sideBlue);

  // Check if battle is tied after all regular rounds
  const isMatchTied =
    match &&
    match.roundWinsRed === match.roundWinsBlue &&
    match.rounds.length > 0 &&
    match.rounds.every((r) => r.isConfirmed);

  const hasTieBreakRound = match?.rounds.some((r) => r.isTieBreak);

  return (
    <div
      className={`relative min-h-screen text-white flex flex-col justify-between p-3 sm:p-5 lg:p-6 select-none overflow-hidden font-sans transition-all duration-300 ${
        isDaylightHighContrast
          ? 'bg-gradient-to-b from-[#0b1c44] via-[#091533] to-[#040b1c]'
          : 'bg-zinc-950'
      }`}
    >
      {/* Dynamic Background Breaking Graphics (Curved WDSF Olympic Stage Motifs from reference image) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Subtle radial stadium lights */}
        <div className="absolute -top-32 left-1/4 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute -top-32 right-1/4 w-[600px] h-[600px] bg-red-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-sky-500/10 rounded-full blur-3xl" />

        {/* Concentric Stadium Breaking Arcs */}
        <svg
          className="absolute inset-0 w-full h-full opacity-20"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          viewBox="0 0 1920 1080"
        >
          <circle cx="960" cy="540" r="420" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="12 12" />
          <circle cx="960" cy="540" r="640" fill="none" stroke="#60a5fa" strokeWidth="1" strokeOpacity="0.4" />
          <path d="M 0 540 Q 480 380 960 540 T 1920 540" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeOpacity="0.3" />
          <path d="M 0 680 Q 480 820 960 680 T 1920 680" fill="none" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.25" />
        </svg>
      </div>

      {/* =========================================================================
          TOP BANNER (WDSF Olympic Breaking Broadcast Style - Matching Reference Image)
          ========================================================================= */}
      <div className="relative z-20 flex items-center justify-between border-b border-white/15 pb-2 shrink-0">
        {/* Left: WDSF Breaking Emblem & Tournament Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center shrink-0 shadow-md">
            <span className="font-condensed font-black text-xs sm:text-sm tracking-tighter text-white leading-none">
              WDSF
            </span>
            <span className="font-mono text-[8px] font-bold tracking-widest text-red-400 leading-none mt-0.5">
              BREAK
            </span>
          </div>

          <div>
            <div className="font-condensed font-black text-lg sm:text-2xl tracking-widest uppercase flex items-center gap-2 drop-shadow-sm">
              <span className="text-white">HIPHOP XỨ TRÀ</span>
              <span className="text-[10px] sm:text-xs font-mono font-black px-2 py-0.5 rounded bg-amber-400 text-black border border-amber-300 uppercase shadow-xs">
                2026
              </span>
            </div>
            <div className="text-[11px] sm:text-xs text-sky-200 font-semibold tracking-wider uppercase drop-shadow-xs">
              {match?.category === 'pro_2v2' ? 'KID PRO 2VS2' : 'KID NEWBIE 1VS1'} · {match?.stageName || 'MAIN BATTLE'}
            </div>
          </div>
        </div>

        {/* Center: Stage Title & Match Indicator (Daylight High-Contrast Text) */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="font-condensed font-black text-2xl sm:text-3xl md:text-4xl text-white tracking-widest uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] leading-none">
            BREAKING
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <button
              onClick={handlePrevMatch}
              className="p-0.5 hover:bg-white/20 rounded text-sky-200 hover:text-white transition-colors cursor-pointer"
              title="Trận trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white/15 text-white border border-white/25 uppercase tracking-wider backdrop-blur-xs">
              {match?.stageName} · TRẬN {String(match?.matchNumber).padStart(2, '0')}
            </span>
            <button
              onClick={handleNextMatch}
              className="p-0.5 hover:bg-white/20 rounded text-sky-200 hover:text-white transition-colors cursor-pointer"
              title="Trận sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Tournament Style Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Outdoor Daylight High-Contrast Mode Toggle */}
          <button
            onClick={() => setIsDaylightHighContrast(!isDaylightHighContrast)}
            className={`px-2.5 py-1.5 rounded-md font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer uppercase shadow-md ${
              isDaylightHighContrast
                ? 'bg-amber-400 hover:bg-amber-300 text-black border border-amber-300 font-black'
                : 'bg-white/10 hover:bg-white/20 border border-white/20 text-white'
            }`}
            title="Chế độ màn LED ngoài trời ban ngày (Tương phản cao)"
          >
            <Sun className="w-3.5 h-3.5" />
            <span className="hidden md:inline">LED Ngoài Trời</span>
          </button>

          {/* Replay 2 Teams Entrance */}
          <button
            onClick={() => triggerEntranceAnimation(true)}
            className="px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer uppercase shadow-md"
            title="Kích hoạt lại hiệu ứng ra sân 2 team (từ ngoài vào)"
          >
            <Swords className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden lg:inline">Ra Sân</span>
          </button>

          {/* Airhorn FX */}
          <button
            onClick={() => soundFX.playHiphopAirhorn()}
            className="px-2.5 py-1.5 rounded-md bg-red-600 hover:bg-red-500 border border-red-400 text-white font-black text-xs flex items-center gap-1 transition-all cursor-pointer uppercase shadow-md"
            title="Còi Hiphop Airhorn sân khấu"
          >
            <Flame className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Airhorn</span>
          </button>

          <button
            onClick={() => setIsAudioModalOpen(true)}
            className="p-1.5 rounded-md bg-white/10 border border-white/20 hover:bg-white/20 transition-colors text-white cursor-pointer shadow-xs"
            title="Cài đặt âm thanh"
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-md bg-white/10 border border-white/20 hover:bg-white/20 transition-colors text-white cursor-pointer shadow-xs"
            title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-400" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-md bg-white/10 border border-white/20 hover:bg-white/20 transition-colors text-white cursor-pointer shadow-xs"
            title="Toàn màn hình trình chiếu"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* =========================================================================
          SMART BATTLE ARENA (ĐẨY CAO TẤT CẢ KHUNG LÊN CHO CÂN ĐỐI)
          - Đẩy cao toàn bộ khung lên giữa/trên màn hình để cân đối không gian
          - Nửa người trên Bboy/Bgirl hiển thị trực tiếp trên bảng tên
          - Bỏ chữ 'bboy', 'bgirl' trước tên
          - Đảm bảo tên nằm trên 1 dòng duy nhất không bị cắt
          - SBD ĐẶT NGAY BÊN DƯỚI TÊN THÀNH VIÊN (Kèm tên đội/crew)
          ========================================================================= */}
      {/* =========================================================================
          SMART BATTLE ARENA (ĐẨY CAO TẤT CẢ KHUNG LÊN CHO CÂN ĐỐI)
          - Hiệu ứng xuất hiện 2 team lướt từ 2 bên ngoài vào sân
          - Biểu tượng va chạm VS Clash bùng nổ ở giữa
          - Nửa người trên Bboy/Bgirl hiển thị trực tiếp trên bảng tên
          - Bỏ chữ 'bboy', 'bgirl' trước tên
          - Đảm bảo tên nằm trên 1 dòng duy nhất không bị cắt
          - SBD ĐẶT NGAY BÊN DƯỚI TÊN THÀNH VIÊN (Kèm tên đội/crew)
          ========================================================================= */}
      <div
        key={`arena-${entranceKey}`}
        className="relative z-10 flex-1 flex flex-col justify-center pt-1 pb-3 sm:pb-5 my-auto overflow-hidden"
      >
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8 items-end px-1 sm:px-4 relative">

          {/* =====================================================================
              RED CORNER CARD (Cột đấu Góc Đỏ - Lướt từ ngoài bên trái vào)
              ===================================================================== */}
          <div className={`flex flex-col items-center justify-end w-full transition-all duration-700 ${
            isEntranceActive ? 'animate-entrance-left' : ''
          }`}>
            {/* Nửa người trên hiển thị trên bảng tên (Đẩy cao cân đối) */}
            <div className="w-full h-56 sm:h-72 md:h-80 lg:h-96 xl:h-[400px] flex items-end justify-center relative -mb-1 sm:-mb-2 z-0 pointer-events-none">
              {redPhotoUrl && (
                <img
                  src={redPhotoUrl}
                  alt={redBreakerName}
                  className="h-full w-auto max-w-[85%] object-contain object-bottom filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.85)] brightness-105 contrast-110"
                />
              )}
            </div>

            {/* Bảng tên Góc Đỏ & Hộp điểm */}
            <div className="w-full flex items-center justify-between gap-2.5 sm:gap-4 relative z-10">
              {/* Bảng tên Đỏ */}
              <div className="flex-1 min-w-0 flex items-center rounded-xl sm:rounded-2xl bg-gradient-to-r from-red-600 via-red-600 to-red-500 border-2 sm:border-3 border-red-400 p-2 sm:p-3 shadow-[0_12px_35px_rgba(220,38,38,0.5)]">
                {/* Flag Badge on Left */}
                <div className="bg-white/20 backdrop-blur-xs border border-white/40 rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 flex items-center justify-center shrink-0 mr-2 sm:mr-3 text-center">
                  <span className="text-base sm:text-xl leading-none">🇻🇳</span>
                </div>

                {/* Text Container: Breaker Name (1 line) + SBD UNDERNEATH */}
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="text-[9px] sm:text-[10px] font-mono font-black tracking-widest text-red-100 uppercase opacity-90 leading-tight">
                    GÓC ĐỎ • RED CORNER
                  </div>

                  {/* Tên Thí Sinh (Đã bỏ Bboy/Bgirl, đảm bảo trên 1 dòng không cắt chữ) */}
                  <div
                    className={`font-condensed font-black text-white tracking-tight uppercase leading-none whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] my-0.5 sm:my-1 ${getBreakerFontSize(
                      redBreakerName
                    )}`}
                    title={redBreakerName}
                  >
                    {redBreakerName}
                  </div>

                  {/* SBD ĐẶT BÊN DƯỚI TÊN THÀNH VIÊN + Tên Đội */}
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs md:text-sm text-red-100/95 font-semibold uppercase whitespace-nowrap overflow-hidden text-ellipsis leading-tight mt-0.5">
                    <span className="font-mono font-black text-amber-300 bg-black/40 px-1.5 py-0.5 rounded border border-white/20 shrink-0">
                      SBD: {getSideSbdText(match?.sideRed)}
                    </span>
                    <span className="text-white/40 font-bold shrink-0">·</span>
                    <span className="truncate" title={getTeamName(match?.sideRed, match?.category)}>
                      {getTeamName(match?.sideRed, match?.category)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hộp điểm Đỏ */}
              <div className="w-16 sm:w-24 md:w-28 lg:w-32 h-16 sm:h-24 md:h-28 lg:h-32 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-600 to-red-700 border-2 sm:border-3 border-red-400 flex items-center justify-center font-condensed font-black text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-white shrink-0 tabular-nums shadow-[0_0_35px_rgba(239,68,68,0.7)] drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]">
                {match?.roundWinsRed ?? 0}
              </div>
            </div>
          </div>

          {/* =====================================================================
              BLUE CORNER CARD (Cột đấu Góc Xanh - Lướt từ ngoài bên phải vào)
              ===================================================================== */}
          <div className={`flex flex-col items-center justify-end w-full transition-all duration-700 ${
            isEntranceActive ? 'animate-entrance-right' : ''
          }`}>
            {/* Nửa người trên hiển thị trên bảng tên (Đẩy cao cân đối) */}
            <div className="w-full h-56 sm:h-72 md:h-84 lg:h-96 xl:h-[400px] flex items-end justify-center relative -mb-1 sm:-mb-2 z-0 pointer-events-none">
              {bluePhotoUrl && (
                <img
                  src={bluePhotoUrl}
                  alt={blueBreakerName}
                  className="h-full w-auto max-w-[85%] object-contain object-bottom filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.85)] brightness-105 contrast-110"
                />
              )}
            </div>

            {/* Hộp điểm & Bảng tên Góc Xanh */}
            <div className="w-full flex items-center justify-between gap-2.5 sm:gap-4 relative z-10 flex-row-reverse md:flex-row">
              {/* Hộp điểm Xanh */}
              <div className="w-16 sm:w-24 md:w-28 lg:w-32 h-16 sm:h-24 md:h-28 lg:h-32 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 border-2 sm:border-3 border-blue-400 flex items-center justify-center font-condensed font-black text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-white shrink-0 tabular-nums shadow-[0_0_35px_rgba(59,130,246,0.7)] drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]">
                {match?.roundWinsBlue ?? 0}
              </div>

              {/* Bảng tên Xanh */}
              <div className="flex-1 min-w-0 flex items-center justify-between rounded-xl sm:rounded-2xl bg-gradient-to-l from-blue-600 via-blue-600 to-blue-500 border-2 sm:border-3 border-blue-400 p-2 sm:p-3 shadow-[0_12px_35px_rgba(37,99,235,0.5)]">
                {/* Text Container: Breaker Name (1 line) + SBD UNDERNEATH */}
                <div className="min-w-0 flex-1 text-left md:text-right pr-0 md:pr-2 lg:pr-3 overflow-hidden">
                  <div className="text-[9px] sm:text-[10px] font-mono font-black tracking-widest text-blue-100 uppercase opacity-90 leading-tight">
                    BLUE CORNER • GÓC XANH
                  </div>

                  {/* Tên Thí Sinh (Đã bỏ Bboy/Bgirl, đảm bảo trên 1 dòng không cắt chữ) */}
                  <div
                    className={`font-condensed font-black text-white tracking-tight uppercase leading-none whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] my-0.5 sm:my-1 ${getBreakerFontSize(
                      blueBreakerName
                    )}`}
                    title={blueBreakerName}
                  >
                    {blueBreakerName}
                  </div>

                  {/* SBD ĐẶT BÊN DƯỚI TÊN THÀNH VIÊN + Tên Đội */}
                  <div className="flex items-center md:justify-end gap-1.5 sm:gap-2 text-[11px] sm:text-xs md:text-sm text-blue-100/95 font-semibold uppercase whitespace-nowrap overflow-hidden text-ellipsis leading-tight mt-0.5">
                    <span className="truncate" title={getTeamName(match?.sideBlue, match?.category)}>
                      {getTeamName(match?.sideBlue, match?.category)}
                    </span>
                    <span className="text-white/40 font-bold shrink-0">·</span>
                    <span className="font-mono font-black text-amber-300 bg-black/40 px-1.5 py-0.5 rounded border border-white/20 shrink-0">
                      SBD: {getSideSbdText(match?.sideBlue)}
                    </span>
                  </div>
                </div>

                {/* Flag Badge on Right */}
                <div className="bg-white/20 backdrop-blur-xs border border-white/40 rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 flex items-center justify-center shrink-0 ml-2 sm:ml-3 text-center">
                  <span className="text-base sm:text-xl leading-none">🇻🇳</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CENTER / BOTTOM: 9 JUDGES DIRECT VOTING MATRIX (Exact Match to Reference Photo)
          - Header: 9 Judge Names in High Contrast
          - Round 1, Round 2, Round 3, và ROUND TIE-BREAK (Hiệp phụ khi hòa)
          - Vote Pills: Crisp White (Pending) -> High Contrast Vivid Red/Blue (Voted)
          - Center Badge: "BEST OF 3" hoặc thông báo Round Tie-Break
          ========================================================================= */}
      <div className="relative z-20 mt-1 shrink-0">
        <div className="max-w-5xl mx-auto bg-black/45 backdrop-blur-md border border-white/20 rounded-2xl p-2.5 sm:p-3.5 shadow-[0_10px_40px_rgba(0,0,0,0.6)] overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Header: Judge Names (9 Columns) */}
            <div className="grid grid-cols-11 gap-1.5 sm:gap-2 mb-2 items-center">
              {/* Empty space for Round label */}
              <div className="col-span-2 text-center text-[11px] font-mono font-black text-sky-200 uppercase tracking-widest">
                ROUND
              </div>

              {/* 9 Judges names with mini avatars */}
              {judges.map((j) => (
                <div
                  key={j.id}
                  className="flex flex-col items-center justify-center text-center px-0.5"
                  title={j.name}
                >
                  <img
                    src={getJudgeAvatarUrl(j)}
                    alt={j.code}
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover border border-amber-400/70 mb-0.5 shadow-sm bg-zinc-900"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_JUDGE_AVATAR;
                    }}
                  />
                  <div className="font-condensed font-black text-[10px] sm:text-xs text-white truncate max-w-full drop-shadow-xs uppercase">
                    {j.judgeName || getJudgeShortName(j.name, j.code)}
                  </div>
                </div>
              ))}
            </div>

            {/* Rounds Rows (Round 1, Round 2, Round 3, và Round Tie-Break) */}
            <div className="space-y-1.5 sm:space-y-2">
              {match?.rounds.map((round) => {
                const isCurrent = round.roundNumber === match.currentRound;
                const isTieBreak = round.isTieBreak || round.roundNumber > (match.category === 'newbie_1v1' ? 2 : 4);
                const isRevealed = Boolean(round.isConfirmed || round.isRevealed);
                const votesCount = Object.keys(round.votes).length;

                return (
                  <div
                    key={round.roundNumber}
                    className={`grid grid-cols-11 gap-1.5 sm:gap-2 items-center p-1.5 sm:p-2 rounded-xl transition-all ${
                      isTieBreak
                        ? isCurrent
                          ? 'bg-amber-950/70 border-2 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.4)]'
                          : 'bg-amber-950/40 border border-amber-500/50'
                        : isCurrent
                        ? 'bg-white/15 border-2 border-amber-400/80 shadow-md'
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    {/* Round Identifier Capsule */}
                    <div
                      className={`col-span-2 flex items-center justify-between px-2 py-1 sm:py-1.5 rounded-lg border ${
                        isTieBreak
                          ? 'bg-amber-900/80 border-amber-400'
                          : 'bg-black/60 border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                        {isTieBreak ? (
                          <span className="font-mono font-black text-[10px] sm:text-xs text-amber-300 tracking-wider flex items-center gap-1 shrink-0 animate-pulse">
                            <span>⚡</span>
                            <span>TIE-BREAK</span>
                          </span>
                        ) : (
                          <span className="font-mono font-black text-xs sm:text-sm text-white tracking-wider shrink-0">
                            ROUND {round.roundNumber}
                          </span>
                        )}
                      </div>

                      {/* Status / Reveal Indicator (Pure Broadcast Badge) */}
                      <div className="flex items-center gap-1">
                        {isRevealed ? (
                          revealStartTimes[round.roundNumber] &&
                          Date.now() - revealStartTimes[round.roundNumber] < 9 * 150 + 200 ? (
                            <span className="text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded uppercase font-mono shadow-md bg-amber-400 text-black animate-pulse flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                              <span>ĐANG LẬT PHIẾU...</span>
                            </span>
                          ) : (
                            <span
                              className={`text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded uppercase font-mono shadow-xs animate-in fade-in zoom-in-95 duration-200 ${
                                round.winner === 'red'
                                  ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                                  : 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.7)]'
                              }`}
                            >
                              {round.winner === 'red' ? 'ĐỎ THẮNG' : 'XANH THẮNG'}
                            </span>
                          )
                        ) : (
                          <span className="text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/70 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>{votesCount}/9 ĐÃ CHẤM</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 9 Judges Rounded Capsule Vote Pills (Lật từng ô theo hiệu ứng 3D khi công bố) */}
                    {judges.map((j, idx) => (
                      <JudgeBallotCard
                        key={j.id}
                        judgeCode={j.code}
                        judgeIndex={idx}
                        vote={round.votes[j.id]}
                        isRevealed={isRevealed}
                        revealStartTime={revealStartTimes[round.roundNumber]}
                      />
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Stage LED Status Bar (Pure Broadcast Display - No Interactive Buttons) */}
            {(() => {
              const hasTieBreakRound = match?.rounds.some((r) => r.isTieBreak);
              const isMatchTied =
                match &&
                match.roundWinsRed === 1 &&
                match.roundWinsBlue === 1 &&
                match.rounds.filter((r) => !r.isTieBreak).every((r) => r.isConfirmed || r.isRevealed);
              const isMatchFinished = match?.status === 'finished';

              return (
                <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-col items-center gap-2">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {isMatchFinished ? (
                      <div className="px-5 py-1 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 font-mono font-black text-xs sm:text-sm tracking-widest uppercase flex items-center gap-2 shadow-md">
                        <Trophy className="w-4 h-4 text-amber-300" />
                        <span>
                          CHUNG CUỘC: {match.winnerSide === 'red' ? match.sideRed.name : match.sideBlue.name} CHIẾN THẮNG ({match.roundWinsRed} - {match.roundWinsBlue}){hasTieBreakRound ? ' · THẮNG TIE-BREAK' : ''}!
                        </span>
                      </div>
                    ) : hasTieBreakRound ? (
                      <div className="px-4 py-1 rounded-full bg-amber-500/25 border-2 border-amber-400 text-amber-300 font-mono font-black text-xs sm:text-sm tracking-widest uppercase shadow-md flex items-center gap-2 animate-pulse">
                        <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                        <span>HÒA 1 - 1 · ROUND TIE-BREAK (HIỆP PHỤ) PHÂN ĐỊNH THẮNG THUA</span>
                      </div>
                    ) : isMatchTied ? (
                      <div className="px-4 py-1 rounded-full bg-amber-500/25 border-2 border-amber-400 text-amber-300 font-mono font-black text-xs sm:text-sm tracking-widest uppercase shadow-md flex items-center gap-2 animate-pulse">
                        <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                        <span>HÒA 1 - 1 ROUNDS · BẮT ĐẦU ROUND TIE-BREAK (HIỆP PHỤ)</span>
                      </div>
                    ) : (
                      <div className="px-4 py-0.5 rounded-full bg-white/15 border border-white/30 text-white font-mono font-black text-[11px] sm:text-xs tracking-widest uppercase shadow-sm">
                        THỂ THỨC 2 ROUNDS · HÒA 1-1 ĐẤU 1 ROUND TIE-BREAK (ĐỎ HOẶC XANH THẮNG)
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM FOOTER: BROADCAST & TOURNAMENT CREDITS (HIPHOP XỨ TRÀ 2026)
          ========================================================================= */}
      <div className="relative z-20 flex items-center justify-between text-[11px] sm:text-xs text-sky-200/80 pt-2 border-t border-white/15 mt-1 font-mono shrink-0">
        <div className="tracking-widest uppercase flex items-center gap-2">
          <span className="font-bold text-white">BORNAN SPORTS TECHNOLOGY</span>
          <span>·</span>
          <span>WDSF 9-JUDGE MATRIX</span>
        </div>
        <div className="uppercase tracking-wider font-bold text-white">
          HIPHOP XỨ TRÀ 2026 · THÁI NGUYÊN
        </div>
      </div>

      {/* Automated Olympic Breaking Victory Display Overlay (Controlled automatically from Operator Console) */}
      {match && <AutomatedVictoryDisplay match={match} />}

      {/* Audio Settings Modal */}
      <AudioSettingsModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
      />
    </div>
  );
};
