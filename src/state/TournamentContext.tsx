import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import {
  CategoryType,
  ActiveViewType,
  Dancer,
  Judge,
  Team2v2,
  BattleMatch,
  GoogleSheetConfig,
  StorageConfig,
} from '../domain/types';
import { DEFAULT_JUDGES, INITIAL_NEWBIE_DANCERS, INITIAL_PRO_DANCERS, INITIAL_PRO_TEAMS, buildInitialMatches, generateRandomTeams } from '../domain/seed';
import {
  MatchVotes,
  Votes,
  recalculateDancers,
  DEFAULT_PANELS,
  PrelimPanels,
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
  matchVotesToDoc,
  toPublicDancer,
  toPublicVotes,
  toJudgeBallot,
  JudgeBallot,
  sortJudges,
  cutoffTie,
  isCutoffUndecided,
  isPrelimComplete,
  prelimJudgeIdsFor,
} from '../domain/model';
import * as battle from '../domain/battle';
import { IS_PUBLIC_SOURCE } from '../app/routes';
import { getSavedStorageConfig, saveStorageConfig } from '../services/storageService';
import { clearVotes, eventDoc, StaffRole, writeBattleVote, writePrelimScore, writeTieBreakScore } from '../services/firestore';
import { soundFX } from '../services/soundEffects';
import * as cues from '../services/stageCues';
import { useSyncedCollection } from './useSyncedCollection';
import { useNavigation } from './useNavigation';
import { useAuthSession } from './useAuthSession';
import { useSoundSettings, AudioEffect } from './useSoundSettings';
import { useGoogleSheets } from './useGoogleSheets';
import { legacy } from './legacyStorage';

export type DancerMediaUpdate = Partial<Pick<Dancer, 'avatarUrl' | 'halfBodyUrl' | 'avatarCrop' | 'gender'>>;
type Side = 'red' | 'blue';
/** incomplete: scores still missing · tie-opened: tie-break just opened · tie-pending: tie-break still being scored (or tied again) */
export type PublishPrelimResult = 'incomplete' | 'locked' | 'tie-opened' | 'tie-pending';

interface TournamentContextType {
  // Judges
  judges: Judge[];
  /** The 8 prelim judges: panel A, then panel B. */
  prelimJudges: Judge[];
  /** Prelim panels: who scores the odd / even SBDs (meta/current). */
  prelimPanels: PrelimPanels;
  setPrelimPanels: (panels: PrelimPanels) => void;
  selectedJudgeId: string;
  setSelectedJudgeId: (id: string) => void;
  activeJudge: Judge;
  updateJudgePhotos: (
    judgeId: string,
    photos: { avatar?: string; fullPhotoUrl?: string; name?: string; judgeName?: string }
  ) => void;
  isJudgeConfigModalOpen: boolean;
  setIsJudgeConfigModalOpen: (open: boolean) => void;

  // Sound
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  soundVolume: number;
  setSoundVolume: (vol: number) => void;
  voiceAnnounceEnabled: boolean;
  setVoiceAnnounceEnabled: (enabled: boolean) => void;
  playAudioEffect: (effect: AudioEffect) => void;

  // Dancers & Prelims
  activeCategory: CategoryType;
  setActiveCategory: (cat: CategoryType) => void;
  newbieDancers: Dancer[];
  proDancers: Dancer[];
  updatePrelimScore: (category: CategoryType, dancerId: string, judgeId: string, score: number) => Promise<boolean>;
  /** Tie-break score (any of the 8 prelim judges) for a dancer tied across the Top 32 cut-off. */
  updateTieBreakScore: (category: CategoryType, dancerId: string, judgeId: string, score: number) => Promise<boolean>;
  /** Admin: put these tied dancers into a tie-break scored by all 8 prelim judges. */
  openTieBreak: (category: CategoryType, dancerIds: string[]) => void;
  isNewbieTop32Locked: boolean;
  isProTop32Locked: boolean;
  lockTop32: (category: CategoryType) => void;
  publishPrelim: (category: CategoryType) => PublishPrelimResult;
  setJudgesPick: (category: CategoryType, groupIds: string[], pickedIds: string[]) => void;

