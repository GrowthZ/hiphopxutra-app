import { BrowserContext, expect, Page, test } from '@playwright/test';
import { createJudge, event, signInAdmin, waitForDoc } from './emulator';

// The three flows that must work on competition day, in order, sharing one emulator database:
// an admin opens the dashboard (seeds Firestore), a judge scores a prelim, the admin announces a battle round,
// and the LED follows the admin's scene changes.

test.describe.configure({ mode: 'serial' });

const JUDGES = Array.from({ length: 9 }, (_, i) => `gk-${i + 1}`);

/** The judge app switches between its two scoring screens from the hamburger menu. */
async function openScoring(judge: Page, screen: 'Prelim' | 'Main Battle') {
  await judge.getByRole('button', { name: 'Mở menu' }).click();
  await judge.getByRole('navigation', { name: 'Menu' }).getByRole('button', { name: new RegExp(`^${screen}`) }).click();
}
let adminContext: BrowserContext;
let admin: Page;

test.beforeAll(async ({ browser }) => {
  adminContext = await browser.newContext();
  admin = await adminContext.newPage();
});

test.afterAll(async () => {
  await adminContext.close();
});

test('admin signs in and the dashboard seeds Firestore', async () => {
  await signInAdmin(admin);
  await expect(admin.getByRole('main')).toBeVisible();

  await waitForDoc('meta/current', (m) => Boolean(m?.activeMatchId));
  await expect.poll(async () => (await event.collection('proDancers').count().get()).data().count).toBeGreaterThan(0);
  // Judges and guests read the published copies, which the admin client writes once everything is loaded.
  await expect.poll(async () => (await event.collection('publicDancers').count().get()).data().count).toBeGreaterThan(0);
});

test('judge logs in with GK code + PIN and scores a prelim', async ({ browser }) => {
  await createJudge('gk-1', '123456');
  const context = await browser.newContext();
  const judge = await context.newPage();

  await judge.goto('/giam-khao');
  await judge.getByRole('button', { name: /GK 01/ }).click();
  for (const digit of '123456') await judge.getByRole('button', { name: digit, exact: true }).click();

  await judge.getByRole('button', { name: /VÀO BÀN CHẤM ĐIỂM NGAY/ }).click();
  await openScoring(judge, 'Prelim');
  for (const key of '70') await judge.getByRole('button', { name: key, exact: true }).click();
  await judge.getByRole('button', { name: /Lưu 70 điểm/ }).click();

  // The score lands in the raw (admin-only) dancer doc, written by the judge's own account.
  await expect
    .poll(async () => (await event.collection('proDancers').where('prelimScores.gk-1', '==', 70).count().get()).data().count)
    .toBe(1);

  // Battle vote for the active match, round 1 (goes through the votes rule).
  const { activeMatchId } = await waitForDoc<{ activeMatchId: string }>('meta/current', (m) => Boolean(m?.activeMatchId));
  await openScoring(judge, 'Main Battle');
  await judge.getByRole('button', { name: /Chọn góc đỏ/ }).click();
  await judge.getByRole('button', { name: /Gửi phiếu: Đỏ/ }).click();
  await waitForDoc<{ r1?: Record<string, string> }>(`votes/${activeMatchId}`, (v) => v?.r1?.['gk-1'] === 'red');
  await expect(judge.getByRole('alert')).toBeHidden(); // no sync error banner
  await context.close();
});

