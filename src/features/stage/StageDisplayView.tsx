import React, { useState, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { TeamPhoto } from '../../shared/TeamPhoto';
import { useTournament } from '../../state/TournamentContext';
import { soundFX } from '../../services/soundEffects';
import { getDancerHalfBodyUrl, getTeamPhotoUrl, stripBreakerPrefix } from '../../shared/placeholderAssets';
import { BattleMatch, BattleSide } from '../../domain/types';
import { isRoundOpen } from '../../domain/model';
import { AutomatedVictoryDisplay } from './AutomatedVictoryDisplay';

// Main battle on the 16:9 LED (/led). Drawn on a fixed 1920×1080 canvas and scaled to the window, so the HDMI
// output is pixel-exact and the /admin/led preview is the same picture, smaller.
//   top            category · event logo · stage and match
//   middle         the two corners: photo on the outside, name bar from the screen edge, score at its inner end
//   name bar → end dark fade under the judge table, so the red / blue votes stand out over the photos
const W = 1920;
const H = 1080;
const BAR_TOP = 470; // name bars; the fade starts here
const GRID_TOP = 612; // judge names, then one row per round

interface JudgeBallotCardProps {
  judgeCode: string;
  judgeIndex: number;
  vote?: 'red' | 'blue' | 'hidden' | null;
  isRevealed: boolean;
  revealStartTime?: number;
}

/** One judge's pill in a round row: white while waiting, green once voted, flips to red / blue on reveal. */
export const JudgeBallotCard: React.FC<JudgeBallotCardProps> = ({ judgeCode, judgeIndex, vote, isRevealed, revealStartTime }) => {
  const [hasFlipped, setHasFlipped] = useState<boolean>(() => {
    if (!isRevealed) return false;
    if (!revealStartTime) return true;
    return Date.now() - revealStartTime > judgeIndex * 150 + 300;
  });
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const flipTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isRevealed) {
      setHasFlipped(false);
      setIsFlipping(false);
      return;
    }

    if (revealStartTime) {
      const elapsed = Date.now() - revealStartTime;
      const targetDelay = judgeIndex * 150; // 150ms per judge sequential flip

      if (elapsed < targetDelay) {
        setHasFlipped(false);
        setIsFlipping(false);
        flipTimerRef.current = setTimeout(() => {
          setIsFlipping(true);
          setHasFlipped(true);
          try {
            soundFX.playCardFlipTick(judgeIndex, vote === 'red' || vote === 'blue' ? vote : undefined);
          } catch {
            // ignore
          }
          setTimeout(() => setIsFlipping(false), 450);
        }, targetDelay - elapsed);
      } else {
        setHasFlipped(true);
        setIsFlipping(false);
      }
    } else {
      setHasFlipped(true);
      setIsFlipping(false);
    }

    return () => {
      if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
    };
  }, [isRevealed, revealStartTime, judgeIndex, vote]);

  const base = `flex h-full w-full items-center justify-center rounded-xl font-condensed font-black uppercase leading-none transition-colors ${
    isFlipping ? 'animate-judge-flip' : ''
  }`;

  if (isRevealed && hasFlipped) {
    return (
      <div
        className={`${base} text-[30px] tracking-wider text-white ${
          vote === 'red'
            ? 'bg-gradient-to-b from-red-500 to-red-700 shadow-[0_0_24px_rgba(239,68,68,0.85)] ring-2 ring-red-300/70'
            : vote === 'blue'
              ? 'bg-gradient-to-b from-blue-500 to-blue-700 shadow-[0_0_24px_rgba(59,130,246,0.85)] ring-2 ring-blue-300/70'
              : 'bg-white/10 text-white/40'
        }`}
      >
        {vote === 'red' ? 'Đỏ' : vote === 'blue' ? 'Xanh' : '—'}
      </div>
    );
  }

  if (vote != null) {
    return (
      <div className={`${base} bg-gradient-to-b from-emerald-500 to-emerald-700 shadow-[0_0_20px_rgba(16,185,129,0.8)] ring-2 ring-emerald-300/70`}>
        <Check className="h-9 w-9 text-white" strokeWidth={4} />
      </div>
    );
  }

  return (
    <div className={`${base} bg-gradient-to-b from-white to-zinc-200 text-[20px] text-zinc-400 shadow-[inset_0_-3px_0_rgba(0,0,0,0.12)]`}>
      {judgeCode.replace('GK ', '')}
    </div>
  );
};