  // Teams (Pro 2vs2)
  proTeams: Team2v2[];
  shuffleProTeams: () => void;

  // Battles & Bracket
  matches: BattleMatch[];
  activeMatchId: string;
  setActiveMatchId: (id: string) => void;
  activeMatch: BattleMatch | undefined;
  submitJudgeVote: (matchId: string, roundNumber: number, judgeId: string, side: Side) => Promise<boolean>;
  confirmRoundResult: (matchId: string, roundNumber: number) => void;
  revealAllRounds: (matchId: string) => void;
  declareMatchWinner: (matchId: string, side: Side) => void;
  triggerVictoryAnimation: (matchId: string) => void;
  triggerTeamEntrance: (matchId: string) => void;
  resetMatch: (matchId: string) => void;
  advanceToNextRound: (matchId: string) => void;
  addTieBreakRound: (matchId: string) => void;

  // Photos & placeholders
  storageConfig: StorageConfig;
  setStorageConfig: (config: StorageConfig) => void;
  updateDancerMedia: (category: CategoryType, dancerId: string, photos: DancerMediaUpdate) => void;
  updateDancerGender: (category: CategoryType, dancerId: string, gender: 'male' | 'female') => void;
  updateTeamPhoto: (teamId: string, teamPhotoUrl: string) => void;
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

  // Navigation (each view has its own URL, see app/routes.ts)
  activeView: ActiveViewType;
  setActiveView: (view: ActiveViewType) => void;
  /** Current URL path (for views with a parameter, e.g. /ket-qua/tran/{slug}). */
  pathname: string;
  navigate: (path: string) => void;

  // Auth & Firestore sync
  authUser: User | null;
  authReady: boolean;
  isAdmin: boolean;
  /** 'checkin' = check-in desk staff: sees dancers, checks them in, registers walk-ins; nothing else. */
  staffRole: StaffRole | null;
  syncError: string | null;
  /** Judge id when this device is signed in with a judge account, else null. */
  judgeAccountId: string | null;
  judgeNotice: string | null;
  judgeSignOut: () => Promise<void>;

  resetAllData: () => void;
}

