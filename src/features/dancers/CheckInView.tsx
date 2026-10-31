import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, UserCheck, Undo2, Loader2, X, CheckCircle2, UserPlus, AlertCircle } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { checkInDancer, undoCheckIn, isIssuedSbd, registerWalkIn, walkInName } from '../../services/firestore';
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

// Success toasts stay long enough to copy the SBD onto the bib; errors stay until closed.
const TOAST_MS = 8000;
type Toast = { key: number; kind: 'ok' | 'error'; title: string; sbd?: string };

/** desk: the check-in staff app. The title lives in its app bar and the filters stick under it on phones. */
export const CheckInView: React.FC<{ desk?: boolean }> = ({ desk = false }) => {
  const { newbieDancers, proDancers, storageConfig, prelimPanels } = useTournament();
  const [category, setCategory] = useState<CategoryType>('newbie_1v1');
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkIn, setWalkIn] = useState({
    name: '',
    realName: '',
    crew: '',
    gender: 'male' as Dancer['gender'],
    category: 'newbie_1v1' as WalkInCategory,
    checkIn: true,
  });
  const [walkInBusy, setWalkInBusy] = useState(false);
  const [walkInError, setWalkInError] = useState<string | null>(null);
  // Walk-ins registered at this desk, newest first: pinned to the top of the list whatever the filters.
  const [recent, setRecent] = useState<{ id: string; at: number }[]>([]);

  // Toasts, newest on top.
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastKey = useRef(0);
  const dismiss = (key: number) => setToasts((list) => list.filter((t) => t.key !== key));
  const notify = (toast: Omit<Toast, 'key'>) => {
    const key = ++toastKey.current;
    setToasts((list) => [{ ...toast, key }, ...list].slice(0, 4));
    if (toast.kind === 'ok') setTimeout(() => dismiss(key), TOAST_MS);
  };
  const setError = (title: string) => notify({ kind: 'error', title });

  useEffect(() => {
    if (!walkInOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !walkInBusy && setWalkInOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [walkInOpen, walkInBusy]);

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

  // Recent walk-ins of this category (once synced back), unless a search is on.
  const pinned = useMemo(
    () =>
      query.trim()
        ? []
        : recent.flatMap(({ id, at }) => {
            const d = dancers.find((x) => x.id === id);
            return d ? [{ dancer: d, at }] : [];
          }),
    [recent, dancers, query]
  );

  const visible = useMemo(() => {
    const q = normalize(query);
    const pinnedIds = new Set(pinned.map((p) => p.dancer.id));
    return dancers
      .filter((d) => !pinnedIds.has(d.id))
      .filter((d) => (status === 'pending' ? !d.checkedInAt : status === 'done' ? Boolean(d.checkedInAt) : true))
      .filter((d) => !crew || normalize(d.crew) === crew)
      .filter((d) => !q || [d.name, d.realName, d.checkedInAt ? d.sbd : ''].some((f) => normalize(f).includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [dancers, status, query, crew, pinned]);

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
      // Already on the list: close the form and show the existing entry instead.
      setError(`${walkInName(walkIn.name)} đã có trong danh sách ${duplicate === 'newbie_1v1' ? 'Newbie' : 'Pro'}: tìm tên để check-in.`);
      setCategory(duplicate);
      setStatus('all');
      setQuery(walkIn.name);
      setWalkInOpen(false);
      return;
    }
    setWalkInBusy(true);
    setWalkInError(null);
    try {
      const sbds: string[] = [];
      const ids: string[] = [];
      for (const cat of cats) {
        const id = await registerWalkIn(cat, walkIn);
        ids.push(id);
        if (walkIn.checkIn) sbds.push(await issueSbd(cat, id));
      }
      const name = walkInName(walkIn.name);
      const at = Date.now();
      setRecent((list) => [...ids.map((id) => ({ id, at })), ...list]);
      setCategory(cats[0]);
      setQuery('');
      setHighlightId(ids[0]);
      notify(
        sbds.length
          ? { kind: 'ok', title: `Đã check-in ${name}`, sbd: sbds.join(' · ') }
          : { kind: 'ok', title: `Đã đăng ký ${name}`, sbd: 'Chưa cấp SBD' }
      );
      setWalkIn((w) => ({ ...w, name: '', realName: '', crew: '', gender: 'male' }));
      setWalkInOpen(false);
    } catch (err) {
      setWalkInError(`Không đăng ký được: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setWalkInBusy(false);
    }
  };

  const handleCheckIn = async (dancer: Dancer) => {
    setBusyId(dancer.id);
    try {
      const sbd = await issueSbd(category, dancer.id);
      setHighlightId(dancer.id);
      notify({ kind: 'ok', title: `Đã check-in ${dancer.name}`, sbd });
      setQuery('');
    } catch (e) {
      setError(`Không check-in được ${dancer.name}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleUndo = async (dancer: Dancer) => {
    setBusyId(dancer.id);
    try {
      await undoCheckIn(category, dancer.id);
      if (highlightId === dancer.id) setHighlightId(null);
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
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:space-y-5 sm:p-6">
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
          onClick={() => {
            setWalkInError(null);
            setWalkInOpen(true);
          }}
          aria-haspopup="dialog"
          className={`flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-3 sm:py-2.5 text-sm sm:text-xs font-black uppercase text-zinc-950 hover:bg-amber-400 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-zinc-900 ${
            desk ? 'w-full sm:ml-auto sm:w-auto' : ''
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Đăng ký tại chỗ
        </button>
      </div>

      {/* Toasts: top of the screen, newest first */}
      <div
        aria-live="polite"
        className={`pointer-events-none fixed inset-x-3 z-40 flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-96 ${
          desk ? 'top-[calc(3.5rem+env(safe-area-inset-top)+0.5rem)]' : 'top-20'
        }`}
      >
        {toasts.map((t) => (
          <div
            key={t.key}
            role={t.kind === 'error' ? 'alert' : undefined}
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-lg ${
              t.kind === 'ok' ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              {t.kind === 'ok' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
              )}
              <div className="min-w-0">
                <p className={`text-xs font-bold ${t.kind === 'ok' ? 'truncate text-emerald-800' : 'text-red-700'}`}>{t.title}</p>
                {t.sbd && <p className="font-condensed font-black text-3xl leading-none text-zinc-900 tabular-nums">{t.sbd}</p>}
              </div>
            </div>
            <button
              onClick={() => dismiss(t.key)}
              aria-label="Đóng thông báo"
              className={`shrink-0 rounded p-2 cursor-pointer focus-visible:outline-2 ${
                t.kind === 'ok' ? 'text-emerald-700 hover:bg-emerald-100 focus-visible:outline-emerald-600' : 'text-red-700 hover:bg-red-100 focus-visible:outline-red-600'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Walk-in registration: bottom sheet on phones, dialog on larger screens */}
      {walkInOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 sm:items-center sm:p-4"
          onClick={() => !walkInBusy && setWalkInOpen(false)}
        >
          <form
            onSubmit={handleWalkIn}
            role="dialog"
            aria-modal="true"
            aria-labelledby="walk-in-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg space-y-4 rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
          >
            <div className="flex items-center justify-between">
              <h2 id="walk-in-title" className="font-condensed text-2xl font-black uppercase text-zinc-900">
                Đăng ký tại chỗ
              </h2>
              <button
                type="button"
                onClick={() => setWalkInOpen(false)}
                disabled={walkInBusy}
                aria-label="Đóng"
                className="-m-1 rounded-full p-2 text-zinc-400 hover:bg-zinc-100 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-bold text-zinc-600">BBoy / BGirl</span>
                <select
                  value={walkIn.gender}
                  onChange={(e) => setWalkIn((w) => ({ ...w, gender: e.target.value as Dancer['gender'] }))}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 sm:py-2 text-base sm:text-sm font-bold text-zinc-900 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
                >
                  <option value="male">BBoy</option>
                  <option value="female">BGirl</option>
                </select>
              </label>
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
                    onChange={(e) => {
                      const value = e.target.value;
                      // A name typed as "Bgirl ..." / "Bboy ..." picks BGirl / BBoy (still changeable after).
                      const prefix = key === 'name' ? /^\s*b-?\s?(girl|boy)\b/i.exec(value)?.[1].toLowerCase() : undefined;
                      setWalkIn((w) => ({ ...w, [key]: value, ...(prefix ? { gender: prefix === 'girl' ? 'female' : 'male' } : {}) }));
                    }}
                    placeholder={placeholder}
                    required={key === 'name'}
                    maxLength={60}
                    autoFocus={key === 'name'}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 sm:py-2 text-base sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-2 focus-visible:outline-amber-500"
                  />
                </label>
              ))}
            </div>
            <div className="space-y-3">
              <div className="flex w-full rounded-xl border border-zinc-200 bg-white p-0.5" role="radiogroup" aria-label="Hạng mục đăng ký">
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
                    className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 ${
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
            </div>
            {walkInError && (
              <p role="alert" className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                {walkInError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setWalkInOpen(false)}
                disabled={walkInBusy}
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={walkInBusy}
                className="flex flex-[2] items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-black uppercase text-white hover:bg-zinc-700 disabled:opacity-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                {walkInBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                Đăng ký
              </button>
            </div>
          </form>
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
        {visible.length + pinned.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-zinc-500">
            {query ? `Không có thí sinh nào khớp “${query}”.` : 'Không có thí sinh nào trong danh sách này.'}
          </li>
        )}
        {[...pinned, ...visible.map((dancer) => ({ dancer, at: 0 }))].map(({ dancer: d, at }, i) => {
          const busy = busyId === d.id;
          const hasNumber = isIssuedSbd(category, d.sbd);
          return (
            <React.Fragment key={d.id}>
              {i === 0 && at > 0 && (
                <li className="bg-amber-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-800">Mới đăng ký tại chỗ</li>
              )}
              {i === pinned.length && i > 0 && (
                <li className="bg-zinc-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-400">Danh sách</li>
              )}
              <li
                className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 ${
                  highlightId === d.id ? 'bg-emerald-50' : at > 0 ? 'bg-amber-50/40' : ''
                }`}
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
                    {at > 0 && <span className="font-bold text-amber-700">Đăng ký {formatTime(at)} · </span>}
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
            </React.Fragment>
          );
        })}
      </ul>
    </div>
  );
};
