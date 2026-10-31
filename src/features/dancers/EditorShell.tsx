import React from 'react';
import { LogOut } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { DancersListView } from './DancersListView';

/** "Cập nhật thí sinh" staff (role editor): the dancer list and nothing else, phone first, with a way to sign out. */
export const EditorShell: React.FC = () => {
  const { authUser, handleGoogleLogout } = useTournament();
  return (
    <div className="min-h-[100dvh] bg-zinc-100">
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white/95 px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/logo.png" alt="HipHop Xứ Trà U16" className="h-9 w-auto" />
          <div className="min-w-0 leading-tight">
            <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600">Cập nhật thí sinh</p>
            <p className="truncate text-xs text-zinc-500">{authUser?.email?.split('@')[0]}</p>
          </div>
        </div>
        <button
          onClick={() => handleGoogleLogout()}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
        >
          <LogOut className="h-4 w-4" /> Đăng xuất
        </button>
      </header>
      <DancersListView />
    </div>
  );
};
