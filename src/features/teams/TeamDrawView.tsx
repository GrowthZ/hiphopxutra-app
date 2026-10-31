import React, { useEffect, useMemo, useState } from 'react';
import { useTournament } from '../../state/TournamentContext';
import { Dancer, Team2v2 } from '../../domain/types';
import { Camera, Download, ExternalLink, GitFork, RotateCcw, Save, Shuffle, Upload } from 'lucide-react';
import { exportToCSV, downloadCSV } from '../../services/googleSheets';
import { TeamPhotoUploadModal } from './TeamPhotoUploadModal';
import { getTeamPhotoUrl } from '../../shared/placeholderAssets';
import { TeamThumb } from '../../shared/TeamPhoto';
import { openInNewTab } from '../../app/routes';

const TEAMS = 16;
const pad = (n: number) => String(n).padStart(2, '0');
const lineupOf = (teams: Team2v2[]) =>
  Array.from({ length: TEAMS * 2 }, (_, i) => {
    const t = teams.find((x) => x.teamNumber === Math.floor(i / 2) + 1);
    return (i % 2 === 0 ? t?.dancer1?.id : t?.dancer2?.id) ?? '';
  });

/**
 * /admin/boc-tham: the Pro 2vs2 teams are drawn live on stage, then entered here, two dancers per team. Saving draws
 * the Top 16 in team order: team 1 vs team 2, 3 vs 4, ... 15 vs 16 (and the public bracket follows).
 */
