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
  MonitorPlay,
  ExternalLink,
  Camera,
  Eye,
  Zap,
} from 'lucide-react';
import { exportToCSV, downloadCSV } from '../../services/googleSheets';
import { DancerPhotoUploadModal } from '../dancers/DancerPhotoUploadModal';
import { BankingScoreKeypadModal } from './BankingScoreKeypadModal';
import { getDancerAvatarUrl } from '../../shared/placeholderAssets';
import {
  allPrelimJudgeIds,
  cutoffTie,
  isCutoffUndecided,
  PANEL_SIZE,
  panelOfDancer,
  prelimJudgeIdsFor,
} from '../../domain/model';
import { PrelimPanelsCard } from './PrelimPanelsCard';
import { openInNewTab } from '../../app/routes';

export const PrelimView: React.FC = () => {
  const {
    activeCategory,
    setActiveCategory,
    newbieDancers,
    proDancers,
    judges,
    prelimPanels,
    updatePrelimScore,
    isNewbieTop32Locked,
    isProTop32Locked,
    lockTop32,
    openTieBreak,
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
  const judgeIdsOf = (d: Dancer) => prelimJudgeIdsFor(d, prelimPanels);
  const judgeById = (id?: string) => judges.find((j) => j.id === id);
  const isLocked = activeCategory === 'newbie_1v1' ? isNewbieTop32Locked : isProTop32Locked;

  const targetDancer = keypadTarget
    ? currentDancers.find((d) => d.id === keypadTarget.dancerId) || null
    : null;
  const targetJudge = keypadTarget ? judgeById(keypadTarget.judgeId) || null : null;
  const targetPanelJudges = targetDancer ? judgeIdsOf(targetDancer) : [];
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
    const jIdx = targetPanelJudges.indexOf(keypadTarget.judgeId);
    if (jIdx >= 0 && jIdx < targetPanelJudges.length - 1) {
      setKeypadTarget({ dancerId: keypadTarget.dancerId, judgeId: targetPanelJudges[jIdx + 1] });
    } else {
      // First judge of the next dancer that has a panel
      const dIdx = currentDancers.findIndex((d) => d.id === keypadTarget.dancerId);
      const next = currentDancers.slice(dIdx + 1).find((d) => judgeIdsOf(d).length > 0);
      setKeypadTarget(next ? { dancerId: next.id, judgeId: judgeIdsOf(next)[0] } : null);
    }
  };

  const handleSaveAndNextDancer = (score: number) => {
    if (!keypadTarget) return;
    updatePrelimScore(activeCategory, keypadTarget.dancerId, keypadTarget.judgeId, score);
    // Same column (judge position) for the next dancer, in that dancer's panel
    const col = Math.max(0, targetPanelJudges.indexOf(keypadTarget.judgeId));
    const dIdx = currentDancers.findIndex((d) => d.id === keypadTarget.dancerId);
    const next = currentDancers.slice(dIdx + 1).find((d) => judgeIdsOf(d).length > 0);
    setKeypadTarget(next ? { dancerId: next.id, judgeId: judgeIdsOf(next)[col] } : null);
  };

  // Stats: each checked-in dancer expects the 4 scores of their panel
  const totalDancers = currentDancers.length;
  const gradedDancers = currentDancers.filter((d) => judgeIdsOf(d).some((j) => d.prelimScores[j] !== undefined)).length;
  const totalVotesReceived = currentDancers.reduce(
    (acc, d) => acc + judgeIdsOf(d).filter((j) => d.prelimScores[j] !== undefined).length,
    0
  );
  const totalExpectedVotes = currentDancers.filter((d) => judgeIdsOf(d).length > 0).length * PANEL_SIZE;

  // Tie across the cut-off (rank 32 vs 33): all 8 prelim judges score the tied dancers once more.
  const tiedAtCutoff = cutoffTie(currentDancers);
  const hasTieAtThreshold = isCutoffUndecided(currentDancers);
  const tieJudgeIds = allPrelimJudgeIds(prelimPanels);
  const tieBreakDancers = currentDancers.filter((d) => d.tieBreak);
  const tieNotOpened = tiedAtCutoff.filter((d) => !d.tieBreak);

  // Display filtering: Sát ngưỡng Top 32 (Hạng 27 - 36) or Tất cả
  const displayedDancers =
    filterMode === 'cutoff'
      ? currentDancers.filter((_, idx) => idx >= 26 && idx <= 35) // Around threshold Top 32
      : currentDancers;

  // Export CSV
  const handleExportCSV = () => {
    const judgeHeaders = Array.from({ length: PANEL_SIZE }, (_, i) => [`GK ${i + 1}`, `Điểm ${i + 1}`]).flat();
    const header = [
      'Hạng',
      'SBD',
      'Bảng',
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
      panelOfDancer(d, prelimPanels) ?? '',
      d.name,
      d.crew || '',
      ...judgeIdsOf(d).flatMap((j) => [judgeById(j)?.code ?? j, Math.round(d.prelimScores[j] ?? 0)]),
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
            Vòng sơ loại Solo · Thang điểm 0–100 · 8 giám khảo chia 2 bảng theo SBD, mỗi thí sinh 4 GK (tối đa 400)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => openInNewTab('prelim_screen_led')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-xs transition-colors cursor-pointer"
            title="Mở màn kết quả cho LED (nền tối) ở tab mới"
          >
            <MonitorPlay className="w-3.5 h-3.5 text-black" />
            <span>Màn LED</span>
            <ExternalLink className="w-3 h-3 text-black/60" />
          </button>

          <button
            onClick={() => openInNewTab('prelim_screen')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-800 hover:bg-zinc-50 text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="Mở màn kết quả cho TV / máy chiếu (nền sáng) ở tab mới"
          >
            <MonitorPlay className="w-3.5 h-3.5 text-zinc-500" />
            <span>Màn chiếu TV</span>
            <ExternalLink className="w-3 h-3 text-zinc-400" />
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

      <PrelimPanelsCard />

      {/* Category Segmented Tabs */}
      <div className="flex items-center gap-1 bg-zinc-200 p-1 rounded w-fit text-xs font-bold">
        {/* Prelim runs Pro first, then Newbie */}
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
            <div className="text-[11px] text-zinc-500 font-medium">phiếu đã nhận (4 GK / thí sinh)</div>
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
              Bảng A: {prelimPanels.aIsOdd ? 'SBD lẻ' : 'SBD chẵn'} · Bảng B: {prelimPanels.aIsOdd ? 'SBD chẵn' : 'SBD lẻ'} · 4 GK mỗi thí sinh
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
                  <th className="py-2.5 px-2 text-center w-12">Bảng</th>
                  {Array.from({ length: PANEL_SIZE }, (_, i) => (
                    <th key={i} className="py-2.5 px-2 text-center w-24" title="Giám khảo thứ i của bảng A / bảng B">
                      <div className="font-mono text-[9px] text-zinc-500 leading-none">GK {i + 1}</div>
                      <div className="mt-0.5 text-[10px] font-bold leading-tight text-zinc-900 normal-case">
                        <span className="text-amber-700">A</span> {judgeById(prelimPanels.A[i])?.judgeName ?? '—'}
                        <br />
                        <span className="text-sky-700">B</span> {judgeById(prelimPanels.B[i])?.judgeName ?? '—'}
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
                                  {dancer.realName}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Crew */}
                        <td className="py-2 px-3 text-zinc-600 hidden sm:table-cell truncate max-w-[120px]">
                          {dancer.crew}
                        </td>

                        {/* Panel + the 4 judges of the dancer's panel */}
                        <td className="py-2 px-2 text-center">
                          {panelOfDancer(dancer, prelimPanels) ? (
                            <span
                              className={`rounded px-1.5 py-0.5 text-[11px] font-black ${
                                panelOfDancer(dancer, prelimPanels) === 'A' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                              }`}
                            >
                              {panelOfDancer(dancer, prelimPanels)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-400" title="Chưa check-in, chưa có SBD">—</span>
                          )}
                        </td>
                        {Array.from({ length: PANEL_SIZE }, (_, i) => {
                          const judgeId = judgeIdsOf(dancer)[i];
                          if (!judgeId) return <td key={i} className="py-1.5 px-2 text-center text-zinc-300">—</td>;
                          const j = judgeById(judgeId);
                          const score = Math.round(dancer.prelimScores[judgeId] ?? 0);
                          const isTarget = keypadTarget?.dancerId === dancer.id && keypadTarget?.judgeId === judgeId;

                          return (
                            <td
                              key={i}
                              onClick={() => handleOpenKeypad(dancer.id, judgeId)}
                              className="py-1.5 px-2 text-center cursor-pointer hover:bg-amber-50 transition-colors group/cell"
                              title={`Chạm để mở bàn phím bấm số chấm điểm cho ${j?.judgeName || j?.code || judgeId}`}
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
                          <td colSpan={12} className="py-1 px-3 tracking-widest text-center uppercase">
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
                <span>{totalVotesReceived}/{totalExpectedVotes} phiếu của 2 bảng</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>100% Phiếu hợp lệ (Số nguyên)</span>
              </div>
              {hasTieAtThreshold ? (
                <div className="flex items-start gap-2 text-amber-700 font-medium bg-amber-50 p-2 rounded border border-amber-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <div className="font-bold">Đồng điểm tại ngưỡng hạng 32 & 33!</div>
                      <div className="text-[11px] text-amber-600">
                        Tie-break: cả {tieJudgeIds.length} GK của 2 bảng chấm thêm 1 lượt (0–100) cho các thí sinh đồng
                        điểm. Chỉ dùng để xếp thứ tự giữa họ.
                      </div>
                    </div>
                    {tieNotOpened.length > 0 && !isLocked && (
                      <button
                        onClick={() => openTieBreak(activeCategory, tieNotOpened.map((d) => d.id))}
                        className="w-full rounded bg-red-600 px-2 py-2 text-[11px] font-black uppercase tracking-wider text-white hover:bg-red-700 cursor-pointer"
                      >
                        Mở tie-break cho {tieNotOpened.length} thí sinh
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Không có đồng hạng tại ngưỡng cắt</span>
                </div>
              )}
            </div>

            {tieBreakDancers.length > 0 && (
              <div className="space-y-1 rounded border border-zinc-200 p-2 text-xs">
                <div className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                  Tie-break · {tieJudgeIds.length} GK
                </div>
                {tieBreakDancers.map((d) => {
                  const done = tieJudgeIds.filter((j) => typeof d.tieBreakScores?.[j] === 'number').length;
                  return (
                    <div key={d.id} className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-500">{d.sbd}</span>
                      <span className="min-w-0 flex-1 truncate font-bold text-zinc-900">{d.name}</span>
                      <span className="tabular-nums text-zinc-500">
                        {done}/{tieJudgeIds.length}
                      </span>
                      <span className="w-10 text-right font-black tabular-nums text-zinc-900">
                        {d.tieBreakTotal ?? '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

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
              <li>Đồng điểm ở ngưỡng Top 32: mở tie-break, cả 8 giám khảo chấm thêm.</li>
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
        hasNextJudge={Boolean(targetJudge && targetPanelJudges.indexOf(targetJudge.id) < targetPanelJudges.length - 1)}
        hasNextDancer={Boolean(
          targetDancer &&
          currentDancers.findIndex((d) => d.id === targetDancer.id) < currentDancers.length - 1
        )}
      />
    </div>
  );
};
