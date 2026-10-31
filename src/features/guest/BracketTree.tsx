import React from 'react';
import { Crown } from 'lucide-react';
import { BattleSide } from '../../domain/types';
import { BracketLayout, BracketSlot } from '../../domain/bracketLayout';
import { stripBreakerPrefix } from '../../shared/placeholderAssets';

// The knockout tree drawn in a box of the given size, like a printed bracket: the first half of the first stage on the
// left, the second half on the right, each side narrowing to its finalist, the champion above the middle. Used by the
// public bracket page (/ket-qua/so-do) and the LED scenes (16:9 and the stepped arch), in a light or a dark look.

export type BracketTheme = 'light' | 'dark';

const STAGE_LABEL: Record<string, string> = { top32: 'Top 32', top16: 'Top 16', top8: 'Tứ kết', top4: 'Bán kết', final: 'Chung kết' };
const MIDDLE_GAP = 70; // between the two finalists
const LABEL_BAND = 44; // stage names inside the box (labels="inside")

const LOOK = {
  light: {
    line: '#d4d4d8',
    lit: '#be123c',
    label: 'text-rose-700/70',
    slot: 'border-rose-700/50 bg-white text-zinc-900',
    won: 'border-rose-700 bg-rose-700 text-white shadow-[0_6px_20px_rgba(190,18,60,0.35)]',
    lost: 'border-zinc-200 bg-zinc-100 text-zinc-400',
    live: 'border-amber-400 bg-white text-zinc-900 ring-4 ring-amber-300/70',
    empty: 'border-zinc-300 bg-white/60 text-zinc-300',
    sub: 'text-zinc-500',
    score: 'bg-zinc-200 text-zinc-600',
    crownBox: 'border-rose-700/40 bg-white',
    crownTitle: 'text-rose-700',
    crownName: 'text-zinc-900',
    crownSub: 'text-zinc-500',
    champion: 'border-amber-400 bg-gradient-to-b from-amber-50 to-amber-100 shadow-[0_0_60px_rgba(251,191,36,0.55)]',
  },
  dark: {
    line: '#3f3f46',
    lit: '#f43f5e',
    label: 'text-amber-300/80',
    slot: 'border-white/25 bg-white/[0.06] text-white',
    won: 'border-rose-400 bg-rose-600 text-white shadow-[0_0_28px_rgba(244,63,94,0.55)]',
    lost: 'border-white/10 bg-white/[0.03] text-white/35',
    live: 'border-amber-400 bg-white/10 text-white ring-4 ring-amber-400/60',
    empty: 'border-white/15 bg-transparent text-white/20',
    sub: 'text-white/55',
    score: 'bg-white/15 text-white/80',
    crownBox: 'border-white/25 bg-white/[0.06]',
    crownTitle: 'text-amber-300',
    crownName: 'text-white',
    crownSub: 'text-white/60',
    champion: 'border-amber-400 bg-gradient-to-b from-amber-400/30 to-amber-600/10 shadow-[0_0_80px_rgba(251,191,36,0.5)]',
  },
} as const;

export const sideTitle = (side: BattleSide) =>
  side.dancers.length ? side.dancers.map((d) => stripBreakerPrefix(d.name)).join(' & ') : stripBreakerPrefix(side.name);

