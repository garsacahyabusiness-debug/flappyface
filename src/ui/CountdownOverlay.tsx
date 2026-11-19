import React from 'react';
import { CountdownStep } from '../game/Game';
import { PlayerSlot } from '../game/TwoPlayerMatch';

interface CountdownOverlayProps {
  playerSlot: PlayerSlot;
  playerName: string;
  currentRound: number;
  maxRounds: number;
  step: CountdownStep;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  playerSlot,
  playerName,
  currentRound,
  maxRounds,
  step,
}) => {
  const isP1 = playerSlot === 1;
  const roundLabel =
    maxRounds > 1
      ? `ROUND ${currentRound}/${maxRounds} · PLAYER ${playerSlot}`
      : `ROUND 1 · PLAYER ${playerSlot}`;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-between px-5 pt-10 pb-14">
      {/* Top Player Turn Callout */}
      <div className="anim-panel-pop flex flex-col items-center text-center">
        <span
          className={`rounded-xl border-2 border-[#24415C] px-3 py-1 text-[11px] font-black tracking-wider text-white uppercase shadow-[0_3px_0_#24415C] ${
            isP1 ? 'bg-[#3998F7]' : 'bg-[#FF6B6B]'
          }`}
        >
          {roundLabel}
        </span>

        <h2 className="font-display text-stroke-dark mt-2 text-3xl font-bold tracking-wide text-white">
          {playerName}
        </h2>
      </div>

      {/* Center Animated Countdown Number / GO! */}
      {step !== null && (
        <div key={String(step)} className="anim-panel-pop flex flex-col items-center">
          <div
            className={`font-display text-stroke-dark text-[5.2rem] leading-none font-bold drop-shadow-[0_6px_0_#24415C] ${
              step === 'GO' ? 'text-[#61D66B]' : 'text-[#FFD84D]'
            }`}
          >
            {step === 'GO' ? 'GO!' : step}
          </div>
          <p className="mt-2 rounded-xl border-2 border-[#24415C] bg-white/92 px-3 py-1 text-xs font-black tracking-wide text-[#24415C] shadow-[0_3px_0_#24415C]">
            {step === 'GO' ? 'TAP NOW!' : 'GET READY...'}
          </p>
        </div>
      )}

      <div className="h-6" aria-hidden="true" />
    </div>
  );
};
