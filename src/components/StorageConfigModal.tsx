import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import { StorageProviderType, PlaceholderConfig } from '../types/tournament';
import {
  Cloud,
  HardDrive,
  Database,
  CheckCircle2,
  X,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Image as ImageIcon,
  User,
  Users,
  RotateCcw,
  Upload,
  Link as LinkIcon,
  Trash2,
} from 'lucide-react';
import {
  DEFAULT_MALE_AVATAR,
  DEFAULT_FEMALE_AVATAR,
  DEFAULT_MALE_HALFBODY,
  DEFAULT_FEMALE_HALFBODY,
  DEFAULT_TEAM_PHOTO,
} from '../utils/placeholderAssets';
import { uploadTournamentMedia, convertGoogleDriveUrl } from '../services/storageService';

interface StorageConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StorageConfigModal: React.FC<StorageConfigModalProps> = ({ isOpen, onClose }) => {
  const { storageConfig, setStorageConfig, googleUser, handleGoogleLogin } = useTournament();

  const [activeTab, setActiveTab] = useState<'storage' | 'placeholders'>('storage');
  const [provider, setProvider] = useState<StorageProviderType>(storageConfig.provider);
  const [r2Config, setR2Config] = useState(storageConfig.r2);
  const [driveConfig, setDriveConfig] = useState(storageConfig.drive);
  const [placeholders, setPlaceholders] = useState<PlaceholderConfig>(storageConfig.placeholders || {});
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state when opened
  React.useEffect(() => {
    if (isOpen) {
      setProvider(storageConfig.provider);
      setR2Config(storageConfig.r2);
      setDriveConfig(storageConfig.drive);
      setPlaceholders(storageConfig.placeholders || {});
      setSaveSuccess(false);
    }
  }, [isOpen, storageConfig]);

  if (!isOpen) return null;

