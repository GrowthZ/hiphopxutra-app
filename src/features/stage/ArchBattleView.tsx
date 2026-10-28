import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { BattleMatch, BattleRound, BattleSide } from '../../domain/types';
import { isRoundOpen } from '../../domain/model';
import { getDancerHalfBodyUrl, getTeamPhotoUrl, stripBreakerPrefix } from '../../shared/placeholderAssets';
import { TeamPhoto } from '../../shared/TeamPhoto';
import { AutomatedVictoryDisplay } from './AutomatedVictoryDisplay';
import {
  ARCH_CLIP_PATH,
  ARCH_COLUMNS,
  ARCH_HEIGHT,
  ARCH_WIDTH,
  columnTop,
  MODULE_PX,
  SHOW_ARCH_GRID,
  x,
  yFromBottom,
} from './archLayout';

// Main battle on the stepped-arch LED wall (/led?khung=vom). Zones follow what the audience can actually see:
//   arch top (narrow centre tower)  event logo, stage, round
//   upper flanks                     the two corners' photos, kept inside the steps
//   2.0–3.1 m                        names and score: full width, above the dancers' heads
//   1.45–1.9 m                       one strip with the 9 judges' votes
//   below 1.3 m                      event name only: dancers and the stage block this part
// Positions are fractions of the wall (x across, heights from the bottom), so a corrected pixel map just works.

const BAND = { top: 0.564, bottom: 0.364 }; // names + score
const JUDGES = { top: 0.345, bottom: 0.264 };
const PHOTO = { top: 0.88, bottom: BAND.top };

const box = (left: number, right: number, top: number, bottom: number): React.CSSProperties => ({
  position: 'absolute',
  left: x(left),
  width: x(right) - x(left),
  top: yFromBottom(top),
  height: yFromBottom(bottom) - yFromBottom(top),
});

const sideName = (side?: BattleSide) =>
  !side ? 'Chờ xác định' : side.dancers.length ? side.dancers.map((d) => stripBreakerPrefix(d.name)).join(' & ') : stripBreakerPrefix(side.name);

const sideSub = (match: BattleMatch, side: BattleSide) => {
  const sbd = side.sbdText ? side.sbdText.replace(/^SBD\s*/i, '') : side.dancers.map((d) => d.sbd).filter(Boolean).join(' / ');
  const crews = [...new Set(side.dancers.map((d) => d.crew).filter(Boolean))].join(' · ');
  const team = match.category === 'pro_2v2' ? [side.name, crews].filter(Boolean).join(' · ') : crews;
  return [sbd && `SBD ${sbd}`, team].filter(Boolean).join('  ·  ');
};

/** The round the judge strip shows: the live one, or the last announced one until the next votes come in. */
function shownRound(match: BattleMatch): BattleRound | undefined {
  const current = match.rounds.find((r) => r.roundNumber === match.currentRound) ?? match.rounds.at(-1);
  if (!current) return undefined;
  const started = Object.values(current.votes).some(Boolean);
  if (isRoundOpen(current) || started) return current;
  return [...match.rounds].reverse().find(isRoundOpen) ?? current;
}

