import confetti from 'canvas-confetti';
import { soundFX } from './soundEffects';

// Stage cues: sound, confetti and LED animations. Data travels through Firestore; these cues only reach
// other tabs on the same machine (BroadcastChannel) plus this tab (window CustomEvent read by the stage views).

type Side = 'red' | 'blue';

const CHANNEL = 'hiphop_xu_tra_broadcast';

/** Channel message type -> window event the stage views listen for. */
const DISPLAY_EVENTS: Record<string, string> = {
  VICTORY_TRIGGER: 'VICTORY_DISPLAY_TRIGGER',
  VICTORY_DISMISS: 'VICTORY_DISPLAY_DISMISS',
  TEAM_ENTRANCE_TRIGGER: 'TEAM_ENTRANCE_DISPLAY_TRIGGER',
  ROUND_REVEAL_TRIGGER: 'ROUND_REVEAL_DISPLAY_TRIGGER',
};

function broadcast(type: string, payload?: unknown) {
  try {
    if (!('BroadcastChannel' in window)) return;
    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage({ type, payload, timestamp: Date.now() });
    bc.close();
  } catch {
    // no channel: other tabs just miss the cue
  }
}

/** Sends a display cue to other tabs and to this one. */
function display(type: keyof typeof DISPLAY_EVENTS, detail: unknown) {
  broadcast(type, detail);
  window.dispatchEvent(new CustomEvent(DISPLAY_EVENTS[type], { detail }));
}

const sideConfetti = (side: Side, particleCount = 140) =>
  confetti({
    particleCount,
    spread: 100,
    origin: { y: 0.5 },
    colors: side === 'red' ? ['#ef4444', '#f87171', '#ffffff'] : ['#3b82f6', '#60a5fa', '#ffffff'],
  });

/**
 * Match won: fanfare + announcement, confetti, LED celebration. `delay`: when the LED lights the result up after a
 * reveal (the pills flipping plus the winner delay), so everything lands together.
 */
export function celebrateMatchWin(matchId: string, side: Side, winnerName: string, delay = 0) {
  setTimeout(() => {
    soundFX.playChampionFanfare(side);
    sideConfetti(side);
    broadcast('REMOTE_AUDIO', { effect: 'MATCH_WIN', side, winnerName });
    display('VICTORY_TRIGGER', { matchId, side, winnerName, timestamp: Date.now() });
  }, delay);
  setTimeout(() => soundFX.announceMatchWinner(side, winnerName), delay + 450);
}

export function celebrateRoundWin(side: Side, winnerName: string, roundNumber: number, delay = 450) {
  setTimeout(() => {
    soundFX.playRoundWinner(side);
    soundFX.announceRoundWinner(roundNumber, side, winnerName);
    broadcast('REMOTE_AUDIO', { effect: 'ROUND_WIN', side, winnerName, roundNumber });
  }, delay);
}

export function announceTieBreak(delay = 500) {
  setTimeout(() => {
    soundFX.playRoundWinner('tie');
    broadcast('REMOTE_AUDIO', { effect: 'TIE_BREAK' });
  }, delay);
}

export const revealRounds = (matchId: string, roundNumbers: number[]) =>
  display('ROUND_REVEAL_TRIGGER', { matchId, roundNumbers, timestamp: Date.now() });

export function teamEntrance(matchId: string, timestamp: number) {
  soundFX.playTeamEntranceSwoosh();
  display('TEAM_ENTRANCE_TRIGGER', { matchId, timestamp });
}

export function voteCast(judgeCode: string | undefined, side: Side, allVoted: boolean) {
  soundFX.playVoteConfirmed();
  if (judgeCode) soundFX.announceJudgeVote(judgeCode, side);
  if (allVoted) setTimeout(() => soundFX.playAllJudgesVotedAlert(), 400);
  broadcast('REMOTE_AUDIO', { effect: allVoted ? 'ALL_VOTED' : 'VOTE_SUBMITTED' });
}

export function top32Locked() {
  soundFX.playRoundWinner();
  confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
}

/** Plays cues sent from other tabs on this machine (e.g. the operator tab driving the LED tab's speakers). */
export function listenForCues(): () => void {
  if (!('BroadcastChannel' in window)) return () => {};
  const bc = new BroadcastChannel(CHANNEL);
  bc.onmessage = (event) => {
    const { type, payload } = event.data;
    if (type === 'REMOTE_AUDIO') {
      const cue = payload as { effect: string; side?: Side; winnerName?: string; roundNumber?: number };
      if (cue.effect === 'VOTE_SUBMITTED') soundFX.playVoteConfirmed();
      else if (cue.effect === 'ALL_VOTED') soundFX.playAllJudgesVotedAlert();
      else if (cue.effect === 'ROUND_WIN') {
        soundFX.playRevealSuspense();
        setTimeout(() => {
          soundFX.playRoundWinner(cue.side);
          if (cue.winnerName && cue.roundNumber) {
            soundFX.announceRoundWinner(cue.roundNumber, cue.side || 'tie', cue.winnerName);
          }
        }, 350);
      } else if (cue.effect === 'MATCH_WIN') {
        soundFX.playChampionFanfare(cue.side);
        if (cue.winnerName && cue.side) {
          const { side, winnerName } = cue;
          setTimeout(() => soundFX.announceMatchWinner(side, winnerName), 1200);
        }
      }
      return;
    }
    if (type === 'TEAM_ENTRANCE_TRIGGER') soundFX.playTeamEntranceSwoosh();
    const eventName = DISPLAY_EVENTS[type];
    if (eventName) window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
  };
  return () => bc.close();
}
