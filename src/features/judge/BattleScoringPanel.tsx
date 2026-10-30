import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, Loader2, Lock, Send } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { soundFX } from '../../services/soundEffects';
import { stripBreakerPrefix } from '../../shared/placeholderAssets';
import { BattleSide } from '../../domain/types';

type Side = 'red' | 'blue';
type SaveState = 'idle' | 'saving' | 'failed';

const SIDE_STYLE: Record<Side, { label: string; on: string; off: string; text: string; button: string }> = {
  red: {
    label: 'Đỏ',
    on: 'border-red-600 bg-red-600 text-white',
    off: 'border-red-200 bg-red-50 text-zinc-900',
    text: 'text-red-600',
    button: 'bg-red-600 active:bg-red-700',
  },
  blue: {
    label: 'Xanh',
    on: 'border-blue-600 bg-blue-600 text-white',
    off: 'border-blue-200 bg-blue-50 text-zinc-900',
    text: 'text-blue-600',
    button: 'bg-blue-600 active:bg-blue-700',
  },
};

/** Real photos only: generic placeholders don't help a judge recognise anyone. */
const photosOf = (side: BattleSide) =>
  side.teamPhotoUrl ? [side.teamPhotoUrl] : side.dancers.map((d) => d.avatarUrl).filter((u): u is string => Boolean(u));

/**
 * Judge's battle screen, one phone screen: which match and round, two big corners to tap, one button to send.
 * The round follows the operator (current round) unless the judge picks another tab.
 */
