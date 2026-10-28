import React, { useState } from 'react';
import { useTournament } from '../../state/TournamentContext';
import { PlaceholderConfig } from '../../domain/types';
import {
  Cloud,
  Database,
  CheckCircle2,
  X,
  Image as ImageIcon,
  RotateCcw,
  Upload,
  Trash2,
} from 'lucide-react';
import {
  DEFAULT_MALE_AVATAR,
  DEFAULT_FEMALE_AVATAR,
  DEFAULT_MALE_HALFBODY,
  DEFAULT_FEMALE_HALFBODY,
  DEFAULT_TEAM_PHOTO,
} from '../../shared/placeholderAssets';
import { convertGoogleDriveUrl } from '../../services/storageService';
import { SIZES, uploadPhoto } from '../../services/media';
import { MediaStoragePanel } from './MediaStoragePanel';

interface StorageConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StorageConfigModal: React.FC<StorageConfigModalProps> = ({ isOpen, onClose }) => {
  const { storageConfig, setStorageConfig } = useTournament();

  const [activeTab, setActiveTab] = useState<'storage' | 'placeholders'>('storage');
  const [placeholders, setPlaceholders] = useState<PlaceholderConfig>(storageConfig.placeholders || {});
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state when opened
  React.useEffect(() => {
    if (isOpen) {
      setPlaceholders(storageConfig.placeholders || {});
      setSaveSuccess(false);
    }
  }, [isOpen, storageConfig]);

  if (!isOpen) return null;

