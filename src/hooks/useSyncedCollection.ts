import { useEffect, useRef, useState } from 'react';
import { deleteField, DocumentData, onSnapshot, writeBatch } from 'firebase/firestore';
import { db, eventCollection, eventDoc, stableStringify, SyncedCollection } from '../services/firestore';

interface Options<T> {
  /** Only admins push local changes; everyone else is read-only. */
  canWrite: boolean;
  toDoc?: (item: T) => DocumentData;
  fromDoc?: (id: string, data: DocumentData) => T;
  /** Keep local items when the remote collection is empty, so an admin seeds it. */
  keepLocalWhenEmpty?: boolean;
  /** false = neither read nor write this collection (e.g. private data on a public page). */
  enabled?: boolean;
}

// JSON round-trip drops undefined fields, which Firestore can't store.
const plain = (value: unknown): DocumentData => JSON.parse(JSON.stringify(value));

/**
 * Mirrors `items` to events/{EVENT_ID}/{name}/{id}.
 * Remote snapshots replace local state through `applyRemote`; local changes are diffed per
 * top-level field and only changed fields are written, so writers touching different fields
 * (admin editing photos vs. a judge scoring) don't clobber each other.
 */
export function useSyncedCollection<T extends { id: string }>(
  name: SyncedCollection,
  items: T[],
  applyRemote: (items: T[]) => void,
  {
    canWrite,
    toDoc = plain,
    fromDoc = (id, data) => ({ ...data, id }) as T,
    keepLocalWhenEmpty = true,
    enabled = true,
  }: Options<T>
) {
  const synced = useRef(new Map<string, DocumentData>()); // id -> last known remote document
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyRef = useRef(applyRemote);
  const fromDocRef = useRef(fromDoc);
  useEffect(() => {
    applyRef.current = applyRemote;
    fromDocRef.current = fromDoc;
  });

  useEffect(() => {
    if (!enabled) return;
    return onSnapshot(
      eventCollection(name),
      { includeMetadataChanges: true },
      (snap) => {
        // An empty cache says nothing about the server; wait for the real answer.
        if (snap.metadata.fromCache && snap.empty) return;
        setError(null);
        setHydrated(true);
        if (snap.docChanges().length === 0 && synced.current.size === snap.size) return;
        synced.current = new Map(snap.docs.map((d) => [d.id, d.data()]));
        if (!snap.empty || !keepLocalWhenEmpty) {
          applyRef.current(snap.docs.map((d) => fromDocRef.current(d.id, d.data())));
        }
      },
      (err) => setError(err.message)
    );
  }, [name, keepLocalWhenEmpty, enabled]);

  useEffect(() => {
    if (!hydrated || !canWrite) return;
    const batch = writeBatch(db);
    let ops = 0;
    const seen = new Set<string>();

    for (const item of items) {
      seen.add(item.id);
      const next = plain(toDoc(item));
      const prev = synced.current.get(item.id);
      if (!prev) {
        batch.set(eventDoc(name, item.id), next);
      } else {
        const changed: DocumentData = {};
        for (const key of new Set([...Object.keys(prev), ...Object.keys(next)])) {
          if (stableStringify(prev[key]) !== stableStringify(next[key])) {
            changed[key] = key in next ? next[key] : deleteField();
          }
        }
        if (Object.keys(changed).length === 0) continue;
        batch.update(eventDoc(name, item.id), changed);
      }
      synced.current.set(item.id, next);
      ops++;
    }
    for (const id of [...synced.current.keys()]) {
      if (seen.has(id)) continue;
      batch.delete(eventDoc(name, id));
      synced.current.delete(id);
      ops++;
    }

    if (ops > 0) batch.commit().catch((err: Error) => setError(err.message));
  }, [items, hydrated, canWrite, name, toDoc]);

  return { hydrated, error };
}
