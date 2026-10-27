import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  inMemoryPersistence,
  initializeAuth,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { onSnapshot, setDoc } from 'firebase/firestore';
import firebaseConfig from './firebase.config.json';
import { auth } from './firebase';
import { eventCollection, eventDoc } from './firestore';

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

// Separate in-memory auth so creating/updating judge accounts never signs the admin out.
const accountsAuth = initializeAuth(initializeApp(firebaseConfig, 'judge-accounts'), {
  persistence: inMemoryPersistence,
});

const generatePin = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');

async function saveSecret(judgeId: string, pin: string) {
  try {
    await setDoc(eventDoc('judgeSecrets', judgeId), { pin, updatedAt: Date.now() });
  } catch (err) {
    // The account already uses this PIN; surface it so it isn't lost.
    throw new Error(`Đã đặt PIN ${pin} nhưng không lưu được lên Firestore (${(err as Error).message}). Hãy ghi lại PIN này.`);
  }
}

/** Admin: create the judge's account with a fresh random PIN. */
export async function createJudgeAccount(judgeId: string): Promise<string> {
  const pin = generatePin();
  try {
    await createUserWithEmailAndPassword(accountsAuth, judgeEmail(judgeId), pin);
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
  await saveSecret(judgeId, pin);
  return pin;
}

/** Admin: replace the PIN. Firebase revokes the judge's other sessions on password change. */
export async function changeJudgePin(judgeId: string, currentPin: string): Promise<string> {
  const pin = generatePin();
  try {
    const { user } = await signInWithEmailAndPassword(accountsAuth, judgeEmail(judgeId), currentPin);
    await updatePassword(user, pin);
  } finally {
    await signOut(accountsAuth);
  }
  await saveSecret(judgeId, pin);
  return pin;
}

/** Admin: live map judgeId -> PIN (admin-only collection). */
export const subscribeJudgePins = (onChange: (pins: Record<string, string>) => void, onError: (err: Error) => void) =>
  onSnapshot(
    eventCollection('judgeSecrets'),
    (snap) => onChange(Object.fromEntries(snap.docs.map((d) => [d.id, String(d.data().pin ?? '')]))),
    onError
  );

// ---------- Judge device ----------

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

export async function judgeSignIn(judgeId: string, pin: string) {
  try {
    await signInWithEmailAndPassword(auth, judgeEmail(judgeId), pin);
  } catch (err) {
    const code = (err as { code?: string }).code ?? '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      recordFailure();
      throw new Error('Sai mã PIN (hoặc GK này chưa được BTC tạo tài khoản).');
    }
    if (code === 'auth/too-many-requests') throw new Error('Thử sai quá nhiều lần. Đợi một lúc rồi thử lại.');
    if (code === 'auth/network-request-failed') throw new Error('Không có mạng. Kiểm tra Wi-Fi/4G rồi thử lại.');
    if (code === 'auth/operation-not-allowed') {
      throw new Error('BTC chưa bật đăng nhập Email/Password trong Firebase (Authentication → Sign-in method).');
    }
    throw err;
  }
  localStorage.removeItem(LOCK_KEY);
  // Claim the session: any other device logged in as this judge signs itself out.
  const sessionId = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, sessionId);
  await setDoc(eventDoc('judgeSessions', judgeId), { sessionId, at: Date.now() });
}

export const currentSessionId = () => localStorage.getItem(SESSION_KEY);
