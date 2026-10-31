// Stepped-arch LED wall (10 m × 6 m, 500 mm cabinets): which pixels physically exist.
// Defaults follow the venue drawing (public/led/size-led.jpg): 20 columns × 12 rows of 128 px cabinets, 2560×1536 px.
// The real pixel map from the LED vendor can still be dialled in through the URL, no deploy needed:
//   /led?khung=vom                      turn the arch layout on
//   &cot=6,8,9,10,10,11,11,12,12,12     cabinets per column, left half (mirrored) or all 20 columns
//   &module=128                         pixels per cabinet in the HDMI picture
//   &che=3                              bottom rows hidden behind the judges' table: nothing important drawn there
//   &lech=1408                          arch's left edge in the HDMI picture (side screens 1408 px each: 5376 px in all)
//   &luoi=1                             draw the cabinet grid, the cut-out outline and the hidden band (setup / preview)
// The picture sits at the top of the HDMI output, `lech` px from the left (0 by default).

const params = new URLSearchParams(window.location.search);

const DEFAULT_HALF = [6, 8, 9, 10, 10, 11, 11, 12, 12, 12];

function parseColumns(raw: string | null) {
  const nums = (raw ?? '')
    .split(',')
    .map((n) => Number(n.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  const half = nums.length ? nums : DEFAULT_HALF;
  return nums.length > DEFAULT_HALF.length ? half : [...half, ...[...half].reverse()];
}

const intParam = (name: string, fallback: number) => {
  const n = Number(params.get(name));
  return params.has(name) && Number.isInteger(n) && n >= 0 ? n : fallback;
};

export const IS_ARCH_LED = params.get('khung') === 'vom';
export const SHOW_ARCH_GRID = params.get('luoi') === '1';

export const ARCH_COLUMNS = parseColumns(params.get('cot'));
export const MODULE_PX = Math.max(16, Number(params.get('module')) || 128);
export const ARCH_ROWS = Math.max(...ARCH_COLUMNS);
export const ARCH_WIDTH = ARCH_COLUMNS.length * MODULE_PX;
export const ARCH_HEIGHT = ARCH_ROWS * MODULE_PX;
export const ARCH_OFFSET_X = intParam('lech', 0);

/** Bottom band hidden by the seated judges (default 3 rows = 1.5 m), as a fraction of the wall height. */
export const HIDDEN_ROWS = Math.min(intParam('che', 3), ARCH_ROWS - 6);
export const HIDDEN = HIDDEN_ROWS / ARCH_ROWS;

/** Top edge (px from the top of the picture) of the LED at column `i`. */
export const columnTop = (i: number) => (ARCH_ROWS - ARCH_COLUMNS[i]) * MODULE_PX;

/** CSS clip-path tracing the stepped outline, so nothing is drawn where there is no LED. */
export const ARCH_CLIP_PATH = (() => {
  const points: string[] = [`0px ${ARCH_HEIGHT}px`];
  ARCH_COLUMNS.forEach((_, i) => {
    points.push(`${i * MODULE_PX}px ${columnTop(i)}px`, `${(i + 1) * MODULE_PX}px ${columnTop(i)}px`);
  });
  points.push(`${ARCH_WIDTH}px ${ARCH_HEIGHT}px`);
  return `polygon(${points.join(', ')})`;
})();

/** Horizontal position as a fraction of the wall width (designs are written in fractions to survive a new map). */
export const x = (fraction: number) => Math.round(fraction * ARCH_WIDTH);
/** Height above the bottom edge as a fraction of the wall height, converted to px from the top. */
export const yFromBottom = (fraction: number) => Math.round(ARCH_HEIGHT * (1 - fraction));
