import React, { useEffect, useState } from 'react';
import { useTournament } from '../../state/TournamentContext';
import { useStageState, DEFAULT_SCREEN_ID } from '../../state/useStage';
import { IS_LED_PREVIEW } from '../../app/routes';
import { soundFX } from '../../services/soundEffects';
import { StageDisplayView } from './StageDisplayView';
import { ArchBattleView } from './ArchBattleView';
import { IS_ARCH_LED } from './archLayout';
import { PrelimResultsView } from '../prelim/PrelimResultsView';

const CURSOR_HIDE_MS = 3000;

/** Standby / blackout screen: logo only, safe to show at any moment. */
const StageIdleScreen: React.FC = () => (
  <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-center px-6">
    <p className="font-condensed font-black uppercase tracking-[0.3em] text-amber-400 text-[3vw]">Breaking U16</p>
    <h1 className="font-condensed font-black uppercase text-white leading-none text-[11vw] tracking-wide">
      HIPHOP XỨ TRÀ
    </h1>
    <p className="font-condensed font-black text-zinc-500 text-[4vw] tracking-[0.4em]">2026</p>
  </div>
);

/**
 * /led: what the venue screen shows, driven entirely by admins from /admin/led.
 * Kiosk mode: no operator controls, no clicks reach the views, cursor hides when idle.
 * /led?khung=vom: the battle scene laid out for the stepped-arch LED wall (see archLayout.ts).
 */
export const LedScreen: React.FC = () => {
  const { setActiveCategory } = useTournament();
  const { state, isOnline } = useStageState(DEFAULT_SCREEN_ID, { heartbeat: !IS_LED_PREVIEW });
  const [cursorHidden, setCursorHidden] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

  useEffect(() => {
    if (IS_LED_PREVIEW) soundFX.enabled = false; // the preview lives on the admin laptop
  }, []);

  useEffect(() => {
    setActiveCategory(state.category);
  }, [state.category, setActiveCategory]);

  useEffect(() => {
    let timer = setTimeout(() => setCursorHidden(true), CURSOR_HIDE_MS);
    const onMove = () => {
      setCursorHidden(false);
      clearTimeout(timer);
      timer = setTimeout(() => setCursorHidden(true), CURSOR_HIDE_MS);
    };
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    // One click anywhere enters fullscreen (browsers require a user gesture).
    const onClick = () => {
      if (!IS_LED_PREVIEW && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    };
    window.addEventListener('mousemove', onMove);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('click', onClick);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('click', onClick);
    };
  }, []);

  const scene = state.blackout ? 'idle' : state.scene;

  return (
    <div className={`relative min-h-screen bg-black ${cursorHidden ? 'cursor-none' : ''}`}>
      <div className="kiosk">
        {scene === 'idle' && <StageIdleScreen />}
        {scene === 'battle' && (IS_ARCH_LED ? <ArchBattleView /> : <StageDisplayView theme={state.theme} />)}
        {scene === 'prelim_leaderboard' && <PrelimResultsView />}
      </div>

      {!isOnline && (
        <div
          className="fixed bottom-2 right-2 z-[100] w-3 h-3 rounded-full bg-red-500 animate-pulse"
          title="Mất kết nối, đang giữ cảnh cuối cùng"
        />
      )}

      {!IS_LED_PREVIEW && !isFullscreen && !cursorHidden && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] rounded bg-zinc-900/90 px-3 py-1.5 text-xs font-bold text-zinc-200 pointer-events-none">
          Bấm vào màn hình để vào chế độ toàn màn hình
        </div>
      )}
    </div>
  );
};