/**
 * When each round of the match was revealed (round number -> ms), so its JudgeBallotCards flip one by one.
 * Rounds already open when the match first shows up stay still (a reload or a new screen mid-battle).
 */
export function useRevealStartTimes(match?: BattleMatch): Record<number, number> {
  const [revealStartTimes, setRevealStartTimes] = useState<Record<number, number>>({});
  const seen = useRef<{ matchId?: string; open: Set<number> }>({ open: new Set() });

  // Same window as the operator console: start right on the click, before the database round trip.
  useEffect(() => {
    const handleRoundRevealCustom = (e: Event) => {
      const customEvent = e as CustomEvent<{ matchId: string; roundNumbers: number[]; timestamp: number }>;
      if (customEvent.detail && customEvent.detail.matchId === match?.id) {
        const now = customEvent.detail.timestamp || Date.now();
        setRevealStartTimes((prev) => {
          const updated = { ...prev };
          customEvent.detail.roundNumbers.forEach((rNum) => {
            updated[rNum] = now;
          });
          return updated;
        });
      }
    };

    window.addEventListener('ROUND_REVEAL_DISPLAY_TRIGGER', handleRoundRevealCustom);
    return () => {
      window.removeEventListener('ROUND_REVEAL_DISPLAY_TRIGGER', handleRoundRevealCustom);
    };
  }, [match?.id]);

  useEffect(() => {
    if (!match) return;
    const open = new Set(match.rounds.filter(isRoundOpen).map((r) => r.roundNumber));
    const firstLook = seen.current.matchId !== match.id;
    const opened = firstLook ? [] : [...open].filter((n) => !seen.current.open.has(n));
    seen.current = { matchId: match.id, open };

    if (firstLook) {
      setRevealStartTimes({}); // round numbers repeat from match to match
    } else if (opened.length > 0) {
      const now = Date.now();
      setRevealStartTimes((prev) => {
        const updated = { ...prev };
        opened.forEach((rNum) => {
          // Keep the operator's click time if it just came in; otherwise (also a re-reveal after an undo) start now.
          if (!updated[rNum] || now - updated[rNum] > 3000) updated[rNum] = now;
        });
        return updated;
      });
    }
  }, [match?.id, match?.rounds]);

  return revealStartTimes;
}

interface StageDisplayViewProps {
  /** Set by /admin/led. */
  theme?: 'daylight' | 'night';
}

const breakerName = (side?: BattleSide) =>
  !side
    ? 'Chờ xác định'
    : side.dancers?.length
      ? side.dancers.map((d) => stripBreakerPrefix(d.name)).join(' & ')
      : stripBreakerPrefix(side.name);

/** SBD and crew (team name too for 2vs2), shown under the name. */
const sideSub = (match: BattleMatch, side: BattleSide) => {
  const sbd = side.sbdText ? side.sbdText.replace(/^SBD\s*/i, '').trim() : side.dancers.map((d) => d.sbd).filter(Boolean).join(' / ');
  const crews = [...new Set(side.dancers.map((d) => d.crew).filter(Boolean))].join(' · ');
  const team = match.category === 'pro_2v2' ? [side.name, crews].filter(Boolean).join(' · ') : crews;
  return [sbd && `SBD ${sbd}`, team].filter(Boolean).join('  ·  ');
};

// One line whatever the length.
const nameSize = (name: string) =>
  name.length > 20 ? 'text-[42px]' : name.length > 14 ? 'text-[52px]' : name.length > 8 ? 'text-[66px]' : 'text-[82px]';

// Short judge name for the column header ("GK 01 • Bboy Neo (HN)" -> "Neo").
const judgeShortName = (name: string, code: string) => {
  const clean = name?.split('•')[1]?.split('(')[0].trim().replace(/^BBOY\s+|^BGIRL\s+/i, '');
  return clean || code;
};

