import React from 'react';
import { ActivePowerUpStatus } from '../game/powerups/PowerUpEffectManager';
import { getPowerUpById } from '../game/powerups/PowerUpRegistry';

interface PowerUpHUDProps {
  activePowerUps: ActivePowerUpStatus[];
  runCoins: number;
  runGems: number;
  collectiblesEnabled: boolean;
}

export const PowerUpHUD: React.FC<PowerUpHUDProps> = ({
  activePowerUps,
  runCoins,
  runGems,
  collectiblesEnabled,
}) => {
  if (activePowerUps.length === 0 && !collectiblesEnabled) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute top-12 left-4 z-20 flex flex-col items-start gap-1.5">
      {collectiblesEnabled && (
        <div className="inline-flex items-center gap-2 rounded-xl border-2 border-[#24415C] bg-white/88 px-2 py-0.5 text-[11px] font-black text-[#24415C] shadow-[0_2px_0_#24415C]">
          <span className="inline-flex items-center gap-0.5 tabular-nums">
            <span aria-hidden="true">🪙</span>
            <span>+{runCoins}</span>
          </span>
          {runGems > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[#0284C7] tabular-nums">
              <span aria-hidden="true">💎</span>
              <span>+{runGems}</span>
            </span>
          )}
        </div>
      )}

      {activePowerUps.length > 0 && (
        <div className="flex flex-col items-start gap-1">
          {activePowerUps.map((status) => {
            const def = getPowerUpById(status.id);
            const pct = status.isCharge
              ? 100
              : Math.max(0, Math.min(100, (status.remainingSec / status.totalSec) * 100));

            return (
              <div
                key={status.id}
                className="flex min-w-[96px] flex-col gap-0.5 rounded-xl border-2 border-[#24415C] bg-white/92 px-2 py-1 shadow-[0_2px_0_#24415C]"
              >
                <div className="flex items-center justify-between gap-1.5 text-[10px] font-black text-[#24415C]">
                  <span className="inline-flex items-center gap-1">
                    <span aria-hidden="true">{status.icon}</span>
                    <span className="uppercase">{status.id === 'score_boost' ? 'BOOST' : status.name}</span>
                  </span>
                  <span className="tabular-nums text-[#3998F7]">{status.label}</span>
                </div>
                {!status.isCharge && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#24415C]/15">
                    <div
                      className="h-full rounded-full transition-all duration-100"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: def.colorHex,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
