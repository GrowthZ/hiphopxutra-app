import { createUserWithEmailAndPassword, deleteUser, signInWithEmailAndPassword, signOut, updatePassword } from 'firebase/auth';
import { deleteDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { accountsAuth } from './judgeAccounts';
import { eventCollection, eventDoc, StaffRole } from './firestore';

// Organizer (BTC) accounts: email/password on a made-up domain, so staff only type a username.
// firestore.rules accepts this domain without email verification; the role lives in admins/{email}.
// Passwords are kept in staffSecrets (admin-only), like judge PINs, so an admin can hand them out again.
export const STAFF_EMAIL_DOMAIN = 'btc.hiphopxutra.vn';
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;

export const staffEmail = (username: string) => `${username.trim().toLowerCase()}@${STAFF_EMAIL_DOMAIN}`;

/** Login box takes a username or a full email (Google admins, older accounts). */
export const loginEmail = (input: string) => (input.includes('@') ? input.trim().toLowerCase() : staffEmail(input));

export const usernameOf = (email: string) =>
  email.endsWith(`@${STAFF_EMAIL_DOMAIN}`) ? email.slice(0, -STAFF_EMAIL_DOMAIN.length - 1) : null;

export const ROLE_LABELS: Record<StaffRole, string> = { admin: 'Quản trị', checkin: 'Check-in' };

export interface StaffAccount {
  email: string;
  name: string;
  role: StaffRole;
  /** Only for BTC username accounts created here; Google admins sign in with Google. */
  password?: string;
}

const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const generatePassword = () =>
  Array.from(crypto.getRandomValues(new Uint32Array(10)), (n) => ALPHABET[n % ALPHABET.length]).join('');

const authError = (err: unknown) => {
  const code = (err as { code?: string }).code ?? '';
  if (code === 'auth/email-already-in-use') return new Error('Tên đăng nhập này đã có người dùng.');
  if (code === 'auth/weak-password') return new Error('Mật khẩu cần ít nhất 6 ký tự.');
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password')
    return new Error('Mật khẩu đã lưu không còn đúng (có thể đã đổi ở nơi khác).');
  return err instanceof Error ? err : new Error(String(err));
};

export async function createStaffAccount(username: string, password: string, role: StaffRole, name: string) {
  const user = username.trim().toLowerCase();
  if (!USERNAME_PATTERN.test(user)) throw new Error('Tên đăng nhập 3–30 ký tự: chữ thường không dấu, số, dấu . _ -');
  const email = staffEmail(user);
  try {
    await createUserWithEmailAndPassword(accountsAuth, email, password);
  } catch (err) {
    throw authError(err);
  } finally {
    await signOut(accountsAuth);
  }
  await setDoc(eventDoc('staffSecrets', email), { password, updatedAt: Date.now() });
  await setDoc(eventDoc('admins', email), { name: name.trim() || user, role, addedAt: serverTimestamp() });
  return email;
}

export const setStaffRole = (email: string, role: StaffRole) => updateDoc(eventDoc('admins', email), { role });

/** Replaces the password (needs the stored one); the member's other sessions are signed out by Firebase. */
export async function resetStaffPassword(email: string, currentPassword: string) {
  const password = generatePassword();
  try {
    const { user } = await signInWithEmailAndPassword(accountsAuth, email, currentPassword);
    await updatePassword(user, password);
  } catch (err) {
    throw authError(err);
  } finally {
    await signOut(accountsAuth);
  }
  await setDoc(eventDoc('staffSecrets', email), { password, updatedAt: Date.now() });
  return password;
}

/** Revokes access at once (admins entry), then deletes the login itself when its password is known. */
export async function removeStaffAccount(email: string, password?: string) {
  await deleteDoc(eventDoc('admins', email));
  if (password) {
    try {
      const { user } = await signInWithEmailAndPassword(accountsAuth, email, password);
      await deleteUser(user);
    } catch {
      // access is already revoked; a leftover login can't do anything without the admins entry
    } finally {
      await signOut(accountsAuth);
    }
  }
  await deleteDoc(eventDoc('staffSecrets', email));
}

/** Admin: live list of organizer accounts with their stored passwords. */
export function subscribeStaff(onChange: (list: StaffAccount[]) => void, onError: (err: Error) => void) {
  let admins: StaffAccount[] = [];
  let secrets: Record<string, string> = {};
  const emit = () =>
    onChange(
      admins
        .map((a) => ({ ...a, password: secrets[a.email] }))
        .sort((a, b) => a.role.localeCompare(b.role) || a.email.localeCompare(b.email))
    );
  const stopAdmins = onSnapshot(
    eventCollection('admins'),
    (snap) => {
      admins = snap.docs.map((d) => ({
        email: d.id,
        name: String(d.data().name ?? d.id),
        role: d.data().role === 'checkin' ? 'checkin' : 'admin',
      }));
      emit();
    },
    onError
  );
  const stopSecrets = onSnapshot(
    eventCollection('staffSecrets'),
    (snap) => {
      secrets = Object.fromEntries(snap.docs.map((d) => [d.id, String(d.data().password ?? '')]));
      emit();
    },
    onError
  );
  return () => {
    stopAdmins();
    stopSecrets();
  };
}
