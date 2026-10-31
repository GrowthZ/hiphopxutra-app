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
  ExternalLink,
  Mic,
  FlaskConical,
  Network,
  X,
} from 'lucide-react';
import { openInNewTab, SCREEN_VIEWS } from '../../app/routes';

/** The admin menu: a column on wide screens; below `lg` a drawer opened from the navbar's hamburger. */
export const AdminSidebar: React.FC<{ mobileOpen?: boolean; onClose?: () => void }> = ({ mobileOpen = false, onClose }) => {
  const {
    activeView,
    setActiveView,
    googleUser,
    activeJudge,
    setIsJudgeConfigModalOpen,
  } = useTournament();

  const menuItems = [
    { id: 'checkin', label: 'Check-in thí sinh', icon: UserCheck },
    { id: 'prelim', label: 'Bàn chấm Prelim (8 GK)', icon: FileSpreadsheet },
    { id: 'prelim_results', label: 'Bảng Kết quả Prelim (LED)', icon: Trophy },
    { id: 'prelim_guest', label: 'Khách xem Prelim (Mobile)', icon: Eye },
    { id: 'prelim_screen', label: 'Màn chiếu TV', icon: MonitorPlay },
    { id: 'prelim_screen_led', label: 'Màn chiếu LED', icon: MonitorPlay },
    { id: 'teams', label: 'Ghép đội 2vs2', icon: Shuffle },
    { id: 'bracket', label: 'Nhánh đấu', icon: GitFork },
    { id: 'bracket_screen', label: 'Sơ đồ knockout (công khai)', icon: Network },
    { id: 'battle', label: 'Điều hành Battle (9 GK)', icon: Swords },
    { id: 'stage_control', label: 'Điều khiển màn LED', icon: Tv },
    { id: 'judge', label: 'Cổng Giám khảo', icon: Smartphone },
    { id: 'mc', label: 'Màn MC', icon: Mic },
    { id: 'judge_accounts', label: 'Tài khoản GK & MC', icon: KeyRound },
    { id: 'staff_accounts', label: 'Người dùng BTC', icon: UserCog },
    { id: 'rehearsal', label: 'Tổng duyệt (dữ liệu mẫu)', icon: FlaskConical },
    { id: 'dancers', label: 'Danh sách Thí sinh', icon: Users },
    { id: 'storage', label: 'Lưu trữ & Ảnh mẫu', icon: Cloud },
    { id: 'sheets', label: 'Google Sheets DB', icon: ShieldCheck },
  ] as const;

  // Escape closes the drawer.
  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, onClose]);

  const go = (id: (typeof menuItems)[number]['id']) => {
    if ((SCREEN_VIEWS as readonly string[]).includes(id)) openInNewTab(id as (typeof SCREEN_VIEWS)[number]);
    else setActiveView(id);
    onClose?.();
  };

  const body = (
    <>
      <div className="p-3 min-h-0 flex-1 overflow-y-auto">
        {/* Navigation list */}
        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 px-3 py-1.5">
          MENU ĐIỀU HÀNH
        </div>
        <nav className="space-y-0.5 mt-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            const newTab = (SCREEN_VIEWS as readonly string[]).includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                title={newTab ? 'Mở ở tab mới' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 lg:py-2 rounded text-sm lg:text-xs font-semibold transition-colors text-left cursor-pointer ${
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
                <span className="truncate flex-1">{item.label}</span>
                {newTab && <ExternalLink className="w-3.5 h-3.5 shrink-0 text-zinc-400" />}
              </button>
            );
          })}
        </nav>

        {/* Quick Button for Judge 2-Photos Config */}
        <div className="mt-3 pt-3 border-t border-zinc-100">
          <button
            onClick={() => {
              setIsJudgeConfigModalOpen(true);
              onClose?.();
            }}
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
    </>
  );

  return (
    <>
      <aside className="hidden lg:flex w-60 bg-white border-r border-zinc-200 flex-col justify-between shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 select-none">
        {body}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu điều hành">
          <div className="absolute inset-0 bg-zinc-900/40" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col justify-between bg-white shadow-xl select-none pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <span className="font-condensed text-lg font-black uppercase text-zinc-900">Menu</span>
              <button
                onClick={onClose}
                aria-label="Đóng menu"
                className="-m-1 rounded-full p-2 text-zinc-500 hover:bg-zinc-100 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {body}
          </aside>
        </div>
      )}
    </>
  );
};
