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
//   bun run db dancer:list [newbie|pro]
//   bun run db dancer:import <file.tsv|csv>   (header row: Tên thi đấu, Họ và tên, CLB, Hạng mục; upserts by name)
//   bun run db dancer:set <id> field=value ...  (name, realName, crew, gender; empty value removes the field)
//   bun run db dancer:remove <id> ...
//   flags: --emulator  --yes (skip the confirmation prompt)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { applicationDefault, cert, initializeApp } from 'firebase-admin/app';
import { DocumentReference, FieldValue, getFirestore, Timestamp, WriteBatch } from 'firebase-admin/firestore';

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

// ---------- Dancers ----------
const DANCER_COLLECTIONS = { newbie: 'newbieDancers', pro: 'proDancers' } as const;
type Cat = keyof typeof DANCER_COLLECTIONS;
const CATEGORY_TYPE: Record<Cat, string> = { newbie: 'newbie_1v1', pro: 'pro_2v2' };
const EDITABLE = ['name', 'realName', 'crew', 'gender'];

/** 'Bboy  T - YD' -> 'BBOY T-YD' (same form the app shows). */
const normalizeName = (s: string) => s.replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ').trim().toUpperCase();
const genderOf = (name: string) => (/^BGIRL\b/.test(name) ? 'female' : 'male');

/** 'Kid Pro' -> pro, 'Cả 2 hạng mục' -> both, anything else -> newbie. */
const categoriesOf = (s: string): Cat[] => (/cả 2|both|\+/i.test(s) ? ['newbie', 'pro'] : /pro/i.test(s) ? ['pro'] : ['newbie']);

const catOfId = (id: string): Cat => {
  const cat = id.split('-')[0] as Cat;
  if (!(cat in DANCER_COLLECTIONS)) throw new Error(`Id không hợp lệ: ${id} (dạng newbie-001 / pro-001)`);
  return cat;
};

/** Splits a TSV (pasted from Google Sheets) or CSV file into rows of trimmed cells. */
function readTable(file: string) {
  const text = readFileSync(file, 'utf8').replace(/^﻿/, '');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const sep = lines[0]?.includes('\t') ? '\t' : ',';
  return lines.map((l) => l.split(sep).map((c) => c.trim().replace(/^"(.*)"$/, '$1')));
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

  async 'dancer:list'() {
    const cats = params[0] ? [params[0] as Cat] : (Object.keys(DANCER_COLLECTIONS) as Cat[]);
    for (const cat of cats) {
      const snap = await event.collection(DANCER_COLLECTIONS[cat]).orderBy('__name__').get();
      log(`${cat.toUpperCase()} (${snap.size})`);
      snap.docs.forEach((d) =>
        log(`  ${d.id.padEnd(11)} ${(d.get('sbd') || '').padEnd(5)} ${[d.get('name'), d.get('realName'), d.get('crew')].filter(Boolean).join(' · ')}`)
      );
    }
  },

  async 'dancer:import'() {
    if (!params[0]) throw new Error('Cách dùng: dancer:import <file.tsv|csv>');
    const [header, ...rows] = readTable(params[0]);
    const col = (re: RegExp) => header.findIndex((h) => re.test(h));
    const c = { name: col(/thi đấu|bboy|bgirl|nghệ danh/i), realName: col(/họ.*tên/i), crew: col(/clb|đội|crew|địa chỉ/i), cat: col(/hạng mục/i) };
    if (c.name < 0 || c.cat < 0) throw new Error(`Dòng đầu phải có cột "Tên thi đấu" và "Hạng mục". Đang có: ${header.join(' | ')}`);

    // Existing dancers by category + name, so re-importing an edited sheet updates instead of duplicating.
    const existing = new Map<string, DocumentReference>();
    const next: Record<Cat, number> = { newbie: 0, pro: 0 };
    for (const cat of Object.keys(DANCER_COLLECTIONS) as Cat[]) {
      for (const d of (await event.collection(DANCER_COLLECTIONS[cat]).get()).docs) {
        existing.set(`${cat}|${d.get('name')}`, d.ref);
        next[cat] = Math.max(next[cat], Number(d.id.split('-')[1]) || 0);
      }
    }

    const writes: [DocumentReference, Record<string, unknown>, boolean][] = []; // ref, fields, isNew
    for (const row of rows) {
      const name = normalizeName(row[c.name] ?? '');
      if (!name) continue;
      const fields: Record<string, unknown> = { name, gender: genderOf(name) };
      const realName = c.realName >= 0 ? row[c.realName] : '';
      const crew = c.crew >= 0 ? row[c.crew] : '';
      if (realName && realName.toUpperCase() !== name) fields.realName = realName;
      if (crew) fields.crew = crew;
      for (const cat of categoriesOf(row[c.cat] ?? '')) {
        const ref = existing.get(`${cat}|${name}`);
        if (ref) writes.push([ref, fields, false]);
        else {
          const id = `${cat}-${String(++next[cat]).padStart(3, '0')}`;
          const created = event.collection(DANCER_COLLECTIONS[cat]).doc(id);
          existing.set(`${cat}|${name}`, created);
          writes.push([created, { ...fields, sbd: '', category: CATEGORY_TYPE[cat], prelimScores: {} }, true]);
        }
      }
    }
    const added = writes.filter((w) => w[2]).length;
    log(`Thêm mới ${added}, cập nhật ${writes.length - added} thí sinh.`);
    await confirm(`Ghi ${writes.length} thí sinh từ ${path.basename(params[0])}`);
    // merge: keeps SBD, check-in, photos and scores of dancers already in the database
    await inBatches(writes, (batch, [ref, fields]) => batch.set(ref, fields, { merge: true }));
    log('Xong.');
  },

  async 'dancer:set'() {
    const [id, ...pairs] = params;
    if (!id || pairs.length === 0) throw new Error('Cách dùng: dancer:set <id> name="BBOY X" crew="CLB Y" realName=');
    const ref = event.collection(DANCER_COLLECTIONS[catOfId(id)]).doc(id);
    if (!(await ref.get()).exists) throw new Error(`Không có thí sinh ${id}`);
    const update: Record<string, unknown> = {};
    for (const pair of pairs) {
      const [key, ...rest] = pair.split('=');
      if (!EDITABLE.includes(key)) throw new Error(`Chỉ sửa được: ${EDITABLE.join(', ')}`);
      const value = rest.join('=').trim();
      update[key] = !value ? FieldValue.delete() : key === 'name' ? normalizeName(value) : value;
      if (key === 'name' && value) update.gender ??= genderOf(normalizeName(value));
    }
    await confirm(`Sửa ${id}`);
    await ref.update(update);
    log(`Đã sửa ${id}.`);
  },

  async 'dancer:remove'() {
    if (params.length === 0) throw new Error('Cách dùng: dancer:remove <id> [id...]');
    const refs = params.map((id) => event.collection(DANCER_COLLECTIONS[catOfId(id)]).doc(id));
    await confirm(`Xoá thí sinh ${params.join(', ')}`);
    await inBatches(refs, (batch, ref) => batch.delete(ref));
    log(`Đã xoá ${refs.length} thí sinh.`);
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
