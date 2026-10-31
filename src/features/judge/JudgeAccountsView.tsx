import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, Mic, RefreshCw, UserPlus } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { changeJudgePin, createJudgeAccount, subscribeJudgePins } from '../../services/judgeAccounts';
import { changeMcPin, createMcAccount, MCS, subscribeMcPins } from '../../services/mcAccounts';
import { useOnlineJudgeIds } from '../../state/useJudgePresence';
import { getJudgeAvatarUrl } from '../../shared/placeholderAssets';
import { VIEW_PATHS } from '../../app/routes';

/** Live PINs of one kind of PIN account (judges, MCs), plus create / change-PIN actions with their busy state. */
function usePinAccounts(
  subscribe: (onChange: (pins: Record<string, string>) => void, onError: (err: Error) => void) => () => void,
  setError: (message: string | null) => void
) {
  const [pins, setPins] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(
    () =>
      subscribe(
        (next) => {
          setPins(next);
          setLoaded(true);
        },
        (err) => setError(err.message)
      ),
    [subscribe, setError]
  );

  const run = async (id: string, action: () => Promise<string>) => {
    setBusyId(id);
    setError(null);
    try {
      await action();
      setRevealed((r) => ({ ...r, [id]: true }));
    } catch (e) {
      setError(`${id.toUpperCase()}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusyId(null);
    }
  };

  const toggle = (id: string) => setRevealed((r) => ({ ...r, [id]: !r[id] }));
  return { pins, loaded, revealed, toggle, busyId, run };
}

/** One account: who, online state (judges), PIN with show / hide, create or change PIN. */
const PinRow: React.FC<{
  avatar: React.ReactNode;
  code: string;
  name: string;
  online?: boolean;
  pin?: string;
  loaded: boolean;
  revealed: boolean;
  onToggle: () => void;
  busy: boolean;
  anyBusy: boolean;
  onCreate: () => void;
  onChangePin: () => void;
}> = ({ avatar, code, name, online, pin, loaded, revealed, onToggle, busy, anyBusy, onCreate, onChangePin }) => (
  <li className="flex items-center gap-3 px-3 sm:px-4 py-3">
    {avatar}
    <div className="min-w-0 flex-1">
      <p className="font-mono text-xs font-black text-amber-600">{code}</p>
      <p className="font-condensed text-lg font-black uppercase leading-tight text-zinc-900 truncate">{name}</p>
    </div>

    {online !== undefined && (
      <span className={`hidden sm:flex items-center gap-1.5 w-20 text-[11px] font-bold ${online ? 'text-emerald-600' : 'text-zinc-400'}`}>
        <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
        {online ? 'Online' : 'Offline'}
      </span>
    )}

    <div className="w-28 flex items-center justify-end gap-1">
      {!loaded ? (
        <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
      ) : pin ? (
        <>
          <span className="font-mono text-lg font-black tracking-widest text-zinc-900 tabular-nums">{revealed ? pin : '••••••'}</span>
          <button
            onClick={onToggle}
            aria-label={revealed ? `Ẩn PIN ${code} ${name}` : `Hiện PIN ${code} ${name}`}
            className="p-1.5 rounded text-zinc-500 hover:bg-zinc-100 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
          >
            {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </>
      ) : (
        <span className="text-xs font-bold text-zinc-400">Chưa có tài khoản</span>
      )}
    </div>

    <div className="w-28 flex justify-end">
      {pin ? (
        <button
          onClick={onChangePin}
          disabled={busy || anyBusy}
          className="flex items-center gap-1.5 rounded border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Đổi PIN
        </button>
      ) : (
        <button
          onClick={onCreate}
          disabled={!loaded || anyBusy}
          className="flex items-center gap-1.5 rounded bg-zinc-900 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-700 disabled:opacity-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
          Tạo tài khoản
        </button>
      )}
    </div>
  </li>
);

/** /admin/cai-dat/giam-khao: create the 9 judge logins and the 2 MC logins, hand out and rotate their PINs. */
export const JudgeAccountsView: React.FC = () => {
  const { judges } = useTournament();
  const onlineIds = useOnlineJudgeIds();
  const [error, setError] = useState<string | null>(null);
  const judgePins = usePinAccounts(subscribeJudgePins, setError);
  const mcPins = usePinAccounts(subscribeMcPins, setError);

  const confirmChange = (who: string) => window.confirm(`Đổi PIN của ${who}? Máy đang đăng nhập bằng PIN cũ sẽ phải đăng nhập lại.`);

  const createMissing = async () => {
    for (const j of judges.filter((j) => !judgePins.pins[j.id])) {
      await judgePins.run(j.id, () => createJudgeAccount(j.id));
    }
  };

  const missingCount = judges.filter((j) => !judgePins.pins[j.id]).length;
  const loginUrl = `${window.location.origin}${VIEW_PATHS.judge}`;
  const mcUrl = `${window.location.origin}${VIEW_PATHS.mc}`;
  const anyBusy = judgePins.busyId !== null || mcPins.busyId !== null;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
            Cài đặt
          </span>
          <h1 className="font-condensed font-black text-2xl sm:text-3xl text-zinc-900 tracking-tight mt-1 uppercase">
            Tài khoản giám khảo & MC
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Giám khảo mở <b className="text-zinc-800">{loginUrl}</b>, chọn mã GK và nhập PIN 6 số bên dưới.
          </p>
        </div>
        {judgePins.loaded && missingCount > 0 && (
          <button
            onClick={createMissing}
            disabled={anyBusy}
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

      <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white" aria-label="Giám khảo">
        {judges.map((j) => (
          <PinRow
            key={j.id}
            avatar={<img src={getJudgeAvatarUrl(j)} alt="" className="w-10 h-10 rounded-full object-cover bg-zinc-100 shrink-0" />}
            code={j.code}
            name={j.judgeName || j.name.split('•')[1]?.trim() || j.code}
            online={onlineIds.has(j.id)}
            pin={judgePins.pins[j.id]}
            loaded={judgePins.loaded}
            revealed={Boolean(judgePins.revealed[j.id])}
            onToggle={() => judgePins.toggle(j.id)}
            busy={judgePins.busyId === j.id}
            anyBusy={anyBusy}
            onCreate={() => judgePins.run(j.id, () => createJudgeAccount(j.id))}
            onChangePin={() => confirmChange(j.code) && judgePins.run(j.id, () => changeJudgePin(j.id, judgePins.pins[j.id]))}
          />
        ))}
      </ul>

      {/* MCs: same PIN login, at /mc */}
      <section className="space-y-2">
        <div>
          <h2 className="font-condensed font-black text-xl uppercase text-zinc-900">Tài khoản MC</h2>
          <p className="text-xs text-zinc-500">
            MC mở <b className="text-zinc-800">{mcUrl}</b>, chọn tên và nhập PIN. Trên màn MC, mỗi MC tự chọn bảng mình dẫn (đổi qua lại được).
          </p>
        </div>
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white" aria-label="MC">
          {MCS.map((m) => (
            <PinRow
              key={m.id}
              avatar={
                <span className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <Mic className="w-5 h-5" />
                </span>
              }
              code="MC"
              name={m.name}
              pin={mcPins.pins[m.id]}
              loaded={mcPins.loaded}
              revealed={Boolean(mcPins.revealed[m.id])}
              onToggle={() => mcPins.toggle(m.id)}
              busy={mcPins.busyId === m.id}
              anyBusy={anyBusy}
              onCreate={() => mcPins.run(m.id, () => createMcAccount(m.id))}
              onChangePin={() => confirmChange(`MC ${m.name}`) && mcPins.run(m.id, () => changeMcPin(m.id, mcPins.pins[m.id]))}
            />
          ))}
        </ul>
      </section>
    </div>
  );
};
