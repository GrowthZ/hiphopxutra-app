import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Dancer } from '../types/tournament';
import {
  Search,
  Download,
  Camera,
  Cloud,
  Check,
  User,
  Image as ImageIcon,
  Sliders,
  Filter,
} from 'lucide-react';
import { exportToCSV, downloadCSV } from '../services/googleSheets';
import { DancerPhotoUploadModal } from './DancerPhotoUploadModal';
import {
  getDancerAvatarUrl,
  getDancerHalfBodyUrl,
} from '../utils/placeholderAssets';

export const DancersListView: React.FC = () => {
  const {
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
  const [selectedDancerForPhoto, setSelectedDancerForPhoto] = useState<Dancer | null>(null);

  const currentList = activeCategory === 'newbie_1v1' ? newbieDancers : proDancers;

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

    return true;
  });

  const handleExportRoster = () => {
    const header = [
      'Hạng',
      'SBD',
      'Tên Thí Sinh',
      'Giới Tính',
      'Họ Tên Thật',
      'Tuổi',
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
      d.age,
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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="font-condensed font-black text-2xl sm:text-3xl text-zinc-900 tracking-tight uppercase">
            Danh sách thí sinh U16
          </h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">
            Quản lý hồ sơ vận động viên, giới tính (Nam / Nữ), ảnh Avatar, ảnh nửa người (R2 / Google Drive)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Storage & Placeholder Config button */}
          <button
            onClick={() => setIsStorageModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Cấu hình Cloudflare R2, Google Drive & ảnh mẫu Placeholder"
          >
            <Cloud className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden sm:inline">Cài đặt ảnh:</span>
            <span className="font-bold text-zinc-900 uppercase">
              R2
            </span>
          </button>

          <button
            onClick={handleExportRoster}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500" />
            <span>Tải CSV</span>
          </button>
        </div>
      </div>

      {/* Segmented Controls & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {/* Category switcher */}
        <div className="flex items-center gap-1 bg-zinc-200 p-1 rounded font-bold w-fit">
          <button
            onClick={() => setActiveCategory('newbie_1v1')}
            className={`px-4 py-1.5 rounded transition-colors cursor-pointer ${
              activeCategory === 'newbie_1v1'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Kid Newbie • 1vs1 ({newbieDancers.length})
          </button>
          <button
            onClick={() => setActiveCategory('pro_2v2')}
            className={`px-4 py-1.5 rounded transition-colors cursor-pointer ${
              activeCategory === 'pro_2v2'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Kid Pro • 2vs2 ({proDancers.length})
          </button>
        </div>

        {/* Search & Gender & Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Gender Filter */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded border border-zinc-200 font-bold text-[11px]">
            <button
              onClick={() => setFilterGender('all')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                filterGender === 'all' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Tất cả giới tính
            </button>
            <button
              onClick={() => setFilterGender('male')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                filterGender === 'male' ? 'bg-blue-600 text-white' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Nam ♂
            </button>
            <button
              onClick={() => setFilterGender('female')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                filterGender === 'female' ? 'bg-pink-600 text-white' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Nữ ♀
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded border border-zinc-200 font-bold text-[11px]">
            <button
              onClick={() => setFilterQualified('all')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                filterQualified === 'all' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilterQualified('top32')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                filterQualified === 'top32' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Top 32
            </button>
            <button
              onClick={() => setFilterQualified('out')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                filterQualified === 'out' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Bị loại
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm SBD, tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900 text-xs outline-none focus:border-zinc-500 w-36 sm:w-44 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Dancers Table */}
      <div className="bg-white border border-zinc-200 rounded overflow-hidden shadow-2xs">
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
                <th className="py-2.5 px-3 text-center w-14">Tuổi</th>
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
                      {d.realName || '—'}
                    </td>

                    {/* Age */}
                    <td className="py-2 px-3 text-center font-mono text-zinc-700">
                      {d.age}
                    </td>

                    {/* Crew */}
                    <td className="py-2 px-3 text-zinc-600">
                      {d.crew || 'Tự do'}
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
                    <td className="py-2 px-3 text-center">
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
    </div>
  );
};
