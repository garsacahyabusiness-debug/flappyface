import React from 'react';
import { ArrowLeft, CheckCircle2, Lock, Trophy } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { PowerUpCurrencyStats } from '../game/powerups/CurrencyManager';
import { AchievementRecord } from '../game/progression/AchievementManager';
import { renderAchievementIcon } from './AchievementPopup';

interface AchievementCollectionUIProps {
  achievements: AchievementRecord[];
  bestScore: number;
  powerUpStats?: PowerUpCurrencyStats;
  onBack: () => void;
}

function resolveProgressValue(item: AchievementRecord, bestScore: number, stats?: PowerUpCurrencyStats): number {
  if (item.unlocked) return item.requirement;
  switch (item.requirementType) {
    case 'shield_saves':
      return stats?.shieldSaves ?? 0;
    case 'revives':
      return stats?.revivesUsed ?? 0;
    case 'coins':
      return stats?.totalCoinsCollected ?? 0;
    case 'gems':
      return stats?.totalGemsCollected ?? 0;
    case 'powerups_total':
      return stats?.totalPowerUpsCollected ?? 0;
    case 'powerups_run':
      return 0;
    case 'score':
    default:
      return bestScore;
  }
}

export const AchievementCollectionUI: React.FC<AchievementCollectionUIProps> = ({
  achievements,
  bestScore,
  powerUpStats,
  onBack,
}) => {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="anim-fade-in relative z-30 flex h-full w-full flex-col bg-[#24415C]/25 px-4 pt-safe pb-safe backdrop-blur-sm">
      {/* Header */}
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

        <h2 className="font-display text-stroke-dark text-xl font-bold tracking-wide text-white">
          ACHIEVEMENTS
        </h2>

        <div className="inline-flex min-h-[36px] items-center gap-1 rounded-2xl border-2 border-[#24415C] bg-[#FFD84D] px-2.5 text-xs font-black text-[#24415C] shadow-[0_2px_0_#24415C]">
          <Trophy className="h-3.5 w-3.5" />
          <span>
            {unlockedCount}/{achievements.length}
          </span>
        </div>
      </div>

      {/* Scrollable Achievement Cards */}
      <div className="mx-auto mt-1 w-full max-w-[350px] flex-1 overflow-y-auto pb-3">
        <div className="anim-panel-pop game-panel space-y-3 p-4">
          {achievements.map((item) => {
            const rawProgress = resolveProgressValue(item, bestScore, powerUpStats);
            const currentProgress = Math.min(rawProgress, item.requirement);
            const pct = Math.min(100, Math.round((currentProgress / item.requirement) * 100));

            return (
              <div
                key={item.id}
                className={`rounded-2xl border-2 p-3 transition-all ${
                  item.unlocked
                    ? 'border-[#24415C] bg-gradient-to-r from-[#FFFDF2] to-[#FFF2B2] shadow-[0_3px_0_#24415C,0_0_14px_rgba(255,216,77,0.38)]'
                    : 'border-slate-300 bg-slate-100/90 opacity-85 grayscale'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 ${
                      item.unlocked
                        ? 'border-[#24415C] bg-[#FFD84D] text-[#24415C]'
                        : 'border-slate-400 bg-slate-200 text-slate-500'
                    }`}
                  >
                    {item.unlocked ? (
                      renderAchievementIcon(item.icon, 'h-6 w-6')
                    ) : (
                      <Lock className="h-5 w-5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate font-display text-base font-bold text-[#24415C]">
                        {item.name}
                      </h3>
                      {item.unlocked ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-600 bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>UNLOCKED</span>
                        </span>
                      ) : (
                        <span className="shrink-0 font-display text-xs font-bold tabular-nums text-slate-500">
                          {currentProgress} / {item.requirement}
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 text-xs font-bold text-[#24415C]/75">
                      {item.description}
                    </p>

                    {/* Progress bar */}
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#24415C]/15">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          item.unlocked ? 'bg-[#32B85C]' : 'bg-[#3998F7]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
