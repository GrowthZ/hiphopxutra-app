import React, { useEffect, useState } from 'react';
import { useTournament } from '../../state/TournamentContext';
import { BattleMatch, BattleRound, BattleSide } from '../../domain/types';
import { isRoundOpen } from '../../domain/model';
import { regulationRounds } from '../../domain/battle';
import { getDancerHalfBodyUrl, getTeamPhotoUrl, stripBreakerPrefix } from '../../shared/placeholderAssets';
import { TeamPhoto } from '../../shared/TeamPhoto';
import { AutomatedVictoryDisplay } from './AutomatedVictoryDisplay';
import { JudgeBallotCard, useRevealedResult, useRevealStartTimes } from './StageDisplayView';
import {
  ARCH_CLIP_PATH,
  ARCH_COLUMNS,
  ARCH_HEIGHT,
  ARCH_OFFSET_X,
  ARCH_WIDTH,
  columnTop,
  edgeInset,
  HIDDEN,
  HIDDEN_ROWS,
  MODULE_PX,
  SHOW_ARCH_GRID,
  x,
  yFromBottom,
} from './archLayout';

// Main battle on the stepped-arch LED wall (/led?khung=vom, 2560×1536, 10 m × 6 m), in the same style as the 16:9
// screen (StageDisplayView). Zones follow what the audience can actually see (heights for the default map):
//   arch top (6-cabinet tower)       event logo, clear of the top edge, then category · stage · match below
//   upper flanks                     the two corners' photos, kept inside the steps
//   2.9–3.5 m                        name bars from the wall edges, score at their inner end
//   1.6–2.8 m                        judges × rounds, on a dark fade so the red / blue votes stand out
//   bottom 1.5 m (&che=3)            hidden by the seated judges: event name only, nothing that matters
// A result is shown in place, no pop-up: the winning corner lights up (photo, name bar, score), the other greys out.
// Positions are fractions of the wall (x across, heights from the bottom), so a corrected pixel map just works.

const GRID = { top: HIDDEN + 0.205, bottom: HIDDEN + 0.002 }; // judge names + one row per round
const BAR = { top: GRID.top + 0.115, bottom: GRID.top + 0.018 }; // names

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

