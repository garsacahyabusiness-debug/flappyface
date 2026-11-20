import React, { useEffect, useState } from 'react';
import { Award, Crown, Gift, Sparkles } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { LEVEL_REWARD_MAP } from '../game/progression/LevelRewardRegistry';
import { LevelUpEvent } from '../game/progression/PlayerProgressTypes';
import { getTitleById } from '../game/progression/TitleRegistry';
import { vibrationManager } from '../game/settings/VibrationManager';

interface LevelUpOverlayProps {
  event: LevelUpEvent | null;
  playerName: string;
  progressPercent: number;
  animationEnabled: boolean;
  reducedMotion: boolean;
  onOpenRewards?: () => void;
  onContinue: (id: string) => void;
}

const SPARK_POSITIONS = [
  'top-3 left-6',
  'top-5 right-7',
  'top-14 left-3',
  'top-16 right-4',
  'bottom-20 left-5',
  'bottom-24 right-6',
];

export const LevelUpOverlay: React.FC<LevelUpOverlayProps> = ({
  event,
  playerName,
  progressPercent,
  animationEnabled,
  reducedMotion,
  onOpenRewards,
  onContinue,
}) => {
  const [barPercent, setBarPercent] = useState(0);

  useEffect(() => {
    if (!event) return;

    if (event.rankPromoted) {
      audioManager.playRankPromotion();
    } else {
      audioManager.playLevelUp();
    }
    vibrationManager.vibrateLevelUp();

    if (reducedMotion || !animationEnabled) {
      setBarPercent(progressPercent);
      return;
    }

    setBarPercent(0);
    const t = window.setTimeout(() => {
      setBarPercent(Math.max(12, progressPercent));
    }, 90);
    return () => window.clearTimeout(t);
  }, [event?.id, progressPercent, reducedMotion, animationEnabled]);

  if (!event) return null;

  const rewardDefs = event.unlockedRewardLevels
    .map((lvl) => LEVEL_REWARD_MAP.get(lvl))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));
  const titleDefs = event.unlockedTitleIds.map((tid) => getTitleById(tid));
  const showSparkles = animationEnabled && !reducedMotion;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Level Up"
      onPointerDown={(e) => e.stopPropagation()}
      className="anim-fade-in absolute inset-0 z-50 flex items-center justify-center bg-[#24415C]/55 p-4 backdrop-blur-[2px]"
    >
      <div className="anim-panel-pop game-panel relative w-full max-w-[330px] overflow-hidden p-5 text-center">
        {showSparkles && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {SPARK_POSITIONS.map((pos, idx) => (
              <Sparkles
                key={idx}
                className={`anim-sparkle absolute ${pos} h-4 w-4 text-[#FFD84D] opacity-80`}
              />
            ))}
          </div>
        )}

        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#24415C] bg-[#FFD84D] px-3 py-0.5 text-[10px] font-black tracking-wider text-[#24415C] uppercase shadow-[0_2px_0_#24415C]">
            <Crown className="h-3.5 w-3.5" />
            <span>
              {event.profileId === 'solo'
                ? 'PROGRESSION MILESTONE'
                : `${playerName} LEVELED UP!`}
            </span>
          </div>

          <h2 className="font-display text-stroke-dark mt-2 text-3xl leading-none font-bold tracking-wide text-[#FFD84D]">
            LEVEL UP!
          </h2>

          {/* Level Transition Pill */}
          <div className="mt-3 flex items-center justify-center gap-2.5">
            <div className="rounded-2xl border-2 border-[#24415C]/20 bg-[#EEF7FF] px-3 py-1.5">
              <div className="text-[9px] font-black text-[#24415C]/55 uppercase">FROM</div>
              <div className="font-display text-xl font-bold tabular-nums text-[#24415C]">
                Lv.{event.fromLevel}
              </div>
            </div>

            <span className="font-display text-xl font-bold text-[#3998F7]" aria-hidden="true">
              →
            </span>

            <div className="rounded-2xl border-2 border-[#24415C] bg-gradient-to-b from-[#FFF9DB] to-[#FFD84D] px-4 py-1.5 shadow-[0_3px_0_#24415C]">
              <div className="text-[9px] font-black text-[#24415C]/70 uppercase">NOW</div>
              <div className="font-display text-2xl font-bold tabular-nums text-[#24415C]">
                Lv.{event.toLevel}
              </div>
            </div>
          </div>

          {/* Animated XP Bar */}
          <div className="mt-3 rounded-2xl border-2 border-[#24415C]/15 bg-[#EEF7FF] p-2.5">
            <div className="flex items-center justify-between text-[10px] font-black text-[#24415C]/75">
              <span>+{event.xpGained} XP EARNED</span>
              <span className="tabular-nums">{progressPercent}% NEXT</span>
            </div>
            <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full border border-[#24415C]/30 bg-white">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#61D66B] to-[#3998F7] transition-all duration-500 ease-out"
                style={{ width: `${barPercent}%` }}
              />
            </div>
          </div>

          {/* Rank Promotion Banner */}
          {event.rankPromoted && (
            <div
              className={`mt-2.5 flex items-center justify-center gap-2 rounded-2xl border-2 border-[#24415C] bg-gradient-to-r ${event.newRank.gradientClass} px-3 py-2 text-xs font-black text-[#24415C] shadow-[0_2px_0_#24415C]`}
            >
              <span className="text-base" aria-hidden="true">
                {event.newRank.icon}
              </span>
              <span>RANK PROMOTED: {event.newRank.name}!</span>
            </div>
          )}

          {/* Rewards Unlocked Summary */}
          {(rewardDefs.length > 0 || titleDefs.length > 0) && (
            <div className="mt-3 max-h-[140px] space-y-1.5 overflow-y-auto rounded-2xl border-2 border-[#24415C]/15 bg-[#F8FBFF] p-2.5 text-left">
              <div className="flex items-center gap-1 text-[10px] font-black tracking-wider text-[#3998F7] uppercase">
                <Gift className="h-3.5 w-3.5" />
                <span>REWARDS UNLOCKED</span>
              </div>
              {rewardDefs.map((rw) => (
                <div
                  key={rw.level}
                  className="flex items-center gap-2 rounded-xl border border-[#24415C]/15 bg-white px-2.5 py-1.5"
                >
                  <span className="text-base" aria-hidden="true">
                    {rw.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-black text-[#24415C]">
                      Lv.{rw.level} · {rw.title}
                    </div>
                    <div className="truncate text-[10px] font-bold text-[#24415C]/65">
                      {rw.subtitle}
                    </div>
                  </div>
                </div>
              ))}
              {titleDefs.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-xl border border-amber-300 bg-[#FFF9DB] px-2.5 py-1"
                >
                  <Award className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]" />
                  <span className="truncate text-[11px] font-black text-[#24415C]">
                    Title Unlocked: {t.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-col gap-2">
            {onOpenRewards && rewardDefs.length > 0 && event.profileId === 'solo' && (
              <button
                type="button"
                onClick={() => {
                  audioManager.playButton();
                  onContinue(event.id);
                  onOpenRewards();
                }}
                className="btn-base btn-primary min-h-[44px] w-full text-sm"
              >
                <Gift className="h-4 w-4" />
                <span>CLAIM REWARDS</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                audioManager.playButton();
                onContinue(event.id);
              }}
              className="btn-base btn-green min-h-[46px] w-full text-base"
            >
              <span>CONTINUE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
