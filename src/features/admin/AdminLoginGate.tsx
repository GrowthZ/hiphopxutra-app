import React, { useState } from 'react';
import { LogIn, LogOut, ShieldAlert, Loader2 } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { EVENT_ID } from '../../services/firestore';
import { auth } from '../../services/firebase';

/** Shown instead of /admin/* until a whitelisted Google account is signed in. */
export const AdminLoginGate: React.FC = () => {
  const { authReady, authUser, syncError, handleGoogleLogin, handleGoogleLogout } = useTournament();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setError(null);
    try {
      await handleGoogleLogin();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đăng nhập thất bại');
    }
  };

  // Organizer accounts (BTC): email/password, created by an admin and whitelisted like Google admins.
  const signInWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      setError(
        code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found'
          ? 'Sai email hoặc mật khẩu.'
          : code === 'auth/too-many-requests'
            ? 'Thử sai quá nhiều lần. Đợi một lúc rồi thử lại.'
            : err instanceof Error ? err.message : 'Đăng nhập thất bại'
      );
    } finally {
      setBusy(false);
    }
  };

  const signedInNonAdmin = authUser && !authUser.isAnonymous;

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-zinc-50 p-6 space-y-5">
        <div className="space-y-3">
          <img src="/logo.png" alt="HipHop Xứ Trà U16" className="h-16 w-auto" />
          <h1 className="font-condensed text-3xl font-black uppercase">Bảng điều hành</h1>
        </div>

        {!authReady ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang kiểm tra đăng nhập…</span>
          </div>
        ) : signedInNonAdmin && syncError ? (
          <p className="text-sm text-red-300">
            Không kiểm tra được quyền admin vì chưa kết nối được Firestore. Xem mục “Firestore” trong HUONG-DAN-CHAY.md.
          </p>
        ) : signedInNonAdmin ? (
          <div className="space-y-4">
            <div className="flex gap-2 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-800">
              <ShieldAlert className="w-5 h-5 shrink-0 text-red-400" />
              <p>
                Tài khoản <b>{authUser.email}</b> chưa có quyền admin. Nhờ admin thêm email này vào{' '}
                <code className="text-xs">events/{EVENT_ID}/admins</code> trên Firestore.
              </p>
            </div>
            <button
              onClick={handleGoogleLogout}
              className="w-full flex items-center justify-center gap-2 rounded bg-zinc-100 px-4 py-3 text-sm font-bold hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-amber-400 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất, dùng tài khoản khác
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <form onSubmit={signInWithPassword} className="space-y-2">
              <input
                type="email"
                autoComplete="username"
                placeholder="Email BTC"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2.5 text-sm placeholder:text-zinc-500 focus-visible:outline-2 focus-visible:outline-amber-400"
              />
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2.5 text-sm placeholder:text-zinc-500 focus-visible:outline-2 focus-visible:outline-amber-400"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 rounded bg-amber-500 px-4 py-3 text-sm font-black uppercase text-zinc-950 hover:bg-amber-400 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-amber-600 transition-colors cursor-pointer"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                Đăng nhập
              </button>
            </form>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span className="h-px flex-1 bg-zinc-100" />
              hoặc
              <span className="h-px flex-1 bg-zinc-100" />
            </div>
            <button
              onClick={signIn}
              className="w-full flex items-center justify-center gap-2 rounded bg-zinc-100 px-4 py-3 text-sm font-bold hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-amber-400 transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Đăng nhập bằng Google
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-300">{error}</p>}
      </div>
    </div>
  );
};