  const handleSave = () => {
    setStorageConfig({ placeholders });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  // Upload file for a specific placeholder slot
  const handlePlaceholderFileUpload = async (
    slotKey: keyof PlaceholderConfig,
    file: File
  ) => {
    setUploadingSlot(slotKey);
    try {
      const url = await uploadPhoto(file, 'placeholders', slotKey, SIZES.halfBody);
      setPlaceholders((prev) => ({ ...prev, [slotKey]: url }));
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setUploadingSlot(null);
    }
  };

  const resetAllPlaceholders = () => {
    setPlaceholders({
      maleAvatarUrl: '',
      femaleAvatarUrl: '',
      maleHalfBodyUrl: '',
      femaleHalfBodyUrl: '',
      team2v2Url: '',
    });
  };

  const placeholderSlots = [
    {
      key: 'maleAvatarUrl' as keyof PlaceholderConfig,
      label: 'Avatar Thí Sinh Nam (Bboy)',
      category: 'Nam • 1:1',
      defaultAsset: DEFAULT_MALE_AVATAR,
      aspect: 'w-16 h-16 rounded-full',
      hint: 'Dùng khi thí sinh Nam chưa có ảnh đại diện',
    },
    {
      key: 'femaleAvatarUrl' as keyof PlaceholderConfig,
      label: 'Avatar Thí Sinh Nữ (Bgirl)',
      category: 'Nữ • 1:1',
      defaultAsset: DEFAULT_FEMALE_AVATAR,
      aspect: 'w-16 h-16 rounded-full',
      hint: 'Dùng khi thí sinh Nữ chưa có ảnh đại diện',
    },
    {
      key: 'maleHalfBodyUrl' as keyof PlaceholderConfig,
      label: 'Nửa Người Thí Sinh Nam (Bboy)',
      category: 'Nam • 3:4 Battle Pose',
      defaultAsset: DEFAULT_MALE_HALFBODY,
      aspect: 'w-16 h-22 rounded',
      hint: 'Hiển thị trên màn LED 16:9 khi thí sinh Nam chưa tải ảnh cut-out',
    },
    {
      key: 'femaleHalfBodyUrl' as keyof PlaceholderConfig,
      label: 'Nửa Người Thí Sinh Nữ (Bgirl)',
      category: 'Nữ • 3:4 Battle Pose',
      defaultAsset: DEFAULT_FEMALE_HALFBODY,
      aspect: 'w-16 h-22 rounded',
      hint: 'Hiển thị trên màn LED 16:9 khi thí sinh Nữ chưa tải ảnh cut-out',
    },
    {
      key: 'team2v2Url' as keyof PlaceholderConfig,
      label: 'Ảnh Đội 2 vs 2 Pro',
      category: 'Cặp Đấu • 16:9 Team',
      defaultAsset: DEFAULT_TEAM_PHOTO,
      aspect: 'w-24 h-16 rounded',
      hint: 'Hiển thị trên màn LED và bàn điều hành khi đội 2vs2 chưa tải ảnh',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 select-none">
      <div className="bg-white border border-zinc-200 text-zinc-900 w-full max-w-2xl rounded p-5 shadow-xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-zinc-50 border border-zinc-200 text-zinc-800 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h2 className="font-condensed font-black text-lg sm:text-xl tracking-tight text-zinc-900 uppercase">
                Cài Đặt Lưu Trữ & Ảnh Mẫu (Placeholder)
              </h2>
              <p className="text-[11px] text-zinc-500">
                Kho ảnh Cloudflare R2 và ảnh mặc định theo giới tính
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded bg-zinc-50 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Tab Switcher */}
        <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded border border-zinc-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('storage')}
            className={`flex-1 py-1.5 px-3 rounded transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'storage'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-amber-600" />
            <span>1. Kho ảnh Cloudflare R2</span>
          </button>

          <button
            onClick={() => setActiveTab('placeholders')}
            className={`flex-1 py-1.5 px-3 rounded transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'placeholders'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
            <span>2. Cài Đặt Ảnh Mẫu (Placeholder Nam / Nữ / 2v2)</span>
          </button>
        </div>

        {/* TAB 1: R2 photo storage */}
        {activeTab === 'storage' && <MediaStoragePanel />}

        {/* TAB 2: Placeholders Setting */}
        {activeTab === 'placeholders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-zinc-50 p-3 rounded border border-zinc-200">
              <div>
                <div className="text-xs font-bold text-zinc-900 uppercase tracking-wide">
                  Cấu Hình Ảnh Mẫu Khi Chưa Có Ảnh
                </div>
                <div className="text-[11px] text-zinc-500">
                  Hệ thống tự động hiển thị ảnh mẫu theo giới tính (Nam / Nữ) và thể loại (1v1 / 2v2)
                </div>
              </div>

              <button
                onClick={resetAllPlaceholders}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold cursor-pointer border border-zinc-300 transition-colors"
                title="Khôi phục toàn bộ ảnh mẫu về đồ họa chuẩn WDSF"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại mặc định</span>
              </button>
            </div>

            {/* List of 5 slots */}
            <div className="space-y-3">
              {placeholderSlots.map((slot) => {
                const customVal = placeholders[slot.key];
                const activeSrc = customVal?.trim() ? customVal : slot.defaultAsset;
                const isCustomized = Boolean(customVal?.trim());
                const isCurrentUploading = uploadingSlot === slot.key;

                return (
                  <div
                    key={slot.key}
                    className="p-3 bg-zinc-50 rounded border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-300 transition-colors"
                  >
                    {/* Left: Preview thumbnail & Label */}
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0 flex items-center justify-center p-1 bg-white rounded border border-zinc-200">
                        <img
                          src={activeSrc}
                          alt={slot.label}
                          className={`${slot.aspect} object-cover object-center border border-zinc-300`}
                        />
                        {isCustomized && (
                          <span
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px] font-black"
                            title="Đã tải ảnh tùy biến"
                          >
                            ✓
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-condensed font-black text-sm text-zinc-900 uppercase tracking-tight">
                            {slot.label}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-500 font-mono text-[10px] uppercase font-bold">
                            {slot.category}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 leading-tight">
                          {slot.hint}
                        </div>
                        <div className="text-[10px] font-semibold text-zinc-500">
                          {isCustomized ? (
                            <span className="text-emerald-700">Đang dùng ảnh tải lên của BTC</span>
                          ) : (
                            <span>Đang dùng ảnh đồ họa mặc định giải đấu</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                      {/* Upload Button */}
                      <label className="px-3 py-1.5 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-900 font-bold text-xs uppercase cursor-pointer flex items-center justify-center gap-1.5 transition-colors">
                        <Upload className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{isCurrentUploading ? 'Đang tải...' : 'Tải ảnh lên'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isCurrentUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePlaceholderFileUpload(slot.key, file);
                          }}
                          className="hidden"
                        />
                      </label>

                      {/* Direct URL input */}
                      <input
                        type="text"
                        placeholder="Hoặc dán URL Drive/Web"
                        value={customVal || ''}
                        onChange={(e) =>
                          setPlaceholders((prev) => ({
                            ...prev,
                            [slot.key]: convertGoogleDriveUrl(e.target.value),
                          }))
                        }
                        className="px-2.5 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900 font-mono text-[11px] outline-none w-full sm:w-40"
                      />

                      {/* Reset Single Slot */}
                      {isCustomized && (
                        <button
                          onClick={() =>
                            setPlaceholders((prev) => ({
                              ...prev,
                              [slot.key]: '',
                            }))
                          }
                          className="p-1.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="Xóa ảnh riêng, khôi phục ảnh đồ họa chuẩn"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 border-t border-zinc-200 flex items-center justify-between">
          <div className="text-xs text-emerald-700 font-bold">
            {saveSuccess && '✓ Đã lưu cấu hình thành công!'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-zinc-50 hover:bg-zinc-100 border border-zinc-300 text-zinc-700 font-bold text-xs cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Lưu Cấu Hình</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
