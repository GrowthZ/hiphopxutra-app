import React, { useEffect, useState } from 'react';
import {
  ARCH_COLUMNS,
  ARCH_HEIGHT,
  ARCH_OFFSET_X,
  ARCH_WIDTH,
  ArchEdge,
  columnTop,
  DOME_CLIP_PATH,
  HIDDEN,
  HIDDEN_ROWS,
  MODULE_PX,
  SHOW_ARCH_GRID,
  yFromBottom,
} from './archLayout';

/**
 * The stepped-arch wall's picture (2560×1536 by default), `lech` px from the left of the HDMI output. It keeps its pixel
 * size on the LED; only a smaller preview window scales it down. `edge`: the full picture, cut by the wall itself, or
 * only what lies inside the smooth dome. &luoi=1 draws the cabinet grid over it.
 */
export const ArchFrame: React.FC<{ edge?: ArchEdge; children: React.ReactNode }> = ({ edge = 'full', children }) => {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(1, window.innerWidth / (ARCH_OFFSET_X + ARCH_WIDTH), window.innerHeight / ARCH_HEIGHT));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <div
        className="absolute top-0 origin-top-left overflow-hidden text-white"
        style={{ left: ARCH_OFFSET_X * scale, width: ARCH_WIDTH, height: ARCH_HEIGHT, transform: `scale(${scale})` }}
      >
        <div className="absolute inset-0" style={edge === 'dome' ? { clipPath: DOME_CLIP_PATH } : undefined}>
          {children}
        </div>
        {SHOW_ARCH_GRID && <ArchGrid />}
      </div>
    </div>
  );
};

/** Setup aid (&luoi=1): cabinet grid inside the wall, the cut-away area greyed, the band the judges hide marked. */
const ArchGrid: React.FC = () => (
  <svg className="pointer-events-none absolute inset-0" width={ARCH_WIDTH} height={ARCH_HEIGHT}>
    <line x1={0} x2={ARCH_WIDTH} y1={yFromBottom(HIDDEN)} y2={yFromBottom(HIDDEN)} stroke="rgba(251,191,36,0.9)" strokeWidth={4} strokeDasharray="24 16" />
    <text x={ARCH_WIDTH / 2} y={yFromBottom(HIDDEN) + 48} fill="rgba(251,191,36,0.9)" fontSize={36} fontWeight={700} textAnchor="middle">
      Bàn giám khảo che phần dưới vạch này (che={HIDDEN_ROWS} hàng)
    </text>
    {ARCH_COLUMNS.map((rows, i) =>
      Array.from({ length: rows }, (_, r) => (
        <rect
          key={`${i}-${r}`}
          x={i * MODULE_PX}
          y={columnTop(i) + r * MODULE_PX}
          width={MODULE_PX}
          height={MODULE_PX}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
        />
      ))
    )}
    {ARCH_COLUMNS.map((_, i) => (
      <rect key={`off-${i}`} x={i * MODULE_PX} y={0} width={MODULE_PX} height={columnTop(i)} fill="rgba(255,255,255,0.06)" />
    ))}
  </svg>
);
