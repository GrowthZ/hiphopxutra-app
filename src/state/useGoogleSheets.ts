import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { BattleMatch, Dancer, GoogleSheetConfig, Judge, Team2v2 } from '../domain/types';
import { createTournamentSpreadsheet, syncAllTournamentData } from '../services/googleSheets';
import { googleSignIn, initAuth, logout, setCachedAccessToken } from '../services/firebase';

const CONFIG_KEY = 'hiphop_xu_tra_tournament_v1_sheetConfig';
const DEFAULT_TITLE = 'HIPHOP XỨ TRÀ 2026';

interface SheetData {
  newbieDancers: Dancer[];
  proDancers: Dancer[];
  proTeams: Team2v2[];
  judges: Judge[];
  matches: BattleMatch[];
}

const errorResult = (e: unknown, fallback: string) => ({
  success: false,
  message: e instanceof Error ? e.message : fallback,
});

/** Google sign-in for the Sheets API and the per-device spreadsheet link (kept in localStorage). */
export function useGoogleSheets(data: SheetData) {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [sheetConfig, setSheetConfig] = useState<GoogleSheetConfig>(() => {
    const saved = localStorage.getItem(CONFIG_KEY);
    return saved
      ? JSON.parse(saved)
      : { spreadsheetId: '', spreadsheetUrl: '', spreadsheetTitle: DEFAULT_TITLE, isConnected: false, isSyncing: false };
  });

  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(sheetConfig));
  }, [sheetConfig]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setCachedAccessToken(token);
      },
      () => setGoogleUser(null)
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const setSyncing = (isSyncing: boolean) => setSheetConfig((prev) => ({ ...prev, isSyncing }));

  const handleGoogleLogin = async () => {
    const res = await googleSignIn();
    if (res) {
      setGoogleUser(res.user);
      setCachedAccessToken(res.accessToken);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setGoogleUser(null);
  };

  const createNewGoogleSheet = async (title?: string) => {
    setSyncing(true);
    try {
      const res = await createTournamentSpreadsheet(
        title || DEFAULT_TITLE,
        data.newbieDancers,
        data.proDancers,
        data.proTeams,
        data.judges
      );
      if (res.success && res.spreadsheetId) {
        setSheetConfig({
          spreadsheetId: res.spreadsheetId,
          spreadsheetUrl: res.spreadsheetUrl || '',
          spreadsheetTitle: `${title || DEFAULT_TITLE} - Hệ Thống Chấm Điểm U16`,
          isConnected: true,
          lastSyncedAt: new Date().toLocaleTimeString('vi-VN'),
          isSyncing: false,
        });
      } else {
        setSyncing(false);
      }
      return res;
    } catch (e) {
      setSyncing(false);
      return errorResult(e, 'Lỗi khi tạo Google Sheet');
    }
  };

  const syncWithGoogleSheet = async () => {
    if (!sheetConfig.spreadsheetId) {
      return { success: false, message: 'Chưa có ID Google Sheet. Hãy tạo hoặc nhập ID Google Sheet.' };
    }
    setSyncing(true);
    try {
      const res = await syncAllTournamentData(
        sheetConfig.spreadsheetId,
        data.newbieDancers,
        data.proDancers,
        data.proTeams,
        data.judges,
        data.matches
      );
      setSheetConfig((prev) => ({
        ...prev,
        isSyncing: false,
        isConnected: res.success ? true : prev.isConnected,
        lastSyncedAt: res.success ? new Date().toLocaleTimeString('vi-VN') : prev.lastSyncedAt,
      }));
      return res;
    } catch (e) {
      setSyncing(false);
      return errorResult(e, 'Lỗi khi đồng bộ Google Sheet');
    }
  };

  /** Accepts a bare id or a full spreadsheet URL. */
  const setSheetId = (id: string) => {
    const cleanId = id.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] ?? id.trim();
    setSheetConfig((prev) => ({
      ...prev,
      spreadsheetId: cleanId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
      isConnected: Boolean(cleanId),
    }));
  };

  return {
    googleUser,
    sheetConfig,
    handleGoogleLogin,
    handleGoogleLogout,
    createNewGoogleSheet,
    syncWithGoogleSheet,
    setSheetId,
  };
}
