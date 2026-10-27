import React, { useState } from 'react';
import { LogIn, LogOut, ShieldAlert, Loader2 } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { EVENT_ID } from '../../services/firestore';

/** Shown instead of /admin/* until a whitelisted Google account is signed in. */
export const AdminLoginGate: React.FC = () => {
  const { authReady, authUser, syncError, handleGoogleLogin, handleGoogleLogout } = useTournament();
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setError(null);
    try {
      await handleGoogleLogin();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đăng nhập thất bại');
    }
  };

  const signedInNonAdmin = authUser && !authUser.isAnonymous;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-400">HIPHOP XỨ TRÀ 2026</p>
          <h1 className="font-condensed text-3xl font-black uppercase">Bảng điều hành</h1>
        </div>

        {!authReady ? (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang kiểm tra đăng nhập…</span>
          </div>
        ) : signedInNonAdmin && syncError ? (
          <p className="text-sm text-red-300">
            Không kiểm tra được quyền admin vì chưa kết nối được Firestore. Xem mục “Firestore” trong HUONG-DAN-CHAY.md.
          </p>
        ) : signedInNonAdmin ? (
          <div className="space-y-4">
            <div className="flex gap-2 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              <ShieldAlert className="w-5 h-5 shrink-0 text-red-400" />
              <p>
                Tài khoản <b>{authUser.email}</b> chưa có quyền admin. Nhờ admin thêm email này vào{' '}
                <code className="text-xs">events/{EVENT_ID}/admins</code> trên Firestore.
              </p>
            </div>
            <button
              onClick={handleGoogleLogout}
              className="w-full flex items-center justify-center gap-2 rounded bg-zinc-800 px-4 py-3 text-sm font-bold hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-amber-400 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất, dùng tài khoản khác
            </button>
          </div>
        ) : (
          <button
            onClick={signIn}
            className="w-full flex items-center justify-center gap-2 rounded bg-amber-500 px-4 py-3 text-sm font-black uppercase text-zinc-950 hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-white transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            Đăng nhập bằng Google
          </button>
        )}

        {error && <p className="text-sm text-red-300">{error}</p>}
      </div>
    </div>
  );
};