export const StageDisplayView: React.FC<StageDisplayViewProps> = ({ theme = 'daylight' }) => {
  const { matches, activeMatchId, judges, storageConfig } = useTournament();
  const match = matches.find((m) => m.id === activeMatchId) || matches[0];

  // Fixed 1920×1080 picture, scaled to fit and centred (letterboxed on other aspect ratios).
  const [fit, setFit] = useState({ scale: 1, left: 0, top: 0 });
  useEffect(() => {
    const resize = () => {
      const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
      setFit({ scale, left: (window.innerWidth - W * scale) / 2, top: (window.innerHeight - H * scale) / 2 });
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // 1. Both corners slide in from the sides (new match, or "Ra sân" from the operator)
  const [entranceKey, setEntranceKey] = useState<number>(() => Date.now());
  const [isEntranceActive, setIsEntranceActive] = useState<boolean>(true);
  const lastMatchIdRef = useRef<string>(match?.id || '');
  const lastEntranceTimestampRef = useRef<number | undefined>(match?.entranceTriggerTimestamp);

  const triggerEntranceAnimation = (playSound = true) => {
    setEntranceKey(Date.now());
    setIsEntranceActive(true);
    if (playSound) {
      try {
        soundFX.playTeamEntranceSwoosh();
      } catch {
        // ignore
      }
    }
    setTimeout(() => {
      setIsEntranceActive(false);
    }, 1200);
  };

  useEffect(() => {
    if (!match) return;
    if (match.id !== lastMatchIdRef.current) {
      lastMatchIdRef.current = match.id;
      lastEntranceTimestampRef.current = match.entranceTriggerTimestamp;
      triggerEntranceAnimation(true);
    } else if (match.entranceTriggerTimestamp && match.entranceTriggerTimestamp !== lastEntranceTimestampRef.current) {
      lastEntranceTimestampRef.current = match.entranceTriggerTimestamp;
      triggerEntranceAnimation(true);
    }
  }, [match?.id, match?.entranceTriggerTimestamp]);

  useEffect(() => {
    const handleEntranceCustom = (e: Event) => {
      const customEvent = e as CustomEvent<{ matchId: string; timestamp: number }>;
      if (customEvent.detail && customEvent.detail.matchId === match?.id) {
        lastEntranceTimestampRef.current = customEvent.detail.timestamp;
        triggerEntranceAnimation(true);
      }
    };

    window.addEventListener('TEAM_ENTRANCE_DISPLAY_TRIGGER', handleEntranceCustom);
    return () => {
      window.removeEventListener('TEAM_ENTRANCE_DISPLAY_TRIGGER', handleEntranceCustom);
    };
  }, [match?.id]);

  // 2. Judge pills flip one by one when a round is revealed
  const revealStartTimes = useRevealStartTimes(match);

  if (!match) return <div className="fixed inset-0 bg-black" />;

  // Announced result: the match winner once it's over, else the last revealed round until the next round's votes
  // start coming in. Drives RED WIN / BLUE WIN in the centre and greys out the losing side.
  const announcedWinner: 'red' | 'blue' | null = (() => {
    if (match.status === 'finished' && match.winnerSide) return match.winnerSide;
    const current = match.rounds.find((r) => r.roundNumber === match.currentRound);
    if (current && !isRoundOpen(current) && Object.values(current.votes).some(Boolean)) return null;
    const lastOpen = [...match.rounds].reverse().find(isRoundOpen);
    return lastOpen?.winner ?? null;
  })();
  const announcedRound = [...match.rounds].reverse().find(isRoundOpen);
  const lost = (side: 'red' | 'blue') => announcedWinner !== null && announcedWinner !== side;
  const dim = (side: 'red' | 'blue') => (lost(side) ? 'grayscale opacity-35' : '');

  const regularRounds = match.category === 'newbie_1v1' ? 2 : 4;
  const isTieBreakRound = (r: BattleMatch['rounds'][number]) => r.isTieBreak || r.roundNumber > regularRounds;
  const hasTieBreakRound = match.rounds.some((r) => r.isTieBreak);
  const isMatchTied =
    match.roundWinsRed === match.roundWinsBlue &&
    match.rounds.length > 0 &&
    match.rounds.filter((r) => !r.isTieBreak).every((r) => r.isConfirmed || r.isRevealed);
  const currentRound = match.rounds.find((r) => r.roundNumber === match.currentRound);
  const roundLabel = (r?: BattleMatch['rounds'][number]) => (!r ? '' : isTieBreakRound(r) ? 'Tie-break' : `Round ${r.roundNumber}`);

  // Rows fill the space under the names, and shrink when a 2vs2 battle needs more than three of them.
  const rowH = match.rounds.length > 3 ? 58 : match.rounds.length > 2 ? 84 : 96;
  const cols = `220px repeat(${Math.max(judges.length, 1)}, minmax(0, 1fr))`;

  const photoBox = match.category === 'pro_2v2' ? 'bottom-[360px] w-[860px]' : 'bottom-0 w-[720px]';

  const photo = (side: BattleSide, color: 'red' | 'blue') => {
    const shadow = `drop-shadow-[0_14px_30px_rgba(0,0,0,0.85)] ${
      color === 'red' ? 'drop-shadow-[0_0_40px_rgba(239,68,68,0.35)]' : 'drop-shadow-[0_0_40px_rgba(59,130,246,0.35)]'
    }`;
    return match.category === 'pro_2v2' ? (
      <TeamPhoto
        photoUrl={side.teamPhotoUrl}
        dancers={side.dancers}
        placeholder={getTeamPhotoUrl(undefined, storageConfig.placeholders)}
        alt={breakerName(side)}
        className={`h-full w-full object-contain object-bottom ${shadow}`}
        boxClassName="h-full w-full"
        cutoutClassName={shadow}
      />
    ) : (
      <img
        src={getDancerHalfBodyUrl(side.dancers?.[0], storageConfig.placeholders)}
        alt={breakerName(side)}
        className={`h-full w-full object-contain object-bottom ${shadow}`}
      />
    );
  };

  const statusText =
    match.status === 'finished'
      ? `Chung cuộc ${match.roundWinsRed} - ${match.roundWinsBlue}${hasTieBreakRound ? ' · thắng tie-break' : ''}`
      : hasTieBreakRound || isMatchTied
        ? `Hòa ${match.roundWinsRed} - ${match.roundWinsBlue} · tie-break phân định thắng thua`
        : `${regularRounds} rounds · hòa đấu tie-break`;

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <div
        className="absolute origin-top-left overflow-hidden text-white select-none"
        style={{ width: W, height: H, left: fit.left, top: fit.top, transform: `scale(${fit.scale})` }}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 ${
            theme === 'daylight' ? 'bg-gradient-to-b from-[#1a2a6c] via-[#13205a] to-[#0a1238]' : 'bg-gradient-to-b from-[#120a24] via-[#0b1030] to-[#05060f]'
          }`}
        />
        <div className="absolute -left-[12%] top-[8%] h-[80%] w-[55%] rounded-full bg-red-600/25 blur-[140px]" />
        <div className="absolute -right-[12%] top-[8%] h-[80%] w-[55%] rounded-full bg-blue-600/25 blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.06] [background:repeating-linear-gradient(115deg,#fff_0_2px,transparent_2px_64px)]" />

        {/* Top: category · logo · stage */}
        <div className="absolute inset-x-[40px] top-[22px] flex h-[130px] items-center gap-6">
          <div className="flex flex-1 items-center gap-4">
            <span className="rounded-lg bg-gradient-to-b from-amber-200 to-amber-400 px-5 py-2 font-condensed text-[32px] font-black uppercase leading-none text-zinc-950 shadow-lg">
              {match.category === 'pro_2v2' ? 'Kid Pro 2vs2' : 'Kid Newbie 1vs1'}
            </span>
            <span className="h-[3px] flex-1 rounded-full bg-gradient-to-r from-amber-300 to-amber-300/0" />
          </div>
          <img src="/logo.png" alt="HipHop Xứ Trà U16" className="h-[130px] w-auto shrink-0 drop-shadow-[0_0_30px_rgba(239,68,68,0.45)]" />
          <div className="flex flex-1 items-center gap-4">
            <span className="h-[3px] flex-1 rounded-full bg-gradient-to-l from-amber-300 to-amber-300/0" />
            <span className="rounded-lg bg-gradient-to-b from-amber-200 to-amber-400 px-5 py-2 font-condensed text-[32px] font-black uppercase leading-none text-zinc-950 shadow-lg">
              {match.stageName} · Trận {String(match.matchNumber).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Corner photos (behind everything else). A 1vs1 half-body runs down behind the judge table; a 2vs2 photo is
            usually landscape, so it gets a wider box that ends a little under the name bar, keeping the team in view */}
        <div key={`rp-${entranceKey}`} className={`absolute left-[20px] top-[165px] ${photoBox} transition-all duration-700 ${dim('red')} ${isEntranceActive ? 'animate-entrance-left' : ''}`}>
          {photo(match.sideRed, 'red')}
        </div>
        <div key={`bp-${entranceKey}`} className={`absolute right-[20px] top-[165px] ${photoBox} transition-all duration-700 ${dim('blue')} ${isEntranceActive ? 'animate-entrance-right' : ''}`}>
          {photo(match.sideBlue, 'blue')}
        </div>

        {/* From the name bars down: fade to dark so the vote colours read clearly over the photos */}
        <div
          className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-transparent via-[#05060f]/80 via-35% to-[#05060f]/95"
          style={{ top: BAR_TOP }}
        />

        {/* Centre: RED WIN / BLUE WIN, or VS and the round being danced */}
        {announcedWinner ? (
          <div
            key={`win-${announcedWinner}-${announcedRound?.roundNumber}-${match.status}`}
            className="led-pop absolute left-[560px] right-[560px] top-[140px] flex h-[220px] flex-col items-center justify-center"
          >
            <span
              className={`whitespace-nowrap font-condensed text-[170px] font-black italic uppercase leading-[0.85] tracking-tight text-white ${
                announcedWinner === 'red'
                  ? 'drop-shadow-[0_0_40px_rgba(239,68,68,0.95)] [-webkit-text-stroke:6px_#dc2626]'
                  : 'drop-shadow-[0_0_40px_rgba(59,130,246,0.95)] [-webkit-text-stroke:6px_#2563eb]'
              }`}
            >
              {announcedWinner === 'red' ? 'Red' : 'Blue'} win
            </span>
            <span
              className={`mt-3 rounded-full px-6 py-2 font-condensed text-[36px] font-black uppercase leading-none ${
                announcedWinner === 'red' ? 'bg-red-600' : 'bg-blue-600'
              }`}
            >
              {match.status === 'finished' ? 'Chung cuộc' : roundLabel(announcedRound)}
            </span>
          </div>
        ) : (
          <div className="absolute left-[760px] right-[760px] top-[170px] flex h-[180px] flex-col items-center justify-center gap-3">
            <span className="font-condensed text-[120px] font-black italic leading-none text-white drop-shadow-[0_0_30px_rgba(251,191,36,0.6)]">
              VS
            </span>
            {currentRound && (
              <span className="whitespace-nowrap rounded-full bg-amber-400 px-5 py-1.5 font-condensed text-[34px] font-black uppercase leading-none text-zinc-950">
                {roundLabel(currentRound)}
              </span>
            )}
          </div>
        )}

        {/* Name bars from the screen edges, score at the inner end */}
        <div key={`rn-${entranceKey}`} className={`absolute inset-0 transition-all duration-700 ${dim('red')} ${isEntranceActive ? 'animate-entrance-left' : ''}`}>
          <NameBar color="red" name={breakerName(match.sideRed)} sub={sideSub(match, match.sideRed)} />
          <ScoreBox color="red" value={match.roundWinsRed} />
        </div>
        <div key={`bn-${entranceKey}`} className={`absolute inset-0 transition-all duration-700 ${dim('blue')} ${isEntranceActive ? 'animate-entrance-right' : ''}`}>
          <NameBar color="blue" name={breakerName(match.sideBlue)} sub={sideSub(match, match.sideBlue)} />
          <ScoreBox color="blue" value={match.roundWinsBlue} />
        </div>

        {/* Judges × rounds */}
        <div className="absolute inset-x-[50px]" style={{ top: GRID_TOP }}>
          <div className="grid gap-x-3" style={{ gridTemplateColumns: cols }}>
            <span />
            {judges.map((j) => (
              <span
                key={j.id}
                className="truncate rounded-md bg-black/55 px-2 py-1.5 text-center font-condensed text-[26px] font-black uppercase leading-none text-white ring-1 ring-white/10"
              >
                {j.judgeName || judgeShortName(j.name, j.code)}
              </span>
            ))}
          </div>

          <div className="mt-3 space-y-3">
            {match.rounds.map((round) => {
              const isTieBreak = isTieBreakRound(round);
              const isCurrent = round.roundNumber === match.currentRound && match.status !== 'finished';
              const isRevealed = isRoundOpen(round);
              const revealAt = revealStartTimes[round.roundNumber];
              const flipping = isRevealed && revealAt && Date.now() - revealAt < judges.length * 150 + 200;
              const votes = Object.values(round.votes).filter(Boolean).length;
              return (
                <div key={round.roundNumber} className="grid gap-x-3" style={{ gridTemplateColumns: cols, height: rowH }}>
                  <div
                    className={`flex flex-col justify-center rounded-xl px-4 ${
                      isTieBreak ? 'bg-amber-500/25 ring-2 ring-amber-400' : isCurrent ? 'bg-black/60 ring-2 ring-amber-400/80' : 'bg-black/55 ring-1 ring-white/10'
                    }`}
                  >
                    <span className={`whitespace-nowrap font-condensed font-black uppercase leading-none ${isTieBreak ? 'text-[28px] text-amber-300' : 'text-[32px] text-white'}`}>
                      {roundLabel(round)}
                    </span>
                    <span
                      className={`mt-1 text-[15px] font-black uppercase leading-none tracking-wider ${
                        isRevealed && !flipping ? (round.winner === 'red' ? 'text-red-400' : 'text-blue-400') : 'text-emerald-300'
                      }`}
                    >
                      {isRevealed ? (flipping ? 'Đang lật phiếu…' : round.winner === 'red' ? 'Đỏ thắng' : 'Xanh thắng') : `${votes}/${judges.length} đã chấm`}
                    </span>
                  </div>
                  {judges.map((j, idx) => (
                    <JudgeBallotCard
                      key={j.id}
                      judgeCode={j.code}
                      judgeIndex={idx}
                      vote={round.votes[j.id]}
                      isRevealed={isRevealed}
                      revealStartTime={revealAt}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Format / result tag */}
        <div className="absolute inset-x-0 bottom-[16px] flex justify-center">
          <span
            className={`rounded-lg px-5 py-1.5 font-condensed text-[26px] font-black uppercase leading-none tracking-wider ${
              match.status === 'finished'
                ? 'bg-emerald-500 text-zinc-950'
                : hasTieBreakRound || isMatchTied
                  ? 'bg-amber-400 text-zinc-950'
                  : 'bg-black/60 text-white/85 ring-1 ring-white/15'
            }`}
          >
            {statusText}
          </span>
        </div>

        <AutomatedVictoryDisplay match={match} />
      </div>
    </div>
  );
};

/** Name bar from the screen edge to near the centre; the score box sits on its inner end. */
const NameBar: React.FC<{ color: 'red' | 'blue'; name: string; sub: string }> = ({ color, name, sub }) => (
  <div
    className={`absolute flex h-[118px] flex-col justify-center gap-1.5 ${
      color === 'red'
        ? 'left-0 w-[880px] items-start rounded-r-2xl bg-gradient-to-r from-red-700/95 via-red-600/95 to-red-500/90 pl-[60px] pr-[190px] shadow-[0_10px_50px_rgba(239,68,68,0.45)]'
        : 'right-0 w-[880px] items-end rounded-l-2xl bg-gradient-to-l from-blue-700/95 via-blue-600/95 to-blue-500/90 pl-[190px] pr-[60px] text-right shadow-[0_10px_50px_rgba(59,130,246,0.45)]'
    }`}
    style={{ top: BAR_TOP }}
  >
    <span className={`max-w-full truncate font-condensed font-black uppercase leading-[0.9] drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)] ${nameSize(name)}`}>
      {name}
    </span>
    {sub && <span className="max-w-full truncate text-[22px] font-bold uppercase leading-none text-white/85">{sub}</span>}
  </div>
);

/** Rounds won, overlapping the top of the name bar's inner end (as on the WDSF broadcast). */
const ScoreBox: React.FC<{ color: 'red' | 'blue'; value: number }> = ({ color, value }) => (
  <div
    className={`absolute flex h-[160px] w-[160px] items-center justify-center rounded-2xl font-condensed text-[130px] font-black leading-none tabular-nums ${
      color === 'red'
        ? 'left-[730px] bg-gradient-to-b from-red-500 to-red-700 shadow-[0_0_50px_rgba(239,68,68,0.65)] ring-4 ring-red-300/60'
        : 'right-[730px] bg-gradient-to-b from-blue-500 to-blue-700 shadow-[0_0_50px_rgba(59,130,246,0.65)] ring-4 ring-blue-300/60'
    }`}
    style={{ top: BAR_TOP - 110 }}
  >
    {value}
  </div>
);
