import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import {
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  Database,
  LogOut,
  Layers,
} from 'lucide-react';

export const GoogleSheetSyncModal: React.FC = () => {
  const {
    googleUser,
    handleGoogleLogin,
    handleGoogleLogout,
    sheetConfig,
    createNewGoogleSheet,
    syncWithGoogleSheet,
    setSheetId,
  } = useTournament();

  const [inputUrl, setInputUrl] = useState(sheetConfig.spreadsheetId || '');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCreateSheet = async () => {
    setFeedbackMsg(null);
    const res = await createNewGoogleSheet('HIPHOP XỨ TRÀ 2026');
    if (res.success) {
      setFeedbackMsg({ type: 'success', text: res.message });
      if (res.spreadsheetId) setInputUrl(res.spreadsheetId);
    } else {
      setFeedbackMsg({ type: 'error', text: res.message });
    }
  };

  const handleManualSync = async () => {
    setFeedbackMsg(null);
    const res = await syncWithGoogleSheet();
    if (res.success) {
      setFeedbackMsg({ type: 'success', text: res.message });
    } else {
      setFeedbackMsg({ type: 'error', text: res.message });
    }
  };

  const handleSaveSheetId = () => {
    setSheetId(inputUrl);
    setFeedbackMsg({ type: 'success', text: 'Đã lưu cấu hình Google Sheet ID thành công!' });
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            GOOGLE WORKSPACE INTEGRATION
          </span>
          <span className="text-xs text-zinc-500 font-medium">Real-time Cloud Database</span>
        </div>
        <h1 className="font-condensed font-black text-2xl sm:text-3xl text-zinc-900 tracking-tight mt-1 uppercase">
          Cơ sở dữ liệu Google Sheet
        </h1>
        <p className="text-xs text-zinc-500 font-medium mt-0.5">
          Đồng bộ danh sách thí sinh, điểm 4 giám khảo Prelim, 16 đội Pro 2vs2 và kết quả 9 giám khảo Battle
        </p>
      </div>

      {/* Feedback Message */}
      {feedbackMsg && (
        <div
          className={`p-3 rounded border text-xs font-semibold flex items-center gap-2 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Step 1: Google Account Authentication */}
      <div className="bg-white rounded border border-zinc-200 p-5 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-900 text-white font-mono text-xs flex items-center justify-center font-bold">
                1
              </span>
              <h2 className="font-bold text-zinc-900 text-sm">
                Xác thực tài khoản Google Ban Tổ Chức
              </h2>
            </div>
            <p className="text-xs text-zinc-500 mt-1 pl-7">
              Đăng nhập tài khoản Google để cấp quyền tạo và cập nhật bảng tính giải đấu.
            </p>
          </div>

          {googleUser ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-zinc-700 bg-zinc-100 px-2.5 py-1 rounded border border-zinc-200">
                {googleUser.email}
              </span>
              <button
                onClick={handleGoogleLogout}
                className="p-1.5 rounded border border-zinc-300 text-zinc-600 hover:text-red-600 hover:bg-zinc-50 transition-colors cursor-pointer"
                title="Đăng xuất"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleLogin}
              className="flex items-center gap-2 px-4 py-2 rounded bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-bold border border-zinc-300 shadow-xs transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Đăng nhập với Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Step 2: Spreadsheet Connection */}
      <div className="bg-white rounded border border-zinc-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-zinc-900 text-white font-mono text-xs flex items-center justify-center font-bold">
            2
          </span>
          <h2 className="font-bold text-zinc-900 text-sm">
            Kết nối hoặc khởi tạo Google Spreadsheet mới
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
          {/* Create new */}
          <div className="p-4 rounded border border-zinc-200 bg-zinc-50 flex flex-col justify-between space-y-3">
            <div>
              <div className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span>Tự động tạo Google Sheet chuẩn</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Hệ thống sẽ tạo mới bảng tính gồm 5 sheets (Tổng quan, Prelim Newbie, Prelim Pro, 16 Đội 2vs2, Battles) với tiêu chuẩn thể thao.
              </p>
            </div>

            <button
              onClick={handleCreateSheet}
              disabled={sheetConfig.isSyncing}
              className="w-full py-2 px-3 rounded bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{sheetConfig.isSyncing ? 'Đang tạo...' : 'Tạo Bảng Tính Mới Ngay'}</span>
            </button>
          </div>

          {/* Connect existing */}
          <div className="p-4 rounded border border-zinc-200 bg-zinc-50 flex flex-col justify-between space-y-3">
            <div>
              <div className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                <Database className="w-4 h-4 text-zinc-600" />
                <span>Kết nối Google Sheet có sẵn</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Dán Spreadsheet ID hoặc link đầy đủ của bảng tính Google Sheets bạn đã tạo:
              </p>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms..."
                className="w-full mt-2 px-3 py-1.5 rounded bg-white border border-zinc-300 text-xs font-mono outline-none focus:border-zinc-900"
              />
            </div>

            <button
              onClick={handleSaveSheetId}
              className="w-full py-2 px-3 rounded bg-white hover:bg-zinc-100 text-zinc-800 font-bold text-xs border border-zinc-300 uppercase tracking-wider transition-colors cursor-pointer"
            >
              Lưu Mã Bảng Tính
            </button>
          </div>
        </div>
      </div>

      {/* Step 3: Sync Status & Manual Push */}
      <div className="bg-white rounded border border-zinc-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-zinc-900 text-white font-mono text-xs flex items-center justify-center font-bold">
              3
            </span>
            <div>
              <h2 className="font-bold text-zinc-900 text-sm">Trạng thái đồng bộ dữ liệu</h2>
              <p className="text-[11px] text-zinc-500">
                {sheetConfig.spreadsheetId ? `ID: ${sheetConfig.spreadsheetId}` : 'Chưa có bảng tính kết nối'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {sheetConfig.spreadsheetUrl && (
              <a
                href={sheetConfig.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-zinc-300 hover:bg-zinc-50 text-xs font-bold text-zinc-700 transition-colors cursor-pointer"
              >
                <span>Mở Trên Google Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              onClick={handleManualSync}
              disabled={sheetConfig.isSyncing}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sheetConfig.isSyncing ? 'animate-spin' : ''}`} />
              <span>{sheetConfig.isSyncing ? 'Đang đồng bộ...' : 'Đồng Bộ Dữ Liệu Ngay'}</span>
            </button>
          </div>
        </div>

        {/* Sync Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pl-7">
          <div className="p-3 rounded bg-zinc-50 border border-zinc-200 text-xs">
            <div className="font-bold text-zinc-700">Trạng thái kết nối</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  sheetConfig.isConnected ? 'bg-emerald-600' : 'bg-zinc-400'
                }`}
              />
              <span className="font-bold text-zinc-900">
                {sheetConfig.isConnected ? 'Đã kết nối Google Sheet' : 'Sử dụng lưu trữ cục bộ'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded bg-zinc-50 border border-zinc-200 text-xs">
            <div className="font-bold text-zinc-700">Lần đồng bộ gần nhất</div>
            <div className="font-mono text-zinc-900 mt-1 font-bold">
              {sheetConfig.lastSyncedAt || 'Chưa đồng bộ'}
            </div>
          </div>

          <div className="p-3 rounded bg-zinc-50 border border-zinc-200 text-xs">
            <div className="font-bold text-zinc-700">Cấu trúc bảng tính</div>
            <div className="text-zinc-600 mt-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
              <span>5 Tab (Prelim, Đội, Battle)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
