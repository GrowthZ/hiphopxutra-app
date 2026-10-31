import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, Eye, History, Loader2, Lock, Send, Swords, Zap } from 'lucide-react';
import { useTournament } from '../../state/TournamentContext';
import { soundFX } from '../../services/soundEffects';
import { stripBreakerPrefix } from '../../shared/placeholderAssets';
import { BattleRound, BattleSide, Dancer } from '../../domain/types';

type Side = 'red' | 'blue';
type SaveState = 'idle' | 'saving' | 'failed';

const SIDE_STYLE: Record<Side, { label: string; strip: string; on: string; off: string; text: string; dot: string; button: string }> = {
  red: {
    label: 'Đỏ',
    strip: 'bg-red-600 text-white',
    on: 'border-red-600 bg-red-600 text-white ring-4 ring-red-200',
    off: 'border-red-200 bg-red-50 text-zinc-900',
    text: 'text-red-600',
    dot: 'bg-red-600',
    button: 'bg-red-600 active:bg-red-700',
  },
  blue: {
    label: 'Xanh',
    strip: 'bg-blue-600 text-white',
    on: 'border-blue-600 bg-blue-600 text-white ring-4 ring-blue-200',
    off: 'border-blue-200 bg-blue-50 text-zinc-900',
    text: 'text-blue-600',
    dot: 'bg-blue-600',
    button: 'bg-blue-600 active:bg-blue-700',
  },
};

const Photo: React.FC<{ dancer: Dancer; size: string }> = ({ dancer, size }) =>
  dancer.avatarUrl ? (
    <img src={dancer.avatarUrl} alt="" className={`${size} shrink-0 rounded-full border-2 border-white object-cover bg-zinc-100`} />
  ) : (
    <span className={`${size} shrink-0 rounded-full border-2 border-white bg-zinc-200 font-condensed font-black text-zinc-500 flex items-center justify-center`}>
      {stripBreakerPrefix(dancer.name).charAt(0)}
    </span>
  );

/**
 * Judge's battle screen, one phone screen: the match the operator has on stage (judges can't switch it), the round,
 * two balanced corners to tap, one button to send.
 * Every round of the match's format has a tab, plus the tie-break (open once the operator adds it).
 * The round follows the operator (current round) unless the judge picks another tab.
 * Past matches can be looked back at, read-only (firestore.rules only takes votes for the match on stage).
 */
