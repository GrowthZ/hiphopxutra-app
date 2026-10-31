import confetti from 'canvas-confetti';

// Stage cues: confetti and LED animations (no sound). Data travels through Firestore; these cues only reach other
// tabs on the same machine (BroadcastChannel) plus this tab (window CustomEvent read by the stage views).

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
 * Match won: confetti and the LED celebration. `delay`: when the LED lights the result up after a reveal (the pills
 * flipping plus the winner delay), so both land together.
 */
export function celebrateMatchWin(matchId: string, side: Side, winnerName: string, delay = 0) {
  setTimeout(() => {
    sideConfetti(side);
    display('VICTORY_TRIGGER', { matchId, side, winnerName, timestamp: Date.now() });
  }, delay);
}

export const revealRounds = (matchId: string, roundNumbers: number[]) =>
  display('ROUND_REVEAL_TRIGGER', { matchId, roundNumbers, timestamp: Date.now() });

export const teamEntrance = (matchId: string, timestamp: number) => display('TEAM_ENTRANCE_TRIGGER', { matchId, timestamp });

export const top32Locked = () => confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });

/** Passes display cues sent from other tabs on this machine to this tab's stage views. */
export function listenForCues(): () => void {
  if (!('BroadcastChannel' in window)) return () => {};
  const bc = new BroadcastChannel(CHANNEL);
  bc.onmessage = (event) => {
    const { type, payload } = event.data;
    const eventName = DISPLAY_EVENTS[type];
    if (eventName) window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
  };
  return () => bc.close();
}
