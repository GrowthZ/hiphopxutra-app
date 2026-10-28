import React, { useState } from 'react';
import { useTournament } from '../../state/TournamentContext';
import { Team2v2 } from '../../domain/types';
import {
  Shuffle,
  Users,
  CheckCircle2,
  GitFork,
  Upload,
  Download,
  Camera,
  Cloud,
  Image as ImageIcon,
} from 'lucide-react';
import { soundFX } from '../../services/soundEffects';
import confetti from 'canvas-confetti';
import { exportToCSV, downloadCSV } from '../../services/googleSheets';
import { TeamPhotoUploadModal } from './TeamPhotoUploadModal';
import { getTeamPhotoUrl, getDancerAvatarUrl } from '../../shared/placeholderAssets';
import { TeamPhoto } from '../../shared/TeamPhoto';

export const TeamDrawView: React.FC = () => {
  const {
    proDancers,
    proTeams,
    shuffleProTeams,
    setActiveView,
    syncWithGoogleSheet,
    sheetConfig,
    setIsStorageModalOpen,
    storageConfig,
  } = useTournament();

  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedTeamForPhoto, setSelectedTeamForPhoto] = useState<Team2v2 | null>(null);

  const top32Pro = proDancers.slice(0, 32);

  const handleStartDraw = () => {
    setIsDrawing(true);
    soundFX.playVoteConfirmed();

    let count = 0;
    const interval = setInterval(() => {
      shuffleProTeams();
      soundFX.playVoteClick();
      count++;
      if (count >= 8) {
        clearInterval(interval);
        setIsDrawing(false);
        soundFX.playRoundWinner();
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });
      }
    }, 120);
  };

  const handleExportTeamsCSV = () => {
    const header = [
      'Số Đội',
      'Tên Đội',
      'Ảnh Team URL',
      'SBD Dancer 1',
      'Tên Dancer 1',
      'CLB 1',
      'SBD Dancer 2',
      'Tên Dancer 2',
      'CLB 2',
    ];
    const rows = proTeams.map((t) => [
      t.teamNumber,
      t.name,
      t.teamPhotoUrl || '',
      t.dancer1.sbd,
      t.dancer1.name,
      t.dancer1.crew || '',
      t.dancer2.sbd,
      t.dancer2.name,
      t.dancer2.crew || '',
    ]);
    const csvStr = exportToCSV([header, ...rows]);
    downloadCSV('danh_sach_16_doi_pro_2vs2.csv', csvStr);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
              KID PRO • 2vs2
            </span>
            <span className="text-xs text-zinc-500 font-medium">Bốc thăm ghép cặp ngẫu nhiên & Tải ảnh đội</span>
          </div>
          <h1 className="font-condensed font-black text-2xl sm:text-3xl text-zinc-900 tracking-tight mt-1 uppercase">
            Bốc thăm 16 cặp đấu Pro 2vs2
          </h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">
            Lấy 32 thí sinh xuất sắc từ Prelim ghép thành 16 cặp đối kháng · Hỗ trợ tải ảnh team 2 người (R2 / Drive)
          </p>
        </div>

        {/* Action Tools */}
        <div className="flex items-center gap-2">
          {/* Quick Storage Config button */}
          <button
            onClick={() => setIsStorageModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Cấu hình Cloudflare R2 hoặc Google Drive"
          >
            <Cloud className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden sm:inline">Lưu ảnh:</span>
            <span className="font-bold text-zinc-900 uppercase">
              R2
            </span>
          </button>

          <button
            onClick={handleExportTeamsCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500" />
            <span>Tải CSV 16 Đội</span>
          </button>

          <button
            onClick={() => syncWithGoogleSheet()}
            disabled={sheetConfig.isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-500" />
            <span>Xuất sang Google Sheets</span>
          </button>

          <button
            onClick={handleStartDraw}
            disabled={isDrawing}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 uppercase tracking-wider"
          >
            <Shuffle className={`w-3.5 h-3.5 ${isDrawing ? 'animate-spin' : ''}`} />
            <span>{isDrawing ? 'Đang bốc thăm...' : 'Bốc Thăm Lại Ngẫu Nhiên'}</span>
          </button>
        </div>
      </div>

      {/* Top Notification Strip */}
      <div className="bg-zinc-50 border border-zinc-200 rounded p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-zinc-700 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Đã sẵn sàng <strong>16 cặp đấu</strong>. Mỗi trận đấu <strong>2 Round</strong>, Bán kết và Chung kết đấu <strong>4 Round</strong>.
          </span>
        </div>

        <button
          onClick={() => setActiveView('bracket')}
          className="flex items-center gap-1 text-zinc-900 hover:text-zinc-700 font-bold cursor-pointer text-xs uppercase tracking-wider"
        >
          <span>Xem Nhánh Đấu Trực Tiếp</span>
          <GitFork className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid of 16 Teams (Swiss Data Cards with Team Photos) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {proTeams.map((team) => (
          <div
            key={team.id}
            className="bg-white rounded border border-zinc-200 p-3.5 shadow-xs hover:border-zinc-400 transition-colors flex flex-col justify-between space-y-3"
          >
            {/* Team Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <span className="font-condensed font-black text-lg text-zinc-900 tracking-tight uppercase">
                {team.name}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                  #{String(team.teamNumber).padStart(2, '0')}
                </span>
                <button
                  onClick={() => setSelectedTeamForPhoto(team)}
                  className="p-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors cursor-pointer"
                  title="Tải ảnh team 2 người"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Team Photo Banner with Placeholder Fallback */}
            <div className="relative rounded overflow-hidden h-28 bg-zinc-900 border border-zinc-200">
              <TeamPhoto
                photoUrl={team.teamPhotoUrl}
                dancers={[team.dancer1, team.dancer2]}
                placeholder={getTeamPhotoUrl(undefined, storageConfig.placeholders)}
                alt={team.name}
                className="w-full h-full object-cover object-center"
                boxClassName="w-full h-full pt-2"
              />
              <button
                onClick={() => setSelectedTeamForPhoto(team)}
                className="absolute bottom-1 right-1 bg-black/75 hover:bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              >
                <Camera className="w-2.5 h-2.5" />
                <span>{team.teamPhotoUrl ? 'Đổi ảnh' : 'Tải ảnh đội'}</span>
              </button>
            </div>

            {/* Dancer 1 & Dancer 2 */}
            <div className="space-y-2">
              {/* Dancer 1 */}
              <div className="flex items-center justify-between p-2 rounded bg-zinc-50 border border-zinc-200 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <img
                    src={getDancerAvatarUrl(team.dancer1, storageConfig.placeholders)}
                    alt={team.dancer1.name}
                    className="w-6 h-6 rounded-full object-cover border border-zinc-300 shrink-0"
                  />
                  <div className="truncate">
                    <div className="font-condensed font-bold text-sm text-zinc-900 truncate uppercase flex items-center gap-1">
                      <span>{team.dancer1.name}</span>
                      <span className={`text-[8px] font-bold px-1 rounded uppercase ${team.dancer1.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                        {team.dancer1.gender === 'female' ? 'Nữ' : 'Nam'}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono truncate">
                      {team.dancer1.crew}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-zinc-700 bg-white px-1.5 py-0.5 rounded border border-zinc-200 shrink-0">
                  SBD {team.dancer1.sbd}
                </span>
              </div>

              {/* Dancer 2 */}
              <div className="flex items-center justify-between p-2 rounded bg-zinc-50 border border-zinc-200 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <img
                    src={getDancerAvatarUrl(team.dancer2, storageConfig.placeholders)}
                    alt={team.dancer2.name}
                    className="w-6 h-6 rounded-full object-cover border border-zinc-300 shrink-0"
                  />
                  <div className="truncate">
                    <div className="font-condensed font-bold text-sm text-zinc-900 truncate uppercase flex items-center gap-1">
                      <span>{team.dancer2.name}</span>
                      <span className={`text-[8px] font-bold px-1 rounded uppercase ${team.dancer2.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                        {team.dancer2.gender === 'female' ? 'Nữ' : 'Nam'}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono truncate">
                      {team.dancer2.crew}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-zinc-700 bg-white px-1.5 py-0.5 rounded border border-zinc-200 shrink-0">
                  SBD {team.dancer2.sbd}
                </span>
              </div>
            </div>

            {/* Combined prelim score indicator & quick upload button */}
            <div className="text-[11px] text-zinc-400 border-t border-zinc-100 pt-2 flex items-center justify-between font-mono">
              <span>Tổng ĐTB:</span>
              <span className="font-bold text-zinc-800 tabular-nums">
                {Math.round((team.dancer1.prelimScoreAvg + team.dancer2.prelimScoreAvg) / 2)} đ
              </span>
            </div>

            {!team.teamPhotoUrl && (
              <button
                onClick={() => setSelectedTeamForPhoto(team)}
                className="w-full py-1.5 px-2 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-zinc-500" />
                <span>Tải ảnh team 2 người</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Team Photo Upload Modal */}
      <TeamPhotoUploadModal
        team={selectedTeamForPhoto}
        isOpen={Boolean(selectedTeamForPhoto)}
        onClose={() => setSelectedTeamForPhoto(null)}
      />
    </div>
  );
};
