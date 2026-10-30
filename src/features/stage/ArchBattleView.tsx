import React, { useEffect, useState } from 'react';
import { useTournament } from '../../state/TournamentContext';
import { BattleMatch, BattleRound, BattleSide } from '../../domain/types';
import { isRoundOpen } from '../../domain/model';
import { getDancerHalfBodyUrl, getTeamPhotoUrl, stripBreakerPrefix } from '../../shared/placeholderAssets';
import { TeamPhoto } from '../../shared/TeamPhoto';
import { AutomatedVictoryDisplay } from './AutomatedVictoryDisplay';
import { JudgeBallotCard, useRevealStartTimes } from './StageDisplayView';
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

// Main battle on the stepped-arch LED wall (/led?khung=vom), in the same style as the 16:9 screen (StageDisplayView).
// Zones follow what the audience can actually see:
//   arch top (narrow centre tower)  event logo, category, stage and match
//   upper flanks                     the two corners' photos, kept inside the steps
//   2.5–3.05 m                       name bars from the wall edges, score at their inner end, above the dancers' heads
//   1.35–2.4 m                       judges × rounds, on a dark fade so the red / blue votes stand out
//   below 1.3 m                      event name only: dancers and the stage block this part
// Positions are fractions of the wall (x across, heights from the bottom), so a corrected pixel map just works.

const BAR = { top: 0.555, bottom: 0.455 }; // names
const GRID = { top: 0.435, bottom: 0.245 }; // judge names + one row per round
const PHOTO_TOP = 0.88;

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

