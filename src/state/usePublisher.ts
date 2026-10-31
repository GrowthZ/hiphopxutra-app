import { useEffect, useState } from 'react';
import { onSnapshot, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { eventDoc } from '../services/firestore';

// Only an open admin tab turns judges' raw scores and votes into the copies that the MC, the LED, guests and
// judges read (see TournamentContext). Each such tab beats presence/publisher, so other screens can warn when none
// is left. Hidden tabs get their timers slowed down, hence the generous margin.
const HEARTBEAT_MS = 20_000;
const OFFLINE_AFTER_MS = 70_000;
const publisherDoc = () => eventDoc('presence', 'publisher');

/** Admin tab that publishes: heartbeat, and keep the screen awake so the machine doesn't sleep mid-event. */
export function usePublisherHeartbeat(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const beat = () => setDoc(publisherDoc(), { lastSeen: serverTimestamp() }).catch(() => {});
    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);

    // Screen Wake Lock: released whenever the tab is hidden, so ask again when it comes back.
    let lock: WakeLockSentinel | null = null;
    const keepAwake = () => {
      if (document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
      navigator.wakeLock
        .request('screen')
        .then((l) => (lock = l))
        .catch(() => {});
    };
    const onVisible = () => {
      keepAwake();
      if (document.visibilityState === 'visible') beat();
    };
    keepAwake();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
    };
  }, [active]);
}

/** true / false once known; null while the first answer is on its way (show nothing yet). */
export function usePublisherOnline() {
  const [lastSeen, setLastSeen] = useState<number | null | undefined>(undefined);
  const [now, setNow] = useState(() => Date.now());

  useEffect(
    () =>
      onSnapshot(
        publisherDoc(),
        (snap) => {
          const ts = snap.data({ serverTimestamps: 'estimate' })?.lastSeen as Timestamp | undefined;
          setLastSeen(ts ? ts.toMillis() : null);
        },
        () => setLastSeen(null)
      ),
    []
  );
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(timer);
  }, []);

  if (lastSeen === undefined) return null;
  return lastSeen !== null && now - lastSeen < OFFLINE_AFTER_MS;
}
