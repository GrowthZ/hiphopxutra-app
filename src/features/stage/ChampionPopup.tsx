import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { BattleMatch } from '../../domain/types';
import { DEFAULT_CHAMPION_DELAY } from '../../domain/reveal';
import { TeamPhoto } from '../../shared/TeamPhoto';
import { getDancerHalfBodyUrl, getTeamPhotoUrl, stripBreakerPrefix } from '../../shared/placeholderAssets';
import { useTournament } from '../../state/TournamentContext';
import { HIDDEN, x, yFromBottom } from './archLayout';

/**
 * When the champion popup may show: the final is over, its result has lit up on the LED (`holdUntil`, the last pill
 * turned plus the winner delay), then `delay` more seconds. "Phát lại hiệu ứng thắng" starts the wait over. A screen
 * opened after the final shows it after `delay`.
 */
function useChampionVisible(match: BattleMatch, holdUntil: number, delay: number) {
  const isChampion = match.stage === 'final' && match.status === 'finished' && Boolean(match.winnerSide);
  const [seenAt, setSeenAt] = useState<number | null>(null);
  useEffect(() => setSeenAt(isChampion ? Date.now() : null), [isChampion, match.id, match.victoryTriggerTimestamp]);

  const showAt = seenAt === null ? Infinity : Math.max(holdUntil, seenAt) + delay * 1000;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!Number.isFinite(showAt)) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, showAt - Date.now()) + 20);
    return () => clearTimeout(timer);
  }, [showAt]);

  return { visible: isChampion && now >= showAt, showAt };
}

const goldBurst = () => {
  const colors = ['#fbbf24', '#f59e0b', '#fef08a', '#ffffff'];
  confetti({ particleCount: 140, spread: 110, startVelocity: 55, origin: { x: 0.5, y: 0.45 }, colors });
  setTimeout(() => confetti({ particleCount: 90, angle: 60, spread: 70, origin: { x: 0.3, y: 0.7 }, colors }), 300);
  setTimeout(() => confetti({ particleCount: 90, angle: 120, spread: 70, origin: { x: 0.7, y: 0.7 }, colors }), 300);
};

/**
 * Champion popup over the main battle LED after the final: event logo on top, the champion's photo (dancer or team)
 * below, then "Vô địch hạng mục …" and the name. `layout`: the 16:9 screen (1920×1080) or the arch wall, where it keeps
 * to the tower and stays above the band the judges hide.
 */
