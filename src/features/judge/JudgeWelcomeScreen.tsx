import React from 'react';
import { useTournament } from '../../state/TournamentContext';
import { Judge } from '../../domain/types';
import {
  Trophy,
  ShieldCheck,
  Camera,
  ArrowRight,
  Radio,
  Sliders,
  Users,
  CheckCircle2,
  Swords,
  ChevronRight,
  Tv,
} from 'lucide-react';
import {
  getJudgeAvatarUrl,
  getJudgeFullPhotoUrl,
  DEFAULT_JUDGE_AVATAR,
  DEFAULT_JUDGE_FULL,
} from '../../shared/placeholderAssets';

interface JudgeWelcomeScreenProps {
  onEnterPortal: () => void;
  onOpenConfig: (judgeId?: string) => void;
}

export const JudgeWelcomeScreen: React.FC<JudgeWelcomeScreenProps> = ({
  onEnterPortal,
  onOpenConfig,
}) => {
  const {
    judges,
    selectedJudgeId,
    setSelectedJudgeId,
    activeJudge,
    playAudioEffect,
    setActiveView,
    judgeAccountId,
  } = useTournament();

  const handleSelectJudge = (id: string) => {
    setSelectedJudgeId(id);
    playAudioEffect('tick');
  };

  const handleStart = () => {
    playAudioEffect('vote');
    onEnterPortal();
  };

  const judgeShortName =
    activeJudge.judgeName || activeJudge.name.split('•')[1]?.trim() || activeJudge.code;

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col items-center justify-between p-3 sm:p-6 font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Brand Header */}
      <div className="w-full max-w-2xl flex items-center justify-between py-2 border-b border-zinc-200 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-amber-500 text-zinc-950 flex items-center justify-center font-black">
            <Trophy className="w-4 h-4 text-black" />
          </div>
          <div>
            <div className="font-condensed font-black text-lg text-zinc-900 uppercase tracking-wider leading-none">
              HIPHOP XỨ TRÀ 2026
            </div>
            <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
              U16 BREAKING CHAMPIONSHIP · WDSF SYSTEM
            </div>
          </div>
        </div>

        <button
          onClick={() => setActiveView('prelim')}
          className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
        >
          <span>Về Bảng Điều Hành</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Welcome Hero */}
      <div className="w-full max-w-2xl my-auto py-6 space-y-6">
        {/* Welcome Card */}
        <div className="relative rounded-2xl bg-gradient-to-b from-white via-white to-zinc-50 border border-zinc-200 p-5 sm:p-7 shadow-sm overflow-hidden">
          {/* Subtle gold ambient glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header Tag */}
          <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-600 border border-amber-300 text-[11px] font-mono font-black tracking-wider uppercase">
                CỔNG GIÁM KHẢO ĐIỆN TỬ
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>ONLINE</span>
              </span>
            </div>

            {/* Quick Switch Judge Profile */}
            <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-lg px-2.5 py-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold">GK:</span>
              <select
                value={selectedJudgeId}
                onChange={(e) => handleSelectJudge(e.target.value)}
                disabled={Boolean(judgeAccountId)}
                className="bg-transparent text-xs font-black text-amber-600 outline-none cursor-pointer disabled:cursor-default"
              >
                {judges.map((j) => (
                  <option key={j.id} value={j.id} className="bg-zinc-50 text-zinc-900">
                    {j.code} • {j.judgeName || j.name.split('•')[1]?.trim() || j.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Judge Visual Showcase: Displays BOTH Photos (Full Photo + Avatar) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            {/* Left: Full Photo Frame (Ảnh Full Toàn Thân / Poster) */}
            <div className="sm:col-span-5 flex flex-col items-center">
              <div className="relative w-44 sm:w-full max-w-[200px] aspect-[3/4] rounded-xl overflow-hidden border-2 border-amber-500/60 shadow-2xl bg-zinc-950 group">
                <img
                  src={getJudgeFullPhotoUrl(activeJudge)}
                  alt={`Full photo of ${activeJudge.name}`}
                  className="w-full h-full object-cover object-top filter brightness-105 contrast-105 group-hover:scale-102 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_JUDGE_FULL;
                  }}
                />

                {/* Corner Code Tag */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-zinc-950/90 text-amber-400 border border-amber-500/50 font-mono font-black text-[10px] shadow">
                  {activeJudge.code}
                </div>

                {/* Bottom Overlay Label */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2.5 text-center">
                  <div className="text-[9px] font-mono font-bold text-amber-400/90 uppercase tracking-widest">
                    ẢNH FULL TOÀN THÂN
                  </div>
                  <div className="font-condensed font-black text-white text-sm uppercase tracking-wide truncate">
                    {judgeShortName}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Greetings & Avatar Badge + Briefing */}
            <div className="sm:col-span-7 space-y-4">
              <div className="flex items-center gap-3">
                {/* Avatar Photo Frame (Ảnh Avatar Cận Mặt) */}
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-amber-500 shadow-xl bg-zinc-50 shrink-0">
                  <img
                    src={getJudgeAvatarUrl(activeJudge)}
                    alt={`Avatar of ${activeJudge.name}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_JUDGE_AVATAR;
                    }}
                  />
                  <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
                </div>

                <div>
                  <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                    XIN CHÀO GIÁM KHẢO
                  </div>
                  <h1 className="font-condensed font-black text-2xl sm:text-3xl text-zinc-900 uppercase tracking-tight leading-tight">
                    {judgeShortName}
                  </h1>
                  <div className="text-xs font-mono text-amber-600 font-bold">
                    {activeJudge.code} · HỘI ĐỒNG TRỌNG TÀI
                  </div>
                </div>
              </div>

              <p className="text-xs text-zinc-700 leading-relaxed">
                Chào mừng bạn tham gia Hội đồng Giám khảo chính thức tại giải đấu{' '}
                <strong className="text-amber-600 font-semibold">Hiphop Xứ Trà 2026</strong>. Thiết bị này
                được thiết lập riêng cho vị trí của bạn để biểu quyết các lượt đấu trực tiếp.
              </p>

              {/* Quick Rule Briefing */}
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1.5 text-xs text-zinc-700">
                <div className="flex items-center gap-2 font-bold text-zinc-900 text-[11px] uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>QUY TRÌNH CHẤM ĐIỂM:</span>
                </div>
                <ul className="space-y-1 text-[11px] text-zinc-500 font-medium">
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>
                      <strong>9 Giám khảo:</strong> Mỗi round chỉ chọn <span className="text-red-400 font-bold">ĐỎ</span> hoặc <span className="text-blue-400 font-bold">XANH</span> thắng (không hòa).
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>
                      <strong>Trực tiếp & Bảo mật:</strong> Kết quả được truyền bảo mật lên Màn LED Sân khấu.
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>
                      <strong>Vòng Prelim:</strong> Chấm điểm kỹ thuật 0–100 cho từng bài biểu diễn.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Upload 2 Photos Button (organizers only: judge accounts can't write judge profiles) */}
              {!judgeAccountId && (
                <button
                  onClick={() => onOpenConfig(activeJudge.id)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 text-xs font-bold border border-zinc-300 transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-600" />
                  <span>Cấu hình 2 ảnh Giám khảo (Ảnh Full & Avatar)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Primary CTA: Enter Scoring Portal */}
        <div className="space-y-3">
          <button
            onClick={handleStart}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black text-base uppercase tracking-wider shadow-xl shadow-amber-500/20 active:scale-98 transition-all cursor-pointer"
          >
            <span>VÀO BÀN CHẤM ĐIỂM NGAY ({activeJudge.code})</span>
            <ArrowRight className="w-5 h-5 text-black" />
          </button>

          {/* Quick Switch Judge Profile Grid */}
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
            <div className="text-[10px] font-mono text-zinc-500 font-bold uppercase mb-2 text-center">
              HOẶC ĐỔI TÀI KHOẢN GIÁM KHẢO KHÁC (9 GIÁM KHẢO):
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5">
              {judges.map((j) => {
                const isSelected = j.id === activeJudge.id;
                const short = j.judgeName || j.name.split('•')[1]?.trim() || j.code;
                return (
                  <button
                    key={j.id}
                    onClick={() => handleSelectJudge(j.id)}
                    className={`p-1.5 rounded-lg text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-zinc-950 font-black shadow-md ring-1 ring-amber-300'
                        : 'bg-zinc-50 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 border border-zinc-200'
                    }`}
                  >
                    <div className="font-mono text-[9px] opacity-75">{j.code}</div>
                    <div className="font-condensed font-bold text-xs truncate uppercase mt-0.5">
                      {short}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="w-full max-w-2xl text-center py-2 text-[11px] text-zinc-500 font-mono shrink-0">
        HIPHOP XỨ TRÀ 2026 · HỆ THỐNG ĐIỀU HÀNH & CHẤM ĐIỂM OLYMPIC WDSF
      </div>
    </div>
  );
};
