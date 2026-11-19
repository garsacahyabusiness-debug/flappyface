import React from 'react';

interface SplashScreenProps {
  visible: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <div
      aria-label="Loading FLAPPY FACE"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#49B4FF] via-[#69C9FF] to-[#9BE4FF] px-6 text-center transition-opacity duration-300"
    >
      <div className="anim-float flex flex-col items-center">
        <img
          src="/pwa-192x192.png"
          alt="FLAPPY FACE"
          className="h-24 w-24 rounded-3xl border-[4px] border-[#24415C] shadow-[0_6px_0_#24415C,0_16px_28px_rgba(36,65,92,0.25)]"
        />
        <h1 className="mt-4 font-display text-stroke-logo text-4xl font-bold tracking-wide text-white">
          FLAPPY <span className="text-[#FFD84D]">FACE</span>
        </h1>
        <p className="mt-2 text-xs font-extrabold tracking-wider text-[#24415C]/80 uppercase">
          Loading Arcade Engine...
        </p>
      </div>
    </div>
  );
};
