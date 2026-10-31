import React, { useEffect, useState } from 'react';
import { ArrowLeft, Delete, Loader2, Lock, UserRound } from 'lucide-react';
import { lockRemainingMs } from '../services/judgeAccounts';

const PIN_LENGTH = 6;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export interface PinAccount {
  id: string;
  code: string; // 'GK 01', 'MC'
  name: string;
  avatarUrl?: string;
}

/** Judge and MC login: pick who you are, then type the 6-digit PIN from the organizers. */
export const PinLoginScreen: React.FC<{
  portal: string; // 'Cổng giám khảo'
  question: string; // 'Bạn là giám khảo nào?'
  accounts: PinAccount[];
  signIn: (id: string, pin: string) => Promise<void>;
  notice?: string | null;
  /** localStorage key: the account picked last time is ready again, so only the PIN is needed. */
  rememberKey: string;
}> = ({ portal, question, accounts, signIn, notice, rememberKey }) => {
  const [accountId, setAccountIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(rememberKey);
    } catch {
      return null;
    }
  });
  const setAccountId = (id: string | null) => {
    setAccountIdState(id);
    try {
      if (id) localStorage.setItem(rememberKey, id);
    } catch {
      // private mode: nothing remembered
    }
  };
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockMs, setLockMs] = useState(lockRemainingMs);

  useEffect(() => {
    if (lockMs <= 0) return;
    const timer = setInterval(() => setLockMs(lockRemainingMs()), 1000);
    return () => clearInterval(timer);
  }, [lockMs]);

  const submit = async (fullPin: string) => {
    if (!accountId) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(accountId, fullPin);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPin('');
      setLockMs(lockRemainingMs());
    } finally {
      setBusy(false);
    }
  };

  const press = (key: string) => {
    if (busy || lockMs > 0) return;
    if (key === 'del') return setPin((p) => p.slice(0, -1));
    const next = (pin + key).slice(0, PIN_LENGTH);
    setPin(next);
    if (next.length === PIN_LENGTH) submit(next);
  };

  const account = accounts.find((a) => a.id === accountId);
  const avatar = (a: PinAccount, size: string) =>
    a.avatarUrl ? (
      <img src={a.avatarUrl} alt="" className={`${size} rounded-full object-cover bg-zinc-100`} />
    ) : (
      <span className={`${size} rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center`}>
        <UserRound className="w-1/2 h-1/2" />
      </span>
    );

  return (
    <div className="min-h-[100dvh] bg-white text-zinc-900 flex flex-col items-center px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-sm flex flex-col gap-6 flex-1">
        <header className="flex items-center gap-3">
          <img src="/logo.png" alt="HipHop Xứ Trà U16" className="h-14 w-auto" />
          <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider">{portal}</p>
        </header>

        {notice && (
          <p role="alert" className="rounded border border-amber-300 bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
            {notice}
          </p>
        )}

        {!account ? (
          <section className="space-y-3">
            <h1 className="font-condensed font-black text-3xl uppercase">{question}</h1>
            <div className={`grid gap-2 ${accounts.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {accounts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setAccountId(a.id);
                    setPin('');
                    setError(null);
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-3 hover:border-amber-500 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
                >
                  {avatar(a, accounts.length <= 2 ? 'w-16 h-16' : 'w-12 h-12')}
                  <span className="font-mono text-xs font-black text-amber-600">{a.code}</span>
                  <span className="w-full truncate text-[11px] font-bold uppercase text-zinc-700">{a.name}</span>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="flex flex-col gap-5 flex-1">
            <button
              onClick={() => setAccountId(null)}
              className="self-start flex items-center gap-1.5 text-sm font-bold text-zinc-500 hover:text-zinc-900 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
            >
              <ArrowLeft className="w-4 h-4" />
              Chọn lại
            </button>

            <div className="flex items-center gap-3">
              <span className="rounded-full border-2 border-amber-500">{avatar(account, 'w-14 h-14')}</span>
              <div>
                <p className="font-mono text-sm font-black text-amber-600">{account.code}</p>
                <p className="font-condensed font-black text-2xl uppercase leading-tight">{account.name}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-zinc-700 mb-3">Nhập mã PIN 6 số do BTC cấp</p>
              <div className="flex justify-center gap-3" aria-label={`Đã nhập ${pin.length}/${PIN_LENGTH} số`}>
                {Array.from({ length: PIN_LENGTH }, (_, i) => (
                  <span
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 ${i < pin.length ? 'bg-amber-500 border-amber-500' : 'border-zinc-300'}`}
                  />
                ))}
              </div>
              <div className="h-12 mt-3 text-center text-sm" aria-live="polite">
                {busy ? (
                  <span className="inline-flex items-center gap-2 text-zinc-700">
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang đăng nhập…
                  </span>
                ) : lockMs > 0 ? (
                  <span className="inline-flex items-center gap-2 font-bold text-red-600">
                    <Lock className="w-4 h-4" /> Sai PIN quá 5 lần. Thử lại sau {Math.ceil(lockMs / 1000)} giây.
                  </span>
                ) : (
                  error && <span className="font-bold text-red-600">{error}</span>
                )}
              </div>
            </div>

            {/* Keypad in the thumb zone */}
            <div className="mt-auto grid grid-cols-3 gap-2">
              {KEYS.map((key, i) =>
                key === '' ? (
                  <span key={i} />
                ) : (
                  <button
                    key={i}
                    onClick={() => press(key)}
                    disabled={busy || lockMs > 0}
                    aria-label={key === 'del' ? 'Xoá số cuối' : key}
                    className="h-16 rounded-lg bg-zinc-50 border border-zinc-200 font-condensed font-black text-3xl hover:bg-zinc-200 active:bg-zinc-300 disabled:opacity-40 transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-2 focus-visible:outline-amber-400"
                  >
                    {key === 'del' ? <Delete className="w-6 h-6" /> : key}
                  </button>
                )
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
