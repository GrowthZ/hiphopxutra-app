#!/usr/bin/env bun
/// <reference types="bun" />
// Firestore data tool for events/{EVENT_ID}. Runs against production by default (service-account key in
// secrets/service-account.json), or the local emulators with --emulator. See docs/firebase-setup.md.
//
//   bun run db stats
//   bun run db admin:list | admin:add <email> [name] | admin:remove <email>
//   bun run db backup [file]
//   bun run db restore <file>          (overwrites docs with the same ids)
//   bun run db reset                   (deletes event data, keeps admins + judgeSecrets)
//   flags: --emulator  --yes (skip the confirmation prompt)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { applicationDefault, cert, initializeApp } from 'firebase-admin/app';
import { DocumentReference, getFirestore, Timestamp, WriteBatch } from 'firebase-admin/firestore';

const ROOT = path.resolve(import.meta.dir, '..');
const EVENT_ID = 'hiphopxutra-2026'; // keep in sync with src/services/firestore.ts
const EMULATOR_PROJECT_ID = 'demo-hiphopxutra'; // keep in sync with src/services/firebase.ts
const KEY_FILE = path.join(ROOT, 'secrets', 'service-account.json');
const KEEP_ON_RESET = ['admins', 'judgeSecrets'];

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const [command, ...params] = args.filter((a) => !a.startsWith('--'));
const emulator = flags.has('--emulator');

function connect() {
  if (emulator) {
    process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
    initializeApp({ projectId: EMULATOR_PROJECT_ID });
    return EMULATOR_PROJECT_ID;
  }
  const { projectId } = JSON.parse(readFileSync(path.join(ROOT, 'src/services/firebase.config.json'), 'utf8'));
  const credential = existsSync(KEY_FILE) ? cert(KEY_FILE) : applicationDefault();
  initializeApp({ credential, projectId });
  return projectId as string;
}

const target = connect();
const db = getFirestore();
const event = db.collection('events').doc(EVENT_ID);
const log = (msg: string) => console.log(msg);

/** Production writes need the project id typed back (or --yes). */
async function confirm(action: string) {
  if (emulator || flags.has('--yes')) return;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`!! ${action} trên PRODUCTION (${target}). Gõ "${target}" để tiếp tục: `);
  rl.close();
  if (answer.trim() !== target) {
    log('Đã huỷ.');
    process.exit(1);
  }
}

// ---------- JSON <-> Firestore values (timestamps survive a backup/restore) ----------
const toJson = (v: unknown): unknown =>
  v instanceof Timestamp
    ? { __timestamp: v.toDate().toISOString() }
    : Array.isArray(v)
      ? v.map(toJson)
      : v && typeof v === 'object'
        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toJson(x)]))
        : v;

const fromJson = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(fromJson)
    : v && typeof v === 'object'
      ? '__timestamp' in v
        ? Timestamp.fromDate(new Date((v as { __timestamp: string }).__timestamp))
        : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fromJson(x)]))
      : v;

/** Commits writes in chunks (Firestore caps a batch at 500). */
async function inBatches<T>(items: T[], write: (batch: WriteBatch, item: T) => void) {
  for (let i = 0; i < items.length; i += 400) {
    const batch = db.batch();
    items.slice(i, i + 400).forEach((item) => write(batch, item));
    await batch.commit();
  }
}

async function collections() {
  return (await event.listCollections()).sort((a, b) => a.id.localeCompare(b.id));
}

