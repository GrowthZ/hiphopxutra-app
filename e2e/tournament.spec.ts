import { BrowserContext, expect, Page, test } from '@playwright/test';
import { createJudge, event, signInAdmin, waitForDoc } from './emulator';

// The three flows that must work on competition day, in order, sharing one emulator database:
// an admin opens the dashboard (seeds Firestore), a judge scores a prelim, the admin announces a battle round,
// and the LED follows the admin's scene changes.

test.describe.configure({ mode: 'serial' });

const JUDGES = Array.from({ length: 9 }, (_, i) => `gk-${i + 1}`);
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
  await judge.getByRole('button', { name: /Chấm Prelim/ }).click();
  await judge.getByRole('button', { name: '70', exact: true }).click();
  await judge.getByRole('button', { name: /XÁC NHẬN CHẤM: 70 ĐIỂM/ }).click();

  // The score lands in the raw (admin-only) dancer doc, written by the judge's own account.
  await expect
    .poll(async () => (await event.collection('proDancers').where('prelimScores.gk-1', '==', 70).count().get()).data().count)
    .toBe(1);

  // Battle vote for the active match, round 1 (goes through the votes rule).
  const { activeMatchId } = await waitForDoc<{ activeMatchId: string }>('meta/current', (m) => Boolean(m?.activeMatchId));
  await judge.getByRole('button', { name: /Chấm Battle/ }).click();
  await judge.getByText('GÓC ĐỎ').click();
  await judge.getByRole('button', { name: 'Xác nhận chọn đội đỏ' }).click();
  await waitForDoc<{ r1?: Record<string, string> }>(`votes/${activeMatchId}`, (v) => v?.r1?.['gk-1'] === 'red');
  await expect(judge.getByRole('alert')).toBeHidden(); // no sync error banner
  await context.close();
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