export const TeamDrawView: React.FC = () => {
  const { proDancers, proTeams, matches, isProTop32Locked, saveProLineup, setActiveView, syncWithGoogleSheet, sheetConfig, storageConfig } =
    useTournament();
  const [selectedTeamForPhoto, setSelectedTeamForPhoto] = useState<Team2v2 | null>(null);

  const saved = useMemo(() => lineupOf(proTeams), [proTeams]);
  const [draft, setDraft] = useState<string[]>(saved);
  const dirty = draft.some((id, i) => id !== saved[i]);
  useEffect(() => {
    if (!dirty) setDraft(saved);
    // Only follow the saved lineup while nothing is being edited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  // The Top 32 first (in prelim order), then the others for a replacement.
  const qualified = (d: Dancer, i: number) => (isProTop32Locked ? Boolean(d.isQualifiedTop32) : i < 32);
  const top = proDancers.filter(qualified);
  const others = proDancers.filter((d, i) => !qualified(d, i));
  const slotOf = new Map(draft.map((id, i) => [id, i] as const).filter(([id]) => id));
  const filled = draft.filter(Boolean).length;
  const duplicates = draft.filter((id, i) => id && draft.indexOf(id) !== i).length;
  const started = matches.some(
    (m) => m.category === 'pro_2v2' && (m.status !== 'upcoming' || m.rounds.some((r) => r.isConfirmed || Object.values(r.votes).some(Boolean)))
  );

  const setSlot = (slot: number, id: string) => setDraft((d) => d.map((x, i) => (i === slot ? id : x)));
  const randomFill = () => {
    const pool = [...top.slice(0, TEAMS * 2)].sort(() => Math.random() - 0.5).map((d) => d.id);
    setDraft(Array.from({ length: TEAMS * 2 }, (_, i) => pool[i] ?? ''));
  };
  const save = () => {
    if (started && !window.confirm('Nhánh Pro đã có trận đấu hoặc phiếu chấm. Lưu sẽ tạo lại nhánh Top 16 và xoá các kết quả đó. Tiếp tục?')) return;
    saveProLineup(Array.from({ length: TEAMS }, (_, t) => [draft[2 * t], draft[2 * t + 1]] as [string, string]));
  };

  const handleExportTeamsCSV = () => {
    const header = ['Số Đội', 'Tên Đội', 'Ảnh Team URL', 'SBD Dancer 1', 'Tên Dancer 1', 'CLB 1', 'SBD Dancer 2', 'Tên Dancer 2', 'CLB 2'];
    const rows = proTeams.map((t) => [
      t.teamNumber,
      t.name,
      t.teamPhotoUrl || '',
      t.dancer1.sbd,
      t.dancer1.name,
      t.dancer1.crew || '',
      t.dancer2.sbd,
      t.dancer2.name,
      t.dancer2.crew || '',
    ]);
    downloadCSV('danh_sach_16_doi_pro_2vs2.csv', exportToCSV([header, ...rows]));
  };

  const option = (d: Dancer) => {
    const at = slotOf.get(d.id);
    return (
      <option key={d.id} value={d.id}>
        {d.sbd} · {d.name}
        {at !== undefined ? ` · Đội ${pad(Math.floor(at / 2) + 1)}` : ''}
      </option>
    );
  };
  const dancerSelect = (slot: number) => {
    const id = draft[slot];
    const clash = id && draft.indexOf(id) !== slot;
    return (
      <select
        value={id}
        onChange={(e) => setSlot(slot, e.target.value)}
        aria-label={`Đội ${pad(Math.floor(slot / 2) + 1)} · thí sinh ${(slot % 2) + 1}`}
        className={`w-full min-w-0 rounded border bg-white px-2 py-1.5 text-xs font-bold text-zinc-900 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 ${
          clash ? 'border-red-500 bg-red-50' : id !== saved[slot] ? 'border-amber-400 bg-amber-50' : 'border-zinc-300'
        }`}
      >
        <option value="">— Chọn thí sinh —</option>
        <optgroup label="Top 32">{top.map(option)}</optgroup>
        {others.length > 0 && <optgroup label="Ngoài Top 32 (thay thế)">{others.map(option)}</optgroup>}
      </select>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 pb-28">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
            Kid Pro · 2vs2
          </span>
          <h1 className="font-condensed font-black text-2xl sm:text-3xl text-zinc-900 tracking-tight mt-1 uppercase">Ghép đội & nhánh đấu</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Nhập kết quả bốc thăm trực tiếp: mỗi đội 2 thí sinh. Nhánh Top 16 theo số đội: <b>Đội 01 vs Đội 02</b>, Đội 03 vs Đội 04 … Đội 15 vs Đội 16.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openInNewTab('bracket_screen')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-zinc-500" /> Sơ đồ công khai
          </button>
          <button
            onClick={() => setActiveView('bracket')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold cursor-pointer"
          >
            <GitFork className="w-3.5 h-3.5 text-zinc-500" /> Nhánh đấu & sự cố
          </button>
          <button
            onClick={handleExportTeamsCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500" /> CSV 16 đội
          </button>
          <button
            onClick={() => syncWithGoogleSheet()}
            disabled={sheetConfig.isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-500" /> Google Sheets
          </button>
        </div>
      </div>

      {/* 8 battles of the Top 16, two teams each */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {Array.from({ length: TEAMS / 2 }, (_, m) => (
          <section key={m} aria-label={`Trận ${m + 1}`} className="rounded-lg border border-zinc-200 bg-white">
            <h2 className="flex items-center justify-between border-b border-zinc-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500">
              <span>Top 16 · Trận {pad(m + 1)}</span>
              <span className="font-mono text-zinc-400">
                Đội {pad(2 * m + 1)} vs Đội {pad(2 * m + 2)}
              </span>
            </h2>
            {[2 * m, 2 * m + 1].map((t) => {
              const team = proTeams.find((x) => x.teamNumber === t + 1);
              return (
                <div key={t} className={`flex items-center gap-2 px-3 py-2 ${t % 2 === 0 ? 'border-l-4 border-red-500' : 'border-l-4 border-blue-500'}`}>
                  <span className="w-14 shrink-0 font-condensed text-lg font-black uppercase text-zinc-900">Đội {pad(t + 1)}</span>
                  <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5">
                    {dancerSelect(2 * t)}
                    {dancerSelect(2 * t + 1)}
                  </div>
                  <button
                    onClick={() => team && setSelectedTeamForPhoto(team)}
                    disabled={!team || dirty}
                    title={dirty ? 'Lưu đội trước khi tải ảnh' : team?.teamPhotoUrl ? 'Đổi ảnh đội' : 'Tải ảnh đội'}
                    aria-label={`Ảnh Đội ${pad(t + 1)}`}
                    className="relative shrink-0 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {team ? (
                      <TeamThumb
                        photoUrl={team.teamPhotoUrl}
                        dancers={[team.dancer1, team.dancer2]}
                        placeholder={getTeamPhotoUrl(undefined, storageConfig.placeholders)}
                        alt=""
                        className="h-9 w-9 rounded object-cover border border-zinc-300"
                        overlapClassName="-ml-4"
                      />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded border border-dashed border-zinc-300 text-zinc-400">
                        <Camera className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </section>
        ))}
      </div>

      {/* Save bar */}
      <div className="fixed bottom-0 right-0 left-0 lg:left-60 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 sm:px-6 py-3">
          <p className="min-w-0 flex-1 text-xs font-bold text-zinc-600" aria-live="polite">
            Đã chọn <span className="tabular-nums text-zinc-900">{filled}/{TEAMS * 2}</span> thí sinh
            {duplicates > 0 && <span className="text-red-600"> · {duplicates} thí sinh bị chọn trùng</span>}
            {dirty ? <span className="text-amber-700"> · Có thay đổi chưa lưu</span> : <span className="text-emerald-700"> · Đã lưu</span>}
          </p>
          <button
            onClick={randomFill}
            disabled={top.length < TEAMS * 2}
            className="flex items-center gap-1.5 rounded border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer disabled:opacity-40"
            title="Điền ngẫu nhiên từ Top 32, để tập dượt"
          >
            <Shuffle className="h-3.5 w-3.5" /> Điền ngẫu nhiên
          </button>
          <button
            onClick={() => setDraft(saved)}
            disabled={!dirty}
            className="flex items-center gap-1.5 rounded border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Hoàn tác
          </button>
          <button
            onClick={save}
            disabled={!dirty || filled < TEAMS * 2 || duplicates > 0}
            className="flex items-center gap-1.5 rounded bg-amber-500 px-5 py-2 text-sm font-black uppercase text-zinc-950 hover:bg-amber-400 cursor-pointer disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-zinc-900"
          >
            <Save className="h-4 w-4" /> Lưu đội & tạo nhánh đấu
          </button>
        </div>
      </div>

      <TeamPhotoUploadModal team={selectedTeamForPhoto} isOpen={Boolean(selectedTeamForPhoto)} onClose={() => setSelectedTeamForPhoto(null)} />
    </div>
  );
};
