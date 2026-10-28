import React, { useEffect, useState } from 'react';
import { Copy, Eye, EyeOff, Loader2, RefreshCw, Shuffle, Trash2, UserPlus } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { StaffRole } from '../../services/firestore';
import {
  createStaffAccount,
  generatePassword,
  removeStaffAccount,
  resetStaffPassword,
  ROLE_LABELS,
  setStaffRole,
  StaffAccount,
  subscribeStaff,
  usernameOf,
} from '../../services/staffAccounts';
import { VIEW_PATHS } from '../../app/routes';

const ROLE_HINTS: Record<StaffRole, string> = {
  admin: 'Toàn quyền điều hành giải',
  checkin: 'Chỉ check-in và đăng ký thí sinh tại chỗ',
};

/** /admin/cai-dat/nguoi-dung: organizer (BTC) logins — username + password, admin or check-in role. */
export const StaffAccountsView: React.FC = () => {
  const { authUser } = useTournament();
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ username: string; password: string } | null>(null);

  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState(generatePassword);
  const [role, setRole] = useState<StaffRole>('checkin');

  useEffect(
    () =>
      subscribeStaff(
        (list) => {
          setAccounts(list);
          setLoaded(true);
        },
        (err) => setError(err.message)
      ),
    []
  );

  const myEmail = authUser?.email?.toLowerCase();
  const adminCount = accounts.filter((a) => a.role === 'admin').length;

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const user = username.trim().toLowerCase();
    run('create', async () => {
      await createStaffAccount(user, password, role, name);
      setCreated({ username: user, password });
      setUsername('');
      setName('');
      setPassword(generatePassword());
    });
  };

  const handleRole = (a: StaffAccount, next: StaffRole) => {
    if (a.role === 'admin' && next !== 'admin' && adminCount <= 1) {
      return setError('Phải còn ít nhất một tài khoản Quản trị.');
    }
    if (a.email === myEmail && next !== 'admin' && !window.confirm('Bạn sẽ mất quyền quản trị ngay. Tiếp tục?')) return;
    run(a.email, () => setStaffRole(a.email, next));
  };

  const handleReset = (a: StaffAccount) => {
    if (!a.password) return;
    if (!window.confirm(`Tạo mật khẩu mới cho ${usernameOf(a.email)}? Máy đang đăng nhập sẽ bị đăng xuất.`)) return;
    run(a.email, async () => {
      await resetStaffPassword(a.email, a.password!);
      setRevealed((r) => ({ ...r, [a.email]: true }));
    });
  };

  const handleRemove = (a: StaffAccount) => {
    if (a.email === myEmail) return setError('Không tự xoá tài khoản đang đăng nhập.');
    if (a.role === 'admin' && adminCount <= 1) return setError('Phải còn ít nhất một tài khoản Quản trị.');
    if (!window.confirm(`Xoá ${usernameOf(a.email) ?? a.email}? Người này mất quyền vào ngay lập tức.`)) return;
    run(a.email, () => removeStaffAccount(a.email, a.password));
  };

  const loginUrl = `${window.location.origin}${VIEW_PATHS.prelim.replace(/\/prelim$/, '')}`;
  const inputClass =
    'w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-2 focus-visible:outline-amber-500';

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div className="border-b border-zinc-200 pb-4">
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
          Cài đặt
        </span>
        <h1 className="font-condensed font-black text-2xl sm:text-3xl text-zinc-900 tracking-tight mt-1 uppercase">
          Người dùng ban tổ chức
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Thành viên mở <b className="text-zinc-800">{loginUrl}</b>, nhập tên đăng nhập và mật khẩu bên dưới.
        </p>
      </div>

      {/* Create */}
      <form onSubmit={handleCreate} className="rounded-lg border border-zinc-200 bg-white p-4 space-y-3">
        <h2 className="text-sm font-black uppercase text-zinc-900">Cấp tài khoản mới</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-bold text-zinc-600">Tên đăng nhập</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              placeholder="vd. hoang, checkin1"
              autoCapitalize="none"
              autoComplete="off"
              required
              pattern="[a-z0-9._\-]{3,30}"
              title="3–30 ký tự: chữ thường không dấu, số, dấu . _ -"
              className={inputClass}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold text-zinc-600">Tên hiển thị (không bắt buộc)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="vd. Anh Hoàng" className={inputClass} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold text-zinc-600">Mật khẩu</span>
            <div className="flex gap-1.5">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                autoComplete="off"
                className={`${inputClass} font-mono`}
              />
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                aria-label="Tạo mật khẩu ngẫu nhiên"
                title="Tạo mật khẩu ngẫu nhiên"
                className="shrink-0 rounded border border-zinc-300 bg-white px-2.5 text-zinc-600 hover:bg-zinc-100 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </div>
          </label>
          <fieldset className="space-y-1">
            <legend className="text-xs font-bold text-zinc-600">Quyền</legend>
            <div className="grid grid-cols-2 gap-1.5">
              {(['checkin', 'admin'] as const).map((r) => (
                <label
                  key={r}
                  className={`rounded border px-3 py-1.5 cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-amber-500 ${
                    role === r ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="sr-only" />
                  <span className="block text-xs font-black uppercase">{ROLE_LABELS[r]}</span>
                  <span className={`block text-[10px] leading-tight ${role === r ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    {ROLE_HINTS[r]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <button
          type="submit"
          disabled={busy !== null}
          className="flex items-center gap-1.5 rounded bg-amber-500 px-4 py-2.5 text-xs font-black uppercase text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-zinc-900"
        >
          {busy === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Cấp tài khoản
        </button>
      </form>

      {created && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span>
            Đã tạo: <b className="font-mono">{created.username}</b> / <b className="font-mono">{created.password}</b>
          </span>
          <button
            onClick={() => navigator.clipboard?.writeText(`Tên đăng nhập: ${created.username}\nMật khẩu: ${created.password}\n${loginUrl}`)}
            className="flex items-center gap-1 rounded border border-emerald-400 bg-white px-2 py-1 text-xs font-bold hover:bg-emerald-100 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" /> Sao chép để gửi
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          {error}
        </p>
      )}

      {/* List */}
      <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
        {!loaded && (
          <li className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
          </li>
        )}
        {accounts.map((a) => {
          const user = usernameOf(a.email);
          const rowBusy = busy === a.email;
          return (
            <li key={a.email} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 sm:px-4 py-3">
              <div className="min-w-0 flex-1 basis-40">
                <p className="font-bold text-zinc-900 truncate">
                  {a.name}
                  {a.email === myEmail && <span className="ml-1.5 text-[10px] font-bold text-amber-600 uppercase">Bạn</span>}
                </p>
                <p className="font-mono text-xs text-zinc-500 truncate">{user ?? `${a.email} · Google`}</p>
              </div>

              <select
                value={a.role}
                onChange={(e) => handleRole(a, e.target.value as StaffRole)}
                disabled={busy !== null}
                aria-label={`Quyền của ${a.name}`}
                className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs font-bold text-zinc-800 cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                {(['admin', 'checkin'] as const).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>

              <div className="w-36 flex items-center justify-end gap-1">
                {a.password ? (
                  <>
                    <span className="font-mono text-sm font-bold text-zinc-900">{revealed[a.email] ? a.password : '••••••••'}</span>
                    <button
                      onClick={() => setRevealed((r) => ({ ...r, [a.email]: !r[a.email] }))}
                      aria-label={revealed[a.email] ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      className="p-1.5 rounded text-zinc-500 hover:bg-zinc-100 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
                    >
                      {revealed[a.email] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-zinc-400">{user ? 'Không lưu mật khẩu' : 'Đăng nhập Google'}</span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {a.password && (
                  <button
                    onClick={() => handleReset(a)}
                    disabled={busy !== null}
                    title="Tạo mật khẩu mới"
                    aria-label={`Tạo mật khẩu mới cho ${a.name}`}
                    className="p-2 rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
                  >
                    {rowBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  </button>
                )}
                <button
                  onClick={() => handleRemove(a)}
                  disabled={busy !== null}
                  title="Xoá tài khoản"
                  aria-label={`Xoá ${a.name}`}
                  className="p-2 rounded border border-zinc-300 bg-white text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