test('prelim panels: a panel B judge scores even SBDs only; panel A cannot touch them', async ({ browser }) => {
  await createJudge('gk-5', '555555');
  const context = await browser.newContext();
  const judge = await context.newPage();
  await judge.goto('/giam-khao');
  await judge.getByRole('button', { name: /GK 05/ }).click();
  for (const digit of '555555') await judge.getByRole('button', { name: digit, exact: true }).click();
  await judge.getByRole('button', { name: /VÀO BÀN CHẤM ĐIỂM NGAY/ }).click();
  await openScoring(judge, 'Prelim');
  await expect(judge.getByText('Bảng B · SBD chẵn')).toBeVisible();
  for (const key of '75') await judge.getByRole('button', { name: key, exact: true }).click();
  await judge.getByRole('button', { name: /Lưu 75 điểm/ }).click();

  await expect
    .poll(async () => {
      const snap = await event.collection('proDancers').where('prelimScores.gk-5', '==', 75).get();
      return snap.docs.map((d) => d.get('sbd') as string);
    })
    .toEqual([expect.stringMatching(/[02468]$/)]);
  await context.close();

  // A panel A judge writing a score for an even (panel B) dancer is refused by firestore.rules.
  await createJudge('gk-2', '222222');
  const { idToken } = await (
    await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'gk-2@giamkhao.hiphopxutra.vn', password: '222222', returnSecureToken: true }),
    })
  ).json();
  const even = (await event.collection('proDancers').get()).docs.find((d) => /[02468]$/.test(d.get('sbd')))!;
  const res = await fetch(
    `http://127.0.0.1:8080/v1/${even.ref.path.replace(/^/, 'projects/demo-hiphopxutra/databases/(default)/documents/')}?updateMask.fieldPaths=${encodeURIComponent('prelimScores.`gk-2`')}`,
    {
      method: 'PATCH',
      signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { prelimScores: { mapValue: { fields: { 'gk-2': { integerValue: '80' } } } } } }),
    }
  );
  expect(res.status).toBe(403);
});

test('tie-break: any of the 8 judges scores a flagged dancer, never an unflagged one', async () => {
  const { idToken } = await (
    await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'gk-5@giamkhao.hiphopxutra.vn', password: '555555', returnSecureToken: true }),
    })
  ).json();
  const odd = (await event.collection('proDancers').get()).docs.filter((d) => /[13579]$/.test(d.get('sbd')));
  const [flagged, plain] = odd;
  await flagged.ref.update({ tieBreak: true });

  const patch = (path: string) =>
    fetch(
      `http://127.0.0.1:8080/v1/projects/demo-hiphopxutra/databases/(default)/documents/${path}?updateMask.fieldPaths=${encodeURIComponent('tieBreakScores.`gk-5`')}`,
      {
        method: 'PATCH',
        signal: AbortSignal.timeout(10_000),
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { tieBreakScores: { mapValue: { fields: { 'gk-5': { integerValue: '66' } } } } } }),
      }
    );
  // gk-5 is panel B, the dancer is panel A: allowed only because the tie-break is open for them.
  expect((await patch(flagged.ref.path)).status).toBe(200);
  expect((await patch(plain.ref.path)).status).toBe(403);
  await flagged.ref.update({ tieBreak: false, tieBreakScores: {} });
});

test('admin announces a battle round and the result is published', async () => {
  const { activeMatchId } = await waitForDoc<{ activeMatchId: string }>('meta/current', (m) => Boolean(m?.activeMatchId));
  // The other 8 judges vote red too, as their phones would.
  await event
    .collection('votes')
    .doc(activeMatchId)
    .set({ r1: Object.fromEntries(JUDGES.map((j) => [j, 'red'])) }, { merge: true });

  await admin.goto('/admin/battle');
  await expect(admin.getByText('9/9').first()).toBeVisible();
  await admin.getByRole('button', { name: /Công Bố & Xác Nhận Round 1/ }).click();

  const match = await waitForDoc<{ rounds: { isConfirmed: boolean; winner?: string }[]; currentRound: number }>(
    `matches/${activeMatchId}`,
    (m) => Boolean(m?.rounds[0].isConfirmed)
  );
  expect(match.rounds[0].winner).toBe('red');
  expect(match.currentRound).toBe(2);
  // Guests see the real sides only after the announcement (before it they are 'hidden').
  await waitForDoc<{ r1?: Record<string, string> }>(`publicVotes/${activeMatchId}`, (v) => v?.r1?.['gk-1'] === 'red');
});

