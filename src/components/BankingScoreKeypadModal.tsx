import React, { useState, useEffect, useCallback } from 'react';
import { Dancer, Judge } from '../types/tournament';
import {
  X,
  Check,
  Delete,
  ArrowRight,
  ArrowDown,
  RotateCcw,
  Award,
  Zap,
} from 'lucide-react';
import { soundFX } from '../services/soundEffects';
import { stripBreakerPrefix, getDancerAvatarUrl } from '../utils/placeholderAssets';
import { useTournament } from '../context/TournamentContext';

interface BankingScoreKeypadModalProps {
  isOpen: boolean;
  onClose: () => void;
  dancer: Dancer | null;
  judge: Judge | null;
  initialScore: number;
  onSave: (score: number) => void;
  onSaveAndNextJudge?: (score: number) => void;
  onSaveAndNextDancer?: (score: number) => void;
  hasNextJudge?: boolean;
  hasNextDancer?: boolean;
}

const QUICK_PRESETS = [40, 50, 60, 70, 80, 90];

export const BankingScoreKeypadModal: React.FC<BankingScoreKeypadModalProps> = ({
  isOpen,
  onClose,
  dancer,
  judge,
  initialScore,
  onSave,
  onSaveAndNextJudge,
  onSaveAndNextDancer,
  hasNextJudge = false,
  hasNextDancer = false,
}) => {
  const { storageConfig } = useTournament();
  const [inputStr, setInputStr] = useState<string>('');

  // Sync initial score on open
  useEffect(() => {
    if (isOpen) {
      const valid = Math.min(100, Math.max(0, Math.round(initialScore || 80)));
      setInputStr(String(valid));
    }
  }, [isOpen, initialScore, dancer?.id, judge?.id]);

  const currentVal = parseInt(inputStr, 10);
  const numericScore = isNaN(currentVal) ? 0 : Math.min(100, Math.max(0, currentVal));

  // Keypad actions
  const handleDigit = useCallback((digit: string) => {
    soundFX.playVoteClick();
    setInputStr((prev) => {
      // If current is '0' or empty, replace with digit
      if (prev === '0' || prev === '') {
        return digit;
      }
      const next = prev + digit;
      const val = parseInt(next, 10);
      if (val > 100) return '100'; // Cap at 100
      return next;
    });
  }, []);

  const handleBackspace = useCallback(() => {
    soundFX.playVoteClick();
    setInputStr((prev) => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  }, []);

  const handleClear = useCallback(() => {
    soundFX.playVoteClick();
    setInputStr('0');
  }, []);

  const handleQuickPreset = useCallback((preset: number) => {
    soundFX.playVoteClick();
    setInputStr(String(preset));
  }, []);

  const handleDelta = useCallback((delta: number) => {
    soundFX.playVoteClick();
    setInputStr((prev) => {
      const val = parseInt(prev, 10) || 0;
      const next = Math.min(100, Math.max(0, val + delta));
      return String(next);
    });
  }, []);

  const handleConfirmDone = useCallback(() => {
    soundFX.playVoteConfirmed();
    onSave(numericScore);
    onClose();
  }, [numericScore, onSave, onClose]);

  const handleConfirmNextJudge = useCallback(() => {
    soundFX.playVoteConfirmed();
    if (onSaveAndNextJudge) {
      onSaveAndNextJudge(numericScore);
    } else {
      onSave(numericScore);
      onClose();
    }
  }, [numericScore, onSaveAndNextJudge, onSave, onClose]);

  const handleConfirmNextDancer = useCallback(() => {
    soundFX.playVoteConfirmed();
    if (onSaveAndNextDancer) {
      onSaveAndNextDancer(numericScore);
    } else {
      onSave(numericScore);
      onClose();
    }
  }, [numericScore, onSaveAndNextDancer, onSave, onClose]);

  // Physical Keyboard Listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Delete' || e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirmDone();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleDelta(1);
      } else if (e.key === '-') {
        e.preventDefault();
        handleDelta(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleDigit, handleBackspace, handleClear, handleConfirmDone, handleDelta, onClose]);

  if (!isOpen || !dancer || !judge) return null;

  // Grade badge matching light theme banking app UI
  let gradeBadge = {
    label: 'Xuất Sắc (Hạt Giống Dẫn Đầu)',
    color: 'bg-amber-100 text-amber-900 border-amber-300',
  };
  if (numericScore >= 90) {
    gradeBadge = {
      label: 'Xuất Sắc (Top 1–3 Dẫn Đầu)',
      color: 'bg-amber-100 text-amber-900 border-amber-300',
    };
  } else if (numericScore >= 82) {
    gradeBadge = {
      label: 'Rất Tốt (Vé Vàng Top 32 Vững Vàng)',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    };
  } else if (numericScore >= 75) {
    gradeBadge = {
      label: 'Khá Tốt (Sát Ngưỡng Vé Vàng)',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
    };
  } else if (numericScore >= 65) {
    gradeBadge = {
      label: 'Trung Bình (Cạnh Tranh Vé Vàng)',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    };
  } else {
    gradeBadge = {
      label: 'Cần Cố Gắng Thêm',
      color: 'bg-red-100 text-red-800 border-red-300',
    };
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-150">
      {/* Light Theme Banking Keypad Modal / Bottom Sheet */}
      <div className="w-full sm:max-w-md bg-white border border-zinc-200 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] text-zinc-900">
        {/* App Bar / Bank Header (Light Theme) */}
        <div className="px-5 py-3.5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-zinc-950 font-black text-xs shadow-xs">
              Đ
            </div>
            <div>
              <div className="font-condensed font-black text-sm uppercase tracking-wider text-zinc-900">
                BÀN PHÍM CHẤM ĐIỂM PRELIM
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">
                Thang điểm 0–100 (Số nguyên)
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 transition-colors cursor-pointer"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dancer & Judge Beneficiary Card (Giống Người Nhận Tiền) */}
        <div className="px-5 py-3 bg-white border-b border-zinc-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={getDancerAvatarUrl(dancer, storageConfig.placeholders)}
              alt={dancer.name}
              className="w-12 h-12 rounded-xl object-cover bg-zinc-100 border-2 border-amber-500 shrink-0 shadow-xs"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  #{dancer.sbd}
                </span>
                <span className="font-condensed font-black text-base text-zinc-900 uppercase truncate">
                  {stripBreakerPrefix(dancer.name)}
                </span>
              </div>
              <div className="text-xs text-zinc-500 truncate mt-0.5">
                {dancer.crew || 'Tự do'} · {dancer.gender === 'female' ? 'Bgirl' : 'Bboy'} ({dancer.age}T)
              </div>
            </div>
          </div>

          {/* Active Judge Tag */}
          <div className="text-right shrink-0">
            <div className="text-[9px] font-mono text-zinc-400 uppercase">GIÁM KHẢO CHẤM</div>
            <div className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-800 font-bold text-xs font-mono uppercase mt-0.5">
              {judge.judgeName || judge.code}
            </div>
          </div>
        </div>

        {/* Big Money-Transfer Amount Display (Light Theme) */}
        <div className="px-5 py-3.5 bg-zinc-50 border-b border-zinc-200 text-center space-y-1">
          <div className="text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider">
            SỐ ĐIỂM DÀNH CHO THÍ SINH
          </div>

          <div className="flex items-baseline justify-center gap-2">
            <span className="font-condensed font-black text-6xl text-zinc-900 tracking-tight tabular-nums">
              {inputStr || '0'}
            </span>
            <span className="font-mono text-xs text-zinc-500 font-bold uppercase">/ 100 ĐIỂM</span>
          </div>

          <div className="pt-0.5">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${gradeBadge.color}`}
            >
              <Award className="w-3 h-3" />
              <span>{gradeBadge.label}</span>
            </span>
          </div>
        </div>

        {/* Quick Presets Bar: 70 - 95 (Chấm Nhanh 1 Chạm) */}
        <div className="px-5 py-2.5 bg-white border-b border-zinc-200 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span className="flex items-center gap-1 font-bold text-zinc-700">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>CHẤM NHANH (40 – 90)</span>
            </span>
            <span>1 chạm đổi điểm</span>
          </div>

          {/* 6 Quick Preset Buttons: 70, 75, 80, 85, 90, 95 */}
          <div className="grid grid-cols-6 gap-1.5">
            {QUICK_PRESETS.map((preset) => {
              const isSelected = numericScore === preset;
              return (
                <button
                  key={preset}
                  onClick={() => handleQuickPreset(preset)}
                  className={`py-2 rounded-lg text-xs font-mono font-black transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-500 text-zinc-950 border-amber-600 shadow-xs scale-105'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-200 active:scale-95'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>

          {/* Micro-adjustment buttons: -2, -1, +1, +2 */}
          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
            {[-2, -1, 1, 2].map((delta) => (
              <button
                key={delta}
                onClick={() => handleDelta(delta)}
                className="py-1 rounded text-xs font-mono font-bold bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 transition-colors cursor-pointer active:scale-95"
              >
                {delta > 0 ? `+${delta}` : delta}
              </button>
            ))}
          </div>
        </div>

        {/* 3x4 Light Theme Banking Keypad */}
        <div className="p-3 sm:p-4 bg-zinc-50/80 grid grid-cols-3 gap-2 flex-1 border-b border-zinc-200">
          {/* Row 1: 1, 2, 3 */}
          {['1', '2', '3'].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              className="py-3 rounded-xl bg-white hover:bg-zinc-100 active:bg-zinc-200 text-zinc-900 font-mono font-bold text-2xl border border-zinc-200 shadow-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center"
            >
              {num}
            </button>
          ))}

          {/* Row 2: 4, 5, 6 */}
          {['4', '5', '6'].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              className="py-3 rounded-xl bg-white hover:bg-zinc-100 active:bg-zinc-200 text-zinc-900 font-mono font-bold text-2xl border border-zinc-200 shadow-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center"
            >
              {num}
            </button>
          ))}

          {/* Row 3: 7, 8, 9 */}
          {['7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              className="py-3 rounded-xl bg-white hover:bg-zinc-100 active:bg-zinc-200 text-zinc-900 font-mono font-bold text-2xl border border-zinc-200 shadow-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center"
            >
              {num}
            </button>
          ))}

          {/* Row 4: C (Clear), 0, Backspace */}
          <button
            onClick={handleClear}
            className="py-3 rounded-xl bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 font-mono font-bold text-base border border-red-200 transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center gap-1"
            title="Xóa về 0 (Del / C)"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-xs font-black">XÓA</span>
          </button>

          <button
            onClick={() => handleDigit('0')}
            className="py-3 rounded-xl bg-white hover:bg-zinc-100 active:bg-zinc-200 text-zinc-900 font-mono font-bold text-2xl border border-zinc-200 shadow-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center"
          >
            0
          </button>

          <button
            onClick={handleBackspace}
            className="py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 font-mono font-bold text-xl border border-zinc-200 transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center"
            title="Xóa 1 số (Backspace)"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Actions: NÚT XONG / XÁC NHẬN (Theme Light) */}
        <div className="p-4 bg-white space-y-2">
          {/* Main Primary "Xong" Button */}
          <button
            onClick={handleConfirmDone}
            className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-black text-sm uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-98 flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5 font-black stroke-[3]" />
            <span>XONG · XÁC NHẬN {numericScore} ĐIỂM</span>
          </button>

          {/* Optional Quick Flow Navigation Buttons */}
          {(hasNextJudge || hasNextDancer) && (
            <div className="flex items-center gap-2">
              {hasNextJudge && (
                <button
                  onClick={handleConfirmNextJudge}
                  className="flex-1 py-2 px-3 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-zinc-200"
                >
                  <span>Lưu & Sang GK kế</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                </button>
              )}

              {hasNextDancer && (
                <button
                  onClick={handleConfirmNextDancer}
                  className="flex-1 py-2 px-3 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-zinc-200"
                >
                  <span>Lưu & Thí sinh tiếp</span>
                  <ArrowDown className="w-3.5 h-3.5 text-amber-600" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
