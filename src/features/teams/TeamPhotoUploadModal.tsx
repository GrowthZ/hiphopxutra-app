import React, { useState } from 'react';
import { Team2v2 } from '../../domain/types';
import { useTournament } from '../../state/TournamentContext';
import { CheckCircle2, X, Link as LinkIcon, Cloud, Trash2 } from 'lucide-react';
import { convertGoogleDriveUrl } from '../../services/storageService';
import { MEDIA_URL, uploadPhoto } from '../../services/media';
import { getTeamPhotoUrl } from '../../shared/placeholderAssets';

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
  const { updateTeamPhoto, storageConfig } = useTournament();

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
      setTeamPhotoPreview(await uploadPhoto(file, 'teams', `team-${team.teamNumber}`));
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 select-none">
      <div className="bg-white border border-zinc-200 text-zinc-900 w-full max-w-lg rounded p-5 shadow-xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-300">
                #{String(team.teamNumber).padStart(2, '0')}
              </span>
              <h2 className="font-condensed font-black text-xl tracking-tight text-zinc-900 uppercase">
                Tải Ảnh Cặp Đấu: {team.name}
              </h2>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {team.dancer1.name} (SBD {team.dancer1.sbd}) & {team.dancer2.name} (SBD {team.dancer2.sbd})
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded bg-zinc-50 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded bg-zinc-50 border border-zinc-200 text-xs text-zinc-500">
          <Cloud className="w-4 h-4 text-amber-600" />
          {MEDIA_URL
            ? 'Ảnh được thu nhỏ, nén WebP và lưu trên Cloudflare R2.'
            : 'Chưa cấu hình kho ảnh R2 (VITE_MEDIA_URL): chỉ dán link ảnh được.'}
        </div>

        {errorMessage && (
          <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        {/* Preview Box with placeholder fallback */}
        <div className="flex flex-col items-center justify-center p-4 bg-zinc-50 rounded border border-zinc-200 min-h-[180px]">
          <div className="relative text-center">
            <img
              src={teamPhotoPreview || getTeamPhotoUrl(team, storageConfig.placeholders)}
              alt={team.name}
              className="max-h-48 w-auto object-contain rounded border-2 border-zinc-300 shadow-lg mx-auto"
            />
            <div className="text-[11px] mt-2 font-medium">
              {teamPhotoPreview ? (
                <span className="text-emerald-700 font-bold">✓ Ảnh đội đã tải lên (Hiển thị LED 16:9)</span>
              ) : (
                <span className="text-zinc-500">Đang hiển thị ảnh mẫu (Placeholder 2vs2 Pro)</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-3">
          {/* File Picker */}
          <div>
            <label className="block w-full text-center py-2.5 px-3 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs cursor-pointer border border-zinc-300 transition-colors uppercase">
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
              <label className="text-[11px] text-zinc-500 font-semibold flex items-center gap-1">
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
              className="w-full px-3 py-1.5 rounded bg-zinc-50 border border-zinc-300 text-zinc-900 text-xs font-mono outline-none focus:border-zinc-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-zinc-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-zinc-50 hover:bg-zinc-100 border border-zinc-300 text-zinc-700 font-bold text-xs cursor-pointer"
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