export const ChampionPopup: React.FC<{ match: BattleMatch; holdUntil: number; delay?: number; layout: 'wide' | 'arch' }> = ({
  match,
  holdUntil,
  delay = DEFAULT_CHAMPION_DELAY,
  layout,
}) => {
  const { storageConfig } = useTournament();
  const { visible, showAt } = useChampionVisible(match, holdUntil, delay);

  useEffect(() => {
    if (visible) goldBurst();
  }, [visible, showAt]);

  if (!visible || !match.winnerSide) return null;

  const side = match.winnerSide === 'red' ? match.sideRed : match.sideBlue;
  const isTeam = match.category === 'pro_2v2';
  const category = isTeam ? 'Kid Pro 2vs2' : 'Kid Newbie 1vs1';
  const members = side.dancers.map((d) => stripBreakerPrefix(d.name)).join(' & ');
  const name = isTeam ? stripBreakerPrefix(side.name) || members : members || stripBreakerPrefix(side.name);
  const sbd = side.sbdText ? side.sbdText.replace(/^SBD\s*/i, '') : side.dancers.map((d) => d.sbd).filter(Boolean).join(' / ');
  const crews = [...new Set(side.dancers.map((d) => d.crew).filter(Boolean))].join(' · ');
  const sub = [sbd && `SBD ${sbd}`, isTeam && members !== name ? members : '', crews].filter(Boolean).join('  ·  ');

  const photo = isTeam ? (
    <TeamPhoto
      photoUrl={side.teamPhotoUrl}
      dancers={side.dancers}
      placeholder={getTeamPhotoUrl(undefined, storageConfig.placeholders)}
      alt={name}
      className="h-full w-full object-contain object-bottom drop-shadow-[0_0_50px_rgba(251,191,36,0.55)]"
      boxClassName="h-full w-full"
      cutoutClassName="drop-shadow-[0_0_50px_rgba(251,191,36,0.55)]"
      overlapClassName="-ml-[20%]"
    />
  ) : (
    <img
      src={getDancerHalfBodyUrl(side.dancers[0], storageConfig.placeholders)}
      alt={name}
      className="h-full w-full object-contain object-bottom drop-shadow-[0_0_50px_rgba(251,191,36,0.55)]"
    />
  );

  const arch = layout === 'arch';
  // Positions: the 16:9 picture in px, the arch in fractions of the wall (heights from the bottom).
  const at = (left: number, right: number, top: number, bottom: number): React.CSSProperties =>
    arch
      ? { position: 'absolute', left: x(left), width: x(right) - x(left), top: yFromBottom(top), height: yFromBottom(bottom) - yFromBottom(top) }
      : { position: 'absolute', left: left * 1920, width: (right - left) * 1920, top: top * 1080, height: (bottom - top) * 1080 };
  const zones = arch
    ? {
        logo: at(0.38, 0.62, 0.965, 0.855),
        photo: at(0.28, 0.72, 0.85, HIDDEN + 0.2),
        text: at(0.12, 0.88, HIDDEN + 0.205, HIDDEN + 0.005),
      }
    : {
        logo: at(0.38, 0.62, 0.03, 0.165),
        photo: at(0.25, 0.75, 0.17, 0.735),
        text: at(0.04, 0.96, 0.72, 0.975),
      };
  const size = arch
    ? { ribbon: 'text-[64px] px-12 py-3', name: 'text-[120px]', sub: 'text-[40px]' }
    : { ribbon: 'text-[52px] px-10 py-2.5', name: 'text-[104px]', sub: 'text-[32px]' };

  return (
    <div role="dialog" aria-label={`Vô địch hạng mục ${category}: ${name}`} className="absolute inset-0 z-40 overflow-hidden">
      {/* Backdrop: dark, a gold glow and slow sunburst rays behind the champion */}
      <div className="led-fade-in absolute inset-0 bg-[#05060f]/95" />
      <div
        className="led-fade-in absolute left-1/2 top-[45%] aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2 opacity-60 motion-safe:animate-[spin_90s_linear_infinite] [background:repeating-conic-gradient(rgba(251,191,36,0.16)_0deg_5deg,transparent_5deg_15deg)] [mask-image:radial-gradient(circle,black_10%,transparent_55%)]"
      />
      <div className="led-fade-in absolute left-1/2 top-[45%] h-[70%] w-[55%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/25 blur-[140px]" />

      {/* Logo */}
      <div style={zones.logo} className="led-rise flex items-center justify-center">
        <img src="/logo.png" alt="HipHop Xứ Trà U16" className="h-full w-auto drop-shadow-[0_0_30px_rgba(251,191,36,0.5)]" />
      </div>

      {/* Champion */}
      <div style={{ ...zones.photo, animationDelay: '0.25s' }} className="led-pop">
        {photo}
      </div>

      {/* Vô địch hạng mục … · name · SBD / crew */}
      <div style={zones.text} className="flex flex-col items-center justify-center gap-3 text-center">
        <span
          style={{ animationDelay: '0.6s' }}
          className={`led-pop whitespace-nowrap rounded-full bg-gradient-to-b from-amber-200 via-amber-300 to-amber-500 font-condensed font-black uppercase leading-none tracking-wide text-zinc-950 shadow-[0_0_60px_rgba(251,191,36,0.8)] ring-4 ring-amber-100/70 ${size.ribbon}`}
        >
          Vô địch hạng mục {category}
        </span>
        <span
          style={{ animationDelay: '0.85s' }}
          className={`led-rise max-w-full truncate font-condensed font-black uppercase leading-[1.05] text-white drop-shadow-[0_6px_20px_rgba(0,0,0,0.9)] ${size.name}`}
        >
          {name}
        </span>
        {sub && (
          <span style={{ animationDelay: '1s' }} className={`led-rise max-w-full truncate font-bold uppercase tracking-wider text-amber-200/90 ${size.sub}`}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
};
