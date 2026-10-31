import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronDown, Eye, RotateCcw, Swords, Timer, Trophy, Tv, Zap } from 'lucide-react';
import { TeamThumb } from '../../shared/TeamPhoto';
import { useTournament } from '../../state/TournamentContext';
import { useStageController, DEFAULT_SCREEN_ID } from '../../state/useStage';
import { useOnlineJudgeIds } from '../../state/useJudgePresence';
import { getTeamPhotoUrl, getDancerAvatarUrl, stripBreakerPrefix } from '../../shared/placeholderAssets';
import { BattleMatch, BattleRound, BattleSide } from '../../domain/types';
import { isRoundOpen } from '../../domain/model';
import { regulationRounds } from '../../domain/battle';
import { DEFAULT_WINNER_DELAY } from '../../domain/reveal';

type Side = 'red' | 'blue';

const sideName = (side: BattleSide) =>
  side.dancers.map((d) => stripBreakerPrefix(d.name)).join(' & ') || stripBreakerPrefix(side.name);
const roundLabel = (r: BattleRound) => (r.isTieBreak ? 'Tie-break' : `Round ${r.roundNumber}`);
const votesIn = (r: BattleRound) => Object.values(r.votes).filter(Boolean).length;

/**
 * /admin/battle: one match on stage. The whole match at a glance (every round × the 9 judges), one primary action
 * at a time: reveal the regulation rounds in one press (the LED flips them row after row, then lights the result up
 * after the winner delay; a level score opens the tie-break), reveal the tie-break, then move on to the next match.
 * Manual overrides live in a folded section below.
 */
