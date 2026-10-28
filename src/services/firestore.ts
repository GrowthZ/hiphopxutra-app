import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  runTransaction,
  deleteField,
  FieldPath,
} from 'firebase/firestore';
import { app, USE_EMULATORS } from './firebase';
import { CategoryType } from '../domain/types';

// One Firestore tree per tournament: events/{EVENT_ID}/...
export const EVENT_ID = 'hiphopxutra-2026';

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
});
if (USE_EMULATORS) connectFirestoreEmulator(db, '127.0.0.1', 8080);

export type SyncedCollection =
  | 'newbieDancers'
  | 'proDancers'
  | 'teams'
  | 'matches'
  | 'judges'
  | 'meta'
  | 'votes'
  | 'publicDancers'
  | 'publicVotes'
  | 'judgeBallots'
  | 'screens'
  | 'presence'
  | 'counters'
  | 'judgeSecrets'
  | 'judgeSessions'
  | 'judgePresence'
  | 'admins'
  | 'staffSecrets';

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
export type StaffRole = 'admin' | 'checkin';

/** Organizer role from admins/{email}; entries without a role are full admins (older entries, Google admins). */
export async function getStaffRole(email: string): Promise<StaffRole | null> {
  const snap = await getDoc(doc(db, 'events', EVENT_ID, 'admins', email.toLowerCase()));
  if (!snap.exists()) return null;
  return snap.data().role === 'checkin' ? 'checkin' : 'admin';
}

// Judge writes touch a single field so 9 judges scoring at once never overwrite each other.
export const writePrelimScore = (category: CategoryType, dancerId: string, judgeId: string, score: number) =>
  updateDoc(eventDoc(dancersCollectionOf(category), dancerId), new FieldPath('prelimScores', judgeId), score);

export const writeTieBreakScore = (category: CategoryType, dancerId: string, judgeId: string, score: number) =>
  updateDoc(eventDoc(dancersCollectionOf(category), dancerId), new FieldPath('tieBreakScores', judgeId), score);

export const writeBattleVote = (matchId: string, roundNumber: number, judgeId: string, side: 'red' | 'blue') =>
  setDoc(eventDoc('votes', matchId), { [`r${roundNumber}`]: { [judgeId]: side } }, { merge: true });

export const sbdPrefixOf = (category: CategoryType) => (category === 'newbie_1v1' ? 'N' : 'P');
export const isIssuedSbd = (category: CategoryType, sbd: string) => new RegExp(`^${sbdPrefixOf(category)}\\d{3,}$`).test(sbd);

/**
 * Check a dancer in and return their SBD. Numbers come from a counter in a transaction, so two desks
 * checking in at once never get the same number. A dancer who already had a number keeps it.
 * `highestIssued` covers a missing/reset counter when numbers were already handed out.
 */
/** Prelim panel for a freshly issued number: A takes odd numbers when `aIsOdd`, else the even ones. */
const panelForNumber = (n: number, aIsOdd: boolean): 'A' | 'B' => ((n % 2 === 1) === aIsOdd ? 'A' : 'B');

export async function checkInDancer(
  category: CategoryType,
  dancerId: string,
  highestIssued: number,
  aIsOdd = true
): Promise<{ sbd: string; panel: 'A' | 'B' }> {
  const prefix = sbdPrefixOf(category);
  const counterRef = eventDoc('counters', 'sbd');
  const dancerRef = eventDoc(dancersCollectionOf(category), dancerId);

  return runTransaction(db, async (tx) => {
    const counter = await tx.get(counterRef);
    const dancer = await tx.get(dancerRef);
    if (!dancer.exists()) throw new Error('Không tìm thấy thí sinh trên Firestore');

    const currentSbd = String(dancer.data().sbd ?? '');
    if (isIssuedSbd(category, currentSbd)) {
      // Back again: same number, same panel (one is given if an older check-in had none).
      const panel = dancer.data().panel ?? panelForNumber(Number(currentSbd.slice(1)), aIsOdd);
      tx.update(dancerRef, { checkedInAt: Date.now(), panel });
      return { sbd: currentSbd, panel };
    }

    const next = Math.max(Number(counter.data()?.[prefix] ?? 0), highestIssued) + 1;
    const sbd = `${prefix}${String(next).padStart(3, '0')}`;
    const panel = panelForNumber(next, aIsOdd);
    tx.set(counterRef, { [prefix]: next }, { merge: true });
    tx.update(dancerRef, { sbd, panel, checkedInAt: Date.now() });
    return { sbd, panel };
  });
}

export interface WalkInDancer {
  name: string;
  realName?: string;
  crew?: string;
}

/**
 * Registers a dancer at the desk (check-in staff or admin). The id is random so two desks never collide,
 * and its letter prefix keeps `bun run db dancer:import` numbering (newbie-001...) unaffected.
 */
export async function registerWalkIn(category: CategoryType, dancer: WalkInDancer): Promise<string> {
  const id = `${category === 'newbie_1v1' ? 'newbie' : 'pro'}-w${crypto.randomUUID().slice(0, 8)}`;
  const name = dancer.name.replace(/s*-s*/g, '-').replace(/s+/g, ' ').trim().toUpperCase();
  await setDoc(eventDoc(dancersCollectionOf(category), id), {
    sbd: '',
    name,
    gender: /^BGIRL/.test(name) ? 'female' : 'male',
    category,
    prelimScores: {},
    ...(dancer.realName?.trim() ? { realName: dancer.realName.trim() } : {}),
    ...(dancer.crew?.trim() ? { crew: dancer.crew.trim() } : {}),
  });
  return id;
}

export const undoCheckIn = (category: CategoryType, dancerId: string) =>
  updateDoc(eventDoc(dancersCollectionOf(category), dancerId), { checkedInAt: deleteField() });

export async function clearVotes(matchIds: string[]) {
  if (matchIds.length === 0) return;
  const batch = writeBatch(db);
  matchIds.forEach((id) => batch.delete(eventDoc('votes', id)));
  await batch.commit();
}
