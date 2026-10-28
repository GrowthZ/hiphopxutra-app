import React from 'react';
import { useTournament } from '../../state/TournamentContext';
import {
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Bell,
  Trophy,
  Sliders,
  Check,
  X,
  Flame,
} from 'lucide-react';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    soundEnabled,
    setSoundEnabled,
    soundVolume,
    setSoundVolume,
    voiceAnnounceEnabled,
    setVoiceAnnounceEnabled,
    playAudioEffect,
  } = useTournament();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 select-none">
      <div className="bg-white border border-zinc-200 text-zinc-900 w-full max-w-md rounded p-5 shadow-xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-zinc-50 border border-zinc-200 text-zinc-800 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-condensed font-black text-base tracking-tight text-zinc-900 uppercase">
                Hệ Thống Âm Thanh & Soundboard
              </h2>
              <p className="text-[11px] text-zinc-500">
                Audio Feedback cho Giám Khảo, MC, DJ & Màn LED
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded bg-zinc-50 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Master Controls */}
        <div className="space-y-3 bg-zinc-50 p-3.5 rounded border border-zinc-200 text-xs">
          {/* Master Sound Switch */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-700" />
              ) : (
                <VolumeX className="w-4 h-4 text-zinc-500" />
              )}
              <div>
                <div className="font-bold text-zinc-800">Âm thanh toàn hệ thống</div>
                <div className="text-[10px] text-zinc-500">Bật/tắt toàn bộ hiệu ứng Web Audio</div>
              </div>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                soundEnabled ? 'bg-emerald-600' : 'bg-zinc-200'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  soundEnabled ? 'left-5.5' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Volume Slider */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[11px] font-semibold text-zinc-700">
              <span>Âm lượng Master</span>
              <span className="font-mono text-zinc-800">{Math.round(soundVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={soundVolume}
              onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
              disabled={!soundEnabled}
              className="w-full h-1.5 bg-zinc-200 rounded appearance-none cursor-pointer accent-zinc-200 disabled:opacity-40"
            />
          </div>

          {/* Voice Announcer Vietnamese */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-200">
            <div className="flex items-center gap-2">
              {voiceAnnounceEnabled ? (
                <Mic className="w-4 h-4 text-zinc-800" />
              ) : (
                <MicOff className="w-4 h-4 text-zinc-500" />
              )}
              <div>
                <div className="font-bold text-zinc-800">Giọng đọc MC Tiếng Việt</div>
                <div className="text-[10px] text-zinc-500">
                  Tự động xướng tên đội thắng trên loa
                </div>
              </div>
            </div>

            <button
              onClick={() => setVoiceAnnounceEnabled(!voiceAnnounceEnabled)}
              disabled={!soundEnabled}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer disabled:opacity-40 ${
                voiceAnnounceEnabled ? 'bg-zinc-200' : 'bg-zinc-200'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full ${
                  voiceAnnounceEnabled ? 'bg-white left-5.5' : 'bg-white left-1'
                } absolute top-0.5 transition-transform`}
              />
            </button>
          </div>
        </div>

        {/* Live Sound Test Soundboard */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
            <span>Bàn Thử Nghiệm Âm Thanh (DJ Deck)</span>
            <span className="text-[10px] text-zinc-500">Bấm kiểm tra</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
            <button
              onClick={() => playAudioEffect('vote')}
              className="p-2.5 rounded bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 flex items-center gap-2 text-left cursor-pointer transition-colors"
            >
              <div className="w-6 h-6 rounded bg-zinc-100 text-zinc-800 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-zinc-800 text-xs">GK Gửi Phiếu</div>
                <div className="text-[10px] text-zinc-500 font-normal">Chime xác nhận</div>
              </div>
            </button>

            <button
              onClick={() => playAudioEffect('allVoted')}
              className="p-2.5 rounded bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 flex items-center gap-2 text-left cursor-pointer transition-colors"
            >
              <div className="w-6 h-6 rounded bg-zinc-100 text-zinc-800 flex items-center justify-center shrink-0">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-zinc-800 text-xs">Đủ 9 Phiếu</div>
                <div className="text-[10px] text-zinc-500 font-normal">Chuông báo MC</div>
              </div>
            </button>

            <button
              onClick={() => playAudioEffect('roundWin')}
              className="p-2.5 rounded bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 flex items-center gap-2 text-left cursor-pointer transition-colors"
            >
              <div className="w-6 h-6 rounded bg-zinc-100 text-zinc-800 flex items-center justify-center shrink-0">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div>
                <div className="text-zinc-800 text-xs">Thắng Round</div>
                <div className="text-[10px] text-zinc-500 font-normal">Tiếng Cồng Victory</div>
              </div>
            </button>

            <button
              onClick={() => playAudioEffect('airhorn')}
              className="p-2.5 rounded bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 flex items-center gap-2 text-left cursor-pointer transition-colors"
            >
              <div className="w-6 h-6 rounded bg-zinc-100 text-zinc-800 flex items-center justify-center shrink-0">
                🎺
              </div>
              <div>
                <div className="text-zinc-800 text-xs">Hiphop Airhorn</div>
                <div className="text-[10px] text-zinc-500 font-normal">Còi Hiphop Hype</div>
              </div>
            </button>

            <button
              onClick={() => playAudioEffect('champion')}
              className="p-2.5 rounded bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 flex items-center gap-2 text-left cursor-pointer transition-colors col-span-2"
            >
              <div className="w-6 h-6 rounded bg-zinc-100 text-amber-600 flex items-center justify-center shrink-0">
                <Trophy className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-zinc-800 text-xs">Khúc Ca Vô Địch Chung Cuộc</div>
                <div className="text-[10px] text-zinc-500 font-normal">Kèn Fanfare Champion</div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-1 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs cursor-pointer transition-colors"
          >
            Đóng Cài Đặt
          </button>
        </div>
      </div>
    </div>
  );
};
