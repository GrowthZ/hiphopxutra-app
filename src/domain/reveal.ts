// Timing of a reveal on the LED, shared by the operator console (when to play the fanfare) and the LED views.
// The judges' pills of a round flip one by one; several rounds revealed together flip one round after the other.
// The result (winner, scores, tie-break row) lights up `winnerDelay` after the last pill has turned.

export const FLIP_STEP_MS = 150; // between two judges' pills
export const FLIP_MS = 450; // one pill turning over
const ROUND_GAP_MS = 300; // pause before the next round's row starts

export const DEFAULT_WINNER_DELAY = 0.5; // seconds

/** When the row in position `index` of one reveal starts flipping, from the reveal's start. */
export const roundOffset = (index: number, judges: number) => index * ((judges - 1) * FLIP_STEP_MS + FLIP_MS + ROUND_GAP_MS);

/** From the start of a row's flip to its last pill having turned. */
export const rowFlipMs = (judges: number) => (judges - 1) * FLIP_STEP_MS + FLIP_MS;

/** From pressing "Công bố" to the result lighting up, for `rounds` rows revealed together. */
export const revealMs = (rounds: number, judges: number, winnerDelay = DEFAULT_WINNER_DELAY) =>
  roundOffset(Math.max(rounds, 1) - 1, judges) + rowFlipMs(judges) + winnerDelay * 1000;