/** `winnerDelay`: seconds between the last pill turning and the result lighting up (set on the battle console). */
export const ArchBattleView: React.FC<{ winnerDelay?: number }> = ({ winnerDelay }) => {
  const { matches, activeMatchId, judges, storageConfig } = useTournament();
  const match = matches.find((m) => m.id === activeMatchId) || matches[0];
  const revealStartTimes = useRevealStartTimes(match, judges.length);
  const revealed = useRevealedResult(match, revealStartTimes, judges.length, winnerDelay);

  // The picture keeps its pixel size on the HDMI output; only a smaller preview window scales it down.
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(1, window.innerWidth / (ARCH_OFFSET_X + ARCH_WIDTH), window.innerHeight / ARCH_HEIGHT));
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
        overlapClassName="-ml-[22%]"
      />
    ) : (
      <img
        src={getDancerHalfBodyUrl(side.dancers[0], storageConfig.placeholders)}
        alt={sideName(side)}
        className={`h-full w-full object-contain object-bottom ${shadow}`}
      />
    );
  };
  // Photos stand on the name bars, clear of the scores (side by side under VS).
  // 2vs2: the pair centred in its own flank. 1vs1: one half-body near the centre, small enough to show whole above the bars.
  const photoBox =
    match.category === 'pro_2v2'
      ? { red: [0.16, 0.42], blue: [0.58, 0.84], top: 0.78, bottom: BAR.bottom - 0.03 } // mid-flank, under the 10-row steps
      : { red: [0.24, 0.45], blue: [0.55, 0.76], top: 0.8, bottom: BAR.bottom - 0.02 }; // under the match label: raised arms stay clear

  // One row per regulation round of this stage (1, 2 or 4), then the tie-break row: shown dim until a level score
  // opens it, then lit while the regulation rows dim (docs/main-battle.md 2.5).
  const isTieBreak = (r: BattleRound) => Boolean(r.isTieBreak);
  const roundLabel = (r?: BattleRound) => (!r ? '' : isTieBreak(r) ? 'Tie-break' : `Round ${r.roundNumber}`);
  const tieRound = revealed.pending ? undefined : match.rounds.find(isTieBreak);
  const roundRows: (BattleRound | null)[] = [...regulationRounds(match), tieRound ?? null];

  // Announced result: the match winner once it's over, else the last revealed round until the next votes come in.
  const current = match.rounds.find((r) => r.roundNumber === match.currentRound);
  const lastOpen = [...match.rounds].reverse().find(isRoundOpen);
  const nextStarted = current && !isRoundOpen(current) && Object.values(current.votes).some(Boolean);
  // A level score after the regulation rounds: no winner yet, the tie-break row is lit instead.
  const tiePending = Boolean(tieRound && !isRoundOpen(tieRound));
  const winner = revealed.pending || tiePending
    ? null
    : match.status === 'finished' && match.winnerSide
      ? match.winnerSide
      : nextStarted
        ? null
        : (lastOpen?.winner ?? null);
  const lost = (side: 'red' | 'blue') => winner !== null && winner !== side;
  const won = (side: 'red' | 'blue') => winner === side;
  const dim = (side: 'red' | 'blue') => `transition-all duration-700 ${lost(side) ? 'grayscale opacity-30' : ''}`;

  // Judge rows: half the height two rows would get from the strip, smaller only when 5 rows (4 + tie-break) need it.
  const gridPx = yFromBottom(GRID.bottom) - yFromBottom(GRID.top);
  const rows = roundRows.length;
  const rowH = Math.min(Math.floor((gridPx - 52 - 2 * 10) / 4), Math.floor((gridPx - 52 - rows * 10) / rows));
  const cols = `260px repeat(${Math.max(judges.length, 1)}, minmax(0, 1fr))`;
  // Name text starts where the wall's edge is high enough to show the whole bar.
  const barPad = edgeInset(BAR.top * ARCH_HEIGHT) + 40;

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <div
        className="absolute top-0 origin-top-left overflow-hidden text-white"
        style={{ left: ARCH_OFFSET_X * scale, width: ARCH_WIDTH, height: ARCH_HEIGHT, transform: `scale(${scale})` }}
      >
        {/* Everything below is clipped to the stepped outline: no pixels are spent where there is no LED */}
        <div className="absolute inset-0" style={{ clipPath: ARCH_CLIP_PATH }}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a2a6c] via-[#13205a] to-[#0a1238]" />
          <div className="absolute -left-[10%] top-[20%] h-[90%] w-[60%] rounded-full bg-red-600/25 blur-[140px]" />
          <div className="absolute -right-[10%] top-[20%] h-[90%] w-[60%] rounded-full bg-blue-600/25 blur-[140px]" />
          <div className="absolute inset-0 opacity-[0.06] [background:repeating-linear-gradient(115deg,#fff_0_2px,transparent_2px_56px)]" />

          {/* Arch top: logo in the tower (kept off the top edge), category · stage · match on the step below */}
          <div style={box(0.36, 0.64, 0.95, 0.865)} className="flex items-center justify-center">
            <img src="/logo.png" alt="HipHop Xứ Trà U16" className="h-full w-auto drop-shadow-[0_0_30px_rgba(239,68,68,0.45)]" />
          </div>
          <div style={box(0.31, 0.69, 0.855, 0.805)} className="flex items-center justify-center">
            <span className="whitespace-nowrap rounded-xl bg-gradient-to-b from-amber-200 to-amber-400 px-6 py-1.5 font-condensed text-[40px] font-black uppercase leading-none text-zinc-950">
              {match.category === 'pro_2v2' ? 'Kid Pro 2vs2' : 'Kid Newbie 1vs1'} · {match.stageName} · Trận {String(match.matchNumber).padStart(2, '0')}
            </span>
          </div>

          {/* The winning corner lights up: a glow in its colour behind the photo */}
          {winner && (
            <div
              key={`glow-${winner}`}
              style={box(winner === 'red' ? 0.05 : 0.5, winner === 'red' ? 0.5 : 0.95, 0.83, BAR.bottom)}
              className={`led-pop rounded-full blur-[120px] ${winner === 'red' ? 'bg-red-500/45' : 'bg-blue-500/45'}`}
            />
          )}

          {/* Corner photos, inside the steps */}
          <div key={`r-${match.id}`} style={box(photoBox.red[0], photoBox.red[1], photoBox.top, photoBox.bottom)} className={`led-rise ${dim('red')} ${won('red') ? 'scale-105 brightness-110' : ''}`}>
            {photo(match.sideRed, 'red')}
          </div>
          <div key={`b-${match.id}`} style={box(photoBox.blue[0], photoBox.blue[1], photoBox.top, photoBox.bottom)} className={`led-rise ${dim('blue')} ${won('blue') ? 'scale-105 brightness-110' : ''}`}>
            {photo(match.sideBlue, 'blue')}
          </div>

          {/* From the name bars down: fade to dark so the vote colours read clearly over the photos */}
          <div style={box(0, 1, BAR.top, 0)} className="bg-gradient-to-b from-transparent via-[#05060f]/80 via-35% to-[#05060f]/95" />

          {/* Centre: VS and the round being danced; after a result, who won it (the scores below tell by how much) */}
          <div style={box(0.36, 0.64, 0.79, BAR.top + 0.125)} className="flex flex-col items-center justify-center gap-3">
            {winner ? (
              <>
                <span className="font-condensed text-[56px] font-black uppercase leading-none tracking-[0.2em] text-white/80">
                  {match.status === 'finished' ? 'Chung cuộc' : roundLabel(lastOpen)}
                </span>
                <span
                  key={`win-${winner}-${lastOpen?.roundNumber}`}
                  className={`led-pop whitespace-nowrap rounded-full px-9 py-3 font-condensed text-[64px] font-black uppercase leading-none text-white ${
                    winner === 'red' ? 'bg-red-600 shadow-[0_0_60px_rgba(239,68,68,0.9)]' : 'bg-blue-600 shadow-[0_0_60px_rgba(59,130,246,0.9)]'
                  }`}
                >
                  {winner === 'red' ? 'Đỏ' : 'Xanh'} thắng
                </span>
              </>
            ) : tiePending ? (
              <>
                <span className="font-condensed text-[56px] font-black uppercase leading-none tracking-[0.2em] text-white/80">
                  Hòa {match.roundWinsRed}–{match.roundWinsBlue}
                </span>
                <span className="led-pop whitespace-nowrap rounded-full bg-amber-400 px-9 py-3 font-condensed text-[64px] font-black uppercase leading-none text-zinc-950 shadow-[0_0_60px_rgba(251,191,36,0.9)]">
                  Tie-break
                </span>
              </>
            ) : (
              <>
                <span className="font-condensed text-[150px] font-black italic leading-none text-white drop-shadow-[0_0_40px_rgba(251,191,36,0.6)]">VS</span>
                {(revealed.pending || current) && (
                  <span className="whitespace-nowrap rounded-full bg-amber-400 px-7 py-2 font-condensed text-[44px] font-black uppercase leading-none text-zinc-950">
                    {revealed.pending ? 'Công bố kết quả' : roundLabel(current)}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Name bars from the wall edges (the steps cut them off), score at the inner end */}
          <div className={`absolute inset-0 ${dim('red')}`}>
            <NameBar color="red" name={sideName(match.sideRed)} sub={sideSub(match, match.sideRed)} pad={barPad} won={won('red')} style={box(0, 0.47, BAR.top, BAR.bottom)} />
            <ScoreBox color="red" value={revealed.wins('red')} won={won('red')} style={box(0.435, 0.495, BAR.top + 0.09, BAR.bottom + 0.04)} />
          </div>
          <div className={`absolute inset-0 ${dim('blue')}`}>
            <NameBar color="blue" name={sideName(match.sideBlue)} sub={sideSub(match, match.sideBlue)} pad={barPad} won={won('blue')} style={box(0.53, 1, BAR.top, BAR.bottom)} />
            <ScoreBox color="blue" value={revealed.wins('blue')} won={won('blue')} style={box(0.505, 0.565, BAR.top + 0.09, BAR.bottom + 0.04)} />
          </div>

          {/* Judges × rounds, kept clear of the band the seated judges hide */}
          <div style={box(0.06, 0.94, GRID.top, GRID.bottom)}>
            <div className="grid h-[42px] gap-x-3" style={{ gridTemplateColumns: cols }}>
              <span />
              {judges.map((j) => (
                <span
                  key={j.id}
                  className="truncate rounded-md bg-black/55 px-2 py-1.5 text-center font-condensed text-[30px] font-black uppercase leading-none text-white ring-1 ring-white/10"
                >
                  {j.judgeName || j.code}
                </span>
              ))}
            </div>
            <div className="mt-2.5 space-y-2.5">
              {roundRows.map((round) => {
                if (!round) {
                  // Tie-break not needed (yet): a dim placeholder row
                  return (
                    <div key="tie-break" className="grid gap-x-3 opacity-30" style={{ gridTemplateColumns: cols, height: rowH }}>
                      <div className="flex items-center rounded-xl bg-black/55 px-4 ring-1 ring-white/10">
                        <span className="whitespace-nowrap font-condensed text-[32px] font-black uppercase leading-none text-amber-300">Tie-break</span>
                      </div>
                      {judges.map((j) => (
                        <span key={j.id} className="rounded-xl bg-white/10" />
                      ))}
                    </div>
                  );
                }
                const open = isRoundOpen(round);
                const tie = isTieBreak(round);
                const live = round.roundNumber === match.currentRound && match.status !== 'finished';
                return (
                  <div
                    key={round.roundNumber}
                    className={`grid gap-x-3 transition-opacity duration-700 ${tieRound && !tie ? 'opacity-40' : ''}`}
                    style={{ gridTemplateColumns: cols, height: rowH }}
                  >
                    <div
                      className={`flex items-center justify-between gap-2 rounded-xl px-4 ${
                        tie ? 'bg-amber-500/25 ring-2 ring-amber-400' : live ? 'bg-black/60 ring-2 ring-amber-400/80' : 'bg-black/55 ring-1 ring-white/10'
                      }`}
                    >
                      <span className={`whitespace-nowrap font-condensed font-black uppercase leading-none ${tie ? 'text-[32px] text-amber-300' : 'text-[38px]'}`}>
                        {roundLabel(round)}
                      </span>
                      {open && round.winner && revealed.settled(round.roundNumber) && (
                        <span className={`h-5 w-5 shrink-0 rounded-full ${round.winner === 'red' ? 'bg-red-500' : 'bg-blue-500'}`} />
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

          {/* Bottom band (hidden by the seated judges): event name only */}
          <div style={box(0.05, 0.95, HIDDEN, 0)} className="flex items-center justify-center">
            <p className="font-condensed text-[72px] font-black uppercase tracking-[0.35em] text-white/15">HipHop Xứ Trà 2026 · Breaking U16</p>
          </div>

          {/* Fanfare and confetti for the match winner; the result itself is shown in place above */}
          <AutomatedVictoryDisplay match={match} overlay={false} holdUntil={revealed.holdUntil} />
        </div>

        {SHOW_ARCH_GRID && <ArchGrid />}
      </div>
    </div>
  );
};

/** `pad`: room on the outer end for the edge column, which is too short to show the bar. */
const NameBar: React.FC<{ color: 'red' | 'blue'; name: string; sub: string; pad: number; won: boolean; style: React.CSSProperties }> = ({
  color,
  name,
  sub,
  pad,
  won,
  style,
}) => (
  <div
    style={{ ...style, [color === 'red' ? 'paddingLeft' : 'paddingRight']: pad }}
    className={`led-rise flex flex-col justify-center gap-1.5 ${
      color === 'red'
        ? 'items-start rounded-r-2xl bg-gradient-to-r from-red-700/95 via-red-600/95 to-red-500/90 pr-[150px] shadow-[0_10px_50px_rgba(239,68,68,0.45)]'
        : 'items-end rounded-l-2xl bg-gradient-to-l from-blue-700/95 via-blue-600/95 to-blue-500/90 pl-[150px] text-right shadow-[0_10px_50px_rgba(59,130,246,0.45)]'
    } ${won ? (color === 'red' ? 'brightness-125 shadow-[0_0_90px_rgba(239,68,68,0.9)]' : 'brightness-125 shadow-[0_0_90px_rgba(59,130,246,0.9)]') : ''}`}
  >
    <span
      className={`max-w-full truncate font-condensed font-black uppercase leading-[0.9] drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)] ${
        name.length > 18 ? 'text-[58px]' : name.length > 11 ? 'text-[74px]' : 'text-[92px]'
      }`}
    >
      {name}
    </span>
    {sub && <span className="max-w-full truncate text-[26px] font-bold uppercase leading-none text-white/85">{sub}</span>}
  </div>
);

/** Rounds won: the two boxes side by side under VS, overlapping the top of the name bars' inner ends. */
const ScoreBox: React.FC<{ color: 'red' | 'blue'; value: number; won: boolean; style: React.CSSProperties }> = ({ color, value, won, style }) => (
  <div
    style={style}
    className={`flex items-center justify-center rounded-2xl font-condensed text-[140px] font-black leading-none tabular-nums transition-transform duration-700 ${
      won ? 'z-10 scale-110 ring-8 ring-white/90' : ''
    } ${
      color === 'red'
        ? 'bg-gradient-to-b from-red-500 to-red-700 shadow-[0_0_50px_rgba(239,68,68,0.65)] ring-4 ring-red-300/60'
        : 'bg-gradient-to-b from-blue-500 to-blue-700 shadow-[0_0_50px_rgba(59,130,246,0.65)] ring-4 ring-blue-300/60'
    }`}
  >
    {value}
  </div>
);

/** Setup aid (&luoi=1): cabinet grid inside the wall, the cut-away area greyed, the band the judges hide marked. */
const ArchGrid: React.FC = () => (
  <svg className="pointer-events-none absolute inset-0" width={ARCH_WIDTH} height={ARCH_HEIGHT}>
    <line x1={0} x2={ARCH_WIDTH} y1={yFromBottom(HIDDEN)} y2={yFromBottom(HIDDEN)} stroke="rgba(251,191,36,0.9)" strokeWidth={4} strokeDasharray="24 16" />
    <text x={ARCH_WIDTH / 2} y={yFromBottom(HIDDEN) + 48} fill="rgba(251,191,36,0.9)" fontSize={36} fontWeight={700} textAnchor="middle">
      Bàn giám khảo che phần dưới vạch này (che={HIDDEN_ROWS} hàng)
    </text>
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
