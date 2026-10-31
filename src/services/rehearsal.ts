import { collection, doc, DocumentReference, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { BUILD_EVENT_ID, db, REHEARSAL_EVENT_ID, setRehearsalMode, SyncedCollection } from './firestore';
import { buildSeed, SampleCounts, SeedStage } from '../domain/sampleData';
import { DEFAULT_PANELS, PrelimPanels } from '../domain/model';
import { Judge } from '../domain/types';

// The admin page "Tổng duyệt": fills or empties the rehearsal tree (events/hiphopxutra-2026-dev). Every write
// below names that tree explicitly, so the real event is never touched, whichever tree the app is on.

/** Everything the tournament writes; the account collections (admins, PINs, passwords) are left alone. */
const DATA_COLLECTIONS: SyncedCollection[] = [
  'newbieDancers',
  'proDancers',
  'publicDancers',
  'teams',
  'matches',
  'judges',
  'meta',
  'votes',
  'publicVotes',
  'judgeBallots',
  'screens',
  'presence',
  'counters',
  'judgeSessions',
  'judgePresence',
];

const rehearsalCollection = (name: string) => collection(db, 'events', REHEARSAL_EVENT_ID, name);
const BATCH = 400; // Firestore allows 500 writes per batch

async function inBatches<T>(items: T[], write: (batch: ReturnType<typeof writeBatch>, item: T) => void) {
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = writeBatch(db);
    items.slice(i, i + BATCH).forEach((item) => write(batch, item));
    await batch.commit();
  }
}

/** Deletes all rehearsal data (not the accounts). Returns how many documents went. */
async function clearRehearsalTree(): Promise<number> {
  const refs: DocumentReference[] = [];
  for (const name of DATA_COLLECTIONS) refs.push(...(await getDocs(rehearsalCollection(name))).docs.map((d) => d.ref));
  await inBatches(refs, (batch, ref) => batch.delete(ref));
  return refs.length;
}

/**
 * Replaces the rehearsal data with sample dancers at `stage`. The real event's judges (names, photos) and prelim
 * panels are copied in, so judges see themselves and score the right panel. Returns the documents written.
 */
export async function generateRehearsalData(stage: SeedStage, counts: SampleCounts): Promise<number> {
  const realJudges = (await getDocs(collection(db, 'events', BUILD_EVENT_ID, 'judges'))).docs.map((d) => ({ ...d.data(), id: d.id }) as Judge);
  const meta = (await getDoc(doc(db, 'events', BUILD_EVENT_ID, 'meta', 'current'))).data();
  const panels = (meta?.prelimPanels as PrelimPanels | undefined) ?? DEFAULT_PANELS;
  const data = buildSeed(stage, [], {
    counts,
    judges: realJudges.length ? realJudges.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true })) : undefined,
    panels,
  });

  await clearRehearsalTree();
  const writes = Object.entries(data).flatMap(([name, docs]) =>
    Object.entries(docs).map(([id, value]) => [doc(rehearsalCollection(name), id), value] as const)
  );
  await inBatches(writes, (batch, [ref, value]) => batch.set(ref, value));
  return writes.length;
}

/**
 * Empties the rehearsal tree and switches every device back to the real event first, so no admin screen is left on
 * an empty tree (it would fill it with the built-in demo data).
 */
export async function deleteRehearsalData(): Promise<number> {
  await setRehearsalMode(false);
  return clearRehearsalTree();
}

/** How much sample data there is now (dancers per category). */
export async function rehearsalSummary(): Promise<{ newbie: number; pro: number }> {
  const [newbie, pro] = await Promise.all([getDocs(rehearsalCollection('newbieDancers')), getDocs(rehearsalCollection('proDancers'))]);
  return { newbie: newbie.size, pro: pro.size };
}
