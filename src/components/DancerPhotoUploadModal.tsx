import React, { useState } from 'react';
import { Dancer, CategoryType } from '../types/tournament';
import { useTournament } from '../context/TournamentContext';
import {
  Upload,
  User,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Link as LinkIcon,
  Cloud,
  HardDrive,
  Trash2,
  Sliders,
} from 'lucide-react';
import {
  uploadTournamentMedia,
  convertGoogleDriveUrl,
} from '../services/storageService';
import {
  getDancerAvatarUrl,
  getDancerHalfBodyUrl,
} from '../utils/placeholderAssets';

interface DancerPhotoUploadModalProps {
  dancer: Dancer | null;
  category: CategoryType;
  isOpen: boolean;
  onClose: () => void;
}

export const DancerPhotoUploadModal: React.FC<DancerPhotoUploadModalProps> = ({
  dancer,
  category,
  isOpen,
  onClose,
}) => {
  const { updateDancerMedia, storageConfig, setIsStorageModalOpen } = useTournament();

  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [halfBodyPreview, setHalfBodyPreview] = useState<string>('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingHalfBody, setIsUploadingHalfBody] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial state when dancer changes
  React.useEffect(() => {
    if (dancer) {
      setGender(dancer.gender || 'male');
      setAvatarPreview(dancer.avatarUrl || '');
      setHalfBodyPreview(dancer.halfBodyUrl || '');
      setErrorMessage(null);
    }
  }, [dancer]);

  if (!isOpen || !dancer) return null;

  // Handle file upload for Avatar
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    setErrorMessage(null);
    try {
      const result = await uploadTournamentMedia(
        file,
        `dancer_${dancer.sbd}_avatar`,
        storageConfig
      );
      if (result.success && result.url) {
        setAvatarPreview(result.url);
      } else {
        setErrorMessage(result.error || 'Tải ảnh avatar thất bại');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handle file upload for Half-Body
  const handleHalfBodyFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingHalfBody(true);
    setErrorMessage(null);
    try {
      const result = await uploadTournamentMedia(
        file,
        `dancer_${dancer.sbd}_halfbody`,
        storageConfig
      );
      if (result.success && result.url) {
        setHalfBodyPreview(result.url);
      } else {
        setErrorMessage(result.error || 'Tải ảnh nửa người thất bại');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsUploadingHalfBody(false);
    }
  };

  const handleSave = () => {
    updateDancerMedia(category, dancer.id, {
      avatarUrl: avatarPreview.trim() || undefined,
      halfBodyUrl: halfBodyPreview.trim() || undefined,
      gender,
    });
    onClose();
  };

  const providerLabel =
    storageConfig.provider === 'r2'
      ? 'Cloudflare R2'
      : storageConfig.provider === 'drive'
      ? 'Google Drive'
      : 'Bộ nhớ cục bộ';

  // Resolved placeholders if no custom photo is provided
  const effectiveAvatar = getDancerAvatarUrl(
    { gender, avatarUrl: avatarPreview },
    storageConfig.placeholders
  );

  const effectiveHalfBody = getDancerHalfBodyUrl(
    { gender, halfBodyUrl: halfBodyPreview },
    storageConfig.placeholders
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 select-none">
      <div className="bg-zinc-950 border border-zinc-800 text-white w-full max-w-2xl rounded p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                SBD {dancer.sbd}
              </span>
              <h2 className="font-condensed font-black text-xl tracking-tight text-white uppercase">
                Hồ Sơ & Ảnh Thí Sinh: {dancer.name}
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Cập nhật giới tính, ảnh Avatar và ảnh nửa người cho vòng Prelim và màn LED Battle
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Gender Selection & Storage Target */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Gender Selector */}
          <div className="p-3 rounded bg-zinc-900 border border-zinc-800 space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block">
              Giới tính thí sinh:
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`py-2 px-3 rounded border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  gender === 'male'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-xs'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span>♂</span>
                <span>Nam (BBOY)</span>
              </button>

              <button
                type="button"
                onClick={() => setGender('female')}
                className={`py-2 px-3 rounded border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  gender === 'female'
                    ? 'bg-pink-600/20 border-pink-500 text-pink-400 shadow-xs'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span>♀</span>
                <span>Nữ (BGIRL)</span>
              </button>
            </div>
          </div>

          {/* Storage Provider Banner */}
          <div className="p-3 rounded bg-zinc-900 border border-zinc-800 flex flex-col justify-between text-xs">
            <div className="flex items-center gap-2">
              {storageConfig.provider === 'r2' ? (
                <Cloud className="w-4 h-4 text-amber-400" />
              ) : storageConfig.provider === 'drive' ? (
                <HardDrive className="w-4 h-4 text-emerald-400" />
              ) : (
                <Upload className="w-4 h-4 text-blue-400" />
              )}
              <span className="text-zinc-400">Lưu trữ qua:</span>
              <span className="font-bold text-white uppercase">{providerLabel}</span>
            </div>

            <button
              onClick={() => setIsStorageModalOpen(true)}
              className="text-[11px] text-zinc-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer underline mt-2"
            >
              <Sliders className="w-3 h-3" />
              <span>Đổi nơi lưu / Quản lý ảnh mẫu Placeholder</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-2.5 rounded bg-red-950/50 border border-red-800 text-red-300 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        {/* 2 Upload Sections: Avatar (1:1) and Half-body (3:4) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Section 1: Avatar (Ảnh Cận Mặt) */}
          <div className="p-3.5 rounded bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
                <User className="w-4 h-4 text-zinc-400" />
                <span>1. Ảnh Avatar Cận Mặt (1:1)</span>
              </span>
              {avatarPreview && (
                <button
                  onClick={() => setAvatarPreview('')}
                  className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer"
                  title="Xóa avatar và dùng lại ảnh mẫu placeholder"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Preview Box with placeholder fallback */}
            <div className="flex flex-col items-center justify-center p-3 bg-zinc-950 rounded border border-zinc-800 min-h-[140px]">
              <div className="relative group text-center">
                <img
                  src={effectiveAvatar}
                  alt={dancer.name}
                  className="w-24 h-24 rounded-full object-cover border-2 border-zinc-700 shadow-md mx-auto"
                />
                <div className="text-[10px] text-zinc-400 text-center mt-1.5 font-medium">
                  {avatarPreview ? (
                    <span className="text-emerald-400 font-bold">✓ Ảnh đã tải lên</span>
                  ) : (
                    <span className="text-zinc-500">Đang dùng ảnh mẫu {gender === 'female' ? 'Nữ' : 'Nam'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* File Upload Button */}
            <div>
              <label className="block w-full text-center py-2 px-3 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs cursor-pointer border border-zinc-700 transition-colors uppercase">
                {isUploadingAvatar ? 'Đang tải lên...' : 'Chọn file từ thiết bị'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  disabled={isUploadingAvatar}
                  className="hidden"
                />
              </label>
            </div>

            {/* Direct URL input */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-semibold block flex items-center gap-1">
                <LinkIcon className="w-3 h-3" /> Hoặc dán link ảnh (Drive / R2):
              </label>
              <input
                type="text"
                value={avatarPreview}
                placeholder="https://drive.google.com/file/d/... hoặc link ảnh"
                onChange={(e) => setAvatarPreview(convertGoogleDriveUrl(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-700 text-white text-xs font-mono outline-none"
              />
            </div>
          </div>

          {/* Section 2: Half-Body (Ảnh Nửa Người Chiến Đấu) */}
          <div className="p-3.5 rounded bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-zinc-400" />
                <span>2. Ảnh Nửa Người (Battle Pose 3:4)</span>
              </span>
              {halfBodyPreview && (
                <button
                  onClick={() => setHalfBodyPreview('')}
                  className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer"
                  title="Xóa ảnh nửa người và dùng lại ảnh mẫu placeholder"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Preview Box with placeholder fallback */}
            <div className="flex flex-col items-center justify-center p-3 bg-zinc-950 rounded border border-zinc-800 min-h-[140px]">
              <div className="relative text-center">
                <img
                  src={effectiveHalfBody}
                  alt={dancer.name}
                  className="h-32 w-auto object-contain rounded border border-zinc-700 shadow-md mx-auto"
                />
                <div className="text-[10px] text-center mt-1.5 font-medium">
                  {halfBodyPreview ? (
                    <span className="text-emerald-400 font-bold">✓ Ảnh đã tải lên (LED 16:9)</span>
                  ) : (
                    <span className="text-zinc-500">Ảnh mẫu {gender === 'female' ? 'Nữ' : 'Nam'} trên LED</span>
                  )}
                </div>
              </div>
            </div>

            {/* File Upload Button */}
            <div>
              <label className="block w-full text-center py-2 px-3 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs cursor-pointer border border-zinc-700 transition-colors uppercase">
                {isUploadingHalfBody ? 'Đang tải lên...' : 'Chọn file từ thiết bị'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleHalfBodyFileChange}
                  disabled={isUploadingHalfBody}
                  className="hidden"
                />
              </label>
            </div>

            {/* Direct URL input */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-semibold block flex items-center gap-1">
                <LinkIcon className="w-3 h-3" /> Hoặc dán link ảnh (Drive / R2):
              </label>
              <input
                type="text"
                value={halfBodyPreview}
                placeholder="https://drive.google.com/file/d/... hoặc link ảnh"
                onChange={(e) => setHalfBodyPreview(convertGoogleDriveUrl(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-700 text-white text-xs font-mono outline-none"
              />
            </div>
          </div>
        </div>

        {/* Guidance */}
        <div className="text-[11px] text-zinc-400 bg-zinc-900/60 p-3 rounded border border-zinc-800 leading-relaxed">
          📌 <strong>Chế độ Ảnh Mẫu (Placeholder):</strong> Khi thí sinh chưa tải ảnh cá nhân, hệ thống sẽ tự động áp dụng ảnh mẫu chuẩn WDSF phù hợp với giới tính ({gender === 'female' ? 'Nữ' : 'Nam'}) đã chọn ở trên.
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-zinc-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold text-xs cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Lưu Thông Tin Thí Sinh</span>
          </button>
        </div>
      </div>
    </div>
  );
};
