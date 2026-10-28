export type CategoryType = 'newbie_1v1' | 'pro_2v2';

export type ActiveViewType =
  | 'prelim'
  | 'prelim_results'
  | 'prelim_guest'
  | 'bracket_guest'
  | 'match_guest'
  | 'teams'
  | 'bracket'
  | 'battle'
  | 'stage'
  | 'judge'
  | 'dancers'
  | 'sheets'
  | 'storage'
  | 'stage_control'
  | 'checkin'
  | 'judge_accounts'
  | 'staff_accounts';

// What the LED screen shows; written by admins at /admin/led, read by /led.
export type StageSceneType = 'idle' | 'battle' | 'prelim_leaderboard';

export interface StageState {
  id: string; // screenId
  scene: StageSceneType;
  category: CategoryType; // category for the prelim leaderboard scene
  theme: 'daylight' | 'night';
  blackout: boolean; // overrides scene with the idle/logo screen
  updatedAt: number;
  updatedBy: string;
}

export type RoundStage = 'top32' | 'top16' | 'top8' | 'top4' | 'final';

export interface Judge {
  id: string; // 'gk-1' to 'gk-9'
  code: string; // 'GK 01' to 'GK 09'
  name: string; // e.g., 'GK 01 • T-Cat'
  judgeName?: string; // e.g., 'T-Cat'
  avatar?: string; // Ảnh avatar cận mặt (1:1)
  fullPhotoUrl?: string; // Ảnh full toàn thân / poster
  isOnline?: boolean;
}

export interface Dancer {
  id: string;
  sbd: string; // Số báo danh, cấp khi check-in: 'N001' (Newbie), 'P001' (Pro)
  checkedInAt?: number; // Thời điểm check-in tại bàn BTC
  name: string; // e.g., 'BBOY T-REX'
  realName?: string;
  gender: 'male' | 'female'; // 'male' (Nam) hoặc 'female' (Nữ)
  crew?: string; // CLB / Đội
  category: CategoryType;
  avatarUrl?: string; // Ảnh avatar cận mặt
  halfBodyUrl?: string; // Ảnh nửa người (pose chiến đấu / cut-out), ảnh gốc duy nhất BTC tải lên
  avatarCrop?: { x: number; y: number; width: number; height: number }; // vùng cắt avatar (% ảnh nửa người)
  prelimScores: Record<string, number>; // judgeId -> score (0-100)
  prelimScoreTotal: number;
  prelimScoreAvg: number;
  prelimRank?: number;
  isQualifiedTop32?: boolean;
}

export interface Team2v2 {
  id: string;
  teamNumber: number; // 1 to 16
  name: string; // e.g. 'ĐỘI 01'
  dancer1: Dancer;
  dancer2: Dancer;
  teamPhotoUrl?: string; // Ảnh team 2 người
}

export interface BattleSide {
  id: string;
  name: string; // 'BBOY A' or 'ĐỘI 01'
  dancers: Dancer[];
  sbdText: string;
  teamPhotoUrl?: string;
}

export interface BattleRound {
  roundNumber: number;
  // judgeId -> side; 'hidden' = voted but not revealed yet (public copy read by guests and the LED)
  votes: Record<string, 'red' | 'blue' | 'hidden' | null>;
  redVotesCount: number;
  blueVotesCount: number;
  winner?: 'red' | 'blue' | null;
  isConfirmed: boolean;
  isRevealed?: boolean; // Admin đã ấn nút công bố hiển thị màu giám khảo chọn
  isTieBreak?: boolean; // Hiệp phụ / Round Tie-break khi hòa
}

export interface BattleMatch {
  id: string;
  category: CategoryType;
  stage: RoundStage;
  stageName: string; // 'Top 32', 'Top 16', 'Tứ kết (Top 8)', 'Bán kết (Top 4)', 'Chung kết'
  matchNumber: number; // 1, 2, ...
  title: string; // 'Top 16 đội • Trận 01'
  sideRed: BattleSide;
  sideBlue: BattleSide;
  totalRoundsRequired: number; // Newbie: 1 (top32/16/8) or 2 (top4/final). Pro 2v2: 2 (top16/8) or 4 (top4/final).
  currentRound: number;
  roundWinsRed: number;
  roundWinsBlue: number;
  rounds: BattleRound[];
  winnerSide?: 'red' | 'blue' | null;
  status: 'upcoming' | 'ongoing' | 'finished';
  victoryTriggerTimestamp?: number; // Timestamp when victory animation was triggered
  entranceTriggerTimestamp?: number; // Timestamp when team entrance animation was triggered
}

export interface PlaceholderConfig {
  maleAvatarUrl?: string;
  femaleAvatarUrl?: string;
  maleHalfBodyUrl?: string;
  femaleHalfBodyUrl?: string;
  team2v2Url?: string;
}

// Photos are stored in Cloudflare R2 (src/services/media.ts); this only holds the per-browser placeholder images.
export interface StorageConfig {
  placeholders: PlaceholderConfig;
}

export interface GoogleSheetConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
  isConnected: boolean;
  lastSyncedAt?: string;
  isSyncing: boolean;
}
