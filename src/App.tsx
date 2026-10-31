import React from 'react';
import { TournamentProvider, useTournament } from './state/TournamentContext';
import { Navbar } from './features/admin/Navbar';
import { AdminSidebar } from './features/admin/AdminSidebar';
import { PrelimView } from './features/prelim/PrelimView';
import { TeamDrawView } from './features/teams/TeamDrawView';
import { BracketView } from './features/battle/BracketView';
import { BattleOperatorView } from './features/battle/BattleOperatorView';
import { LedScreen } from './features/stage/LedScreen';
import { StageControlView } from './features/stage/StageControlView';
import { JudgeLoginScreen } from './features/judge/JudgeLoginScreen';
import { JudgeAccountsView } from './features/judge/JudgeAccountsView';
import { JudgePortalView } from './features/judge/JudgePortalView';
import { McLoginScreen } from './features/mc/McLoginScreen';
import { McView } from './features/mc/McView';
import { PrelimResultsView } from './features/prelim/PrelimResultsView';
import { PrelimGuestView } from './features/guest/PrelimGuestView';
import { PrelimScreenView } from './features/guest/PrelimScreenView';
import { GuestBracketView, GuestMatchView } from './features/guest/GuestBattleView';
import { DancersListView } from './features/dancers/DancersListView';
import { GoogleSheetSyncModal } from './features/settings/GoogleSheetSyncModal';
import { StorageConfigModal } from './features/settings/StorageConfigModal';
import { JudgeConfigModal } from './features/judge/JudgeConfigModal';
import { AdminLoginGate } from './features/admin/AdminLoginGate';
import { StaffAccountsView } from './features/admin/StaffAccountsView';
import { RehearsalView } from './features/admin/RehearsalView';
import { CheckInDesk } from './features/dancers/CheckInDesk';
import { isAdminView } from './app/routes';
import { PublisherOfflineBanner } from './shared/PublisherOfflineBanner';
import { CAN_SWITCH_TO_REHEARSAL, EVENT_ID, PROD_EVENT_ID, REHEARSAL_EVENT_ID, watchEventTree } from './services/firestore';
import { ArrowLeft, Tv, CloudOff } from 'lucide-react';

const SyncErrorBanner: React.FC = () => {
  const { syncError } = useTournament();
  if (!syncError) return null;
  return (
    <div
      role="alert"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 max-w-[calc(100%-2rem)] rounded bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-lg"
    >
      <CloudOff className="w-4 h-4 shrink-0" />
      <span>Lỗi đồng bộ dữ liệu: {syncError}</span>
    </div>
  );
};

