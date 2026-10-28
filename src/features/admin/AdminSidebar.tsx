import React from 'react';
import { useTournament } from '../../state/TournamentContext';
import {
  Users,
  FileSpreadsheet,
  Trophy,
  Shuffle,
  GitFork,
  Swords,
  Tv,
  Smartphone,
  ShieldCheck,
  UserCheck,
  Cloud,
  Camera,
  Eye,
  KeyRound,
  UserCog,
  MonitorPlay,
} from 'lucide-react';

export const AdminSidebar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    googleUser,
    activeJudge,
    setIsJudgeConfigModalOpen,
  } = useTournament();

  const menuItems = [
    { id: 'checkin', label: 'Check-in thí sinh', icon: UserCheck },
    { id: 'prelim', label: 'Bàn chấm Prelim (4 GK)', icon: FileSpreadsheet },
    { id: 'prelim_results', label: 'Bảng Kết quả Prelim (LED)', icon: Trophy },
    { id: 'prelim_guest', label: 'Khách xem Prelim (Mobile)', icon: Eye },
    { id: 'prelim_screen', label: 'Màn chiếu Prelim (16:9)', icon: MonitorPlay },
    { id: 'teams', label: 'Ghép đội 2vs2', icon: Shuffle },
    { id: 'bracket', label: 'Nhánh đấu', icon: GitFork },
    { id: 'battle', label: 'Điều hành Battle (9 GK)', icon: Swords },
    { id: 'stage_control', label: 'Điều khiển màn LED', icon: Tv },
    { id: 'judge', label: 'Cổng Giám khảo', icon: Smartphone },
    { id: 'judge_accounts', label: 'Tài khoản Giám khảo', icon: KeyRound },
    { id: 'staff_accounts', label: 'Người dùng BTC', icon: UserCog },
    { id: 'dancers', label: 'Danh sách Thí sinh', icon: Users },
    { id: 'storage', label: 'Lưu trữ & Ảnh mẫu', icon: Cloud },
    { id: 'sheets', label: 'Google Sheets DB', icon: ShieldCheck },
  ] as const;

  return (
    <aside className="w-60 bg-white border-r border-zinc-200 flex flex-col justify-between shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 select-none">
      <div className="p-3">
        {/* Navigation list */}
        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 px-3 py-1.5">
          MENU ĐIỀU HÀNH
        </div>
        <nav className="space-y-0.5 mt-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-semibold transition-colors text-left cursor-pointer ${
                  isActive
                    ? 'bg-zinc-900 text-white font-bold'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-zinc-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Quick Button for Judge 2-Photos Config */}
        <div className="mt-3 pt-3 border-t border-zinc-100">
          <button
            onClick={() => setIsJudgeConfigModalOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-colors text-left cursor-pointer shadow-xs"
          >
            <Camera className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="truncate">Cấu hình 2 ảnh (9 GK)</span>
          </button>
        </div>
      </div>

      {/* Organizer Info Box */}
      <div className="p-3 border-t border-zinc-200 bg-zinc-50">
        <div className="flex items-center gap-2.5 p-2 rounded bg-white border border-zinc-200 text-xs">
          <div className="w-7 h-7 rounded bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <div className="truncate flex-1">
            <div className="font-bold text-zinc-900 text-[11px] uppercase tracking-wider">
              BAN TỔ CHỨC
            </div>
            <div className="text-[10px] text-zinc-500 font-mono truncate">
              {googleUser?.email || activeJudge.name.split('•')[0]?.trim()}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
