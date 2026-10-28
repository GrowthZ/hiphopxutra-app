import { useEffect } from 'react';

/** Keeps the screen on while mounted (judges score for hours). The browser drops the lock when the tab hides, so it is re-taken on return. */
export function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let released = false;
    const acquire = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        lock = await navigator.wakeLock.request('screen');
        if (released) lock.release();
      } catch {
        // denied (battery saver, unsupported): the screen just follows the phone's own timeout
      }
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      released = true;
      document.removeEventListener('visibilitychange', acquire);
      lock?.release();
    };
  }, []);
}
