import React, { useState } from 'react';
import { useTournament } from '../../state/TournamentContext';
import { Dancer } from '../../domain/types';
import { Search, Download, Camera, Cloud, Pencil } from 'lucide-react';
import { exportToCSV, downloadCSV } from '../../services/googleSheets';
import { DancerPhotoUploadModal } from './DancerPhotoUploadModal';
import { DancerInfoModal } from './DancerInfoModal';
import {
  getDancerAvatarUrl,
  getDancerHalfBodyUrl,
} from '../../shared/placeholderAssets';

/**
 * /admin/thi-sinh: every dancer's details and photos. Phone first (cards, big targets: photos are taken on the spot);
 * the full table from tablet width. Also the only page of "Cập nhật thí sinh" staff (no storage settings for them).
 */
export const DancersListView: React.FC = () => {
  const {
    isAdmin,
    newbieDancers,
    proDancers,
    activeCategory,
    setActiveCategory,
    setIsStorageModalOpen,
    storageConfig,
    updateDancerGender,
  } = useTournament();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterQualified, setFilterQualified] = useState<'all' | 'top32' | 'out'>('all');
  const [filterGender, setFilterGender] = useState<'all' | 'male' | 'female'>('all');
  const [missingPhoto, setMissingPhoto] = useState(false);
  const [selectedDancerForPhoto, setSelectedDancerForPhoto] = useState<Dancer | null>(null);
  const [editingDancer, setEditingDancer] = useState<Dancer | null>(null);

  const currentList = activeCategory === 'newbie_1v1' ? newbieDancers : proDancers;
  const withoutPhoto = currentList.filter((d) => !d.avatarUrl).length;

  const filteredDancers = currentList.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.sbd.includes(searchQuery) ||
      (d.realName && d.realName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.crew && d.crew.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterQualified === 'top32' && !d.isQualifiedTop32) return false;
    if (filterQualified === 'out' && d.isQualifiedTop32) return false;

    if (filterGender === 'male' && d.gender !== 'male') return false;
    if (filterGender === 'female' && d.gender !== 'female') return false;
    if (missingPhoto && d.avatarUrl) return false;

    return true;
  });

  const handleExportRoster = () => {
    const header = [
      'Hạng',
      'SBD',
      'Tên Thí Sinh',
      'Giới Tính',
      'Họ Tên Thật',
      'CLB / Đội',
      'Avatar URL',
      'Ảnh Nửa Người URL',
      'Điểm Tổng',
      'Điểm TB',
      'Vào Top 32',
    ];
    const rows = currentList.map((d) => [
      d.prelimRank || '',
      d.sbd,
      d.name,
      d.gender === 'female' ? 'Nữ' : 'Nam',
      d.realName || '',
      d.crew || '',
      d.avatarUrl || '',
      d.halfBodyUrl || '',
      Math.round(d.prelimScoreTotal),
      Math.round(d.prelimScoreAvg),
      d.isQualifiedTop32 ? 'Có' : 'Không',
    ]);
    const csvStr = exportToCSV([header, ...rows]);
    downloadCSV(`danh_sach_thi_sinh_${activeCategory}.csv`, csvStr);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-3 sm:space-y-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 border-b border-zinc-200 pb-3 sm:pb-4">
        <div className="min-w-0">
          <h1 className="font-condensed font-black text-2xl sm:text-3xl text-zinc-900 tracking-tight uppercase">Danh sách thí sinh</h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5 hidden sm:block">
            Thông tin thí sinh, giới tính, ảnh avatar và ảnh nửa người (lưu trên R2)
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setIsStorageModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Cấu hình Cloudflare R2, Google Drive & ảnh mẫu Placeholder"
            >
              <Cloud className="w-3.5 h-3.5 text-zinc-500" />
              <span>Cài đặt ảnh</span>
            </button>
          )}
          <button
            onClick={handleExportRoster}
            className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Category, search and filters: stacked on a phone, one row on a laptop */}
      <div className="sticky top-14 z-20 -mx-4 space-y-2 bg-zinc-100/95 px-4 py-2 backdrop-blur md:static md:mx-0 md:flex md:flex-wrap md:items-center md:justify-between md:gap-3 md:space-y-0 md:bg-transparent md:p-0 md:backdrop-blur-none text-xs">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-200 p-1 font-bold md:flex md:w-fit">
          {(
            [
              ['newbie_1v1', 'Newbie 1vs1', newbieDancers.length],
              ['pro_2v2', 'Pro 2vs2', proDancers.length],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              aria-pressed={activeCategory === id}
              className={`rounded-md px-4 py-2 md:py-1.5 transition-colors cursor-pointer ${
                activeCategory === id ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        <div className="relative md:order-last">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            placeholder="Tìm SBD, tên, CLB…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Tìm thí sinh"
            className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-9 pr-3 text-base text-zinc-900 outline-none focus:border-zinc-500 md:w-52 md:py-1.5 md:text-xs shadow-2xs"
          />
        </div>

        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 font-bold text-[11px] [scrollbar-width:none] md:mx-0 md:px-0 md:pb-0">
          {(
            [
              ['all', 'Tất cả'],
              ['male', 'Nam ♂'],
              ['female', 'Nữ ♀'],
            ] as const
          ).map(([g, label]) => (
            <button
              key={g}
              onClick={() => setFilterGender(g)}
              aria-pressed={filterGender === g}
              className={`shrink-0 rounded-full border px-3 py-1.5 cursor-pointer ${
                filterGender === g
                  ? g === 'female'
                    ? 'border-pink-600 bg-pink-600 text-white'
                    : g === 'male'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-300 bg-white text-zinc-600'
              }`}
            >
              {label}
            </button>
          ))}
          <span className="mx-0.5 w-px shrink-0 bg-zinc-300" />
          <button
            onClick={() => setMissingPhoto((v) => !v)}
            aria-pressed={missingPhoto}
            className={`shrink-0 rounded-full border px-3 py-1.5 cursor-pointer ${
              missingPhoto ? 'border-amber-500 bg-amber-500 text-zinc-950' : 'border-zinc-300 bg-white text-zinc-600'
            }`}
          >
            Chưa có ảnh ({withoutPhoto})
          </button>
          {(
            [
              ['top32', 'Top 32'],
              ['out', 'Bị loại'],
            ] as const
          ).map(([q, label]) => (
            <button
              key={q}
              onClick={() => setFilterQualified((v) => (v === q ? 'all' : q))}
              aria-pressed={filterQualified === q}
              className={`shrink-0 rounded-full border px-3 py-1.5 cursor-pointer ${
                filterQualified === q ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 bg-white text-zinc-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Phone: one card per dancer, tap the photo or "Ảnh" to take / change it */}
      <ul className="space-y-2 md:hidden" aria-label="Thí sinh">
        {filteredDancers.length === 0 && (
          <li className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
            Không có thí sinh nào khớp.
          </li>
        )}
        {filteredDancers.map((d) => {
          const female = d.gender === 'female';
          return (
            <li key={d.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-2.5">
              <button
                onClick={() => setSelectedDancerForPhoto(d)}
                aria-label={`Ảnh của ${d.name}`}
                className="relative shrink-0 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                <img
                  loading="lazy"
                  decoding="async"
                  src={getDancerAvatarUrl(d, storageConfig.placeholders)}
                  alt=""
                  className={`h-14 w-14 rounded-full object-cover border-2 ${d.avatarUrl ? 'border-emerald-500' : 'border-dashed border-amber-500 opacity-60'}`}
                />
                {!d.avatarUrl && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-zinc-950 ring-2 ring-white">
                    <Camera className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-condensed text-lg font-black uppercase leading-tight text-zinc-900">{d.name}</p>
                <p className="flex items-center gap-1.5 truncate text-xs text-zinc-500">
                  <span className="font-mono font-bold text-zinc-700">{d.sbd || '—'}</span>
                  <span className={`rounded px-1 text-[10px] font-bold ${female ? 'bg-pink-50 text-pink-700' : 'bg-blue-50 text-blue-700'}`}>
                    {female ? 'Nữ' : 'Nam'}
                  </span>
                  <span className="truncate">{[d.realName, d.crew].filter(Boolean).join(' · ')}</span>
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <button
                  onClick={() => setSelectedDancerForPhoto(d)}
                  className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-bold cursor-pointer ${
                    d.avatarUrl ? 'border border-zinc-300 text-zinc-700' : 'bg-amber-500 text-zinc-950'
                  }`}
                >
                  <Camera className="h-3.5 w-3.5" /> Ảnh
                </button>
                <button
                  onClick={() => setEditingDancer(d)}
                  aria-label={`Sửa thông tin ${d.name}`}
                  className="flex items-center justify-center gap-1 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-700 cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" /> Sửa
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Tablet / laptop: the full table */}
      <div className="hidden md:block bg-white border border-zinc-200 rounded overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                <th className="py-2.5 px-3 text-center w-12">Hạng</th>
                <th className="py-2.5 px-3 w-16">SBD</th>
                <th className="py-2.5 px-3 text-center w-14">Avatar</th>
                <th className="py-2.5 px-3">Tên Thí Sinh</th>
                <th className="py-2.5 px-3 text-center w-20">Giới tính</th>
                <th className="py-2.5 px-3 hidden sm:table-cell">Họ và tên</th>
                <th className="py-2.5 px-3">CLB / Đội</th>
                <th className="py-2.5 px-3 text-center w-24 hidden md:table-cell">Nửa người</th>
                <th className="py-2.5 px-3 text-right w-16">Tổng</th>
                <th className="py-2.5 px-3 text-right w-16">TB</th>
                <th className="py-2.5 px-3 text-center w-24">Vào Top 32</th>
                <th className="py-2.5 px-3 text-center w-28">Hồ sơ & Ảnh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 font-medium">
              {filteredDancers.map((d) => {
                const avatarSrc = getDancerAvatarUrl(d, storageConfig.placeholders);
                const halfBodySrc = getDancerHalfBodyUrl(d, storageConfig.placeholders);
                const isFemale = d.gender === 'female';

                return (
                  <tr key={d.id} className="hover:bg-zinc-50 transition-colors">
                    {/* Rank */}
                    <td className="py-2 px-3 text-center font-condensed font-black text-sm text-zinc-900 tabular-nums">
                      {d.prelimRank || '—'}
                    </td>

                    {/* SBD */}
                    <td className="py-2 px-3 font-mono font-bold text-zinc-700">
                      {d.sbd}
                    </td>

                    {/* Avatar thumbnail with placeholder */}
                    <td className="py-2 px-3 text-center">
                      <div className="relative inline-block">
                        <img loading="lazy" decoding="async"
                          src={avatarSrc}
                          alt={d.name}
                          className="w-8 h-8 rounded-full object-cover border border-zinc-300 mx-auto shadow-2xs"
                        />
                        {d.avatarUrl && (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white"
                            title="Đã tải avatar riêng"
                          />
                        )}
                      </div>
                    </td>

                    {/* Dancer Name */}
                    <td className="py-2 px-3">
                      <span className="font-condensed font-black text-sm text-zinc-900 uppercase">
                        {d.name}
                      </span>
                    </td>

                    {/* Gender interactive toggle */}
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() =>
                          updateDancerGender(
                            activeCategory,
                            d.id,
                            isFemale ? 'male' : 'female'
                          )
                        }
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-wider cursor-pointer transition-colors border ${
                          isFemale
                            ? 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100'
                            : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                        }`}
                        title="Bấm để đổi giới tính Nam / Nữ"
                      >
                        <span>{isFemale ? '♀ Nữ' : '♂ Nam'}</span>
                      </button>
                    </td>

                    {/* Real name */}
                    <td className="py-2 px-3 text-zinc-600 hidden sm:table-cell">
                      {d.realName}
                    </td>

                    {/* Crew */}
                    <td className="py-2 px-3 text-zinc-600">
                      {d.crew}
                    </td>

                    {/* Half body thumbnail & status */}
                    <td className="py-2 px-3 text-center hidden md:table-cell">
                      <div className="flex items-center justify-center gap-1.5">
                        <img loading="lazy" decoding="async"
                          src={halfBodySrc}
                          alt="Halfbody"
                          className="w-5 h-7 object-contain rounded border border-zinc-200 bg-zinc-900"
                        />
                        {d.halfBodyUrl ? (
                          <span className="text-[10px] font-bold text-emerald-700">Đã có</span>
                        ) : (
                          <span className="text-[10px] text-zinc-400">Mẫu</span>
                        )}
                      </div>
                    </td>

                    {/* Scores */}
                    <td className="py-2 px-3 text-right font-condensed font-black text-sm text-zinc-900 tabular-nums">
                      {Math.round(d.prelimScoreTotal)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-xs text-zinc-600 tabular-nums">
                      {Math.round(d.prelimScoreAvg)}
                    </td>

                    {/* Top 32 tag */}
                    <td className="py-2 px-3 text-center">
                      {d.isQualifiedTop32 ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                          Top 32
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-200 text-[10px] font-medium">
                          Loại
                        </span>
                      )}
                    </td>

                    {/* Photo Upload Action Button */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => setEditingDancer(d)}
                        aria-label={`Sửa thông tin ${d.name}`}
                        title="Sửa thông tin"
                        className="mr-1 inline-flex items-center gap-1 px-2.5 py-1 rounded border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold text-[11px] uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Sửa</span>
                      </button>
                      <button
                        onClick={() => setSelectedDancerForPhoto(d)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-[11px] uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Tải ảnh</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Photo Upload Modal */}
      <DancerPhotoUploadModal
        dancer={selectedDancerForPhoto}
        category={activeCategory}
        isOpen={Boolean(selectedDancerForPhoto)}
        onClose={() => setSelectedDancerForPhoto(null)}
      />
      <DancerInfoModal dancer={editingDancer} category={activeCategory} onClose={() => setEditingDancer(null)} />
    </div>
  );
};
