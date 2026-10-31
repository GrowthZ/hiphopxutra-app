import React, { useMemo } from 'react';
import { useTournament } from '../../state/TournamentContext';
import { CategoryType } from '../../domain/types';
import { bracketLayout } from '../../domain/bracketLayout';
import { BracketTheme, BracketTree } from '../guest/BracketTree';
import { ArchFrame } from './ArchFrame';
import { ARCH_COLUMNS, ARCH_HEIGHT, ARCH_WIDTH, HIDDEN, MODULE_PX, yFromBottom } from './archLayout';

// "Sơ đồ knockout" on the stepped-arch LED (/led?khung=vom), shown between battles. The tree fills the widest
// rectangle the steps allow (every column but the outermost, which is too short), above the band the seated judges
// hide; the logo, the title and the champion box sit in the tall middle tower. Always the full picture: the
// tree reaches into the corners a dome edge would cut.

const LEFT = MODULE_PX; // skip the outermost column on each side
const TREE_TOP = ARCH_HEIGHT - Math.min(...ARCH_COLUMNS.slice(1, -1)) * MODULE_PX;
const TREE_BOTTOM = yFromBottom(HIDDEN + 0.01);
const CHAMPION_TOP = yFromBottom(0.775); // in the tower, under the title

const LABEL: Record<CategoryType, string> = { pro_2v2: 'Kid Pro 2vs2', newbie_1v1: 'Kid Newbie 1vs1' };

export const ArchBracketView: React.FC<{ category: CategoryType; theme?: BracketTheme }> = ({ category, theme = 'dark' }) => {
  const { matches, activeMatchId } = useTournament();
  const layout = useMemo(() => bracketLayout(matches, category, activeMatchId), [matches, category, activeMatchId]);
  const dark = theme === 'dark';
  const width = ARCH_WIDTH - 2 * LEFT;

  return (
    <ArchFrame>
      {/* Backdrop */}
      {dark ? (
        <>
          <div className="absolute inset-0 bg-[#07070b]" />
          <div className="absolute -left-[10%] top-[10%] h-[90%] w-[55%] rounded-full bg-rose-600/20 blur-[160px]" />
          <div className="absolute -right-[10%] top-[10%] h-[90%] w-[55%] rounded-full bg-amber-500/15 blur-[180px]" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-zinc-50" />
          <div className="absolute inset-0 opacity-[0.05] [background:repeating-linear-gradient(115deg,#be123c_0_2px,transparent_2px_56px)]" />
        </>
      )}

      {/* Tower: logo, then what this is */}
      <div className="absolute flex items-center justify-center" style={{ left: ARCH_WIDTH * 0.36, width: ARCH_WIDTH * 0.28, top: yFromBottom(0.95), height: yFromBottom(0.865) - yFromBottom(0.95) }}>
        <img src="/logo.png" alt="HipHop Xứ Trà U16" className="h-full w-auto drop-shadow-[0_0_30px_rgba(239,68,68,0.45)]" />
      </div>
      <div className="absolute flex items-center justify-center" style={{ left: ARCH_WIDTH * 0.3, width: ARCH_WIDTH * 0.4, top: yFromBottom(0.855), height: yFromBottom(0.805) - yFromBottom(0.855) }}>
        <span className="whitespace-nowrap rounded-xl bg-gradient-to-b from-amber-200 to-amber-400 px-6 py-1.5 font-condensed text-[40px] font-black uppercase leading-none text-zinc-950">
          Sơ đồ knockout · {LABEL[category]}
        </span>
      </div>

      {layout.columns.length === 0 ? (
        <p
          className={`absolute inset-x-0 text-center font-condensed text-[96px] font-black uppercase ${dark ? 'text-white/25' : 'text-zinc-300'}`}
          style={{ top: TREE_TOP + 180 }}
        >
          Chưa có nhánh đấu
        </p>
      ) : (
        <div className="absolute" style={{ left: LEFT, top: TREE_TOP, width, height: TREE_BOTTOM - TREE_TOP }}>
          <BracketTree
            layout={layout}
            pro={category === 'pro_2v2'}
            width={width}
            height={TREE_BOTTOM - TREE_TOP}
            theme={theme}
            labels="inside"
            margin={16}
            slotWidth={layout.columns.length > 4 ? 190 : 240}
            championTop={CHAMPION_TOP - TREE_TOP}
          />
        </div>
      )}

      {/* Bottom band (hidden by the seated judges): event name only */}
      <div className="absolute inset-x-0 flex items-center justify-center" style={{ top: yFromBottom(HIDDEN), bottom: 0 }}>
        <p className={`font-condensed text-[72px] font-black uppercase tracking-[0.35em] ${dark ? 'text-white/15' : 'text-zinc-300'}`}>
          HipHop Xứ Trà 2026 · Breaking U16
        </p>
      </div>
    </ArchFrame>
  );
};