export const BattleScoringPanel: React.FC = () => {
  const { matches, activeMatchId, setActiveMatchId, selectedJudgeId, submitJudgeVote } = useTournament();

  const match = matches.find((m) => m.id === activeMatchId) || matches[0];
  const [pickedRound, setPickedRound] = useState<number | null>(null);
  const roundNum = pickedRound ?? (match?.currentRound || 1);
  const round = match?.rounds.find((r) => r.roundNumber === roundNum) || match?.rounds[0];
  const vote = round?.votes[selectedJudgeId];
  const sentSide: Side | null = vote === 'red' || vote === 'blue' ? vote : null;
  const locked = Boolean(round?.isConfirmed) || match?.status === 'finished';

  const [side, setSide] = useState<Side | null>(null);
  const [save, setSave] = useState<SaveState>('idle');

  useEffect(() => setPickedRound(null), [match?.id]);

  // Show this judge's own vote for the round; 'hidden' (published "has voted" ahead of the own ballot) keeps the pick.
  useEffect(() => {
    if (sentSide) setSide(sentSide);
    else if (vote !== 'hidden') setSide(null);
    setSave((s) => (s === 'saving' ? s : 'idle'));
  }, [match?.id, roundNum, sentSide, vote, selectedJudgeId]);

  const pick = (s: Side) => {
    if (locked) return;
    soundFX.playVoteClick();
    setSide(s);
  };

  const send = async () => {
    if (!match || !side || locked) return;
    soundFX.playVoteConfirmed();
    setSave('saving');
    const ok = await submitJudgeVote(match.id, roundNum, selectedJudgeId, side);
    setSave(ok ? 'idle' : 'failed');
    // Back to following the operator's current round.
    if (ok) setPickedRound(null);
  };

  if (!match || !round) {
    return <p className="flex-1 p-6 text-center text-sm text-zinc-500">Chưa có trận đấu nào.</p>;
  }

  const alreadySent = side !== null && side === sentSide;
  const sideName = (s: BattleSide) =>
    s.dancers.length ? s.dancers.map((d) => stripBreakerPrefix(d.name)).join(' & ') : stripBreakerPrefix(s.name);

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2 p-2.5">
      {/* Match (tap to switch) + round wins */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <label className="relative flex min-w-0 items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-bold text-zinc-900">
          <span className="truncate">
            {match.category === 'pro_2v2' ? 'Pro 2v2' : 'Newbie 1v1'} · {match.stageName} · Trận {String(match.matchNumber).padStart(2, '0')}
          </span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
          <select
            value={match.id}
            onChange={(e) => setActiveMatchId(e.target.value)}
            aria-label="Chọn trận"
            className="absolute inset-0 opacity-0 cursor-pointer"
          >
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.category === 'pro_2v2' ? 'Pro 2v2' : 'Newbie 1v1'} · {m.stageName} · Trận {m.matchNumber}
              </option>
            ))}
          </select>
        </label>
        <span className="shrink-0 font-condensed text-2xl font-black tabular-nums leading-none" aria-label="Tỉ số round">
          <span className="text-red-600">{match.roundWinsRed}</span>
          <span className="text-zinc-300"> – </span>
          <span className="text-blue-600">{match.roundWinsBlue}</span>
        </span>
      </div>

      {/* Rounds: dot = voted, lock = announced */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-0.5 shrink-0" role="group" aria-label="Round">
        {match.rounds.map((r) => {
          const active = r.roundNumber === roundNum;
          return (
            <button
              key={r.roundNumber}
              onClick={() => {
                soundFX.playVoteClick();
                setPickedRound(r.roundNumber);
              }}
              aria-pressed={active}
              className={`flex-1 rounded-md py-1.5 text-xs font-black uppercase flex items-center justify-center gap-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 ${
                active ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500'
              }`}
            >
              {r.isTieBreak ? 'Tie-break' : `Round ${r.roundNumber}`}
              {r.isConfirmed ? (
                <Lock className="w-3 h-3 text-zinc-400" />
              ) : (
                r.votes[selectedJudgeId] && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Two corners side by side, as on stage and the LED: red left, blue right. Tap one to pick it. */}
      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
        {(['red', 'blue'] as const).map((s) => {
          const data = s === 'red' ? match.sideRed : match.sideBlue;
          const style = SIDE_STYLE[s];
          const selected = side === s;
          const photos = photosOf(data);
          const sub = match.category === 'pro_2v2' ? data.name : data.dancers[0]?.crew;
          return (
            <button
              key={s}
              onClick={() => pick(s)}
              disabled={locked}
              aria-pressed={selected}
              aria-label={`Chọn góc ${style.label.toLowerCase()}: ${sideName(data)}`}
              className={`relative min-h-0 min-w-0 rounded-2xl border-2 px-2 py-4 text-center flex flex-col items-center justify-center gap-2 cursor-pointer disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
                selected ? style.on : style.off
              } ${locked && !selected ? 'opacity-50' : ''}`}
            >
              <p className={`text-sm font-black uppercase tracking-wider ${selected ? 'text-white' : style.text}`}>Góc {style.label}</p>
              {photos.length > 0 && (
                <div className="flex -space-x-4 shrink-0">
                  {photos.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className={`${photos.length > 1 ? 'w-16 h-16' : 'w-20 h-20'} rounded-full object-cover border-2 border-white bg-zinc-100`}
                    />
                  ))}
                </div>
              )}
              <p className="w-full font-condensed text-[1.75rem] font-black uppercase leading-[1.05] line-clamp-3 break-words">
                {sideName(data)}
              </p>
              {data.sbdText && (
                <p className={`font-mono text-xs font-bold ${selected ? 'text-white/80' : 'text-zinc-500'}`}>{data.sbdText}</p>
              )}
              {sub && <p className={`w-full text-xs truncate ${selected ? 'text-white/80' : 'text-zinc-500'}`}>{sub}</p>}
              {selected && (
                <span className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white flex items-center justify-center">
                  <Check className={`w-5 h-5 stroke-[3] ${style.text}`} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Send */}
      <button
        onClick={send}
        disabled={locked || !side || alreadySent || save === 'saving'}
        className={`shrink-0 py-3.5 rounded-xl font-black text-base uppercase tracking-wide text-white flex items-center justify-center gap-2 cursor-pointer disabled:cursor-default focus-visible:outline-2 focus-visible:outline-zinc-900 ${
          locked || !side
            ? 'bg-zinc-200 text-zinc-500'
            : alreadySent
              ? 'bg-emerald-600'
              : SIDE_STYLE[side].button
        }`}
        aria-live="polite"
      >
        {locked ? (
          <>
            <Lock className="w-4 h-4" /> Round đã công bố
          </>
        ) : !side ? (
          'Chọn đỏ hoặc xanh'
        ) : save === 'saving' ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> Đang gửi…
          </>
        ) : alreadySent ? (
          <>
            <Check className="w-5 h-5 stroke-[3]" /> Đã gửi: {SIDE_STYLE[side].label}
          </>
        ) : (
          <>
            <Send className="w-4 h-4" /> {save === 'failed' ? 'Gửi lại' : 'Gửi phiếu'}: {SIDE_STYLE[side].label}
          </>
        )}
      </button>
    </div>
  );
};
