import React, { useMemo, useState } from 'react';
import { CheckCircle2, Cloud, CloudUpload, TriangleAlert } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { isInlineImage, MEDIA_URL, SIZES, uploadPhoto } from '../../services/media';

// R2 status + one-off migration of photos still embedded in Firestore documents (old base64 uploads).
export const MediaStoragePanel: React.FC = () => {
  const { newbieDancers, proDancers, proTeams, judges, updateDancerMedia, updateTeamPhoto, updateJudgePhotos } =
    useTournament();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Each job uploads one embedded photo and points the record at the R2 copy.
  const jobs = useMemo(() => {
    const list: { label: string; run: () => Promise<void> }[] = [];
    for (const d of [...newbieDancers, ...proDancers]) {
      if (isInlineImage(d.halfBodyUrl)) {
        list.push({
          label: `${d.name} (nửa người)`,
          run: async () =>
            updateDancerMedia(d.category, d.id, {
              halfBodyUrl: await uploadPhoto(d.halfBodyUrl!, 'dancers', `${d.id}-half`, SIZES.halfBody),
            }),
        });
      }
      if (isInlineImage(d.avatarUrl)) {
        list.push({
          label: `${d.name} (avatar)`,
          run: async () =>
            updateDancerMedia(d.category, d.id, {
              avatarUrl: await uploadPhoto(d.avatarUrl!, 'dancers', `${d.id}-avatar`, SIZES.avatar),
            }),
        });
      }
    }
    for (const t of proTeams) {
      if (isInlineImage(t.teamPhotoUrl)) {
        list.push({
          label: t.name,
          run: async () => updateTeamPhoto(t.id, await uploadPhoto(t.teamPhotoUrl!, 'teams', `team-${t.teamNumber}`)),
        });
      }
    }
    for (const j of judges) {
      if (isInlineImage(j.avatar)) {
        list.push({
          label: `${j.code} (avatar)`,
          run: async () =>
            updateJudgePhotos(j.id, { avatar: await uploadPhoto(j.avatar!, 'judges', `${j.id}-avatar`, SIZES.avatar) }),
        });
      }
      if (isInlineImage(j.fullPhotoUrl)) {
        list.push({
          label: `${j.code} (ảnh toàn thân)`,
          run: async () =>
            updateJudgePhotos(j.id, { fullPhotoUrl: await uploadPhoto(j.fullPhotoUrl!, 'judges', `${j.id}-full`) }),
        });
      }
    }
    return list;
  }, [newbieDancers, proDancers, proTeams, judges, updateDancerMedia, updateTeamPhoto, updateJudgePhotos]);

  const migrate = async () => {
    const snapshot = jobs;
    setErrors([]);
    setProgress({ done: 0, total: snapshot.length });
    for (const [i, job] of snapshot.entries()) {
      try {
        await job.run();
      } catch (err) {
        setErrors((prev) => [...prev, `${job.label}: ${err instanceof Error ? err.message : String(err)}`]);
      }
      setProgress({ done: i + 1, total: snapshot.length });
    }
  };

  const running = progress !== null && progress.done < progress.total;

  return (
    <div className="space-y-3 text-xs">
      <div className="space-y-1.5 rounded border border-zinc-800 bg-zinc-900 p-3">
        <div className="flex items-center gap-2 font-bold uppercase tracking-wide text-zinc-200">
          <Cloud className="h-4 w-4 text-amber-400" />
          Cloudflare R2 qua Worker ảnh
        </div>
        {MEDIA_URL ? (
          <p className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="break-all font-mono">{MEDIA_URL}</span>
          </p>
        ) : (
          <p className="flex items-start gap-1.5 text-amber-300">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            Chưa cấu hình. Deploy Worker trong thư mục <code>worker/</code> rồi đặt <code>VITE_MEDIA_URL</code> khi build
            (xem HUONG-DAN-CHAY.md).
          </p>
        )}
        <p className="leading-relaxed text-zinc-400">
          Ảnh được thu nhỏ và nén WebP ngay trên máy admin, rồi lưu trên R2. Firestore chỉ giữ đường link, nên khán giả
          tải nhanh; ảnh được cache 1 năm ở trình duyệt và CDN Cloudflare.
        </p>
      </div>

      <div className="space-y-2 rounded border border-zinc-800 bg-zinc-900 p-3">
        <div className="font-bold uppercase tracking-wide text-zinc-200">Ảnh cũ còn nằm trong dữ liệu</div>
        {jobs.length === 0 && !progress ? (
          <p className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Không còn ảnh nào cần chuyển.
          </p>
        ) : (
          <>
            <p className="text-zinc-400">
              {jobs.length} ảnh (thí sinh, đội, giám khảo) đang lưu thẳng trong Firestore, làm khán giả tải chậm.
            </p>
            <button
              onClick={migrate}
              disabled={!MEDIA_URL || running || jobs.length === 0}
              className="flex items-center gap-1.5 rounded bg-amber-500 px-3 py-2 font-bold text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
            >
              <CloudUpload className="h-4 w-4" />
              {running ? `Đang chuyển ${progress.done}/${progress.total}…` : `Chuyển ${jobs.length} ảnh lên R2`}
            </button>
          </>
        )}
        {progress && !running && (
          <p className="text-zinc-300">
            Xong {progress.total - errors.length}/{progress.total} ảnh.
          </p>
        )}
        {errors.length > 0 && (
          <ul className="max-h-32 list-disc space-y-0.5 overflow-y-auto pl-4 text-red-300">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
