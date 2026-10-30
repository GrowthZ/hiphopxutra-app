import React, { useMemo, useState } from 'react';
import { Search, UserCheck, Undo2, Loader2, X, CheckCircle2, UserPlus } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { checkInDancer, undoCheckIn, isIssuedSbd, registerWalkIn } from '../../services/firestore';
import { getDancerAvatarUrl } from '../../shared/placeholderAssets';
import { CategoryType, Dancer } from '../../domain/types';

type StatusFilter = 'all' | 'pending' | 'done';
type WalkInCategory = CategoryType | 'both';

// Diacritic-insensitive search: "minh nhat" matches "Minh Nhật".
const normalize = (s = '') =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

// Phones: no autofocus (it would pop the keyboard over the list). Inputs are 16px there, or iOS zooms in.
const finePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;

const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

/** desk: the check-in staff app. The title lives in its app bar and the filters stick under it on phones. */
export const CheckInView: React.FC<{ desk?: boolean }> = ({ desk = false }) => {
  const { newbieDancers, proDancers, storageConfig, prelimPanels } = useTournament();
  const [category, setCategory] = useState<CategoryType>('newbie_1v1');
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lastIssued, setLastIssued] = useState<{ id: string; name: string; sbd: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkIn, setWalkIn] = useState({ name: '', realName: '', crew: '', category: 'newbie_1v1' as WalkInCategory, checkIn: true });
  const [walkInBusy, setWalkInBusy] = useState(false);

  const listOf = (cat: CategoryType) => (cat === 'newbie_1v1' ? newbieDancers : proDancers);
  const dancers = listOf(category);
  const countDone = (list: Dancer[]) => list.filter((d) => d.checkedInAt).length;

  // Clubs arrive as a group: filter by crew. Spelling varies ("Clb ..." / "CLB ..."), so group by normalized name.
  const [crew, setCrew] = useState('');
  const crews = useMemo(() => {
    const groups = new Map<string, { label: string; total: number; done: number }>();
    for (const d of [...newbieDancers, ...proDancers]) {
      if (!d.crew?.trim()) continue;
      const key = normalize(d.crew);
      const g = groups.get(key) ?? { label: d.crew.trim(), total: 0, done: 0 };
      g.total += 1;
      if (d.checkedInAt) g.done += 1;
      groups.set(key, g);
    }
    return [...groups.entries()].sort((a, b) => a[1].label.localeCompare(b[1].label, 'vi'));
  }, [newbieDancers, proDancers]);

  const visible = useMemo(() => {
    const q = normalize(query);
    return dancers
      .filter((d) => (status === 'pending' ? !d.checkedInAt : status === 'done' ? Boolean(d.checkedInAt) : true))
      .filter((d) => !crew || normalize(d.crew) === crew)
      .filter((d) => !q || [d.name, d.realName, d.checkedInAt ? d.sbd : ''].some((f) => normalize(f).includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [dancers, status, query, crew]);

  // Check-in hands out the SBD and the prelim panel (A / B by the number's parity) together.
  const issueSbd = async (cat: CategoryType, dancerId: string) => {
    const highestIssued = Math.max(0, ...listOf(cat).filter((d) => isIssuedSbd(cat, d.sbd)).map((d) => Number(d.sbd.slice(1))));
    const { sbd, panel } = await checkInDancer(cat, dancerId, highestIssued, prelimPanels.aIsOdd);
    return `${sbd} · Bảng ${panel}`;
  };

  // Walk-in: a dancer who didn't pre-register signs up at the desk (and usually gets a number right away).
  const handleWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cats: CategoryType[] = walkIn.category === 'both' ? ['newbie_1v1', 'pro_2v2'] : [walkIn.category];
    const key = normalize(walkIn.name).replace(/\s+/g, ' ');
    const duplicate = cats.find((cat) => listOf(cat).some((d) => normalize(d.name) === key));
    if (duplicate) {
      setError(`${walkIn.name.toUpperCase()} đã có trong danh sách ${duplicate === 'newbie_1v1' ? 'Newbie' : 'Pro'}: tìm tên để check-in.`);
      setCategory(duplicate);
      setStatus('all');
      setQuery(walkIn.name);
      return;
    }
    setWalkInBusy(true);
    setError(null);
    try {
      const sbds: string[] = [];
      let firstId = '';
      for (const cat of cats) {
        const id = await registerWalkIn(cat, walkIn);
        firstId ||= id;
        if (walkIn.checkIn) sbds.push(await issueSbd(cat, id));
      }
      const name = walkIn.name.trim().toUpperCase();
      setLastIssued(sbds.length ? { id: firstId, name, sbd: sbds.join(' · ') } : null);
      if (!sbds.length) setQuery(name);
      setWalkIn((w) => ({ ...w, name: '', realName: '', crew: '' }));
      setWalkInOpen(false);
    } catch (err) {
      setError(`Không đăng ký được: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setWalkInBusy(false);
    }
  };

  const handleCheckIn = async (dancer: Dancer) => {
    setBusyId(dancer.id);
    setError(null);
    try {
      const sbd = await issueSbd(category, dancer.id);
      setLastIssued({ id: dancer.id, name: dancer.name, sbd });
      setQuery('');
    } catch (e) {
      setError(`Không check-in được ${dancer.name}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleUndo = async (dancer: Dancer) => {
    setBusyId(dancer.id);
    setError(null);
    try {
      await undoCheckIn(category, dancer.id);
      if (lastIssued?.id === dancer.id) setLastIssued(null);
    } catch (e) {
      setError(`Không huỷ được check-in: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusyId(null);
    }
  };

  // Enter in the search box checks in the only remaining match — fast desk workflow.
  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const pending = visible.filter((d) => !d.checkedInAt);
    if (e.key === 'Enter' && query && pending.length === 1) handleCheckIn(pending[0]);
  };

  return (
    <div
      className={`mx-auto max-w-5xl space-y-4 px-4 py-4 sm:space-y-5 sm:p-6 ${
        lastIssued || error ? 'pb-40 sm:pb-6' : 'pb-[max(1.5rem,env(safe-area-inset-bottom))]'
      }`}
    >
      {/* Header: the desk app has its title in the app bar */}
      <div className={`flex items-end justify-between gap-3 ${desk ? '' : 'border-b border-zinc-200 pb-3 sm:pb-4'}`}>
        {!desk && (
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
              Bàn check-in BTC
            </span>
            <h1 className="font-condensed font-black text-2xl sm:text-3xl text-zinc-900 tracking-tight mt-1 uppercase">
              Check-in thí sinh
            </h1>
          </div>
        )}
        <button
          onClick={() => setWalkInOpen((o) => !o)}
          aria-expanded={walkInOpen}
          className={`flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-3 sm:py-2.5 text-sm sm:text-xs font-black uppercase text-zinc-950 hover:bg-amber-400 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-zinc-900 ${
            desk ? 'w-full sm:ml-auto sm:w-auto' : ''
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Đăng ký tại chỗ
        </button>
      </div>

      {walkInOpen && (
        <form onSubmit={handleWalkIn} className="rounded-2xl border border-amber-300 bg-amber-50/50 p-3 sm:p-4 space-y-3">
          <h2 className="text-sm font-black uppercase text-zinc-900">Đăng ký thí sinh tại chỗ</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ['name', 'Tên thi đấu *', 'vd. Bboy Kenz'],
                ['realName', 'Họ và tên', 'không bắt buộc'],
                ['crew', 'CLB / Đội', 'không bắt buộc'],
              ] as const
            ).map(([key, label, placeholder]) => (
              <label key={key} className="block space-y-1">
                <span className="text-xs font-bold text-zinc-600">{label}</span>
                <input
                  value={walkIn[key]}
                  onChange={(e) => setWalkIn((w) => ({ ...w, [key]: e.target.value }))}
                  placeholder={placeholder}
                  required={key === 'name'}
                  maxLength={60}
                  autoFocus={key === 'name'}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 sm:py-2 text-base sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-2 focus-visible:outline-amber-500"
                />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex w-full rounded-xl border border-zinc-200 bg-white p-0.5 sm:w-auto" role="radiogroup" aria-label="Hạng mục đăng ký">
              {(
                [
                  ['newbie_1v1', 'Newbie'],
                  ['pro_2v2', 'Pro'],
                  ['both', 'Cả 2'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={walkIn.category === id}
                  onClick={() => setWalkIn((w) => ({ ...w, category: id }))}
                  className={`flex-1 rounded-lg px-3 py-2.5 sm:py-2 text-xs font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 sm:flex-none ${
                    walkIn.category === id ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 py-1 text-sm sm:text-xs font-bold text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={walkIn.checkIn}
                onChange={(e) => setWalkIn((w) => ({ ...w, checkIn: e.target.checked }))}
                className="w-5 h-5 sm:w-4 sm:h-4 accent-zinc-900"
              />
              Check-in và cấp SBD luôn
            </label>
            <div className="flex w-full gap-2 sm:w-auto sm:ml-auto">
              <button
                type="button"
                onClick={() => setWalkInOpen(false)}
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 sm:py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 sm:flex-none"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={walkInBusy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2.5 sm:py-2 text-xs font-black uppercase text-white hover:bg-zinc-700 disabled:opacity-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 sm:flex-none"
              >
                {walkInBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                Đăng ký
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Last issued SBD + errors: pinned to the bottom on phones so they stay in view while scrolling */}
      {(lastIssued || error) && (
        <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 space-y-2 sm:static sm:space-y-5">
          {/* Last issued SBD: big enough to copy onto the bib */}
          {lastIssued && (
            <div
              aria-live="polite"
              className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 shadow-lg sm:shadow-none"
            >
              <div className="flex min-w-0 items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-emerald-800">Đã check-in {lastIssued.name}</p>
                  <p className="font-condensed font-black text-3xl sm:text-4xl leading-none text-zinc-900 tabular-nums">{lastIssued.sbd}</p>
                </div>
              </div>
              <button
                onClick={() => setLastIssued(null)}
                aria-label="Đóng thông báo"
                className="p-3 sm:p-2 rounded text-emerald-700 hover:bg-emerald-100 cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 shadow-lg sm:shadow-none">
              {error}
            </p>
          )}
        </div>
      )}

      {/* Category, with check-in progress */}
      <div className="grid grid-cols-2 rounded-xl bg-zinc-200/70 p-1 text-sm font-bold" role="group" aria-label="Hạng mục">
        {(
          [
            ['newbie_1v1', 'Newbie'],
            ['pro_2v2', 'Pro'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setCategory(id)}
            aria-pressed={category === id}
            className={`rounded-lg py-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 ${
              category === id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
            }`}
          >
            {label}{' '}
            <span className="font-normal tabular-nums text-zinc-500">
              {countDone(listOf(id))}/{listOf(id).length}
            </span>
          </button>
        ))}
      </div>

      {/* Filters: search sticks under the app bar on phones */}
      <div className="flex flex-col md:flex-row gap-2 sm:gap-3">
        <div
          className={`relative flex-1 ${
            desk
              ? 'sticky top-[calc(3.5rem+1px+env(safe-area-inset-top))] z-20 -mx-4 bg-zinc-50/95 px-4 py-2 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none'
              : ''
          }`}
        >
          <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 ${desk ? 'left-7 sm:left-3' : 'left-3'}`} />
          <input
            type="search"
            autoFocus={finePointer}
            enterKeyHint="go"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Tìm theo tên, tên thật hoặc SBD…"
            aria-label="Tìm thí sinh"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-base sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-2 focus:outline-amber-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1" role="group" aria-label="Trạng thái check-in">
            {(
              [
                ['pending', 'Chưa check-in'],
                ['done', 'Đã check-in'],
                ['all', 'Tất cả'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setStatus(id)}
                aria-pressed={status === id}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 ${
                  status === id ? 'bg-zinc-900 text-white' : 'border border-zinc-200 bg-white text-zinc-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <select
            value={crew}
            onChange={(e) => setCrew(e.target.value)}
            aria-label="Lọc theo CLB / Crew"
            className="min-w-0 basis-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm sm:text-xs font-bold text-zinc-900 cursor-pointer sm:basis-auto sm:max-w-56"
          >
            <option value="">Tất cả CLB / Crew</option>
            {crews.map(([key, g]) => (
              <option key={key} value={key}>
                {g.label} ({g.done}/{g.total})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {visible.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-zinc-500">
            {query ? `Không có thí sinh nào khớp “${query}”.` : 'Không có thí sinh nào trong danh sách này.'}
          </li>
        )}
        {visible.map((d) => {
          const busy = busyId === d.id;
          const hasNumber = isIssuedSbd(category, d.sbd);
          return (
            <li
              key={d.id}
              className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 ${lastIssued?.id === d.id ? 'bg-emerald-50' : ''}`}
            >
              {/* Phones: no avatar, the name needs the width */}
              <img loading="lazy" decoding="async"
                src={getDancerAvatarUrl(d, storageConfig.placeholders)}
                alt=""
                className="hidden sm:block w-11 h-11 rounded-full object-cover bg-zinc-100 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="font-condensed font-black text-lg uppercase leading-tight text-zinc-900 truncate">{d.name}</p>
                <p className="text-xs text-zinc-500 truncate">
                  {[d.realName, d.crew, d.gender === 'female' ? 'Nữ' : 'Nam'].filter(Boolean).join(' · ')}
                </p>
              </div>

              <div className="w-16 sm:w-20 text-center shrink-0">
                {d.checkedInAt ? (
                  <>
                    <span className="block font-condensed font-black text-2xl leading-none text-zinc-900 tabular-nums">{d.sbd}</span>
                    {d.panel && (
                      <span
                        className={`mt-0.5 inline-block rounded px-1.5 text-[11px] font-black ${
                          d.panel === 'A' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        Bảng {d.panel}
                      </span>
                    )}
                  </>
                ) : hasNumber ? (
                  <span className="text-[11px] font-bold text-zinc-400" title="Đã huỷ check-in, check-in lại sẽ dùng lại số này">
                    giữ số {d.sbd}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-zinc-400">Chưa có SBD</span>
                )}
              </div>

              <div className="flex justify-end shrink-0 sm:w-32">
                {d.checkedInAt ? (
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-[11px] font-bold text-emerald-700 tabular-nums">✓ {formatTime(d.checkedInAt)}</span>
                    <button
                      onClick={() => handleUndo(d)}
                      disabled={busy}
                      aria-label={`Huỷ check-in ${d.name}`}
                      title="Huỷ check-in"
                      className="p-3 sm:p-2 rounded text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleCheckIn(d)}
                    disabled={busy}
                    className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3 sm:px-4 py-3 sm:py-2.5 text-xs font-black uppercase text-zinc-950 hover:bg-amber-400 disabled:opacity-60 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-zinc-900"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                    Check-in
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
