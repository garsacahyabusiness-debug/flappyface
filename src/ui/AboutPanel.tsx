import React from 'react';
import { ArrowLeft, Gamepad2 } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';

interface AboutPanelProps {
  onBack: () => void;
}

export const AboutPanel: React.FC<AboutPanelProps> = ({ onBack }) => {
  return (
    <div className="anim-fade-in relative z-30 flex h-full w-full flex-col bg-[#24415C]/25 px-5 pt-safe pb-safe backdrop-blur-sm">
      <div className="flex items-center justify-between py-2">
        <button
          type="button"
          onClick={() => {
            audioManager.playButton();
            onBack();
          }}
          className="btn-base btn-secondary min-h-[44px] px-3.5 py-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>BACK</span>
        </button>
        <h2 className="font-display text-stroke-dark text-2xl font-bold text-white">
          ABOUT
        </h2>
        <div className="w-[78px]" aria-hidden="true" />
      </div>

      <div className="my-auto flex justify-center overflow-y-auto py-1">
        <div className="anim-panel-pop game-panel w-full max-w-[330px] p-5 text-center sm:p-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl border-[3px] border-[#24415C] bg-[#FFD84D] shadow-[0_4px_0_#24415C]">
            <Gamepad2 className="h-7 w-7 text-[#24415C]" />
          </div>

          <h3 className="mt-3 font-display text-2xl font-bold text-[#24415C]">
            FLAPPY FACE
          </h3>
          <p className="mt-0.5 text-xs font-black tracking-wide text-[#3998F7] uppercase">
            &ldquo;One tap. Endless chaos.&rdquo;
          </p>

          <p className="mt-3 text-xs font-bold leading-relaxed text-[#24415C]/85">
            Flappy Face is a fun arcade flying game where your face becomes the pilot. Dodge
            pipes, beat your high score, and challenge your friends in local tournaments.
          </p>

          <div className="mt-3.5 space-y-1 rounded-2xl bg-[#F2F9FF] px-4 py-3 text-xs font-bold text-[#24415C]/85">
            <div className="text-[10px] font-black tracking-wider text-[#3998F7] uppercase">
              DEVELOPER
            </div>
            <div className="font-display text-sm font-bold text-[#24415C]">
              Garsa Cahya Sukmana
            </div>
            <div className="text-[11px] text-[#24415C]/65">Release Candidate v1.0.0</div>
          </div>

          <div className="mt-3 text-[11px] font-bold text-[#24415C]/70">
            Controls: Tap Screen · Click · Spacebar · Arrow Up · Esc/P (Pause)
          </div>

          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onBack();
            }}
            className="btn-base btn-primary mt-4 min-h-[48px] w-full text-base"
          >
            BACK
          </button>
        </div>
      </div>
    </div>
  );
};