  const handleSave = () => {
    setStorageConfig({
      provider,
      r2: r2Config,
      drive: driveConfig,
      placeholders,
    });
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
      const res = await uploadTournamentMedia(
        file,
        `placeholder_${slotKey}`,
        {
          provider,
          r2: r2Config,
          drive: driveConfig,
          placeholders,
        }
      );
      if (res.success && res.url) {
        setPlaceholders((prev) => ({
          ...prev,
          [slotKey]: res.url,
        }));
      }
    } catch (e) {
      console.error('Placeholder upload error:', e);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 select-none">
      <div className="bg-zinc-950 border border-zinc-800 text-white w-full max-w-2xl rounded p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-condensed font-black text-lg sm:text-xl tracking-tight text-white uppercase">
                Cài Đặt Lưu Trữ & Ảnh Mẫu (Placeholder)
              </h2>
              <p className="text-[11px] text-zinc-400">
                Quản lý Cloudflare R2, Google Drive và cấu hình hình ảnh mặc định theo giới tính
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Tab Switcher */}
        <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded border border-zinc-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('storage')}
            className={`flex-1 py-1.5 px-3 rounded transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'storage'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span>1. Nơi Lưu Trữ (R2 / Drive / Local)</span>
          </button>

          <button
            onClick={() => setActiveTab('placeholders')}
            className={`flex-1 py-1.5 px-3 rounded transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'placeholders'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>2. Cài Đặt Ảnh Mẫu (Placeholder Nam / Nữ / 2v2)</span>
          </button>
        </div>

        {/* TAB 1: Storage Config */}
        {activeTab === 'storage' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                Chọn Dịch Vụ Lưu Trữ:
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                {/* Cloudflare R2 */}
                <button
                  onClick={() => setProvider('r2')}
                  className={`p-3 rounded border text-left transition-colors flex flex-col justify-between cursor-pointer ${
                    provider === 'r2'
                      ? 'bg-zinc-900 border-amber-500 text-white'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Cloud className="w-4 h-4 text-amber-400" />
                    {provider === 'r2' && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                  </div>
                  <div className="mt-2 font-black uppercase text-xs text-white">Cloudflare R2</div>
                  <div className="text-[10px] text-zinc-500 font-normal">S3 API / Tốc độ cao</div>
                </button>

                {/* Google Drive */}
                <button
                  onClick={() => setProvider('drive')}
                  className={`p-3 rounded border text-left transition-colors flex flex-col justify-between cursor-pointer ${
                    provider === 'drive'
                      ? 'bg-zinc-900 border-emerald-500 text-white'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                    {provider === 'drive' && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                  </div>
                  <div className="mt-2 font-black uppercase text-xs text-white">Google Drive</div>
                  <div className="text-[10px] text-zinc-500 font-normal">Thư mục Drive BTC</div>
                </button>

                {/* Local / Direct */}
                <button
                  onClick={() => setProvider('local')}
                  className={`p-3 rounded border text-left transition-colors flex flex-col justify-between cursor-pointer ${
                    provider === 'local'
                      ? 'bg-zinc-900 border-blue-500 text-white'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Database className="w-4 h-4 text-blue-400" />
                    {provider === 'local' && <span className="w-2 h-2 rounded-full bg-blue-400" />}
                  </div>
                  <div className="mt-2 font-black uppercase text-xs text-white">Trực Tiếp (WebP)</div>
                  <div className="text-[10px] text-zinc-500 font-normal">Nén nhanh, dùng ngay</div>
                </button>
              </div>
            </div>

            {/* Provider Forms */}
            {provider === 'r2' && (
              <div className="p-4 bg-zinc-900 rounded border border-zinc-800 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5 text-xs">
                    <Cloud className="w-4 h-4" />
                    Thông tin Cloudflare R2 Bucket
                  </span>
                  <a
                    href="https://dash.cloudflare.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 underline"
                  >
                    Mở Cloudflare Dash <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400 block font-semibold">Tên Bucket:</label>
                    <input
                      type="text"
                      placeholder="hiphop-xu-tra-2026"
                      value={r2Config.bucketName}
                      onChange={(e) => setR2Config({ ...r2Config, bucketName: e.target.value })}
                      className="w-full px-3 py-1.5 rounded bg-zinc-950 border border-zinc-700 text-white font-mono text-xs outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400 block font-semibold">Account ID:</label>
                    <input
                      type="text"
                      placeholder="e.g. 7a8b9c..."
                      value={r2Config.accountId}
                      onChange={(e) => setR2Config({ ...r2Config, accountId: e.target.value })}
                      className="w-full px-3 py-1.5 rounded bg-zinc-950 border border-zinc-700 text-white font-mono text-xs outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400 block font-semibold">Access Key ID:</label>
                    <input
                      type="text"
                      placeholder="R2 Access Key"
                      value={r2Config.accessKeyId}
                      onChange={(e) => setR2Config({ ...r2Config, accessKeyId: e.target.value })}
                      className="w-full px-3 py-1.5 rounded bg-zinc-950 border border-zinc-700 text-white font-mono text-xs outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400 block font-semibold">Secret Access Key:</label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••"
                      value={r2Config.secretAccessKey}
                      onChange={(e) => setR2Config({ ...r2Config, secretAccessKey: e.target.value })}
                      className="w-full px-3 py-1.5 rounded bg-zinc-950 border border-zinc-700 text-white font-mono text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400 block font-semibold">
                    Public Domain hoặc Custom Domain (Khuyên dùng để LED tải ảnh siêu tốc):
                  </label>
                  <input
                    type="text"
                    placeholder="https://pub-xxxx.r2.dev hoặc https://media.hiphopxutra.vn"
                    value={r2Config.publicDomain}
                    onChange={(e) => setR2Config({ ...r2Config, publicDomain: e.target.value })}
                    className="w-full px-3 py-1.5 rounded bg-zinc-950 border border-zinc-700 text-white font-mono text-xs outline-none"
                  />
                </div>
              </div>
            )}

            {provider === 'drive' && (
              <div className="p-4 bg-zinc-900 rounded border border-zinc-800 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5 text-xs">
                    <HardDrive className="w-4 h-4" />
                    Lưu trữ vào Google Drive
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400 block font-semibold">Tên thư mục Drive lưu trữ:</label>
                  <input
                    type="text"
                    placeholder="HIPHOP_XU_TRA_2026_MEDIA"
                    value={driveConfig.folderName}
                    onChange={(e) => setDriveConfig({ ...driveConfig, folderName: e.target.value })}
                    className="w-full px-3 py-1.5 rounded bg-zinc-950 border border-zinc-700 text-white font-mono text-xs outline-none"
                  />
                </div>

                <div className="text-[11px] text-zinc-400 bg-zinc-950/60 p-2.5 rounded border border-zinc-800 leading-relaxed">
                  💡 <strong>Hỗ trợ link Google Drive:</strong> Bạn có thể dán trực tiếp link chia sẻ của bất kỳ ảnh nào trên Google Drive, hệ thống sẽ tự động chuyển đổi thành ảnh hiển thị trực tiếp chất lượng cao trên màn LED sân khấu!
                </div>
              </div>
            )}

            {provider === 'local' && (
              <div className="p-4 bg-zinc-900 rounded border border-zinc-800 space-y-2 text-xs">
                <div className="font-bold text-blue-400 uppercase tracking-wide text-[11px]">
                  Chế Độ Lưu Trữ Trực Tiếp (Không Cần Cài Đặt Cloud)
                </div>
                <p className="text-zinc-300 text-xs leading-relaxed">
                  Mỗi khi bạn chọn ảnh từ máy tính hoặc điện thoại, ảnh sẽ tự động được thu gọn và nén thành định dạng <strong>WebP siêu nhẹ</strong> (dưới 150KB), lưu tức thì vào bộ nhớ ứng dụng và đồng bộ mượt mà sang màn LED sân khấu và thiết bị chấm điểm.
                </p>
                <div className="text-[11px] text-zinc-400 bg-zinc-950/60 p-2.5 rounded border border-zinc-800">
                  ✔️ Sử dụng được ngay lập tức mà không cần tài khoản R2 hay Google Drive API.
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Placeholders Setting */}
        {activeTab === 'placeholders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-zinc-900/80 p-3 rounded border border-zinc-800">
              <div>
                <div className="text-xs font-bold text-white uppercase tracking-wide">
                  Cấu Hình Ảnh Mẫu Khi Chưa Có Ảnh
                </div>
                <div className="text-[11px] text-zinc-400">
                  Hệ thống tự động hiển thị ảnh mẫu theo giới tính (Nam / Nữ) và thể loại (1v1 / 2v2)
                </div>
              </div>

              <button
                onClick={resetAllPlaceholders}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer border border-zinc-700 transition-colors"
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
                    className="p-3 bg-zinc-900 rounded border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-700 transition-colors"
                  >
                    {/* Left: Preview thumbnail & Label */}
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0 flex items-center justify-center p-1 bg-zinc-950 rounded border border-zinc-800">
                        <img
                          src={activeSrc}
                          alt={slot.label}
                          className={`${slot.aspect} object-cover object-center border border-zinc-700`}
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
                          <span className="font-condensed font-black text-sm text-white uppercase tracking-tight">
                            {slot.label}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px] uppercase font-bold">
                            {slot.category}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 leading-tight">
                          {slot.hint}
                        </div>
                        <div className="text-[10px] font-semibold text-zinc-500">
                          {isCustomized ? (
                            <span className="text-emerald-400">Đang dùng ảnh tải lên của BTC</span>
                          ) : (
                            <span>Đang dùng ảnh đồ họa mặc định giải đấu</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                      {/* Upload Button */}
                      <label className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-bold text-xs uppercase cursor-pointer flex items-center justify-center gap-1.5 transition-colors">
                        <Upload className="w-3.5 h-3.5 text-zinc-400" />
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
                        className="px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-700 text-white font-mono text-[11px] outline-none w-full sm:w-40"
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
                          className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
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
        <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-xs text-emerald-400 font-bold">
            {saveSuccess && '✓ Đã lưu cấu hình thành công!'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold text-xs cursor-pointer"
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