// ---------- Commands ----------
const commands: Record<string, () => Promise<void>> = {
  async stats() {
    log(`Project: ${target}  •  events/${EVENT_ID}`);
    for (const col of await collections()) log(`  ${col.id.padEnd(16)} ${(await col.count().get()).data().count}`);
  },

  async 'admin:list'() {
    const snap = await event.collection('admins').get();
    if (snap.empty) log('Chưa có admin nào.');
    snap.docs.forEach((d) => log(`  ${d.id}${d.get('name') ? `  (${d.get('name')})` : ''}`));
  },

  async 'admin:add'() {
    const [email, ...name] = params;
    if (!email?.includes('@')) throw new Error('Cách dùng: admin:add <email> [tên]');
    const id = email.trim().toLowerCase(); // firestore.rules looks admins up by lower-cased email
    await event.collection('admins').doc(id).set({ name: name.join(' ') || id, addedAt: Timestamp.now() }, { merge: true });
    log(`Đã thêm admin ${id}. Đăng nhập /admin bằng tài khoản Google này.`);
  },

  async 'admin:remove'() {
    const id = params[0]?.trim().toLowerCase();
    if (!id) throw new Error('Cách dùng: admin:remove <email>');
    const remaining = (await event.collection('admins').get()).docs.filter((d) => d.id !== id);
    if (remaining.length === 0) throw new Error('Không xoá admin cuối cùng (sẽ không ai vào được /admin).');
    await confirm(`Xoá admin ${id}`);
    await event.collection('admins').doc(id).delete();
    log(`Đã xoá admin ${id}.`);
  },

  async backup() {
    const data: Record<string, Record<string, unknown>> = {};
    for (const col of await collections()) {
      data[col.id] = Object.fromEntries((await col.get()).docs.map((d) => [d.id, toJson(d.data())]));
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const file = path.resolve(params[0] ?? path.join(ROOT, 'backups', `${emulator ? 'emulator' : target}-${stamp}.json`));
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ project: target, eventId: EVENT_ID, exportedAt: new Date().toISOString(), data }, null, 2));
    const total = Object.values(data).reduce((n, docs) => n + Object.keys(docs).length, 0);
    log(`Đã sao lưu ${total} document vào ${path.relative(process.cwd(), file)}`);
  },

  async restore() {
    if (!params[0]) throw new Error('Cách dùng: restore <file.json>');
    const { data } = JSON.parse(readFileSync(params[0], 'utf8')) as { data: Record<string, Record<string, unknown>> };
    const writes = Object.entries(data).flatMap(([col, docs]) =>
      Object.entries(docs).map(([id, value]) => [event.collection(col).doc(id), value] as const)
    );
    await confirm(`Ghi ${writes.length} document từ ${path.basename(params[0])}`);
    await inBatches(writes, (batch, [ref, value]) => batch.set(ref as DocumentReference, fromJson(value) as object));
    log(`Đã khôi phục ${writes.length} document.`);
  },

  async reset() {
    const cols = (await collections()).filter((c) => !KEEP_ON_RESET.includes(c.id));
    const refs = (await Promise.all(cols.map((c) => c.listDocuments()))).flat();
    if (refs.length === 0) return log('Không có dữ liệu để xoá.');
    log(`Sẽ xoá ${refs.length} document trong: ${cols.map((c) => c.id).join(', ')}`);
    log(`Giữ lại: ${KEEP_ON_RESET.join(', ')}. Nên chạy "backup" trước.`);
    await confirm('Xoá dữ liệu giải');
    await inBatches(refs, (batch, ref) => batch.delete(ref));
    log('Đã xoá. Admin mở /admin để nạp lại dữ liệu mẫu.');
  },
};

const run = commands[command ?? ''];
if (!run) {
  const lines = readFileSync(import.meta.path, 'utf8').split(/\r?\n/);
  const header = lines.slice(2, lines.findIndex((l, i) => i > 2 && !l.startsWith('//')));
  log(header.map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(command ? 1 : 0);
}
run().then(
  () => process.exit(0),
  (err: Error) => {
    console.error(`Lỗi: ${err.message}`);
    if (!emulator && /credential|Could not load the default/i.test(err.message)) {
      console.error(`Thiếu khoá service account: đặt file JSON vào secrets/service-account.json (xem docs/firebase-setup.md).`);
    }
    process.exit(1);
  }
);
