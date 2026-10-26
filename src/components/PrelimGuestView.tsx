import React, { useState, useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Dancer } from '../types/tournament';
import { VIEW_PATHS } from '../routes';
import {
  Trophy,
  Medal,
  Award,
  Search,
  Flame,
  Radio,
  QrCode,
  Share2,
  Maximize2,
  Minimize2,
  Check,
  Copy,
  ChevronRight,
  ShieldCheck,
  LayoutGrid,
  Table as TableIcon,
  X,
  ArrowLeft,
  Tv,
} from 'lucide-react';
import {
  getDancerHalfBodyUrl,
  getDancerAvatarUrl,
  stripBreakerPrefix,
} from '../utils/placeholderAssets';

export const PrelimGuestView: React.FC = () => {
  const {
    activeCategory,
    setActiveCategory,
    newbieDancers,
    proDancers,
    prelimJudges,
    isNewbieTop32Locked,
    isProTop32Locked,
    setActiveView,
    storageConfig,
  } = useTournament();

  const [guestScope, setGuestScope] = useState<'top10' | 'top15' | 'top32' | 'all'>('top10');
  const [filterGender, setFilterGender] = useState<'all' | 'male' | 'female'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedDancer, setSelectedDancer] = useState<Dancer | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentDancers = activeCategory === 'newbie_1v1' ? newbieDancers : proDancers;
  const isLocked = activeCategory === 'newbie_1v1' ? isNewbieTop32Locked : isProTop32Locked;

  // Sorted dancers by total prelim score descending, secondary sort by SBD
  const sortedDancers = useMemo(() => {
    return [...currentDancers].sort((a, b) => {
      if (b.prelimScoreTotal !== a.prelimScoreTotal) {
        return b.prelimScoreTotal - a.prelimScoreTotal;
      }
      return a.sbd.localeCompare(b.sbd);
    });
  }, [currentDancers]);

  // Determine effective display scope based on whether prelim is locked or guest preference
  const effectiveScope = useMemo(() => {
    if (!isLocked) {
      // During ongoing prelim, default to top 10 or top 15
      return guestScope === 'top15' ? 'top15' : 'top10';
    }
    // When locked (completed), default to all or user selection
    return guestScope;
  }, [isLocked, guestScope]);

  // Filtered dancers
  const filteredDancers = useMemo(() => {
    let list = sortedDancers;

    // Search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(term) ||
          d.sbd.toLowerCase().includes(term) ||
          (d.crew && d.crew.toLowerCase().includes(term)) ||
          (d.realName && d.realName.toLowerCase().includes(term))
      );
    }

    // Gender filter
    if (filterGender !== 'all') {
      list = list.filter((d) => d.gender === filterGender);
    }

    // Scope limit (unless search is active)
    if (!searchTerm.trim()) {
      if (effectiveScope === 'top10') {
        list = list.slice(0, 10);
      } else if (effectiveScope === 'top15') {
        list = list.slice(0, 15);
      } else if (effectiveScope === 'top32') {
        list = list.slice(0, 32);
      }
    }

    return list;
  }, [sortedDancers, searchTerm, filterGender, effectiveScope]);

  // Top 3 Podium
  const top1 = sortedDancers[0];
  const top2 = sortedDancers[1];
  const top3 = sortedDancers[2];

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${VIEW_PATHS.prelim_guest}`
    : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-zinc-950">
      {/* Top Spectator Header */}
      <header className="bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-40 px-4 py-3 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Brand & Live Indicator */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-zinc-950 shadow-md shrink-0">
              <Trophy className="w-5 h-5 font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-condensed font-black text-xl sm:text-2xl tracking-wider text-white uppercase">
                  HIPHOP XỨ TRÀ 2026
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 text-[10px] font-mono font-black uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  <span>TRỰC TIẾP</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium leading-none mt-0.5">
                Bảng Kết Quả Vòng Sơ Loại Prelim (Dành Cho Khách & Khán Giả)
              </p>
            </div>
          </div>

          {/* Right Action Tools for Guests */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Share / QR Modal Button */}
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-bold border border-zinc-700 transition-colors cursor-pointer shadow-xs"
              title="Quét mã QR hoặc sao chép link chia sẻ"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Quét QR / Chia sẻ</span>
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-colors cursor-pointer"
              title="Toàn màn hình"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Back to Admin Control (for organizer testing) */}
            <button
              onClick={() => setActiveView('prelim')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold border border-zinc-800 transition-colors cursor-pointer"
              title="Trở về bảng điều khiển Ban Tổ Chức"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Bàn BTC</span>
            </button>
          </div>
        </div>

        {/* Category Tabs Sub-bar */}
        <div className="max-w-7xl mx-auto mt-3 pt-2.5 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
          {/* Category Toggle */}
          <div className="inline-flex rounded-lg bg-zinc-950 p-1 border border-zinc-800 text-xs font-bold">
            <button
              onClick={() => setActiveCategory('pro_2v2')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                activeCategory === 'pro_2v2'
                  ? 'bg-amber-500 text-zinc-950 font-black shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              U16 PRO (2vs2)
            </button>
            <button
              onClick={() => setActiveCategory('newbie_1v1')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                activeCategory === 'newbie_1v1'
                  ? 'bg-amber-500 text-zinc-950 font-black shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              U16 BBOY/BGIRL (1vs1)
            </button>
          </div>

          {/* Quick Stats Ticker */}
          <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
            <span>
              Thí sinh: <strong className="text-white font-bold">{currentDancers.length}</strong>
            </span>
            <span className="text-zinc-700">•</span>
            <span>
              Vé Vàng Battle: <strong className="text-amber-400 font-bold">32</strong>
            </span>
            <span className="text-zinc-700">•</span>
            <span>
              Thang điểm: <strong className="text-white font-bold">400</strong> (100đ x 4 GK)
            </span>
          </div>
        </div>
      </header>

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Real-time Status Card */}
        {!isLocked ? (
          <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-red-950/70 via-zinc-900 to-zinc-900 border border-red-800/60 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-red-600/20 border border-red-500 flex items-center justify-center shrink-0 mt-0.5">
                <Radio className="w-5 h-5 text-red-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-sm sm:text-base uppercase tracking-wide">
                    VÒNG SƠ LOẠI ĐANG DIỄN RA
                  </span>
                  <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono text-[10px] font-black uppercase">
                    TOP {effectiveScope === 'top10' ? '10' : '15'} TẠM THỜI
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-1 max-w-3xl leading-relaxed">
                  Để giữ tính bảo mật và sự hấp dẫn của giải đấu, hệ thống hiện đang công bố{' '}
                  <strong className="text-amber-400 font-bold">
                    Top {effectiveScope === 'top10' ? '10' : '15'}
                  </strong>{' '}
                  thí sinh có điểm số cao nhất. Toàn bộ danh sách 40 thí sinh và 32 Vé Vàng chính thức
                  sẽ được mở ngay sau khi Ban Giám Khảo hoàn thành chấm điểm.
                </p>
              </div>
            </div>

            {/* Scope Toggle for Ongoing */}
            <div className="shrink-0 flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800 self-end md:self-center">
              <button
                onClick={() => setGuestScope('top10')}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                  effectiveScope === 'top10'
                    ? 'bg-amber-500 text-zinc-950 font-black shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Top 10 Dẫn Đầu
              </button>
              <button
                onClick={() => setGuestScope('top15')}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                  effectiveScope === 'top15'
                    ? 'bg-amber-500 text-zinc-950 font-black shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Top 15 Dẫn Đầu
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-emerald-950/70 via-zinc-900 to-zinc-900 border border-emerald-700/60 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-sm sm:text-base uppercase tracking-wide">
                    VÒNG SƠ LOẠI ĐÃ KẾT THÚC · KẾT QUẢ CHÍNH THỨC
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-[10px] font-black uppercase">
                    32 VÉ VÀNG BATTLE ĐÃ XÁC ĐỊNH
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-1 max-w-3xl leading-relaxed">
                  Chúc mừng toàn thể các thí sinh! 32 thí sinh xếp hạng từ 1 đến 32 chính thức nhận{' '}
                  <strong className="text-amber-400 font-bold">VÉ VÀNG BATTLE</strong> để bước vào vòng
                  đấu đối kháng trực tiếp (Knock-out Stage).
                </p>
              </div>
            </div>

            {/* Scope Filter for Completed */}
            <div className="shrink-0 flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 self-end md:self-center">
              <button
                onClick={() => setGuestScope('all')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                  effectiveScope === 'all'
                    ? 'bg-emerald-600 text-white font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Toàn Bộ (40)
              </button>
              <button
                onClick={() => setGuestScope('top32')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                  effectiveScope === 'top32'
                    ? 'bg-amber-500 text-zinc-950 font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                32 Vé Vàng
              </button>
              <button
                onClick={() => setGuestScope('top10')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                  effectiveScope === 'top10'
                    ? 'bg-zinc-800 text-amber-400 font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Top 10
              </button>
            </div>
          </div>
        )}

        {/* TOP 3 PODIUM SPOTLIGHT (BỤC VINH QUANG 3 HẠNG ĐẦU) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <h2 className="font-condensed font-black text-xl text-white tracking-wider uppercase">
                BỤC VINH QUANG TOP 3 DẪN ĐẦU
              </h2>
            </div>
            <div className="text-xs text-zinc-400 font-mono">
              Nhấn vào thẻ thí sinh để xem chi tiết
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* RANK 2 (Silver) */}
            {top2 && (
              <div
                onClick={() => setSelectedDancer(top2)}
                className="relative order-2 md:order-1 rounded-xl bg-gradient-to-b from-zinc-800/90 via-zinc-900 to-zinc-950 border border-slate-400/30 p-4 shadow-xl flex flex-col justify-between overflow-hidden cursor-pointer hover:border-slate-300 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-500/20 border border-slate-400/40 text-slate-200 text-xs font-black">
                      <Medal className="w-3.5 h-3.5 text-slate-300" />
                      <span>HẠNG 2 · BẠC</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700">
                      SBD: {top2.sbd}
                    </span>
                  </div>

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
                        {top2.gender === 'female' ? 'BGIRL' : 'BBOY'} · {top2.age}T
                      </div>
                      <h3 className="font-condensed font-black text-xl text-white tracking-wide truncate uppercase leading-tight group-hover:text-slate-200 transition-colors">
                        {stripBreakerPrefix(top2.name)}
                      </h3>
                      <p className="text-xs text-zinc-400 truncate">
                        {top2.realName || 'Thí sinh tài năng'}
                      </p>
                      <div className="text-[11px] text-zinc-500 font-medium truncate mt-0.5">
                        {top2.crew || 'Tự do'}
                      </div>
                    </div>
                  </div>
                </div>

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
                    <span>
                      Điểm TB: <strong className="text-white font-mono">{top2.prelimScoreAvg}</strong>/100
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-800/40">
                      Vé Vàng #2
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 mt-2.5">
                    {prelimJudges.map((j) => (
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
              <div
                onClick={() => setSelectedDancer(top1)}
                className="relative order-1 md:order-2 rounded-xl bg-gradient-to-b from-amber-950/80 via-zinc-900 to-zinc-950 border-2 border-amber-500/70 p-4 shadow-2xl shadow-amber-500/10 flex flex-col justify-between overflow-hidden cursor-pointer hover:border-amber-400 transition-all group transform md:-translate-y-2"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500/20 border border-amber-500/60 text-amber-300 text-xs font-black shadow-sm">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span>HẠNG 1 · QUÁN QUÂN PRELIM</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-600/50">
                      SBD: {top1.sbd}
                    </span>
                  </div>

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
                        {top1.gender === 'female' ? 'BGIRL' : 'BBOY'} · {top1.age}T
                      </div>
                      <h3 className="font-condensed font-black text-2xl text-amber-400 tracking-wide truncate uppercase leading-tight group-hover:text-amber-300 transition-colors">
                        {stripBreakerPrefix(top1.name)}
                      </h3>
                      <p className="text-xs text-zinc-300 truncate font-medium">
                        {top1.realName || 'Thí sinh dẫn đầu'}
                      </p>
                      <div className="text-[11px] text-zinc-400 font-medium truncate mt-0.5">
                        {top1.crew || 'Tự do'}
                      </div>
                    </div>
                  </div>
                </div>

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
                    <span>
                      Điểm TB: <strong className="text-amber-400 font-mono text-xs">{top1.prelimScoreAvg}</strong>/100
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-zinc-950 text-[10px] font-black uppercase shadow">
                      Vé Vàng #1 (Hạt Giống 1)
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 mt-2.5">
                    {prelimJudges.map((j) => (
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
              <div
                onClick={() => setSelectedDancer(top3)}
                className="relative order-3 rounded-xl bg-gradient-to-b from-zinc-800/90 via-zinc-900 to-zinc-950 border border-amber-700/30 p-4 shadow-xl flex flex-col justify-between overflow-hidden cursor-pointer hover:border-amber-600 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-900/30 border border-amber-700/40 text-amber-300 text-xs font-black">
                      <Medal className="w-3.5 h-3.5 text-amber-500" />
                      <span>HẠNG 3 · ĐỒNG</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700">
                      SBD: {top3.sbd}
                    </span>
                  </div>

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
                        {top3.gender === 'female' ? 'BGIRL' : 'BBOY'} · {top3.age}T
                      </div>
                      <h3 className="font-condensed font-black text-xl text-white tracking-wide truncate uppercase leading-tight group-hover:text-amber-300 transition-colors">
                        {stripBreakerPrefix(top3.name)}
                      </h3>
                      <p className="text-xs text-zinc-400 truncate">
                        {top3.realName || 'Thí sinh tài năng'}
                      </p>
                      <div className="text-[11px] text-zinc-500 font-medium truncate mt-0.5">
                        {top3.crew || 'Tự do'}
                      </div>
                    </div>
                  </div>
                </div>

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
                    <span>
                      Điểm TB: <strong className="text-white font-mono">{top3.prelimScoreAvg}</strong>/100
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-800/40">
                      Vé Vàng #3
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 mt-2.5">
                    {prelimJudges.map((j) => (
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

        {/* DETAILED LEADERBOARD & FILTER CONTROLS */}
        <section className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-900/80 p-3 sm:p-4 rounded-xl border border-zinc-800 shadow-md">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm theo SBD, tên breaker, CLB..."
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter and View Toggles */}
            <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
              {/* Gender Filter */}
              <div className="inline-flex rounded-lg bg-zinc-950 p-0.5 border border-zinc-800 text-xs">
                <button
                  onClick={() => setFilterGender('all')}
                  className={`px-2.5 py-1 rounded font-bold transition-colors cursor-pointer ${
                    filterGender === 'all'
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setFilterGender('male')}
                  className={`px-2.5 py-1 rounded font-bold transition-colors cursor-pointer ${
                    filterGender === 'male'
                      ? 'bg-blue-900/60 text-blue-300'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Bboy
                </button>
                <button
                  onClick={() => setFilterGender('female')}
                  className={`px-2.5 py-1 rounded font-bold transition-colors cursor-pointer ${
                    filterGender === 'female'
                      ? 'bg-pink-900/60 text-pink-300'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Bgirl
                </button>
              </div>

              {/* View Mode Toggle (Table vs Cards) */}
              <div className="inline-flex rounded-lg bg-zinc-950 p-0.5 border border-zinc-800 text-xs">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-zinc-800 text-amber-400'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Xem dạng Bảng"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-zinc-800 text-amber-400'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Xem dạng Thẻ"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Dancers Presentation */}
          {viewMode === 'table' ? (
            /* Table Mode */
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-900 border-b border-zinc-800 text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                      <th className="py-3 px-3 text-center w-14">HẠNG</th>
                      <th className="py-3 px-3 text-center w-16">SBD</th>
                      <th className="py-3 px-4 min-w-[200px]">THÍ SINH (BBOY / BGIRL)</th>
                      <th className="py-3 px-3 text-center w-28">CLB / ĐỘI</th>
                      {prelimJudges.map((j) => (
                        <th key={j.id} className="py-2.5 px-2 text-center w-20 text-zinc-300">
                          <div className="font-mono text-[9px] text-zinc-400">{j.code}</div>
                          <div className="font-bold text-amber-300 text-[11px] truncate uppercase">
                            {j.judgeName || j.code}
                          </div>
                        </th>
                      ))}
                      <th className="py-3 px-3 text-center w-20 text-zinc-300">ĐIỂM TB</th>
                      <th className="py-3 px-3 text-center w-24 text-amber-400 font-bold">TỔNG ĐIỂM</th>
                      <th className="py-3 px-3 text-center w-36">TRẠNG THÁI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-sans">
                    {filteredDancers.map((dancer) => {
                      const rank = sortedDancers.findIndex((d) => d.id === dancer.id) + 1;
                      const isTop3 = rank <= 3;
                      const isQualified = rank <= 32;
                      const isRank32 = rank === 32;

                      let rowBg = 'hover:bg-zinc-800/50 transition-colors cursor-pointer';
                      if (rank === 1) rowBg = 'bg-amber-950/20 hover:bg-amber-950/30 cursor-pointer';
                      else if (rank === 2) rowBg = 'bg-slate-800/20 hover:bg-slate-800/30 cursor-pointer';
                      else if (rank === 3) rowBg = 'bg-amber-900/10 hover:bg-amber-900/20 cursor-pointer';
                      else if (rank > 32) rowBg = 'bg-zinc-950/60 opacity-75 hover:opacity-100 hover:bg-zinc-900/60 cursor-pointer';

                      return (
                        <React.Fragment key={dancer.id}>
                          <tr
                            onClick={() => setSelectedDancer(dancer)}
                            className={rowBg}
                          >
                            {/* Rank Badge */}
                            <td className="py-3 px-3 text-center">
                              {rank === 1 && (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-amber-500 text-zinc-950 font-mono font-black text-xs shadow-md shadow-amber-500/20">
                                  1
                                </span>
                              )}
                              {rank === 2 && (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-slate-300 text-zinc-950 font-mono font-black text-xs shadow-md">
                                  2
                                </span>
                              )}
                              {rank === 3 && (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-amber-700 text-white font-mono font-black text-xs shadow-md">
                                  3
                                </span>
                              )}
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

                            {/* Dancer Info */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={getDancerAvatarUrl(dancer, storageConfig.placeholders)}
                                  alt={dancer.name}
                                  className="w-9 h-9 rounded-lg object-cover bg-zinc-800 border border-zinc-700 shrink-0"
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
                                    {dancer.realName || '—'} · {dancer.age} tuổi
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Crew */}
                            <td className="py-3 px-3 text-center text-zinc-300 font-medium truncate max-w-[120px]">
                              {dancer.crew || 'Tự do'}
                            </td>

                            {/* 4 Judges' Scores */}
                            {prelimJudges.map((j) => {
                              const score = dancer.prelimScores[j.id];
                              return (
                                <td
                                  key={j.id}
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
                              {!isLocked ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                                  <Flame className="w-3 h-3 text-amber-400" />
                                  <span>Top Dẫn Đầu</span>
                                </span>
                              ) : isQualified ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                                  <Trophy className="w-3 h-3 text-amber-400" />
                                  <span>Vé Vàng Battle</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">
                                  Ngoài Top 32
                                </span>
                              )}
                            </td>
                          </tr>

                          {/* Threshold Separator between Rank 32 and Rank 33 when showing all */}
                          {isLocked && isRank32 && (
                            <tr className="bg-gradient-to-r from-amber-600/30 via-amber-500/20 to-amber-600/30 border-y-2 border-amber-500">
                              <td colSpan={prelimJudges.length + 6} className="py-2 px-4 text-center">
                                <div className="flex items-center justify-center gap-2 text-xs font-black uppercase text-amber-300 tracking-wider font-condensed">
                                  <Trophy className="w-4 h-4 text-amber-400" />
                                  <span>NGƯỠNG 32 VÉ VÀNG VÀO VÒNG ĐẤU BATTLE TRỰC TIẾP (KNOCK-OUT)</span>
                                  <Trophy className="w-4 h-4 text-amber-400" />
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Cards Mode (Mobile-friendly Grid) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredDancers.map((dancer) => {
                const rank = sortedDancers.findIndex((d) => d.id === dancer.id) + 1;
                const isTop3 = rank <= 3;
                const isQualified = rank <= 32;

                return (
                  <div
                    key={dancer.id}
                    onClick={() => setSelectedDancer(dancer)}
                    className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 transition-all cursor-pointer shadow-md flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
                            rank === 1
                              ? 'bg-amber-500 text-zinc-950'
                              : rank === 2
                              ? 'bg-slate-300 text-zinc-950'
                              : rank === 3
                              ? 'bg-amber-700 text-white'
                              : isQualified
                              ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                              : 'bg-zinc-950 text-zinc-500'
                          }`}
                        >
                          HẠNG #{rank}
                        </span>
                        <span className="font-mono text-xs font-bold text-amber-400">
                          SBD: {dancer.sbd}
                        </span>
                      </div>

                      {/* Dancer Info */}
                      <div className="flex items-center gap-3 mt-3">
                        <img
                          src={getDancerAvatarUrl(dancer, storageConfig.placeholders)}
                          alt={dancer.name}
                          className="w-12 h-12 rounded-lg object-cover bg-zinc-800 border border-zinc-700 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-condensed font-black text-base text-white truncate uppercase group-hover:text-amber-400 transition-colors">
                            {stripBreakerPrefix(dancer.name)}
                          </h4>
                          <p className="text-xs text-zinc-400 truncate">
                            {dancer.realName || 'Thí sinh'} · {dancer.age}T
                          </p>
                          <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                            {dancer.crew || 'Tự do'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Stats */}
                    <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-zinc-400 uppercase font-mono">Tổng điểm</div>
                        <div className="text-lg font-mono font-black text-white">
                          {Math.round(dancer.prelimScoreTotal)}{' '}
                          <span className="text-[10px] text-zinc-500">/ 400</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-zinc-400 uppercase font-mono">Điểm TB</div>
                        <div className="text-sm font-mono font-bold text-amber-400">
                          {Math.round(dancer.prelimScoreAvg)}/100
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* BREAKER DETAIL MODAL (THẺ ĐẤU THỦ) */}
      {selectedDancer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="font-condensed font-black text-base text-white uppercase tracking-wider">
                  THẺ THÍ SINH VÒNG SƠ LOẠI
                </span>
              </div>
              <button
                onClick={() => setSelectedDancer(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 overflow-y-auto">
              {/* Photo & Main Specs */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-zinc-800 border-2 border-amber-500 overflow-hidden shrink-0 shadow-lg">
                  <img
                    src={getDancerHalfBodyUrl(selectedDancer, storageConfig.placeholders)}
                    alt={selectedDancer.name}
                    className="w-full h-full object-cover object-top"
                    onError={(e) => {
                      e.currentTarget.src = getDancerAvatarUrl(selectedDancer, storageConfig.placeholders);
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                      SBD: {selectedDancer.sbd}
                    </span>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      Hạng #{sortedDancers.findIndex((d) => d.id === selectedDancer.id) + 1}
                    </span>
                  </div>
                  <h3 className="font-condensed font-black text-2xl text-white uppercase tracking-wide mt-1">
                    {stripBreakerPrefix(selectedDancer.name)}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {selectedDancer.realName || 'Thí sinh tài năng'} · {selectedDancer.age} tuổi (
                    {selectedDancer.gender === 'female' ? 'Bgirl' : 'Bboy'})
                  </p>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">
                    CLB: {selectedDancer.crew || 'Tự do'}
                  </p>
                </div>
              </div>

              {/* Score Breakdown Box */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-condensed">
                    BẢNG ĐIỂM CHI TIẾT (4 GIÁM KHẢO CHẤM)
                  </span>
                  <div className="text-right">
                    <span className="font-mono text-xs text-zinc-400">Tổng điểm: </span>
                    <strong className="font-mono text-base text-amber-400 font-black">
                      {Math.round(selectedDancer.prelimScoreTotal)}
                    </strong>
                    <span className="text-[10px] text-zinc-500 font-mono"> / 400</span>
                  </div>
                </div>

                {/* 4 Judges Cards */}
                <div className="grid grid-cols-2 gap-2.5">
                  {prelimJudges.map((j) => {
                    const score = selectedDancer.prelimScores[j.id];
                    return (
                      <div
                        key={j.id}
                        className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-[10px] font-mono text-zinc-400">{j.code}</div>
                          <div className="text-xs font-bold text-white uppercase truncate max-w-[100px]">
                            {j.judgeName || j.code}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-lg text-amber-400">
                            {score !== undefined ? Math.round(score) : '—'}
                          </span>
                          <span className="text-[10px] text-zinc-500 block leading-none">/ 100</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2 text-xs text-zinc-400">
                  <span>Điểm trung bình mỗi GK:</span>
                  <strong className="text-white font-mono font-bold text-sm">
                    {Math.round(selectedDancer.prelimScoreAvg)} / 100
                  </strong>
                </div>
              </div>

              {/* Status Notice */}
              <div className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-800 text-xs text-zinc-300 text-center">
                {selectedDancer.isQualifiedTop32 ? (
                  <span className="text-emerald-400 font-bold">
                    ✓ Thí sinh đã lọt vào Top 32 và giành Vé Vàng thi đấu Vòng Battle chính thức.
                  </span>
                ) : (
                  <span className="text-zinc-400">
                    Vị trí hiện tại: Hạng #{sortedDancers.findIndex((d) => d.id === selectedDancer.id) + 1}.
                  </span>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex justify-end">
              <button
                onClick={() => setSelectedDancer(null)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE / QR CODE MODAL */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-5 text-center space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-400" />
                <h3 className="font-condensed font-black text-base text-white uppercase tracking-wider">
                  QUÉT QR XEM TRÊN ĐIỆN THOẠI
                </h3>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Image */}
            <div className="p-4 bg-white rounded-xl mx-auto w-56 h-56 flex items-center justify-center shadow-lg">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  shareUrl
                )}`}
                alt="QR Code"
                className="w-full h-full object-contain"
              />
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Khán giả, phụ huynh và thí sinh có thể quét mã QR này để theo dõi kết quả trực tiếp trên
              điện thoại cá nhân.
            </p>

            {/* Copy Link Button */}
            <div className="pt-2">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-zinc-950" />
                    <span>Đã Sao Chép Link!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-zinc-950" />
                    <span>Sao Chép Link Xem Trực Tiếp</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
