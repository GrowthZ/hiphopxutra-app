// Stepped-arch LED wall (10 m × 5.5 m, square cabinets): which pixels physically exist.
// The defaults are estimated from the venue drawing (20 columns × 11 rows of 500 mm cabinets); the real pixel
// map from the LED vendor can be dialled in through the URL, no deploy needed:
//   /led?khung=vom                      turn the arch layout on
//   &cot=5,7,8,8,9,10,10,11,11,11       cabinets per column, left half (mirrored) or all 20 columns
//   &module=96                          pixels per cabinet in the HDMI picture (pitch × 500 mm)
//   &luoi=1                             draw the cabinet grid and the cut-out outline (setup / preview)
// The picture sits at the top-left of the HDMI output (1920×1080 by default), the LED processor's usual origin.

const params = new URLSearchParams(window.location.search);

const DEFAULT_HALF = [5, 7, 8, 8, 9, 10, 10, 11, 11, 11];

function parseColumns(raw: string | null) {
  const nums = (raw ?? '')
    .split(',')
    .map((n) => Number(n.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  const half = nums.length ? nums : DEFAULT_HALF;
  return nums.length > DEFAULT_HALF.length ? half : [...half, ...[...half].reverse()];
}

export const IS_ARCH_LED = params.get('khung') === 'vom';
export const SHOW_ARCH_GRID = params.get('luoi') === '1';

export const ARCH_COLUMNS = parseColumns(params.get('cot'));
export const MODULE_PX = Math.max(16, Number(params.get('module')) || 96);
export const ARCH_ROWS = Math.max(...ARCH_COLUMNS);
export const ARCH_WIDTH = ARCH_COLUMNS.length * MODULE_PX;
export const ARCH_HEIGHT = ARCH_ROWS * MODULE_PX;

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
