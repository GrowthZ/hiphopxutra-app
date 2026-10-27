import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  CategoryType,
  ActiveViewType,
  Dancer,
  Judge,
  Team2v2,
  BattleSide,
  BattleMatch,
  BattleRound,
  TournamentRules,
  GoogleSheetConfig,
  StorageConfig,
  PlaceholderConfig,
} from '../types/tournament';
import {
  DEFAULT_RULES,
  DEFAULT_JUDGES,
  DEFAULT_PRELIM_JUDGES,
  INITIAL_NEWBIE_DANCERS,
  INITIAL_PRO_DANCERS,
  INITIAL_PRO_TEAMS,
  buildInitialMatches,
  generateRandomTeams,
  createInitialMatch,
} from '../data/mockData';
import { soundFX } from '../services/soundEffects';
import { syncAllTournamentData, createTournamentSpreadsheet } from '../services/googleSheets';
import { getSavedStorageConfig, saveStorageConfig } from '../services/storageService';
import { auth, initAuth, googleSignIn, logout as firebaseLogout, setCachedAccessToken } from '../services/firebase';
import { checkIsAdmin, clearVotes, writeBattleVote, writePrelimScore } from '../services/firestore';
import { useSyncedCollection } from '../hooks/useSyncedCollection';
import {
  PRELIM_JUDGE_IDS,
  MatchVotes,
  Votes,
  recalculateDancers,
  dancerToDoc,
  teamToDoc,
  teamFromDoc,
  sortTeams,
  matchToDoc,
  matchFromDoc,
  sortMatches,
  applyVotes,
  hydrateMatch,
  hydrateTeam,
  matchVotesFromDoc,
  sortJudges,
} from './tournamentModel';
import { IS_LED_PREVIEW, VIEW_PATHS, viewFromLocation } from '../routes';
import { User, onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import { eventDoc } from '../services/firestore';
import { currentSessionId, judgeIdFromEmail } from '../services/judgeAccounts';
import confetti from 'canvas-confetti';

interface TournamentContextType {
  // Rules & Setup
  rules: TournamentRules;
  judges: Judge[];
  prelimJudges: Judge[];
  selectedJudgeId: string;
  setSelectedJudgeId: (id: string) => void;
  activeJudge: Judge;
  updateJudgePhotos: (
    judgeId: string,
    photos: { avatar?: string; fullPhotoUrl?: string; name?: string; judgeName?: string }
  ) => void;
  isJudgeConfigModalOpen: boolean;
  setIsJudgeConfigModalOpen: (open: boolean) => void;

  // Sound & Audio Feedback System
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  soundVolume: number;
  setSoundVolume: (vol: number) => void;
  voiceAnnounceEnabled: boolean;
  setVoiceAnnounceEnabled: (enabled: boolean) => void;
  playAudioEffect: (effect: 'vote' | 'allVoted' | 'reveal' | 'roundWin' | 'champion' | 'airhorn' | 'buzzer' | 'tick') => void;

  // Dancers & Prelims
  activeCategory: CategoryType;
  setActiveCategory: (cat: CategoryType) => void;
  newbieDancers: Dancer[];
  proDancers: Dancer[];
  updatePrelimScore: (category: CategoryType, dancerId: string, judgeId: string, score: number) => Promise<boolean>;
  isNewbieTop32Locked: boolean;
  isProTop32Locked: boolean;
  lockTop32: (category: CategoryType) => void;

  // Teams (Pro 2vs2)
  proTeams: Team2v2[];
  shuffleProTeams: () => void;

  // Battles & Bracket
  matches: BattleMatch[];
  activeMatchId: string;
  setActiveMatchId: (id: string) => void;
  activeMatch: BattleMatch | undefined;
  submitJudgeVote: (matchId: string, roundNumber: number, judgeId: string, side: 'red' | 'blue') => Promise<boolean>;
  confirmRoundResult: (matchId: string, roundNumber: number) => void;
  revealAllRounds: (matchId: string) => void;
  declareMatchWinner: (matchId: string, side: 'red' | 'blue') => void;
  triggerVictoryAnimation: (matchId: string) => void;
  triggerTeamEntrance: (matchId: string) => void;
  resetMatch: (matchId: string) => void;
  advanceToNextRound: (matchId: string) => void;
  addTieBreakRound: (matchId: string) => void;

  // Media & Storage (R2 / Google Drive / Placeholders)
  storageConfig: StorageConfig;
  setStorageConfig: (config: StorageConfig) => void;
  updateDancerMedia: (
    category: CategoryType,
    dancerId: string,
    photos: { avatarUrl?: string; halfBodyUrl?: string; gender?: 'male' | 'female' }
  ) => void;
  updateDancerGender: (category: CategoryType, dancerId: string, gender: 'male' | 'female') => void;
  updateTeamPhoto: (teamId: string, teamPhotoUrl: string) => void;
  updatePlaceholder: (key: keyof PlaceholderConfig, url: string) => void;
  resetPlaceholders: () => void;
  isStorageModalOpen: boolean;
  setIsStorageModalOpen: (open: boolean) => void;

  // Google Sheets
  googleUser: User | null;
  sheetConfig: GoogleSheetConfig;
  handleGoogleLogin: () => Promise<void>;
  handleGoogleLogout: () => Promise<void>;
  createNewGoogleSheet: (title?: string) => Promise<{ success: boolean; message: string; url?: string; spreadsheetId?: string }>;
  syncWithGoogleSheet: () => Promise<{ success: boolean; message: string }>;
  setSheetId: (id: string) => void;

  // Navigation views (each view has its own URL, see src/routes.ts)
  activeView: ActiveViewType;
  setActiveView: (view: ActiveViewType) => void;

  // Auth & Firestore sync
  authUser: User | null;
  authReady: boolean;
  isAdmin: boolean;
  syncError: string | null;
  /** Judge id when this device is signed in with a judge account, else null. */
  judgeAccountId: string | null;
  judgeNotice: string | null;
  judgeSignOut: () => Promise<void>;

  // Reset/Seed
  resetAllData: () => void;
}

const TournamentContext = createContext<TournamentContextType | null>(null);

// localStorage is only read once, to migrate pre-Firestore data into Firestore on an admin's first load.
const STORAGE_KEY = 'hiphop_xu_tra_tournament_v1';
const BROADCAST_NAME = 'hiphop_xu_tra_broadcast';

function sanitizeDancersList(rawList: unknown, fallback: Dancer[]): Dancer[] {
  if (!Array.isArray(rawList) || rawList.length === 0) return fallback;
  return (rawList as Dancer[]).map((d, idx) => {
    const fallbackDancer = fallback[idx] || fallback[0];
    const sanitizedScores: Record<string, number> = {};

    PRELIM_JUDGE_IDS.forEach((jId) => {
      const val = d.prelimScores?.[jId];
      if (typeof val === 'number' && !isNaN(val)) {
        sanitizedScores[jId] = Math.min(100, Math.max(50, Math.round(val)));
      } else {
        sanitizedScores[jId] = fallbackDancer?.prelimScores?.[jId] ?? 80;
      }
    });

    // Strictly sum the 4 prelim judges (Max 400)
    const total = PRELIM_JUDGE_IDS.reduce((acc, jId) => acc + (sanitizedScores[jId] || 0), 0);
    const avg = Math.round(total / PRELIM_JUDGE_IDS.length);

    return {
      ...d,
      prelimScores: sanitizedScores,
      prelimScoreTotal: Math.min(400, Math.round(total)),
      prelimScoreAvg: avg,
    };
  });
}

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Local state initialized from localStorage if available
  const [rules] = useState<TournamentRules>(DEFAULT_RULES);
  const [judges, setJudges] = useState<Judge[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_judges_v2`);
      if (saved) {
        const parsed = JSON.parse(saved) as Judge[];
        return DEFAULT_JUDGES.map((dj) => {
          const match = parsed.find((pj) => pj.id === dj.id);
          if (match) {
            return {
              ...dj,
              name: match.name || dj.name,
              judgeName: match.judgeName || dj.judgeName,
              avatar: match.avatar || dj.avatar,
              fullPhotoUrl: match.fullPhotoUrl || dj.fullPhotoUrl,
            };
          }
          return dj;
        });
      }
    } catch {
      // ignore
    }
    return DEFAULT_JUDGES;
  });
  const [selectedJudgeId, setSelectedJudgeId] = useState<string>('gk-1');
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);
  const [soundVolume, setSoundVolumeState] = useState<number>(0.85);
  const [voiceAnnounceEnabled, setVoiceAnnounceEnabledState] = useState<boolean>(true);

  const [activeCategory, setActiveCategory] = useState<CategoryType>('pro_2v2');
  const [activeView, setActiveViewState] = useState<ActiveViewType>(viewFromLocation);

  const setActiveView = useCallback((view: ActiveViewType) => {
    if (window.location.pathname !== VIEW_PATHS[view]) {
      window.history.pushState(null, '', VIEW_PATHS[view]);
    }
    setActiveViewState(view);
  }, []);

  useEffect(() => {
    const onPopState = () => setActiveViewState(viewFromLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Auth: admins sign in with Google (whitelisted in Firestore), judges get an anonymous session.
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, async (user) => {
        setAuthUser(user);
        let admin = false;
        if (user?.email) {
          try {
            admin = await checkIsAdmin(user.email);
          } catch (err) {
            setActionError(`Không kết nối được Firestore: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        setIsAdmin(admin);
        setAuthReady(true);
      }),
    []
  );

  useEffect(() => {
    // The LED PC needs a session to send its heartbeat; judges sign in with their own GK account.
    if (authReady && !authUser && activeView === 'stage' && !IS_LED_PREVIEW) {
      signInAnonymously(auth).catch((err: Error) => setActionError(`Không đăng nhập ẩn danh được: ${err.message}`));
    }
  }, [authReady, authUser, activeView]);

  // Signed in as a judge account: that judge is fixed on this device.
  const judgeAccountId = judgeIdFromEmail(authUser?.email);
  const [judgeNotice, setJudgeNotice] = useState<string | null>(null);

  useEffect(() => {
    if (judgeAccountId) setSelectedJudgeId(judgeAccountId);
  }, [judgeAccountId]);

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
  const [storageConfig, setStorageConfigState] = useState<StorageConfig>(getSavedStorageConfig);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState<boolean>(false);
  const [isJudgeConfigModalOpen, setIsJudgeConfigModalOpen] = useState<boolean>(false);

  const setStorageConfig = (cfg: StorageConfig) => {
    setStorageConfigState(cfg);
    saveStorageConfig(cfg);
  };

  const [newbieBase, setNewbieDancers] = useState<Dancer[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_newbie`);
      if (saved) {
        return sanitizeDancersList(JSON.parse(saved), INITIAL_NEWBIE_DANCERS);
      }
    } catch {
      // ignore
    }
    return INITIAL_NEWBIE_DANCERS;
  });

  const [proBase, setProDancers] = useState<Dancer[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_pro`);
      if (saved) {
        return sanitizeDancersList(JSON.parse(saved), INITIAL_PRO_DANCERS);
      }
    } catch {
      // ignore
    }
    return INITIAL_PRO_DANCERS;
  });

  const [isNewbieTop32Locked, setIsNewbieTop32Locked] = useState<boolean>(() => {
    return localStorage.getItem(`${STORAGE_KEY}_locked_newbie`) === 'true';
  });

  const [isProTop32Locked, setIsProTop32Locked] = useState<boolean>(() => {
    return localStorage.getItem(`${STORAGE_KEY}_locked_pro`) === 'true';
  });

  const [teamsBase, setProTeams] = useState<Team2v2[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_teams`);
    return saved ? JSON.parse(saved) : INITIAL_PRO_TEAMS;
  });

  const [matchesBase, setMatchesBase] = useState<BattleMatch[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_matches`);
    return saved ? JSON.parse(saved) : buildInitialMatches();
  });

  const [activeMatchId, setActiveMatchId] = useState<string>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_activeMatchId`);
    return saved || 'match-pro_2v2-top16-1';
  });

  const [votes, setVotes] = useState<Record<string, Votes>>({});
  const votesRef = useRef(votes);
  useEffect(() => {
    votesRef.current = votes;
  }, [votes]);

  // Updaters see matches with the latest judge votes applied (votes live in their own collection).
  const setMatches = useCallback((next: BattleMatch[] | ((prev: BattleMatch[]) => BattleMatch[])) => {
    setMatchesBase((prev) =>
      typeof next === 'function' ? next(prev.map((m) => applyVotes(m, votesRef.current[m.id]))) : next
    );
  }, []);

  // ---------- Derived views exposed to components ----------
  const newbieDancers = useMemo(() => recalculateDancers(newbieBase), [newbieBase]);
  const proDancers = useMemo(() => recalculateDancers(proBase), [proBase]);
  const dancersById = useMemo(
    () => new Map([...newbieDancers, ...proDancers].map((d) => [d.id, d])),
    [newbieDancers, proDancers]
  );
  const proTeams = useMemo(() => teamsBase.map((t) => hydrateTeam(t, dancersById)), [teamsBase, dancersById]);
  const matches = useMemo(() => {
    const teamsById = new Map(proTeams.map((t) => [t.id, t]));
    return matchesBase.map((m) => hydrateMatch(applyVotes(m, votes[m.id]), dancersById, teamsById));
  }, [matchesBase, votes, dancersById, proTeams]);

  // ---------- Firestore sync (events/{EVENT_ID}/...) ----------
  // The /admin/led preview iframe shares the admin's login but must never write a second copy.
  const canWrite = isAdmin && !IS_LED_PREVIEW;
  const meta = useMemo(
    () => [{ id: 'current', activeMatchId, isNewbieTop32Locked, isProTop32Locked }],
    [activeMatchId, isNewbieTop32Locked, isProTop32Locked]
  );
  const syncStates = [
    useSyncedCollection('newbieDancers', newbieBase, setNewbieDancers, { canWrite, toDoc: dancerToDoc }),
    useSyncedCollection('proDancers', proBase, setProDancers, { canWrite, toDoc: dancerToDoc }),
    useSyncedCollection('teams', teamsBase, applyRemoteTeams, {
      canWrite,
      toDoc: teamToDoc,
      fromDoc: teamFromDoc,
    }),
    useSyncedCollection('matches', matchesBase, applyRemoteMatches, {
      canWrite,
      toDoc: matchToDoc,
      fromDoc: matchFromDoc,
    }),
    useSyncedCollection('judges', judges, applyRemoteJudges, { canWrite }),
    useSyncedCollection('meta', meta, applyRemoteMeta, { canWrite }),
    useSyncedCollection('votes', [] as MatchVotes[], applyRemoteVotes, {
      canWrite: false,
      fromDoc: matchVotesFromDoc,
      keepLocalWhenEmpty: false,
    }),
  ];
  const syncError = actionError ?? syncStates.find((s) => s.error)?.error ?? null;

  function applyRemoteTeams(list: Team2v2[]) {
    setProTeams(sortTeams(list));
  }
  function applyRemoteMatches(list: BattleMatch[]) {
    setMatchesBase(sortMatches(list));
  }
  function applyRemoteJudges(list: Judge[]) {
    setJudges(sortJudges(list));
  }
  function applyRemoteMeta([m]: typeof meta) {
    if (!m) return;
    setActiveMatchId(m.activeMatchId);
    setIsNewbieTop32Locked(Boolean(m.isNewbieTop32Locked));
    setIsProTop32Locked(Boolean(m.isProTop32Locked));
  }
  function applyRemoteVotes(list: MatchVotes[]) {
    setVotes(Object.fromEntries(list.map((v) => [v.id, v.rounds])));
  }

  // Google Auth & Sheets Config
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [sheetConfig, setSheetConfig] = useState<GoogleSheetConfig>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_sheetConfig`);
    return saved
      ? JSON.parse(saved)
      : {
          spreadsheetId: '',
          spreadsheetUrl: '',
          spreadsheetTitle: 'HIPHOP XỨ TRÀ 2026',
          isConnected: false,
          isSyncing: false,
        };
  });

  // Sound sync functions
  const setSoundEnabled = (val: boolean) => {
    soundFX.enabled = val;
    setSoundEnabledState(val);
  };

  const setSoundVolume = (val: number) => {
    soundFX.volume = val;
    setSoundVolumeState(val);
  };

  const setVoiceAnnounceEnabled = (val: boolean) => {
    soundFX.voiceAnnounceEnabled = val;
    setVoiceAnnounceEnabledState(val);
  };

  const playAudioEffect = (effect: 'vote' | 'allVoted' | 'reveal' | 'roundWin' | 'champion' | 'airhorn' | 'buzzer' | 'tick') => {
    switch (effect) {
      case 'vote':
        soundFX.playVoteConfirmed();
        break;
      case 'allVoted':
        soundFX.playAllJudgesVotedAlert();
        break;
      case 'reveal':
        soundFX.playRevealSuspense();
        break;
      case 'roundWin':
        soundFX.playRoundWinner();
        break;
      case 'champion':
        soundFX.playChampionFanfare();
        break;
      case 'airhorn':
        soundFX.playHiphopAirhorn();
        break;
      case 'buzzer':
        soundFX.playBuzzer();
        break;
      case 'tick':
        soundFX.playCountTick();
        break;
    }
  };

  // Broadcast channel for multi-tab sync (e.g. Judge voting on mobile tab -> Stage LED audio updates instantly!)
  const broadcastSync = useCallback((type: string, payload?: unknown) => {
    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel(BROADCAST_NAME);
        bc.postMessage({ type, payload, timestamp: Date.now() });
        bc.close();
      }
    } catch {
      // ignore
    }
  }, []);

  // Sheet config is per-device, so it stays in localStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_sheetConfig`, JSON.stringify(sheetConfig));
  }, [sheetConfig]);

  // Auth state listener on load
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setCachedAccessToken(token);
      },
      () => {
        setGoogleUser(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Listen to BroadcastChannel from other tabs (handles state and audio synchronization)
  useEffect(() => {
    if (!('BroadcastChannel' in window)) return;
    const bc = new BroadcastChannel(BROADCAST_NAME);
    bc.onmessage = (event) => {
      // Data arrives through Firestore; the channel only carries same-machine audio/animation cues.
      const { type, payload } = event.data;

      // Remote Audio Trigger for Stage / Speaker Tab
      if (type === 'REMOTE_AUDIO') {
        const audioData = payload as { effect: string; side?: 'red' | 'blue'; winnerName?: string; roundNumber?: number };
        if (audioData.effect === 'VOTE_SUBMITTED') {
          soundFX.playVoteConfirmed();
        } else if (audioData.effect === 'ALL_VOTED') {
          soundFX.playAllJudgesVotedAlert();
        } else if (audioData.effect === 'ROUND_WIN') {
          soundFX.playRevealSuspense();
          setTimeout(() => {
            soundFX.playRoundWinner(audioData.side);
            if (audioData.winnerName && audioData.roundNumber) {
              soundFX.announceRoundWinner(audioData.roundNumber, audioData.side || 'tie', audioData.winnerName);
            }
          }, 350);
        } else if (audioData.effect === 'MATCH_WIN') {
          soundFX.playChampionFanfare(audioData.side);
          if (audioData.winnerName && audioData.side) {
            setTimeout(() => {
              soundFX.announceMatchWinner(audioData.side as 'red' | 'blue', audioData.winnerName as string);
            }, 1200);
          }
        }
      }

      // Victory Animation Event for Stage Display
      if (type === 'VICTORY_TRIGGER') {
        window.dispatchEvent(new CustomEvent('VICTORY_DISPLAY_TRIGGER', { detail: payload }));
      }
      if (type === 'VICTORY_DISMISS') {
        window.dispatchEvent(new CustomEvent('VICTORY_DISPLAY_DISMISS', { detail: payload }));
      }

      // Team Entrance Animation Event for Stage Display
      if (type === 'TEAM_ENTRANCE_TRIGGER') {
        soundFX.playTeamEntranceSwoosh();
        window.dispatchEvent(new CustomEvent('TEAM_ENTRANCE_DISPLAY_TRIGGER', { detail: payload }));
      }

      // Round Reveal Flip Animation Event for Stage Display
      if (type === 'ROUND_REVEAL_TRIGGER') {
        window.dispatchEvent(new CustomEvent('ROUND_REVEAL_DISPLAY_TRIGGER', { detail: payload }));
      }
    };
    return () => {
      bc.close();
    };
  }, []);

  const activeJudge = useMemo(() => {
    return judges.find((j) => j.id === selectedJudgeId) || judges[0];
  }, [judges, selectedJudgeId]);

  const updateJudgePhotos = useCallback(
    (
      judgeId: string,
      photos: { avatar?: string; fullPhotoUrl?: string; name?: string; judgeName?: string }
    ) => {
      setJudges((prev) =>
        prev.map((j) => {
          if (j.id === judgeId) {
            return {
              ...j,
              ...(photos.name ? { name: photos.name } : {}),
              ...(photos.judgeName ? { judgeName: photos.judgeName } : {}),
              ...(photos.avatar !== undefined ? { avatar: photos.avatar } : {}),
              ...(photos.fullPhotoUrl !== undefined ? { fullPhotoUrl: photos.fullPhotoUrl } : {}),
            };
          }
          return j;
        })
      );
    },
    []
  );

  const activeMatch = useMemo(() => {
    return matches.find((m) => m.id === activeMatchId);
  }, [matches, activeMatchId]);

  // Written straight to Firestore (single field); the snapshot updates every screen, including this one.
  const updatePrelimScore = (
    category: CategoryType,
    dancerId: string,
    judgeId: string,
    score: number
  ) => {
    const validScore = Math.min(100, Math.max(0, Math.round(score)));
    // Resolves once the server has the score (offline: stays pending and is resent automatically).
    return writePrelimScore(category, dancerId, judgeId, validScore).then(
      () => true,
      (err: Error) => {
        setActionError(`Không lưu được điểm: ${err.message}`);
        return false;
      }
    );
  };

  // Regenerated matches reuse ids like `match-pro_2v2-top16-1`, so votes from the previous draw must go.
  const clearOldVotes = (newMatches: BattleMatch[]) => {
    clearVotes(newMatches.map((m) => m.id).filter((id) => votes[id])).catch((err: Error) =>
      setActionError(`Không xoá được phiếu cũ: ${err.message}`)
    );
  };

  // Lock Top 32
  const lockTop32 = (category: CategoryType) => {
    if (category === 'newbie_1v1') {
      setIsNewbieTop32Locked(true);
      const top32 = newbieDancers.slice(0, 32);
      const newMatches: BattleMatch[] = [];
      for (let m = 0; m < 16; m++) {
        const dRed = top32[m];
        const dBlue = top32[31 - m];
        newMatches.push(
          createInitialMatch(
            'newbie_1v1',
            'top32',
            m + 1,
            { id: dRed.id, name: dRed.name, dancers: [dRed], sbdText: `SBD ${dRed.sbd}` },
            { id: dBlue.id, name: dBlue.name, dancers: [dBlue], sbdText: `SBD ${dBlue.sbd}` }
          )
        );
      }
      setMatches((prev) => [...prev.filter((m) => m.category !== 'newbie_1v1'), ...newMatches]);
      clearOldVotes(newMatches);
    } else {
      setIsProTop32Locked(true);
      shuffleProTeams();
    }
    soundFX.playRoundWinner();
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
  };

  // Shuffle Pro Top 32 into 16 teams
  const shuffleProTeams = () => {
    const top32 = proDancers.slice(0, 32);
    const newTeams = generateRandomTeams(top32);
    setProTeams(newTeams);

    const newMatches: BattleMatch[] = [];
    for (let m = 0; m < 8; m++) {
      const tRed = newTeams[m * 2];
      const tBlue = newTeams[m * 2 + 1];
      newMatches.push(
        createInitialMatch(
          'pro_2v2',
          'top16',
          m + 1,
          {
            id: tRed.id,
            name: tRed.name,
            dancers: [tRed.dancer1, tRed.dancer2],
            sbdText: `SBD ${tRed.dancer1.sbd} / ${tRed.dancer2.sbd}`,
          },
          {
            id: tBlue.id,
            name: tBlue.name,
            dancers: [tBlue.dancer1, tBlue.dancer2],
            sbdText: `SBD ${tBlue.dancer1.sbd} / ${tBlue.dancer2.sbd}`,
          }
        )
      );
    }

    setMatches((prev) => [...prev.filter((m) => m.category !== 'pro_2v2'), ...newMatches]);
    clearOldVotes(newMatches);
    setActiveMatchId(newMatches[0]?.id || '');
  };

  // Media / Photo Updates (Avatar & Half-body for Dancers, Team photo for 2vs2, Gender, Placeholders)
  const updateDancerMedia = (
    category: CategoryType,
    dancerId: string,
    photos: { avatarUrl?: string; halfBodyUrl?: string; gender?: 'male' | 'female' }
  ) => {
    const updater = (prev: Dancer[]) =>
      prev.map((d) => {
        if (d.id === dancerId) {
          return {
            ...d,
            ...(photos.avatarUrl !== undefined && { avatarUrl: photos.avatarUrl }),
            ...(photos.halfBodyUrl !== undefined && { halfBodyUrl: photos.halfBodyUrl }),
            ...(photos.gender !== undefined && { gender: photos.gender }),
          };
        }
        return d;
      });

    if (category === 'newbie_1v1') {
      setNewbieDancers(updater);
    } else {
      setProDancers(updater);
    }

    // Sync dancer photos in 16 Pro teams
    setProTeams((prev) =>
      prev.map((team) => {
        let d1 = team.dancer1;
        let d2 = team.dancer2;
        if (d1.id === dancerId) {
          d1 = { ...d1, ...photos };
        }
        if (d2.id === dancerId) {
          d2 = { ...d2, ...photos };
        }
        return { ...team, dancer1: d1, dancer2: d2 };
      })
    );

    // Sync dancer photos in ongoing and upcoming battle matches
    setMatches((prev) =>
      prev.map((m) => {
        const updateSide = (side: BattleSide) => {
          const updatedDancers = side.dancers.map((d) =>
            d.id === dancerId ? { ...d, ...photos } : d
          );
          return { ...side, dancers: updatedDancers };
        };
        return {
          ...m,
          sideRed: updateSide(m.sideRed),
          sideBlue: updateSide(m.sideBlue),
        };
      })
    );

  };

  const updateDancerGender = (category: CategoryType, dancerId: string, gender: 'male' | 'female') => {
    updateDancerMedia(category, dancerId, { gender });
  };

  const updateTeamPhoto = (teamId: string, teamPhotoUrl: string) => {
    setProTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, teamPhotoUrl } : t))
    );

    // Sync team photo to match sides
    setMatches((prev) =>
      prev.map((m) => {
        const updateSide = (side: BattleSide) => {
          if (side.id === teamId) {
            return { ...side, teamPhotoUrl };
          }
          return side;
        };
        return {
          ...m,
          sideRed: updateSide(m.sideRed),
          sideBlue: updateSide(m.sideBlue),
        };
      })
    );

  };

  const updatePlaceholder = (key: keyof PlaceholderConfig, url: string) => {
    const updated: StorageConfig = {
      ...storageConfig,
      placeholders: {
        ...storageConfig.placeholders,
        [key]: url,
      },
    };
    setStorageConfig(updated);
    saveStorageConfig(updated);
  };

  const resetPlaceholders = () => {
    const updated: StorageConfig = {
      ...storageConfig,
      placeholders: {
        maleAvatarUrl: '',
        femaleAvatarUrl: '',
        maleHalfBodyUrl: '',
        femaleHalfBodyUrl: '',
        team2v2Url: '',
      },
    };
    setStorageConfig(updated);
    saveStorageConfig(updated);
  };

  // Judge vote submission with enhanced Audio Feedback
  const submitJudgeVote = (
    matchId: string,
    roundNumber: number,
    judgeId: string,
    side: 'red' | 'blue'
  ) => {
    const roundVotes = { ...votes[matchId]?.[`r${roundNumber}`], [judgeId]: side };
    const isAllVotedNow = Object.keys(roundVotes).length === judges.length;

    const saved = writeBattleVote(matchId, roundNumber, judgeId, side).then(
      () => true,
      (err: Error) => {
        setActionError(`Không gửi được phiếu: ${err.message}`);
        return false;
      }
    );

    // Audio Feedback for Judge
    soundFX.playVoteConfirmed();

    const judgeObj = judges.find((j) => j.id === judgeId);
    if (judgeObj) {
      soundFX.announceJudgeVote(judgeObj.code, side);
    }

    // If this vote completes the 9 votes
    if (isAllVotedNow) {
      setTimeout(() => {
        soundFX.playAllJudgesVotedAlert();
      }, 400);
      broadcastSync('REMOTE_AUDIO', { effect: 'ALL_VOTED' });
    } else {
      broadcastSync('REMOTE_AUDIO', { effect: 'VOTE_SUBMITTED' });
    }

    return saved;
  };

  // Confirm Round Result with dramatic suspense audio & announcement
  const confirmRoundResult = (matchId: string, roundNumber: number) => {
    setMatches((prev) => {
      return prev.map((m) => {
        if (m.id !== matchId) return m;

        const targetRound = m.rounds.find((r) => r.roundNumber === roundNumber);
        if (!targetRound) return m;

        const redVotes = targetRound.redVotesCount;
        const blueVotes = targetRound.blueVotesCount;

        // Vì có 9 giám khảo nên 1 round chỉ có đỏ hoặc xanh thắng (ít nhất 5/9 phiếu)
        const roundWinner: 'red' | 'blue' = redVotes >= blueVotes ? 'red' : 'blue';

        let newWinsRed = m.roundWinsRed;
        let newWinsBlue = m.roundWinsBlue;
        if (roundWinner === 'red') newWinsRed += 1;
        if (roundWinner === 'blue') newWinsBlue += 1;

        const isTieBreakRound = Boolean(targetRound.isTieBreak);

        const updatedRounds = m.rounds.map((r) => {
          if (r.roundNumber === roundNumber) {
            return {
              ...r,
              winner: roundWinner,
              isConfirmed: true,
              isRevealed: true,
            };
          }
          return r;
        });

        let overallWinner: 'red' | 'blue' | null = null;
        let newStatus = m.status;
        let finalRounds = updatedRounds;
        let nextTotalRounds = m.totalRoundsRequired;
        let nextCurrentRound = roundNumber;

        if (isTieBreakRound) {
          // Hiệp phụ Tie-break: 9 GK chấm, đỏ hoặc xanh thắng phân định chung cuộc (2 - 1)
          overallWinner = roundWinner;
          newStatus = 'finished';
        } else if (roundNumber === 1 && m.totalRoundsRequired >= 2) {
          // Xong Round 1: Chuyển sang Round 2
          newStatus = 'ongoing';
          nextCurrentRound = 2;
        } else if (roundNumber >= 2) {
          // Xong 2 round chính thức:
          if (newWinsRed >= 2) {
            overallWinner = 'red';
            newStatus = 'finished';
          } else if (newWinsBlue >= 2) {
            overallWinner = 'blue';
            newStatus = 'finished';
          } else if (newWinsRed === 1 && newWinsBlue === 1) {
            // HÒA ROUND 1 - 1: Tự động thêm 1 round Tie-Break hiệp phụ!
            overallWinner = null;
            newStatus = 'ongoing';
            const tieBreakNum = 3;
            nextTotalRounds = 3;
            nextCurrentRound = 3;
            if (!updatedRounds.some((r) => r.isTieBreak)) {
              finalRounds = [
                ...updatedRounds,
                {
                  roundNumber: tieBreakNum,
                  votes: {},
                  redVotesCount: 0,
                  blueVotesCount: 0,
                  winner: null,
                  isConfirmed: false,
                  isRevealed: false,
                  isTieBreak: true,
                },
              ];
            }
          } else {
            overallWinner = newWinsRed > newWinsBlue ? 'red' : 'blue';
            newStatus = 'finished';
          }
        }

        const roundWinnerName = roundWinner === 'red' ? m.sideRed.name : m.sideBlue.name;
        const matchWinnerName = overallWinner === 'red' ? m.sideRed.name : m.sideBlue.name;

        const victoryTimestamp = overallWinner ? Date.now() : m.victoryTriggerTimestamp;

        if (overallWinner) {
          const now = Date.now();
          setTimeout(() => {
            soundFX.playChampionFanfare(overallWinner);
            soundFX.announceMatchWinner(overallWinner, matchWinnerName);
          }, 450);

          confetti({
            particleCount: 140,
            spread: 95,
            origin: { y: 0.5 },
            colors: overallWinner === 'red' ? ['#ef4444', '#f87171', '#ffffff'] : ['#3b82f6', '#60a5fa', '#ffffff'],
          });

          broadcastSync('REMOTE_AUDIO', {
            effect: 'MATCH_WIN',
            side: overallWinner,
            winnerName: matchWinnerName,
          });
          broadcastSync('VICTORY_TRIGGER', {
            matchId,
            side: overallWinner,
            winnerName: matchWinnerName,
            timestamp: now,
          });
          window.dispatchEvent(
            new CustomEvent('VICTORY_DISPLAY_TRIGGER', {
              detail: { matchId, side: overallWinner, winnerName: matchWinnerName, timestamp: now },
            })
          );
        } else {
          setTimeout(() => {
            soundFX.playRoundWinner(roundWinner);
            soundFX.announceRoundWinner(roundNumber, roundWinner, roundWinnerName);
          }, 450);

          broadcastSync('REMOTE_AUDIO', {
            effect: 'ROUND_WIN',
            side: roundWinner,
            winnerName: roundWinnerName,
            roundNumber,
          });
        }

        return {
          ...m,
          rounds: finalRounds,
          totalRoundsRequired: nextTotalRounds,
          roundWinsRed: newWinsRed,
          roundWinsBlue: newWinsBlue,
          winnerSide: overallWinner,
          status: newStatus,
          currentRound: nextCurrentRound,
          victoryTriggerTimestamp: victoryTimestamp,
        };
      });
    });

    broadcastSync('ROUND_REVEAL_TRIGGER', { matchId, roundNumbers: [roundNumber], timestamp: Date.now() });
    window.dispatchEvent(
      new CustomEvent('ROUND_REVEAL_DISPLAY_TRIGGER', {
        detail: { matchId, roundNumbers: [roundNumber], timestamp: Date.now() },
      })
    );

  };

  // Admin công bố toàn bộ các round đã chấm (ví dụ cả 2 round)
  const revealAllRounds = (matchId: string) => {
    let hasTie = false;
    let winnerDecided: 'red' | 'blue' | null = null;
    let matchWinnerName = '';

    setMatches((prev) => {
      return prev.map((m) => {
        if (m.id !== matchId) return m;

        let totalWinsRed = 0;
        let totalWinsBlue = 0;

        const updatedRounds: BattleRound[] = m.rounds.map((r) => {
          let redCount = 0;
          let blueCount = 0;
          Object.values(r.votes).forEach((v) => {
            if (v === 'red') redCount++;
            if (v === 'blue') blueCount++;
          });

          // Vì có 9 giám khảo nên 1 round chỉ có đỏ hoặc xanh thắng (ít nhất 5/9 phiếu)
          const rWinner: 'red' | 'blue' = redCount >= blueCount ? 'red' : 'blue';

          if (rWinner === 'red') totalWinsRed++;
          if (rWinner === 'blue') totalWinsBlue++;

          return {
            ...r,
            redVotesCount: redCount,
            blueVotesCount: blueCount,
            winner: rWinner,
            isConfirmed: true,
            isRevealed: true,
          };
        });

        let finalRounds = updatedRounds;
        let nextStatus: 'upcoming' | 'ongoing' | 'finished' = 'finished';
        let nextTotalRounds = m.totalRoundsRequired;
        let nextCurrentRound = m.currentRound;

        if (totalWinsRed === totalWinsBlue) {
          // Hòa round 1 - 1 -> Tự động kích hoạt Round Tie-Break hiệp phụ
          hasTie = true;
          nextStatus = 'ongoing';
          const tieBreakNum = 3;
          nextTotalRounds = tieBreakNum;
          nextCurrentRound = tieBreakNum;
          if (!updatedRounds.some((r) => r.isTieBreak)) {
            finalRounds = [
              ...updatedRounds,
              {
                roundNumber: tieBreakNum,
                votes: {},
                redVotesCount: 0,
                blueVotesCount: 0,
                winner: null,
                isConfirmed: false,
                isRevealed: false,
                isTieBreak: true,
              },
            ];
          }
        } else {
          winnerDecided = totalWinsRed > totalWinsBlue ? 'red' : 'blue';
          matchWinnerName = winnerDecided === 'red' ? m.sideRed.name : m.sideBlue.name;
        }

        return {
          ...m,
          rounds: finalRounds,
          roundWinsRed: totalWinsRed,
          roundWinsBlue: totalWinsBlue,
          totalRoundsRequired: nextTotalRounds,
          currentRound: nextCurrentRound,
          winnerSide: winnerDecided,
          status: nextStatus,
          victoryTriggerTimestamp: winnerDecided ? Date.now() : m.victoryTriggerTimestamp,
        };
      });
    });

    soundFX.playRevealSuspense();

    if (hasTie) {
      setTimeout(() => {
        soundFX.playRoundWinner('tie');
      }, 500);
      broadcastSync('REMOTE_AUDIO', { effect: 'TIE_BREAK' });
    } else if (winnerDecided) {
      const finalWinner: 'red' | 'blue' = winnerDecided;
      const now = Date.now();
      setTimeout(() => {
        soundFX.playChampionFanfare(finalWinner);
        soundFX.announceMatchWinner(finalWinner, matchWinnerName);
      }, 500);
      confetti({
        particleCount: 140,
        spread: 100,
        origin: { y: 0.5 },
        colors: finalWinner === 'red' ? ['#ef4444', '#f87171', '#ffffff'] : ['#3b82f6', '#60a5fa', '#ffffff'],
      });
      broadcastSync('REMOTE_AUDIO', {
        effect: 'MATCH_WIN',
        side: finalWinner,
        winnerName: matchWinnerName,
      });
      broadcastSync('VICTORY_TRIGGER', {
        matchId,
        side: finalWinner,
        winnerName: matchWinnerName,
        timestamp: now,
      });
      window.dispatchEvent(
        new CustomEvent('VICTORY_DISPLAY_TRIGGER', {
          detail: { matchId, side: finalWinner, winnerName: matchWinnerName, timestamp: now },
        })
      );
    }

    broadcastSync('ROUND_REVEAL_TRIGGER', { matchId, roundNumbers: [1, 2], timestamp: Date.now() });
    window.dispatchEvent(
      new CustomEvent('ROUND_REVEAL_DISPLAY_TRIGGER', {
        detail: { matchId, roundNumbers: [1, 2], timestamp: Date.now() },
      })
    );

  };

  // Admin trực tiếp chỉ định người chiến thắng từ BattleOperatorView
  const declareMatchWinner = (matchId: string, side: 'red' | 'blue') => {
    let matchWinnerName = '';
    const now = Date.now();

    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        matchWinnerName = side === 'red' ? m.sideRed.name : m.sideBlue.name;
        return {
          ...m,
          winnerSide: side,
          status: 'finished' as const,
          victoryTriggerTimestamp: now,
        };
      })
    );

    soundFX.playChampionFanfare(side);
    setTimeout(() => {
      soundFX.announceMatchWinner(side, matchWinnerName);
    }, 450);

    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.5 },
      colors: side === 'red' ? ['#ef4444', '#f87171', '#ffffff'] : ['#3b82f6', '#60a5fa', '#ffffff'],
    });

    broadcastSync('REMOTE_AUDIO', {
      effect: 'MATCH_WIN',
      side,
      winnerName: matchWinnerName,
    });
    broadcastSync('VICTORY_TRIGGER', {
      matchId,
      side,
      winnerName: matchWinnerName,
      timestamp: now,
    });
    window.dispatchEvent(
      new CustomEvent('VICTORY_DISPLAY_TRIGGER', {
        detail: { matchId, side, winnerName: matchWinnerName, timestamp: now },
      })
    );
  };

  // Kích hoạt / Phát lệnh phát lại hiệu ứng Winner trên Màn LED
  const triggerVictoryAnimation = (matchId: string) => {
    let side: 'red' | 'blue' = 'red';
    let matchWinnerName = '';
    const now = Date.now();

    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        side = m.winnerSide || (m.roundWinsRed >= m.roundWinsBlue ? 'red' : 'blue');
        matchWinnerName = side === 'red' ? m.sideRed.name : m.sideBlue.name;
        return {
          ...m,
          winnerSide: side,
          status: 'finished' as const,
          victoryTriggerTimestamp: now,
        };
      })
    );

    soundFX.playChampionFanfare(side);
    setTimeout(() => {
      soundFX.announceMatchWinner(side, matchWinnerName);
    }, 450);

    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.5 },
      colors: side === 'red' ? ['#ef4444', '#f87171', '#ffffff'] : ['#3b82f6', '#60a5fa', '#ffffff'],
    });

    broadcastSync('REMOTE_AUDIO', {
      effect: 'MATCH_WIN',
      side,
      winnerName: matchWinnerName,
    });
    broadcastSync('VICTORY_TRIGGER', {
      matchId,
      side,
      winnerName: matchWinnerName,
      timestamp: now,
    });
    window.dispatchEvent(
      new CustomEvent('VICTORY_DISPLAY_TRIGGER', {
        detail: { matchId, side, winnerName: matchWinnerName, timestamp: now },
      })
    );
  };

  // Admin kích hoạt hiệu ứng 2 team ra sân trên màn LED (từ 2 bên ngoài lướt vào)
  const triggerTeamEntrance = (matchId: string) => {
    const now = Date.now();
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, entranceTriggerTimestamp: now } : m))
    );
    soundFX.playTeamEntranceSwoosh();
    broadcastSync('TEAM_ENTRANCE_TRIGGER', { matchId, timestamp: now });
    window.dispatchEvent(
      new CustomEvent('TEAM_ENTRANCE_DISPLAY_TRIGGER', { detail: { matchId, timestamp: now } })
    );
  };

  const advanceToNextRound = (matchId: string) => {
    setMatches((prev) => {
      return prev.map((m) => {
        if (m.id !== matchId) return m;
        if (m.currentRound < m.totalRoundsRequired) {
          return { ...m, currentRound: m.currentRound + 1 };
        }
        return m;
      });
    });
    soundFX.playVoteClick();
  };

  const addTieBreakRound = (matchId: string) => {
    setMatches((prev) => {
      return prev.map((m) => {
        if (m.id !== matchId) return m;
        const nextRoundNum = m.rounds.length + 1;
        const newRound: BattleRound = {
          roundNumber: nextRoundNum,
          votes: {},
          redVotesCount: 0,
          blueVotesCount: 0,
          winner: null,
          isConfirmed: false,
          isRevealed: false,
          isTieBreak: true,
        };
        return {
          ...m,
          rounds: [...m.rounds, newRound],
          totalRoundsRequired: Math.max(m.totalRoundsRequired, nextRoundNum),
          currentRound: nextRoundNum,
          status: 'ongoing',
          winnerSide: null,
        };
      });
    });
    soundFX.playVoteClick();
  };

  const resetMatch = (matchId: string) => {
    setMatches((prev) => {
      return prev.map((m) => {
        if (m.id !== matchId) return m;
        // Filter out dynamic tie-break rounds to reset to default regulation
        const regRounds = m.rounds.filter((r) => !r.isTieBreak);
        const resetRounds = regRounds.map((r) => ({
          ...r,
          votes: {},
          redVotesCount: 0,
          blueVotesCount: 0,
          winner: null,
          isConfirmed: false,
          isRevealed: false,
        }));
        return {
          ...m,
          currentRound: 1,
          roundWinsRed: 0,
          roundWinsBlue: 0,
          totalRoundsRequired: resetRounds.length,
          rounds: resetRounds,
          winnerSide: null,
          status: 'upcoming' as const,
        };
      });
    });
    clearVotes([matchId]).catch((err: Error) => setActionError(`Không xoá được phiếu: ${err.message}`));
  };

  // Google Login / Logout
  const handleGoogleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setCachedAccessToken(res.accessToken);
      }
    } catch (e) {
      console.error('Login error:', e);
      throw e;
    }
  };

  const handleGoogleLogout = async () => {
    await firebaseLogout();
    setGoogleUser(null);
  };

  // Google Sheet actions
  const createNewGoogleSheet = async (title?: string) => {
    setSheetConfig((prev) => ({ ...prev, isSyncing: true }));
    try {
      const res = await createTournamentSpreadsheet(
        title || 'HIPHOP XỨ TRÀ 2026',
        newbieDancers,
        proDancers,
        proTeams,
        judges
      );
      if (res.success && res.spreadsheetId) {
        setSheetConfig({
          spreadsheetId: res.spreadsheetId,
          spreadsheetUrl: res.spreadsheetUrl || '',
          spreadsheetTitle: `${title || 'HIPHOP XỨ TRÀ 2026'} - Hệ Thống Chấm Điểm U16`,
          isConnected: true,
          lastSyncedAt: new Date().toLocaleTimeString('vi-VN'),
          isSyncing: false,
        });
      } else {
        setSheetConfig((prev) => ({ ...prev, isSyncing: false }));
      }
      return res;
    } catch (e: unknown) {
      setSheetConfig((prev) => ({ ...prev, isSyncing: false }));
      const msg = e instanceof Error ? e.message : 'Lỗi khi tạo Google Sheet';
      return { success: false, message: msg };
    }
  };

  const syncWithGoogleSheet = async () => {
    if (!sheetConfig.spreadsheetId) {
      return { success: false, message: 'Chưa có ID Google Sheet. Hãy tạo hoặc nhập ID Google Sheet.' };
    }
    setSheetConfig((prev) => ({ ...prev, isSyncing: true }));
    try {
      const res = await syncAllTournamentData(
        sheetConfig.spreadsheetId,
        newbieDancers,
        proDancers,
        proTeams,
        judges,
        matches
      );
      setSheetConfig((prev) => ({
        ...prev,
        isSyncing: false,
        isConnected: res.success ? true : prev.isConnected,
        lastSyncedAt: res.success ? new Date().toLocaleTimeString('vi-VN') : prev.lastSyncedAt,
      }));
      return res;
    } catch (e: unknown) {
      setSheetConfig((prev) => ({ ...prev, isSyncing: false }));
      const msg = e instanceof Error ? e.message : 'Lỗi khi đồng bộ Google Sheet';
      return { success: false, message: msg };
    }
  };

  const setSheetId = (id: string) => {
    const match = id.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const cleanId = match ? match[1] : id.trim();
    setSheetConfig((prev) => ({
      ...prev,
      spreadsheetId: cleanId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
      isConnected: Boolean(cleanId),
    }));
  };

  const resetAllData = () => {
    localStorage.removeItem(`${STORAGE_KEY}_newbie`);
    localStorage.removeItem(`${STORAGE_KEY}_pro`);
    localStorage.removeItem(`${STORAGE_KEY}_locked_newbie`);
    localStorage.removeItem(`${STORAGE_KEY}_locked_pro`);
    localStorage.removeItem(`${STORAGE_KEY}_teams`);
    localStorage.removeItem(`${STORAGE_KEY}_matches`);
    localStorage.removeItem(`${STORAGE_KEY}_activeMatchId`);
    localStorage.removeItem(`${STORAGE_KEY}_judges_v2`);

    setNewbieDancers(INITIAL_NEWBIE_DANCERS);
    setProDancers(INITIAL_PRO_DANCERS);
    setIsNewbieTop32Locked(false);
    setIsProTop32Locked(false);
    setProTeams(INITIAL_PRO_TEAMS);
    setJudges(DEFAULT_JUDGES);
    const m = buildInitialMatches();
    setMatches(m);
    setActiveMatchId(m[0]?.id || '');
    clearVotes(Object.keys(votes)).catch((err: Error) => setActionError(`Không xoá được phiếu: ${err.message}`));
  };

  return (
    <TournamentContext.Provider
      value={{
        rules,
        judges,
        prelimJudges: judges.slice(0, 4),
        selectedJudgeId,
        setSelectedJudgeId,
        activeJudge,
        updateJudgePhotos,
        isJudgeConfigModalOpen,
        setIsJudgeConfigModalOpen,
        soundEnabled,
        setSoundEnabled,
        soundVolume,
        setSoundVolume,
        voiceAnnounceEnabled,
        setVoiceAnnounceEnabled,
        playAudioEffect,
        activeCategory,
        setActiveCategory,
        newbieDancers,
        proDancers,
        updatePrelimScore,
        isNewbieTop32Locked,
        isProTop32Locked,
        lockTop32,
        proTeams,
        shuffleProTeams,
        matches,
        activeMatchId,
        setActiveMatchId,
        activeMatch,
        submitJudgeVote,
        confirmRoundResult,
        revealAllRounds,
        declareMatchWinner,
        triggerVictoryAnimation,
        triggerTeamEntrance,
        resetMatch,
        advanceToNextRound,
        addTieBreakRound,
        storageConfig,
        setStorageConfig,
        updateDancerMedia,
        updateDancerGender,
        updateTeamPhoto,
        updatePlaceholder,
        resetPlaceholders,
        isStorageModalOpen,
        setIsStorageModalOpen,
        googleUser,
        sheetConfig,
        handleGoogleLogin,
        handleGoogleLogout,
        createNewGoogleSheet,
        syncWithGoogleSheet,
        setSheetId,
        activeView,
        setActiveView,
        authUser,
        authReady,
        isAdmin,
        syncError,
        judgeAccountId,
        judgeNotice,
        judgeSignOut,
        resetAllData,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
};

export const useTournament = () => {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within TournamentProvider');
  }
  return context;
};
