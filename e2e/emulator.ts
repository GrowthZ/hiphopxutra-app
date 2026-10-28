import { expect, Page } from '@playwright/test';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Test helpers talking to the emulators with the Admin SDK (bypasses firestore.rules, like a backend would).

export const PROJECT_ID = 'demo-hiphopxutra'; // keep in sync with src/services/firebase.ts
export const EVENT_ID = 'hiphopxutra-2026';
export const ADMIN_EMAIL = 'admin@e2e.test';
const FIRESTORE = '127.0.0.1:8080';
const AUTH = '127.0.0.1:9099';

process.env.FIRESTORE_EMULATOR_HOST ??= FIRESTORE;
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= AUTH;
if (getApps().length === 0) initializeApp({ projectId: PROJECT_ID });

export const event = getFirestore().collection('events').doc(EVENT_ID);
export const adminAuth = getAuth();

/** Empties both emulators. */
export async function clearEmulators() {
  await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: 'DELETE' });
}

/** Judge account as the admin page would create it: gk-N@giamkhao.hiphopxutra.vn, PIN = password. */
export const createJudge = (judgeId: string, pin: string) =>
  adminAuth.createUser({ email: `${judgeId}@giamkhao.hiphopxutra.vn`, password: pin });

/** Signs in through the Auth emulator's fake Google popup. */
export async function signInAdmin(page: Page, path = '/admin/prelim') {
  await page.goto(path);
  const googleButton = page.getByRole('button', { name: 'Đăng nhập bằng Google' });
  // The emulator's popup sometimes closes without handing the result back; start over when it does.
  await expect(async () => {
    const popupPromise = page.waitForEvent('popup');
    await googleButton.click();
    const popup = await popupPromise;
    await popup.waitForLoadState('networkidle');
    // The emulator page wires its buttons after load; click until the account form shows.
    await expect(async () => {
      await popup.getByText('Add new account').click({ timeout: 2_000 });
      await expect(popup.locator('#email-input')).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await popup.locator('#email-input').fill(ADMIN_EMAIL);
    await popup.getByRole('button', { name: /Sign in with Google/i }).click();
    await expect(googleButton).toBeHidden({ timeout: 8_000 });
  }).toPass({ timeout: 45_000 });
}

/** Waits until a Firestore doc satisfies `check` (the app writes asynchronously). */
export async function waitForDoc<T = FirebaseFirestore.DocumentData>(
  path: string,
  check: (data: T | undefined) => boolean,
  timeoutMs = 15_000
): Promise<T> {
  let last: T | undefined;
  await expect
    .poll(
      async () => {
        last = (await event.firestore.doc(`events/${EVENT_ID}/${path}`).get()).data() as T | undefined;
        return check(last);
      },
      { timeout: timeoutMs, message: `events/${EVENT_ID}/${path}` }
    )
    .toBe(true);
  return last as T;
}
