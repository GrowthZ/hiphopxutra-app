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
 * How the wall's pixels land on the screen. They are the screen's *real* pixels: Windows display scaling (125%, 150%)
 * or a browser zoom makes one CSS px several real ones, which would stretch the picture and push it off the wall, so
 * everything is divided by devicePixelRatio. Only a window too small for the whole picture (a preview) shrinks it.
 */
function measureFit() {
  const dpr = window.devicePixelRatio || 1;
  const screenW = Math.round(window.innerWidth * dpr);
  const screenH = Math.round(window.innerHeight * dpr);
  // A couple of px of slack: CSS sizes are whole numbers, so 125% scaling can round 1536 real px down to 1535.
  const SLACK = 3;
  const scale = Math.min(1, (screenW + SLACK) / (ARCH_OFFSET_X + ARCH_WIDTH), (screenH + SLACK) / ARCH_HEIGHT);
  return { dpr, screenW, screenH, scale, css: scale / dpr };
}

function useArchFit() {
  const [fit, setFit] = useState(measureFit);
  useEffect(() => {
    let media: MediaQueryList | undefined;
    const update = () => {
      setFit(measureFit());
      // A zoom or a move to another monitor changes devicePixelRatio, sometimes without a resize event.
      media?.removeEventListener('change', update);
      media = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      media.addEventListener('change', update);
    };
    update();
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      media?.removeEventListener('change', update);
    };
  }, []);
  return fit;
}

/**
 * The stepped-arch wall's picture (2560×1536 by default), `lech` px from the left of the HDMI output, pixel for pixel
 * whatever the display scaling. `edge`: the full picture, cut by the wall itself, or only what lies inside the smooth
 * dome. &luoi=1 draws the cabinet grid over it and the screen's real size, to check the mapping on site.
 */
export const ArchFrame: React.FC<{ edge?: ArchEdge; children: React.ReactNode }> = ({ edge = 'full', children }) => {
  const fit = useArchFit();

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <div
        className="absolute top-0 origin-top-left overflow-hidden text-white"
        style={{ left: ARCH_OFFSET_X * fit.css, width: ARCH_WIDTH, height: ARCH_HEIGHT, transform: `scale(${fit.css})` }}
      >
        <div className="absolute inset-0" style={edge === 'dome' ? { clipPath: DOME_CLIP_PATH } : undefined}>
          {children}
        </div>
        {SHOW_ARCH_GRID && <ArchGrid />}
      </div>
      {SHOW_ARCH_GRID && <FitReport {...fit} />}
    </div>
  );
};

/** Setup aid (&luoi=1): the screen's real size and scaling against what the wall needs; red when it can't map 1:1. */
const FitReport: React.FC<ReturnType<typeof measureFit>> = ({ dpr, screenW, screenH, scale }) => {
  const needW = ARCH_OFFSET_X + ARCH_WIDTH;
  const exact = scale === 1;
  return (
    <div
      className={`pointer-events-none fixed bottom-2 left-2 z-50 rounded px-3 py-1.5 font-mono text-sm font-bold tabular-nums ${
        exact ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
      }`}
    >
      Màn hình {screenW}×{screenH} px thật · scaling {Math.round(dpr * 100)}% · vòm cần {needW}×{ARCH_HEIGHT}
      {exact ? ' · khớp 1:1' : ` · đang thu nhỏ ${Math.round(scale * 100)}%: chưa toàn màn hình hoặc khung HDMI nhỏ hơn`}
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
