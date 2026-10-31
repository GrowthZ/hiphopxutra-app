import React from 'react';

/** Gold, silver, bronze spray paint: paint, its light and dark shades, LED glow. */
const PAINTS = [
  { paint: '#facc15', hi: '#fef08a', lo: '#a16207', glow: 'drop-shadow-[0_0_22px_rgba(250,204,21,0.7)]' },
  { paint: '#d4d4d8', hi: '#ffffff', lo: '#71717a', glow: 'drop-shadow-[0_0_18px_rgba(228,228,231,0.55)]' },
  { paint: '#f97316', hi: '#fdba74', lo: '#9a3412', glow: 'drop-shadow-[0_0_18px_rgba(249,115,22,0.6)]' },
];

/** Deterministic wobble so every screen draws the same splat. */
const wobble = (seed: number) => {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
};

/** A spray-paint splat around (70,72): jagged blob, smoothed through the midpoints. */
const splatPath = (seed: number) => {
  const rnd = wobble(seed);
  const pts = Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 2;
    const spike = rnd() > 0.62;
    const r = 50 * (spike ? 1.06 + rnd() * 0.22 : 0.84 + rnd() * 0.14);
    return [70 + Math.cos(a) * r * 1.08, 72 + Math.sin(a) * r];
  });
  const mid = (p: number[], q: number[]) => `${((p[0] + q[0]) / 2).toFixed(1)},${((p[1] + q[1]) / 2).toFixed(1)}`;
  return (
    `M${mid(pts[21], pts[0])} ` +
    pts.map((p, i) => `Q${p[0].toFixed(1)},${p[1].toFixed(1)} ${mid(p, pts[(i + 1) % 22])}`).join(' ') +
    ' Z'
  );
};

/** Paint drips running off the bottom of the splat: [x, length, width]. */
const DRIPS = [
  [44, 30, 7],
  [63, 46, 9],
  [92, 22, 6],
];

/** Top-3 tag: a sprayed paint splat with drips and a 3D graffiti number; first place gets a hand-drawn crown. */
export const RankEmblem: React.FC<{ rank: number; className: string; glow?: boolean }> = ({ rank, className, glow }) => {
  const id = React.useId().replace(/:/g, '');
  const c = PAINTS[rank - 1];
  const crown = rank === 1;
  const rnd = wobble(rank * 7);
  const specks = Array.from({ length: 14 }, () => {
    const a = rnd() * Math.PI * 2;
    const r = 60 + rnd() * 14;
    return [70 + Math.cos(a) * r, 72 + Math.sin(a) * r * 0.9, 0.8 + rnd() * 2.2];
  });
  return (
    <svg
      viewBox={crown ? '-6 -30 152 190' : '-6 -6 152 166'}
      className={`w-auto shrink-0 overflow-visible ${glow ? c.glow : 'drop-shadow-md'} ${className}`}
      role="img"
      aria-label={`Hạng ${rank}`}
    >
      <defs>
        <filter id={`${id}r`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed={rank} />
          <feDisplacementMap in="SourceGraphic" scale="7" />
        </filter>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor={c.hi} />
          <stop offset="1" stopColor={c.paint} />
        </linearGradient>
      </defs>

      {/* black underspray, then the colour splat, drips and overspray specks, all roughened like real paint */}
      <g filter={`url(#${id}r)`}>
        <path d={splatPath(rank * 13)} fill="#0a0a0a" transform="translate(4 5)" />
        <path d={splatPath(rank * 13)} fill={c.paint} />
        {DRIPS.map(([x, len, w]) => (
          <g key={x} fill={c.paint}>
            <rect x={x - w / 2} y={100} width={w} height={len} />
            <circle cx={x} cy={100 + len} r={w * 0.75} />
          </g>
        ))}
        {specks.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill={i % 3 ? c.paint : '#0a0a0a'} />
        ))}
        <path d={splatPath(rank * 13)} fill={c.lo} opacity="0.35" transform="translate(70 72) scale(0.72) translate(-70 -72)" />
      </g>

      {/* graffiti number: black 3D block, thick outline, light fill, tilted like a tag */}
      <g transform="rotate(-8 70 72) skewX(-10)" fontFamily="var(--font-condensed)" fontWeight="900" fontSize="96" textAnchor="middle">
        <text x="88" y="106" fill="#0a0a0a" stroke="#0a0a0a" strokeWidth="14" strokeLinejoin="round">
          {rank}
        </text>
        <text x="82" y="100" fill={`url(#${id}t)`} stroke="#0a0a0a" strokeWidth="7" strokeLinejoin="round" paintOrder="stroke">
          {rank}
        </text>
        <text x="82" y="100" fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="1.5">
          {rank}
        </text>
      </g>

      {crown && (
        // Hand-drawn three-point crown, slightly crooked
        <g transform="translate(2 10) rotate(-10 70 -6)" strokeLinejoin="round" strokeLinecap="round">
          <path d="M38 6 L34 -26 L54 -6 L70 -34 L84 -6 L106 -24 L100 8 Z" fill={c.paint} stroke="#0a0a0a" strokeWidth="6" />
          <path d="M40 2 L98 4" stroke="#0a0a0a" strokeWidth="4" />
          <circle cx="34" cy="-28" r="5" fill="#fff" stroke="#0a0a0a" strokeWidth="3" />
          <circle cx="70" cy="-37" r="5" fill="#ef4444" stroke="#0a0a0a" strokeWidth="3" />
          <circle cx="106" cy="-26" r="5" fill="#fff" stroke="#0a0a0a" strokeWidth="3" />
        </g>
      )}
    </svg>
  );
};
