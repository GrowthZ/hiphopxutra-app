import React from 'react';
import { ArrowRight, ListChecks, Swords, Zap } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { panelOfJudge } from '../../domain/model';
import { getJudgeAvatarUrl, DEFAULT_JUDGE_AVATAR } from '../../shared/placeholderAssets';

/** One line of the scoring guide: icon, what, how. */
const Step: React.FC<{ icon: React.ReactNode; title: string; tone?: string; children: React.ReactNode }> = ({
  icon,
  title,
  tone = 'text-amber-400',
  children,
}) => (
  <li className="flex gap-2.5">
    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/10 ${tone}`}>{icon}</span>
    <span className="min-w-0">
      <span className={`block text-xs font-black uppercase tracking-wide ${tone}`}>{title}</span>
      <span className="block text-xs leading-snug text-white/80">{children}</span>
    </span>
  </li>
);

/**
 * First screen after a judge signs in: the event logo, the judge's 1:1 avatar (uploaded and cropped by an admin),
 * a greeting, a short guide to what they score today, and one button into scoring. Fits one phone screen, no scrolling.
 */
export const JudgeWelcomeScreen: React.FC<{ onEnterPortal: () => void }> = ({ onEnterPortal }) => {
  const { activeJudge, prelimPanels, playAudioEffect } = useTournament();

  const name = activeJudge.judgeName || activeJudge.name.split('•')[1]?.trim() || activeJudge.code;
  const panel = panelOfJudge(activeJudge.id, prelimPanels);

  const start = () => {
    playAudioEffect('vote');
    onEnterPortal();
  };

  return (
    <div className="relative flex h-full flex-1 flex-col items-center overflow-hidden bg-zinc-950 px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] text-white select-none">
      {/* Stage light: amber from the top, the logo's red from below, faint diagonal texture */}
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-500/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-48 left-1/2 h-96 w-[30rem] -translate-x-1/2 rounded-full bg-red-600/25 blur-3xl" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[repeating-linear-gradient(135deg,#fff_0_2px,transparent_2px_16px)]"
      />

      <img src="/logo.png" alt="HipHop Xứ Trà U16" className="relative h-[clamp(2.75rem,8vh,4.5rem)] w-auto shrink-0" />

      <main className="relative flex min-h-0 w-full max-w-sm flex-1 flex-col items-center justify-center py-2 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/60">Xin chào giám khảo</p>

        <div className="relative mt-3 shrink-0">
          <span className="block rounded-full bg-[linear-gradient(135deg,#FDE68A,#F59E0B_45%,#B45309)] p-1 shadow-[0_0_60px_-10px_rgba(245,158,11,0.6)]">
            <img
              src={getJudgeAvatarUrl(activeJudge)}
              alt={name}
              onError={(e) => {
                e.currentTarget.src = DEFAULT_JUDGE_AVATAR;
              }}
              className="aspect-square h-[clamp(4.5rem,13vh,8rem)] w-auto rounded-full border-4 border-zinc-950 bg-zinc-800 object-cover"
            />
          </span>
          <span className="absolute bottom-[8%] right-[8%] h-4 w-4 rounded-full border-[3px] border-zinc-950 bg-emerald-500" aria-label="Online" />
        </div>

        <h1 className="mt-3 max-w-full break-words font-condensed text-[clamp(2rem,5.5vh,2.75rem)] font-black uppercase leading-none">{name}</h1>
        <p className="mt-1 font-mono text-sm font-bold tracking-wider text-amber-400">{activeJudge.code}</p>
        <p className="mt-1.5 text-[13px] leading-snug text-white/75 [@media(max-height:620px)]:hidden">
          Cảm ơn bạn đã ngồi “ghế nóng” HIPHOP XỨ TRÀ 2026. Chúc một ngày chấm thi công tâm, nhiều cảm hứng!
        </p>

        {/* How to score today: only the parts this judge does */}
        <ol className="mt-3 w-full space-y-1.5 rounded-2xl bg-white/[0.06] p-2.5 text-left ring-1 ring-white/10" aria-label="Hướng dẫn chấm điểm">
          {panel && (
            <>
              <Step icon={<ListChecks className="h-4 w-4" />} title={`Prelim · Bảng ${panel}`}>
                Menu ☰ → Prelim Pro / Prelim Newbie. Nhập 0–100, bấm Lưu để sang thí sinh kế.
              </Step>
              <Step icon={<Zap className="h-4 w-4" />} title="Tie-break" tone="text-red-400">
                Khi BTC công bố có đồng điểm ở ngưỡng Top 32: cả 8 GK chấm thêm 1 lượt.
              </Step>
            </>
          )}
          <Step icon={<Swords className="h-4 w-4" />} title="Main Battle">
            Mỗi round chạm Góc Đỏ hoặc Xanh, bấm Gửi phiếu. Sửa được tới khi BTC công bố.
          </Step>
        </ol>
      </main>

      <button
        onClick={start}
        className="relative flex w-full max-w-sm shrink-0 items-center justify-center gap-2 rounded-2xl bg-amber-500 py-4 text-base font-black uppercase tracking-wide text-zinc-950 shadow-lg shadow-amber-500/25 hover:bg-amber-400 active:scale-[0.98] transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
      >
        Vào bàn chấm điểm
        <ArrowRight className="h-5 w-5" />
      </button>
      <p className="relative mt-3 shrink-0 text-[11px] font-bold uppercase tracking-[0.2em] text-white/35 [@media(max-height:620px)]:hidden">HIPHOP XỨ TRÀ 2026</p>
    </div>
  );
};