export const BattleOperatorView: React.FC = () => {
  const {
    authUser,
    matches,
    activeMatchId,
    setActiveMatchId,
    judges,
    submitJudgeVote,
    confirmRoundResult,
    revealAllRounds,
    declareMatchWinner,
    triggerVictoryAnimation,
    triggerTeamEntrance,
    addTieBreakRound,
    resetMatch,
    setActiveView,
    playAudioEffect,
    storageConfig,
  } = useTournament();
  const onlineJudgeIds = useOnlineJudgeIds();
  const stage = useStageController(DEFAULT_SCREEN_ID, authUser?.email ?? '');
  const winnerDelay = stage.state.winnerDelay ?? DEFAULT_WINNER_DELAY;

  const match = matches.find((m) => m.id === activeMatchId) || matches[0];
  const [overrideRound, setOverrideRound] = useState<number | null>(null);
  useEffect(() => setOverrideRound(null), [match?.id]);

  if (!match) return <div className="p-8 text-center text-zinc-500">Chưa có trận đấu nào.</div>;

  const regular = regulationRounds(match);
  const tieBreak = match.rounds.find((r) => r.isTieBreak);
  const regularHidden = regular.some((r) => !isRoundOpen(r));
  const missingVotes = regular.reduce((n, r) => n + Math.max(0, judges.length - votesIn(r)), 0);
  const tieHidden = Boolean(tieBreak && !isRoundOpen(tieBreak));
  const nextMatch = matches[matches.findIndex((m) => m.id === match.id) + 1];
  const winnerName = match.winnerSide ? sideName(match.winnerSide === 'red' ? match.sideRed : match.sideBlue) : '';

  const revealRegular = () => {
    if (missingVotes > 0 && !window.confirm(`Còn thiếu ${missingVotes} phiếu. Vẫn công bố? Ô thiếu phiếu hiện "—".`)) return;
    revealAllRounds(match.id, winnerDelay);
  };
  const revealTieBreak = () => {
    if (!tieBreak) return;
    const missing = judges.length - votesIn(tieBreak);
    if (missing > 0 && !window.confirm(`Tie-break còn thiếu ${missing} phiếu. Vẫn công bố?`)) return;
    confirmRoundResult(match.id, tieBreak.roundNumber, winnerDelay);
  };

  const overrideTarget = match.rounds.find((r) => r.roundNumber === overrideRound) ?? match.rounds.find((r) => !isRoundOpen(r)) ?? match.rounds[0];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header: which match, the way to the next one and to the LED */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 border-b border-zinc-200 pb-4">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
            Bàn điều hành battle
          </span>
          <h1 className="font-condensed font-black text-2xl sm:text-3xl text-zinc-900 tracking-tight mt-1 uppercase">
            {match.category === 'pro_2v2' ? 'Pro 2vs2' : 'Newbie 1vs1'} · {match.stageName} · Trận {String(match.matchNumber).padStart(2, '0')}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={match.id}
            onChange={(e) => setActiveMatchId(e.target.value)}
            aria-label="Trận đang đấu"
            className="max-w-full bg-white border border-zinc-300 text-zinc-900 text-xs font-bold rounded px-3 py-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
          >
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.category === 'pro_2v2' ? 'Pro 2v2' : 'Newbie 1v1'} · {m.stageName} · Trận {m.matchNumber} ({sideName(m.sideRed)} vs {sideName(m.sideBlue)})
                {m.status === 'finished' ? ' ✓' : ''}
              </option>
            ))}
          </select>
          <button
            onClick={() => setActiveView('stage_control')}
            className="flex items-center gap-1.5 px-3 py-2 rounded border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 text-xs font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
          >
            <Tv className="w-3.5 h-3.5" /> Màn LED
          </button>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 sm:p-4">
        <Corner match={match} side="red" placeholder={getTeamPhotoUrl(undefined, storageConfig.placeholders)} avatar={getDancerAvatarUrl(match.sideRed.dancers[0], storageConfig.placeholders)} winner={match.winnerSide} />
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2 font-condensed font-black text-5xl tabular-nums leading-none">
            <span className="text-red-600">{match.roundWinsRed}</span>
            <span className="text-zinc-300">–</span>
            <span className="text-blue-600">{match.roundWinsBlue}</span>
          </div>
          <button
            onClick={() => triggerTeamEntrance(match.id)}
            className="flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-[11px] font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
            title="Hai bên lướt vào sân trên màn LED, kèm âm thanh"
          >
            <Swords className="h-3.5 w-3.5" /> Hiệu ứng ra sân
          </button>
        </div>
        <Corner match={match} side="blue" placeholder={getTeamPhotoUrl(undefined, storageConfig.placeholders)} avatar={getDancerAvatarUrl(match.sideBlue.dancers[0], storageConfig.placeholders)} winner={match.winnerSide} />
      </div>

      {/* The one thing to do next */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 rounded-lg border-2 border-amber-400 bg-amber-50 p-4">
        <div className="min-w-0 flex-1">
          {match.status === 'finished' ? (
            <>
              <p className="flex items-center gap-2 font-condensed text-2xl font-black uppercase text-zinc-900">
                <Trophy className="h-6 w-6 text-amber-500" /> {winnerName} thắng {match.roundWinsRed}–{match.roundWinsBlue}
              </p>
              <p className="text-xs text-zinc-600">Trận đã kết thúc. Người thắng tự vào trận kế tiếp trên nhánh đấu.</p>
            </>
          ) : tieHidden && tieBreak ? (
            <>
              <p className="flex items-center gap-2 font-condensed text-2xl font-black uppercase text-amber-700">
                <Zap className="h-6 w-6" /> Hòa {match.roundWinsRed}–{match.roundWinsBlue} · Tie-break
              </p>
              <p className="text-xs text-zinc-600">
                Dòng tie-break đã sáng trên LED. Giám khảo chấm tie-break: {votesIn(tieBreak)}/{judges.length} phiếu.
              </p>
            </>
          ) : regularHidden ? (
            <>
              <p className="font-condensed text-2xl font-black uppercase text-zinc-900">
                Công bố {regular.length > 1 ? `cả ${regular.length} round` : 'kết quả'}
              </p>
              <p className="text-xs text-zinc-600">
                {regular.map((r) => `${roundLabel(r)}: ${votesIn(r)}/${judges.length}`).join(' · ')}. Bấm một lần: LED lật lần lượt từng ô,
                hết round này sang round kia, rồi sáng người thắng. Hòa thì dòng tie-break sáng lên.
              </p>
            </>
          ) : (
            <p className="text-sm font-bold text-zinc-700">Đã công bố. Chờ điều hành chọn bước tiếp theo.</p>
          )}
        </div>

        <label className="flex shrink-0 items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700">
          <Timer className="h-4 w-4 text-amber-600" />
          Hiện người thắng sau
          <DelayInput value={winnerDelay} onChange={stage.setWinnerDelay} />
          giây
        </label>

        <div className="flex shrink-0 flex-wrap gap-2">
          {match.status === 'finished' ? (
            <>
              <button
                onClick={() => triggerVictoryAnimation(match.id)}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-3 text-xs font-bold text-zinc-800 hover:bg-zinc-100 cursor-pointer"
              >
                <Trophy className="h-4 w-4" /> Phát lại hiệu ứng thắng
              </button>
              {nextMatch && (
                <button
                  onClick={() => setActiveMatchId(nextMatch.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-5 py-3 font-condensed text-base font-black uppercase text-zinc-950 hover:bg-amber-400 cursor-pointer focus-visible:outline-2 focus-visible:outline-zinc-900"
                >
                  Trận tiếp theo <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </>
          ) : tieHidden ? (
            <button
              onClick={revealTieBreak}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-3 font-condensed text-lg font-black uppercase text-zinc-950 hover:bg-amber-400 cursor-pointer focus-visible:outline-2 focus-visible:outline-zinc-900"
            >
              <Zap className="h-5 w-5" /> Công bố tie-break
            </button>
          ) : regularHidden ? (
            <button
              onClick={revealRegular}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-3 font-condensed text-lg font-black uppercase text-zinc-950 hover:bg-amber-400 cursor-pointer focus-visible:outline-2 focus-visible:outline-zinc-900"
            >
              <Eye className="h-5 w-5" /> Công bố kết quả
            </button>
          ) : null}
        </div>
      </div>
      {stage.error && <p role="alert" className="text-xs font-bold text-red-600">Không lưu được độ trễ: {stage.error}</p>}

      {/* Every round × the 9 judges: what the judges sent (the LED shows ✓ until the reveal) */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[760px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="w-32 px-3 py-2 text-left font-mono text-[11px] font-bold uppercase text-zinc-500">Round</th>
              {judges.map((j) => (
                <th key={j.id} className="px-1 py-2 text-center">
                  <span className="flex items-center justify-center gap-1 font-mono text-[11px] font-black text-amber-600">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${onlineJudgeIds.has(j.id) ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                      title={onlineJudgeIds.has(j.id) ? 'Đang online' : 'Offline'}
                    />
                    {j.code}
                  </span>
                  <span className="block truncate text-[10px] font-bold uppercase text-zinc-600">{j.judgeName || j.code}</span>
                </th>
              ))}
              <th className="w-32 px-3 py-2 text-right font-mono text-[11px] font-bold uppercase text-zinc-500">Kết quả</th>
            </tr>
          </thead>
          <tbody>
            {[...regular, tieBreak ?? null].map((r) =>
              r ? (
                <RoundRow key={r.roundNumber} round={r} match={match} judgeIds={judges.map((j) => j.id)} />
              ) : (
                <tr key="tie-off" className="border-t border-zinc-100 text-zinc-300">
                  <td className="px-3 py-2 font-condensed text-base font-black uppercase">
                    <span className="flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5" /> Tie-break
                    </span>
                  </td>
                  <td colSpan={judges.length + 1} className="px-3 py-2 text-xs font-bold">
                    Chỉ mở khi hòa: sáng lên trên LED sau khi công bố.
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Manual overrides, folded away */}
      <details className="group rounded-lg border border-zinc-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wide text-zinc-600">
          Can thiệp thủ công (khi máy giám khảo gặp sự cố)
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-4 border-t border-zinc-200 p-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-zinc-600">
              Gán phiếu thay giám khảo cho
              {match.rounds.map((r) => (
                <button
                  key={r.roundNumber}
                  onClick={() => setOverrideRound(r.roundNumber)}
                  className={`rounded px-2.5 py-1 font-condensed text-sm font-black uppercase cursor-pointer ${
                    overrideTarget.roundNumber === r.roundNumber ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {roundLabel(r)}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-9">
              {judges.map((j) => (
                <div key={j.id} className="rounded border border-zinc-200 p-1.5 text-center">
                  <p className="font-mono text-[11px] font-black text-amber-600">{j.code}</p>
                  <div className="mt-1 flex justify-center gap-1">
                    {(['red', 'blue'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => submitJudgeVote(match.id, overrideTarget.roundNumber, j.id, s)}
                        disabled={isRoundOpen(overrideTarget)}
                        className={`rounded px-2 py-0.5 text-[11px] font-bold text-white disabled:opacity-30 cursor-pointer ${
                          s === 'red' ? 'bg-red-700 hover:bg-red-600' : 'bg-blue-700 hover:bg-blue-600'
                        } ${overrideTarget.votes[j.id] === s ? 'ring-2 ring-amber-400' : ''}`}
                        aria-label={`${j.code} ${roundLabel(overrideTarget)}: ${s === 'red' ? 'Đỏ' : 'Xanh'}`}
                      >
                        {s === 'red' ? 'Đ' : 'X'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-3">
            {(['red', 'blue'] as Side[]).map((s) => (
              <button
                key={s}
                onClick={() => window.confirm(`Chọn ${s === 'red' ? 'ĐỎ' : 'XANH'} thắng trận này?`) && declareMatchWinner(match.id, s)}
                className={`flex items-center gap-1.5 rounded px-3 py-2 text-xs font-bold text-white cursor-pointer ${
                  s === 'red' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <Trophy className="h-3.5 w-3.5" /> Chọn {s === 'red' ? 'Đỏ' : 'Xanh'} thắng
              </button>
            ))}
            {!tieBreak && (
              <button
                onClick={() => addTieBreakRound(match.id)}
                className="flex items-center gap-1 rounded bg-amber-500 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400 cursor-pointer"
              >
                <Zap className="h-3.5 w-3.5" /> Mở tie-break
              </button>
            )}
            <button
              onClick={() => window.confirm('Đặt lại trận này về 0–0, xoá kết quả các round?') && resetMatch(match.id)}
              className="ml-auto flex items-center gap-1.5 rounded border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Đặt lại 0–0
            </button>
          </div>
        </div>
      </details>

      {/* DJ & MC sounds */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500">Âm thanh MC & DJ:</span>
        {(
          [
            ['airhorn', '🎺 Airhorn'],
            ['roundWin', '🥊 Cồng thắng round'],
            ['champion', '🏆 Kèn vô địch'],
          ] as const
        ).map(([effect, label]) => (
          <button
            key={effect}
            onClick={() => playAudioEffect(effect)}
            className="rounded border border-zinc-300 bg-white px-2.5 py-1 font-bold text-zinc-800 hover:bg-zinc-100 cursor-pointer"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

/** One corner on the scoreboard; greyed once the other corner has won. */
const Corner: React.FC<{ match: BattleMatch; side: Side; placeholder: string; avatar: string; winner: Side | null | undefined }> = ({
  match,
  side,
  placeholder,
  avatar,
  winner,
}) => {
  const data = side === 'red' ? match.sideRed : match.sideBlue;
  const pro = match.category === 'pro_2v2';
  const sub = pro ? [data.name, data.sbdText].filter(Boolean).join(' · ') : [data.dancers[0]?.crew, data.sbdText].filter(Boolean).join(' · ');
  return (
    <div
      className={`flex min-w-0 items-center gap-3 ${side === 'blue' ? 'flex-row-reverse text-right' : ''} ${
        match.status === 'finished' && winner && winner !== side ? 'opacity-40 grayscale' : ''
      }`}
    >
      <TeamThumb
        photoUrl={pro ? data.teamPhotoUrl : avatar}
        dancers={pro ? data.dancers : []}
        placeholder={placeholder}
        alt={data.name}
        className={`h-14 w-14 shrink-0 rounded object-cover border-2 ${side === 'red' ? 'border-red-600' : 'border-blue-600'}`}
        overlapClassName="-ml-7"
      />
      <div className="min-w-0">
        <p className={`text-[10px] font-black uppercase tracking-widest ${side === 'red' ? 'text-red-600' : 'text-blue-600'}`}>
          Góc {side === 'red' ? 'Đỏ' : 'Xanh'}
          {match.status === 'finished' && winner === side && ' · Thắng'}
        </p>
        <p className="truncate font-condensed text-2xl font-black uppercase leading-tight text-zinc-900">{sideName(data)}</p>
        <p className="truncate text-xs font-bold text-zinc-500">{sub}</p>
      </div>
    </div>
  );
};

/** One round: each judge's vote (admins see the colour before the reveal), then the count or the result. */
const RoundRow: React.FC<{ round: BattleRound; match: BattleMatch; judgeIds: string[] }> = ({ round, match, judgeIds }) => {
  const open = isRoundOpen(round);
  const red = Object.values(round.votes).filter((v) => v === 'red').length;
  const blue = Object.values(round.votes).filter((v) => v === 'blue').length;
  const tie = Boolean(round.isTieBreak);
  return (
    <tr className={`border-t border-zinc-100 ${tie ? 'bg-amber-50' : ''}`}>
      <td className="px-3 py-2">
        <span className={`flex items-center gap-1 font-condensed text-base font-black uppercase ${tie ? 'text-amber-700' : 'text-zinc-900'}`}>
          {tie && <Zap className="h-3.5 w-3.5" />}
          {roundLabel(round)}
        </span>
        {!open && round.roundNumber === match.currentRound && match.status !== 'finished' && (
          <span className="text-[10px] font-bold uppercase text-amber-600">Đang đấu</span>
        )}
      </td>
      {judgeIds.map((id) => {
        const v = round.votes[id];
        return (
          <td key={id} className="px-1 py-2">
            <span
              className={`flex h-8 items-center justify-center rounded font-condensed text-sm font-black uppercase ${
                v === 'red' ? 'bg-red-600 text-white' : v === 'blue' ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-400'
              } ${!open && v ? 'opacity-70' : ''}`}
            >
              {v === 'red' ? 'Đỏ' : v === 'blue' ? 'Xanh' : '—'}
            </span>
          </td>
        );
      })}
      <td className="px-3 py-2 text-right">
        {open ? (
          <span className={`inline-flex items-center gap-1 font-bold ${round.winner === 'red' ? 'text-red-600' : 'text-blue-600'}`}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            {round.winner === 'red' ? 'Đỏ' : 'Xanh'} {Math.max(red, blue)}–{Math.min(red, blue)}
          </span>
        ) : (
          <span className={`font-mono font-bold ${red + blue === judgeIds.length ? 'text-emerald-600' : 'text-zinc-500'}`}>
            {red + blue}/{judgeIds.length} phiếu
          </span>
        )}
      </td>
    </tr>
  );
};

/** Seconds, 0–5 in tenths; saved when the field is left or Enter is pressed. */
const DelayInput: React.FC<{ value: number; onChange: (seconds: number) => void }> = ({ value, onChange }) => {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = Math.round(Math.min(5, Math.max(0, Number(draft.replace(',', '.')) || 0)) * 10) / 10;
    setDraft(String(n));
    if (n !== value) onChange(n);
  };
  return (
    <input
      inputMode="decimal"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
      aria-label="Độ trễ hiện người thắng (giây)"
      className="w-14 rounded border border-zinc-300 px-2 py-1 text-center font-mono text-sm font-black tabular-nums text-zinc-900 focus-visible:outline-2 focus-visible:outline-amber-500"
    />
  );
};
