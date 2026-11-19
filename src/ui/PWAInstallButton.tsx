import React, { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { pwaManager, usePWAState } from '../game/pwa/PWAManager';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstalled, isInstallable, isIOS } = usePWAState();
  const [showManualModal, setShowManualModal] = useState(false);

  // Never show install button if already installed as standalone PWA
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    audioManager.playButton();
    if (isInstallable) {
      const outcome = await pwaManager.promptInstall();
      if (outcome === 'manual') {
        setShowManualModal(true);
      }
      return;
    }
    setShowManualModal(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={`btn-base btn-green w-full ${
          compact ? 'min-h-[42px] px-3 py-1.5 text-xs' : 'min-h-[44px] px-4 py-2 text-xs'
        }`}
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>INSTALL GAME</span>
      </button>

      {showManualModal && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#24415C]/55 p-4 backdrop-blur-sm"
        >
          <div className="anim-panel-pop game-panel w-full max-w-[320px] p-5 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-[#3998F7]" />
                <h3 className="font-display text-lg font-bold text-[#24415C]">
                  INSTALL FLAPPY FACE
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close install instructions"
                onClick={() => {
                  audioManager.playButton();
                  setShowManualModal(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-[#24415C]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="mt-3 space-y-2.5 rounded-2xl bg-[#EEF7FF] p-3.5 text-xs font-bold leading-relaxed text-[#24415C]">
                <p className="font-black text-[#3998F7]">iPhone & iPad (Safari)</p>
                <p className="flex items-center gap-2">
                  <Share className="h-4 w-4 shrink-0 text-[#3998F7]" />
                  <span>
                    1. Tap <strong>Share</strong> in the Safari toolbar.
                  </span>
                </p>
                <p>
                  2. Scroll down and tap <strong>Add to Home Screen</strong>.
                </p>
                <p className="text-[11px] text-[#24415C]/65">
                  Note: iOS Safari adds web apps via Add to Home Screen instead of Android&apos;s automatic install prompt.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-2 rounded-2xl bg-[#EEF7FF] p-3.5 text-xs font-bold leading-relaxed text-[#24415C]">
                <p className="font-black text-[#3998F7]">Install From Your Browser</p>
                <p>
                  1. Open your browser menu (<strong>⋮</strong> or <strong>⋯</strong>) or address bar install icon.
                </p>
                <p>
                  2. Choose <strong>Install FLAPPY FACE</strong> or <strong>Add to Home Screen</strong>.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                audioManager.playButton();
                setShowManualModal(false);
              }}
              className="btn-base btn-primary mt-4 min-h-[44px] w-full text-sm"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}
    </>
  );
};
