import React from 'react';
import { RefreshCw } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { pwaManager, usePWAState } from '../game/pwa/PWAManager';

interface PWAUpdateBannerProps {
  isPlaying: boolean;
}

export const PWAUpdateBanner: React.FC<PWAUpdateBannerProps> = ({ isPlaying }) => {
  const { needRefresh } = usePWAState();

  // Never interrupt active gameplay with an update banner
  if (!needRefresh || isPlaying) {
    return null;
  }

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="anim-fade-in absolute top-3 left-1/2 z-50 w-[92%] max-w-[340px] -translate-x-1/2"
    >
      <div className="game-panel flex items-center justify-between gap-2.5 bg-white px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 border-[#24415C] bg-[#69C9FF] text-[#24415C]">
            <RefreshCw className="h-4 w-4" />
          </div>
          <span className="truncate text-xs font-black text-[#24415C]">
            New version available!
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              pwaManager.dismissUpdate();
            }}
            className="min-h-[32px] rounded-xl border-2 border-[#24415C]/25 bg-slate-100 px-2.5 text-[10px] font-black text-[#24415C]"
          >
            LATER
          </button>
          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              pwaManager.applyUpdate();
            }}
            className="min-h-[32px] rounded-xl border-2 border-[#24415C] bg-[#FFD84D] px-2.5 text-[10px] font-black text-[#24415C] shadow-[0_2px_0_#24415C]"
          >
            UPDATE NOW
          </button>
        </div>
      </div>
    </div>
  );
};
