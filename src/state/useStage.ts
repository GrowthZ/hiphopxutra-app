import { useEffect, useState } from 'react';
import { onSnapshot, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { eventDoc } from '../services/firestore';
import { StageState } from '../domain/types';

export const DEFAULT_SCREEN_ID = 'san-khau-chinh';
const HEARTBEAT_MS = 10_000;
const OFFLINE_AFTER_MS = 30_000;

const defaultState = (id: string): StageState => ({
  id,
  scene: 'battle',
  category: 'pro_2v2',
  theme: 'daylight',
  blackout: false,
  updatedAt: 0,
  updatedBy: '',
});

/**
 * LED side (read-only): live StageState for one screen, plus a heartbeat so admins see it's alive.
 * Firestore's offline cache keeps the last scene on screen when the network drops.
 */
export function useStageState(screenId = DEFAULT_SCREEN_ID, { heartbeat = false } = {}) {
  const [state, setState] = useState<StageState>(() => defaultState(screenId));
  const [isOnline, setIsOnline] = useState(true);

  useEffect(
    () =>
      onSnapshot(
        eventDoc('screens', screenId),
        { includeMetadataChanges: true },
        (snap) => {
          if (snap.exists()) setState({ ...defaultState(screenId), ...snap.data(), id: screenId });
          setIsOnline(!snap.metadata.fromCache);
        },
        () => setIsOnline(false)
      ),
    [screenId]
  );

  useEffect(() => {
    if (!heartbeat) return;
    const beat = () => setDoc(eventDoc('presence', screenId), { lastSeen: serverTimestamp() }).catch(() => {});
    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [heartbeat, screenId]);

  return { state, isOnline };
}

/** Admin side: read the same StageState, change it, and watch the screen's heartbeat. */
export function useStageController(screenId = DEFAULT_SCREEN_ID, adminEmail = '') {
  const { state } = useStageState(screenId);
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      onSnapshot(eventDoc('presence', screenId), (snap) => {
        const ts = snap.data({ serverTimestamps: 'estimate' })?.lastSeen as Timestamp | undefined;
        setLastSeen(ts ? ts.toMillis() : null);
      }),
    [screenId]
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(timer);
  }, []);

  const update = (patch: Partial<Omit<StageState, 'id'>>) => {
    setError(null);
    return setDoc(
      eventDoc('screens', screenId),
      { ...patch, updatedAt: Date.now(), updatedBy: adminEmail },
      { merge: true }
    ).catch((err: Error) => setError(err.message));
  };

  return {
    state,
    error,
    isScreenOnline: lastSeen !== null && now - lastSeen < OFFLINE_AFTER_MS,
    setScene: (scene: StageState['scene']) => update({ scene, blackout: false }),
    setCategory: (category: StageState['category']) => update({ category }),
    setTheme: (theme: StageState['theme']) => update({ theme }),
    setBlackout: (blackout: boolean) => update({ blackout }),
    setWinnerDelay: (winnerDelay: number) => update({ winnerDelay }),
    setArchEdge: (archEdge: 'full' | 'dome') => update({ archEdge }),
    setBracketTheme: (bracketTheme: 'light' | 'dark') => update({ bracketTheme }),
    setIdleImage: (idleImageUrl: string) => update({ idleImageUrl }),
  };
}