const TournamentContext = createContext<TournamentContextType | null>(null);

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigation = useNavigation();
  const sound = useSoundSettings();
  const [actionError, setActionError] = useState<string | null>(null);
  const auth = useAuthSession(navigation.activeView, setActionError);
  const { isAdmin, staffRole, judgeAccountId } = auth;

  // ---------- Local UI state ----------
  const [selectedJudgeId, setSelectedJudgeId] = useState('gk-1');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('pro_2v2');
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [isJudgeConfigModalOpen, setIsJudgeConfigModalOpen] = useState(false);
  const [storageConfig, setStorageConfigState] = useState<StorageConfig>(getSavedStorageConfig);
  const setStorageConfig = (cfg: StorageConfig) => {
    setStorageConfigState(cfg);
    saveStorageConfig(cfg);
  };

  useEffect(() => {
    if (judgeAccountId) setSelectedJudgeId(judgeAccountId);
  }, [judgeAccountId]);

  // ---------- Tournament data (Firestore-backed, see the sync section) ----------
  const [judges, setJudges] = useState<Judge[]>(legacy.judges);
  const [newbieBase, setNewbieDancers] = useState<Dancer[]>(() => legacy.newbieDancers(IS_PUBLIC_SOURCE));
  const [proBase, setProDancers] = useState<Dancer[]>(() => legacy.proDancers(IS_PUBLIC_SOURCE));
  const [isNewbieTop32Locked, setIsNewbieTop32Locked] = useState(() => legacy.locked('newbie'));
  const [isProTop32Locked, setIsProTop32Locked] = useState(() => legacy.locked('pro'));
  const [teamsBase, setProTeams] = useState<Team2v2[]>(() => legacy.teams(IS_PUBLIC_SOURCE));
  const [matchesBase, setMatchesBase] = useState<BattleMatch[]>(() => legacy.matches(IS_PUBLIC_SOURCE));
  const [activeMatchId, setActiveMatchId] = useState(legacy.activeMatchId);
  const [prelimPanels, setPrelimPanels] = useState<PrelimPanels>(DEFAULT_PANELS);

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

  /** Applies a pure battle transition to one match. */
  const updateMatch = (matchId: string, update: (m: BattleMatch) => BattleMatch) =>
    setMatches((prev) => prev.map((m) => (m.id === matchId ? update(m) : m)));

  /** The match as the next updater will see it, for deciding which cues to play. */
  const currentMatch = (matchId: string) => {
    const m = matchesBase.find((x) => x.id === matchId);
    return m && applyVotes(m, votesRef.current[matchId]);
  };

  // ---------- Who reads what ----------
  // Admins read the raw data. Guests, the LED and judges read the published copies; a judge also gets their
  // own ballot (judgeBallots/{judgeId}) laid over it, so they see their own scores/votes but never others' (GK-09).
  const judgeMode = !IS_PUBLIC_SOURCE && !isAdmin && Boolean(judgeAccountId);
  const readsPublic = IS_PUBLIC_SOURCE || judgeMode;
  const [ownBallot, setOwnBallot] = useState<JudgeBallot | null>(null);

  useEffect(() => {
    if (!judgeMode || !judgeAccountId) return setOwnBallot(null);
    return onSnapshot(eventDoc('judgeBallots', judgeAccountId), (snap) =>
      setOwnBallot(snap.exists() ? ({ prelim: {}, votes: {}, ...snap.data(), id: snap.id } as JudgeBallot) : null)
    );
  }, [judgeMode, judgeAccountId]);

  const withOwnScores = useCallback(
    (list: Dancer[]) =>
      !ownBallot
        ? list
        : list.map((d) =>
            d.id in ownBallot.prelim || d.id in (ownBallot.tieBreak ?? {})
              ? {
                  ...d,
                  prelimScores:
                    d.id in ownBallot.prelim ? { ...d.prelimScores, [ownBallot.id]: ownBallot.prelim[d.id] } : d.prelimScores,
                  tieBreakScores:
                    d.id in (ownBallot.tieBreak ?? {})
                      ? { ...d.tieBreakScores, [ownBallot.id]: ownBallot.tieBreak![d.id] }
                      : d.tieBreakScores,
                }
              : d
          ),
    [ownBallot]
  );
  const visibleVotes = useMemo(() => {
    if (!ownBallot) return votes;
    const merged: Record<string, Votes> = { ...votes };
    for (const [matchId, rounds] of Object.entries(ownBallot.votes)) {
      merged[matchId] = { ...merged[matchId] };
      for (const [key, side] of Object.entries(rounds)) {
        merged[matchId][key] = { ...merged[matchId][key], [ownBallot.id]: side };
      }
    }
    return merged;
  }, [votes, ownBallot]);

  /** Judge device: show a just-sent score/vote at once; the published ballot confirms it shortly after. */
  const recordOwnBallot = (update: (b: JudgeBallot) => JudgeBallot) => {
    if (judgeMode && judgeAccountId) {
      setOwnBallot((prev) => update(prev ?? { id: judgeAccountId, prelim: {}, votes: {} }));
    }
  };

  // ---------- Derived views exposed to components ----------
  const newbieDancers = useMemo(
    () => recalculateDancers(withOwnScores(newbieBase), prelimPanels),
    [newbieBase, withOwnScores, prelimPanels]
  );
  const proDancers = useMemo(() => recalculateDancers(withOwnScores(proBase), prelimPanels), [proBase, withOwnScores, prelimPanels]);
  const dancersById = useMemo(
    () => new Map([...newbieDancers, ...proDancers].map((d) => [d.id, d])),
    [newbieDancers, proDancers]
  );
  const proTeams = useMemo(() => teamsBase.map((t) => hydrateTeam(t, dancersById)), [teamsBase, dancersById]);
  const matches = useMemo(() => {
    const teamsById = new Map(proTeams.map((t) => [t.id, t]));
    return matchesBase.map((m) => hydrateMatch(applyVotes(m, visibleVotes[m.id]), dancersById, teamsById));
  }, [matchesBase, visibleVotes, dancersById, proTeams]);
  const activeJudge = useMemo(() => judges.find((j) => j.id === selectedJudgeId) || judges[0], [judges, selectedJudgeId]);
  const activeMatch = useMemo(() => matches.find((m) => m.id === activeMatchId), [matches, activeMatchId]);

  // ---------- Firestore sync (events/{EVENT_ID}/...) ----------
  // Public pages (/ket-qua/*, /led and its admin preview iframe) only read the published copies, never write.
  const canWrite = isAdmin && !IS_PUBLIC_SOURCE;
  const meta = useMemo(
    () => [{ id: 'current', activeMatchId, isNewbieTop32Locked, isProTop32Locked, prelimPanels }],
    [activeMatchId, isNewbieTop32Locked, isProTop32Locked, prelimPanels]
  );
  const privateOnly = { enabled: canWrite }; // raw scores and votes: admins only
  // Check-in staff read the dancer lists (to check in / register), but never write through the sync.
  const dancerRead = { enabled: canWrite || (staffRole === 'checkin' && !IS_PUBLIC_SOURCE) };
  const syncStates = [
    useSyncedCollection('newbieDancers', newbieBase, setNewbieDancers, { canWrite, toDoc: dancerToDoc, ...dancerRead }),
    useSyncedCollection('proDancers', proBase, setProDancers, { canWrite, toDoc: dancerToDoc, ...dancerRead }),
    useSyncedCollection('teams', teamsBase, (list: Team2v2[]) => setProTeams(sortTeams(list)), {
      canWrite,
      toDoc: teamToDoc,
      fromDoc: teamFromDoc,
    }),
    useSyncedCollection('matches', matchesBase, (list: BattleMatch[]) => setMatchesBase(sortMatches(list)), {
      canWrite,
      toDoc: matchToDoc,
      fromDoc: matchFromDoc,
    }),
    useSyncedCollection('judges', judges, (list: Judge[]) => setJudges(sortJudges(list)), { canWrite }),
    useSyncedCollection('meta', meta, applyRemoteMeta, { canWrite }),
    useSyncedCollection('votes', [] as MatchVotes[], applyRemoteVotes, {
      canWrite: false,
      fromDoc: matchVotesFromDoc,
      keepLocalWhenEmpty: false,
      ...privateOnly,
    }),
  ];

  // Publishing (KG-06): an admin client keeps publicDancers / publicVotes in step with the private data,
  // hiding prelim scores until a dancer is fully scored and battle sides until a round is revealed.
  const canPublish = canWrite && syncStates.every((s) => s.hydrated);
  const publicDancers = useMemo(
    () => [
      ...newbieBase.map((d) => ({ ...toPublicDancer(d, isNewbieTop32Locked, prelimPanels), id: d.id }) as Dancer),
      ...proBase.map((d) => ({ ...toPublicDancer(d, isProTop32Locked, prelimPanels), id: d.id }) as Dancer),
    ],
    [newbieBase, proBase, isNewbieTop32Locked, isProTop32Locked, prelimPanels]
  );
  const publicVotes = useMemo(
    () => matchesBase.filter((m) => votes[m.id]).map((m) => toPublicVotes(m, votes[m.id])),
    [matchesBase, votes]
  );
  const judgeBallots = useMemo(
    () => judges.map((j) => toJudgeBallot(j.id, [...newbieBase, ...proBase], votes)),
    [judges, newbieBase, proBase, votes]
  );
  const publicSync = [
    useSyncedCollection('publicDancers', publicDancers, applyRemotePublicDancers, {
      canWrite: canPublish,
      keepLocalWhenEmpty: !readsPublic,
      enabled: readsPublic || canWrite,
    }),
    useSyncedCollection('publicVotes', publicVotes, (list: MatchVotes[]) => readsPublic && applyRemoteVotes(list), {
      canWrite: canPublish,
      toDoc: matchVotesToDoc,
      fromDoc: matchVotesFromDoc,
      keepLocalWhenEmpty: !readsPublic,
      enabled: readsPublic || canWrite,
    }),
    useSyncedCollection('judgeBallots', judgeBallots, () => {}, { canWrite: canPublish, enabled: canWrite }),
  ];
  const syncError = actionError ?? [...syncStates, ...publicSync].find((s) => s.error)?.error ?? null;

  function applyRemotePublicDancers(list: Dancer[]) {
    if (!readsPublic) return; // the publisher keeps its private data
    setNewbieDancers(list.filter((d) => d.category === 'newbie_1v1'));
    setProDancers(list.filter((d) => d.category === 'pro_2v2'));
  }
  function applyRemoteMeta([m]: typeof meta) {
    if (!m) return;
    setActiveMatchId(m.activeMatchId);
    setIsNewbieTop32Locked(Boolean(m.isNewbieTop32Locked));
    setIsProTop32Locked(Boolean(m.isProTop32Locked));
    if (m.prelimPanels?.A && m.prelimPanels?.B) setPrelimPanels(m.prelimPanels);
  }
  function applyRemoteVotes(list: MatchVotes[]) {
    setVotes(Object.fromEntries(list.map((v) => [v.id, v.rounds])));
  }

  const sheets = useGoogleSheets({ newbieDancers, proDancers, proTeams, judges, matches });

  // Same-machine stage cues from other tabs (e.g. the operator tab driving the LED tab's speakers).
  useEffect(() => cues.listenForCues(), []);

  // ---------- Actions ----------
  const updateJudgePhotos = useCallback(
    (judgeId: string, photos: { avatar?: string; fullPhotoUrl?: string; name?: string; judgeName?: string }) => {
      setJudges((prev) =>
        prev.map((j) =>
          j.id !== judgeId
            ? j
            : {
                ...j,
                ...(photos.name ? { name: photos.name } : {}),
                ...(photos.judgeName ? { judgeName: photos.judgeName } : {}),
                ...(photos.avatar !== undefined ? { avatar: photos.avatar } : {}),
                ...(photos.fullPhotoUrl !== undefined ? { fullPhotoUrl: photos.fullPhotoUrl } : {}),
              }
        )
      );
    },
    []
  );

  // Written straight to Firestore (single field); the snapshot updates every screen, including this one.
  const updatePrelimScore = (category: CategoryType, dancerId: string, judgeId: string, score: number) => {
    const validScore = Math.min(100, Math.max(0, Math.round(score)));
    // Resolves once the server has the score (offline: stays pending and is resent automatically).
    return writePrelimScore(category, dancerId, judgeId, validScore).then(
      () => {
        recordOwnBallot((b) => ({ ...b, prelim: { ...b.prelim, [dancerId]: validScore } }));
        return true;
      },
      (err: Error) => {
        setActionError(`Không lưu được điểm: ${err.message}`);
        return false;
      }
    );
  };

  // Regenerated matches reuse ids like `match-pro_2v2-top16-1`, so votes from the previous draw must go.
  const replaceCategoryMatches = (category: CategoryType, newMatches: BattleMatch[]) => {
    setMatches((prev) => [...prev.filter((m) => m.category !== category), ...newMatches]);
    clearVotes(newMatches.map((m) => m.id).filter((id) => votes[id])).catch((err: Error) =>
      setActionError(`Không xoá được phiếu cũ: ${err.message}`)
    );
  };

  // Shuffle Pro Top 32 into 16 teams and seed the Top 16 bracket
  const shuffleProTeams = () => {
    const newTeams = generateRandomTeams(proDancers.slice(0, 32));
    setProTeams(newTeams);
    const newMatches = battle.seedProTop16(newTeams);
    replaceCategoryMatches('pro_2v2', newMatches);
    setActiveMatchId(newMatches[0]?.id || '');
  };

  const updateTieBreakScore = (category: CategoryType, dancerId: string, judgeId: string, score: number) => {
    const validScore = Math.min(100, Math.max(0, Math.round(score)));
    return writeTieBreakScore(category, dancerId, judgeId, validScore).then(
      () => {
        recordOwnBallot((b) => ({ ...b, tieBreak: { ...b.tieBreak, [dancerId]: validScore } }));
        return true;
      },
      (err: Error) => {
        setActionError(`Không lưu được điểm tie-break: ${err.message}`);
        return false;
      }
    );
  };

  const openTieBreak = (category: CategoryType, dancerIds: string[]) => {
    const flag = (list: Dancer[]) => list.map((d) => (dancerIds.includes(d.id) ? { ...d, tieBreak: true } : d));
    if (category === 'newbie_1v1') setNewbieDancers(flag);
    else setProDancers(flag);
  };

  /** Tie-break level again: the judges' pick among the still-tied dancers (`groupIds`), entered by an admin. */
  const setJudgesPick = (category: CategoryType, groupIds: string[], pickedIds: string[]) => {
    const mark = (list: Dancer[]) =>
      list.map((d) => (groupIds.includes(d.id) ? { ...d, judgesPick: pickedIds.includes(d.id) } : d));
    if (category === 'newbie_1v1') setNewbieDancers(mark);
    else setProDancers(mark);
  };

  const lockTop32 = (category: CategoryType) => {
    if (category === 'newbie_1v1') {
      setIsNewbieTop32Locked(true);
      replaceCategoryMatches('newbie_1v1', battle.seedNewbieTop32(newbieDancers.slice(0, 32)));
    } else {
      setIsProTop32Locked(true);
      shuffleProTeams();
    }
    cues.top32Locked();
  };

  /**
   * "Công bố Prelim": only once every checked-in dancer has all 4 scores. A tie across the Top 32 cut-off then goes
   * to the tie-break (the tied dancers of both panels, scored by all 8 judges, who see it from now on); with no
   * undecided tie the Top 32 is locked and published.
   */
  const publishPrelim = (category: CategoryType): PublishPrelimResult => {
    const list = category === 'newbie_1v1' ? newbieDancers : proDancers;
    const pending = list.filter((d) => prelimJudgeIdsFor(d, prelimPanels).length > 0 && !isPrelimComplete(d, prelimPanels));
    if (pending.length) return 'incomplete';
    if (!isCutoffUndecided(list)) {
      lockTop32(category);
      return 'locked';
    }
    const toOpen = cutoffTie(list).filter((d) => !d.tieBreak);
    if (!toOpen.length) return 'tie-pending';
    openTieBreak(category, toOpen.map((d) => d.id));
    return 'tie-opened';
  };

  // Teams and matches store dancer ids and are hydrated from the dancer lists, so photos only change here.
  const updateDancerMedia = (category: CategoryType, dancerId: string, photos: DancerMediaUpdate) => {
    const update = (prev: Dancer[]) =>
      prev.map((d) =>
        d.id !== dancerId
          ? d
          : {
              ...d,
              ...(photos.avatarUrl !== undefined && { avatarUrl: photos.avatarUrl }),
              ...(photos.halfBodyUrl !== undefined && { halfBodyUrl: photos.halfBodyUrl }),
              ...('avatarCrop' in photos && { avatarCrop: photos.avatarCrop }),
              ...(photos.gender !== undefined && { gender: photos.gender }),
            }
      );
    if (category === 'newbie_1v1') setNewbieDancers(update);
    else setProDancers(update);
  };

  const updateDancerGender = (category: CategoryType, dancerId: string, gender: 'male' | 'female') =>
    updateDancerMedia(category, dancerId, { gender });

  // Match sides pick the team photo up through hydrateMatch.
  const updateTeamPhoto = (teamId: string, teamPhotoUrl: string) =>
    setProTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, teamPhotoUrl } : t)));

  const submitJudgeVote = (matchId: string, roundNumber: number, judgeId: string, side: Side) => {
    const roundVotes = { ...votes[matchId]?.[`r${roundNumber}`], [judgeId]: side };
    const saved = writeBattleVote(matchId, roundNumber, judgeId, side).then(
      () => {
        recordOwnBallot((b) => ({
          ...b,
          votes: { ...b.votes, [matchId]: { ...b.votes[matchId], [`r${roundNumber}`]: side } },
        }));
        return true;
      },
      (err: Error) => {
        setActionError(`Không gửi được phiếu: ${err.message}`);
        return false;
      }
    );
    cues.voteCast(
      judges.find((j) => j.id === judgeId)?.code,
      side,
      Object.keys(roundVotes).length === judges.length
    );
    return saved;
  };

  const confirmRoundResult = (matchId: string, roundNumber: number) => {
    const now = Date.now();
    const m = currentMatch(matchId);
    const outcome = m && battle.confirmRound(m, roundNumber, now);
    updateMatch(matchId, (x) => battle.confirmRound(x, roundNumber, now)?.match ?? x);

    if (m && outcome) {
      if (outcome.matchWinner) {
        cues.celebrateMatchWin(matchId, outcome.matchWinner, battle.sideName(m, outcome.matchWinner), 450);
      } else {
        cues.celebrateRoundWin(outcome.roundWinner, battle.sideName(m, outcome.roundWinner), roundNumber);
      }
    }
    cues.revealRounds(matchId, [roundNumber]);
  };

  const revealAllRounds = (matchId: string) => {
    const now = Date.now();
    const m = currentMatch(matchId);
    updateMatch(matchId, (x) => battle.revealAllRounds(x, now).match);

    soundFX.playRevealSuspense();
    const outcome = m && battle.revealAllRounds(m, now);
    if (m && outcome?.tieBreak) cues.announceTieBreak();
    else if (m && outcome?.matchWinner) {
      cues.celebrateMatchWin(matchId, outcome.matchWinner, battle.sideName(m, outcome.matchWinner), 500);
    }
    cues.revealRounds(matchId, [1, 2]);
  };

  const declareMatchWinner = (matchId: string, side: Side) => {
    const now = Date.now();
    const m = currentMatch(matchId);
    updateMatch(matchId, (x) => battle.declareWinner(x, side, now));
    cues.celebrateMatchWin(matchId, side, m ? battle.sideName(m, side) : '');
  };

  /** Replays the winner animation on the LED. */
  const triggerVictoryAnimation = (matchId: string) => {
    const m = currentMatch(matchId);
    if (!m) return;
    const side = battle.leadingSide(m);
    const now = Date.now();
    updateMatch(matchId, (x) => battle.declareWinner(x, side, now));
    cues.celebrateMatchWin(matchId, side, battle.sideName(m, side));
  };

  /** Both sides slide in on the LED. */
  const triggerTeamEntrance = (matchId: string) => {
    const now = Date.now();
    updateMatch(matchId, (m) => ({ ...m, entranceTriggerTimestamp: now }));
    cues.teamEntrance(matchId, now);
  };

  const advanceToNextRound = (matchId: string) => {
    updateMatch(matchId, battle.advanceRound);
    soundFX.playVoteClick();
  };

  const addTieBreakRound = (matchId: string) => {
    updateMatch(matchId, battle.addTieBreakRound);
    soundFX.playVoteClick();
  };

  const resetMatch = (matchId: string) => {
    updateMatch(matchId, battle.resetMatch);
    clearVotes([matchId]).catch((err: Error) => setActionError(`Không xoá được phiếu: ${err.message}`));
  };

  const resetAllData = () => {
    legacy.clear();
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
        judges,
        prelimJudges: [...prelimPanels.A, ...prelimPanels.B]
          .map((id) => judges.find((j) => j.id === id))
          .filter((j): j is Judge => Boolean(j)),
        prelimPanels,
        setPrelimPanels,
        selectedJudgeId,
        setSelectedJudgeId,
        activeJudge,
        updateJudgePhotos,
        isJudgeConfigModalOpen,
        setIsJudgeConfigModalOpen,
        ...sound,
        activeCategory,
        setActiveCategory,
        newbieDancers,
        proDancers,
        updatePrelimScore,
        updateTieBreakScore,
        openTieBreak,
        isNewbieTop32Locked,
        isProTop32Locked,
        lockTop32,
        publishPrelim,
        setJudgesPick,
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
        isStorageModalOpen,
        setIsStorageModalOpen,
        ...sheets,
        ...navigation,
        ...auth,
        syncError,
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
