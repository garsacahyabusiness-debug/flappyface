import React from 'react';
import { Home, Play, RotateCcw } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';

interface PauseOverlayProps {
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
}

export const PauseOverlay: React.FC<PauseOverlayProps> = ({
  onResume,
  onRestart,
  onHome,
}) => {
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="anim-fade-in absolute inset-0 z-30 flex items-center justify-center bg-[#24415C]/45 p-5 backdrop-blur-sm"
    >
      <div className="anim-panel-pop game-panel w-full max-w-[295px] p-6 text-center">
        <h2 className="font-display text-3xl font-bold tracking-wide text-[#24415C]">
          PAUSED
        </h2>
        <p className="mt-1 text-xs font-bold text-[#24415C]/65">
          Game is paused safely
        </p>

        <div className="mt-5 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onResume();
            }}
            className="btn-base btn-green min-h-[52px] w-full text-lg"
          >
            <Play className="h-5 w-5 fill-white text-white" />
            <span>RESUME</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onRestart();
            }}
            className="btn-base btn-primary min-h-[48px] w-full text-base"
          >
            <RotateCcw className="h-4 w-4" />
            <span>RESTART</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onHome();
            }}
            className="btn-base btn-secondary min-h-[46px] w-full text-base"
          >
            <Home className="h-4 w-4 text-[#3998F7]" />
            <span>HOME</span>
          </button>
        </div>
      </div>
    </div>
  );
};
