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
  onSnapshot,
} from 'firebase/firestore';
import { app, USE_EMULATORS } from './firebase';
import { CategoryType } from '../domain/types';

// One Firestore tree per tournament: events/{EVENT_ID}/...
export const PROD_EVENT_ID = 'hiphopxutra-2026';
/** Sample data for rehearsals; keep in sync with scripts/db.ts DEV_EVENT_ID, vite.config.ts and firestore.rules. */
export const REHEARSAL_EVENT_ID = 'hiphopxutra-2026-dev';
/** The tree this build is for: the real event, or the rehearsal one (`bun run dev:devdb`, TEST=true). */
export const BUILD_EVENT_ID = import.meta.env.VITE_EVENT_ID || PROD_EVENT_ID;
/**
 * The tree in use. A real-event build switches to the rehearsal tree while an admin has turned rehearsal mode on
 * (config/app, read by chooseEventTree() before the app renders); every device follows.
 */
export let EVENT_ID = BUILD_EVENT_ID;
export const CAN_SWITCH_TO_REHEARSAL = BUILD_EVENT_ID === PROD_EVENT_ID;

// Logins and their secrets belong to the build's event, whichever tree the data comes from.
const ACCOUNT_COLLECTIONS: readonly SyncedCollection[] = ['admins', 'judgeSecrets', 'mcSecrets', 'staffSecrets'];
const treeOf = (name: SyncedCollection) => (ACCOUNT_COLLECTIONS.includes(name) ? BUILD_EVENT_ID : EVENT_ID);

/**
 * Rehearsal build in the real project: Firebase Auth is shared with production, so judge PINs and BTC passwords
 * must not be created or changed from here (that would change the real logins too).
 */
export const SHARES_PROD_AUTH = BUILD_EVENT_ID !== PROD_EVENT_ID && !USE_EMULATORS;
export function assertProdAuthUntouched() {
  if (SHARES_PROD_AUTH) {
    throw new Error(
      'Đang chạy dữ liệu DEV, tài khoản đăng nhập dùng chung với giải thật: tạo / đổi PIN, mật khẩu ở bản thật rồi chạy lại "bun run db seed".'
    );
  }
}

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
  | 'mcSecrets'
  | 'judgeSessions'
  | 'judgePresence'
  | 'admins'
  | 'staffSecrets';

export const eventCollection = (name: SyncedCollection) => collection(db, 'events', treeOf(name), name);
export const eventDoc = (name: SyncedCollection, id: string) => doc(db, 'events', treeOf(name), name, id);

// ---------- Rehearsal mode (config/app.rehearsal) ----------

const configDoc = () => doc(db, 'config', 'app');
const MODE_KEY = 'hiphop_xu_tra_rehearsal';
const treeFor = (rehearsal: boolean) => (rehearsal ? REHEARSAL_EVENT_ID : PROD_EVENT_ID);

/**
 * Picks the tree before the app renders. Offline (or slow), the last mode seen on this device is used, so a judge
 * phone that lost Wi-Fi keeps working on the same data.
 */
export async function chooseEventTree() {
  if (!CAN_SWITCH_TO_REHEARSAL) return;
  let rehearsal = false;
  try {
    rehearsal = localStorage.getItem(MODE_KEY) === '1';
  } catch {
    // no storage: start on the real event
  }
  try {
    const snap = await Promise.race([
      getDoc(configDoc()),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
    ]);
    rehearsal = snap.data()?.rehearsal === true;
    try {
      localStorage.setItem(MODE_KEY, rehearsal ? '1' : '0');
    } catch {
      // not remembered
    }
  } catch {
    // keep the remembered mode
  }
  EVENT_ID = treeFor(rehearsal);
}

/** Calls `onSwitch` when an admin turns rehearsal mode on or off (the page then reloads onto the other tree). */
export const watchEventTree = (onSwitch: () => void) =>
  CAN_SWITCH_TO_REHEARSAL
    ? onSnapshot(configDoc(), (snap) => {
        if (snap.metadata.fromCache) return;
        if (treeFor(snap.data()?.rehearsal === true) !== EVENT_ID) onSwitch();
      })
    : () => {};

export const setRehearsalMode = (on: boolean) => setDoc(configDoc(), { rehearsal: on, updatedAt: Date.now() }, { merge: true });

// ---------- MC names (config/app.mcNames, app-wide like the switch above) ----------

export const subscribeMcNames = (onChange: (names: Record<string, string>) => void) =>
  onSnapshot(
    configDoc(),
    (snap) => onChange(snap.data()?.mcNames ?? {}),
    () => onChange({})
  );

export const renameMc = (mcId: string, name: string) =>
  setDoc(configDoc(), { mcNames: { [mcId]: name }, updatedAt: Date.now() }, { merge: true });

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
export type StaffRole = 'admin' | 'checkin' | 'editor';

/** A stored role; anything else (older entries, Google admins) is a full admin. */
export const toStaffRole = (stored: unknown): StaffRole => (stored === 'checkin' || stored === 'editor' ? stored : 'admin');

/** Organizer role from admins/{email}; entries without a role are full admins (older entries, Google admins). */
export async function getStaffRole(email: string): Promise<StaffRole | null> {
  const snap = await getDoc(doc(db, 'events', BUILD_EVENT_ID, 'admins', email.toLowerCase()));
  if (!snap.exists()) return null;
  return toStaffRole(snap.data().role);
}

// Judge writes touch a single field so 9 judges scoring at once never overwrite each other.
export const writePrelimScore = (category: CategoryType, dancerId: string, judgeId: string, score: number) =>
  updateDoc(eventDoc(dancersCollectionOf(category), dancerId), new FieldPath('prelimScores', judgeId), score);

/**
 * "Cập nhật thí sinh" staff (role editor) don't sync whole lists like an admin client: they write a dancer's details
 * and photos straight to its document (firestore.rules lets them touch only those fields). undefined removes a field.
 */
export const writeDancerFields = (category: CategoryType, dancerId: string, fields: Record<string, unknown>) =>
  updateDoc(
    eventDoc(dancersCollectionOf(category), dancerId),
    Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v === undefined ? deleteField() : v]))
  );

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
  gender?: 'male' | 'female';
}

/**
 * Registers a dancer at the desk (check-in staff or admin). The id is random so two desks never collide,
 * and its letter prefix keeps `bun run db dancer:import` numbering (newbie-001...) unaffected.
 */
/** Stage name as stored: "bboy  kenz - x" -> "BBOY KENZ-X". */
export const walkInName = (name: string) => name.replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ').trim().toUpperCase();

export async function registerWalkIn(category: CategoryType, dancer: WalkInDancer): Promise<string> {
  const id = `${category === 'newbie_1v1' ? 'newbie' : 'pro'}-w${crypto.randomUUID().slice(0, 8)}`;
  const name = walkInName(dancer.name);
  await setDoc(eventDoc(dancersCollectionOf(category), id), {
    sbd: '',
    name,
    gender: dancer.gender ?? (/^BGIRL\b/.test(name) ? 'female' : 'male'),
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
