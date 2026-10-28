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
import { CheckInView } from './features/dancers/CheckInView';
import { JudgeLoginScreen } from './features/judge/JudgeLoginScreen';
import { JudgeAccountsView } from './features/judge/JudgeAccountsView';
import { JudgePortalView } from './features/judge/JudgePortalView';
import { InstallAppButton } from './features/judge/InstallAppButton';
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
import { CheckInDesk } from './features/dancers/CheckInDesk';
import { isAdminView } from './app/routes';
import { ArrowLeft, LayoutDashboard, Tv, CloudOff, LogOut } from 'lucide-react';

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
    judgeSignOut,
    activeJudge,
    isStorageModalOpen,
    setIsStorageModalOpen,
    isJudgeConfigModalOpen,
    setIsJudgeConfigModalOpen,
  } = useTournament();

  // Check-in staff get only the check-in desk, whatever /admin page they open.
  if (isAdminView(activeView) && staffRole === 'checkin') return <CheckInDesk />;
  if (isAdminView(activeView) && !isAdmin) {
    return <AdminLoginGate />;
  }

  // Dedicated Guest / Spectator Prelim View
  if (activeView === 'prelim_guest') {
    return <PrelimGuestView />;
  }
  if (activeView === 'prelim_screen') return <PrelimScreenView />;
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

  // Judge Portal View (Mobile-first judging view): judge accounts, or admins operating on a judge's behalf
  if (activeView === 'judge') {
    if (!authReady) return <div className="min-h-[100dvh] bg-white" />;
    if (!judgeAccountId && !isAdmin) return <JudgeLoginScreen />;
    return (
      <div className="h-[100dvh] bg-zinc-100 flex flex-col overflow-hidden">
        <div className="bg-white text-zinc-900 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 flex items-center justify-between gap-2 text-xs border-b border-zinc-200 shrink-0">
          {judgeAccountId ? (
            <>
              <span className="font-bold text-zinc-600">Đăng nhập: {activeJudge.code}</span>
              <div className="flex items-center gap-3">
                <InstallAppButton />
                <button
                  onClick={judgeSignOut}
                  className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900 font-bold cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveView('prelim')}
                className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900 font-bold cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Trở về Bảng Điều Hành Ban Tổ Chức</span>
              </button>
              <button
                onClick={() => setActiveView('stage_control')}
                className="flex items-center gap-1 text-red-600 hover:text-red-700 font-bold cursor-pointer"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Điều khiển màn LED</span>
              </button>
            </>
          )}
        </div>
        <JudgePortalView />
      </div>
    );
  }

  // Admin Views with Sidebar
  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col">
      <Navbar />
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
          {activeView === 'checkin' && <CheckInView />}
          {activeView === 'judge_accounts' && <JudgeAccountsView />}
          {activeView === 'staff_accounts' && <StaffAccountsView />}
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

export default function App() {
  return (
    <TournamentProvider>
      <MainContent />
      <SyncErrorBanner />
    </TournamentProvider>
  );
}
