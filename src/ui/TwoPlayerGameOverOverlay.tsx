import React from 'react';
import { ArrowRight } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { GameOverReaction } from '../game/GameOverReaction';
import { PlayerSlot } from '../game/TwoPlayerMatch';

interface TwoPlayerGameOverOverlayProps {
  playerSlot: PlayerSlot;
  playerName: string;
  currentRound: number;
  maxRounds: number;
  score: number;
  reaction: GameOverReaction | null;
  onContinue: () => void;
}

export const TwoPlayerGameOverOverlay: React.FC<TwoPlayerGameOverOverlayProps> = ({
  playerSlot,
  playerName,
  currentRound,
  maxRounds,
  score,
  reaction,
  onContinue,
}) => {
  const isP1 = playerSlot === 1;
  const badgeText =
    maxRounds > 1
      ? `PLAYER ${playerSlot} · ROUND ${currentRound}/${maxRounds}`
      : `PLAYER ${playerSlot} · ROUND 1`;

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="anim-fade-in absolute inset-0 z-30 flex items-center justify-center bg-[#24415C]/45 p-5 backdrop-blur-[2px]"
    >
      <div className="anim-panel-pop game-panel w-full max-w-[306px] p-5 text-center sm:p-6">
        <span
          className={`inline-flex items-center rounded-xl border-2 border-[#24415C] px-3 py-0.5 text-[11px] font-black tracking-wider text-white uppercase shadow-[0_2px_0_#24415C] ${
            isP1 ? 'bg-[#3998F7]' : 'bg-[#FF6B6B]'
          }`}
        >
          {badgeText}
        </span>

        <h2 className="font-display text-stroke-dark mt-2 text-[2rem] leading-none font-bold tracking-wide text-[#FFD84D]">
          GAME OVER
        </h2>

        <div className="mt-1.5 text-sm font-black tracking-wide text-[#24415C]">
          {playerName}
        </div>

        {reaction && (
          <p
            key={reaction.id}
            className="anim-reaction-in mx-auto mt-2.5 line-clamp-2 rounded-2xl bg-[#F2F9FF] px-3 py-2 text-[13px] leading-snug font-extrabold text-[#24415C]/90 sm:text-sm"
          >
            &ldquo;{reaction.text}&rdquo;
          </p>
        )}

        <div className="mt-3 rounded-2xl border-2 border-[#24415C]/15 bg-[#E8F6FF] p-3.5">
          <div className="text-[11px] font-black tracking-wider text-[#24415C]/65 uppercase">
            Skor {playerName}
          </div>
          <div
            className={`font-display mt-0.5 text-4xl font-bold tabular-nums ${
              isP1 ? 'text-[#3998F7]' : 'text-[#FF6B6B]'
            }`}
          >
            {score}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            audioManager.playButton();
            onContinue();
          }}
          className="btn-base btn-primary mt-4 min-h-[52px] w-full text-lg tracking-wide"
        >
          <span>CONTINUE</span>
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
