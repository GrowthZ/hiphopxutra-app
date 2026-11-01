import type { StageState } from '../../domain/types';

export type BattleTheme = StageState['theme'];

/**
 * Colours of what the main battle LED draws straight on its backdrop (both layouts, 16:9 and arch). Name bars,
 * scores and the red / blue ballots keep their own colours on every backdrop. Full class strings, so Tailwind sees them.
 */
export function battlePalette(theme: BattleTheme) {
  const light = theme === 'light';
  return {
    light,
    backdrop:
      theme === 'light'
        ? 'from-white via-zinc-100 to-zinc-300'
        : theme === 'daylight'
          ? 'from-[#1a2a6c] via-[#13205a] to-[#0a1238]'
          : 'from-[#120a24] via-[#0b1030] to-[#05060f]',
    /** Red / blue glow behind each corner. */
    glow: light ? ['bg-red-500/20', 'bg-blue-500/20'] : ['bg-red-600/25', 'bg-blue-600/25'],
    stripes: light ? 'opacity-[0.05] text-black' : 'opacity-[0.06] text-white',
    /** From the name bars down, so the votes read clearly over the photos. */
    fade: light ? 'via-white/80 via-35% to-white/95' : 'via-[#05060f]/80 via-35% to-[#05060f]/95',
    photoShadow: light ? 'drop-shadow-[0_14px_30px_rgba(0,0,0,0.35)]' : 'drop-shadow-[0_14px_30px_rgba(0,0,0,0.85)]',
    caption: light ? 'text-zinc-600' : 'text-white/80',
    vs: light ? 'text-zinc-900 drop-shadow-[0_0_30px_rgba(251,191,36,0.7)]' : 'text-white drop-shadow-[0_0_30px_rgba(251,191,36,0.6)]',
    /** Judge names and round labels. */
    chip: light ? 'bg-white/90 text-zinc-900 ring-1 ring-zinc-300 shadow-sm' : 'bg-black/55 text-white ring-1 ring-white/10',
    chipLive: light ? 'bg-white text-zinc-900 ring-2 ring-amber-500 shadow-sm' : 'bg-black/60 text-white ring-2 ring-amber-400/80',
    tieText: light ? 'text-amber-600' : 'text-amber-300',
    emptyPill: light ? 'bg-zinc-300/60' : 'bg-white/10',
    votedText: light ? 'text-emerald-700' : 'text-emerald-300',
    wonText: light ? ['text-red-600', 'text-blue-600'] : ['text-red-400', 'text-blue-400'],
    statusTag: light ? 'bg-white/90 text-zinc-700 ring-1 ring-zinc-300' : 'bg-black/60 text-white/85 ring-1 ring-white/15',
    footer: light ? 'text-zinc-900/10' : 'text-white/15',
  };
}
