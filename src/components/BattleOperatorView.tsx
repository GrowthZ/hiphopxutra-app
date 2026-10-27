import React from 'react';
import { useTournament } from '../context/TournamentContext';
import {
  Swords,
  RotateCcw,
  Tv,
  CheckCircle2,
  ArrowRight,
  Trophy,
  Eye,
  Zap,
  Award,
} from 'lucide-react';

import {
  getTeamPhotoUrl,
  getDancerAvatarUrl,
  stripBreakerPrefix,
} from '../utils/placeholderAssets';
import { useOnlineJudgeIds } from '../hooks/useJudgePresence';

export const BattleOperatorView: React.FC = () => {
  const {
    matches,
    activeMatchId,
    setActiveMatchId,
    judges,
    submitJudgeVote,
    confirmRoundResult,
    revealAllRounds,
    declareMatchWinner,
    triggerVictoryAnimation,
    triggerTeamEntrance,
    advanceToNextRound,
    addTieBreakRound,
    resetMatch,
    setActiveView,
    playAudioEffect,
    storageConfig,
  } = useTournament();
  const onlineJudgeIds = useOnlineJudgeIds();

  const [selectedRoundNum, setSelectedRoundNum] = React.useState<number | null>(null);

  const match = matches.find((m) => m.id === activeMatchId) || matches[0];
  const activeRoundNum = selectedRoundNum ?? (match?.currentRound || 1);
  const currentRound = match?.rounds.find((r) => r.roundNumber === activeRoundNum) || match?.rounds[0];

  React.useEffect(() => {
    setSelectedRoundNum(null);
  }, [match?.id]);

  if (!match) return <div className="p-8 text-center text-zinc-500">Không tìm thấy trận đấu</div>;

  const totalVotesCount = Object.keys(currentRound?.votes || {}).length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
              BÀN ĐIỀU HÀNH BATTLE (MC / DJ)
            </span>
            <span className="text-xs text-zinc-500 font-medium">9 Giám Khảo Chấm Trực Tiếp</span>
          </div>
          <h1 className="font-condensed font-black text-2xl sm:text-3xl text-zinc-900 tracking-tight mt-1 uppercase">
            Điều hành trận đối kháng trực tiếp
          </h1>
        </div>

        {/* Match Quick Selector */}
        <div className="flex items-center gap-2">
          <select
            value={match.id}
            onChange={(e) => setActiveMatchId(e.target.value)}
            className="bg-white border border-zinc-300 text-zinc-900 text-xs font-bold rounded px-3 py-2 outline-none cursor-pointer shadow-xs"
          >
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.category === 'pro_2v2' ? 'PRO 2v2' : 'NEWBIE 1v1'} • {m.stageName} • Trận {m.matchNumber} ({m.sideRed.name} vs {m.sideBlue.name})
              </option>
            ))}
          </select>

          <button
            onClick={() => setActiveView('stage_control')}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Xem Màn LED Sân Khấu</span>
          </button>
        </div>
      </div>

      {/* Main Console Panel (Dark Sports Terminal) */}
      <div className="bg-zinc-950 text-white rounded p-5 border border-zinc-800 shadow-sm space-y-5">
        {/* Match Metadata Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-3">
          <div>
            <div className="text-[11px] font-mono text-zinc-400 font-bold tracking-wider uppercase">
              {match.category === 'pro_2v2' ? 'HẠNG MỤC PRO 2VS2' : 'HẠNG MỤC NEWBIE 1VS1'}
            </div>
            <div className="font-condensed font-black text-2xl text-white mt-0.5 uppercase">
              {match.stageName} · Trận {String(match.matchNumber).padStart(2, '0')}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded font-condensed font-black text-xs tracking-widest uppercase border ${
              currentRound?.isTieBreak
                ? 'bg-amber-950 text-amber-300 border-amber-500 animate-pulse'
                : 'bg-zinc-900 text-white border-zinc-700'
            }`}>
              {currentRound?.isTieBreak ? `ROUND TIE-BREAK (HIỆP PHỤ)` : `ĐANG XEM: ROUND ${activeRoundNum} / ${match.totalRoundsRequired}`}
            </span>
          </div>
        </div>

        {/* Round Selector Tabs for Admin */}
        <div className="flex items-center gap-2 p-1.5 bg-zinc-900/90 border border-zinc-800 rounded-lg overflow-x-auto">
          <span className="text-[11px] font-mono font-bold text-zinc-400 px-2 shrink-0">CHỌN ROUND ĐIỀU HÀNH:</span>
          {match.rounds.map((r) => {
            const isSelected = r.roundNumber === activeRoundNum;
            const votesCount = Object.keys(r.votes).length;
            const isRev = r.isConfirmed || r.isRevealed;

            return (
              <button
                key={r.roundNumber}
                onClick={() => setSelectedRoundNum(r.roundNumber)}
                className={`px-3 py-1.5 rounded font-condensed font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
                  isSelected
                    ? r.isTieBreak
                      ? 'bg-amber-500 text-black shadow-md ring-2 ring-amber-400'
                      : 'bg-white text-black shadow-md ring-2 ring-white/50'
                    : r.isTieBreak
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-600/70 hover:bg-amber-900'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <span>{r.isTieBreak ? '⚡ TIE-BREAK' : `ROUND ${r.roundNumber}`}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  isRev
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : votesCount >= 9
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-700 text-zinc-300'
                }`}>
                  {isRev ? (r.winner === 'red' ? 'ĐỎ THẮNG' : r.winner === 'blue' ? 'XANH THẮNG' : 'HÒA') : `${votesCount}/9 GK`}
                </span>
              </button>
            );
          })}
        </div>

        {/* 2 Corners Split Score */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {/* GÓC ĐỎ */}
          <div className="bg-zinc-900 border border-red-600/70 rounded p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={
                  match.category === 'pro_2v2'
                    ? getTeamPhotoUrl(match.sideRed, storageConfig.placeholders)
                    : getDancerAvatarUrl(match.sideRed.dancers[0], storageConfig.placeholders)
                }
                alt={match.sideRed.name}
                className="w-14 h-14 rounded object-cover border-2 border-red-600 shrink-0"
              />
              <div className="space-y-0.5">
                <span className="text-[10px] font-condensed font-black text-red-400 uppercase tracking-widest">
                  GÓC ĐỎ • RED CORNER
                </span>
                <div className="font-condensed font-black text-2xl text-white uppercase leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                  {match.sideRed.dancers.map((d) => stripBreakerPrefix(d.name)).join(' & ') || stripBreakerPrefix(match.sideRed.name)}
                </div>
                <div className="text-xs text-red-300 font-bold uppercase whitespace-nowrap overflow-hidden text-ellipsis">
                  {match.category === 'pro_2v2'
                    ? match.sideRed.name
                    : match.sideRed.dancers[0]?.crew || 'Thí sinh tự do'} · {match.sideRed.sbdText}
                </div>
              </div>
            </div>
            <div className="w-16 h-16 rounded bg-red-600 flex items-center justify-center font-condensed font-black text-4xl text-white shadow-sm shrink-0 tabular-nums">
              {match.roundWinsRed}
            </div>
          </div>

          {/* GÓC XANH */}
          <div className="bg-zinc-900 border border-blue-600/70 rounded p-4 flex items-center justify-between gap-4">
            <div className="w-16 h-16 rounded bg-blue-600 flex items-center justify-center font-condensed font-black text-4xl text-white shadow-sm shrink-0 tabular-nums">
              {match.roundWinsBlue}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right space-y-0.5 min-w-0">
                <span className="text-[10px] font-condensed font-black text-blue-400 uppercase tracking-widest">
                  BLUE CORNER • GÓC XANH
                </span>
                <div className="font-condensed font-black text-2xl text-white uppercase leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                  {match.sideBlue.dancers.map((d) => stripBreakerPrefix(d.name)).join(' & ') || stripBreakerPrefix(match.sideBlue.name)}
                </div>
                <div className="text-xs text-blue-300 font-bold uppercase whitespace-nowrap overflow-hidden text-ellipsis">
                  {match.category === 'pro_2v2'
                    ? match.sideBlue.name
                    : match.sideBlue.dancers[0]?.crew || 'Thí sinh tự do'} · {match.sideBlue.sbdText}
                </div>
              </div>
              <img
                src={
                  match.category === 'pro_2v2'
                    ? getTeamPhotoUrl(match.sideBlue, storageConfig.placeholders)
                    : getDancerAvatarUrl(match.sideBlue.dancers[0], storageConfig.placeholders)
                }
                alt={match.sideBlue.name}
                className="w-14 h-14 rounded object-cover border-2 border-blue-600 shrink-0"
              />
            </div>
          </div>
        </div>

        {/* Quick Entrance & Stage Visual Cues */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="font-bold text-amber-300 uppercase tracking-wider font-mono text-[11px]">
              ĐIỀU PHỐI MÀN LED SÂN KHẤU:
            </span>
            <span className="text-zinc-400 text-xs hidden sm:inline">
              Hiệu ứng 2 team lướt từ 2 bên ngoài vào sân kèm âm thanh va chạm VS
            </span>
          </div>

          <button
            onClick={() => triggerTeamEntrance(match.id)}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 via-amber-500 to-blue-600 hover:brightness-110 text-white font-condensed font-black text-xs uppercase tracking-wider shadow-md flex items-center gap-2 transition-all transform hover:scale-102 active:scale-98 cursor-pointer shrink-0"
            title="Kích hoạt hiệu ứng 2 team ra sân từ ngoài vào trên Màn LED"
          >
            <Swords className="w-4 h-4 text-amber-300" />
            <span>🎬 HIỆU ỨNG RA SÂN (2 TEAM TỪ NGOÀI VÀO)</span>
          </button>
        </div>

        {/* =========================================================================
            ADMIN BROADCAST ANNOUNCEMENT CENTER (ĐIỀU HÀNH CÔNG BỐ KẾT QUẢ LÊN MÀN LED)
            - Màn LED sân khấu không có nút tương tác (chỉ phát sóng).
            - Mọi lệnh công bố được thực hiện tại đây bởi Admin!
            ========================================================================= */}
        {(() => {
          const tieBreakRound = match.rounds.find((r) => r.isTieBreak);
          const regRounds = match.rounds.filter((r) => !r.isTieBreak);
          const hasUnrevealedReg = regRounds.some((r) => !r.isRevealed && !r.isConfirmed);
          const allRegVoted = regRounds.length > 0 && regRounds.every((r) => Object.keys(r.votes).length >= 9);
          const isTieBreakUnrevealed = tieBreakRound && !tieBreakRound.isRevealed && !tieBreakRound.isConfirmed;

          return (
            <div className="space-y-3">
              {/* Notice Banner to Admin */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs px-3.5 py-2.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium gap-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${hasUnrevealedReg || isTieBreakUnrevealed ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`} />
                  <span>
                    <strong>Trạng thái Màn LED:</strong>{' '}
                    {hasUnrevealedReg || isTieBreakUnrevealed ? (
                      <span className="text-emerald-400 font-bold">Đang hiển thị Ô XANH LÁ TÍCH ✓ (BẢO MẬT PHIẾU BẦU)</span>
                    ) : (
                      <span className="text-sky-300 font-bold">Đã công bố màu ĐỎ / XANH của Giám khảo</span>
                    )}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 italic">
                  * Màn LED sân khấu chỉ hiển thị kết quả, không có nút bấm tương tác.
                </span>
              </div>

              {/* ACTION 1: CÔNG BỐ KẾT QUẢ CẢ 2 ROUND LÊN MÀN LED */}
              {hasUnrevealedReg && allRegVoted && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/25 via-amber-400/35 to-amber-500/25 border-2 border-amber-400 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                  <div className="space-y-1">
                    <div className="font-condensed font-black text-xl text-amber-300 uppercase flex items-center gap-2">
                      <Eye className="w-6 h-6 text-amber-300" />
                      <span>CẢ 2 ROUND ĐÃ ĐỦ 9/9 PHIẾU BẦU · SẴN SÀNG CÔNG BỐ</span>
                    </div>
                    <div className="text-xs text-zinc-200">
                      Ấn nút công bố để màn LED đồng loạt hiển thị màu sắc 9 Giám Khảo. Nếu hòa 1 - 1, hệ thống sẽ tự động xuất hiện dòng Round Tie-Break.
                    </div>
                  </div>

                  <button
                    onClick={() => revealAllRounds(match.id)}
                    className="px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-condensed font-black text-base uppercase tracking-wider shadow-[0_0_25px_rgba(251,191,36,0.9)] border-2 border-white cursor-pointer flex items-center gap-2 transition-all transform hover:scale-102 active:scale-98 shrink-0 animate-pulse"
                  >
                    <Eye className="w-5 h-5 text-black" />
                    <span>📢 ADMIN CÔNG BỐ KẾT QUẢ CẢ 2 ROUNDS LÊN MÀN LED</span>
                  </button>
                </div>
              )}

              {/* ACTION 2: CÔNG BỐ KẾT QUẢ HIỆP PHỤ TIE-BREAK */}
              {isTieBreakUnrevealed && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-red-600/30 via-amber-500/35 to-red-600/30 border-2 border-amber-400 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                  <div className="space-y-1">
                    <div className="font-condensed font-black text-xl text-amber-300 uppercase flex items-center gap-2">
                      <Zap className="w-6 h-6 text-amber-300 fill-amber-300" />
                      <span>ROUND TIE-BREAK (HIỆP PHỤ): {Object.keys(tieBreakRound.votes).length}/9 GK ĐÃ NỘP</span>
                    </div>
                    <div className="text-xs text-zinc-200">
                      Trận đấu hòa {match.roundWinsRed} - {match.roundWinsBlue}. Sau khi các giám khảo chấm xong Tie-Break, Admin ấn công bố để trao cúp chiến thắng!
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {Object.keys(tieBreakRound.votes).length < 9 && (
                      <button
                        onClick={() => {
                          const sampleVotes: Record<string, 'red' | 'blue'> = {
                            'gk-1': 'red', 'gk-2': 'blue', 'gk-3': 'red', 'gk-4': 'blue',
                            'gk-5': 'red', 'gk-6': 'red', 'gk-7': 'blue', 'gk-8': 'red', 'gk-9': 'blue',
                          };
                          judges.forEach((j) => {
                            submitJudgeVote(match.id, tieBreakRound.roundNumber, j.id, sampleVotes[j.id]);
                          });
                        }}
                        className="px-3.5 py-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400 text-amber-300 text-xs font-mono font-bold cursor-pointer transition-colors"
                      >
                        + Mô phỏng 9 GK nộp phiếu Tie-Break
                      </button>
                    )}

                    <button
                      onClick={() => confirmRoundResult(match.id, tieBreakRound.roundNumber)}
                      className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:brightness-110 text-white font-condensed font-black text-base uppercase tracking-wider shadow-[0_0_25px_rgba(239,68,68,0.9)] border-2 border-amber-300 cursor-pointer flex items-center gap-2 transition-all transform hover:scale-102 active:scale-98 animate-pulse"
                    >
                      <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                      <span>⚡ ADMIN CÔNG BỐ KẾT QUẢ TIE-BREAK LÊN MÀN LED</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* =========================================================================
            ADMIN VICTORY CONTROLS: CHỌN NGƯỜI THẮNG & KÍCH HOẠT HOẠT ẢNH MÀN LED
            ========================================================================= */}
        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-amber-500/70 space-y-3 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span className="font-condensed font-black text-base uppercase text-white tracking-wide">
                ĐIỀU HÀNH KẾT QUẢ CHUNG CUỘC & KÍCH HOẠT HIỆU ỨNG CHIẾN THẮNG (MÀN LED)
              </span>
            </div>
            {match.status === 'finished' ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-bold text-xs uppercase flex items-center gap-1.5 self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5" />
                ĐÃ CHỌN THẮNG: {match.winnerSide === 'red' ? match.sideRed.name : match.sideBlue.name}
              </span>
            ) : (
              <span className="text-[11px] text-zinc-400 font-mono italic">
                * Tự động bật pháo hoa, âm thanh fanfare & khung vinh danh trên Màn LED
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* GÓC ĐỎ WINNER BUTTON */}
            <button
              onClick={() => declareMatchWinner(match.id, 'red')}
              className={`p-3.5 rounded-xl border-2 flex items-center justify-between gap-3 text-left transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-md ${
                match.status === 'finished' && match.winnerSide === 'red'
                  ? 'bg-red-600/30 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] ring-2 ring-red-400'
                  : 'bg-zinc-800/80 hover:bg-red-950/60 border-red-600/60 text-zinc-200 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center font-condensed font-black text-xl text-white shrink-0">
                  ĐỎ
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-mono text-red-400 uppercase font-black tracking-wider">
                    GÓC ĐỎ • RED CORNER
                  </div>
                  <div className="font-condensed font-black text-lg text-white uppercase whitespace-nowrap overflow-hidden text-ellipsis">
                    {stripBreakerPrefix(match.sideRed.name)}
                  </div>
                  <div className="text-xs text-zinc-400">
                    Tỉ số hiện tại: {match.roundWinsRed} rounds thắng
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-condensed font-black text-xs uppercase tracking-wider">
                <Trophy className="w-4 h-4 text-amber-300" />
                <span>CHỌN THẮNG</span>
              </div>
            </button>

            {/* GÓC XANH WINNER BUTTON */}
            <button
              onClick={() => declareMatchWinner(match.id, 'blue')}
              className={`p-3.5 rounded-xl border-2 flex items-center justify-between gap-3 text-left transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-md ${
                match.status === 'finished' && match.winnerSide === 'blue'
                  ? 'bg-blue-600/30 border-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] ring-2 ring-blue-400'
                  : 'bg-zinc-800/80 hover:bg-blue-950/60 border-blue-600/60 text-zinc-200 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-condensed font-black text-xl text-white shrink-0">
                  XANH
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-mono text-blue-400 uppercase font-black tracking-wider">
                    GÓC XANH • BLUE CORNER
                  </div>
                  <div className="font-condensed font-black text-lg text-white uppercase whitespace-nowrap overflow-hidden text-ellipsis">
                    {stripBreakerPrefix(match.sideBlue.name)}
                  </div>
                  <div className="text-xs text-zinc-400">
                    Tỉ số hiện tại: {match.roundWinsBlue} rounds thắng
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-condensed font-black text-xs uppercase tracking-wider">
                <Trophy className="w-4 h-4 text-amber-300" />
                <span>CHỌN THẮNG</span>
              </div>
            </button>
          </div>

          {/* Quick trigger replay button for stage LED screen */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80">
            <span className="text-xs text-zinc-400">
              {match.status === 'finished'
                ? `Đã chọn người chiến thắng: ${match.winnerSide === 'red' ? match.sideRed.name : match.sideBlue.name}`
                : 'Chưa chốt người thắng chung cuộc. Có thể chọn ngay hoặc chờ chấm hết các round.'}
            </span>

            <button
              onClick={() => triggerVictoryAnimation(match.id)}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-black font-condensed font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer transition-transform hover:scale-102 active:scale-98"
            >
              <Trophy className="w-4 h-4 text-black" />
              <span>KÍCH HOẠT LẠI HOẠT ẢNH CHIẾN THẮNG (MÀN LED)</span>
            </button>
          </div>
        </div>

        {/* Live Status of 9 Judges for Active Round */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <div className="font-bold text-zinc-300 flex items-center gap-2">
              <span>Trạng thái nhận phiếu 9 Giám khảo ({currentRound?.isTieBreak ? 'Hiệp phụ Tie-Break' : `Round ${activeRoundNum}`})</span>
              <span className="font-mono text-xs font-bold text-emerald-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-700">
                {totalVotesCount} / 9 đã gửi
              </span>
            </div>
            <div className="text-[11px] text-zinc-400">
              Quy tắc: từ 5/9 phiếu sẽ thắng round (không hòa round). Nếu hòa 1 - 1 sau 2 round sẽ đấu Tie-break.
            </div>
          </div>

          {/* 9 Judges vote cards */}
          <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
            {judges.map((j) => {
              const vote = currentRound?.votes[j.id];

              return (
                <div
                  key={j.id}
                  className={`p-2 rounded border text-center transition-colors ${
                    vote === 'red'
                      ? 'bg-red-950/60 border-red-600 text-white'
                      : vote === 'blue'
                      ? 'bg-blue-950/60 border-blue-600 text-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 text-[11px] font-mono font-bold truncate text-amber-400">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${onlineJudgeIds.has(j.id) ? 'bg-emerald-400' : 'bg-zinc-600'}`}
                      title={onlineJudgeIds.has(j.id) ? 'Giám khảo đang online' : 'Giám khảo offline'}
                    />
                    {j.code}
                  </div>
                  <div className="text-[10px] text-zinc-300 font-bold truncate uppercase">{j.judgeName || j.name.split('•')[1]?.trim() || j.code}</div>
                  <div className="font-condensed font-black text-sm mt-0.5 uppercase">
                    {vote === 'red' ? (
                      <span className="text-red-400">ĐỎ</span>
                    ) : vote === 'blue' ? (
                      <span className="text-blue-400">XANH</span>
                    ) : (
                      <span className="text-zinc-500 font-sans text-xs">Chờ...</span>
                    )}
                  </div>
                  {/* Operator manual override buttons */}
                  <div className="flex justify-center gap-1 mt-1 pt-1 border-t border-zinc-800">
                    <button
                      onClick={() => submitJudgeVote(match.id, activeRoundNum, j.id, 'red')}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-red-800 hover:bg-red-700 text-white font-bold cursor-pointer"
                      title="Gán phiếu ĐỎ"
                    >
                      Đ
                    </button>
                    <button
                      onClick={() => submitJudgeVote(match.id, activeRoundNum, j.id, 'blue')}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-blue-800 hover:bg-blue-700 text-white font-bold cursor-pointer"
                      title="Gán phiếu XANH"
                    >
                      X
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Round Tally & Control Actions */}
        <div className="p-3.5 bg-zinc-900 rounded border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div>
              Phiếu Đỏ: <span className="font-condensed font-black text-red-400 text-base tabular-nums">{currentRound?.redVotesCount || 0}</span>
            </div>
            <div>
              Phiếu Xanh: <span className="font-condensed font-black text-blue-400 text-base tabular-nums">{currentRound?.blueVotesCount || 0}</span>
            </div>
            {currentRound?.isConfirmed ? (
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold text-[11px] border border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Đã chốt {currentRound?.isTieBreak ? 'Tie-Break' : `Round ${activeRoundNum}`}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-bold text-[11px]">
                Chưa công bố ({totalVotesCount}/9 GK)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!currentRound?.isConfirmed ? (
              <button
                onClick={() => confirmRoundResult(match.id, activeRoundNum)}
                className="px-4 py-2 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Công Bố & Xác Nhận {currentRound?.isTieBreak ? 'Tie-Break' : `Round ${activeRoundNum}`} Lên Màn LED</span>
              </button>
            ) : match.status !== 'finished' ? (
              <button
                onClick={() => advanceToNextRound(match.id)}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Chuyển Sang Round Tiếp Theo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-700">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Thắng: {match.winnerSide === 'red' ? match.sideRed.name : match.sideBlue.name}</span>
                </div>
                <button
                  onClick={() => triggerVictoryAnimation(match.id)}
                  className="px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 text-black font-condensed font-black text-xs uppercase flex items-center gap-1 cursor-pointer shadow transition-transform hover:scale-105 active:scale-95"
                  title="Kích hoạt lại hoạt ảnh chiến thắng trên Màn LED"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>Màn LED</span>
                </button>
              </div>
            )}

            {/* Tie-Break Round Button for Operator */}
            {(match.roundWinsRed === match.roundWinsBlue || match.rounds.some((r) => r.isTieBreak)) && (
              <button
                onClick={() => addTieBreakRound(match.id)}
                className="px-3 py-2 rounded bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 shadow-md"
                title="Kích hoạt thêm hiệp phụ Tie-break"
              >
                <span>⚡ Thêm Tie-Break</span>
              </button>
            )}

            <button
              onClick={() => {
                if (window.confirm('Đặt lại tỉ số trận đấu này về 0-0?')) {
                  resetMatch(match.id);
                }
              }}
              className="p-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Đặt lại trận đấu về 0-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* DJ & MC Quick Audio Deck */}
        <div className="pt-2 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-zinc-400 text-[11px] font-bold uppercase tracking-wider">
            Âm thanh MC & DJ:
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => playAudioEffect('airhorn')}
              className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
            >
              🎺 Airhorn
            </button>
            <button
              onClick={() => playAudioEffect('roundWin')}
              className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
            >
              🥊 Cồng Thắng Round
            </button>
            <button
              onClick={() => playAudioEffect('champion')}
              className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
            >
              🏆 Kèn Vô Địch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
