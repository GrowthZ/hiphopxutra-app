import React from 'react';
import { signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { auth } from '../../services/firebase';
import { usernameOf } from '../../services/staffAccounts';
import { CheckInView } from './CheckInView';

/** What a check-in role account sees on any /admin page: the check-in desk and nothing else. */
export const CheckInDesk: React.FC = () => {
  const { authUser } = useTournament();
  const email = authUser?.email ?? '';

  return (
    <div className="min-h-[100dvh] bg-zinc-100">
      <header className="sticky top-0 z-40 bg-white border-b border-zinc-200 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="HipHop Xứ Trà U16" className="h-9 w-auto" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">Bàn check-in</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="hidden sm:inline font-bold text-zinc-600">{usernameOf(email) ?? email}</span>
          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-1.5 font-bold text-zinc-600 hover:text-zinc-900 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
          >
            <LogOut className="w-3.5 h-3.5" />
            Đăng xuất
          </button>
        </div>
      </header>
      <CheckInView />
    </div>
  );
};