export const ArchBattleView: React.FC = () => {
  const { matches, activeMatchId, judges, storageConfig } = useTournament();
  const match = matches.find((m) => m.id === activeMatchId) || matches[0];
  const revealStartTimes = useRevealStartTimes(match);

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
  // A 1vs1 half-body runs down behind the judge table; a 2vs2 photo is usually landscape, so it ends just under the names.
  const photoBottom = match.category === 'pro_2v2' ? BAR.bottom - 0.03 : GRID.bottom;

  const regularRounds = match.category === 'newbie_1v1' ? 2 : 4;
  const isTieBreak = (r: BattleRound) => Boolean(r.isTieBreak) || r.roundNumber > regularRounds;
  const roundLabel = (r?: BattleRound) => (!r ? '' : isTieBreak(r) ? 'Tie-break' : `Round ${r.roundNumber}`);

  // Announced result: the match winner once it's over, else the last revealed round until the next votes come in.
  const current = match.rounds.find((r) => r.roundNumber === match.currentRound);
  const lastOpen = [...match.rounds].reverse().find(isRoundOpen);
  const nextStarted = current && !isRoundOpen(current) && Object.values(current.votes).some(Boolean);
  const winner = match.status === 'finished' && match.winnerSide ? match.winnerSide : nextStarted ? null : (lastOpen?.winner ?? null);
  const lost = (side: 'red' | 'blue') => winner !== null && winner !== side;
  const dim = (side: 'red' | 'blue') => (lost(side) ? 'grayscale opacity-35 transition-all duration-700' : 'transition-all duration-700');

  // Judge rows share the strip's height (header row + gaps taken out).
  const gridPx = yFromBottom(GRID.bottom) - yFromBottom(GRID.top);
  const rows = Math.max(match.rounds.length, 1);
  const rowH = Math.floor((gridPx - 40 - rows * 8) / rows);
  const cols = `200px repeat(${Math.max(judges.length, 1)}, minmax(0, 1fr))`;

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <div
        className="absolute left-0 top-0 origin-top-left overflow-hidden text-white"
        style={{ width: ARCH_WIDTH, height: ARCH_HEIGHT, transform: `scale(${scale})` }}
      >
        {/* Everything below is clipped to the stepped outline: no pixels are spent where there is no LED */}
        <div className="absolute inset-0" style={{ clipPath: ARCH_CLIP_PATH }}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a2a6c] via-[#13205a] to-[#0a1238]" />
          <div className="absolute -left-[10%] top-[20%] h-[90%] w-[60%] rounded-full bg-red-600/25 blur-[140px]" />
          <div className="absolute -right-[10%] top-[20%] h-[90%] w-[60%] rounded-full bg-blue-600/25 blur-[140px]" />
          <div className="absolute inset-0 opacity-[0.06] [background:repeating-linear-gradient(115deg,#fff_0_2px,transparent_2px_56px)]" />

          {/* Arch top: logo, category, stage and match */}
          <div style={box(0.36, 0.64, 0.995, 0.865)} className="flex flex-col items-center justify-center gap-2 text-center">
            <img src="/logo.png" alt="HipHop Xứ Trà U16" className="h-[62%] w-auto drop-shadow-[0_0_30px_rgba(239,68,68,0.45)]" />
            <span className="whitespace-nowrap rounded-lg bg-gradient-to-b from-amber-200 to-amber-400 px-4 py-1 font-condensed text-[26px] font-black uppercase leading-none text-zinc-950">
              {match.category === 'pro_2v2' ? 'Kid Pro 2vs2' : 'Kid Newbie 1vs1'} · {match.stageName} · Trận {String(match.matchNumber).padStart(2, '0')}
            </span>
          </div>

          {/* Corner photos, inside the steps */}
          <div key={`r-${match.id}`} style={box(0.2, 0.47, PHOTO_TOP, photoBottom)} className={`led-rise ${dim('red')}`}>
            {photo(match.sideRed, 'red')}
          </div>
          <div key={`b-${match.id}`} style={box(0.53, 0.8, PHOTO_TOP, photoBottom)} className={`led-rise ${dim('blue')}`}>
            {photo(match.sideBlue, 'blue')}
          </div>

          {/* From the name bars down: fade to dark so the vote colours read clearly over the photos */}
          <div style={box(0, 1, BAR.top, 0)} className="bg-gradient-to-b from-transparent via-[#05060f]/80 via-35% to-[#05060f]/95" />

          {/* Centre: the announced winner, or VS and the round being danced */}
          {winner ? (
            <div key={`win-${winner}-${lastOpen?.roundNumber}`} style={box(0.28, 0.72, 0.85, 0.66)} className="led-pop flex flex-col items-center justify-center">
              <span
                className={`whitespace-nowrap font-condensed text-[200px] font-black italic uppercase leading-[0.85] tracking-tight text-white ${
                  winner === 'red'
                    ? 'drop-shadow-[0_0_50px_rgba(239,68,68,0.95)] [-webkit-text-stroke:6px_#dc2626]'
                    : 'drop-shadow-[0_0_50px_rgba(59,130,246,0.95)] [-webkit-text-stroke:6px_#2563eb]'
                }`}
              >
                {winner === 'red' ? 'Red' : 'Blue'} win
              </span>
              <span className={`mt-3 rounded-full px-6 py-2 font-condensed text-[34px] font-black uppercase leading-none ${winner === 'red' ? 'bg-red-600' : 'bg-blue-600'}`}>
                {match.status === 'finished' ? 'Chung cuộc' : roundLabel(lastOpen)}
              </span>
            </div>
          ) : (
            <div style={box(0.42, 0.58, 0.84, 0.66)} className="flex flex-col items-center justify-center gap-3">
              <span className="font-condensed text-[120px] font-black italic leading-none text-white drop-shadow-[0_0_30px_rgba(251,191,36,0.6)]">VS</span>
              {current && (
                <span className="whitespace-nowrap rounded-full bg-amber-400 px-5 py-1.5 font-condensed text-[34px] font-black uppercase leading-none text-zinc-950">
                  {roundLabel(current)}
                </span>
              )}
            </div>
          )}

          {/* Name bars from the wall edges (the steps cut them off), score at the inner end */}
          <div className={`absolute inset-0 ${dim('red')}`}>
            <NameBar color="red" name={sideName(match.sideRed)} sub={sideSub(match, match.sideRed)} style={box(0, 0.46, BAR.top, BAR.bottom)} />
            <ScoreBox color="red" value={match.roundWinsRed} style={box(0.385, 0.465, BAR.top + 0.1, BAR.bottom + 0.045)} />
          </div>
          <div className={`absolute inset-0 ${dim('blue')}`}>
            <NameBar color="blue" name={sideName(match.sideBlue)} sub={sideSub(match, match.sideBlue)} style={box(0.54, 1, BAR.top, BAR.bottom)} />
            <ScoreBox color="blue" value={match.roundWinsBlue} style={box(0.535, 0.615, BAR.top + 0.1, BAR.bottom + 0.045)} />
          </div>

          {/* Judges × rounds */}
          <div style={box(0.03, 0.97, GRID.top, GRID.bottom)}>
            <div className="grid h-[32px] gap-x-2.5" style={{ gridTemplateColumns: cols }}>
              <span />
              {judges.map((j) => (
                <span
                  key={j.id}
                  className="truncate rounded-md bg-black/55 px-2 py-1 text-center font-condensed text-[24px] font-black uppercase leading-none text-white ring-1 ring-white/10"
                >
                  {j.judgeName || j.code}
                </span>
              ))}
            </div>
            <div className="mt-2 space-y-2">
              {match.rounds.map((round) => {
                const open = isRoundOpen(round);
                const tie = isTieBreak(round);
                const live = round.roundNumber === match.currentRound && match.status !== 'finished';
                return (
                  <div key={round.roundNumber} className="grid gap-x-2.5" style={{ gridTemplateColumns: cols, height: rowH }}>
                    <div
                      className={`flex items-center justify-between gap-2 rounded-xl px-3 ${
                        tie ? 'bg-amber-500/25 ring-2 ring-amber-400' : live ? 'bg-black/60 ring-2 ring-amber-400/80' : 'bg-black/55 ring-1 ring-white/10'
                      }`}
                    >
                      <span className={`whitespace-nowrap font-condensed font-black uppercase leading-none ${tie ? 'text-[26px] text-amber-300' : 'text-[30px]'}`}>
                        {roundLabel(round)}
                      </span>
                      {open && round.winner && (
                        <span className={`h-4 w-4 shrink-0 rounded-full ${round.winner === 'red' ? 'bg-red-500' : 'bg-blue-500'}`} />
                      )}
                    </div>
                    {judges.map((j, idx) => (
                      <JudgeBallotCard
                        key={j.id}
                        judgeCode={j.code}
                        judgeIndex={idx}
                        vote={round.votes[j.id]}
                        isRevealed={open}
                        revealStartTime={revealStartTimes[round.roundNumber]}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
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

const NameBar: React.FC<{ color: 'red' | 'blue'; name: string; sub: string; style: React.CSSProperties }> = ({ color, name, sub, style }) => (
  <div
    style={style}
    className={`led-rise flex flex-col justify-center gap-1 ${
      color === 'red'
        ? 'items-start rounded-r-2xl bg-gradient-to-r from-red-700/95 via-red-600/95 to-red-500/90 pl-[120px] pr-[170px] shadow-[0_10px_50px_rgba(239,68,68,0.45)]'
        : 'items-end rounded-l-2xl bg-gradient-to-l from-blue-700/95 via-blue-600/95 to-blue-500/90 pl-[170px] pr-[120px] text-right shadow-[0_10px_50px_rgba(59,130,246,0.45)]'
    }`}
  >
    <span
      className={`max-w-full truncate font-condensed font-black uppercase leading-[0.9] drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)] ${
        name.length > 18 ? 'text-[44px]' : name.length > 11 ? 'text-[56px]' : 'text-[70px]'
      }`}
    >
      {name}
    </span>
    {sub && <span className="max-w-full truncate text-[20px] font-bold uppercase leading-none text-white/85">{sub}</span>}
  </div>
);

/** Rounds won, overlapping the top of the name bar's inner end. */
const ScoreBox: React.FC<{ color: 'red' | 'blue'; value: number; style: React.CSSProperties }> = ({ color, value, style }) => (
  <div
    style={style}
    className={`flex items-center justify-center rounded-2xl font-condensed text-[120px] font-black leading-none tabular-nums ${
      color === 'red'
        ? 'bg-gradient-to-b from-red-500 to-red-700 shadow-[0_0_50px_rgba(239,68,68,0.65)] ring-4 ring-red-300/60'
        : 'bg-gradient-to-b from-blue-500 to-blue-700 shadow-[0_0_50px_rgba(59,130,246,0.65)] ring-4 ring-blue-300/60'
    }`}
  >
    {value}
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
