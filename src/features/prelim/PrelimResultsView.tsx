import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTournament } from '../../state/TournamentContext';
import { CategoryType, Dancer, Judge } from '../../domain/types';
import { PANEL_SIZE, prelimJudgeIdsFor } from '../../domain/model';
import { RankEmblem } from '../../shared/RankEmblem';
import { isScored, MIN_SCORED_TO_SHOW, WaitingForScores } from '../guest/PrelimGuestView';
import {
  Trophy,
  Award,
  Eye,
  Lock,
  Unlock,
  Maximize2,
  Minimize2,
  ArrowRight,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Sliders,
  ChevronDown,
  Layers,
  Flame,
  Radio,
  FileSpreadsheet,
} from 'lucide-react';
import {
  getDancerHalfBodyUrl,
  getDancerAvatarUrl,
  stripBreakerPrefix,
} from '../../shared/placeholderAssets';
import confetti from 'canvas-confetti';

export const PrelimResultsView: React.FC = () => {
  const {
    activeCategory,
    setActiveCategory,
    newbieDancers,
    proDancers,
    judges,
    prelimPanels,
    isNewbieTop32Locked,
    isProTop32Locked,
    publishPrelim,
    setActiveView,
    playAudioEffect,
    storageConfig,
  } = useTournament();

  // Each dancer is scored by the 4 judges of their panel (A / B by SBD parity).
  const panelJudges = (d?: Dancer) =>
    d ? prelimJudgeIdsFor(d, prelimPanels).map((id) => judges.find((j) => j.id === id)).filter((j): j is Judge => Boolean(j)) : [];

  // Mode overrides: 'auto' follows isLocked (ongoing: show top 10/15; finished: show all 40)
  // Can be manually forced to 'top10', 'top15', or 'all'
  const [viewScope, setViewScope] = useState<'auto' | 'top10' | 'top15' | 'all'>('auto');
  const [ongoingTopLimit, setOngoingTopLimit] = useState<10 | 15>(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const currentDancers = activeCategory === 'newbie_1v1' ? newbieDancers : proDancers;
  const isLocked = activeCategory === 'newbie_1v1' ? isNewbieTop32Locked : isProTop32Locked;

  // Determine actual display limit
  const effectiveMode = useMemo(() => {
    if (viewScope === 'auto') {
      return isLocked ? 'all' : ongoingTopLimit === 10 ? 'top10' : 'top15';
    }
    return viewScope;
  }, [viewScope, isLocked, ongoingTopLimit]);

  // Sorted dancers by total prelim score descending
  const sortedDancers = useMemo(() => {
    return [...currentDancers].sort((a, b) => {
      if (b.prelimScoreTotal !== a.prelimScoreTotal) {
        return b.prelimScoreTotal - a.prelimScoreTotal;
      }
      return a.sbd.localeCompare(b.sbd);
    });
  }, [currentDancers]);

  // Filtered by search if any
  const searchedDancers = useMemo(() => {
    if (!searchTerm.trim()) return sortedDancers;
    const term = searchTerm.toLowerCase().trim();
    return sortedDancers.filter(
      (d) =>
        d.name.toLowerCase().includes(term) ||
        d.sbd.toLowerCase().includes(term) ||
        (d.crew && d.crew.toLowerCase().includes(term))
    );
  }, [sortedDancers, searchTerm]);

  // Apply Top 10 / 15 / All limit
  const displayedDancers = useMemo(() => {
    if (searchTerm.trim()) {
      return searchedDancers;
    }
    if (effectiveMode === 'top10') {
      return searchedDancers.slice(0, 10);
    }
    if (effectiveMode === 'top15') {
      return searchedDancers.slice(0, 15);
    }
    return searchedDancers;
  }, [searchedDancers, effectiveMode, searchTerm]);

  // Top 3 Podium
  const top1 = sortedDancers[0];
  const top2 = sortedDancers[1];
  const top3 = sortedDancers[2];

  // Auto-scroll loop for LED billboard / audience screen
  useEffect(() => {
    if (!isAutoScrolling || !scrollContainerRef.current) return;
    const el = scrollContainerRef.current;
    let step = 1;
    const interval = setInterval(() => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 5) {
        // Loop back smoothly to top
        el.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        el.scrollTop += step;
      }
    }, 45);

    return () => clearInterval(interval);
  }, [isAutoScrolling]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Same steps as "Công bố Prelim" on the prelim desk: a tie at the cut-off goes to the tie-break first.
  const handleToggleLock = () => {
    const result = publishPrelim(activeCategory);
    if (result === 'locked') {
      playAudioEffect('champion');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      return;
    }
    window.alert(
      result === 'incomplete'
        ? 'Chưa thể công bố: còn thí sinh chưa đủ 4 điểm Prelim.'
        : result === 'tie-opened'
          ? 'Có đồng điểm ở ngưỡng Top 32: đã mở tie-break cho cả 8 giám khảo. Công bố lại sau khi chấm xong tie-break.'
          : 'Chưa thể chốt Top 32: tie-break đang được chấm, hoặc vẫn đồng điểm và chờ chọn thí sinh đi tiếp theo quyết định của BGK ở Bàn chấm Prelim.'
    );
  };

  // Provisional ranks stay off screen until enough dancers of this category are fully scored.
  const scoredCount = currentDancers.filter((d) => isScored(d, PANEL_SIZE)).length;
  if (!isLocked && scoredCount < MIN_SCORED_TO_SHOW) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-6 px-6 text-center">
        <img src="/logo.png" alt="HipHop Xứ Trà U16" className="h-28 w-auto" />
        <p className="font-condensed text-3xl font-black uppercase tracking-wider text-white">
          Kết quả vòng sơ loại Prelim · {activeCategory === 'newbie_1v1' ? 'Newbie 1vs1' : 'Pro 2vs2'}
        </p>
        <WaitingForScores scored={scoredCount} dark className="w-full max-w-xl" />
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-red-600 selection:text-white"
    >
      {/* Top Tournament Broadcast Banner */}
      <div className="bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-40 px-4 py-3 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Brand & Category Heading */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-zinc-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Trophy className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-condensed font-black text-xl tracking-wider uppercase text-white">
                  KẾT QUẢ VÒNG SƠ LOẠI PRELIM
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-amber-400 border border-zinc-700">
                  U16 · 2026
                </span>
                {/* Status indicator */}
                {isLocked ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700/60 shadow-sm animate-pulse">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ĐÃ KẾT THÚC · CÔNG BỐ TOÀN BỘ 40 THÍ SINH (32 VÉ VÀNG)</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-700/60 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping mr-0.5" />
                    <span>ĐANG THI ĐẤU · HIỂN THỊ TẠM THỜI TOP {ongoingTopLimit}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                Hệ thống chấm điểm chuẩn 4 Trọng Tài · Thang điểm 100/GK · Ngưỡng tuyển chọn Top 32 Battle
              </p>
            </div>
          </div>

          {/* Category Tabs & Quick Action Controls */}
          <div className="flex items-center gap-2 flex-wrap lg:justify-end">
            {/* Category Toggle */}
            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded p-1">
              <button data-kiosk-keep
                onClick={() => {
                  setActiveCategory('newbie_1v1');
                  playAudioEffect('tick');
                }}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                  activeCategory === 'newbie_1v1'
                    ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                KID NEWBIE 1VS1
              </button>
              <button data-kiosk-keep
                onClick={() => {
                  setActiveCategory('pro_2v2');
                  playAudioEffect('tick');
                }}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                  activeCategory === 'pro_2v2'
                    ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                KID PRO 2VS2
              </button>
            </div>

            {/* If Ongoing: Toggle Top 10 vs Top 15 */}
            {(!isLocked || viewScope !== 'auto') && (
              <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded p-1">
                <span className="text-[10px] font-mono text-zinc-500 px-1.5 font-bold hidden sm:inline">
                  CHẾ ĐỘ:
                </span>
                <button
                  onClick={() => {
                    setOngoingTopLimit(10);
                    if (viewScope !== 'auto') setViewScope('top10');
                    playAudioEffect('tick');
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                    effectiveMode === 'top10'
                      ? 'bg-zinc-800 text-amber-400 font-black border border-amber-500/40'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Hiển thị Top 10 thí sinh dẫn đầu"
                >
                  Top 10
                </button>
                <button
                  onClick={() => {
                    setOngoingTopLimit(15);
                    if (viewScope !== 'auto') setViewScope('top15');
                    playAudioEffect('tick');
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                    effectiveMode === 'top15'
                      ? 'bg-zinc-800 text-amber-400 font-black border border-amber-500/40'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Hiển thị Top 15 thí sinh dẫn đầu"
                >
                  Top 15
                </button>
                {/* Option to reveal all manually */}
                <button
                  onClick={() => {
                    setViewScope(viewScope === 'all' ? 'auto' : 'all');
                    playAudioEffect('tick');
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                    effectiveMode === 'all'
                      ? 'bg-emerald-900/60 text-emerald-300 font-black border border-emerald-500/40'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Xem toàn bộ 40 thí sinh"
                >
                  Toàn bộ (40)
                </button>
              </div>
            )}

            {/* Auto Scroll for Stadium / Stage screens */}
            <button
              onClick={() => setIsAutoScrolling(!isAutoScrolling)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-bold border transition-colors cursor-pointer ${
                isAutoScrolling
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Tự động cuộn trang cho màn hình lớn LED"
            >
              {isAutoScrolling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">Cuộn LED</span>
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Toàn màn hình"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Link to Dedicated Guest / Spectator Page */}
            <button
              onClick={() => setActiveView('prelim_guest')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black transition-colors cursor-pointer shadow"
              title="Mở giao diện dành riêng cho khách và phụ huynh xem trên điện thoại"
            >
              <Eye className="w-3.5 h-3.5 text-zinc-950" />
              <span className="hidden sm:inline">Trang Khách Xem</span>
            </button>

            {/* Link back to Prelim Input View for Admin */}
            <button
              onClick={() => setActiveView('prelim')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-bold border border-zinc-700 transition-colors cursor-pointer shadow"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Bàn Chấm Prelim</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Realtime Announcement Box */}
        {!isLocked && effectiveMode !== 'all' ? (
          <div className="p-4 rounded-lg bg-gradient-to-r from-red-950/60 via-zinc-900 to-zinc-900 border border-red-800/50 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded bg-red-600/20 border border-red-500 flex items-center justify-center shrink-0 mt-0.5">
                <Radio className="w-5 h-5 text-red-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm uppercase tracking-wide">
                    CHẾ ĐỘ THEO DÕI VÒNG SƠ LOẠI ĐANG DIỄN RA
                  </span>
                  <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono text-[10px] font-black uppercase">
                    TOP {effectiveMode === 'top10' ? '10' : '15'} TẠM THỜI
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  Để giữ tính bảo mật và kịch tính cho giải đấu, hệ thống hiện đang công bố{' '}
                  <strong className="text-amber-400 font-bold">
                    Top {effectiveMode === 'top10' ? '10' : '15'}
                  </strong>{' '}
                  thí sinh có điểm số cao nhất. Toàn bộ danh sách 40 thí sinh và 32 Vé Vàng chính thức
                  sẽ được công bố ngay khi Ban Giám Khảo hoàn tất chấm điểm.
                </p>
              </div>
            </div>

            {/* Quick Button for Admin to Finish Prelim */}
            <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
              <button
                onClick={handleToggleLock}
                className="flex items-center gap-2 px-3.5 py-2 rounded bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs uppercase tracking-wider transition-transform active:scale-95 cursor-pointer shadow-lg shadow-amber-500/20"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Khóa & Công Bố Toàn Bộ 40 Thí Sinh</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-zinc-900 border border-emerald-700/50 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded bg-emerald-600/20 border border-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm uppercase tracking-wide">
                    VÒNG SƠ LOẠI ĐÃ KẾT THÚC · KẾT QUẢ CHÍNH THỨC
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-[10px] font-black uppercase">
                    32 VÉ VÀNG BATTLE ĐÃ XÁC ĐỊNH
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  Toàn bộ 40 thí sinh đã hoàn thành bài thi sơ loại. 32 thí sinh xếp hạng 1 đến 32
                  được trao <strong className="text-amber-400 font-bold">VÉ VÀNG BATTLE</strong> để bước
                  vào vòng đấu trực tiếp (Knock-out Stage).
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
              <button
                onClick={handleToggleLock}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-xs border border-zinc-700 transition-colors cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5 text-amber-400" />
                <span>{isLocked ? 'Mở lại khóa sửa điểm' : 'Khóa sổ'}</span>
              </button>
              <button
                onClick={() => setActiveView(activeCategory === 'pro_2v2' ? 'teams' : 'bracket')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                <span>{activeCategory === 'pro_2v2' ? 'Ghép Đội 2vs2' : 'Xem Nhánh Đấu'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* TOP 3 PODIUM SPOTLIGHT (BỤC VINH QUANG 3 HẠNG ĐẦU) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <h2 className="font-condensed font-black text-lg text-white tracking-wider uppercase">
                BỤC VINH QUANG TOP 3 DẪN ĐẦU
              </h2>
            </div>
            <div className="text-xs text-zinc-400 font-mono">
              Hạng 1 · Hạng 2 · Hạng 3
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* RANK 2 (Silver) */}
            {top2 && (
              <div className="relative order-2 md:order-1 rounded-xl bg-gradient-to-b from-zinc-800/90 via-zinc-900 to-zinc-950 border border-slate-400/30 p-4 shadow-xl flex flex-col justify-between overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-400/5 rounded-full blur-2xl pointer-events-none" />
                <div>
                  {/* Top Bar: Medal & SBD */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-500/20 border border-slate-400/40 text-slate-200 text-xs font-black">
                      <RankEmblem rank={2} className="-my-3 h-9" glow />
                      <span>HẠNG 2 · BẠC</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700">
                      SBD: {top2.sbd}
                    </span>
                  </div>

                  {/* Dancer Visual + Info */}
                  <div className="flex items-center gap-3.5 mt-3.5">
                    <div className="w-16 h-16 rounded-lg bg-zinc-800 border-2 border-slate-400/40 overflow-hidden shrink-0 shadow-md">
                      <img
                        src={getDancerHalfBodyUrl(top2, storageConfig.placeholders)}
                        alt={top2.name}
                        className="w-full h-full object-cover object-top"
                        onError={(e) => {
                          e.currentTarget.src = getDancerAvatarUrl(top2, storageConfig.placeholders);
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                        {top2.gender === 'female' ? 'BGIRL' : 'BBOY'}
                      </div>
                      <h3 className="font-condensed font-black text-xl text-white tracking-wide truncate uppercase leading-tight group-hover:text-slate-200 transition-colors">
                        {stripBreakerPrefix(top2.name)}
                      </h3>
                      <div className="text-[11px] text-zinc-500 font-medium truncate mt-0.5">
                        {top2.crew}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score Showcase */}
                <div className="mt-4 pt-3 border-t border-zinc-800">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-mono text-zinc-400 uppercase font-bold">
                      TỔNG ĐIỂM PRELIM
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono font-black text-2xl text-slate-200">
                        {Math.round(top2.prelimScoreTotal)}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">/ 400</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                    <span>Điểm TB: <strong className="text-white font-mono">{top2.prelimScoreAvg}</strong>/100</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-800/40">
                      Vé Vàng #2
                    </span>
                  </div>
                  {/* 4 Judges mini breakdown */}
                  <div className="grid grid-cols-4 gap-1 mt-2.5">
                    {panelJudges(top2).map((j) => (
                      <div key={j.id} className="bg-zinc-800/80 rounded px-1 py-1 text-center border border-zinc-700/60">
                        <div className="text-[9px] font-mono text-zinc-400 truncate font-semibold">
                          {j.judgeName || j.code}
                        </div>
                        <div className="text-xs font-mono font-black text-zinc-100">
                          {Math.round(top2.prelimScores[j.id] ?? 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* RANK 1 (Gold - Center & Elevated) */}
            {top1 && (
              <div className="relative order-1 md:order-2 rounded-xl bg-gradient-to-b from-amber-950/80 via-zinc-900 to-zinc-950 border-2 border-amber-500/70 p-4 shadow-2xl shadow-amber-500/10 flex flex-col justify-between overflow-hidden group transform md:-translate-y-2">
                <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div>
                  {/* Top Bar: Medal & SBD */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500/20 border border-amber-500/60 text-amber-300 text-xs font-black shadow-sm">
                      <RankEmblem rank={1} className="-my-4 h-11" glow />
                      <span>HẠNG 1 · QUÁN QUÂN PRELIM</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-600/50">
                      SBD: {top1.sbd}
                    </span>
                  </div>

                  {/* Dancer Visual + Info */}
                  <div className="flex items-center gap-3.5 mt-3.5">
                    <div className="w-20 h-20 rounded-lg bg-zinc-800 border-2 border-amber-500 overflow-hidden shrink-0 shadow-lg shadow-amber-500/20">
                      <img
                        src={getDancerHalfBodyUrl(top1, storageConfig.placeholders)}
                        alt={top1.name}
                        className="w-full h-full object-cover object-top"
                        onError={(e) => {
                          e.currentTarget.src = getDancerAvatarUrl(top1, storageConfig.placeholders);
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                        {top1.gender === 'female' ? 'BGIRL' : 'BBOY'}
                      </div>
                      <h3 className="font-condensed font-black text-2xl text-amber-400 tracking-wide truncate uppercase leading-tight group-hover:text-amber-300 transition-colors">
                        {stripBreakerPrefix(top1.name)}
                      </h3>
                      <div className="text-[11px] text-zinc-400 font-medium truncate mt-0.5">
                        {top1.crew}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score Showcase */}
                <div className="mt-4 pt-3 border-t border-amber-900/40">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-mono text-amber-300/80 uppercase font-bold">
                      TỔNG ĐIỂM PRELIM
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono font-black text-3xl text-amber-400">
                        {Math.round(top1.prelimScoreTotal)}
                      </span>
                      <span className="text-xs text-amber-500/70 font-mono">/ 400</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                    <span>Điểm TB: <strong className="text-amber-400 font-mono text-xs">{top1.prelimScoreAvg}</strong>/100</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-zinc-950 text-[10px] font-black uppercase shadow">
                      Vé Vàng #1 (Hạt Giống 1)
                    </span>
                  </div>
                  {/* 4 Judges mini breakdown */}
                  <div className="grid grid-cols-4 gap-1 mt-2.5">
                    {panelJudges(top1).map((j) => (
                      <div key={j.id} className="bg-amber-950/40 rounded px-1 py-1 text-center border border-amber-800/50">
                        <div className="text-[9px] font-mono text-amber-300/80 truncate font-semibold">
                          {j.judgeName || j.code}
                        </div>
                        <div className="text-xs font-mono font-black text-amber-300">
                          {Math.round(top1.prelimScores[j.id] ?? 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* RANK 3 (Bronze) */}
            {top3 && (
              <div className="relative order-3 rounded-xl bg-gradient-to-b from-zinc-800/90 via-zinc-900 to-zinc-950 border border-amber-700/30 p-4 shadow-xl flex flex-col justify-between overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-700/5 rounded-full blur-2xl pointer-events-none" />
                <div>
                  {/* Top Bar: Medal & SBD */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-900/30 border border-amber-700/40 text-amber-300 text-xs font-black">
                      <RankEmblem rank={3} className="-my-3 h-9" glow />
                      <span>HẠNG 3 · ĐỒNG</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700">
                      SBD: {top3.sbd}
                    </span>
                  </div>

                  {/* Dancer Visual + Info */}
                  <div className="flex items-center gap-3.5 mt-3.5">
                    <div className="w-16 h-16 rounded-lg bg-zinc-800 border-2 border-amber-700/40 overflow-hidden shrink-0 shadow-md">
                      <img
                        src={getDancerHalfBodyUrl(top3, storageConfig.placeholders)}
                        alt={top3.name}
                        className="w-full h-full object-cover object-top"
                        onError={(e) => {
                          e.currentTarget.src = getDancerAvatarUrl(top3, storageConfig.placeholders);
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono text-amber-600 font-bold uppercase tracking-wider">
                        {top3.gender === 'female' ? 'BGIRL' : 'BBOY'}
                      </div>
                      <h3 className="font-condensed font-black text-xl text-white tracking-wide truncate uppercase leading-tight group-hover:text-amber-300 transition-colors">
                        {stripBreakerPrefix(top3.name)}
                      </h3>
                      <div className="text-[11px] text-zinc-500 font-medium truncate mt-0.5">
                        {top3.crew}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score Showcase */}
                <div className="mt-4 pt-3 border-t border-zinc-800">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-mono text-zinc-400 uppercase font-bold">
                      TỔNG ĐIỂM PRELIM
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono font-black text-2xl text-amber-500/90">
                        {Math.round(top3.prelimScoreTotal)}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">/ 400</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                    <span>Điểm TB: <strong className="text-white font-mono">{top3.prelimScoreAvg}</strong>/100</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-800/40">
                      Vé Vàng #3
                    </span>
                  </div>
                  {/* 4 Judges mini breakdown */}
                  <div className="grid grid-cols-4 gap-1 mt-2.5">
                    {panelJudges(top3).map((j) => (
                      <div key={j.id} className="bg-zinc-800/80 rounded px-1 py-1 text-center border border-zinc-700/60">
                        <div className="text-[9px] font-mono text-zinc-400 truncate font-semibold">
                          {j.judgeName || j.code}
                        </div>
                        <div className="text-xs font-mono font-black text-zinc-100">
                          {Math.round(top3.prelimScores[j.id] ?? 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* DETAILED LEADERBOARD TABLE */}
        <section className="space-y-3">
          {/* Section Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/70 p-3 rounded-lg border border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center text-amber-400 font-bold text-xs border border-zinc-700">
                #
              </div>
              <div>
                <h3 className="font-condensed font-black text-base text-white tracking-wide uppercase">
                  BẢNG XẾP HẠNG CHI TIẾT
                </h3>
                <p className="text-xs text-zinc-400">
                  {effectiveMode === 'all'
                    ? 'Hiển thị toàn bộ 40 thí sinh · 32 thí sinh nhận Vé Vàng Battle'
                    : `Hiển thị Top ${effectiveMode === 'top10' ? '10' : '15'} dẫn đầu (Đang thi đấu)`}
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm SBD, tên breaker, crew..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-900 border-b border-zinc-800 text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-14">HẠNG</th>
                    <th className="py-3 px-3 text-center w-16">SBD</th>
                    <th className="py-3 px-4 min-w-[200px]">THÍ SINH (BBOY / BGIRL)</th>
                    <th className="py-3 px-3 text-center w-24">CLB / ĐỘI</th>
                    {Array.from({ length: PANEL_SIZE }, (_, i) => (
                      <th key={i} className="py-2.5 px-2 text-center w-20 text-zinc-300" title="Giám khảo thứ i của bảng thí sinh">
                        <div className="font-mono text-[9px] text-zinc-400">BẢNG A/B</div>
                        <div className="font-bold text-amber-300 text-[11px] uppercase">GK {i + 1}</div>
                      </th>
                    ))}
                    <th className="py-3 px-3 text-center w-20 text-zinc-300">ĐIỂM TB</th>
                    <th className="py-3 px-3 text-center w-24 text-amber-400 font-bold">TỔNG ĐIỂM</th>
                    <th className="py-3 px-3 text-center w-36">TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-sans">
                  {displayedDancers.map((dancer, index) => {
                    const rank = sortedDancers.findIndex((d) => d.id === dancer.id) + 1;
                    const isTop3 = rank <= 3;
                    const isQualified = rank <= 32;
                    const isRank32 = rank === 32;

                    // Row styling based on rank
                    let rowBg = 'hover:bg-zinc-800/40 transition-colors';
                    if (rank === 1) rowBg = 'bg-amber-950/20 hover:bg-amber-950/30';
                    else if (rank === 2) rowBg = 'bg-slate-800/20 hover:bg-slate-800/30';
                    else if (rank === 3) rowBg = 'bg-amber-900/10 hover:bg-amber-900/20';
                    else if (rank > 32) rowBg = 'bg-zinc-950/60 opacity-70 hover:opacity-100 hover:bg-zinc-900/60';

                    return (
                      <React.Fragment key={dancer.id}>
                        <tr className={`${rowBg}`}>
                          {/* Rank Badge */}
                          <td className="py-3 px-3 text-center">
                            {isTop3 && <RankEmblem rank={rank} className={`-my-2 inline-block ${rank === 1 ? 'h-11' : 'h-9'}`} />}
                            {rank > 3 && (
                              <span
                                className={`inline-flex items-center justify-center w-7 h-7 rounded font-mono font-bold text-xs ${
                                  isQualified
                                    ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                                    : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                                }`}
                              >
                                {rank}
                              </span>
                            )}
                          </td>

                          {/* SBD */}
                          <td className="py-3 px-3 text-center font-mono font-bold text-amber-400">
                            #{dancer.sbd}
                          </td>

                          {/* Dancer Name + Photo */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={getDancerAvatarUrl(dancer, storageConfig.placeholders)}
                                alt={dancer.name}
                                className="w-9 h-9 rounded object-cover bg-zinc-800 border border-zinc-700 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-condensed font-black text-sm text-white tracking-wide uppercase truncate max-w-[160px] sm:max-w-xs">
                                    {stripBreakerPrefix(dancer.name)}
                                  </span>
                                  <span
                                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                                      dancer.gender === 'female'
                                        ? 'bg-pink-950 text-pink-300 border border-pink-800/40'
                                        : 'bg-blue-950 text-blue-300 border border-blue-800/40'
                                    }`}
                                  >
                                    {dancer.gender === 'female' ? 'BGIRL' : 'BBOY'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-zinc-400 truncate">
                                  {dancer.crew}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Crew */}
                          <td className="py-3 px-3 text-center text-zinc-300 font-medium truncate max-w-[120px]">
                            {dancer.crew}
                          </td>

                          {/* 4 Judges' Scores */}
                          {Array.from({ length: PANEL_SIZE }, (_, i) => {
                            const j = panelJudges(dancer)[i];
                            const score = j ? dancer.prelimScores[j.id] : undefined;
                            return (
                              <td
                                key={i}
                                title={j?.judgeName || j?.code}
                                className="py-3 px-2 text-center font-mono text-zinc-300"
                              >
                                {score !== undefined ? (
                                  <span className="px-1.5 py-0.5 rounded bg-zinc-800/60 border border-zinc-700/40 text-xs font-semibold">
                                    {Math.round(score)}
                                  </span>
                                ) : (
                                  <span className="text-zinc-600">—</span>
                                )}
                              </td>
                            );
                          })}

                          {/* Average Score */}
                          <td className="py-3 px-3 text-center font-mono font-bold text-zinc-300">
                            {Math.round(dancer.prelimScoreAvg)}
                          </td>

                          {/* Total Score */}
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`font-mono font-black text-sm px-2 py-0.5 rounded ${
                                isTop3
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                  : isQualified
                                  ? 'bg-zinc-800 text-white font-bold'
                                  : 'text-zinc-400'
                              }`}
                            >
                              {Math.round(dancer.prelimScoreTotal)}
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-3 text-center">
                            {effectiveMode !== 'all' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                                <Flame className="w-3 h-3 text-amber-400" />
                                <span>Top {ongoingTopLimit} Tạm Thời</span>
                              </span>
                            ) : isQualified ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-[10px] font-bold shadow-sm">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>VÉ VÀNG TOP 32</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800/60 text-zinc-400 border border-zinc-700/40 text-[10px] font-mono">
                                <span>Dự Bị #{rank - 32}</span>
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Cut-off Divider Bar between Rank 32 and Rank 33 when showing all */}
                        {effectiveMode === 'all' && isRank32 && (
                          <tr className="bg-gradient-to-r from-amber-950/80 via-zinc-900 to-amber-950/80 border-y-2 border-amber-500">
                            <td colSpan={8 + PANEL_SIZE} className="py-2.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-3 text-amber-400 font-bold text-xs uppercase tracking-wider">
                                <Award className="w-4 h-4 text-amber-400 animate-pulse" />
                                <span>
                                  NGƯỠNG TUYỂN CHỌN VÉ VÀNG TOP 32 BATTLE (CUT-OFF LINE)
                                </span>
                                <Award className="w-4 h-4 text-amber-400 animate-pulse" />
                              </div>
                              <p className="text-[10px] text-zinc-400 mt-0.5 font-normal">
                                32 thí sinh phía trên giành quyền vào nhánh đấu chính thức. Các thí sinh phía dưới nằm trong danh sách dự bị giải đấu.
                              </p>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer Note */}
            <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="font-mono text-zinc-500">
                  Hiển thị {displayedDancers.length} / {sortedDancers.length} thí sinh
                </span>
                {effectiveMode !== 'all' && (
                  <span className="text-[11px] text-amber-400/90 font-medium">
                    (Đang thi đấu sơ loại · Giới hạn Top {ongoingTopLimit})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Vé Vàng Battle (Hạng 1-32)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
                  <span>Dự Bị (Hạng 33+)</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Audience / Stage Presentation Notice */}
        {effectiveMode !== 'all' && (
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-zinc-800 text-amber-400 text-xs font-bold border border-zinc-700">
              <Eye className="w-3.5 h-3.5" />
              <span>CHẾ ĐỘ HIỂN THỊ MÀN HÌNH KHÁN GIẢ & LIVESTREAM</span>
            </div>
            <h4 className="font-condensed font-black text-lg text-white uppercase tracking-wider">
              BẢNG XẾP HẠNG TOÀN BỘ SẼ ĐƯỢC MỞ TỰ ĐỘNG KHI KẾT THÚC
            </h4>
            <p className="text-xs text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Nhằm đảm bảo chiến thuật thi đấu cho từng đội và giữ vẹn nguyên sự hồi hộp trước giờ bốc thăm
              nhánh đấu, màn hình công cộng hiện chỉ cập nhật Top 10 hoặc Top 15 dẫn đầu. Khi trọng tài
              trưởng xác nhận hoàn thành lượt thi đấu sơ loại cuối cùng, toàn bộ thứ hạng sẽ được hiển thị đồng bộ.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
