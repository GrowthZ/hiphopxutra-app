import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import {
  Trophy,
  Volume2,
  VolumeX,
  FileSpreadsheet,
  Tv,
  Smartphone,
  RotateCcw,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Cloud,
  Camera,
} from 'lucide-react';
import { AudioSettingsModal } from './AudioSettingsModal';

export const Navbar: React.FC = () => {
  const {
    judges,
    selectedJudgeId,
    setSelectedJudgeId,
    soundEnabled,
    setSoundEnabled,
    sheetConfig,
    activeView,
    setActiveView,
    resetAllData,
    setIsStorageModalOpen,
    storageConfig,
    setIsJudgeConfigModalOpen,
  } = useTournament();

  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <header className="bg-zinc-950 border-b border-zinc-800 text-zinc-100 sticky top-0 z-50 select-none">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Brand Lockup: Clean Swiss Typographic Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveView('prelim')}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus-visible:outline-none"
          >
            <div className="w-8 h-8 bg-zinc-900 border border-zinc-700 rounded flex items-center justify-center text-white shrink-0">
              <Trophy className="w-4 h-4 text-zinc-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-condensed font-black text-lg tracking-wider text-white uppercase group-hover:text-zinc-300 transition-colors">
                  HIPHOP XỨ TRÀ
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  U16 · 2026
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium hidden sm:block leading-none mt-0.5">
                Hệ Thống Chấm Điểm & Điều Hành Giải Đấu Breaking
              </p>
            </div>
          </button>
        </div>

        {/* Center: Segmented Workspace Navigation (Crisp, Non-pill, Single-line) */}
        <nav className="hidden lg:flex items-center bg-zinc-900 border border-zinc-800 rounded p-0.5 text-xs font-semibold">
          <button
            onClick={() => setActiveView('prelim')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
              activeView === 'prelim'
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sơ Loại Prelim
          </button>
          <button
            onClick={() => setActiveView('prelim_results')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
              activeView === 'prelim_results'
                ? 'bg-amber-500 text-zinc-950 font-black'
                : 'text-amber-400 hover:text-amber-300'
            }`}
            title="Trang kết quả Prelim (Khán giả & Màn LED)"
          >
            Kết Quả Prelim
          </button>
          <button
            onClick={() => setActiveView('prelim_guest')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
              activeView === 'prelim_guest'
                ? 'bg-amber-500 text-zinc-950 font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Mở giao diện kết quả Prelim dành riêng cho khách & phụ huynh"
          >
            Khách Xem
          </button>
          <button
            onClick={() => setActiveView('teams')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
              activeView === 'teams'
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Ghép Đội 2vs2
          </button>
          <button
            onClick={() => setActiveView('bracket')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
              activeView === 'bracket'
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Nhánh Đấu
          </button>
          <button
            onClick={() => setActiveView('battle')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
              activeView === 'battle'
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Bàn Điều Hành Battle
          </button>
          <button
            onClick={() => setActiveView('dancers')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
              activeView === 'dancers'
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Thí Sinh
          </button>
          <button
            onClick={() => setActiveView('sheets')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeView === 'sheets'
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Google Sheets</span>
          </button>
        </nav>

        {/* Right Action Tools: Sports Broadcast Controls */}
        <div className="flex items-center gap-2">
          {/* Active Judge Simulator Switcher */}
          <div className="hidden sm:flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded px-2 py-1">
            <span className="text-[10px] text-zinc-400 uppercase font-mono font-semibold">GK:</span>
            <select
              value={selectedJudgeId}
              onChange={(e) => setSelectedJudgeId(e.target.value)}
              className="bg-transparent text-xs font-bold text-zinc-100 outline-none cursor-pointer"
              title="Đổi góc nhìn của Giám Khảo để thử nghiệm chấm điểm"
            >
              {judges.map((j) => (
                <option key={j.id} value={j.id} className="bg-zinc-900 text-white">
                  {j.code} • {j.judgeName || j.name.split('•')[1]?.trim() || j.code}
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsJudgeConfigModalOpen(true)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer"
              title="Cấu hình 2 ảnh Giám Khảo (Ảnh Full & Avatar)"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick link to Judge Mobile */}
          <button
            onClick={() => setActiveView('judge')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white rounded text-xs font-bold transition-colors cursor-pointer"
            title="Mở giao diện chấm điểm trên điện thoại cho giám khảo"
          >
            <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden md:inline">Cổng Giám Khảo</span>
          </button>

          {/* Stage LED Broadcast Screen Link */}
          <button
            onClick={() => setActiveView('stage_control')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-colors cursor-pointer"
            title="Mở màn hình LED sân khấu (16:9 Broadcast)"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Màn LED Sân Khấu</span>
          </button>

          {/* Storage (R2 / Drive) Button */}
          <button
            onClick={() => setIsStorageModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white rounded text-xs font-bold transition-colors cursor-pointer"
            title="Cấu hình lưu trữ ảnh Cloudflare R2 / Google Drive"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xl:inline uppercase text-[11px]">
              {storageConfig.provider === 'r2' ? 'R2' : storageConfig.provider === 'drive' ? 'Drive' : 'Ảnh'}
            </span>
          </button>

          {/* Sound FX Settings Modal */}
          <button
            onClick={() => setIsAudioModalOpen(true)}
            className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
            title="Cài đặt hiệu ứng âm thanh giải đấu"
          >
            <Sliders className="w-4 h-4 text-zinc-300" />
          </button>

          {/* Mute/Unmute Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
            title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-zinc-500" />
            )}
          </button>

          {/* Reset All Data (Testing tool) */}
          <button
            onClick={() => {
              if (window.confirm('Đặt lại toàn bộ dữ liệu mẫu (80 thí sinh, 9 giám khảo, 16 đội)?')) {
                resetAllData();
              }
            }}
            className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 border border-zinc-800 transition-colors cursor-pointer"
            title="Khôi phục dữ liệu ban đầu"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors cursor-pointer hidden xl:block"
            title="Toàn màn hình"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Audio Settings Modal */}
      <AudioSettingsModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
      />
    </header>
  );
};