test('LED follows the scene chosen at /admin/led', async ({ browser }) => {
  const context = await browser.newContext();
  const led = await context.newPage();
  await led.goto('/led');

  await admin.goto('/admin/led');
  await admin.getByRole('button', { name: 'Màn chờ (logo)' }).click();
  await expect(led.getByText('Breaking U16')).toBeVisible();

  await admin.getByRole('button', { name: 'Bảng xếp hạng Prelim' }).click();
  await expect(led.getByText('Breaking U16')).toBeHidden();
  await expect(led.getByText(/vòng sơ loại/i).first()).toBeVisible();

  await admin.getByRole('button', { name: 'Blackout' }).click();
  await expect(led.getByText('Breaking U16')).toBeVisible();
  await context.close();
});

test('admin gives a BTC member a check-in account', async () => {
  await admin.goto('/admin/cai-dat/nguoi-dung');
  await admin.getByLabel('Tên đăng nhập', { exact: true }).fill('checkin1');
  await admin.getByLabel('Mật khẩu', { exact: true }).fill('desk-pass-1');
  await admin.getByRole('button', { name: 'Cấp tài khoản' }).click();
  await expect(admin.getByRole('status')).toContainText('checkin1');
  await waitForDoc<{ role: string }>('admins/checkin1@btc.hiphopxutra.vn', (a) => a?.role === 'checkin');
});

test('check-in staff registers a walk-in and hands out an SBD, nothing else', async ({ browser }) => {
  const context = await browser.newContext();
  const desk = await context.newPage();
  await desk.goto('/admin/battle');
  await desk.getByLabel('Tên đăng nhập').fill('checkin1');
  await desk.getByPlaceholder('Mật khẩu').fill('desk-pass-1');
  await desk.getByRole('button', { name: 'Đăng nhập', exact: true }).click();

  // Whatever /admin page they open, check-in staff only get the desk.
  await expect(desk.getByText('Bàn check-in', { exact: true })).toBeVisible();
  await expect(desk.getByRole('button', { name: /Công Bố & Xác Nhận/ })).toBeHidden();

  await desk.getByRole('button', { name: 'Đăng ký tại chỗ' }).click();
  await desk.getByLabel('Tên thi đấu *').fill('Bboy Walk In');
  await desk.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(desk.getByText('Đã check-in BBOY WALK IN')).toBeVisible();

  const snap = await event.collection('newbieDancers').where('name', '==', 'BBOY WALK IN').get();
  expect(snap.size).toBe(1);
  expect(snap.docs[0].get('sbd')).toMatch(/^N\d{3}$/);
  // Check-in also puts the dancer in a prelim panel: A for odd numbers, B for even (default).
  expect(snap.docs[0].get('panel')).toBe(Number(snap.docs[0].get('sbd').slice(1)) % 2 === 1 ? 'A' : 'B');
  await expect(desk.getByText(/Bảng [AB]/).first()).toBeVisible();

  // Both categories, no number yet: the name is tidied (lower-case "s" kept), "bgirl" switches to BGirl, pinned at the top.
  await desk.getByRole('button', { name: 'Đăng ký tại chỗ' }).click();
  await desk.getByLabel('Tên thi đấu *').fill('bgirl  sass - y');
  await expect(desk.getByLabel('BBoy / BGirl')).toHaveValue('female');
  await desk.getByRole('radio', { name: 'Cả 2' }).click();
  await desk.getByLabel('Check-in và cấp SBD luôn').uncheck();
  await desk.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(desk.getByText('Đã đăng ký BGIRL SASS-Y')).toBeVisible();
  await expect(desk.getByRole('dialog')).toBeHidden();
  await expect(desk.getByText('Mới đăng ký tại chỗ')).toBeVisible();
  for (const col of ['newbieDancers', 'proDancers']) {
    const girl = await event.collection(col).where('name', '==', 'BGIRL SASS-Y').get();
    expect(girl.size).toBe(1);
    expect(girl.docs[0].get('gender')).toBe('female');
  }
  await context.close();
});
