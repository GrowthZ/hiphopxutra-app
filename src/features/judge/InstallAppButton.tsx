import React, { useEffect, useState } from 'react';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import { canPromptInstall, isIOS, isStandalone, promptInstall, subscribeInstall } from '../../services/pwa';

/** "Cài đặt ứng dụng": the browser's install dialog, or Add-to-Home-Screen steps on iPhone. Hidden once installed. */
export const InstallAppButton: React.FC = () => {
  const [canPrompt, setCanPrompt] = useState(canPromptInstall);
  const [installed, setInstalled] = useState(isStandalone);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(
    () =>
      subscribeInstall(() => {
        setCanPrompt(canPromptInstall());
        setInstalled(isStandalone());
      }),
    []
  );

  const ios = isIOS();
  if (installed || (!canPrompt && !ios)) return null;

  const install = async () => {
    if (ios) return setShowIosHelp(true);
    if (await promptInstall()) setInstalled(true);
  };

  return (
    <>
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-black text-zinc-950 hover:bg-amber-400 active:bg-amber-600 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-600"
      >
        <Download className="w-3.5 h-3.5" />
        Cài đặt ứng dụng
      </button>

      {showIosHelp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40"
          onClick={() => setShowIosHelp(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-zinc-900 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 id="ios-install-title" className="font-condensed font-black text-2xl uppercase">
                Cài lên iPhone
              </h2>
              <button
                onClick={() => setShowIosHelp(false)}
                aria-label="Đóng"
                className="p-2 -m-2 rounded-full text-zinc-500 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ol className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <span className="w-7 h-7 shrink-0 rounded-full bg-zinc-100 flex items-center justify-center font-black">1</span>
                <span>
                  Bấm nút <Share className="inline w-4 h-4 -mt-0.5 text-blue-600" /> <b>Chia sẻ</b> trên thanh Safari
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-7 h-7 shrink-0 rounded-full bg-zinc-100 flex items-center justify-center font-black">2</span>
                <span>
                  Chọn <SquarePlus className="inline w-4 h-4 -mt-0.5" /> <b>Thêm vào MH chính</b>
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-7 h-7 shrink-0 rounded-full bg-zinc-100 flex items-center justify-center font-black">3</span>
                <span>
                  Mở app <b>Giám khảo</b> từ màn hình chính để chấm điểm
                </span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
};
