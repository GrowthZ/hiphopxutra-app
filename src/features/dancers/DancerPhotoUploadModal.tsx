import React, { useEffect, useMemo, useState } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';
import { Dancer, CategoryType } from '../../domain/types';
import { useTournament } from '../../state/TournamentContext';
import { CheckCircle2, Image as ImageIcon, Trash2, Upload, X, ZoomIn } from 'lucide-react';
import { CropArea, isInlineImage, MEDIA_URL, uploadDancerPhotos } from '../../services/media';
import { getDancerAvatarUrl } from '../../shared/placeholderAssets';

interface DancerPhotoUploadModalProps {
  dancer: Dancer | null;
  category: CategoryType;
  isOpen: boolean;
  onClose: () => void;
}

// One upload per dancer: the half-body photo. The avatar is cropped from it here (drag / zoom the circle),
// and both are resized to WebP in the browser and stored in R2. Firestore keeps only the URLs and the crop.
export const DancerPhotoUploadModal: React.FC<DancerPhotoUploadModalProps> = ({ dancer, category, isOpen, onClose }) => {
  const { updateDancerMedia, storageConfig } = useTournament();

  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [file, setFile] = useState<File | null>(null);
  const [cleared, setCleared] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<CropArea | null>(null);
  const [cropTouched, setCropTouched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!dancer) return;
    setGender(dancer.gender || 'male');
    setFile(null);
    setCleared(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    setCropTouched(false);
    setErrorMessage(null);
  }, [dancer]);

  const fileUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
  useEffect(() => () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);

  if (!isOpen || !dancer) return null;

  const existingHalfBody = cleared ? '' : dancer.halfBodyUrl || '';
  const source = fileUrl || existingHalfBody;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    if (!picked.type.startsWith('image/')) return setErrorMessage('Vui lòng chọn file ảnh (JPG, PNG, WEBP, HEIC…).');
    setErrorMessage(null);
    setFile(picked);
    setCleared(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropTouched(true);
  };

  const handleSave = async () => {
    setErrorMessage(null);
    if (cleared) {
      updateDancerMedia(category, dancer.id, { avatarUrl: '', halfBodyUrl: '', avatarCrop: undefined, gender });
      return onClose();
    }
    if (!source || !area || !cropTouched) {
      updateDancerMedia(category, dancer.id, { gender });
      return onClose();
    }

    setIsSaving(true);
    try {
      // A new file, or an old photo still embedded in Firestore, uploads the half-body too; else only the avatar.
      const withHalfBody = Boolean(file) || isInlineImage(source);
      const urls = await uploadDancerPhotos(file ?? source, dancer.id, area, withHalfBody);
      updateDancerMedia(category, dancer.id, {
        avatarUrl: urls.avatarUrl,
        ...(urls.halfBodyUrl && { halfBodyUrl: urls.halfBodyUrl }),
        avatarCrop: area,
        gender,
      });
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const genderButton = (value: 'male' | 'female', label: string) => (
    <button
      type="button"
      onClick={() => setGender(value)}
      className={`flex-1 rounded border px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
        gender === value
          ? 'border-amber-500 bg-amber-500/15 text-amber-400'
          : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 select-none">
      <div className="max-h-[92vh] w-full max-w-xl space-y-4 overflow-y-auto rounded border border-zinc-800 bg-zinc-950 p-5 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {dancer.sbd && (
                <span className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-xs font-bold text-zinc-300">
                  SBD {dancer.sbd}
                </span>
              )}
              <h2 className="truncate font-condensed text-xl font-black uppercase tracking-tight">{dancer.name}</h2>
            </div>
            <p className="mt-0.5 text-xs text-zinc-400">
              Tải 1 ảnh nửa người, rồi kéo / phóng to vòng tròn để chọn khuôn mặt làm avatar.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="rounded bg-zinc-900 p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-2">
          {genderButton('male', '♂ Nam (BBOY)')}
          {genderButton('female', '♀ Nữ (BGIRL)')}
        </div>

        {!MEDIA_URL && (
          <div className="rounded border border-amber-700 bg-amber-950/40 p-2.5 text-xs text-amber-300">
            Chưa cấu hình kho ảnh R2 (biến <code>VITE_MEDIA_URL</code>), nên chưa tải ảnh lên được. Xem HUONG-DAN-CHAY.md.
          </div>
        )}
        {errorMessage && (
          <div className="rounded border border-red-800 bg-red-950/50 p-2.5 text-xs font-semibold text-red-300">{errorMessage}</div>
        )}

        {source ? (
          <div className="space-y-2">
            <div className="relative h-80 overflow-hidden rounded border border-zinc-800 bg-zinc-900 sm:h-96">
              <Cropper
                image={source}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                initialCroppedAreaPercentages={!file && dancer.avatarCrop ? dancer.avatarCrop : undefined}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onInteractionStart={() => setCropTouched(true)}
                onCropComplete={(percent: Area) => setArea(percent)}
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <ZoomIn className="h-4 w-4 shrink-0" />
              <input
                type="range"
                min={1}
                max={4}
                step={0.05}
                value={zoom}
                onChange={(e) => {
                  setZoom(Number(e.target.value));
                  setCropTouched(true);
                }}
                className="w-full accent-amber-500"
                aria-label="Phóng to avatar"
              />
            </label>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded border border-dashed border-zinc-700 bg-zinc-900 p-6 text-center">
            <img
              src={getDancerAvatarUrl(cleared ? { gender } : { gender, avatarUrl: dancer.avatarUrl }, storageConfig.placeholders)}
              alt=""
              className="h-20 w-20 rounded-full border-2 border-zinc-700 object-cover"
            />
            <span className="text-xs text-zinc-500">
              {cleared ? 'Sẽ dùng ảnh mẫu theo giới tính' : 'Chưa có ảnh nửa người'}
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <label
            className={`flex flex-1 items-center justify-center gap-1.5 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-bold uppercase transition-colors hover:bg-zinc-700 cursor-pointer ${
              MEDIA_URL ? '' : 'pointer-events-none opacity-50'
            }`}
          >
            <Upload className="h-4 w-4" />
            {source ? 'Đổi ảnh nửa người' : 'Chọn ảnh nửa người'}
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </label>
          {(source || dancer.avatarUrl) && !cleared && (
            <button
              onClick={() => {
                setFile(null);
                setCleared(true);
              }}
              className="flex items-center gap-1.5 rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-400 transition-colors hover:text-red-400 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              Xoá ảnh
            </button>
          )}
        </div>

        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-zinc-500">
          <ImageIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Ảnh được thu nhỏ (nửa người tối đa 1080×1440, avatar 320×320) và nén WebP trên máy này trước khi tải lên R2.
        </p>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-800 pt-3">
          <button
            onClick={onClose}
            className="rounded border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-800 cursor-pointer"
          >
            Huỷ
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded bg-emerald-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isSaving ? 'Đang tải lên…' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
};
