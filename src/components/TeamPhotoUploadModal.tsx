import React, { useState } from 'react';
import { Team2v2 } from '../types/tournament';
import { useTournament } from '../context/TournamentContext';
import {
  Upload,
  Users,
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
import { getTeamPhotoUrl } from '../utils/placeholderAssets';

interface TeamPhotoUploadModalProps {
  team: Team2v2 | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TeamPhotoUploadModal: React.FC<TeamPhotoUploadModalProps> = ({
  team,
  isOpen,
  onClose,
}) => {
  const { updateTeamPhoto, storageConfig, setIsStorageModalOpen } = useTournament();

  const [teamPhotoPreview, setTeamPhotoPreview] = useState<string>(team?.teamPhotoUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (team) {
      setTeamPhotoPreview(team.teamPhotoUrl || '');
      setErrorMessage(null);
    }
  }, [team]);

  if (!isOpen || !team) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMessage(null);
    try {
      const result = await uploadTournamentMedia(
        file,
        `team_${team.teamNumber}_photo`,
        storageConfig
      );
      if (result.success && result.url) {
        setTeamPhotoPreview(result.url);
      } else {
        setErrorMessage(result.error || 'Tải ảnh đội thất bại');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    updateTeamPhoto(team.id, teamPhotoPreview.trim());
    onClose();
  };

  const providerLabel =
    storageConfig.provider === 'r2'
      ? 'Cloudflare R2'
      : storageConfig.provider === 'drive'
      ? 'Google Drive'
      : 'Bộ nhớ cục bộ';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 select-none">
      <div className="bg-zinc-950 border border-zinc-800 text-white w-full max-w-lg rounded p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                #{String(team.teamNumber).padStart(2, '0')}
              </span>
              <h2 className="font-condensed font-black text-xl tracking-tight text-white uppercase">
                Tải Ảnh Cặp Đấu: {team.name}
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {team.dancer1.name} (SBD {team.dancer1.sbd}) & {team.dancer2.name} (SBD {team.dancer2.sbd})
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Storage Target Banner */}
        <div className="flex items-center justify-between p-2.5 rounded bg-zinc-900 border border-zinc-800 text-xs">
          <div className="flex items-center gap-2">
            {storageConfig.provider === 'r2' ? (
              <Cloud className="w-4 h-4 text-amber-400" />
            ) : storageConfig.provider === 'drive' ? (
              <HardDrive className="w-4 h-4 text-emerald-400" />
            ) : (
              <Upload className="w-4 h-4 text-blue-400" />
            )}
            <span className="text-zinc-400">Đang lưu trữ qua:</span>
            <span className="font-bold text-white uppercase">{providerLabel}</span>
          </div>

          <button
            onClick={() => setIsStorageModalOpen(true)}
            className="text-[11px] text-zinc-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer underline"
          >
            <Sliders className="w-3 h-3" />
            <span>Đổi nơi lưu</span>
          </button>
        </div>

        {errorMessage && (
          <div className="p-2.5 rounded bg-red-950/50 border border-red-800 text-red-300 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        {/* Preview Box with placeholder fallback */}
        <div className="flex flex-col items-center justify-center p-4 bg-zinc-900 rounded border border-zinc-800 min-h-[180px]">
          <div className="relative text-center">
            <img
              src={teamPhotoPreview || getTeamPhotoUrl(team, storageConfig.placeholders)}
              alt={team.name}
              className="max-h-48 w-auto object-contain rounded border-2 border-zinc-700 shadow-lg mx-auto"
            />
            <div className="text-[11px] mt-2 font-medium">
              {teamPhotoPreview ? (
                <span className="text-emerald-400 font-bold">✓ Ảnh đội đã tải lên (Hiển thị LED 16:9)</span>
              ) : (
                <span className="text-zinc-400">Đang hiển thị ảnh mẫu (Placeholder 2vs2 Pro)</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-3">
          {/* File Picker */}
          <div>
            <label className="block w-full text-center py-2.5 px-3 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs cursor-pointer border border-zinc-700 transition-colors uppercase">
              {isUploading ? 'Đang tải lên...' : 'Chọn file ảnh từ thiết bị'}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>

          {/* Direct URL input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1">
                <LinkIcon className="w-3 h-3" /> Hoặc dán link ảnh (Google Drive / Cloudflare R2):
              </label>
              {teamPhotoPreview && (
                <button
                  onClick={() => setTeamPhotoPreview('')}
                  className="text-zinc-500 hover:text-red-400 text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Xóa ảnh</span>
                </button>
              )}
            </div>
            <input
              type="text"
              value={teamPhotoPreview}
              placeholder="https://drive.google.com/file/d/... hoặc https://pub-xxx.r2.dev/..."
              onChange={(e) => setTeamPhotoPreview(convertGoogleDriveUrl(e.target.value))}
              className="w-full px-3 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-white text-xs font-mono outline-none focus:border-zinc-500"
            />
          </div>
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
            <span>Lưu Ảnh Đội</span>
          </button>
        </div>
      </div>
    </div>
  );
};