export const BattleScoringPanel: React.FC = () => {
  const { matches, activeMatchId, selectedJudgeId, submitJudgeVote } = useTournament();

  // Matches this judge can look back at: finished ones and any they voted in, apart from the one on stage.
  const history = matches.filter(
    (m) =>
      m.id !== activeMatchId &&
      (m.status === 'finished' || m.rounds.some((r) => r.votes[selectedJudgeId]))
  );
  const [reviewId, setReviewId] = useState<string | null>(null);
  const reviewing = history.find((m) => m.id === reviewId);
  const match = reviewing ?? matches.find((m) => m.id === activeMatchId);
  const [pickedRound, setPickedRound] = useState<number | null>(null);
  const roundNum = pickedRound ?? (match?.currentRound || 1);
  const round = match?.rounds.find((r) => r.roundNumber === roundNum) || match?.rounds[0];
  const vote = round?.votes[selectedJudgeId];
  const sentSide: Side | null = vote === 'red' || vote === 'blue' ? vote : null;
  const locked = Boolean(reviewing) || Boolean(round?.isConfirmed) || match?.status === 'finished';

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

  // Look back at a past match (read-only), or return to the one on stage.
  const reviewBar = reviewing ? (
    <div className="flex shrink-0 items-center justify-between gap-2 rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900">
      <span className="flex items-center gap-1.5">
        <Eye className="h-3.5 w-3.5" /> Đang xem lại · chỉ xem
      </span>
      <button
        onClick={() => setReviewId(null)}
        className="flex items-center gap-1 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-[11px] font-black uppercase text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Trận đang đấu
      </button>
    </div>
  ) : history.length > 0 ? (
    <label className="relative flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-600">
      <History className="h-3.5 w-3.5" /> Xem lại trận đã chấm ({history.length})
      <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
      <select
        value=""
        onChange={(e) => e.target.value && setReviewId(e.target.value)}
        aria-label="Xem lại trận đã chấm"
        className="absolute inset-0 opacity-0 cursor-pointer"
      >
        <option value="">Chọn trận</option>
        {history.map((m) => (
          <option key={m.id} value={m.id}>
            {m.category === 'pro_2v2' ? 'Pro 2v2' : 'Newbie 1v1'} · {m.stageName} · Trận {m.matchNumber}
            {m.status === 'finished' ? ` · ${m.roundWinsRed}-${m.roundWinsBlue}` : ''}
          </option>
        ))}
      </select>
    </label>
  ) : null;

  if (!match || !round) {
    return (
      <div className="flex flex-1 flex-col gap-2 p-2.5">
        {reviewBar}
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <Swords className="h-10 w-10 text-zinc-300" />
          <p className="font-condensed text-2xl font-black uppercase text-zinc-900">Chờ trận đấu</p>
          <p className="max-w-xs text-sm text-zinc-500">Ban tổ chức chưa chọn trận lên sàn. Trận sẽ tự hiện ở đây khi bắt đầu.</p>
        </div>
      </div>
    );
  }

  const alreadySent = side !== null && side === sentSide;
  const pro = match.category === 'pro_2v2';
  const regular = match.rounds.filter((r) => !r.isTieBreak);
  const tieBreak = match.rounds.find((r) => r.isTieBreak);
  const tabs: (BattleRound | null)[] = [...regular, tieBreak ?? null]; // null: tie-break not opened yet

  const roundStatus = round.isConfirmed
    ? `Đã công bố · ${round.winner === 'blue' ? 'Xanh' : 'Đỏ'} thắng`
    : match.status === 'finished'
      ? 'Trận đã kết thúc'
      : round.roundNumber === match.currentRound
        ? 'Đang thi đấu · nhận phiếu'
        : round.roundNumber > match.currentRound
          ? 'Chưa tới round này'
          : 'Chờ công bố';

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2 p-2.5">
      {reviewBar}
      {/* The match on stage, chosen by the operator (or the past one being looked at) */}
      <div className="flex shrink-0 items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
        <span className="min-w-0">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-zinc-500">
            {pro ? 'Pro 2vs2' : 'Newbie 1vs1'} · {regular.length} round
          </span>
          <span className="block truncate font-condensed text-lg font-black uppercase leading-tight text-zinc-900">
            {match.stageName} · Trận {String(match.matchNumber).padStart(2, '0')}
          </span>
        </span>
        {reviewing || match.status === 'finished' ? (
          <span className="shrink-0 rounded-full bg-zinc-200 px-2.5 py-1 text-[11px] font-black uppercase text-zinc-600">Đã xong</span>
        ) : (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-black uppercase text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white motion-safe:animate-pulse" /> Đang đấu
          </span>
        )}
      </div>

      {/* Round tabs: every round of the format + tie-break. Dot = my vote, lock = announced. */}
      <div
        className="grid shrink-0 gap-1 rounded-xl bg-zinc-100 p-1"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        role="tablist"
        aria-label="Round"
      >
        {tabs.map((r) => {
          if (!r) {
            return (
              <span
                key="tie"
                role="tab"
                aria-disabled="true"
                title="Tie-break chỉ mở khi hoà, do điều hành bật"
                className="flex flex-col items-center justify-center rounded-lg py-1.5 text-zinc-400"
              >
                <span className="flex items-center gap-0.5 text-[11px] font-black uppercase">
                  <Zap className="h-3 w-3" /> Tie-break
                </span>
                <span className="text-[10px] font-medium">chưa mở</span>
              </span>
            );
          }
          const active = r.roundNumber === round.roundNumber;
          const mine = r.votes[selectedJudgeId];
          return (
            <button
              key={r.roundNumber}
              role="tab"
              aria-selected={active}
              onClick={() => {
                soundFX.playVoteClick();
                setPickedRound(r.roundNumber);
              }}
              className={`flex flex-col items-center justify-center rounded-lg py-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 ${
                active ? 'bg-white text-zinc-900 shadow-sm' : r.isTieBreak ? 'text-amber-700' : 'text-zinc-500'
              }`}
            >
              <span className="flex items-center gap-0.5 text-[11px] font-black uppercase">
                {r.isTieBreak ? (
                  <>
                    <Zap className="h-3 w-3" /> Tie-break
                  </>
                ) : (
                  `Round ${r.roundNumber}`
                )}
              </span>
              <span className="flex h-3 items-center gap-1">
                {r.isConfirmed && <Lock className="h-2.5 w-2.5 text-zinc-400" />}
                {r.isConfirmed && r.winner && <span className={`h-1.5 w-4 rounded-full ${SIDE_STYLE[r.winner].dot}`} aria-label={`${SIDE_STYLE[r.winner].label} thắng`} />}
                {!r.isConfirmed && (mine === 'red' || mine === 'blue') && (
                  <span className={`h-2 w-2 rounded-full ${SIDE_STYLE[mine].dot}`} aria-label={`Đã chọn ${SIDE_STYLE[mine].label}`} />
                )}
                {!r.isConfirmed && mine === 'hidden' && <span className="h-2 w-2 rounded-full bg-emerald-500" aria-label="Đã gửi phiếu" />}
              </span>
            </button>
          );
        })}
      </div>

      {/* Scoreline + this round's state */}
      <div className="flex shrink-0 items-center justify-between gap-2 px-1">
        <span className="text-xs font-bold text-zinc-500">{roundStatus}</span>
        <span className="font-condensed text-2xl font-black tabular-nums leading-none" aria-label="Tỉ số round">
          <span className="text-red-600">{match.roundWinsRed}</span>
          <span className="text-zinc-300"> – </span>
          <span className="text-blue-600">{match.roundWinsBlue}</span>
        </span>
      </div>

      {/* Two corners side by side, as on stage and the LED: red left, blue right. Tap one to pick it. */}
      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
        {(['red', 'blue'] as const).map((s) => {
          const data: BattleSide = s === 'red' ? match.sideRed : match.sideBlue;
          const style = SIDE_STYLE[s];
          const selected = side === s;
          const muted = selected ? 'text-white/80' : 'text-zinc-500';
          return (
            <button
              key={s}
              onClick={() => pick(s)}
              disabled={locked}
              aria-pressed={selected}
              aria-label={`Chọn góc ${style.label.toLowerCase()}: ${data.dancers.map((d) => stripBreakerPrefix(d.name)).join(', ') || data.name}`}
              className={`relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border-2 text-center transition-shadow cursor-pointer disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
                selected ? style.on : style.off
              } ${locked && !selected ? 'opacity-50' : ''}`}
            >
              <span className={`flex shrink-0 items-center justify-center gap-1.5 py-1.5 text-xs font-black uppercase tracking-wider ${selected ? 'bg-black/15' : style.strip}`}>
                Góc {style.label}
                {selected && <Check className="h-4 w-4 stroke-[3]" />}
              </span>

              <span className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-hidden px-2 py-2">
                {pro ? (
                  <>
                    <span className={`font-condensed text-base font-black uppercase ${selected ? 'text-white' : style.text}`}>{data.name}</span>
                    {data.teamPhotoUrl && (
                      <img src={data.teamPhotoUrl} alt="" className="h-16 w-full max-w-28 shrink-0 rounded-xl object-cover bg-zinc-100" />
                    )}
                    {data.dancers.map((d) => (
                      <span key={d.id} className="flex w-full flex-col items-center gap-1 text-center">
                        {!data.teamPhotoUrl && <Photo dancer={d} size="h-14 w-14 text-xl" />}
                        <span className="min-w-0">
                          <span className="block font-condensed text-xl font-black uppercase leading-tight line-clamp-2 break-words">
                            {stripBreakerPrefix(d.name)}
                          </span>
                          <span className={`block truncate text-[11px] ${muted}`}>{[d.sbd, d.crew].filter(Boolean).join(' · ')}</span>
                        </span>
                      </span>
                    ))}
                  </>
                ) : (
                  data.dancers[0] && (
                    <>
                      <Photo dancer={data.dancers[0]} size="h-28 w-28 text-4xl" />
                      <span className="w-full font-condensed text-[1.75rem] font-black uppercase leading-[1.05] line-clamp-2 break-words">
                        {stripBreakerPrefix(data.dancers[0].name)}
                      </span>
                      <span className={`w-full truncate text-xs ${muted}`}>
                        {[data.sbdText || data.dancers[0].sbd, data.dancers[0].crew].filter(Boolean).join(' · ')}
                      </span>
                    </>
                  )
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Send */}
      <button
        onClick={send}
        disabled={locked || !side || alreadySent || save === 'saving'}
        className={`shrink-0 py-3.5 rounded-xl font-black text-base uppercase tracking-wide text-white flex items-center justify-center gap-2 cursor-pointer disabled:cursor-default focus-visible:outline-2 focus-visible:outline-zinc-900 ${
          locked || !side ? 'bg-zinc-200 text-zinc-500' : alreadySent ? 'bg-emerald-600' : SIDE_STYLE[side].button
        }`}
        aria-live="polite"
      >
        {locked ? (
          <>
            <Lock className="w-4 h-4" />{' '}
            {reviewing
              ? 'Chỉ xem · không sửa được'
              : match.status === 'finished' && !round.isConfirmed
                ? 'Trận đã kết thúc'
                : 'Round đã công bố'}
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
            <Send className="w-4 h-4" /> {save === 'failed' ? 'Gửi lại' : 'Gửi phiếu'}: {SIDE_STYLE[side].label} · {round.isTieBreak ? 'Tie-break' : `Round ${round.roundNumber}`}
          </>
        )}
      </button>
    </div>
  );
};
