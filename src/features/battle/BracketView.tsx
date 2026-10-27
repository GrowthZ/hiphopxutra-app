import React, { useState } from 'react';
import { useTournament } from '../../state/TournamentContext';
import {
  Swords,
  Tv,
  CheckCircle2,
} from 'lucide-react';
import {
  getTeamPhotoUrl,
  getDancerAvatarUrl,
  stripBreakerPrefix,
} from '../../shared/placeholderAssets';

export const BracketView: React.FC = () => {
  const {
    matches,
    activeMatchId,
    setActiveMatchId,
    activeCategory,
    setActiveCategory,
    setActiveView,
    storageConfig,
  } = useTournament();

  const [selectedStage, setSelectedStage] = useState<string>('all');

  const categoryMatches = matches.filter((m) => m.category === activeCategory);

  const stagesList =
    activeCategory === 'newbie_1v1'
      ? [
          { id: 'all', label: 'Tất cả vòng' },
          { id: 'top32', label: 'Top 32 (1 Round)' },
          { id: 'top16', label: 'Top 16 (1 Round)' },
          { id: 'top8', label: 'Tứ kết (1 Round)' },
          { id: 'top4', label: 'Bán kết (2 Round)' },
          { id: 'final', label: 'Chung kết (2 Round)' },
        ]
      : [
          { id: 'all', label: 'Tất cả vòng' },
          { id: 'top16', label: 'Top 16 (2 Round)' },
          { id: 'top8', label: 'Tứ kết (2 Round)' },
          { id: 'top4', label: 'Bán kết (4 Round)' },
          { id: 'final', label: 'Chung kết (4 Round)' },
        ];

  const filteredMatches =
    selectedStage === 'all'
      ? categoryMatches
      : categoryMatches.filter((m) => m.stage === selectedStage);

  const handleSelectMatchForBattle = (matchId: string) => {
    setActiveMatchId(matchId);
    setActiveView('battle');
  };

  const handleSelectMatchForStage = (matchId: string) => {
    setActiveMatchId(matchId);
    setActiveView('stage_control');
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="font-condensed font-black text-2xl sm:text-3xl text-zinc-900 tracking-tight uppercase">
            Nhánh đấu đối kháng (Battle Bracket)
          </h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">
            Thể thức: Newbie 1 Round (BK/CK 2 Round) · Pro 2 Round (BK/CK 4 Round) · 9 Giám khảo chấm
          </p>
        </div>

        {/* Category Switcher */}
        <div className="flex items-center gap-1 bg-zinc-200 p-1 rounded text-xs font-bold">
          <button
            onClick={() => {
              setActiveCategory('newbie_1v1');
              setSelectedStage('all');
            }}
            className={`px-4 py-1.5 rounded transition-colors cursor-pointer ${
              activeCategory === 'newbie_1v1'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Kid Newbie • 1vs1
          </button>
          <button
            onClick={() => {
              setActiveCategory('pro_2v2');
              setSelectedStage('all');
            }}
            className={`px-4 py-1.5 rounded transition-colors cursor-pointer ${
              activeCategory === 'pro_2v2'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Kid Pro • 2vs2
          </button>
        </div>
      </div>

      {/* Stage Selector Pills (Flat, crisp) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
        {stagesList.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedStage(s.id)}
            className={`px-3 py-1.5 rounded whitespace-nowrap transition-colors cursor-pointer ${
              selectedStage === s.id
                ? 'bg-zinc-900 text-white font-bold'
                : 'bg-white border border-zinc-300 text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Matches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredMatches.map((m) => {
          const isActive = m.id === activeMatchId;

          return (
            <div
              key={m.id}
              className={`bg-white rounded border transition-all p-3.5 shadow-xs flex flex-col justify-between space-y-3 ${
                isActive
                  ? 'border-zinc-900 ring-1 ring-zinc-900'
                  : 'border-zinc-200 hover:border-zinc-400'
              }`}
            >
              {/* Match Header */}
              <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-100">
                <span className="font-bold text-zinc-900 uppercase tracking-tight">
                  {m.stageName} · Trận {m.matchNumber}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-zinc-500">
                    {m.totalRoundsRequired} Round
                  </span>
                  {m.status === 'finished' ? (
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Xong
                    </span>
                  ) : m.status === 'ongoing' ? (
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Đang đấu
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                      Chờ
                    </span>
                  )}
                </div>
              </div>

              {/* Match Opponents */}
              <div className="space-y-1.5">
                {/* Red Side */}
                <div
                  className={`p-2 rounded border flex items-center justify-between transition-colors ${
                    m.winnerSide === 'red'
                      ? 'bg-red-50 border-red-300 font-bold'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <img
                      src={
                        m.category === 'pro_2v2'
                          ? getTeamPhotoUrl(m.sideRed, storageConfig.placeholders)
                          : getDancerAvatarUrl(m.sideRed.dancers[0], storageConfig.placeholders)
                      }
                      alt={m.sideRed.name}
                      className="w-7 h-7 rounded-full object-cover border border-red-500 shrink-0"
                    />
                    <div className="truncate">
                      <div className="font-condensed font-black text-sm text-zinc-900 truncate uppercase">
                        {m.sideRed.dancers.map((d) => stripBreakerPrefix(d.name)).join(' & ') || stripBreakerPrefix(m.sideRed.name)}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono truncate">
                        {m.category === 'pro_2v2'
                          ? `${m.sideRed.name} · ${m.sideRed.sbdText}`
                          : [m.sideRed.dancers[0]?.crew, m.sideRed.sbdText].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                  <div className="font-condensed font-black text-lg px-2 py-0.5 rounded bg-white border border-zinc-200 tabular-nums">
                    {m.roundWinsRed}
                  </div>
                </div>

                {/* Blue Side */}
                <div
                  className={`p-2 rounded border flex items-center justify-between transition-colors ${
                    m.winnerSide === 'blue'
                      ? 'bg-blue-50 border-blue-300 font-bold'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <img
                      src={
                        m.category === 'pro_2v2'
                          ? getTeamPhotoUrl(m.sideBlue, storageConfig.placeholders)
                          : getDancerAvatarUrl(m.sideBlue.dancers[0], storageConfig.placeholders)
                      }
                      alt={m.sideBlue.name}
                      className="w-7 h-7 rounded-full object-cover border border-blue-500 shrink-0"
                    />
                    <div className="truncate">
                      <div className="font-condensed font-black text-sm text-zinc-900 truncate uppercase">
                        {m.sideBlue.dancers.map((d) => stripBreakerPrefix(d.name)).join(' & ') || stripBreakerPrefix(m.sideBlue.name)}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono truncate">
                        {m.category === 'pro_2v2'
                          ? `${m.sideBlue.name} · ${m.sideBlue.sbdText}`
                          : [m.sideBlue.dancers[0]?.crew, m.sideBlue.sbdText].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                  <div className="font-condensed font-black text-lg px-2 py-0.5 rounded bg-white border border-zinc-200 tabular-nums">
                    {m.roundWinsBlue}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-zinc-100 flex items-center gap-2">
                <button
                  onClick={() => handleSelectMatchForBattle(m.id)}
                  className="flex-1 py-1.5 px-2 rounded bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>Điều Hành Trận</span>
                </button>

                <button
                  onClick={() => handleSelectMatchForStage(m.id)}
                  className="p-1.5 rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
                  title="Hiện lên Màn LED Sân Khấu"
                >
                  <Tv className="w-3.5 h-3.5 text-red-600" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
