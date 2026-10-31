import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  inMemoryPersistence,
  initializeAuth,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { onSnapshot, setDoc } from 'firebase/firestore';
import { auth, AUTH_EMULATOR_URL, firebaseConfig, USE_EMULATORS } from './firebase';
import { assertProdAuthUntouched, eventCollection, eventDoc } from './firestore';

// Each judge is a Firebase email/password account; the PIN is the password.
// firestore.rules reads the judge id back from the email, so the format must stay in sync.
const JUDGE_EMAIL_DOMAIN = 'giamkhao.hiphopxutra.vn';
const SESSION_KEY = 'hiphop_xu_tra_judge_session';
const LOCK_KEY = 'hiphop_xu_tra_judge_lock';
const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;

export const judgeEmail = (judgeId: string) => `${judgeId}@${JUDGE_EMAIL_DOMAIN}`;

export const judgeIdFromEmail = (email?: string | null) =>
  email?.endsWith(`@${JUDGE_EMAIL_DOMAIN}`) ? email.split('@')[0] : null;

// Separate in-memory auth so creating/updating judge and staff accounts never signs the admin out.
export const accountsAuth = initializeAuth(initializeApp(firebaseConfig, 'judge-accounts'), {
  persistence: inMemoryPersistence,
});
if (USE_EMULATORS) connectAuthEmulator(accountsAuth, AUTH_EMULATOR_URL, { disableWarnings: true });

const generatePin = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');

// ---------- PIN accounts (judges, MCs) ----------
// Both log in the same way: the PIN is the password of an email account on a made-up domain, kept in an
// admin-only secrets collection so the organizers can hand it out again.

export interface PinAccountKind {
  email: (id: string) => string;
  secrets: 'judgeSecrets' | 'mcSecrets';
}

const JUDGES: PinAccountKind = { email: judgeEmail, secrets: 'judgeSecrets' };

async function saveSecret(kind: PinAccountKind, id: string, pin: string) {
  try {
    await setDoc(eventDoc(kind.secrets, id), { pin, updatedAt: Date.now() });
  } catch (err) {
    // The account already uses this PIN; surface it so it isn't lost.
    throw new Error(`Đã đặt PIN ${pin} nhưng không lưu được lên Firestore (${(err as Error).message}). Hãy ghi lại PIN này.`);
  }
}

/** Admin: create the account with a fresh random PIN. */
export async function createPinAccount(kind: PinAccountKind, id: string): Promise<string> {
  assertProdAuthUntouched();
  const pin = generatePin();
  try {
    await createUserWithEmailAndPassword(accountsAuth, kind.email(id), pin);
  } catch (err) {
    if ((err as { code?: string }).code === 'auth/operation-not-allowed') {
      throw new Error('Chưa bật đăng nhập Email/Password trong Firebase Console → Authentication → Sign-in method.');
    }
    if ((err as { code?: string }).code === 'auth/email-already-in-use') {
      throw new Error('Tài khoản đã tồn tại nhưng không có PIN lưu trên Firestore. Xoá user này trong Firebase Console → Authentication rồi tạo lại.');
    }
    throw err;
  } finally {
    await signOut(accountsAuth);
  }
  await saveSecret(kind, id, pin);
  return pin;
}

/** Admin: replace the PIN. Firebase revokes the account's other sessions on password change. */
export async function changePin(kind: PinAccountKind, id: string, currentPin: string): Promise<string> {
  assertProdAuthUntouched();
  const pin = generatePin();
  try {
    const { user } = await signInWithEmailAndPassword(accountsAuth, kind.email(id), currentPin);
    await updatePassword(user, pin);
  } finally {
    await signOut(accountsAuth);
  }
  await saveSecret(kind, id, pin);
  return pin;
}

/** Admin: live map id -> PIN (admin-only collection). */
export const subscribePins = (kind: PinAccountKind, onChange: (pins: Record<string, string>) => void, onError: (err: Error) => void) =>
  onSnapshot(
    eventCollection(kind.secrets),
    (snap) => onChange(Object.fromEntries(snap.docs.map((d) => [d.id, String(d.data().pin ?? '')]))),
    onError
  );

export const createJudgeAccount = (judgeId: string) => createPinAccount(JUDGES, judgeId);
export const changeJudgePin = (judgeId: string, currentPin: string) => changePin(JUDGES, judgeId, currentPin);
export const subscribeJudgePins = (onChange: (pins: Record<string, string>) => void, onError: (err: Error) => void) =>
  subscribePins(JUDGES, onChange, onError);

// ---------- Judge / MC device ----------

/** Wrong-PIN lockout on this device: 5 tries, then 1 minute. Returns ms left, 0 when unlocked. */
export function lockRemainingMs(): number {
  try {
    const { until = 0 } = JSON.parse(localStorage.getItem(LOCK_KEY) || '{}');
    return Math.max(0, until - Date.now());
  } catch {
    return 0;
  }
}

function recordFailure() {
  try {
    const { count = 0 } = JSON.parse(localStorage.getItem(LOCK_KEY) || '{}');
    const next = count + 1;
    localStorage.setItem(
      LOCK_KEY,
      JSON.stringify(next >= MAX_ATTEMPTS ? { count: 0, until: Date.now() + LOCK_MS } : { count: next })
    );
  } catch {
    // storage unavailable: Firebase's own throttling still applies
  }
}

/** Signs in with a PIN on this device, with the wrong-PIN lockout. `who` names the account in the error ("GK này"). */
export async function pinSignIn(kind: PinAccountKind, id: string, pin: string, who: string) {
  try {
    await signInWithEmailAndPassword(auth, kind.email(id), pin);
  } catch (err) {
    const code = (err as { code?: string }).code ?? '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      recordFailure();
      throw new Error(`Sai mã PIN (hoặc ${who} chưa được BTC tạo tài khoản).`);
    }
    if (code === 'auth/too-many-requests') throw new Error('Thử sai quá nhiều lần. Đợi một lúc rồi thử lại.');
    if (code === 'auth/network-request-failed') throw new Error('Không có mạng. Kiểm tra Wi-Fi/4G rồi thử lại.');
    if (code === 'auth/operation-not-allowed') {
      throw new Error('BTC chưa bật đăng nhập Email/Password trong Firebase (Authentication → Sign-in method).');
    }
    throw err;
  }
  localStorage.removeItem(LOCK_KEY);
}

export async function judgeSignIn(judgeId: string, pin: string) {
  await pinSignIn(JUDGES, judgeId, pin, 'GK này');
  // Claim the session: any other device logged in as this judge signs itself out.
  const sessionId = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, sessionId);
  await setDoc(eventDoc('judgeSessions', judgeId), { sessionId, at: Date.now() });
}

export const currentSessionId = () => localStorage.getItem(SESSION_KEY);

// The judge's welcome screen shows once per sign-in on a device; signing out shows it again next time.
const WELCOMED_KEY = 'hiphop_xu_tra_welcomed';
export const wasWelcomed = (judgeId: string | null) => {
  try {
    return Boolean(judgeId) && localStorage.getItem(WELCOMED_KEY) === judgeId;
  } catch {
    return false;
  }
};
export const markWelcomed = (judgeId: string | null) => {
  try {
    if (judgeId) localStorage.setItem(WELCOMED_KEY, judgeId);
  } catch {
    // private mode: the welcome screen just shows again
  }
};
export const forgetWelcomed = () => {
  try {
    localStorage.removeItem(WELCOMED_KEY);
  } catch {
    // nothing stored
  }
};
