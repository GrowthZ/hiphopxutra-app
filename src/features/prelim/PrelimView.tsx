import React, { useState } from 'react';
import { useTournament } from '../../state/TournamentContext';
import { Dancer } from '../../domain/types';
import {
  Upload,
  CheckCircle2,
  Users,
  FileCheck2,
  ArrowRight,
  Filter,
  Download,
  AlertTriangle,
  Award,
  Trophy,
  Camera,
  Eye,
  Zap,
} from 'lucide-react';
import { exportToCSV, downloadCSV } from '../../services/googleSheets';
import { DancerPhotoUploadModal } from '../dancers/DancerPhotoUploadModal';
import { BankingScoreKeypadModal } from './BankingScoreKeypadModal';
import { getDancerAvatarUrl } from '../../shared/placeholderAssets';

export const PrelimView: React.FC = () => {
  const {
    activeCategory,
    setActiveCategory,
    newbieDancers,
    proDancers,
    prelimJudges,
    updatePrelimScore,
    isNewbieTop32Locked,
    isProTop32Locked,
    lockTop32,
    setActiveView,
    syncWithGoogleSheet,
    sheetConfig,
    storageConfig,
  } = useTournament();

  const [filterMode, setFilterMode] = useState<'cutoff' | 'all'>('cutoff');
  const [selectedDancerForPhoto, setSelectedDancerForPhoto] = useState<Dancer | null>(null);

  // Banking-style numeric keypad target state
  const [keypadTarget, setKeypadTarget] = useState<{ dancerId: string; judgeId: string } | null>(null);

  const currentDancers = activeCategory === 'newbie_1v1' ? newbieDancers : proDancers;
  const isLocked = activeCategory === 'newbie_1v1' ? isNewbieTop32Locked : isProTop32Locked;

  const targetDancer = keypadTarget
    ? currentDancers.find((d) => d.id === keypadTarget.dancerId) || null
    : null;
  const targetJudge = keypadTarget
    ? prelimJudges.find((j) => j.id === keypadTarget.judgeId) || null
    : null;
  const currentCellScore =
    targetDancer && targetJudge ? targetDancer.prelimScores[targetJudge.id] ?? 80 : 80;

  const handleOpenKeypad = (dancerId: string, judgeId: string) => {
    setKeypadTarget({ dancerId, judgeId });
  };

  const handleSaveKeypadScore = (score: number) => {
    if (keypadTarget) {
      updatePrelimScore(activeCategory, keypadTarget.dancerId, keypadTarget.judgeId, score);
    }
    setKeypadTarget(null);
  };

  const handleSaveAndNextJudge = (score: number) => {
    if (!keypadTarget) return;
    updatePrelimScore(activeCategory, keypadTarget.dancerId, keypadTarget.judgeId, score);
    const jIdx = prelimJudges.findIndex((j) => j.id === keypadTarget.judgeId);
    if (jIdx < prelimJudges.length - 1) {
      setKeypadTarget({
        dancerId: keypadTarget.dancerId,
        judgeId: prelimJudges[jIdx + 1].id,
      });
    } else {
      // Move to first judge of next dancer
      const dIdx = currentDancers.findIndex((d) => d.id === keypadTarget.dancerId);
      if (dIdx < currentDancers.length - 1) {
        setKeypadTarget({
          dancerId: currentDancers[dIdx + 1].id,
          judgeId: prelimJudges[0].id,
        });
      } else {
        setKeypadTarget(null);
      }
    }
  };

  const handleSaveAndNextDancer = (score: number) => {
    if (!keypadTarget) return;
    updatePrelimScore(activeCategory, keypadTarget.dancerId, keypadTarget.judgeId, score);
    const dIdx = currentDancers.findIndex((d) => d.id === keypadTarget.dancerId);
    if (dIdx < currentDancers.length - 1) {
      setKeypadTarget({
        dancerId: currentDancers[dIdx + 1].id,
        judgeId: keypadTarget.judgeId,
      });
    } else {
      setKeypadTarget(null);
    }
  };

  // Stats calculation (Strictly 4 Judges for Prelim)
  const totalDancers = currentDancers.length;
  const gradedDancers = currentDancers.filter((d) =>
    prelimJudges.some((j) => d.prelimScores[j.id] !== undefined)
  ).length;

  const totalVotesReceived = currentDancers.reduce((acc, d) => {
    let count = 0;
    prelimJudges.forEach((j) => {
      if (d.prelimScores[j.id] !== undefined) count++;
    });
    return acc + count;
  }, 0);
  const totalExpectedVotes = totalDancers * prelimJudges.length; // 40 * 4 = 160

  // Tie-breaker check at boundary Rank 32 vs 33
  const rank32Dancer = currentDancers[31];
  const rank33Dancer = currentDancers[32];
  const hasTieAtThreshold =
    rank32Dancer &&
    rank33Dancer &&
    Math.round(rank32Dancer.prelimScoreTotal) === Math.round(rank33Dancer.prelimScoreTotal);

  // Display filtering: Sát ngưỡng Top 32 (Hạng 27 - 36) or Tất cả
  const displayedDancers =
    filterMode === 'cutoff'
      ? currentDancers.filter((_, idx) => idx >= 26 && idx <= 35) // Around threshold Top 32
      : currentDancers;

  // Export CSV
  const handleExportCSV = () => {
    const judgeHeaders = prelimJudges.map((j) => j.code);
    const header = [
      'Hạng',
      'SBD',
      'Thí sinh',
      'CLB / Đội',
      ...judgeHeaders,
      'Tổng Điểm (Số nguyên)',
      'Điểm TB (Số nguyên)',
      'Kết Quả',
    ];
    const rows = currentDancers.map((d, index) => [
      index + 1,
      d.sbd,
      d.name,
      d.crew || '',
      ...prelimJudges.map((j) => Math.round(d.prelimScores[j.id] ?? 0)),
      Math.round(d.prelimScoreTotal),
      Math.round(d.prelimScoreAvg),
      d.isQualifiedTop32 ? 'Top 32' : 'Ngoài Top 32',
    ]);
    const csvStr = exportToCSV([header, ...rows]);
    downloadCSV(`prelim_${activeCategory}_results.csv`, csvStr);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Page Header (Swiss Sports Minimalist) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="font-condensed font-black text-2xl sm:text-3xl text-zinc-900 tracking-tight uppercase">
            Kết quả prelim
          </h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">
            Vòng sơ loại Solo · Thang điểm 0–100 (Số nguyên) · 4 Giám khảo chấm mỗi thể loại
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveView('prelim_results')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-xs transition-colors cursor-pointer"
            title="Mở màn hình kết quả Prelim cho khán giả và màn LED (Top 10/15 hoặc toàn bộ khi kết thúc)"
          >
            <Trophy className="w-3.5 h-3.5 text-black" />
            <span>Màn LED Kết Quả Prelim</span>
          </button>

          <button
            onClick={() => setActiveView('prelim_guest')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="Mở giao diện theo dõi kết quả sơ loại trên điện thoại cho khách và phụ huynh"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>Trang Khách Xem</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500" />
            <span>Tải CSV</span>
          </button>

          <button
            onClick={() => syncWithGoogleSheet()}
            disabled={sheetConfig.isSyncing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{sheetConfig.isSyncing ? 'Đang xuất...' : 'Xuất kết quả'}</span>
          </button>
        </div>
      </div>

      {/* Category Segmented Tabs */}
      <div className="flex items-center gap-1 bg-zinc-200 p-1 rounded w-fit text-xs font-bold">
        <button
          onClick={() => setActiveCategory('newbie_1v1')}
          className={`px-4 py-1.5 rounded transition-colors cursor-pointer ${
            activeCategory === 'newbie_1v1'
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          Kid Newbie • 1vs1
        </button>
        <button
          onClick={() => setActiveCategory('pro_2v2')}
          className={`px-4 py-1.5 rounded transition-colors cursor-pointer ${
            activeCategory === 'pro_2v2'
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          Kid Pro • 2vs2
        </button>
      </div>

      {/* Stats Summary Strip (Dense, Unboxed, Swiss Metrics) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded border border-zinc-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="font-condensed font-black text-xl text-zinc-900 tabular-nums">
              {gradedDancers}/{totalDancers}
            </div>
            <div className="text-[11px] text-zinc-500 font-medium">thí sinh đã chấm</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded border border-zinc-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0">
            <FileCheck2 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-condensed font-black text-xl text-zinc-900 tabular-nums">
              {totalVotesReceived}/{totalExpectedVotes}
            </div>
            <div className="text-[11px] text-zinc-500 font-medium">phiếu đã nhận (4 GK)</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded border border-zinc-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-zinc-100 text-zinc-800 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <div className="font-condensed font-black text-xl text-zinc-900">Top 32</div>
            <div className="text-[11px] text-zinc-500 font-medium">
              {activeCategory === 'newbie_1v1' ? 'Đi thẳng vào vòng 1vs1' : 'Ghép thành 16 cặp 2vs2'}
            </div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded border border-zinc-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-500 font-medium">Chế độ xem bảng</div>
            <div className="text-xs font-bold text-zinc-900 mt-0.5">
              {filterMode === 'cutoff' ? 'Nhóm sát ngưỡng Top 32' : 'Toàn bộ 40 thí sinh'}
            </div>
          </div>
          <button
            onClick={() => setFilterMode(filterMode === 'cutoff' ? 'all' : 'cutoff')}
            className="p-1.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors cursor-pointer"
            title="Đổi bộ lọc hiển thị"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: High-density Table + Chốt danh sách Sidebar (Matching Image 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start">
        {/* Table Container */}
        <div className="lg:col-span-3 bg-white rounded border border-zinc-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-50">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-zinc-900 text-sm">
                  {filterMode === 'cutoff' ? 'Nhóm sát ngưỡng Top 32' : 'Bảng Xếp Hạng Toàn Bộ Prelim'}
                </h2>
                <span className="px-2 py-0.5 rounded bg-zinc-200 text-zinc-800 text-[10px] font-bold">
                  Bấm ô để nhập điểm
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Chạm vào bất kỳ ô điểm nào để mở màn hình bấm số (0–100)
              </p>
            </div>
            <div className="text-xs text-zinc-500 font-mono">
              4 Giám khảo chấm solo · Thang điểm 400
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-100 text-zinc-600 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3 w-12 text-center">Hạng</th>
                  <th className="py-2.5 px-3 w-14">SBD</th>
                  <th className="py-2.5 px-3">Thí sinh</th>
                  <th className="py-2.5 px-3 hidden sm:table-cell">CLB / Đội</th>
                  {prelimJudges.map((j) => (
                    <th key={j.id} className="py-2.5 px-2 text-center w-20" title={j.name}>
                      <div className="font-mono text-[9px] text-zinc-500 leading-none">{j.code}</div>
                      <div className="text-zinc-900 font-bold text-[11px] truncate max-w-[75px] mt-0.5">
                        {j.judgeName || j.name.split('•')[1]?.trim() || j.code}
                      </div>
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right w-16">Tổng</th>
                  <th className="py-2.5 px-3 text-right w-14">ĐTB</th>
                  <th className="py-2.5 px-3 text-center w-24">Kết quả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 font-medium">
                {displayedDancers.map((dancer) => {
                  const rank = dancer.prelimRank || 0;
                  const isTop32 = rank <= 32;
                  const isThresholdItem = rank === 32 || rank === 33;

                  return (
                    <React.Fragment key={dancer.id}>
                      <tr
                        className={`hover:bg-zinc-50 transition-colors ${
                          isThresholdItem
                            ? 'bg-amber-50/50'
                            : isTop32
                            ? 'bg-white'
                            : 'bg-zinc-50/70 text-zinc-500'
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-2 px-3 text-center font-condensed font-black text-sm text-zinc-900 tabular-nums">
                          {rank}
                        </td>

                        {/* SBD */}
                        <td className="py-2 px-3 font-mono font-bold text-zinc-700">
                          {dancer.sbd}
                        </td>

                        {/* Dancer Name & Avatar with Gender & Placeholder */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div className="relative shrink-0">
                              <img
                                src={getDancerAvatarUrl(dancer, storageConfig.placeholders)}
                                alt={dancer.name}
                                className="w-7 h-7 rounded-full object-cover border border-zinc-300 shadow-2xs"
                              />
                              {dancer.avatarUrl && (
                                <span
                                  className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white"
                                  title="Đã tải avatar riêng"
                                />
                              )}
                            </div>
                            <div>
                              <div className="font-condensed font-black text-sm text-zinc-900 uppercase flex items-center gap-1.5">
                                <span>{dancer.name}</span>
                                <span
                                  className={`text-[9px] font-bold px-1 py-0.2 rounded uppercase ${
                                    dancer.gender === 'female'
                                      ? 'bg-pink-100 text-pink-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                  {dancer.gender === 'female' ? 'Nữ' : 'Nam'}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDancerForPhoto(dancer);
                                  }}
                                  className="text-zinc-400 hover:text-zinc-900 transition-colors p-0.5 cursor-pointer"
                                  title="Tải ảnh avatar & nửa người"
                                >
                                  <Camera className="w-3 h-3" />
                                </button>
                              </div>
                              {dancer.realName && (
                                <div className="text-[10px] text-zinc-400 leading-none">
                                  {dancer.realName} · Tuổi {dancer.age}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Crew */}
                        <td className="py-2 px-3 text-zinc-600 hidden sm:table-cell truncate max-w-[120px]">
                          {dancer.crew || '—'}
                        </td>

                        {/* 4 Prelim Judges Scores */}
                        {prelimJudges.map((j) => {
                          const score = Math.round(dancer.prelimScores[j.id] ?? 0);
                          const isTarget =
                            keypadTarget?.dancerId === dancer.id && keypadTarget?.judgeId === j.id;

                          return (
                            <td
                              key={j.id}
                              onClick={() => handleOpenKeypad(dancer.id, j.id)}
                              className="py-1.5 px-2 text-center cursor-pointer hover:bg-amber-50 transition-colors group/cell"
                              title={`Chạm để mở bàn phím bấm số chấm điểm cho ${j.judgeName || j.code}`}
                            >
                              <div
                                className={`inline-flex items-center justify-center min-w-[40px] px-2 py-1 rounded-md font-mono text-xs font-black transition-all shadow-2xs ${
                                  isTarget
                                    ? 'bg-amber-500 text-zinc-950 ring-2 ring-amber-400 scale-105'
                                    : score > 0
                                    ? 'bg-white text-zinc-900 border border-zinc-300 group-hover/cell:border-amber-500 group-hover/cell:bg-amber-500 group-hover/cell:text-zinc-950'
                                    : 'bg-zinc-100 text-zinc-400 border border-dashed border-zinc-300 group-hover/cell:border-amber-400'
                                }`}
                              >
                                {score > 0 ? score : '—'}
                              </div>
                            </td>
                          );
                        })}

                        {/* Total Score (Integer) */}
                        <td className="py-2 px-3 text-right font-condensed font-black text-sm text-zinc-900 tabular-nums">
                          {Math.round(dancer.prelimScoreTotal)}
                        </td>

                        {/* Average Score (Integer) */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-xs text-zinc-600 tabular-nums">
                          {Math.round(dancer.prelimScoreAvg)}
                        </td>

                        {/* Result Tag */}
                        <td className="py-2 px-3 text-center">
                          {isTop32 ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                              Vào Top 32
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-200 text-[10px] font-medium">
                              Loại
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Threshold separator line after Rank 32 */}
                      {rank === 32 && (
                        <tr className="bg-red-500 text-white font-mono text-[10px] font-bold">
                          <td colSpan={10} className="py-1 px-3 tracking-widest text-center uppercase">
                            --- NGƯỠNG CẮT TOP 32 (RANH GIỚI ĐI TIẾP VÀO VÒNG TRONG) ---
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar: Chốt Top 32 & Quy trình vận hành (Matching Image 1) */}
        <div className="space-y-4">
          <div className="bg-white rounded border border-zinc-200 p-4 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-zinc-900 text-sm uppercase tracking-tight">
                Quy trình chốt danh sách
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Kiểm tra đầy đủ tiêu chí trước khi đóng vòng Prelim
              </p>
            </div>

            {/* Checklist */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>4/4 Giám khảo đã nộp điểm</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>100% Phiếu hợp lệ (Số nguyên)</span>
              </div>
              {hasTieAtThreshold ? (
                <div className="flex items-start gap-2 text-amber-700 font-medium bg-amber-50 p-2 rounded border border-amber-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <div className="font-bold">Đồng hạng tại vị trí 32 & 33!</div>
                    <div className="text-[11px] text-amber-600">
                      Cần chấm phụ (Tie-break) hoặc giám khảo hội ý điều chỉnh điểm số.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Không có đồng hạng tại ngưỡng cắt</span>
                </div>
              )}
            </div>

            {/* Main Action Button */}
            <div className="pt-2 border-t border-zinc-200">
              {isLocked ? (
                <div className="space-y-2">
                  <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Đã Chốt Danh Sách Top 32</span>
                  </div>

                  {activeCategory === 'pro_2v2' ? (
                    <button
                      onClick={() => setActiveView('teams')}
                      className="w-full py-2.5 px-3 rounded bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Sang Ghép Đội 2vs2</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveView('bracket')}
                      className="w-full py-2.5 px-3 rounded bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Sang Nhánh Đấu 1vs1</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => lockTop32(activeCategory)}
                  disabled={hasTieAtThreshold}
                  className="w-full py-2.5 px-3 rounded bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Chốt Top 32 & Chuyển Vòng</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Guidance Info Card */}
          <div className="bg-zinc-50 rounded border border-zinc-200 p-3.5 text-xs text-zinc-600 space-y-1.5">
            <div className="font-bold text-zinc-900 uppercase text-[11px] tracking-wider">
              Hướng dẫn Prelim:
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-zinc-500">
              <li>Mỗi thí sinh được chấm bởi đúng 4 giám khảo.</li>
              <li>Điểm số là số nguyên từ 0 đến 100.</li>
              <li>Tổng điểm và điểm trung bình tự động tính toán.</li>
              <li>Top 32 vận động viên cao điểm nhất sẽ bước vào vòng đối kháng trực tiếp.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Photo Upload Modal */}
      <DancerPhotoUploadModal
        dancer={selectedDancerForPhoto}
        category={activeCategory}
        isOpen={Boolean(selectedDancerForPhoto)}
        onClose={() => setSelectedDancerForPhoto(null)}
      />

      {/* Banking-style Numeric Score Keypad Modal */}
      <BankingScoreKeypadModal
        isOpen={Boolean(keypadTarget)}
        onClose={() => setKeypadTarget(null)}
        dancer={targetDancer}
        judge={targetJudge}
        initialScore={currentCellScore}
        onSave={handleSaveKeypadScore}
        onSaveAndNextJudge={handleSaveAndNextJudge}
        onSaveAndNextDancer={handleSaveAndNextDancer}
        hasNextJudge={Boolean(
          targetJudge &&
          prelimJudges.findIndex((j) => j.id === targetJudge.id) < prelimJudges.length - 1
        )}
        hasNextDancer={Boolean(
          targetDancer &&
          currentDancers.findIndex((d) => d.id === targetDancer.id) < currentDancers.length - 1
        )}
      />
    </div>
  );
};
