import { useEffect, useState } from 'react';
import { onSnapshot, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { eventCollection, eventDoc } from '../services/firestore';

const HEARTBEAT_MS = 15_000;
const OFFLINE_AFTER_MS = 40_000;

/** Judge device: report "I'm here" while the portal is open. */
export function useJudgeHeartbeat(judgeId: string | null) {
  useEffect(() => {
    if (!judgeId) return;
    const beat = () => setDoc(eventDoc('judgePresence', judgeId), { lastSeen: serverTimestamp() }).catch(() => {});
    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [judgeId]);
}

/** Admin: ids of judges whose portal sent a heartbeat recently. */
export function useOnlineJudgeIds(): Set<string> {
  const [lastSeen, setLastSeen] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => Date.now());

  useEffect(
    () =>
      onSnapshot(eventCollection('judgePresence'), (snap) => {
        setLastSeen(
          Object.fromEntries(
            snap.docs.map((d) => {
              const ts = d.data({ serverTimestamps: 'estimate' }).lastSeen as Timestamp | undefined;
              return [d.id, ts ? ts.toMillis() : 0];
            })
          )
        );
      }),
    []
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(timer);
  }, []);

  return new Set(Object.keys(lastSeen).filter((id) => now - lastSeen[id] < OFFLINE_AFTER_MS));
}