const MainContent: React.FC = () => {
  const {
    activeView,
    setActiveView,
    isAdmin,
    staffRole,
    authReady,
    judgeAccountId,
    mcAccountId,
    isStorageModalOpen,
    setIsStorageModalOpen,
    isJudgeConfigModalOpen,
    setIsJudgeConfigModalOpen,
  } = useTournament();

  // Check-in staff get only the check-in desk, whatever /admin page they open: move them to its URL (and app).
  const misplacedCheckIn = isAdminView(activeView) && staffRole === 'checkin' && activeView !== 'checkin';
  React.useEffect(() => {
    if (misplacedCheckIn) setActiveView('checkin');
  }, [misplacedCheckIn, setActiveView]);
  if (misplacedCheckIn) return null;

  // Admins get the same desk (hamburger menu, no sidebar) on the check-in page.
  if (activeView === 'checkin' && (staffRole === 'checkin' || isAdmin)) return <CheckInDesk />;
  if (isAdminView(activeView) && !isAdmin) {
    return <AdminLoginGate />;
  }

  // Dedicated Guest / Spectator Prelim View
  if (activeView === 'prelim_guest') {
    return <PrelimGuestView />;
  }
  if (activeView === 'prelim_screen') return <PrelimScreenView />;
  if (activeView === 'prelim_screen_led') return <PrelimScreenView theme="led" />;
  if (activeView === 'bracket_guest') return <GuestBracketView />;
  if (activeView === 'match_guest') return <GuestMatchView />;

  // Prelim Results Public / Stage Leaderboard View
  if (activeView === 'prelim_results') {
    return (
      <div className="relative min-h-screen bg-zinc-950 flex flex-col">
        {/* Quick return bar on top */}
        <div className="bg-zinc-950 border-b border-zinc-800 text-white px-4 py-2 flex items-center justify-between text-xs sticky top-0 z-50">
          <button
            onClick={() => setActiveView('prelim')}
            className="flex items-center gap-1.5 text-zinc-300 hover:text-white font-bold cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Trở về Bàn Chấm Prelim (Ban Tổ Chức)</span>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView('stage_control')}
              className="flex items-center gap-1 text-red-400 hover:text-red-300 font-bold cursor-pointer"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Xem Màn LED Sân Khấu</span>
            </button>
          </div>
        </div>
        <PrelimResultsView />
      </div>
    );
  }

  // LED screen: kiosk, controlled from /admin/led
  if (activeView === 'stage') {
    return <LedScreen />;
  }

  // MC screen: MC accounts (PIN, like the judges), or admins looking over their shoulder
  if (activeView === 'mc') {
    if (!authReady) return <div className="min-h-[100dvh] bg-white" />;
    return mcAccountId || isAdmin ? <McView /> : <McLoginScreen />;
  }

  // Judge Portal View (Mobile-first judging view): judge accounts, or admins operating on a judge's behalf
  if (activeView === 'judge') {
    if (!authReady) return <div className="min-h-[100dvh] bg-white" />;
    if (!judgeAccountId && !isAdmin) return <JudgeLoginScreen />;
    // Sign-out, install and the way back to the dashboard live in the portal's hamburger menu.
    return (
      <div className="h-[100dvh] bg-zinc-100 flex flex-col overflow-hidden">
        <JudgePortalView />
      </div>
    );
  }

  // Admin Views with Sidebar
  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col">
      <Navbar />
      {CAN_SWITCH_TO_REHEARSAL && EVENT_ID === REHEARSAL_EVENT_ID && (
        <button
          onClick={() => setActiveView('rehearsal')}
          className="flex items-center justify-center gap-2 bg-fuchsia-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white hover:bg-fuchsia-700 cursor-pointer"
        >
          Đang tổng duyệt: mọi máy dùng dữ liệu mẫu, không phải giải thật · Bấm để tắt
        </button>
      )}
      <PublisherOfflineBanner />
      <div className="flex-1 flex max-w-full">
        {/* Left Sidebar */}
        <AdminSidebar />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          {activeView === 'prelim' && <PrelimView />}
          {activeView === 'teams' && <TeamDrawView />}
          {activeView === 'bracket' && <BracketView />}
          {activeView === 'battle' && <BattleOperatorView />}
          {activeView === 'dancers' && <DancersListView />}
          {activeView === 'sheets' && <GoogleSheetSyncModal />}
          {activeView === 'storage' && <DancersListView />}
          {activeView === 'stage_control' && <StageControlView />}
          {activeView === 'judge_accounts' && <JudgeAccountsView />}
          {activeView === 'staff_accounts' && <StaffAccountsView />}
          {activeView === 'rehearsal' && <RehearsalView />}
        </main>
      </div>

      {/* Global Storage Config Modal (R2 / Google Drive) */}
      <StorageConfigModal
        isOpen={isStorageModalOpen || activeView === 'storage'}
        onClose={() => {
          setIsStorageModalOpen(false);
          if (activeView === 'storage') setActiveView('dancers');
        }}
      />

      {/* Global Judge 2-Photos Config Modal */}
      <JudgeConfigModal
        isOpen={isJudgeConfigModalOpen}
        onClose={() => setIsJudgeConfigModalOpen(false)}
      />
    </div>
  );
};

/** Always on screen while the app runs on the rehearsal data, so nobody takes it for the real event. */
const DevDataBadge: React.FC = () =>
  EVENT_ID === PROD_EVENT_ID ? null : (
    <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 z-[100] rounded-b bg-fuchsia-600 px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-white shadow">
      {EVENT_ID === REHEARSAL_EVENT_ID ? 'Dữ liệu tổng duyệt' : `Dữ liệu DEV · ${EVENT_ID}`}
    </div>
  );

export default function App() {
  // An admin turning rehearsal mode on or off moves every open screen (judges, MC, LED, desks) to the other data.
  React.useEffect(() => watchEventTree(() => window.location.reload()), []);
  return (
    <TournamentProvider>
      <MainContent />
      <SyncErrorBanner />
      <DevDataBadge />
    </TournamentProvider>
  );
}
