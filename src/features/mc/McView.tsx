import React, { useEffect, useMemo, useState } from 'react';
import { Check, LogOut, Mic } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { CategoryType, Dancer } from '../../domain/types';
import { PANEL_SIZE, PanelId, panelOfDancer } from '../../domain/model';
import { stripBreakerPrefix } from '../../shared/placeholderAssets';
import { useMcs } from '../../state/useMcs';
import { Avatar, GenderBadge, isScored, QUALIFY, rankForDisplay } from '../guest/PrelimGuestView';

// /mc: the MCs' screen. Each MC picks the prelim panel they call (and swaps when needed):
// who is on the floor now, who is next, the whole running order with the scores once published, and the ranking.
// Reads the published copy, like the guest pages: a score shows once the dancer's 4 judges are all in.

type Tab = PanelId | 'rank';

const CATEGORIES: Record<CategoryType, { label: string; on: string }> = {
  pro_2v2: { label: 'Pro 2vs2', on: 'bg-violet-600 text-white' },
  newbie_1v1: { label: 'Newbie 1vs1', on: 'bg-sky-600 text-white' },
};

// The MC's last tab and category survive a reload (the screen is refreshed often during the show).
const TAB_KEY = 'hiphop_xu_tra_mc_tab';
const CATEGORY_KEY = 'hiphop_xu_tra_mc_category';
const load = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // private mode: nothing remembered
  }
};
const save = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode: nothing remembered
  }
};
const savedTab = (): Tab => {
  const t = load(TAB_KEY);
  return t === 'A' || t === 'B' || t === 'rank' ? t : 'A';
};