export const ArchBattleView: React.FC = () => {
  const { matches, activeMatchId, judges, storageConfig } = useTournament();
  const match = matches.find((m) => m.id === activeMatchId) || matches[0];

  // The picture keeps its pixel size on the HDMI output; only a smaller preview window scales it down.
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(1, window.innerWidth / ARCH_WIDTH, window.innerHeight / ARCH_HEIGHT));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  if (!match) return <div className="fixed inset-0 bg-black" />;

  const photo = (side: BattleSide, color: 'red' | 'blue') => {
    const shadow = `drop-shadow-[0_12px_30px_rgba(0,0,0,0.85)] ${color === 'red' ? 'drop-shadow-[0_0_40px_rgba(239,68,68,0.35)]' : 'drop-shadow-[0_0_40px_rgba(59,130,246,0.35)]'}`;
    return match.category === 'pro_2v2' ? (
      <TeamPhoto
        photoUrl={side.teamPhotoUrl}
        dancers={side.dancers}
        placeholder={getTeamPhotoUrl(undefined, storageConfig.placeholders)}
        alt={sideName(side)}
        className={`h-full w-full object-contain object-bottom ${shadow}`}
        boxClassName="h-full w-full"
        cutoutClassName={shadow}
      />
    ) : (
      <img
        src={getDancerHalfBodyUrl(side.dancers[0], storageConfig.placeholders)}
        alt={sideName(side)}
        className={`h-full w-full object-contain object-bottom ${shadow}`}
      />
    );
  };

  const round = shownRound(match);
  const roundOpen = round ? isRoundOpen(round) : false;
  const roundLabel = (r?: BattleRound) => (!r ? '' : r.isTieBreak ? 'Tie-break' : `Round ${r.roundNumber}`);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <div
        className="absolute left-0 top-0 origin-top-left overflow-hidden text-white"
        style={{ width: ARCH_WIDTH, height: ARCH_HEIGHT, transform: `scale(${scale})` }}
      >
        {/* Everything below is clipped to the stepped outline: no pixels are spent where there is no LED */}
        <div className="absolute inset-0" style={{ clipPath: ARCH_CLIP_PATH }}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#120a24] via-[#0b1030] to-[#05060f]" />
          <div className="absolute -left-[10%] top-[20%] h-[90%] w-[60%] rounded-full bg-red-600/30 blur-[140px]" />
          <div className="absolute -right-[10%] top-[20%] h-[90%] w-[60%] rounded-full bg-blue-600/30 blur-[140px]" />
          <div className="absolute inset-0 opacity-[0.07] [background:repeating-linear-gradient(115deg,#fff_0_2px,transparent_2px_56px)]" />

          {/* Arch top: logo, stage, round */}
          <div style={box(0.36, 0.64, 0.995, 0.885)} className="flex flex-col items-center justify-center gap-1 text-center">
            <img src="/logo.png" alt="HipHop Xứ Trà U16" className="h-[62%] w-auto drop-shadow-[0_0_30px_rgba(239,68,68,0.45)]" />
            <p className="font-condensed text-[34px] font-black uppercase leading-none tracking-[0.2em] text-amber-300">
              {match.stageName} · Trận {String(match.matchNumber).padStart(2, '0')}
            </p>
          </div>

          {/* Corner photos, inside the steps */}
          <div key={`r-${match.id}`} style={box(0.2, 0.47, PHOTO.top, PHOTO.bottom)} className="led-rise">
            {photo(match.sideRed, 'red')}
          </div>
          <div key={`b-${match.id}`} style={box(0.53, 0.8, PHOTO.top, PHOTO.bottom)} className="led-rise">
            {photo(match.sideBlue, 'blue')}
          </div>

          {/* VS + round, between the photos */}
          <div style={box(0.455, 0.545, 0.84, 0.6)} className="flex flex-col items-center justify-center gap-3">
            <span className="font-condensed text-[120px] font-black italic leading-none text-white drop-shadow-[0_0_30px_rgba(251,191,36,0.6)]">VS</span>
            <span className="rounded-full bg-amber-400 px-5 py-1.5 font-condensed text-[34px] font-black uppercase leading-none text-zinc-950">
              {roundLabel(match.rounds.find((r) => r.roundNumber === match.currentRound))}
            </span>
          </div>

          {/* Names + score: 2.0–3.1 m, above the dancers */}
          <NameBoard color="red" name={sideName(match.sideRed)} sub={sideSub(match, match.sideRed)} style={box(0.05, 0.445, BAND.top, BAND.bottom)} />
          <div style={box(0.45, 0.497, BAND.top - 0.015, BAND.bottom + 0.015)} className="flex items-center justify-center rounded-2xl bg-red-600 ring-4 ring-red-300/60 shadow-[0_0_50px_rgba(239,68,68,0.6)]">
            <span className="font-condensed text-[150px] font-black tabular-nums leading-none">{match.roundWinsRed}</span>
          </div>
          <div style={box(0.503, 0.55, BAND.top - 0.015, BAND.bottom + 0.015)} className="flex items-center justify-center rounded-2xl bg-blue-600 ring-4 ring-blue-300/60 shadow-[0_0_50px_rgba(59,130,246,0.6)]">
            <span className="font-condensed text-[150px] font-black tabular-nums leading-none">{match.roundWinsBlue}</span>
          </div>
          <NameBoard color="blue" name={sideName(match.sideBlue)} sub={sideSub(match, match.sideBlue)} style={box(0.555, 0.95, BAND.top, BAND.bottom)} />

          {/* One strip with the 9 judges */}
          <div style={box(0.05, 0.95, JUDGES.top, JUDGES.bottom)} className="flex items-stretch gap-3 rounded-2xl bg-black/50 p-2.5 ring-1 ring-white/15">
            <div className="flex w-[230px] shrink-0 flex-col items-center justify-center gap-1.5">
              <span className="font-condensed text-[34px] font-black uppercase leading-none">{roundLabel(round)}</span>
              <span className="flex gap-1.5">
                {match.rounds.map((r) => (
                  <span
                    key={r.roundNumber}
                    className={`h-3.5 w-3.5 rounded-full ${r.winner === 'red' ? 'bg-red-500' : r.winner === 'blue' ? 'bg-blue-500' : 'bg-white/25'}`}
                  />
                ))}
              </span>
            </div>
            {judges.map((j) => {
              const vote = round?.votes[j.id];
              const shown = roundOpen && (vote === 'red' || vote === 'blue');
              return (
                <div
                  key={j.id}
                  className={`flex flex-1 flex-col items-center justify-center gap-2 rounded-xl ${
                    shown ? (vote === 'red' ? 'bg-red-600' : 'bg-blue-600') : vote ? 'bg-amber-400/20 ring-2 ring-amber-400' : 'bg-white/10'
                  }`}
                >
                  <span className="font-condensed text-[22px] font-black uppercase leading-none text-white/70">
                    {j.judgeName || j.code}
                  </span>
                  <span className="font-condensed text-[38px] font-black uppercase leading-none">
                    {shown ? (vote === 'red' ? 'Đỏ' : 'Xanh') : vote ? <Check className="h-9 w-9 text-amber-300" strokeWidth={4} /> : '·'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bottom (blocked by the stage and dancers): event name only */}
          <div style={box(0.05, 0.95, 0.2, 0.05)} className="flex items-center justify-center">
            <p className="font-condensed text-[56px] font-black uppercase tracking-[0.35em] text-white/15">HipHop Xứ Trà 2026 · Breaking U16</p>
          </div>

          <AutomatedVictoryDisplay match={match} />
        </div>

        {SHOW_ARCH_GRID && <ArchGrid />}
      </div>
    </div>
  );
};

const NameBoard: React.FC<{ color: 'red' | 'blue'; name: string; sub: string; style: React.CSSProperties }> = ({ color, name, sub, style }) => (
  <div
    style={style}
    className={`led-rise flex flex-col justify-center gap-2 rounded-2xl px-8 ${
      color === 'red'
        ? 'items-start bg-gradient-to-r from-red-700 to-red-500 shadow-[0_0_60px_rgba(239,68,68,0.45)]'
        : 'items-end bg-gradient-to-l from-blue-700 to-blue-500 text-right shadow-[0_0_60px_rgba(59,130,246,0.45)]'
    }`}
  >
    <span className="text-[22px] font-black uppercase tracking-[0.3em] text-white/70">{color === 'red' ? 'Góc đỏ' : 'Góc xanh'}</span>
    <span
      className={`max-w-full truncate font-condensed font-black uppercase leading-[0.95] drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)] ${
        name.length > 18 ? 'text-[64px]' : name.length > 11 ? 'text-[80px]' : 'text-[96px]'
      }`}
    >
      {name}
    </span>
    {sub && <span className="max-w-full truncate text-[26px] font-bold uppercase text-white/85">{sub}</span>}
  </div>
);

/** Setup aid (&luoi=1): cabinet grid inside the wall, dashed outline, the cut-away area greyed. */
const ArchGrid: React.FC = () => (
  <svg className="pointer-events-none absolute inset-0" width={ARCH_WIDTH} height={ARCH_HEIGHT}>
    {ARCH_COLUMNS.map((rows, i) =>
      Array.from({ length: rows }, (_, r) => (
        <rect
          key={`${i}-${r}`}
          x={i * MODULE_PX}
          y={columnTop(i) + r * MODULE_PX}
          width={MODULE_PX}
          height={MODULE_PX}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
        />
      ))
    )}
    {ARCH_COLUMNS.map((_, i) => (
      <rect key={`off-${i}`} x={i * MODULE_PX} y={0} width={MODULE_PX} height={columnTop(i)} fill="rgba(255,255,255,0.06)" />
    ))}
  </svg>
);
