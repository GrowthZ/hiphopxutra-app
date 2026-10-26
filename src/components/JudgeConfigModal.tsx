import React, { useState, useEffect, useRef } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Judge } from '../types/tournament';
import {
  X,
  Upload,
  Camera,
  User,
  Image as ImageIcon,
  Check,
  RotateCcw,
  Link as LinkIcon,
  HelpCircle,
  Eye,
  Sliders,
} from 'lucide-react';
import {
  getJudgeAvatarUrl,
  getJudgeFullPhotoUrl,
  DEFAULT_JUDGE_AVATAR,
  DEFAULT_JUDGE_FULL,
} from '../utils/placeholderAssets';

interface JudgeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialJudgeId?: string;
}

export const JudgeConfigModal: React.FC<JudgeConfigModalProps> = ({
  isOpen,
  onClose,
  initialJudgeId,
}) => {
  const { judges, updateJudgePhotos, playAudioEffect } = useTournament();

  const [selectedJudgeId, setSelectedJudgeId] = useState<string>(initialJudgeId || 'gk-1');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [fullPhotoUrl, setFullPhotoUrl] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const fullPhotoFileInputRef = useRef<HTMLInputElement>(null);

  const currentJudge = judges.find((j) => j.id === selectedJudgeId) || judges[0];

  // Sync state whenever selected judge changes or modal opens
  useEffect(() => {
    if (currentJudge) {
      setAvatarUrl(currentJudge.avatar || '');
      setFullPhotoUrl(currentJudge.fullPhotoUrl || '');
      setCustomName(currentJudge.name || '');
    }
  }, [selectedJudgeId, currentJudge, isOpen]);

  useEffect(() => {
    if (initialJudgeId) {
      setSelectedJudgeId(initialJudgeId);
    }
  }, [initialJudgeId]);

  if (!isOpen) return null;

  // File Upload Helper (converts to base64 Data URL)
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'avatar' | 'full'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn tệp định dạng hình ảnh (PNG, JPG, WEBP, SVG)!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (type === 'avatar') {
        setAvatarUrl(result);
      } else {
        setFullPhotoUrl(result);
      }
      playAudioEffect('tick');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!currentJudge) return;

    updateJudgePhotos(currentJudge.id, {
      avatar: avatarUrl.trim(),
      fullPhotoUrl: fullPhotoUrl.trim(),
      name: customName.trim() || currentJudge.name,
      judgeName: customName.split('•')[1]?.trim() || currentJudge.judgeName,
    });

    playAudioEffect('vote');
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-zinc-100 font-sans animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-condensed font-black text-lg text-white uppercase tracking-wider">
                  CẤU HÌNH HÌNH ẢNH GIÁM KHẢO
                </h3>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400 border border-zinc-700">
                  2 ẢNH / GK
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Tải lên 2 loại ảnh: 1 là Ảnh Avatar (cận mặt), 1 là Ảnh Full (toàn thân / poster)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Judge Selector Pills */}
        <div className="px-5 py-3 border-b border-zinc-800/80 bg-zinc-900/40 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            {judges.map((j) => {
              const isSelected = j.id === selectedJudgeId;
              const short = j.judgeName || j.name.split('•')[1]?.trim() || j.code;
              return (
                <button
                  key={j.id}
                  onClick={() => {
                    setSelectedJudgeId(j.id);
                    playAudioEffect('tick');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-zinc-950 shadow-md font-black ring-1 ring-amber-300'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-75">{j.code}</span>
                  <span className="uppercase">{short}</span>
                  {j.avatar && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Đã có ảnh" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body: 2 Columns for 2 Photos */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Active Judge Info Bar */}
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-mono font-black text-sm px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                {currentJudge.code}
              </span>
              <div>
                <div className="text-xs text-zinc-400 font-mono">ĐANG CẤU HÌNH CHO GIÁM KHẢO:</div>
                <div className="font-condensed font-black text-lg text-white uppercase tracking-wide">
                  {currentJudge.name}
                </div>
              </div>
            </div>

            {/* Custom Name Edit */}
            <div className="w-full sm:w-64">
              <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase font-semibold">
                Tên hiển thị:
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                placeholder="Ví dụ: GK 01 • T-Cat"
              />
            </div>
          </div>

          {/* 2 Photos Layout (Avatar & Full) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* PHOTO 1: ẢNH AVATAR (CẬN MẶT / 1:1) */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-black flex items-center justify-center font-mono">
                      1
                    </span>
                    <h4 className="font-condensed font-black text-base text-white uppercase tracking-wider">
                      ẢNH AVATAR (CẬN MẶT)
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 font-bold">TỶ LỆ 1:1</span>
                </div>
                <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                  Hiển thị trên thẻ chấm điểm mobile, danh sách ban giám khảo và bảng điều hành.
                </p>

                {/* Avatar Preview Box */}
                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-zinc-950 border border-zinc-800/80">
                  <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-amber-500/60 shadow-xl bg-zinc-900">
                    <img
                      src={avatarUrl.trim() || DEFAULT_JUDGE_AVATAR}
                      alt="Judge Avatar Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_JUDGE_AVATAR;
                      }}
                    />
                    {avatarUrl && (
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-400 text-[9px] font-mono font-bold border border-emerald-600/50">
                        Đã nạp
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500 mt-2">
                    {avatarUrl ? 'Xem trước ảnh cận mặt' : 'Ảnh avatar mặc định SVG'}
                  </span>
                </div>
              </div>

              {/* Action Controls for Avatar */}
              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                {/* Upload Button */}
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'avatar')}
                />
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border border-zinc-700 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tải ảnh từ máy tính (PNG / JPG)</span>
                </button>

                {/* Direct URL input */}
                <div className="relative">
                  <LinkIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="Hoặc dán URL ảnh trực tiếp..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                {avatarUrl && (
                  <button
                    onClick={() => setAvatarUrl('')}
                    className="text-[11px] text-zinc-500 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer pt-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Khôi phục avatar mặc định</span>
                  </button>
                )}
              </div>
            </div>

            {/* PHOTO 2: ẢNH FULL (TOÀN THÂN / POSTER 3:4) */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-black flex items-center justify-center font-mono">
                      2
                    </span>
                    <h4 className="font-condensed font-black text-base text-white uppercase tracking-wider">
                      ẢNH FULL (TOÀN THÂN / POSTER)
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 font-bold">TỶ LỆ 3:4</span>
                </div>
                <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                  Hiển thị trên màn hình chào mừng đăng nhập và giới thiệu ban giám khảo sân khấu.
                </p>

                {/* Full Photo Preview Box */}
                <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
                  <div className="relative w-32 h-44 rounded-xl overflow-hidden border-2 border-amber-500/60 shadow-xl bg-zinc-900">
                    <img
                      src={fullPhotoUrl.trim() || DEFAULT_JUDGE_FULL}
                      alt="Judge Full Photo Preview"
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_JUDGE_FULL;
                      }}
                    />
                    {fullPhotoUrl && (
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-400 text-[9px] font-mono font-bold border border-emerald-600/50">
                        Đã nạp
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500 mt-2">
                    {fullPhotoUrl ? 'Xem trước ảnh toàn thân' : 'Ảnh poster toàn thân mặc định'}
                  </span>
                </div>
              </div>

              {/* Action Controls for Full Photo */}
              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                {/* Upload Button */}
                <input
                  ref={fullPhotoFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'full')}
                />
                <button
                  type="button"
                  onClick={() => fullPhotoFileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border border-zinc-700 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tải ảnh từ máy tính (PNG / JPG)</span>
                </button>

                {/* Direct URL input */}
                <div className="relative">
                  <LinkIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="url"
                    value={fullPhotoUrl}
                    onChange={(e) => setFullPhotoUrl(e.target.value)}
                    placeholder="Hoặc dán URL ảnh trực tiếp..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                {fullPhotoUrl && (
                  <button
                    onClick={() => setFullPhotoUrl('')}
                    className="text-[11px] text-zinc-500 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer pt-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Khôi phục ảnh toàn thân mặc định</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-zinc-800 bg-zinc-900/90 flex items-center justify-between shrink-0">
          <div className="text-xs text-zinc-400 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">
              Ảnh tự động đồng bộ sang Màn LED Sân Khấu & Cổng Giám Khảo.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg ${
                saveSuccess
                  ? 'bg-emerald-500 text-zinc-950'
                  : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
              }`}
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Đã Lưu Thành Công!</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Lưu Cấu Hình 2 Ảnh ({currentJudge.code})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
