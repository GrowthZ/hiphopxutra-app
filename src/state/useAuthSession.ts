import { useCallback, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import { ActiveViewType } from '../domain/types';
import { IS_LED_PREVIEW } from '../app/routes';
import { auth } from '../services/firebase';
import { eventDoc, getStaffRole, StaffRole } from '../services/firestore';
import { currentSessionId, judgeIdFromEmail } from '../services/judgeAccounts';

/**
 * Who is on this device: organizers (Google or BTC username accounts, whitelisted with a role in Firestore),
 * judges with their GK account, the LED PC with an anonymous session (for its heartbeat).
 */
export function useAuthSession(activeView: ActiveViewType, reportError: (message: string) => void) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);
  const [judgeNotice, setJudgeNotice] = useState<string | null>(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, async (user) => {
        setAuthUser(user);
        let role: StaffRole | null = null;
        if (user?.email) {
          try {
            role = await getStaffRole(user.email);
          } catch (err) {
            reportError(`Không kết nối được Firestore: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        setStaffRole(role);
        setAuthReady(true);
      }),
    [reportError]
  );

  useEffect(() => {
    if (authReady && !authUser && activeView === 'stage' && !IS_LED_PREVIEW) {
      signInAnonymously(auth).catch((err: Error) => reportError(`Không đăng nhập ẩn danh được: ${err.message}`));
    }
  }, [authReady, authUser, activeView, reportError]);

  // Signed in as a judge account: that judge is fixed on this device.
  const judgeAccountId = judgeIdFromEmail(authUser?.email);

  // One device per judge: a newer login elsewhere signs this one out.
  useEffect(() => {
    if (!judgeAccountId) return;
    return onSnapshot(eventDoc('judgeSessions', judgeAccountId), (snap) => {
      const sessionId = snap.data()?.sessionId;
      if (sessionId && sessionId !== currentSessionId()) {
        setJudgeNotice('Mã giám khảo này vừa đăng nhập trên một máy khác, nên máy này đã bị đăng xuất.');
        signOut(auth);
      }
    });
  }, [judgeAccountId]);

  const judgeSignOut = useCallback(() => {
    setJudgeNotice(null);
    return signOut(auth);
  }, []);

  const isAdmin = staffRole === 'admin';
  return { authUser, authReady, isAdmin, staffRole, judgeAccountId, judgeNotice, judgeSignOut };
}
