import React, { useEffect, useState } from 'react';
import { ExternalLink, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { usernameOf } from '../../services/staffAccounts';
import { VIEW_PATHS } from '../../app/routes';
import { InstallAppButton } from '../judge/InstallAppButton';
import { CheckInView } from './CheckInView';

/**
 * The check-in desk on /admin/check-in, for check-in accounts and admins alike. It installs as its own
 * "Check-in" app: index.html picks its manifest for this URL. Signing out lands on the desk's login screen.
 */
export const CheckInDesk: React.FC = () => {
  const { authUser, isAdmin, handleGoogleLogout } = useTournament();
  const email = authUser?.email ?? '';
  const username = usernameOf(email) ?? email;
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="min-h-[100dvh] bg-zinc-50 text-zinc-900">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="HipHop Xứ Trà U16" className="h-10 w-auto" />
            <span className="font-condensed text-lg font-black uppercase tracking-wide">Bàn check-in</span>
          </div>
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Mở menu"
            aria-expanded={menuOpen}
            className="-mr-2 rounded-full p-2.5 text-zinc-700 hover:bg-zinc-100 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <CheckInView desk />

      {/* Outside the header: its backdrop-blur would trap a fixed-position drawer inside it. */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-zinc-900/40" onClick={() => setMenuOpen(false)}>
          <nav
            aria-label="Menu"
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-72 max-w-[85vw] flex-col gap-4 bg-white px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl"
          >
            <div className="flex items-center justify-between">
              <span className="font-condensed text-xl font-black uppercase">Menu</span>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Đóng menu"
                className="-m-1 rounded-full p-2 text-zinc-400 hover:bg-zinc-100 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 font-condensed text-lg font-black uppercase text-zinc-500">
                {username.charAt(0)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{username}</span>
                <span className="text-xs text-zinc-500">{isAdmin ? 'Quản trị BTC' : 'Tài khoản check-in'}</span>
              </span>
            </div>

            {isAdmin && (
              <a
                href={VIEW_PATHS.prelim}
                className="flex items-center gap-2 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-bold hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                <LayoutDashboard className="h-4 w-4 text-zinc-500" />
                Về bảng điều hành
              </a>
            )}

            <div className="overflow-hidden rounded-2xl border border-zinc-200 text-sm font-bold">
              <a
                href={VIEW_PATHS.prelim_guest}
                target="_blank"
                rel="noopener"
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-amber-500"
              >
                Kết quả vòng loại
                <ExternalLink className="h-4 w-4 text-zinc-400" />
              </a>
              <a
                href={VIEW_PATHS.bracket_guest}
                target="_blank"
                rel="noopener"
                className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-amber-500"
              >
                Nhánh đấu
                <ExternalLink className="h-4 w-4 text-zinc-400" />
              </a>
            </div>

            <InstallAppButton appName="Check-in" purpose="để check-in thí sinh" />

            <button
              onClick={() => {
                setMenuOpen(false);
                handleGoogleLogout();
              }}
              className="mt-auto flex items-center justify-center gap-2 rounded-xl border border-zinc-200 py-3 text-sm font-bold text-red-600 hover:bg-red-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};
