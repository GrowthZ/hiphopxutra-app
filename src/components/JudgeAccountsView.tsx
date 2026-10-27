import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, RefreshCw, UserPlus } from 'lucide-react';
import { useTournament } from '../context/TournamentContext';
import { changeJudgePin, createJudgeAccount, subscribeJudgePins } from '../services/judgeAccounts';
import { useOnlineJudgeIds } from '../hooks/useJudgePresence';
import { getJudgeAvatarUrl } from '../utils/placeholderAssets';
import { VIEW_PATHS } from '../routes';

/** /admin/cai-dat/giam-khao: create the 9 judge logins, hand out and rotate their PINs. */
export const JudgeAccountsView: React.FC = () => {
  const { judges } = useTournament();
  const onlineIds = useOnlineJudgeIds();
  const [pins, setPins] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeJudgePins(
        (next) => {
          setPins(next);
          setLoaded(true);
        },
        (err) => setError(err.message)
      ),
    []
  );

  const run = async (judgeId: string, action: () => Promise<string>) => {
    setBusyId(judgeId);
    setError(null);
    try {
      await action();
      setRevealed((r) => ({ ...r, [judgeId]: true }));
    } catch (e) {
      setError(`${judgeId.toUpperCase()}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleChangePin = (judgeId: string, code: string) => {
    if (!window.confirm(`Đổi PIN của ${code}? Máy đang đăng nhập bằng PIN cũ sẽ phải đăng nhập lại.`)) return;
    run(judgeId, () => changeJudgePin(judgeId, pins[judgeId]));
  };

  const createMissing = async () => {
    for (const j of judges.filter((j) => !pins[j.id])) {
      await run(j.id, () => createJudgeAccount(j.id));
    }
  };

  const missingCount = judges.filter((j) => !pins[j.id]).length;
  const loginUrl = `${window.location.origin}${VIEW_PATHS.judge}`;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
            Cài đặt
          </span>
          <h1 className="font-condensed font-black text-2xl sm:text-3xl text-zinc-900 tracking-tight mt-1 uppercase">
            Tài khoản giám khảo
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Giám khảo mở <b className="text-zinc-800">{loginUrl}</b>, chọn mã GK và nhập PIN 6 số bên dưới.
          </p>
        </div>
        {loaded && missingCount > 0 && (
          <button
            onClick={createMissing}
            disabled={busyId !== null}
            className="flex items-center gap-1.5 rounded bg-amber-500 px-4 py-2.5 text-xs font-black uppercase text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-zinc-900"
          >
            <UserPlus className="w-4 h-4" />
            Tạo {missingCount} tài khoản còn thiếu
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          {error}
        </p>
      )}

      <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
        {judges.map((j) => {
          const pin = pins[j.id];
          const busy = busyId === j.id;
          const online = onlineIds.has(j.id);
          return (
            <li key={j.id} className="flex items-center gap-3 px-3 sm:px-4 py-3">
              <img src={getJudgeAvatarUrl(j)} alt="" className="w-10 h-10 rounded-full object-cover bg-zinc-100 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs font-black text-amber-600">{j.code}</p>
                <p className="font-condensed text-lg font-black uppercase leading-tight text-zinc-900 truncate">
                  {j.judgeName || j.name.split('•')[1]?.trim() || j.code}
                </p>
              </div>

              <span
                className={`hidden sm:flex items-center gap-1.5 w-20 text-[11px] font-bold ${online ? 'text-emerald-600' : 'text-zinc-400'}`}
              >
                <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                {online ? 'Online' : 'Offline'}
              </span>

              <div className="w-28 flex items-center justify-end gap-1">
                {!loaded ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                ) : pin ? (
                  <>
                    <span className="font-mono text-lg font-black tracking-widest text-zinc-900 tabular-nums">
                      {revealed[j.id] ? pin : '••••••'}
                    </span>
                    <button
                      onClick={() => setRevealed((r) => ({ ...r, [j.id]: !r[j.id] }))}
                      aria-label={revealed[j.id] ? `Ẩn PIN ${j.code}` : `Hiện PIN ${j.code}`}
                      className="p-1.5 rounded text-zinc-500 hover:bg-zinc-100 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
                    >
                      {revealed[j.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </>
                ) : (
                  <span className="text-xs font-bold text-zinc-400">Chưa có tài khoản</span>
                )}
              </div>

              <div className="w-28 flex justify-end">
                {pin ? (
                  <button
                    onClick={() => handleChangePin(j.id, j.code)}
                    disabled={busy || busyId !== null}
                    className="flex items-center gap-1.5 rounded border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
                  >
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Đổi PIN
                  </button>
                ) : (
                  <button
                    onClick={() => run(j.id, () => createJudgeAccount(j.id))}
                    disabled={!loaded || busyId !== null}
                    className="flex items-center gap-1.5 rounded bg-zinc-900 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-700 disabled:opacity-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
                  >
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                    Tạo tài khoản
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