export const BracketTree: React.FC<{
  layout: BracketLayout;
  pro: boolean;
  width: number;
  height: number;
  theme?: BracketTheme;
  /** Stage names above the box (default) or in a band at its top. */
  labels?: 'above' | 'inside';
  /** Outer margin on both sides. */
  margin?: number;
  /** Top of the champion box, relative to the tree (default: above the finalists). */
  championTop?: number;
  /** Slot width (default: 196, or 158 when there are five stages). */
  slotWidth?: number;
}> = ({ layout, pro, width, height, theme = 'light', labels = 'above', margin = 28, championTop, slotWidth }) => {
  const look = LOOK[theme];
  const columns = layout.columns.length; // the last one is the final's two slots
  if (columns === 0) return null;
  const perSide = columns - 1;
  const top = labels === 'inside' ? LABEL_BAND : 0;
  const slotW = slotWidth ?? (columns > 4 ? 158 : 196);
  const step = (width / 2 - MIDDLE_GAP / 2 - margin - slotW) / Math.max(perSide, 1);
  const first = layout.columns[0].length;
  const slotH = Math.min(70, Math.floor(((height - top) / Math.max(first / 2, 1)) * 0.78));

  /** Slot `i` of one side's column `c`: left edge x and centre y. */
  const place = (c: number, i: number, count: number, right: boolean) => {
    const x = margin + c * step;
    return { x: right ? width - x - slotW : x, y: top + ((i + 0.5) * (height - top)) / count };
  };

  const lines: React.ReactNode[] = [];
  const boxes: React.ReactNode[] = [];
  for (let c = 0; c < columns; c++) {
    const col = layout.columns[c];
    const final = c === columns - 1;
    const half = final ? 1 : col.length / 2;
    col.forEach((slot, idx) => {
      const right = final ? idx === 1 : idx >= half;
      const i = final ? 0 : right ? idx - half : idx;
      const { x, y } = place(c, i, half, right);
      boxes.push(<Slot key={`${c}-${idx}`} slot={slot} pro={pro} look={look} compact={columns > 4} style={{ left: x, top: y - slotH / 2, width: slotW, height: slotH }} />);
      if (final) return;
      // Out from the inner edge, along to the pair's middle, then into the next column's slot.
      const next = place(c + 1, Math.floor(i / 2), half / 2 || 1, right);
      const fromX = right ? x : x + slotW;
      const midX = right ? fromX - (step - slotW) / 2 : fromX + (step - slotW) / 2;
      const toX = right ? next.x + slotW : next.x;
      lines.push(
        <path
          key={`l-${c}-${idx}`}
          d={`M ${fromX} ${y} H ${midX} V ${next.y} H ${toX}`}
          fill="none"
          stroke={slot.won ? look.lit : look.line}
          strokeWidth={slot.won ? 4 : 2.5}
        />
      );
    });
  }

  // Finalists to the champion box above them.
  const finalY = top + (height - top) / 2;
  const crownTop = championTop ?? finalY - slotH / 2 - 210;
  const finalLit = layout.columns[columns - 1].some((s) => s.won);
  lines.push(
    <path
      key="final"
      d={`M ${width / 2 - MIDDLE_GAP / 2} ${finalY} H ${width / 2 + MIDDLE_GAP / 2} M ${width / 2} ${finalY} V ${crownTop + 150}`}
      fill="none"
      stroke={finalLit ? look.lit : look.line}
      strokeWidth={finalLit ? 4 : 2.5}
    />
  );
  const champion = layout.champion;

  return (
    <div className="absolute inset-0">
      {layout.stages.slice(0, -1).map((stage, c) =>
        [false, true].map((right) => (
          <span
            key={`${stage}-${right}`}
            className={`absolute text-center text-lg font-black uppercase tracking-widest ${look.label}`}
            style={{ left: place(c, 0, 1, right).x, width: slotW, top: labels === 'inside' ? 6 : -34 }}
          >
            {STAGE_LABEL[stage]}
          </span>
        ))
      )}
      <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={width} height={height}>
        {lines}
      </svg>
      {boxes}

      <div
        className={`absolute flex flex-col items-center justify-center rounded-2xl border-4 text-center ${champion ? look.champion : look.crownBox}`}
        style={{ left: width / 2 - 170, width: 340, top: crownTop, height: 150 }}
      >
        <Crown className="absolute -top-[46px] h-9 w-9 text-amber-500" fill="currentColor" />
        <span className={`font-condensed text-2xl font-black uppercase tracking-[0.3em] ${look.crownTitle}`}>Vô địch</span>
        <span className={`mt-1 max-w-[310px] truncate font-condensed text-4xl font-black uppercase leading-tight ${look.crownName}`}>
          {champion ? sideTitle(champion) : '?'}
        </span>
        {champion && pro && <span className={`text-base font-bold uppercase ${look.crownSub}`}>{champion.name}</span>}
      </div>
    </div>
  );
};

/** One entrant: team (Pro: team name under the pair) or dancer, rounds won, and how their battle went. */
const Slot: React.FC<{ slot: BracketSlot; pro: boolean; compact: boolean; look: (typeof LOOK)[BracketTheme]; style: React.CSSProperties }> = ({
  slot,
  pro,
  compact,
  look,
  style,
}) => {
  const { side } = slot;
  if (!side) {
    return (
      <div style={style} className={`absolute flex items-center justify-center rounded-lg border-2 border-dashed ${look.empty}`}>
        <span className="font-condensed text-xl font-black">—</span>
      </div>
    );
  }
  const oneLine = Number(style.height) < 44;
  const sub = slot.forfeit ? 'Bỏ cuộc' : slot.live ? '● Đang thi đấu' : pro ? side.name : side.sbdText.replace(/^SBD\s*/i, 'SBD ');
  return (
    <div
      style={style}
      className={`absolute flex items-center gap-2 overflow-hidden rounded-lg border-2 px-2.5 transition-all duration-700 ${
        slot.won ? look.won : slot.lost ? look.lost : slot.live ? look.live : look.slot
      }`}
    >
      <div className="min-w-0 flex-1 leading-none">
        <p className={`truncate font-condensed font-black uppercase ${compact ? 'text-[19px]' : 'text-[23px]'} ${slot.lost ? 'line-through decoration-2' : ''}`}>
          {sideTitle(side)}
        </p>
        {!oneLine && <p className={`mt-1 truncate text-[12px] font-bold uppercase ${slot.won ? 'text-white/80' : look.sub}`}>{sub}</p>}
      </div>
      {slot.score !== undefined && (
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded font-condensed text-2xl font-black tabular-nums ${
            slot.won ? 'bg-white text-rose-700' : look.score
          }`}
        >
          {slot.score}
        </span>
      )}
    </div>
  );
};
