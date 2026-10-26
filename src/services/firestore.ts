import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  FieldPath,
} from 'firebase/firestore';
import { app } from './firebase';
import { CategoryType } from '../types/tournament';

// One Firestore tree per tournament: events/{EVENT_ID}/...
export const EVENT_ID = 'hiphopxutra-2026';

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
});

export type SyncedCollection =
  | 'newbieDancers'
  | 'proDancers'
  | 'teams'
  | 'matches'
  | 'judges'
  | 'meta'
  | 'votes';

export const eventCollection = (name: SyncedCollection) => collection(db, 'events', EVENT_ID, name);
export const eventDoc = (name: SyncedCollection, id: string) => doc(db, 'events', EVENT_ID, name, id);

export const dancersCollectionOf = (category: CategoryType): SyncedCollection =>
  category === 'newbie_1v1' ? 'newbieDancers' : 'proDancers';

/** JSON with sorted keys, so Firestore's key order never looks like a change. */
export function stableStringify(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`;
}

/** Throws when Firestore is unreachable, so callers can tell "not an admin" from "can't check". */
export async function checkIsAdmin(email: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'events', EVENT_ID, 'admins', email.toLowerCase()));
  return snap.exists();
}

// Judge writes touch a single field so 9 judges scoring at once never overwrite each other.
export const writePrelimScore = (category: CategoryType, dancerId: string, judgeId: string, score: number) =>
  updateDoc(eventDoc(dancersCollectionOf(category), dancerId), new FieldPath('prelimScores', judgeId), score);

export const writeBattleVote = (matchId: string, roundNumber: number, judgeId: string, side: 'red' | 'blue') =>
  setDoc(eventDoc('votes', matchId), { [`r${roundNumber}`]: { [judgeId]: side } }, { merge: true });

export async function clearVotes(matchIds: string[]) {
  if (matchIds.length === 0) return;
  const batch = writeBatch(db);
  matchIds.forEach((id) => batch.delete(eventDoc('votes', id)));
  await batch.commit();
}
