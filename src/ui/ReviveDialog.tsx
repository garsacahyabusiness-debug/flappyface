import React from 'react';
import { Heart, RotateCcw, X } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';

interface ReviveDialogProps {
  remainingSec: number;
  score: number;
  onRevive: () => void;
  onGiveUp: () => void;
}

const TOTAL_DECISION_SEC = 5.0;

export const ReviveDialog: React.FC<ReviveDialogProps> = ({
  remainingSec,
  score,
  onRevive,
  onGiveUp,
}) => {
  const clamped = Math.max(0, Math.min(TOTAL_DECISION_SEC, remainingSec));
  const pct = Math.round((clamped / TOTAL_DECISION_SEC) * 100);

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="anim-fade-in absolute inset-0 z-30 flex items-center justify-center bg-[#24415C]/55 p-5 backdrop-blur-[2px]"
    >
      <div className="anim-panel-pop game-panel w-full max-w-[300px] p-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-[#24415C] bg-[#FFE4E6] text-[#FB7185] shadow-[0_3px_0_#24415C]">
          <Heart className="h-7 w-7 fill-[#FB7185]" />
        </div>

        <h2 className="mt-3 font-display text-stroke-dark text-2xl font-bold tracking-wide text-[#FB7185]">
          SECOND CHANCE!
        </h2>

        <p className="mt-1.5 text-xs font-extrabold leading-relaxed text-[#24415C]/85">
          Kesempatan kedua. Lanjutkan penerbangan?
        </p>

        <div className="mt-2.5 rounded-xl border-2 border-[#24415C]/15 bg-[#EEF7FF] px-3 py-1.5 text-xs font-black text-[#24415C]">
          Skor Saat Ini:{' '}
          <span className="font-display text-base text-[#3998F7] tabular-nums">{score}</span>
        </div>

        {/* Live countdown bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] font-black text-[#24415C]/75">
            <span>TIME LEFT</span>
            <span className="font-display text-sm text-[#FB7185] tabular-nums">
              {Math.ceil(clamped)}s
            </span>
          </div>
          <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full border border-[#24415C]/25 bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FB7185] to-[#F59E0B] transition-all duration-100"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onRevive();
            }}
            className="btn-base btn-green min-h-[50px] w-full text-lg"
          >
            <RotateCcw className="h-5 w-5" />
            <span>REVIVE</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onGiveUp();
            }}
            className="btn-base btn-secondary min-h-[42px] w-full text-sm"
          >
            <X className="h-4 w-4 text-[#FF6B6B]" />
            <span>GIVE UP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
