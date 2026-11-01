import type { StageState } from '../../domain/types';

export type BattleTheme = StageState['theme'];

/**
 * Colours of the upper half of the main battle LED (both layouts, 16:9 and arch): backdrop, photos, VS. From the name
 * bars down every theme turns dark, so the judges' ballots read clearly and a light backdrop doesn't glare there.
 * Full class strings, so Tailwind sees them.
 */
export function battlePalette(theme: BattleTheme) {
  const light = theme === 'light';
  return {
    backdrop:
      theme === 'light'
        ? 'from-white via-zinc-100 to-zinc-300'
        : theme === 'daylight'
          ? 'from-[#1a2a6c] via-[#13205a] to-[#0a1238]'
          : 'from-[#120a24] via-[#0b1030] to-[#05060f]',
    /** Red / blue glow behind each corner. */
    glow: light ? ['bg-red-500/20', 'bg-blue-500/20'] : ['bg-red-600/25', 'bg-blue-600/25'],
    stripes: light ? 'opacity-[0.05] text-black' : 'opacity-[0.06] text-white',
    /** From the name bars down; on a light backdrop fully dark before the judges' row (~23% down). */
    fade: light ? 'via-[#05060f]/95 via-20% to-[#05060f]' : 'via-[#05060f]/80 via-35% to-[#05060f]/95',
    photoShadow: light ? 'drop-shadow-[0_14px_30px_rgba(0,0,0,0.35)]' : 'drop-shadow-[0_14px_30px_rgba(0,0,0,0.85)]',
    caption: light ? 'text-zinc-600' : 'text-white/80',
    vs: light ? 'text-zinc-900 drop-shadow-[0_0_30px_rgba(251,191,36,0.7)]' : 'text-white drop-shadow-[0_0_30px_rgba(251,191,36,0.6)]',
  };
}