export const McView: React.FC = () => {
  const {
    mcAccountId,
    judgeSignOut,
    activeCategory,
    setActiveCategory,
    newbieDancers,
    proDancers,
    prelimPanels,
    isNewbieTop32Locked,
    isProTop32Locked,
  } = useTournament();
  const mc = useMcs().find((m) => m.id === mcAccountId);
  const [tab, setTabState] = useState<Tab>(savedTab);
  const setTab = (t: Tab) => {
    setTabState(t);
    save(TAB_KEY, t);
  };
  const pickCategory = (c: CategoryType) => {
    setActiveCategory(c);
    save(CATEGORY_KEY, c);
  };
  useEffect(() => {
    const c = load(CATEGORY_KEY);
    if (c === 'pro_2v2' || c === 'newbie_1v1') setActiveCategory(c);
  }, [setActiveCategory]);

  const list = activeCategory === 'newbie_1v1' ? newbieDancers : proDancers;
  const locked = activeCategory === 'newbie_1v1' ? isNewbieTop32Locked : isProTop32Locked;

  // Running order of each panel: checked-in dancers (an SBD) by SBD, as the judges score them.
  const order = useMemo(() => {
    const byPanel: Record<PanelId, Dancer[]> = { A: [], B: [] };
    for (const d of list) {
      const panel = d.sbd ? panelOfDancer(d, prelimPanels) : null;
      if (panel) byPanel[panel].push(d);
    }
    for (const p of ['A', 'B'] as const) byPanel[p].sort((a, b) => a.sbd.localeCompare(b.sbd));
    return byPanel;
  }, [list, prelimPanels]);

  const parity = (p: PanelId) => ((p === 'A') === prelimPanels.aIsOdd ? 'lẻ' : 'chẵn');

  return (
    <div className="min-h-[100dvh] bg-zinc-50 text-zinc-900">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/logo.png" alt="HipHop Xứ Trà U16" className="h-10 w-auto" />
            <div className="min-w-0 leading-tight">
              <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-red-600">
                <Mic className="h-3 w-3" /> MC · Vòng loại
              </p>
              <p className="truncate font-condensed text-lg font-black uppercase">{mc?.name ?? 'Ban tổ chức'}</p>
            </div>
          </div>
          <button
            onClick={judgeSignOut}
            aria-label="Đăng xuất"
            title="Đăng xuất"
            className="-mr-2 rounded-full p-2.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-auto max-w-2xl space-y-2 px-4 pb-2">
          {/* Category, in the judges' colours */}
          <div className="grid grid-cols-2 rounded-xl bg-zinc-100 p-1 text-sm font-black uppercase" role="group" aria-label="Hạng mục">
            {(['pro_2v2', 'newbie_1v1'] as const).map((id) => (
              <button
                key={id}
                onClick={() => pickCategory(id)}
                aria-pressed={activeCategory === id}
                className={`rounded-lg py-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 ${
                  activeCategory === id ? CATEGORIES[id].on : 'text-zinc-500'
                }`}
              >
                {CATEGORIES[id].label}
              </button>
            ))}
          </div>
          {/* Panel A / panel B / ranking */}
          <div className="grid grid-cols-3 gap-1" role="tablist" aria-label="Bảng">
            {(['A', 'B', 'rank'] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`rounded-lg border px-2 py-2 text-xs font-black uppercase cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 ${
                  tab === t ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600'
                }`}
              >
                {t === 'rank' ? 'Xếp hạng' : `Bảng ${t} · ${parity(t)}`}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {tab === 'rank' ? <Ranking list={list} locked={locked} panels={prelimPanels} /> : <RunningOrder dancers={order[tab]} panel={tab} />}
      </main>
    </div>
  );
};

/** One panel in SBD order: on the floor now (first without published scores), next up, then everyone. */
const RunningOrder: React.FC<{ dancers: Dancer[]; panel: PanelId }> = ({ dancers, panel }) => {
  const scored = (d: Dancer) => isScored(d, PANEL_SIZE);
  const nowIndex = dancers.findIndex((d) => !scored(d));
  const now = nowIndex >= 0 ? dancers[nowIndex] : null;
  const next = nowIndex >= 0 ? dancers.slice(nowIndex + 1, nowIndex + 3) : [];
  const doneCount = dancers.filter(scored).length;

  if (!dancers.length) {
    return <p className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">Bảng {panel} chưa có thí sinh check-in.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-zinc-500">
        Đã có điểm <span className="tabular-nums text-zinc-900">{doneCount}/{dancers.length}</span> thí sinh · Bảng {panel}
      </p>

      {now ? (
        <section aria-label="Đang lên sàn" className="overflow-hidden rounded-2xl bg-zinc-900 text-white shadow-sm">
          <p className="flex items-center gap-1.5 bg-red-600 px-4 py-1.5 text-[11px] font-black uppercase tracking-wider">
            <span className="h-2 w-2 rounded-full bg-white motion-safe:animate-pulse" /> Đang lên sàn · thứ {nowIndex + 1}
          </p>
          <div className="flex items-center gap-4 p-4">
            <Avatar dancer={now} size="h-20 w-20 text-3xl" dark />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-2xl font-black text-amber-400">{now.sbd}</p>
              <h2 className="font-condensed text-4xl font-black uppercase leading-none break-words">{stripBreakerPrefix(now.name)}</h2>
              <p className="mt-1 flex items-center gap-2 text-sm text-white/70">
                <GenderBadge dancer={now} />
                <span className="truncate">{now.crew}</span>
              </p>
            </div>
          </div>
          {next.length > 0 && (
            <div className="border-t border-white/10 px-4 py-2.5">
              <p className="text-[11px] font-black uppercase tracking-wider text-white/50">Chuẩn bị</p>
              {next.map((d) => (
                <p key={d.id} className="mt-1 flex items-center gap-2 text-base">
                  <span className="font-mono font-black text-amber-400">{d.sbd}</span>
                  <span className="truncate font-condensed text-xl font-black uppercase">{stripBreakerPrefix(d.name)}</span>
                </p>
              ))}
            </div>
          )}
        </section>
      ) : (
        <p className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          <Check className="h-4 w-4" /> Bảng {panel} đã chấm xong
        </p>
      )}

      {/* Whole running order: still to dance / be scored first, then the ones with their score */}
      <ol className="overflow-hidden rounded-2xl border border-zinc-200 bg-white" aria-label={`Thứ tự Bảng ${panel}`}>
        {(
          [
            ['Chưa chấm', dancers.filter((d) => !scored(d))],
            ['Đã chấm', dancers.filter(scored)],
          ] as const
        ).map(([label, group]) =>
          group.length === 0 ? null : (
            <React.Fragment key={label}>
              <li
                aria-hidden
                className="border-t border-zinc-100 bg-zinc-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500 first:border-t-0"
              >
                {label} · {group.length}
              </li>
              {group.map((d) => {
                const isNow = d.id === now?.id;
                const done = scored(d);
                return (
                  <li key={d.id} className={`flex items-center gap-3 border-t border-zinc-100 px-3 py-2.5 ${isNow ? 'bg-red-50' : ''}`}>
                    <span className={`w-6 shrink-0 text-center text-xs font-black tabular-nums ${isNow ? 'text-red-600' : 'text-zinc-400'}`}>
                      {dancers.indexOf(d) + 1}
                    </span>
                    <span className="w-12 shrink-0 font-mono text-sm font-black text-zinc-700">{d.sbd}</span>
                    <Avatar dancer={d} size="h-9 w-9 text-base" />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate font-condensed text-lg font-black uppercase leading-tight ${done ? 'text-zinc-500' : 'text-zinc-900'}`}>
                        {stripBreakerPrefix(d.name)}
                      </span>
                      {d.crew && <span className="block truncate text-xs text-zinc-500">{d.crew}</span>}
                    </span>
                    {done ? (
                      <span className="font-condensed text-2xl font-black tabular-nums text-zinc-900">{d.prelimScoreTotal}</span>
                    ) : isNow ? (
                      <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">Đang lên</span>
                    ) : (
                      <span className="text-[11px] font-bold text-zinc-400">Chờ</span>
                    )}
                  </li>
                );
              })}
            </React.Fragment>
          )
        )}
      </ol>
    </div>
  );
};

/** Both panels together, by total; dancers still being scored last. Provisional until Top 32 is locked. */
const Ranking: React.FC<{ list: Dancer[]; locked: boolean; panels: Parameters<typeof panelOfDancer>[1] }> = ({ list, locked, panels }) => {
  const ranked = useMemo(() => rankForDisplay(list.filter((d) => d.sbd), PANEL_SIZE), [list]);
  const scoredCount = ranked.filter((d) => isScored(d, PANEL_SIZE)).length;

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-zinc-500">
        {locked ? (
          <span className="text-emerald-700">Kết quả chính thức · Top {QUALIFY} vào Battle</span>
        ) : (
          <>
            <span className="text-red-600">Tạm thời</span> · đã có điểm {scoredCount}/{ranked.length} thí sinh
          </>
        )}
      </p>
      <ol className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white" aria-label="Xếp hạng">
        {ranked.map((d, i) => {
          const done = isScored(d, PANEL_SIZE);
          return (
            <React.Fragment key={d.id}>
              {locked && i === QUALIFY && (
                <li className="bg-zinc-50 px-4 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-zinc-400">Dừng ở vòng loại</li>
              )}
              <li className="flex items-center gap-3 px-3 py-2.5">
                <span className="w-7 shrink-0 text-center font-condensed text-lg font-black tabular-nums text-zinc-500">{done ? i + 1 : '–'}</span>
                <span className="w-12 shrink-0 font-mono text-sm font-black text-zinc-700">{d.sbd}</span>
                <span className="min-w-0 flex-1 truncate font-condensed text-lg font-black uppercase">{stripBreakerPrefix(d.name)}</span>
                <span className="shrink-0 rounded bg-zinc-100 px-1.5 text-[10px] font-black text-zinc-500">{panelOfDancer(d, panels)}</span>
                {done ? (
                  <span className="w-12 text-right font-condensed text-2xl font-black tabular-nums">{d.prelimScoreTotal}</span>
                ) : (
                  <span className="w-12 text-right text-[11px] font-bold text-zinc-400">Đang chấm</span>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </div>
  );
};
